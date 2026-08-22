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
    # Generate hashes once for both DB and fallback paths.
    password_hash = get_pin_hash(req.password)
    pin_hash = get_pin_hash(req.pin)

    try:
        # Check if user already exists
        response = supabase.table("profiles").select("*").eq("email", req.email).execute()
        if response.data:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create Profile
        new_profile_data = {
            "full_name": req.full_name,
            "email": req.email,
            "password_hash": password_hash,
            "security_pin_hash": pin_hash
        }
        insert_res = supabase.table("profiles").insert(new_profile_data).execute()

        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Failed to create user")

        new_profile = insert_res.data[0]
        user_id = str(new_profile["id"])

        # Session insert is best-effort to avoid auth hard-failure when session table/policies differ.
        try:
            supabase.table("sessions").insert({"user_id": user_id}).execute()
        except Exception:
            pass

        return _build_auth_response(
            user_id=user_id,
            full_name=new_profile.get("full_name") or req.full_name,
            email=new_profile.get("email") or req.email,
            message="User registered",
        )
    except Exception as exc:
        if not _is_missing_profiles_table_error(exc):
            raise

        # Fallback mode: allow auth flow to proceed when profiles table is unavailable.
        existing = _fallback_users_by_email.get(req.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = str(uuid4())
        user_record = {
            "id": user_id,
            "full_name": req.full_name,
            "email": req.email,
            "password_hash": password_hash,
            "security_pin_hash": pin_hash,
        }
        _fallback_users_by_email[req.email] = user_record
        _fallback_users_by_id[user_id] = user_record

        return _build_auth_response(
            user_id=user_id,
            full_name=req.full_name,
            email=req.email,
            message="User registered",
        )

@router.post("/login")
async def login(req: LoginRequest):
    try:
        # Authenticate via Supabase Auth using a temp client to avoid corrupting global state
        temp_client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        auth_response = temp_client.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        user_id = str(auth_response.user.id)
        email = auth_response.user.email

        # Try to fetch full_name from profiles, and create the profile if missing (so FKs don't fail)
        full_name = ""
        try:
            profile_res = supabase.table("profiles").select("full_name").eq("id", user_id).execute()
            if profile_res.data:
                full_name = profile_res.data[0].get("full_name") or ""
            else:
                supabase.table("profiles").insert({
                    "id": user_id,
                    "email": email or req.email,
                    "password_hash": "supabase-auth",
                    "security_pin_hash": "supabase-auth",
                    "full_name": ""
                }).execute()
        except Exception:
            pass

        try:
            supabase.table("sessions").insert({"user_id": user_id}).execute()
        except Exception:
            pass

        verified_role = None
        if req.role:
            requested_role = req.role.strip().upper()
            if requested_role not in {"NGO", "MEDICAL", "AUTHORITY", "ADMIN"}:
                raise HTTPException(status_code=400, detail="Invalid responder role")
            verified_roles = _get_verified_responder_roles(user_id)
            if requested_role not in verified_roles:
                raise HTTPException(status_code=403, detail="Role mismatch")
            verified_role = requested_role

        return _build_auth_response(
            user_id=user_id,
            full_name=full_name,
            email=email or req.email,
            responder_role=verified_role,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

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
