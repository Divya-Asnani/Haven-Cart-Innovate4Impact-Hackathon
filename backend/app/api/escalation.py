from fastapi import APIRouter, Depends, HTTPException
import uuid
import logging
import traceback
from datetime import datetime, timezone
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id
from app.schemas.escalation import EscalationPayload
from app.api.support_services import haversine_distance
from app.services.sms import send_sms, mask_phone, normalize_e164, safe_print

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/safety", tags=["Escalation"])


def _build_trusted_contact_message(case_id: str, risk_level: str) -> str:
    """Build minimal alert message for trusted contacts."""
    return f"HavenCart Alert: A trusted contact may need help. Case ref: {case_id}. Risk: {risk_level}."


def _build_ngo_message(case_id: str, risk_level: str) -> str:
    """Build alert message for NGO support services."""
    return f"HavenCart Alert: A case requires NGO support. Case ref: {case_id}. Risk: {risk_level}. View details in responder portal."


def _build_authority_message(case_id: str) -> str:
    """Build urgent alert message for police/authorities."""
    return f"HavenCart URGENT: Emergency reported. Case ref: {case_id}. Immediate response required. View details in responder portal."


def _build_medical_message(case_id: str) -> str:
    """Build urgent medical alert message for hospital/medical services."""
    return f"HavenCart URGENT: Medical assistance requested. Case ref: {case_id}. Immediate response required. View details in responder portal."


def _build_user_message() -> str:
    """Build confirmation alert message for user."""
    return "HavenCart: Your alert has been sent. Help is on the way. Stay safe."


@router.post("/assessments/{local_assessment_id}/escalate", response_model=EscalationPayload)
async def escalate_assessment(local_assessment_id: str, user_id: str = Depends(get_current_user_id)):
    # 1. Lookup the case
    case_res = supabase.table("safety_cases").select("id, risk_level, user_id, medical_required").eq("assessment_id", local_assessment_id).eq("user_id", user_id).execute()
    if not case_res.data:
        case_res = supabase.table("safety_cases").select("id, risk_level, user_id, medical_required").eq("id", local_assessment_id).eq("user_id", user_id).execute()
    if not case_res.data:
        raise HTTPException(status_code=404, detail="Safety case not found for this assessment")
    
    case_data = case_res.data[0]
    case_id = case_data.get("id")
    risk_level = case_data.get("risk_level", "HIGH")
    case_user_id = case_data.get("user_id") or user_id
    medical_required = bool(case_data.get("medical_required", False))

    # 2. Idempotency Check: only skip if alerts were already successfully sent
    existing_alerts = supabase.table("emergency_alerts").select("id, status").eq("case_id", case_id).execute()
    has_sent_alerts = existing_alerts.data and any(a.get("status") == "SENT" for a in existing_alerts.data)
    if has_sent_alerts:
        print(f"[SMS] case_id={case_id} already has SENT alerts. Returning ALREADY_ESCALATED.", flush=True)
        return EscalationPayload(
            case_id=case_id,
            risk_level=risk_level,
            support_services_assigned=0,
            trusted_contacts_notified=0,
            alerts_created=0,
            status="ALREADY_ESCALATED"
        )

    # 3. Get User Location
    user_res = supabase.table("profiles").select("latitude, longitude, phone").eq("id", case_user_id).execute()
    user_lat, user_lon = None, None
    user_phone_raw = None
    if user_res.data:
        user_lat = user_res.data[0].get("latitude")
        user_lon = user_res.data[0].get("longitude")
        user_phone_raw = user_res.data[0].get("phone")
    
    has_location = user_lat is not None and user_lon is not None and not (user_lat == 0 and user_lon == 0)

    # 4. Rank Support Services
    services_res = supabase.table("support_services").select("*").eq("is_active", True).eq("is_verified", True).execute()
    services = services_res.data or []
    
    ranked_services = []
    for s in services:
        dist = None
        if has_location and s.get("latitude") is not None and s.get("longitude") is not None:
            dist = haversine_distance(user_lat, user_lon, s["latitude"], s["longitude"])
            coverage = s.get("coverage_radius_km")
            if coverage is not None and dist > coverage:
                continue
        ranked_services.append((s, dist))

    if has_location and not ranked_services:
        for s in services:
            if s.get("latitude") is not None and s.get("longitude") is not None:
                dist = haversine_distance(user_lat, user_lon, s["latitude"], s["longitude"])
                ranked_services.append((s, dist))

    if has_location:
        ranked_services.sort(key=lambda x: (x[1] if x[1] is not None else float('inf'), x[0].get('priority', 100)))
    else:
        ranked_services.sort(key=lambda x: (x[0].get('priority', 100), x[0].get('name', '')))
        
    # Ensure balanced representation: include 1 NGO, 1 POLICE/AUTHORITY, and 1 MEDICAL/HOSPITAL
    selected_services = []
    selected_ids = set()

    # Police / Authority
    for s, dist in ranked_services:
        if s.get("service_type") in ("POLICE", "AUTHORITY") and s["id"] not in selected_ids:
            selected_services.append((s, dist))
            selected_ids.add(s["id"])
            break

    # NGO
    for s, dist in ranked_services:
        if s.get("service_type") in ("NGO", "SHELTER", "HELPLINE") and s["id"] not in selected_ids:
            selected_services.append((s, dist))
            selected_ids.add(s["id"])
            break

    # Medical / Hospital
    for s, dist in ranked_services:
        if s.get("service_type") in ("HOSPITAL", "MEDICAL") and s["id"] not in selected_ids:
            selected_services.append((s, dist))
            selected_ids.add(s["id"])
            break

    # Fill remaining slots up to 3
    for s_tuple in ranked_services:
        if len(selected_services) >= 3:
            break
        if s_tuple[0]["id"] not in selected_ids:
            selected_services.append(s_tuple)
            selected_ids.add(s_tuple[0]["id"])

    top_services = selected_services if selected_services else ranked_services[:3]

    # 5. Fetch Trusted Contacts
    contacts_res = supabase.table("trusted_contacts").select("*").eq("user_id", case_user_id).eq("is_active", True).execute()
    trusted_contacts = contacts_res.data or []

    # Recipient categorization for required logging
    user_recipients = [user_phone_raw] if (user_phone_raw and str(user_phone_raw).strip()) else []
    authority_services = [s[0] for s in top_services if s[0].get("service_type") in ("POLICE", "AUTHORITY")]
    ngo_services = [s[0] for s in top_services if s[0].get("service_type") in ("NGO", "SHELTER", "HELPLINE")]
    medical_services = [s[0] for s in top_services if s[0].get("service_type") in ("HOSPITAL", "MEDICAL")]

    # Required Logging
    safe_print(f"[SMS] escalation started: case_id={case_id}")
    logger.info(f"[SMS] escalation started: case_id={case_id}")
    safe_print(f"[SMS] USER recipients found: {len(user_recipients)}")
    logger.info(f"[SMS] USER recipients found: {len(user_recipients)}")
    safe_print(f"[SMS] TRUSTED_CONTACT recipients found: {len(trusted_contacts)}")
    logger.info(f"[SMS] TRUSTED_CONTACT recipients found: {len(trusted_contacts)}")
    safe_print(f"[SMS] AUTHORITY recipients found: {len(authority_services)}")
    logger.info(f"[SMS] AUTHORITY recipients found: {len(authority_services)}")
    safe_print(f"[SMS] NGO recipients found: {len(ngo_services)}")
    logger.info(f"[SMS] NGO recipients found: {len(ngo_services)}")
    safe_print(f"[SMS] MEDICAL recipients found: {len(medical_services)}")
    logger.info(f"[SMS] MEDICAL recipients found: {len(medical_services)}")

    alerts_to_insert = []
    assignments_to_insert = []
    now_iso = datetime.now(timezone.utc).isoformat()
    support_services_notified = 0

    # 6. Dispatch SMS to Support Services (POLICE, NGO, MEDICAL)
    for s_tuple in top_services:
        s = s_tuple[0]
        service_id = s["id"]
        service_type = s.get("service_type", "OTHER")
        raw_phone = (s.get("phone") or "").strip()
        phone = normalize_e164(raw_phone)
        alert_id = str(uuid.uuid4())

        # Assignment row
        assignments_to_insert.append({
            "id": str(uuid.uuid4()),
            "case_id": case_id,
            "support_service_id": service_id,
            "assignment_status": "ASSIGNED"
        })

        should_send_sms = False
        sms_body = None

        if service_type in ("POLICE", "AUTHORITY"):
            if risk_level == "HIGH" and phone:
                should_send_sms = True
                sms_body = _build_authority_message(case_id)
        elif service_type in ("HOSPITAL", "MEDICAL"):
            if phone:
                should_send_sms = True
                sms_body = _build_medical_message(case_id)
        else: # NGO, SHELTER, HELPLINE
            if phone:
                should_send_sms = True
                sms_body = _build_ngo_message(case_id, risk_level)

        if should_send_sms:
            masked = mask_phone(phone)
            safe_print(f"[SMS] Attempting {service_type} → {masked}")
            logger.info(f"[SMS] Attempting {service_type} → {masked}")
            sms_result = send_sms(to=phone, body=sms_body)
            
            is_sent = bool(sms_result.get("success") and sms_result.get("message_sid"))
            if is_sent:
                alerts_to_insert.append({
                    "id": alert_id,
                    "case_id": case_id,
                    "support_service_id": service_id,
                    "recipient_type": service_type if service_type in ("POLICE", "AUTHORITY", "NGO", "HOSPITAL", "HELPLINE") else "OTHER",
                    "channel": "SMS",
                    "delivery_mode": "REAL",
                    "status": "SENT",
                    "external_reference": sms_result.get("message_sid"),
                    "created_at": now_iso,
                    "sent_at": now_iso
                })
                support_services_notified += 1
            else:
                err = sms_result.get("error") or "Twilio rejection or failure"
                alerts_to_insert.append({
                    "id": alert_id,
                    "case_id": case_id,
                    "support_service_id": service_id,
                    "recipient_type": service_type if service_type in ("POLICE", "AUTHORITY", "NGO", "HOSPITAL", "HELPLINE") else "OTHER",
                    "channel": "SMS",
                    "delivery_mode": "REAL",
                    "status": "FAILED",
                    "failure_reason": str(err),
                    "created_at": now_iso
                })
        else:
            # Service has no phone or police not high risk
            alerts_to_insert.append({
                "id": alert_id,
                "case_id": case_id,
                "support_service_id": service_id,
                "recipient_type": service_type if service_type in ("POLICE", "AUTHORITY", "NGO", "HOSPITAL", "HELPLINE") else "OTHER",
                "channel": "SMS",
                "delivery_mode": "REAL",
                "status": "FAILED",
                "failure_reason": f"No valid phone number on file for {service_type}",
                "created_at": now_iso
            })

    # 7. Dispatch SMS to Trusted Contacts
    trusted_contacts_notified = 0
    contact_alert_message = _build_trusted_contact_message(case_id, risk_level)
    for c in trusted_contacts:
        alert_id = str(uuid.uuid4())
        raw_phone = (c.get("phone") or "").strip()
        phone = normalize_e164(raw_phone)
        
        if phone:
            masked = mask_phone(phone)
            safe_print(f"[SMS] Attempting TRUSTED_CONTACT → {masked}")
            logger.info(f"[SMS] Attempting TRUSTED_CONTACT → {masked}")
            sms_result = send_sms(to=phone, body=contact_alert_message)
            
            is_sent = bool(sms_result.get("success") and sms_result.get("message_sid"))
            if is_sent:
                alerts_to_insert.append({
                    "id": alert_id,
                    "case_id": case_id,
                    "trusted_contact_id": c["id"],
                    "recipient_type": "TRUSTED_CONTACT",
                    "channel": "SMS",
                    "delivery_mode": "REAL",
                    "status": "SENT",
                    "external_reference": sms_result.get("message_sid"),
                    "created_at": now_iso,
                    "sent_at": now_iso
                })
                trusted_contacts_notified += 1
            else:
                err = sms_result.get("error") or "Twilio SMS delivery failed"
                alerts_to_insert.append({
                    "id": alert_id,
                    "case_id": case_id,
                    "trusted_contact_id": c["id"],
                    "recipient_type": "TRUSTED_CONTACT",
                    "channel": "SMS",
                    "delivery_mode": "REAL",
                    "status": "FAILED",
                    "failure_reason": str(err),
                    "created_at": now_iso
                })
        else:
            alerts_to_insert.append({
                "id": alert_id,
                "case_id": case_id,
                "trusted_contact_id": c["id"],
                "recipient_type": "TRUSTED_CONTACT",
                "channel": "SMS",
                "delivery_mode": "REAL",
                "status": "FAILED",
                "failure_reason": "No phone number on file for trusted contact",
                "created_at": now_iso
            })

    # 8. Dispatch SMS to USER (Victim)
    user_alert_id = str(uuid.uuid4())
    user_sms_body = _build_user_message()
    user_phone = normalize_e164((user_phone_raw or "").strip())
    
    primary_service_id = top_services[0][0]["id"] if top_services else None

    if user_phone:
        masked_user_phone = mask_phone(user_phone)
        safe_print(f"[SMS] Attempting USER → {masked_user_phone}")
        logger.info(f"[SMS] Attempting USER → {masked_user_phone}")
        user_sms_res = send_sms(to=user_phone, body=user_sms_body)
        
        user_is_sent = bool(user_sms_res.get("success") and user_sms_res.get("message_sid"))
        alerts_to_insert.append({
            "id": user_alert_id,
            "case_id": case_id,
            "support_service_id": primary_service_id,
            "recipient_type": "OTHER",
            "channel": "SMS",
            "delivery_mode": "REAL",
            "status": "SENT" if user_is_sent else "FAILED",
            "external_reference": user_sms_res.get("message_sid"),
            "failure_reason": None if user_is_sent else f"[USER] {user_sms_res.get('error') or 'Twilio delivery failed'}",
            "created_at": now_iso,
            "sent_at": now_iso if user_is_sent else None
        })
    else:
        alerts_to_insert.append({
            "id": user_alert_id,
            "case_id": case_id,
            "support_service_id": primary_service_id,
            "recipient_type": "OTHER",
            "channel": "SMS",
            "delivery_mode": "REAL",
            "status": "FAILED",
            "failure_reason": "No phone number on file for user",
            "created_at": now_iso
        })

    # 9. Execute Inserts & Updates in Supabase
    try:
        if assignments_to_insert:
            supabase.table("case_assignments").insert(assignments_to_insert).execute()
        if alerts_to_insert:
            supabase.table("emergency_alerts").insert(alerts_to_insert).execute()
        supabase.table("safety_cases").update({
            "case_status": "ESCALATED",
            "updated_at": now_iso
        }).eq("id", case_id).execute()
    except Exception as e:
        safe_print(f"[SMS] Failed to insert escalation records: {e}")
        traceback.print_exc()
        logger.error(f"Failed to insert escalation records: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to complete emergency escalation: {e}")

    return EscalationPayload(
        case_id=case_id,
        risk_level=risk_level,
        support_services_assigned=len(assignments_to_insert),
        trusted_contacts_notified=trusted_contacts_notified,
        alerts_created=len(alerts_to_insert),
        status="ESCALATED"
    )

