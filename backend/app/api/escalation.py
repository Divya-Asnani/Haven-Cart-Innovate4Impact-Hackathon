from fastapi import APIRouter, Depends, HTTPException
import uuid
import logging
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id
from app.schemas.escalation import EscalationPayload
from app.api.support_services import haversine_distance

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/safety", tags=["Escalation"])

@router.post("/assessments/{local_assessment_id}/escalate", response_model=EscalationPayload)
async def escalate_assessment(local_assessment_id: str, user_id: str = Depends(get_current_user_id)):
    # 1. Lookup the case
    case_res = supabase.table("safety_cases").select("id, risk_level").eq("assessment_id", local_assessment_id).eq("user_id", user_id).execute()
    if not case_res.data:
        raise HTTPException(status_code=404, detail="Safety case not found for this assessment")
    
    case_data = case_res.data[0]
    case_id = case_data.get("id")
    risk_level = case_data.get("risk_level")
    
    if risk_level != "HIGH":
        raise HTTPException(status_code=400, detail="Only HIGH risk cases can be escalated")

    # 2. Idempotency Check
    existing_alerts = supabase.table("emergency_alerts").select("id").eq("case_id", case_id).execute()
    if existing_alerts.data and len(existing_alerts.data) > 0:
        return EscalationPayload(
            case_id=case_id,
            risk_level=risk_level,
            support_services_assigned=0,
            trusted_contacts_notified=0,
            alerts_created=0,
            status="ALREADY_ESCALATED"
        )

    # 3. Get User Location
    user_res = supabase.table("profiles").select("latitude, longitude").eq("id", user_id).execute()
    user_lat, user_lon = None, None
    if user_res.data:
        user_lat = user_res.data[0].get("latitude")
        user_lon = user_res.data[0].get("longitude")
    
    has_location = user_lat is not None and user_lon is not None and not (user_lat == 0 and user_lon == 0)

    # 4. Rank Support Services
    services_res = supabase.table("support_services").select("*").eq("is_active", True).eq("is_verified", True).execute()
    services = services_res.data
    
    ranked_services = []
    for s in services:
        dist = None
        if has_location and s.get("latitude") is not None and s.get("longitude") is not None:
            dist = haversine_distance(user_lat, user_lon, s["latitude"], s["longitude"])
            coverage = s.get("coverage_radius_km")
            if coverage is not None and dist > coverage:
                continue
        ranked_services.append((s, dist))

    # Fallback: if strict radius filtering excluded ALL services, ignore radius so we at least assign someone.
    if has_location and not ranked_services:
        for s in services:
            if s.get("latitude") is not None and s.get("longitude") is not None:
                dist = haversine_distance(user_lat, user_lon, s["latitude"], s["longitude"])
                ranked_services.append((s, dist))

    if has_location:
        ranked_services.sort(key=lambda x: (x[1] if x[1] is not None else float('inf'), x[0].get('priority', 100)))
    else:
        ranked_services.sort(key=lambda x: (x[0].get('priority', 100), x[0].get('name', '')))
        
    top_services = ranked_services[:3]

    # 5. Fetch Trusted Contacts
    contacts_res = supabase.table("trusted_contacts").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    trusted_contacts = contacts_res.data

    # 6. Create Assignments and Alerts
    alerts_to_insert = []
    assignments_to_insert = []
    
    # Assignments & Alerts for Support Services
    for s_tuple in top_services:
        s = s_tuple[0]
        # Assignment
        assignments_to_insert.append({
            "id": str(uuid.uuid4()),
            "case_id": case_id,
            "support_service_id": s["id"],
            "assignment_status": "ASSIGNED"
        })
        # Alert
        alerts_to_insert.append({
            "id": str(uuid.uuid4()),
            "case_id": case_id,
            "support_service_id": s["id"],
            "recipient_type": s["service_type"],
            "channel": "API",
            "delivery_mode": "MOCK",
            "status": "SENT"
        })
        
    # Alerts for Trusted Contacts
    for c in trusted_contacts:
        alerts_to_insert.append({
            "id": str(uuid.uuid4()),
            "case_id": case_id,
            "trusted_contact_id": c["id"],
            "recipient_type": "TRUSTED_CONTACT",
            "channel": c.get("preferred_channel", "SMS"),
            "delivery_mode": "MOCK",
            "status": "SENT"
        })
        
    # Execute Inserts
    try:
        if assignments_to_insert:
            supabase.table("case_assignments").insert(assignments_to_insert).execute()
        if alerts_to_insert:
            supabase.table("emergency_alerts").insert(alerts_to_insert).execute()
    except Exception as e:
        logger.error(f"Failed to insert escalation records: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete emergency escalation")

    return EscalationPayload(
        case_id=case_id,
        risk_level=risk_level,
        support_services_assigned=len(assignments_to_insert),
        trusted_contacts_notified=len(trusted_contacts),
        alerts_created=len(alerts_to_insert),
        status="ESCALATED"
    )
