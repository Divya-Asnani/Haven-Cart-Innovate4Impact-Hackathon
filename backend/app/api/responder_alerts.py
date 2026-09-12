from fastapi import APIRouter, Depends, HTTPException
from app.database.supabase_client import supabase
from app.api.auth_deps import (
    get_current_user_id,
    get_responder_memberships,
    get_responder_roles,
    get_authorized_service_ids,
)

router = APIRouter(prefix="/api/v1", tags=["Responder Alerts"])


def _alert_rows(service_ids: list[str], roles: list[str], medical_only: bool):
    if "ADMIN" not in roles and "AUTHORITY" not in roles and not service_ids:
        return []

    response = (supabase.table("emergency_alerts")
                .select("*, safety_cases(id, risk_level, medical_required), support_services(id, name, service_type)")
                .order("created_at", desc=True)
                .execute())
    rows = []
    unrestricted = "ADMIN" in roles or "AUTHORITY" in roles

    for alert in response.data or []:
        case = alert.get("safety_cases") or {}
        service = alert.get("support_services") or {}
        case_id = alert.get("case_id")
        service_id = alert.get("support_service_id")

        if case_id and medical_only and not case.get("medical_required"):
            continue
        if not unrestricted:
            # A linked alert follows the responder's authorized case queue. An
            # unlinked alert is authorized by its support service directly.
            if case_id:
                if medical_only and not case.get("medical_required"):
                    continue
                if not medical_only and not case:
                    continue
            elif service_id not in service_ids:
                continue

        rows.append({
            "id": alert.get("id"),
            "case_id": case_id,
            "risk_level": case.get("risk_level"),
            "medical_required": bool(case.get("medical_required")),
            "recipient_type": alert.get("recipient_type"),
            "channel": alert.get("channel"),
            "delivery_mode": alert.get("delivery_mode"),
            "status": alert.get("status"),
            "created_at": alert.get("created_at"),
            "sent_at": alert.get("sent_at"),
            "failure_reason": alert.get("failure_reason"),
            "support_service": service or None,
        })
    return rows


@router.get("/ngo/alerts")
async def get_ngo_alerts(
    user_id: str = Depends(get_current_user_id),
    roles: list[str] = Depends(get_responder_roles),
    memberships: list[str] = Depends(get_responder_memberships),
):
    if "NGO" not in roles and "ADMIN" not in roles and "AUTHORITY" not in roles:
        raise HTTPException(status_code=403, detail="User does not have NGO privileges.")
    service_ids = get_authorized_service_ids(memberships, ["NGO", "SHELTER", "HELPLINE"])
    return _alert_rows(service_ids, roles, medical_only=False)


@router.get("/medical/alerts")
async def get_medical_alerts(
    user_id: str = Depends(get_current_user_id),
    roles: list[str] = Depends(get_responder_roles),
    memberships: list[str] = Depends(get_responder_memberships),
):
    if "MEDICAL" not in roles and "ADMIN" not in roles:
        raise HTTPException(status_code=403, detail="User does not have Medical privileges.")
    service_ids = get_authorized_service_ids(memberships, ["MEDICAL", "HOSPITAL"])
    return _alert_rows(service_ids, roles, medical_only=True)