from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import os

from app.database.supabase_client import supabase
from app.api.auth_deps import (
    get_current_user_id,
    require_super_admin,
    resolve_candidate_user_ids,
    resolve_auth_user_to_profile_id,
)
from app.schemas.requests import (
    CreateOrganizationRequest,
    AdminResetPasswordRequest,
    ToggleStatusRequest,
)
from app.security.hashing import get_pin_hash

router = APIRouter(prefix="/api/v1/admin", tags=["Super Admin"])


@router.get("/organizations")
async def get_all_organizations(admin_id: str = Depends(require_super_admin)):
    """
    Super Admin endpoint to list all NGO and Medical organizations,
    along with their administrator login accounts and status.
    """
    try:
        # 1. Fetch all support services
        services_res = supabase.table("support_services").select("*").order("created_at", desc=True).execute()
        services = services_res.data or []

        # 2. Fetch memberships
        memberships_res = supabase.table("responder_service_memberships").select("*").execute()
        memberships = memberships_res.data or []

        # 3. Fetch user roles with roles
        user_roles_res = supabase.table("user_roles").select("*, roles(*)").execute()
        user_roles = user_roles_res.data or []

        # 4. Fetch profiles
        profiles_res = supabase.table("profiles").select("id, full_name, email, phone, responder_role, created_at").execute()
        profiles_by_id = {p["id"]: p for p in (profiles_res.data or [])}
        profiles_by_email = {p["email"]: p for p in (profiles_res.data or []) if p.get("email")}

        # 5. Fetch auth.users for Supabase Auth status
        try:
            auth_users = supabase.auth.admin.list_users()
            auth_users_by_email = {u.email: u for u in auth_users if u.email}
            auth_users_by_id = {str(u.id): u for u in auth_users}
        except Exception:
            auth_users_by_email = {}
            auth_users_by_id = {}

        result = []
        for service in services:
            sid = service["id"]
            service_type = (service.get("service_type") or "").upper()
            
            # Map service_type to portal_type: "NGO" or "MEDICAL"
            if service_type in ("HOSPITAL", "CLINIC", "MEDICAL"):
                portal_type = "MEDICAL"
            elif service_type in ("NGO", "SHELTER", "HELPLINE"):
                portal_type = "NGO"
            else:
                portal_type = service_type

            # Find memberships for this service
            service_mems = [m for m in memberships if m.get("support_service_id") == sid]
            
            accounts = []
            for mem in service_mems:
                uid = mem.get("user_id")
                # Look up profile
                prof = profiles_by_id.get(uid)
                if not prof:
                    # Try looking up via auth_users then profile email
                    au = auth_users_by_id.get(uid)
                    if au and au.email:
                        prof = profiles_by_email.get(au.email)

                user_email = (prof.get("email") if prof else None) or (service.get("email") if uid == service.get("email") else "unknown")
                if not prof and uid in auth_users_by_id:
                    user_email = auth_users_by_id[uid].email

                # Check user_roles for this user
                candidate_ids = {str(uid)}
                if prof:
                    candidate_ids.add(str(prof["id"]))
                if user_email in auth_users_by_email:
                    candidate_ids.add(str(auth_users_by_email[user_email].id))

                user_role_matches = [
                    ur for ur in user_roles 
                    if str(ur.get("user_id")) in candidate_ids
                ]

                is_active = True
                if user_role_matches:
                    is_active = any(ur.get("is_active") for ur in user_role_matches)
                if mem.get("membership_status") != "ACTIVE":
                    is_active = False

                role_code = portal_type
                if user_role_matches:
                    for ur in user_role_matches:
                        if ur.get("roles") and ur["roles"].get("role_code"):
                            role_code = ur["roles"]["role_code"]
                            break

                accounts.append({
                    "user_id": uid,
                    "profile_id": prof["id"] if prof else uid,
                    "full_name": prof.get("full_name") if prof else "Administrator",
                    "email": user_email,
                    "phone": prof.get("phone") if prof else service.get("phone"),
                    "role": role_code,
                    "membership_status": mem.get("membership_status", "ACTIVE"),
                    "is_active": is_active,
                    "created_at": mem.get("created_at"),
                })

            # If no direct membership records exist yet, synthesize the organization's primary contact account if present in profiles
            if not accounts and service.get("email"):
                s_email = service.get("email")
                prof = profiles_by_email.get(s_email)
                au = auth_users_by_email.get(s_email)
                if prof or au:
                    uid = str(au.id) if au else str(prof["id"])
                    candidate_ids = {uid}
                    if prof:
                        candidate_ids.add(str(prof["id"]))
                    user_role_matches = [
                        ur for ur in user_roles 
                        if str(ur.get("user_id")) in candidate_ids
                    ]
                    is_active = service.get("is_active", True)
                    if user_role_matches:
                        is_active = any(ur.get("is_active") for ur in user_role_matches)
                    
                    accounts.append({
                        "user_id": uid,
                        "profile_id": prof["id"] if prof else uid,
                        "full_name": prof.get("full_name") if prof else service.get("name"),
                        "email": s_email,
                        "phone": service.get("phone"),
                        "role": portal_type,
                        "membership_status": "ACTIVE" if is_active else "INACTIVE",
                        "is_active": is_active,
                        "created_at": service.get("created_at"),
                    })

            result.append({
                "id": sid,
                "name": service.get("name"),
                "portal_type": portal_type,
                "service_type": service_type,
                "email": service.get("email"),
                "phone": service.get("phone"),
                "address": service.get("address"),
                "is_active": service.get("is_active", True),
                "is_verified": service.get("is_verified", True),
                "created_at": service.get("created_at"),
                "accounts": accounts,
            })

        return result
    except Exception as e:
        print(f"Error getting organizations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch organizations: {str(e)}")


@router.post("/organizations")
async def create_organization_and_admin(
    req: CreateOrganizationRequest,
    admin_id: str = Depends(require_super_admin)
):
    """
    Super Admin endpoint to create a new NGO or Medical organization
    and its administrator login account with initial credentials in Supabase Auth.
    """
    portal_type = req.portal_type.upper().strip()
    if portal_type not in ("NGO", "MEDICAL"):
        raise HTTPException(status_code=400, detail="portal_type must be either 'NGO' or 'MEDICAL'")

    if not req.org_name or not req.org_name.strip():
        raise HTTPException(status_code=400, detail="Organization name is required")

    if not req.admin_email or "@" not in req.admin_email:
        raise HTTPException(status_code=400, detail="Valid administrator email is required")

    if not req.initial_password or len(req.initial_password) < 6:
        raise HTTPException(status_code=400, detail="Initial password must be at least 6 characters")

    clean_email = req.admin_email.strip().lower()
    clean_org_name = req.org_name.strip()
    clean_admin_name = req.admin_name.strip() if req.admin_name else f"{clean_org_name} Admin"
    service_type = "HOSPITAL" if portal_type == "MEDICAL" else "NGO"

    # 1. Create Organization in support_services
    org_id = str(uuid.uuid4())
    org_data = {
        "id": org_id,
        "name": clean_org_name,
        "service_type": service_type,
        "email": clean_email,
        "phone": req.admin_phone,
        "address": req.address or "Pune, Maharashtra",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "is_verified": True,
        "is_active": True,
        "priority": 1,
        "coverage_radius_km": 50.0,
    }
    try:
        supabase.table("support_services").insert(org_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create organization: {str(e)}")

    # 2. Check if auth.users already has this email
    auth_user_id = None
    try:
        for u in supabase.auth.admin.list_users():
            if u.email and u.email.lower() == clean_email:
                auth_user_id = str(u.id)
                # Update password
                supabase.auth.admin.update_user_by_id(auth_user_id, {
                    "password": req.initial_password,
                    "email_confirm": True
                })
                break
    except Exception:
        pass

    # 3. Create user in Supabase Auth if not already existing
    if not auth_user_id:
        try:
            new_auth_res = supabase.auth.admin.create_user({
                "email": clean_email,
                "password": req.initial_password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": clean_admin_name,
                    "portal_type": portal_type,
                    "organization_id": org_id,
                }
            })
            if hasattr(new_auth_res, "user") and new_auth_res.user:
                auth_user_id = str(new_auth_res.user.id)
        except Exception as e:
            # Clean up organization if auth creation fails
            supabase.table("support_services").delete().eq("id", org_id).execute()
            raise HTTPException(status_code=400, detail=f"Failed to create user in Supabase Auth: {str(e)}")

    if not auth_user_id:
        supabase.table("support_services").delete().eq("id", org_id).execute()
        raise HTTPException(status_code=500, detail="Could not obtain user ID from Supabase Auth")

    # 4. Create or update profile in profiles table
    pwd_hash = get_pin_hash(req.initial_password)
    try:
        existing_prof = supabase.table("profiles").select("id").eq("email", clean_email).execute()
        if existing_prof.data:
            supabase.table("profiles").update({
                "full_name": clean_admin_name,
                "phone": req.admin_phone,
                "password_hash": pwd_hash,
                "security_pin_hash": pwd_hash,
                "responder_role": portal_type,
                "address": req.address,
            }).eq("email", clean_email).execute()
        else:
            supabase.table("profiles").insert({
                "id": auth_user_id,
                "full_name": clean_admin_name,
                "email": clean_email,
                "phone": req.admin_phone,
                "password_hash": pwd_hash,
                "security_pin_hash": pwd_hash,
                "responder_role": portal_type,
                "address": req.address,
            }).execute()
    except Exception as e:
        print(f"Profile creation warning: {e}")

    # 5. Look up role_id in roles table
    roles_res = supabase.table("roles").select("id").eq("role_code", portal_type).execute()
    role_id = None
    if roles_res.data:
        role_id = roles_res.data[0]["id"]
    else:
        # Create role if not exists
        new_role = supabase.table("roles").insert({
            "role_code": portal_type,
            "role_name": f"{portal_type} Responder",
            "description": f"Authorized {portal_type} portal access",
            "is_active": True
        }).execute()
        if new_role.data:
            role_id = new_role.data[0]["id"]

    # 6. Assign role in user_roles
    if role_id:
        try:
            # Delete any inactive or duplicate role mapping for this user
            supabase.table("user_roles").delete().eq("user_id", auth_user_id).execute()
            supabase.table("user_roles").insert({
                "user_id": auth_user_id,
                "role_id": role_id,
                "is_active": True,
            }).execute()
        except Exception as e:
            print(f"user_roles assignment warning: {e}")

    # 7. Create membership in responder_service_memberships
    try:
        supabase.table("responder_service_memberships").insert({
            "user_id": auth_user_id,
            "support_service_id": org_id,
            "membership_status": "ACTIVE",
        }).execute()
    except Exception as e:
        print(f"membership creation warning: {e}")

    return {
        "status": "success",
        "message": f"Successfully created {portal_type} organization '{clean_org_name}' and administrator account '{clean_email}'.",
        "organization": {
            "id": org_id,
            "name": clean_org_name,
            "portal_type": portal_type,
            "service_type": service_type,
            "email": clean_email,
            "phone": req.admin_phone,
            "is_active": True,
        },
        "administrator": {
            "user_id": auth_user_id,
            "email": clean_email,
            "full_name": clean_admin_name,
            "role": portal_type,
            "is_active": True,
        }
    }


@router.post("/reset-password")
async def admin_reset_password(
    req: AdminResetPasswordRequest,
    admin_id: str = Depends(require_super_admin)
):
    """
    Super Admin directly resets an account's password without needing email recovery.
    Updates both Supabase Auth and the application profiles table.
    """
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    target_user_id = req.user_id
    target_email = req.email

    # Resolve target user
    auth_user_id = None
    if target_user_id:
        try:
            au = supabase.auth.admin.get_user_by_id(target_user_id)
            if hasattr(au, "user") and au.user:
                auth_user_id = str(au.user.id)
                target_email = au.user.email
        except Exception:
            pass

    if not auth_user_id and target_email:
        try:
            for u in supabase.auth.admin.list_users():
                if u.email and u.email.lower() == target_email.lower():
                    auth_user_id = str(u.id)
                    break
        except Exception:
            pass

    if not auth_user_id and target_user_id:
        # Check profile table for email
        try:
            prof = supabase.table("profiles").select("email").eq("id", target_user_id).execute()
            if prof.data and prof.data[0].get("email"):
                target_email = prof.data[0]["email"]
                for u in supabase.auth.admin.list_users():
                    if u.email and u.email.lower() == target_email.lower():
                        auth_user_id = str(u.id)
                        break
        except Exception:
            pass

    if not auth_user_id:
        raise HTTPException(status_code=404, detail="Target user account not found in authentication system.")

    # 1. Update password in Supabase Auth
    try:
        supabase.auth.admin.update_user_by_id(auth_user_id, {
            "password": req.new_password,
            "email_confirm": True
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update password in Supabase Auth: {str(e)}")

    # 2. Update password_hash in profiles
    pwd_hash = get_pin_hash(req.new_password)
    candidate_ids = resolve_candidate_user_ids(auth_user_id)
    if target_user_id:
        candidate_ids.append(str(target_user_id))

    for cid in set(candidate_ids):
        try:
            supabase.table("profiles").update({
                "password_hash": pwd_hash,
                "security_pin_hash": pwd_hash
            }).eq("id", cid).execute()
        except Exception:
            pass

    if target_email:
        try:
            supabase.table("profiles").update({
                "password_hash": pwd_hash,
                "security_pin_hash": pwd_hash
            }).eq("email", target_email).execute()
        except Exception:
            pass

    return {
        "status": "success",
        "message": f"Password reset successfully for account {target_email or auth_user_id}."
    }


@router.patch("/toggle-status")
async def toggle_status(
    req: ToggleStatusRequest,
    admin_id: str = Depends(require_super_admin)
):
    """
    Super Admin endpoint to activate or deactivate an account or organization.
    """
    target_type = req.target_type.upper().strip()
    target_id = req.target_id.strip()

    if target_type == "USER":
        candidate_ids = resolve_candidate_user_ids(target_id)
        # 1. Update user_roles
        try:
            supabase.table("user_roles").update({"is_active": req.is_active}).in_("user_id", candidate_ids).execute()
        except Exception as e:
            print(f"user_roles status update warning: {e}")

        # 2. Update responder_service_memberships
        new_status = "ACTIVE" if req.is_active else "INACTIVE"
        try:
            supabase.table("responder_service_memberships").update({"membership_status": new_status}).in_("user_id", candidate_ids).execute()
        except Exception as e:
            print(f"memberships status update warning: {e}")

        return {
            "status": "success",
            "target_type": "USER",
            "target_id": target_id,
            "is_active": req.is_active,
            "message": f"Account has been {'activated' if req.is_active else 'deactivated'} successfully."
        }

    elif target_type == "ORGANIZATION":
        # Update support_services
        try:
            supabase.table("support_services").update({"is_active": req.is_active}).eq("id", target_id).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update organization status: {str(e)}")

        # Also update linked memberships
        new_status = "ACTIVE" if req.is_active else "INACTIVE"
        try:
            supabase.table("responder_service_memberships").update({"membership_status": new_status}).eq("support_service_id", target_id).execute()
        except Exception:
            pass

        return {
            "status": "success",
            "target_type": "ORGANIZATION",
            "target_id": target_id,
            "is_active": req.is_active,
            "message": f"Organization has been {'activated' if req.is_active else 'deactivated'} successfully."
        }
    else:
        raise HTTPException(status_code=400, detail="target_type must be 'USER' or 'ORGANIZATION'")


@router.get("/stats")
async def get_admin_stats(admin_id: str = Depends(require_super_admin)):
    """
    Returns overall statistics for the Super Admin dashboard.
    """
    try:
        services_res = supabase.table("support_services").select("id, service_type, is_active").execute()
        services = services_res.data or []
        
        ngo_count = len([s for s in services if (s.get("service_type") or "").upper() in ("NGO", "SHELTER", "HELPLINE")])
        medical_count = len([s for s in services if (s.get("service_type") or "").upper() in ("HOSPITAL", "CLINIC", "MEDICAL")])

        memberships_res = supabase.table("responder_service_memberships").select("id, membership_status").execute()
        mems = memberships_res.data or []
        active_accounts = len([m for m in mems if m.get("membership_status") == "ACTIVE"])
        inactive_accounts = len([m for m in mems if m.get("membership_status") != "ACTIVE"])

        cases_res = supabase.table("safety_cases").select("id, case_status, risk_level, medical_required").execute()
        cases = cases_res.data or []

        return {
            "total_organizations": len(services),
            "ngo_organizations": ngo_count,
            "medical_organizations": medical_count,
            "active_accounts": active_accounts,
            "inactive_accounts": inactive_accounts,
            "total_cases": len(cases),
            "medical_cases": len([c for c in cases if c.get("medical_required")]),
            "ngo_cases": len([c for c in cases if c.get("risk_level") in ("LOW", "MEDIUM", "HIGH")]),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

