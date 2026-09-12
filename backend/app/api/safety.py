from fastapi import APIRouter, HTTPException, Depends
from app.schemas.safety import CreateSafetyAssessmentRequest
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id, get_current_profile_id
import logging

router = APIRouter(prefix="/api/v1/safety", tags=["Safety"])

logger = logging.getLogger(__name__)

@router.post("/assessments")
async def create_assessment(req: CreateSafetyAssessmentRequest, user_id: str = Depends(get_current_profile_id)):
    local_id_str = str(req.local_assessment_id)
    
    # 1. Prepare data
    # Prepare RPC payload
    rpc_payload = {
        "p_assessment_id": local_id_str,
        "p_user_id": user_id,
        "p_session_id": str(req.session_id) if req.session_id else None,
        "p_answers": req.answers.dict(),
        "p_ml_risk_level": req.ml_risk_level,
        "p_ml_confidence": req.ml_confidence,
        "p_final_risk_level": req.final_risk_level,
        "p_decision_source": req.decision_source,
        "p_override_reason": req.override_reason,
        "p_model_version": req.model_version,
        "p_started_at": req.started_at.isoformat(),
        "p_completed_at": req.completed_at.isoformat()
    }

    try:
        # Perform exactly one atomic PostgreSQL transaction
        res = supabase.rpc("insert_safety_assessment", rpc_payload).execute()
        
        # PostgREST rpc returns the JSONB response directly
        data = res.data
        if isinstance(data, list) and len(data) > 0:
            data = data[0]
        
        medical_help = bool(getattr(req.answers, 'medical_help', False))

        # Keep compatibility with deployments that still have the older HIGH-only RPC.
        if data and isinstance(data, dict) and not data.get("case_created"):
            case_insert = supabase.table("safety_cases").insert({
                "user_id": user_id,
                "assessment_id": local_id_str,
                "case_status": "OPEN",
                "risk_level": req.final_risk_level,
                "medical_required": medical_help
            }).execute()
            if case_insert.data:
                data["case_created"] = True
                data["case_id"] = case_insert.data[0]["id"]

        # Ensure medical_required is explicitly updated regardless of RPC version
        case_id = data.get("case_id") if isinstance(data, dict) else None
        if case_id:
            try:
                supabase.table("safety_cases").update({"medical_required": medical_help}).eq("id", case_id).execute()
                # Auto-link all evidence items for user to current active case
                supabase.table("evidence_items").update({"case_id": case_id}).eq("user_id", user_id).execute()
                logger.info(f"[Safety] Successfully auto-linked evidence items to case_id={case_id} for user_id={user_id}")
            except Exception as update_err:
                logger.warning(f"Failed post-assessment update for case {case_id}: {update_err}")

        return data

    except Exception as e:
        logger.error(f"Failed to process safety assessment: {e}")
        raise HTTPException(status_code=500, detail="Failed to process safety assessment safely.")
