from fastapi import APIRouter, HTTPException, Depends
from app.schemas.requests import AddToCartRequest, RemoveFromCartRequest
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id

router = APIRouter(prefix="/api/v1/cart", tags=["Cart"])

@router.get("")
async def get_cart(user_id: str = Depends(get_current_user_id)):
    response = supabase.table("cart_items").select("*, products(*)").eq("user_id", user_id).execute()
    return response.data

@router.post("")
async def add_to_cart(req: AddToCartRequest, user_id: str = Depends(get_current_user_id)):
    try:
        # Check if item exists in cart
        existing_res = supabase.table("cart_items").select("*").eq("user_id", user_id).eq("product_id", req.product_id).eq("size", req.size).execute()
        
        if existing_res.data:
            # Update quantity
            item_id = existing_res.data[0]["id"]
            new_quantity = existing_res.data[0]["quantity"] + req.quantity
            supabase.table("cart_items").update({"quantity": new_quantity}).eq("id", item_id).execute()
            return {"message": "Cart updated"}
        else:
            # Insert new item
            supabase.table("cart_items").insert({
                "user_id": user_id,
                "product_id": req.product_id,
                "quantity": req.quantity,
                "size": req.size
            }).execute()
            return {"message": "Added to cart"}
    except Exception as exc:
        detail = str(exc)
        if "violates foreign key" in detail or "invalid input syntax" in detail:
            raise HTTPException(status_code=400, detail="Invalid product ID or user ID")
        raise HTTPException(status_code=500, detail=f"Failed to add to cart: {detail}")

@router.delete("/{item_id}")
async def remove_from_cart(item_id: str, user_id: str = Depends(get_current_user_id)):
    response = supabase.table("cart_items").delete().eq("id", item_id).eq("user_id", user_id).execute()
    return {"message": "Removed from cart"}
