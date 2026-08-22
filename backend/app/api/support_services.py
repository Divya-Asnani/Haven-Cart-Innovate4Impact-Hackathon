from fastapi import APIRouter, Depends, HTTPException
from typing import List
import math
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id
from app.schemas.escalation import SupportService

router = APIRouter(prefix="/api/v1/safety", tags=["Support Services"])

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth radius in kilometers
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

@router.get("/support-services", response_model=List[SupportService])
async def get_support_services(user_id: str = Depends(get_current_user_id)):
    # 1. Fetch User Location
    user_res = supabase.table("profiles").select("latitude, longitude").eq("id", user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    user_lat = user_res.data[0].get("latitude")
    user_lon = user_res.data[0].get("longitude")
    
    has_location = user_lat is not None and user_lon is not None

    # 2. Fetch Active + Verified Services
    services_res = supabase.table("support_services").select("*").eq("is_active", True).eq("is_verified", True).execute()
    services = services_res.data
    
    # 3. Filter and Rank
    ranked_services = []
    for s in services:
        dist = None
        if has_location and s.get("latitude") is not None and s.get("longitude") is not None:
            dist = haversine_distance(user_lat, user_lon, s["latitude"], s["longitude"])
            
            # Check coverage radius if provided
            coverage = s.get("coverage_radius_km")
            if coverage is not None and dist > coverage:
                continue # Outside coverage area
        
        s_obj = SupportService(**s)
        s_obj.distance_km = dist
        ranked_services.append(s_obj)

    # Sort: If location is available, sort primarily by distance, then priority.
    # If no location, sort by priority.
    if has_location:
        # Items with no distance (e.g. service missing coordinates) go to the bottom
        ranked_services.sort(key=lambda x: (x.distance_km if x.distance_km is not None else float('inf'), x.priority))
    else:
        ranked_services.sort(key=lambda x: (x.priority, x.name))
        
    return ranked_services[:3]
