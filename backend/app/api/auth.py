from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, status, Depends
from postgrest.exceptions import APIError
from app.schemas.requests import SignupRequest, LoginRequest, VerifyPinRequest, RefreshTokenRequest
from app.database.supabase_client import supabase
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


def _build_auth_response(user_id: str, full_name: str, email: str, message: str | None = None):
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})

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
        response = supabase.table("profiles").select("*").eq("email", req.email).execute()

        if not response.data:
            raise HTTPException(status_code=401, detail="Incorrect email or password")

        user = response.data[0]

        if not verify_pin(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Incorrect email or password")

        user_id = str(user["id"])

        try:
            supabase.table("sessions").insert({"user_id": user_id}).execute()
        except Exception:
            pass

        return _build_auth_response(
            user_id=user_id,
            full_name=user.get("full_name") or "",
            email=user.get("email") or req.email,
        )
    except Exception as exc:
        if not _is_missing_profiles_table_error(exc):
            raise

        user = _fallback_users_by_email.get(req.email)
        if not user or not verify_pin(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Incorrect email or password")

        return _build_auth_response(
            user_id=user["id"],
            full_name=user.get("full_name") or "",
            email=user.get("email") or req.email,
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
    access_token = create_access_token({"sub": user_id})
    
    # Update session in DB (simplistic, just update the most recent one)
    sessions_res = supabase.table("sessions").select("*").eq("user_id", user_id).order("last_active_at", desc=True).limit(1).execute()
    
    if sessions_res.data:
        session_id = sessions_res.data[0]["id"]
        supabase.table("sessions").update({"last_active_at": datetime.now(timezone.utc).isoformat()}).eq("id", session_id).execute()
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
