from fastapi import APIRouter, HTTPException, Depends
from app.schemas.safety import CreateSafetyAssessmentRequest
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id
import logging

router = APIRouter(prefix="/api/v1/safety", tags=["Safety"])

logger = logging.getLogger(__name__)

@router.post("/assessments")
async def create_assessment(req: CreateSafetyAssessmentRequest, user_id: str = Depends(get_current_user_id)):
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
        return res.data

    except Exception as e:
        logger.error(f"Failed to process safety assessment: {e}")
        raise HTTPException(status_code=500, detail="Failed to process safety assessment safely.")
