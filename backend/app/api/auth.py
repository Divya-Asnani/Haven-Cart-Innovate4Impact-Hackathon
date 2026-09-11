from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, status, Depends
from postgrest.exceptions import APIError
from app.schemas.requests import SignupRequest, LoginRequest, VerifyPinRequest, RefreshTokenRequest
from app.database.supabase_client import supabase
import os
from supabase import create_client
from app.security.hashing import get_pin_hash, verify_pin
from app.security.jwt import create_access_token, create_refresh_token, decode_token
from app.api.auth_deps import get_current_user_id

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

_fallback_users_by_email = {}
_fallback_users_by_id = {}


def _is_missing_profiles_table_error(exc: Exception) -> bool:
    if not isinstance(exc, APIError):
        return False

    code = getattr(exc, "code", "")
    message = str(exc)
    return code == "PGRST205" and "profiles" in message


def _build_auth_response(user_id: str, full_name: str, email: str, message: str | None = None, responder_role: str | None = None):
    claims = {"sub": user_id}
    if responder_role:
        claims["responder_role"] = responder_role
    access_token = create_access_token(claims)
    refresh_token = create_refresh_token(claims)

    payload = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "full_name": full_name,
            "email": email,
        },
    }

    if message:
        payload["message"] = message

    return payload


def _get_verified_responder_roles(user_id: str) -> list[str]:
    """Read active responder roles from the database, not from the client."""
    roles: list[str] = []
    # Newer deployments store the portal role in responders; retain the
    # established user_roles schema as a compatibility path for this project.
    try:
        responder_rows = supabase.table("responders").select("role, is_active").eq("user_id", user_id).execute().data or []
        for row in responder_rows:
            role = str(row.get("role") or "").upper()
            if row.get("is_active", True) and role in {"NGO", "MEDICAL", "AUTHORITY", "ADMIN"}:
                roles.append(role)
    except Exception:
        pass
    try:
        rows = supabase.table("user_roles").select("is_active, roles(role_code, is_active)").eq("user_id", user_id).execute().data or []
        for row in rows:
            role_data = row.get("roles") or {}
            role = str(role_data.get("role_code") or "").upper()
            if row.get("is_active") and role_data.get("is_active") and role in {"NGO", "MEDICAL", "AUTHORITY", "ADMIN"} and role not in roles:
                roles.append(role)
    except Exception:
        pass
    return roles

@router.post("/signup")
async def signup(req: SignupRequest):
    if not req.phone or not req.phone.strip():
        raise HTTPException(status_code=400, detail="Phone number is required.")
    
    clean_phone = req.phone.strip()
    clean_email = req.email.strip() if req.email and req.email.strip() else None
    effective_email = clean_email or f"{clean_phone}@havencart.app"

    password_hash = get_pin_hash(req.password)
    pin_hash = get_pin_hash(req.pin)

    # 1. Attempt creating in Supabase Auth first to sync auth.users
    auth_user_id = None
    try:
        auth_admin_res = supabase.auth.admin.create_user({
            "email": effective_email,
            "password": req.password,
            "email_confirm": True
        })
        if hasattr(auth_admin_res, "user") and auth_admin_res.user:
            auth_user_id = str(auth_admin_res.user.id)
    except Exception:
        try:
            temp_client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
            sup_res = temp_client.auth.sign_up({"email": effective_email, "password": req.password})
            if hasattr(sup_res, "user") and sup_res.user:
                auth_user_id = str(sup_res.user.id)
        except Exception:
            pass

    try:
        # Check if phone number already exists
        phone_res = supabase.table("profiles").select("id").eq("phone", clean_phone).execute()
        if phone_res.data:
            raise HTTPException(status_code=400, detail="Phone number already registered")

        if clean_email:
            email_res = supabase.table("profiles").select("id").eq("email", clean_email).execute()
            if email_res.data:
                raise HTTPException(status_code=400, detail="Email already registered")

        # Create Profile
        new_profile_data = {
            "full_name": req.full_name,
            "phone": clean_phone,
            "email": effective_email,
            "password_hash": password_hash,
            "security_pin_hash": pin_hash
        }
        if auth_user_id:
            new_profile_data["id"] = auth_user_id

        insert_res = supabase.table("profiles").insert(new_profile_data).execute()

        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Failed to create user")

        new_profile = insert_res.data[0]
        user_id = str(new_profile["id"])

        try:
            supabase.table("sessions").insert({"user_id": user_id}).execute()
        except Exception:
            pass

        return _build_auth_response(
            user_id=user_id,
            full_name=new_profile.get("full_name") or req.full_name,
            email=clean_email or effective_email,
            message="User registered",
        )
    except Exception as exc:
        if not _is_missing_profiles_table_error(exc):
            raise

        user_id = auth_user_id or str(uuid4())
        user_record = {
            "id": user_id,
            "full_name": req.full_name,
            "phone": clean_phone,
            "email": effective_email,
            "password_hash": password_hash,
            "security_pin_hash": pin_hash,
        }
        _fallback_users_by_email[clean_phone] = user_record
        if clean_email:
            _fallback_users_by_email[clean_email] = user_record
        _fallback_users_by_id[user_id] = user_record

        return _build_auth_response(
            user_id=user_id,
            full_name=req.full_name,
            email=clean_email or effective_email,
            message="User registered",
        )

@router.post("/login")
async def login(req: LoginRequest):
    auth_user_id = None
    identifier = (req.identifier or req.email or req.phone or "").strip()
    full_name = ""
    email = identifier

    if not identifier or not req.password:
        raise HTTPException(status_code=400, detail="Phone number / Email and Password are required.")

    is_email = "@" in identifier
    effective_email = identifier if is_email else f"{identifier}@havencart.app"

    # Strategy 1: Search profiles table directly by phone or email
    try:
        if is_email:
            profile_res = supabase.table("profiles").select("*").eq("email", identifier).execute()
        else:
            profile_res = supabase.table("profiles").select("*").eq("phone", identifier).execute()
            if not profile_res.data:
                profile_res = supabase.table("profiles").select("*").eq("email", effective_email).execute()

        if profile_res.data:
            prof = profile_res.data[0]
            stored_hash = prof.get("password_hash")
            if stored_hash and verify_pin(req.password, stored_hash):
                auth_user_id = str(prof["id"])
                full_name = prof.get("full_name") or ""
                email = prof.get("email") or identifier
    except Exception as exc:
        if not _is_missing_profiles_table_error(exc):
            pass

    # Strategy 2: Attempt Supabase Auth login if Strategy 1 didn't resolve
    if not auth_user_id:
        try:
            temp_client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
            auth_response = temp_client.auth.sign_in_with_password({
                "email": effective_email,
                "password": req.password
            })
            if auth_response and hasattr(auth_response, 'user') and auth_response.user:
                auth_user_id = str(auth_response.user.id)
                email = auth_response.user.email or identifier
        except Exception:
            auth_user_id = None

    # Strategy 3: Check memory fallback dictionary
    if not auth_user_id:
        fallback_user = _fallback_users_by_email.get(identifier)
        if not fallback_user:
            fallback_user = next((u for u in _fallback_users_by_email.values() if u.get("phone") == identifier), None)
        if fallback_user and verify_pin(req.password, fallback_user.get("password_hash")):
            auth_user_id = fallback_user["id"]
            full_name = fallback_user.get("full_name") or ""
            email = fallback_user.get("email") or identifier

    if not auth_user_id:
        raise HTTPException(status_code=401, detail="Incorrect phone/email or password.")

    # Fetch full_name from profiles if not loaded yet
    if not full_name:
        try:
            profile_res = supabase.table("profiles").select("full_name").eq("id", auth_user_id).execute()
            if profile_res.data:
                full_name = profile_res.data[0].get("full_name") or ""
        except Exception:
            pass

    try:
        supabase.table("sessions").insert({"user_id": auth_user_id}).execute()
    except Exception:
        pass

    verified_roles = _get_verified_responder_roles(auth_user_id)
    verified_role = verified_roles[0] if verified_roles else None

    return _build_auth_response(
        user_id=auth_user_id,
        full_name=full_name,
        email=email,
        responder_role=verified_role,
    )

@router.post("/verify-pin")
async def verify_device_pin(req: VerifyPinRequest, user_id: str = Depends(get_current_user_id)):
    try:
        response = supabase.table("profiles").select("*").eq("id", user_id).execute()

        if not response.data:
            raise HTTPException(status_code=401, detail="User not found")

        user = response.data[0]
    except Exception as exc:
        if not _is_missing_profiles_table_error(exc):
            raise

        user = _fallback_users_by_id.get(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

    if not verify_pin(req.pin, user["security_pin_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect PIN")

    return {"message": "PIN verified successfully", "is_match": True}

@router.post("/refresh")
async def refresh_token(req: RefreshTokenRequest):
    payload = decode_token(req.refresh_token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    # Generate new access token
    token_claims = {"sub": user_id}
    if payload.get("responder_role"):
        token_claims["responder_role"] = payload["responder_role"]
    access_token = create_access_token(token_claims)
    
    # Update session in DB (simplistic, just update the most recent one)
    sessions_res = supabase.table("sessions").select("*").eq("user_id", user_id).order("last_active_at", desc=True).limit(1).execute()
    
    if sessions_res.data:
        session_id = sessions_res.data[0]["id"]
        supabase.table("sessions").update({"last_active_at": datetime.now(timezone.utc).isoformat()}).eq("id", session_id).execute()
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
