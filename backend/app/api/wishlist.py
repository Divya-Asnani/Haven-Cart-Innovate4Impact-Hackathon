from fastapi import APIRouter, HTTPException, Depends
from app.schemas.requests import ToggleWishlistRequest
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id

router = APIRouter(prefix="/api/v1/wishlist", tags=["Wishlist"])

@router.get("")
async def get_wishlist(user_id: str = Depends(get_current_user_id)):
    response = supabase.table("wishlist").select("*").eq("user_id", user_id).execute()
    return response.data

@router.post("")
async def toggle_wishlist(req: ToggleWishlistRequest, user_id: str = Depends(get_current_user_id)):
    # Check if item exists in wishlist
    existing_res = supabase.table("wishlist").select("*").eq("user_id", user_id).eq("product_id", req.product_id).execute()
    
    if existing_res.data:
        # Remove it
        item_id = existing_res.data[0]["id"]
        supabase.table("wishlist").delete().eq("id", item_id).execute()
        return {"message": "Removed from wishlist"}
    else:
        # Add it
        supabase.table("wishlist").insert({
            "user_id": user_id,
            "product_id": req.product_id
        }).execute()
        return {"message": "Added to wishlist"}
