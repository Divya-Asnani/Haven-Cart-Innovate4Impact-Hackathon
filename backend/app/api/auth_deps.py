from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.security.jwt import decode_token
from app.database.supabase_client import supabase


security = HTTPBearer()

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_id
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_profile_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_user_id: str = Depends(get_current_user_id),
) -> str:
    """Resolve the authenticated auth.users ID to the application's profiles ID."""
    try:
        profile_res = supabase.table("profiles").select("id").eq("id", auth_user_id).limit(1).execute()
        if profile_res.data:
            return str(profile_res.data[0]["id"])
    except Exception:
        # auth.users IDs may be valid UUIDs unrelated to profiles.id, or may be
        # represented differently by an upstream auth provider. Fall back to email.
        pass

    payload = decode_token(credentials.credentials)
    email = payload.get("email")
    if not email:
        try:
            auth_user = supabase.auth.admin.get_user_by_id(auth_user_id)
            email = getattr(getattr(auth_user, "user", None), "email", None)
        except Exception:
            email = None

    if email:
        profile_res = supabase.table("profiles").select("id").eq("email", email).limit(1).execute()
        if profile_res.data:
            return str(profile_res.data[0]["id"])

    raise HTTPException(status_code=403, detail="Authenticated user has no application profile.")

def resolve_auth_user_to_profile_id(auth_user_id: str) -> str | None:
    """Resolve an auth.users ID to profiles.id without assuming the values match."""
    try:
        direct = supabase.table("profiles").select("id").eq("id", auth_user_id).limit(1).execute()
        if direct.data:
            return str(direct.data[0]["id"])
    except Exception:
        pass
    try:
        auth_user = supabase.auth.admin.get_user_by_id(auth_user_id)
        email = getattr(getattr(auth_user, "user", None), "email", None)
        if email:
            profile = supabase.table("profiles").select("id").eq("email", email).limit(1).execute()
            if profile.data:
                return str(profile.data[0]["id"])
    except Exception:
        pass
    return None

def get_responder_roles(credentials: HTTPAuthorizationCredentials = Depends(security)) -> list[str]:
    """
    1. extracts authenticated user_id from JWT
    2. queries user_roles
    3. joins roles
    4. verifies role is_active = TRUE
    5. verifies user_roles.is_active = TRUE
    6. returns the authenticated user's role(s)
    """
    payload = decode_token(credentials.credentials)
    verified_role = payload.get("responder_role")
    if verified_role in {"NGO", "MEDICAL", "AUTHORITY", "ADMIN"}:
        return [verified_role]

    user_id = payload.get("sub")
    roles = []
        
    try:
        # We query user_roles joined with roles
        res = supabase.table("user_roles").select("role_id, is_active, roles(role_code, is_active)").eq("user_id", user_id).execute()
        for ur in res.data:
            if ur.get("is_active") and ur.get("roles") and ur["roles"].get("is_active"):
                role_code = ur["roles"].get("role_code")
                if role_code and role_code not in roles:
                    roles.append(role_code)
    except Exception as e:
        print(f"Error fetching roles: {e}")
        pass
        
    if not roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have any active responder roles."
        )
        
    return roles

def get_responder_memberships(user_id: str = Depends(get_current_user_id)) -> list[str]:
    """
    Fetches the support_service_id list where membership_status = 'ACTIVE'
    """
    service_ids = []
    try:
        res = supabase.table("responder_service_memberships").select("support_service_id").eq("user_id", user_id).eq("membership_status", "ACTIVE").execute()
        for item in res.data:
            sid = item.get("support_service_id")
            if sid and sid not in service_ids:
                service_ids.append(sid)
    except Exception as e:
        print(f"Error fetching memberships: {e}")
        
    return service_ids

def get_authorized_service_ids(membership_ids: list[str], service_types: list[str]) -> list[str]:
    """Return active verified services of the requested types for the responder memberships."""
    if not membership_ids:
        return []
    try:
        res = (supabase.table("support_services")
               .select("id")
               .in_("id", membership_ids)
               .in_("service_type", service_types)
               .eq("is_active", True)
               .eq("is_verified", True)
               .execute())
        return [str(row["id"]) for row in (res.data or [])]
    except Exception as e:
        print(f"Error resolving authorized services: {e}")
        return []

def get_ngo_user_id(
    user_id: str = Depends(get_current_user_id),
    roles: list[str] = Depends(get_responder_roles)
) -> str:
    # Ensure they have the NGO role specifically
    if "NGO" not in roles and "ADMIN" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have NGO privileges."
        )
    return user_id
