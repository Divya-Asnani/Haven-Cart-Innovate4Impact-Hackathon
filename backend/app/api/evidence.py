from fastapi import APIRouter, HTTPException, Depends
from app.schemas.evidence import UploadEvidenceRequest
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id
from datetime import datetime, timezone
import base64
import logging

router = APIRouter(prefix="/api/v1/safety", tags=["Evidence"])
logger = logging.getLogger(__name__)

@router.post("/evidence")
async def upload_evidence(req: UploadEvidenceRequest, user_id: str = Depends(get_current_user_id)):
    evidence_id_str = str(req.evidence_id)
    
    # 1. Idempotency Check
    existing = supabase.table("evidence_items").select("id, user_id, case_id").eq("id", evidence_id_str).execute()
    if existing.data:
        # Check ownership
        if existing.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Evidence ID belongs to another user.")
        return {
            "status": "success",
            "evidence_id": evidence_id_str,
            "storage_path": f"{user_id}/{evidence_id_str}.enc",
            "case_id": existing.data[0].get("case_id")
        }

    # 2. Case Linking
    case_id = None
    if req.local_assessment_id:
        local_assessment_str = str(req.local_assessment_id)
        # Verify the assessment exists and belongs to the user
        assessment_res = supabase.table("safety_assessments").select("user_id").eq("id", local_assessment_str).execute()
        if not assessment_res.data:
            raise HTTPException(status_code=400, detail="Provided local_assessment_id does not exist.")
            
        if assessment_res.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Assessment belongs to another user.")
        
        # Find corresponding case
        case_res = supabase.table("safety_cases").select("id, user_id, assessment_id").eq("assessment_id", local_assessment_str).execute()
        if case_res.data:
            case_data = case_res.data[0]
            if case_data.get("user_id") == user_id and case_data.get("assessment_id") == local_assessment_str:
                case_id = case_data.get("id")

    # 3. Decode base64 payload
    try:
        payload_bytes = base64.b64decode(req.payload_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload base64.")

    storage_path = f"{user_id}/{evidence_id_str}.enc"

    # 4. Upload to Supabase Storage
    try:
        # We assume the bucket "evidence" is created and private.
        # This overwrites if it somehow exists but the DB row doesn't (recovery edge case)
        upload_res = supabase.storage.from_("evidence").upload(
            file=payload_bytes,
            path=storage_path,
            file_options={"cache-control": "3600", "upsert": "true", "content-type": "application/octet-stream"}
        )
    except Exception as e:
        logger.error(f"Failed to upload evidence to storage: {e}")
        raise HTTPException(status_code=502, detail="Failed to upload evidence to secure storage.")

    # 5. Insert Database Metadata
    try:
        db_payload = {
            "id": evidence_id_str,
            "case_id": case_id,
            "user_id": user_id,
            "evidence_type": req.type,
            "mime_type": req.mime_type,
            "original_filename": req.original_filename,
            "storage_path": storage_path,
            "encryption_algorithm": req.encryption_algorithm,
            "encryption_version": req.encryption_version,
            "content_hash": req.content_hash,
            "previous_hash": req.previous_hash,
            "chain_index": req.chain_index,
            "upload_status": "UPLOADED",
            "local_status": "SYNCED",
            "captured_at": req.captured_at.isoformat(),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("evidence_items").insert(db_payload).execute()
    except Exception as e:
        logger.error(f"Failed to insert evidence_items: {e}")
        # 6. Rollback Storage Upload
        try:
            supabase.storage.from_("evidence").remove([storage_path])
        except Exception as rb_e:
            logger.error(f"Failed to rollback storage upload for {storage_path}: {rb_e}")
        
        raise HTTPException(status_code=500, detail="Failed to record evidence metadata.")

    # 7. Return Success
    return {
        "status": "success",
        "evidence_id": evidence_id_str,
        "storage_path": storage_path,
        "case_id": case_id
    }
