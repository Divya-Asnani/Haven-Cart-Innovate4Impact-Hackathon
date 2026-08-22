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

# For the hackathon demo, we use a server-side allowlist of NGO User IDs.
# In a real system, this would query RBAC/roles.
# Replace this UUID with the actual UUID of your demo NGO account once created.
DEMO_NGO_USER_IDS = [
    "00000000-0000-0000-0000-000000000000", # Placeholder
]

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
    
    # Backward compatibility with existing DEMO_NGO_USER_IDS
    if user_id in DEMO_NGO_USER_IDS or "00000000-0000-0000-0000-000000000000" in DEMO_NGO_USER_IDS:
        roles.append("NGO")
        
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
