from fastapi import APIRouter, HTTPException, Depends
from app.schemas.requests import LocationUpdateRequest
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id

router = APIRouter(prefix="/api/v1/profile", tags=["Profile"])

@router.put("/location")
async def update_location(req: LocationUpdateRequest, user_id: str = Depends(get_current_user_id)):
    update_data = {
        "address": req.address,
        "city": req.city,
        "latitude": req.latitude,
        "longitude": req.longitude
    }
    
    response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update location")
        
    return {"message": "Location updated successfully"}
