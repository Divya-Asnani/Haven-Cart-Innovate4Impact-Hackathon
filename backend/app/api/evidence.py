import base64
import logging
import traceback
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.evidence import UploadEvidenceRequest
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id

router = APIRouter(prefix="/api/v1/safety", tags=["Evidence"])
logger = logging.getLogger(__name__)

@router.post("/evidence")
async def upload_evidence(req: UploadEvidenceRequest, user_id: str = Depends(get_current_user_id)):
    evidence_id_str = str(req.evidence_id)

    print(f"[Evidence] request received: evidence_id={evidence_id_str}", flush=True)
    logger.info(f"[Evidence] request received: evidence_id={evidence_id_str}")
    
    # 1. Idempotency Check
    existing = supabase.table("evidence_items").select("id, user_id, case_id").eq("id", evidence_id_str).execute()
    if existing.data:
        # Check ownership
        if existing.data[0].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Evidence ID belongs to another user.")
        print(f"[Evidence] final result: idempotent success for {evidence_id_str}", flush=True)
        return {
            "status": "success",
            "evidence_id": evidence_id_str,
            "storage_path": f"{user_id}/{evidence_id_str}.enc",
            "case_id": existing.data[0].get("case_id")
        }

    # 2. Case Linking
    case_id = None
    if req.local_assessment_id:
        local_assessment_str = str(req.local_assessment_id).strip()
        try:
            # Check safety_assessments
            assessment_res = supabase.table("safety_assessments").select("user_id").eq("id", local_assessment_str).execute()
            if assessment_res.data:
                if assessment_res.data[0].get("user_id") != user_id:
                    raise HTTPException(status_code=403, detail="Assessment belongs to another user.")
                # Find corresponding case
                case_res = supabase.table("safety_cases").select("id, user_id").eq("assessment_id", local_assessment_str).execute()
                if case_res.data and case_res.data[0].get("user_id") == user_id:
                    case_id = case_res.data[0].get("id")
            else:
                # Check directly in safety_cases by assessment_id
                case_res = supabase.table("safety_cases").select("id, user_id").eq("assessment_id", local_assessment_str).execute()
                if case_res.data and case_res.data[0].get("user_id") == user_id:
                    case_id = case_res.data[0].get("id")
                else:
                    # Also check by case id directly
                    case_res2 = supabase.table("safety_cases").select("id, user_id").eq("id", local_assessment_str).execute()
                    if case_res2.data and case_res2.data[0].get("user_id") == user_id:
                        case_id = case_res2.data[0].get("id")
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Error querying assessment or case for linking: {e}")

    # Fallback: if case_id is still not linked, link to user's latest safety case
    if not case_id:
        try:
            latest_case = supabase.table("safety_cases").select("id").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
            if latest_case.data:
                case_id = latest_case.data[0].get("id")
                logger.info(f"Linked evidence {evidence_id_str} to latest user case: {case_id}")
        except Exception as e:
            logger.warning(f"Error finding latest safety case for user {user_id}: {e}")

    print(f"[Evidence] case_id/user_id/type: case_id={case_id}, user_id={user_id}, type={req.type}", flush=True)
    logger.info(f"[Evidence] case_id/user_id/type: case_id={case_id}, user_id={user_id}, type={req.type}")

    # 3. Decode base64 payload
    try:
        payload_bytes = base64.b64decode(req.payload_base64)
    except Exception as e:
        print(f"[Evidence] Failed to decode base64 payload: {e}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=400, detail="Invalid payload base64.")

    payload_size = len(payload_bytes)
    print(f"[Evidence] file received + size: bytes={payload_size}", flush=True)
    logger.info(f"[Evidence] file received + size: bytes={payload_size}")

    print(f"[Evidence] encryption result: algo={req.encryption_algorithm}, hash={req.content_hash[:16]}..., index={req.chain_index}", flush=True)
    logger.info(f"[Evidence] encryption result: algo={req.encryption_algorithm}, hash={req.content_hash[:16]}..., index={req.chain_index}")

    storage_bucket = "evidence"
    storage_path = f"{user_id}/{evidence_id_str}.enc"
    print(f"[Evidence] Storage bucket/path: bucket={storage_bucket}, path={storage_path}", flush=True)
    logger.info(f"[Evidence] Storage bucket/path: bucket={storage_bucket}, path={storage_path}")

    # 4. Upload to Supabase Storage
    try:
        upload_res = supabase.storage.from_(storage_bucket).upload(
            file=payload_bytes,
            path=storage_path,
            file_options={"cache-control": "3600", "upsert": "true", "content-type": "application/octet-stream"}
        )
        # Check for error indicators in response
        if hasattr(upload_res, 'json') and callable(upload_res.json):
            try:
                res_json = upload_res.json()
                if isinstance(res_json, dict) and res_json.get("error"):
                    err_msg = res_json.get("message", res_json.get("error"))
                    print(f"[Evidence] Storage response/error: error={err_msg}", flush=True)
                    logger.error(f"[Evidence] Storage upload returned error: {res_json}")
                    raise HTTPException(status_code=502, detail=f"Storage upload error: {err_msg}")
            except (ValueError, TypeError):
                pass
        print(f"[Evidence] Storage response/error: upload SUCCESS path={storage_path}", flush=True)
        logger.info(f"[Evidence] Storage response/error: upload SUCCESS path={storage_path}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Evidence] Storage response/error: EXCEPTION={e}", flush=True)
        traceback.print_exc()
        logger.error(f"Failed to upload evidence to storage: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to upload evidence to secure storage: {e}")

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
        insert_res = supabase.table("evidence_items").insert(db_payload).execute()
        print(f"[Evidence] evidence_items insert response/error: SUCCESS row_id={evidence_id_str}", flush=True)
        logger.info(f"[Evidence] evidence_items insert response/error: SUCCESS row_id={evidence_id_str}")
    except Exception as e:
        print(f"[Evidence] evidence_items insert response/error: FAILED error={e}", flush=True)
        traceback.print_exc()
        logger.error(f"Failed to insert evidence_items: {e}")
        # 6. Rollback Storage Upload
        try:
            supabase.storage.from_(storage_bucket).remove([storage_path])
        except Exception as rb_e:
            logger.error(f"Failed to rollback storage upload for {storage_path}: {rb_e}")
        
        raise HTTPException(status_code=500, detail=f"Failed to record evidence metadata: {e}")

    # 7. Return Success
    print(f"[Evidence] final result: SUCCESS evidence_id={evidence_id_str}, path={storage_path}, case_id={case_id}", flush=True)
    logger.info(f"[Evidence] final result: SUCCESS evidence_id={evidence_id_str}, path={storage_path}, case_id={case_id}")
    return {
        "status": "success",
        "evidence_id": evidence_id_str,
        "storage_path": storage_path,
        "case_id": case_id
    }

from pydantic import BaseModel

class ShareEvidenceRequest(BaseModel):
    responder_user_id: str
    wrapped_evidence_key: str
    responder_public_key_id: str

@router.get("/evidence/{evidence_id}/responders")
async def get_authorized_responders(evidence_id: str, user_id: str = Depends(get_current_user_id)):
    # 1. Authorize victim
    ev_res = supabase.table("evidence_items").select("user_id, case_id").eq("id", evidence_id).execute()
    if not ev_res.data:
        raise HTTPException(status_code=404, detail="Evidence not found.")
    if ev_res.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Evidence belongs to another user.")
        
    case_id = ev_res.data[0].get("case_id")
    if not case_id:
        # LOW/MEDIUM evidence without a case cannot be shared safely yet
        raise HTTPException(status_code=400, detail="Evidence is not associated with an active case. Cannot safely determine authorized responders.")
        
    # 2. Fetch case assignments
    assn_res = supabase.table("case_assignments").select("*, support_services(*)").eq("case_id", case_id).execute()
    
    authorized_responder_ids = set()
    service_requirements = [] # (support_service_id, service_type)
    
    for assn in assn_res.data:
        if assn.get("assigned_user_id"):
            authorized_responder_ids.add(assn["assigned_user_id"])
        if assn.get("support_service_id") and assn.get("support_services"):
            service_requirements.append((
                assn["support_service_id"], 
                assn["support_services"].get("service_type")
            ))
            
    # Add responders based on active service memberships
    if service_requirements:
        service_ids = [req[0] for req in service_requirements]
        mem_res = supabase.table("responder_service_memberships").select("user_id, support_service_id").in_("support_service_id", service_ids).eq("membership_status", "ACTIVE").execute()
        
        # We also need to check if the user has the correct role (NGO/MEDICAL/AUTHORITY) for that service type.
        # For simplicity in this lookup, we'll fetch roles for these users.
        user_ids_to_check = list(set([m["user_id"] for m in mem_res.data]))
        if user_ids_to_check:
            roles_res = supabase.table("user_roles").select("user_id, roles(role_code)").in_("user_id", user_ids_to_check).eq("is_active", True).execute()
            user_roles = {}
            for ur in roles_res.data:
                uid = ur["user_id"]
                if ur.get("roles"):
                    rc = ur["roles"].get("role_code")
                    if uid not in user_roles:
                        user_roles[uid] = []
                    user_roles[uid].append(rc)
                    
            for m in mem_res.data:
                uid = m["user_id"]
                sid = m["support_service_id"]
                stype = next((req[1] for req in service_requirements if req[0] == sid), None)
                roles = user_roles.get(uid, [])
                
                # Check role vs service type
                if "ADMIN" in roles:
                    authorized_responder_ids.add(uid)
                elif "NGO" in roles and stype in ["NGO", "SHELTER", "HELPLINE", "OTHER"]:
                    authorized_responder_ids.add(uid)
                elif "MEDICAL" in roles and stype == "HOSPITAL":
                    authorized_responder_ids.add(uid)
                elif "AUTHORITY" in roles and stype in ["POLICE", "AUTHORITY"]:
                    authorized_responder_ids.add(uid)
                    
    # Also include all ADMINs
    admin_roles_res = supabase.table("user_roles").select("user_id").eq("is_active", True).eq("role_id", "f6241baf-6463-4303-8f49-5aa7ded7c5d3").execute() # ADMIN role_id (or lookup)
    for ar in admin_roles_res.data:
        authorized_responder_ids.add(ar["user_id"])

    if not authorized_responder_ids:
        return []
        
    # 3. Fetch active public keys for these responders
    keys_res = supabase.table("responder_public_keys").select("id, user_id, public_key").in_("user_id", list(authorized_responder_ids)).eq("is_active", True).execute()
    
    responders = []
    for k in keys_res.data:
        responders.append({
            "user_id": k["user_id"],
            "public_key_id": k["id"],
            "public_key": k["public_key"]
        })
        
    return responders

@router.post("/evidence/{evidence_id}/share")
async def share_evidence(evidence_id: str, req: ShareEvidenceRequest, user_id: str = Depends(get_current_user_id)):
    # 1. Authorize victim
    ev_res = supabase.table("evidence_items").select("user_id, case_id").eq("id", evidence_id).execute()
    if not ev_res.data:
        raise HTTPException(status_code=404, detail="Evidence not found.")
    if ev_res.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Evidence belongs to another user.")
        
    case_id = ev_res.data[0].get("case_id")
    if not case_id:
        raise HTTPException(status_code=400, detail="Evidence is not associated with a case.")
        
    # 2. Authorize responder
    # Instead of re-running the complex logic, we can rely on the fact that if they have an active key,
    # and they are in the authorized list, it's valid. We will re-run the `get_authorized_responders` logic internally.
    authorized_responders = await get_authorized_responders(evidence_id, user_id)
    responder_info = next((r for r in authorized_responders if r["user_id"] == req.responder_user_id), None)
    
    if not responder_info:
        raise HTTPException(status_code=403, detail="Responder is not authorized for this case.")
        
    if responder_info["public_key_id"] != req.responder_public_key_id:
        raise HTTPException(status_code=400, detail="Provided public_key_id does not match responder's active key.")
        
    # 3. Check for duplicates
    existing_grant = supabase.table("evidence_access_grants").select("*").eq("evidence_id", evidence_id).eq("responder_user_id", req.responder_user_id).eq("status", "ACTIVE").execute()
    if existing_grant.data:
        return {"status": "success", "grant_id": existing_grant.data[0]["id"], "message": "Grant already exists."}
        
    # 4. Insert Grant
    try:
        grant_payload = {
            "evidence_id": evidence_id,
            "responder_user_id": req.responder_user_id,
            "responder_public_key_id": req.responder_public_key_id,
            "wrapped_evidence_key": req.wrapped_evidence_key,
            "wrapping_algorithm": "RSA-OAEP",
            "key_encryption_version": 1,
            "status": "ACTIVE",
            "granted_by": user_id
        }
        insert_res = supabase.table("evidence_access_grants").insert(grant_payload).execute()
        grant_id = insert_res.data[0]["id"]
        
        # 5. Audit Logging
        audit_payload = {
            "actor_id": user_id,
            "case_id": case_id,
            "action": "EVIDENCE_SHARED",
            "metadata": {
                "evidence_id": evidence_id,
                "responder_user_id": req.responder_user_id,
                "responder_public_key_id": req.responder_public_key_id,
                "grant_id": grant_id
            }
        }
        supabase.table("audit_logs").insert(audit_payload).execute()
        
        return {"status": "success", "grant_id": grant_id}
    except Exception as e:
        logger.error(f"Failed to share evidence: {e}")
        raise HTTPException(status_code=500, detail="Failed to share evidence.")
