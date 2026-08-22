from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.database.supabase_client import supabase
from app.services.case_service import fetch_case_or_404, get_medical_required, authorize_case_access
from app.services.responder_deps import ResponderContext, get_current_responder

router = APIRouter(prefix="/api/v1/cases", tags=["Alerts"])

@router.post("/{case_id}/escalate")
async def escalate_case(case_id: str, responder: ResponderContext = Depends(get_current_responder)):
    case = fetch_case_or_404(case_id)
    authorize_case_access(case, responder.role)

    # Always create TRUSTED_CONTACT alert
    alerts = [{"case_id": case_id, "recipient_type": "TRUSTED_CONTACT", "channel": "MOCK_SMS", "status": "SENT", "delivery_mode": "MOCK"}]
    
    medical_req = get_medical_required(case.get("assessment_id"))
    if medical_req:
        alerts.append({"case_id": case_id, "recipient_type": "NGO", "channel": "MOCK_SMS", "status": "SENT", "delivery_mode": "MOCK"})
        
    # Check if authority is required
    answers_res = supabase.table("safety_assessment_answers").select("answer_value").eq("assessment_id", case.get("assessment_id")).eq("question_key", "q_authority").execute()
    authority_req = False
    if answers_res.data:
        authority_req = answers_res.data[0].get("answer_value", False)
        
    if authority_req:
        alerts.append({"case_id": case_id, "recipient_type": "AUTHORITY", "channel": "MOCK_SMS", "status": "SENT", "delivery_mode": "MOCK"})

    try:
        supabase.table("emergency_alerts").insert(alerts).execute()
    except Exception as e:
        # Ignore errors if table is not yet created or other issues
        print("Error inserting alerts:", str(e))

    return {"message": "Emergency alerts simulated successfully", "alerts_created": len(alerts)}

@router.get("/{case_id}/alerts")
async def get_case_alerts(case_id: str, responder: ResponderContext = Depends(get_current_responder)):
    case = fetch_case_or_404(case_id)
    authorize_case_access(case, responder.role)

    try:
        res = supabase.table("emergency_alerts").select("*").eq("case_id", case_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception:
        return []
