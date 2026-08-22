from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.auth_deps import security
from app.database.supabase_client import supabase
from app.security.jwt import decode_token
from app.services.rbac import is_responder_role

security_bearer = HTTPBearer()


@dataclass
class ResponderContext:
    id: str
    email: str
    full_name: str
    role: str


def get_current_responder(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
) -> ResponderContext:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    res = (
        supabase.table("profiles")
        .select("id, email, full_name, responder_role")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=401, detail="User not found")

    profile = res.data[0]
    role = profile.get("responder_role")
    if not is_responder_role(role):
        raise HTTPException(
            status_code=403,
            detail="Responder access required. This account is not authorized for the portal.",
        )

    return ResponderContext(
        id=str(profile["id"]),
        email=profile.get("email") or "",
        full_name=profile.get("full_name") or "",
        role=role,
    )
