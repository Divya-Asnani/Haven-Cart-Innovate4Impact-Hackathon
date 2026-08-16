from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id

router = APIRouter(prefix="/api/v1/session", tags=["Session"])

@router.post("/heartbeat")
async def session_heartbeat(user_id: str = Depends(get_current_user_id)):
    sessions_res = supabase.table("sessions").select("*").eq("user_id", user_id).order("last_active_at", desc=True).limit(1).execute()
    
    if not sessions_res.data or not sessions_res.data[0].get("is_valid"):
        return {"valid": False}
        
    session_id = sessions_res.data[0]["id"]
    supabase.table("sessions").update({"last_active_at": datetime.now(timezone.utc).isoformat()}).eq("id", session_id).execute()
    
    return {"valid": True}

@router.post("/end")
async def end_session(user_id: str = Depends(get_current_user_id)):
    supabase.table("sessions").update({"is_valid": False}).eq("user_id", user_id).eq("is_valid", True).execute()
    return {"message": "Session ended"}
