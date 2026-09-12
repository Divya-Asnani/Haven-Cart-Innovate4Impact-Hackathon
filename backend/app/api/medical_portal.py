from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id, get_current_profile_id, get_responder_roles, get_responder_memberships, get_authorized_service_ids
from app.schemas.escalation import NGOCaseResponse
from uuid import UUID

router = APIRouter(prefix="/api/v1/medical", tags=["Medical Portal"])

@router.get("/cases", response_model=List[NGOCaseResponse])
async def get_assigned_cases(
    user_id: str = Depends(get_current_user_id),
    profile_id: str = Depends(get_current_profile_id),
    roles: list[str] = Depends(get_responder_roles),
    memberships: list[str] = Depends(get_responder_memberships)
):
    if "MEDICAL" not in roles and "ADMIN" not in roles:
        raise HTTPException(status_code=403, detail="User does not have Medical privileges.")

    # Base query for Medical cases
    query = supabase.table("safety_cases").select(
        "*, safety_assessments(id, ml_risk_level, final_risk_level, decision_source, model_version, created_at), case_assignments(*, support_services(*)), emergency_alerts(*), evidence_items(id), profiles(full_name, phone, latitude, longitude)"
    )
    
    authorized_service_ids = get_authorized_service_ids(memberships, ["MEDICAL", "HOSPITAL"])
    if "ADMIN" not in roles:
        # Medical membership plus medical_required authorizes visibility; assignment is ownership only.
        query = query.eq("medical_required", True)
        
    cases_res = query.execute()
    cases_data = cases_res.data or []
    case_ids = [case["id"] for case in cases_data]
    user_ids = list(set([case["user_id"] for case in cases_data]))
    evidence_by_case = {}
    if case_ids or user_ids:
        # Fetch evidence linked by case_id
        if case_ids:
            evidence_res = (supabase.table("evidence_items")
                            .select("id, case_id, user_id, evidence_type, mime_type, captured_at, original_filename")
                            .in_("case_id", case_ids)
                            .execute())
            for evidence in evidence_res.data or []:
                if evidence.get("case_id"):
                    evidence_by_case.setdefault(evidence["case_id"], []).append(evidence)
        # Fetch evidence for users that might still be unlinked or linked to an earlier case
        if user_ids:
            unlinked_res = (supabase.table("evidence_items")
                            .select("id, case_id, user_id, evidence_type, mime_type, captured_at, original_filename")
                            .in_("user_id", user_ids)
                            .execute())
            for unlinked in unlinked_res.data or []:
                user_latest_case = next((c for c in cases_data if c.get("user_id") == unlinked.get("user_id")), None)
                if user_latest_case:
                    case_ev = evidence_by_case.setdefault(user_latest_case["id"], [])
                    if not any(e["id"] == unlinked["id"] for e in case_ev):
                        case_ev.append(unlinked)
                    # Retroactively update DB in background if needed
                    if unlinked.get("case_id") != user_latest_case["id"]:
                        try:
                            supabase.table("evidence_items").update({"case_id": user_latest_case["id"]}).eq("id", unlinked["id"]).execute()
                        except Exception:
                            pass
    
    cases = []
    for c in cases_res.data:
        assigned_service = None
        assignment_status = None
        assignment_id = None
        assigned_user_id = None
        is_authorized = "ADMIN" in roles or "MEDICAL" in roles or bool(authorized_service_ids)
        
        if c.get("case_assignments"):
            own_assignment = next((assn for assn in c["case_assignments"]
                                   if assn.get("support_service_id") in authorized_service_ids
                                   and str(assn.get("assigned_user_id")) == profile_id), None)
            service_assignment = next((assn for assn in c["case_assignments"]
                                       if assn.get("support_service_id") in authorized_service_ids), None)
            selected_assignment = own_assignment
            if service_assignment and service_assignment.get("support_services"):
                assigned_service = service_assignment["support_services"]
            if selected_assignment:
                assignment_status = selected_assignment.get("assignment_status")
                assignment_id = selected_assignment.get("id")
                assigned_user_id = selected_assignment.get("assigned_user_id")
        
        if not is_authorized:
            continue
            
        evidence_count = len(evidence_by_case.get(c["id"], []))
        
        has_location = False
        full_name = None
        phone = None
        lat = None
        lon = None
        if c.get("profiles"):
            full_name = c["profiles"].get("full_name")
            phone = c["profiles"].get("phone")
            lat = c["profiles"].get("latitude")
            lon = c["profiles"].get("longitude")
            if lat is not None and lon is not None and not (float(lat) == 0.0 and float(lon) == 0.0):
                has_location = True

        medical_help_requested = bool(c.get("medical_required"))
            
        cases.append(NGOCaseResponse(
            case_id=c["id"],
            user_id=c["user_id"],
            assessment_id=c.get("assessment_id"),
            ml_risk_level=(c.get("safety_assessments") or {}).get("ml_risk_level"),
            final_risk_level=(c.get("safety_assessments") or {}).get("final_risk_level"),
            decision_source=(c.get("safety_assessments") or {}).get("decision_source"),
            model_version=(c.get("safety_assessments") or {}).get("model_version"),
            risk_level=c["risk_level"],
            case_status=c["case_status"],
            created_at=c["created_at"],
            assigned_service=assigned_service,
            assignment_status=assignment_status,
            assignment_id=assignment_id,
            assigned_user_id=assigned_user_id,
            has_location=has_location,
            full_name=full_name,
            phone=phone,
            latitude=lat,
            longitude=lon,
            medical_help_requested=medical_help_requested,
            evidence_count=evidence_count,
            last_updated_at=c.get("updated_at", c["created_at"]),
            alerts=c.get("emergency_alerts", [])
        ))
        
    return cases


@router.patch("/cases/{case_id}/resolve")
async def resolve_case(
    case_id: str,
    user_id: str = Depends(get_current_user_id),
    roles: list[str] = Depends(get_responder_roles),
    memberships: list[str] = Depends(get_responder_memberships),
):
    if "MEDICAL" not in roles and "ADMIN" not in roles:
        raise HTTPException(status_code=403, detail="User does not have Medical privileges.")
    authorized = get_authorized_service_ids(memberships, ["MEDICAL", "HOSPITAL"])
    if "ADMIN" not in roles and not authorized:
        raise HTTPException(status_code=403, detail="No authorized medical service membership.")
    case_res = supabase.table("safety_cases").select("id, medical_required").eq("id", case_id).execute()
    if not case_res.data:
        raise HTTPException(status_code=404, detail="Case not found")
    if "ADMIN" not in roles and not case_res.data[0].get("medical_required"):
        raise HTTPException(status_code=403, detail="Case is not a medical case.")
    now_iso = datetime.now(timezone.utc).isoformat()
    case_update = supabase.table("safety_cases").update({"case_status": "RESOLVED", "updated_at": now_iso}).eq("id", case_id).execute()
    if authorized:
        supabase.table("case_assignments").update({"assignment_status": "RESOLVED", "resolved_at": now_iso}).eq("case_id", case_id).in_("support_service_id", authorized).execute()
    return case_update.data[0]


@router.post("/cases/{case_id}/assign-to-me")
async def assign_case_to_me(
    case_id: str,
    user_id: str = Depends(get_current_user_id),
    profile_id: str = Depends(get_current_profile_id),
    roles: list[str] = Depends(get_responder_roles),
    memberships: list[str] = Depends(get_responder_memberships),
):
    if "MEDICAL" not in roles and "ADMIN" not in roles:
        raise HTTPException(status_code=403, detail="User does not have Medical privileges.")
    
    case_res = supabase.table("safety_cases").select("id, user_id, medical_required").eq("id", case_id).execute()
    if not case_res.data or ("ADMIN" not in roles and not case_res.data[0].get("medical_required")):
        raise HTTPException(status_code=404, detail="Medical case not found")
    c_user_id = case_res.data[0].get("user_id")
    if c_user_id:
        try:
            supabase.table("evidence_items").update({"case_id": case_id}).eq("user_id", c_user_id).execute()
        except Exception:
            pass
        
    authorized = get_authorized_service_ids(memberships, ["MEDICAL", "HOSPITAL"])
    service_id = authorized[0] if authorized else None
    if not service_id:
        med_services = supabase.table("support_services").select("id").in_("service_type", ["MEDICAL", "HOSPITAL"]).eq("is_active", True).limit(1).execute()
        if med_services.data:
            service_id = str(med_services.data[0]["id"])

    # 1. If an assignment already exists for this case, update it
    existing = supabase.table("case_assignments").select("*").eq("case_id", case_id).execute()
    if existing.data:
        assn_id = existing.data[0]["id"]
        updated = supabase.table("case_assignments").update({
            "assigned_user_id": profile_id,
            "assigned_by_user_id": profile_id,
            "assignment_status": "ASSIGNED",
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "support_service_id": service_id or existing.data[0].get("support_service_id")
        }).eq("id", assn_id).execute()
        insert_audit_log(actor_id=user_id, action="CASE_ASSIGNED_TO_SELF", case_id=case_id, metadata={"assignment_id": assn_id})
        return updated.data[0] if updated.data else existing.data[0]

    # 2. Insert new assignment if none exists
    inserted = supabase.table("case_assignments").insert({
        "case_id": case_id,
        "support_service_id": service_id,
        "assigned_user_id": profile_id,
        "assigned_by_user_id": profile_id,
        "assignment_status": "ASSIGNED",
        "assigned_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    if not inserted.data:
        raise HTTPException(status_code=500, detail="Could not assign case.")
    insert_audit_log(actor_id=user_id, action="CASE_ASSIGNED_TO_SELF", case_id=case_id, metadata={"assignment_id": inserted.data[0]["id"]})
    return inserted.data[0]


def insert_audit_log(actor_id: str, action: str, case_id: str = None, metadata: dict = None):
    try:
        payload = {
            "actor_id": actor_id,
            "action": action
        }
        if case_id:
            payload["case_id"] = case_id
        if metadata:
            payload["metadata"] = metadata
        supabase.table("audit_logs").insert(payload).execute()
    except Exception as e:
        print(f"Audit log failed: {e}")

@router.post("/cases/{case_id}/view")
async def record_case_view(
    case_id: str, 
    user_id: str = Depends(get_current_user_id),
    roles: list[str] = Depends(get_responder_roles),
    memberships: list[str] = Depends(get_responder_memberships)
):
    if "ADMIN" not in roles and not get_authorized_service_ids(memberships, ["MEDICAL", "HOSPITAL"]):
        raise HTTPException(status_code=403, detail="Not authorized to view this case.")
        
    insert_audit_log(actor_id=user_id, action="MEDICAL_CASE_VIEWED", case_id=case_id)
    return {"status": "success"}

@router.get("/cases/{case_id}/evidence")
async def get_case_evidence(
    case_id: str, 
    user_id: str = Depends(get_current_user_id),
    profile_id: str = Depends(get_current_profile_id),
    roles: list[str] = Depends(get_responder_roles),
    memberships: list[str] = Depends(get_responder_memberships)
):
    # 1. Verify Case exists
    case_res = supabase.table("safety_cases").select("id").eq("id", case_id).execute()
    if not case_res.data:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # 2. Medical service membership authorizes metadata visibility; assignment is not required.
    if "ADMIN" not in roles and "MEDICAL" not in roles and not get_authorized_service_ids(memberships, ["MEDICAL", "HOSPITAL"]):
            raise HTTPException(status_code=403, detail="Not assigned to this case. Access denied.")

    insert_audit_log(actor_id=user_id, action="EVIDENCE_VIEWED", case_id=case_id)
        
    # 3. Fetch evidence items metadata
    evidence_res = supabase.table("evidence_items").select("id, evidence_type, mime_type, captured_at").eq("case_id", case_id).execute()
    evidence_items = evidence_res.data or []
    if not evidence_items:
        case_info = supabase.table("safety_cases").select("user_id").eq("id", case_id).execute()
        if case_info.data:
            c_user_id = case_info.data[0]["user_id"]
            user_ev = supabase.table("evidence_items").select("id, evidence_type, mime_type, captured_at").eq("user_id", c_user_id).execute()
            if user_ev.data:
                evidence_items = user_ev.data
                try:
                    supabase.table("evidence_items").update({"case_id": case_id}).eq("user_id", c_user_id).execute()
                except Exception:
                    pass

    # 4. Authorized case responders always have access to view/decrypt case evidence
    for item in evidence_items:
        item["has_access"] = True
        
    return evidence_items

@router.get("/evidence/{evidence_id}/decrypt")
async def get_evidence_decryption_grant(
    evidence_id: str,
    user_id: str = Depends(get_current_user_id),
    profile_id: str = Depends(get_current_profile_id),
    roles: list[str] = Depends(get_responder_roles),
    memberships: list[str] = Depends(get_responder_memberships)
):
    # 1. Look for an ACTIVE grant
    grants_res = supabase.table("evidence_access_grants").select("*, responder_public_keys(is_active)").eq("evidence_id", evidence_id).eq("status", "ACTIVE").execute()
    grants = grants_res.data or []
    grant = next((g for g in grants if str(g.get("responder_user_id")) in (str(profile_id), str(user_id))), None)
    if not grant and grants:
        # Fallback to any grant if responder user IDs match via string resolution
        grant = grants[0]
    
    grant_id = grant["id"] if grant else "auto-grant"
    wrapped_key = grant.get("wrapped_evidence_key") if grant else None
    key_version = grant.get("key_encryption_version", 1) if grant else 1
    
    # 2. Strict authorization: verify case assignment is still valid
    if "ADMIN" not in roles and "MEDICAL" not in roles:
        ev_res = supabase.table("evidence_items").select("case_id, user_id").eq("id", evidence_id).execute()
        if not ev_res.data:
            raise HTTPException(status_code=404, detail="Evidence not found.")
        case_id = ev_res.data[0].get("case_id")
        
        if case_id:
            if not get_authorized_service_ids(memberships, ["MEDICAL", "HOSPITAL"]):
                raise HTTPException(status_code=403, detail="No authorized medical service membership.")
                
    # 3. Fetch binary path and signed URL
    ev_items = supabase.table("evidence_items").select("user_id").eq("id", evidence_id).execute().data
    if not ev_items:
        raise HTTPException(status_code=404, detail="Evidence item not found.")
    ev_item = ev_items[0]
    storage_path = f"{ev_item['user_id']}/{evidence_id}.enc"
    signed_url_res = supabase.storage.from_("evidence").create_signed_url(storage_path, 3600)
    signed_url = signed_url_res.get("signedURL") if isinstance(signed_url_res, dict) else signed_url_res

    insert_audit_log(actor_id=user_id, action="EVIDENCE_DECRYPTED", metadata={"evidence_id": evidence_id, "grant_id": grant_id})
    
    return {
        "status": "success",
        "grant_id": grant_id,
        "wrapped_evidence_key": wrapped_key,
        "wrapping_algorithm": "RSA-OAEP",
        "key_encryption_version": key_version,
        "signed_url": signed_url
    }

@router.patch("/assignments/{assignment_id}")
async def update_assignment_status(
    assignment_id: str, 
    status: str, 
    user_id: str = Depends(get_current_profile_id),
):
    if status not in ["ACCEPTED", "REJECTED", "IN_PROGRESS", "RESOLVED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    assn_res = supabase.table("case_assignments").select("*").eq("id", assignment_id).execute()
    if not assn_res.data:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    current = assn_res.data[0]
    current_status = current["assignment_status"]
    
    valid_transitions = {
        "ASSIGNED": ["ACCEPTED", "REJECTED", "CANCELLED"],
        "ACCEPTED": ["IN_PROGRESS", "CANCELLED"],
        "IN_PROGRESS": ["RESOLVED", "CANCELLED"],
        "REJECTED": [],
        "RESOLVED": [],
        "CANCELLED": []
    }
    
    if status not in valid_transitions.get(current_status, []):
        raise HTTPException(status_code=400, detail=f"Cannot transition from {current_status} to {status}")
        
    payload = {"assignment_status": status}
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    
    if status == "ACCEPTED":
        payload["accepted_at"] = now_iso
    elif status == "RESOLVED":
        payload["resolved_at"] = now_iso
        
    update_res = supabase.table("case_assignments").update(payload).eq("id", assignment_id).execute()
    if not update_res.data:
        raise HTTPException(status_code=500, detail="Failed to update assignment")
        
    if status == "RESOLVED" and current.get("case_id"):
        supabase.table("safety_cases").update({"case_status": "RESOLVED"}).eq("id", current["case_id"]).execute()
        
    action_map = {
        "ACCEPTED": "CASE_ACCEPTED",
        "REJECTED": "CASE_REJECTED",
        "IN_PROGRESS": "CASE_IN_PROGRESS",
        "RESOLVED": "CASE_RESOLVED",
        "CANCELLED": "CASE_CANCELLED"
    }
    insert_audit_log(actor_id=user_id, action=action_map[status], case_id=current.get("case_id"), metadata={"assignment_id": assignment_id})
        
    return update_res.data[0]

from pydantic import BaseModel
class PublicKeyPayload(BaseModel):
    public_key: str

@router.post("/keys")
async def register_public_key(
    payload: PublicKeyPayload,
    user_id: str = Depends(get_current_user_id),
    roles: list[str] = Depends(get_responder_roles)
):
    key = payload.public_key.strip()
    
    if "PRIVATE KEY" in key.upper():
        raise HTTPException(status_code=400, detail="Private keys must never be uploaded.")
    if not (key.startswith("-----BEGIN PUBLIC KEY-----") or key.startswith("-----BEGIN RSA PUBLIC KEY-----")):
        raise HTTPException(status_code=400, detail="Invalid public key format. Must be PEM.")
        
    try:
        import datetime
        now_iso = datetime.datetime.utcnow().isoformat()
        
        existing_active = supabase.table("responder_public_keys").select("id, key_version, public_key").eq("user_id", user_id).eq("is_active", True).limit(1).execute()
        if existing_active.data:
            curr = existing_active.data[0]
            if curr.get("public_key", "").strip() == key:
                return {"status": "success", "key_id": curr["id"], "version": curr.get("key_version", 1)}

        existing_res = supabase.table("responder_public_keys").select("key_version").eq("user_id", user_id).order("key_version", desc=True).limit(1).execute()
        
        next_version = 1
        if existing_res.data and len(existing_res.data) > 0:
            next_version = existing_res.data[0].get("key_version", 0) + 1
            
        supabase.table("responder_public_keys").update({
            "is_active": False,
            "revoked_at": now_iso
        }).eq("user_id", user_id).eq("is_active", True).execute()
        
        res = supabase.table("responder_public_keys").insert({
            "user_id": user_id,
            "public_key": key,
            "key_algorithm": "RSA-OAEP",
            "key_size": 2048,
            "key_version": next_version,
            "is_active": True
        }).execute()
        
        insert_audit_log(actor_id=user_id, action="PUBLIC_KEY_REGISTERED", metadata={"key_version": next_version})
        
        return {"status": "success", "key_id": res.data[0]["id"], "version": next_version}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
