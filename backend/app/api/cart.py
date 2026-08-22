# from fastapi import APIRouter, HTTPException, Depends
# from app.schemas.requests import AddToCartRequest, RemoveFromCartRequest
# from app.database.supabase_client import supabase
# from app.api.auth_deps import get_current_user_id

# router = APIRouter(prefix="/api/v1/cart", tags=["Cart"])

# @router.get("")
# async def get_cart(user_id: str = Depends(get_current_user_id)):
#     response = supabase.table("cart_items").select("*, products(*)").eq("user_id", user_id).execute()
#     return response.data

# @router.post("")
# async def add_to_cart(req: AddToCartRequest, user_id: str = Depends(get_current_user_id)):
#     try:
#         # Check if item exists in cart
#         existing_res = supabase.table("cart_items").select("*").eq("user_id", user_id).eq("product_id", req.product_id).eq("size", req.size).execute()
        
#         if existing_res.data:
#             # Update quantity
#             item_id = existing_res.data[0]["id"]
#             new_quantity = existing_res.data[0]["quantity"] + req.quantity
#             supabase.table("cart_items").update({"quantity": new_quantity}).eq("id", item_id).execute()
#             return {"message": "Cart updated"}
#         else:
#             # Insert new item
#             supabase.table("cart_items").insert({
#                 "user_id": user_id,
#                 "product_id": req.product_id,
#                 "quantity": req.quantity,
#                 "size": req.size
#             }).execute()
#             return {"message": "Added to cart"}
#     except Exception as exc:
#         detail = str(exc)
#         if "violates foreign key" in detail or "invalid input syntax" in detail:
#             raise HTTPException(status_code=400, detail="Invalid product ID or user ID")
#         raise HTTPException(status_code=500, detail=f"Failed to add to cart: {detail}")

# @router.delete("/{item_id}")
# async def remove_from_cart(item_id: str, user_id: str = Depends(get_current_user_id)):
#     response = supabase.table("cart_items").delete().eq("id", item_id).eq("user_id", user_id).execute()
#     return {"message": "Removed from cart"}




from fastapi import APIRouter, HTTPException, Depends
from app.schemas.requests import AddToCartRequest, RemoveFromCartRequest
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id

router = APIRouter(prefix="/api/v1/cart", tags=["Cart"])


@router.get("")
async def get_cart(user_id: str = Depends(get_current_user_id)):
    try:
        # IMPORTANT: "products(*)" requires PostgREST to unambiguously resolve
        # the FK from cart_items.product_id -> products.id. If there is more
        # than one FK between these two tables (or the FK name differs), the
        # join can silently return null and you'll get every product field
        # missing, including the image.
        #
        # If you know your FK constraint name (check via the SQL query below),
        # use the explicit hint syntax instead - this removes all ambiguity:
        #
        #   .select("*, products!cart_items_product_id_fkey(*)")
        #
        # Find your actual constraint name with:
        #   SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table
        #   FROM information_schema.table_constraints tc
        #   JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        #   JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        #   WHERE tc.table_name = 'cart_items' AND tc.constraint_type = 'FOREIGN KEY';
        #
        # Also double check your products table's image column is actually
        # named "image_url" - if it's called "image" or "thumbnail" instead,
        # update the reference below (and your frontend) to match.
        response = (
            supabase.table("cart_items")
            .select("*, products(id, name, price, image_url)")
            .eq("user_id", user_id)
            .execute()
        )
        return response.data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch cart: {str(exc)}")


@router.post("")
async def add_to_cart(req: AddToCartRequest, user_id: str = Depends(get_current_user_id)):
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")

    try:
        # NOTE: This check-then-update is not atomic. Under concurrent requests
        # (double-tap "add to cart", retried requests, etc.) two reads can both
        # see the same old quantity and one update can overwrite the other,
        # silently losing an increment.
        #
        # Preferred fix: create a unique constraint on
        # (user_id, product_id, size) and use a Postgres RPC function that does
        # an atomic upsert + increment, e.g.:
        #
        #   supabase.rpc("increment_cart_item", {
        #       "p_user_id": user_id,
        #       "p_product_id": req.product_id,
        #       "p_size": req.size,
        #       "p_quantity": req.quantity,
        #   }).execute()
        #
        # Keeping the original check-then-update logic below since the RPC
        # function isn't defined in this codebase yet - swap it in when ready.
        existing_res = (
            supabase.table("cart_items")
            .select("*")
            .eq("user_id", user_id)
            .eq("product_id", req.product_id)
            .eq("size", req.size)
            .execute()
        )

        if existing_res.data:
            item_id = existing_res.data[0]["id"]
            new_quantity = existing_res.data[0]["quantity"] + req.quantity
            update_res = (
                supabase.table("cart_items")
                .update({"quantity": new_quantity})
                .eq("id", item_id)
                .execute()
            )
            return {"message": "Cart updated", "item": update_res.data[0] if update_res.data else None}
        else:
            insert_res = (
                supabase.table("cart_items")
                .insert(
                    {
                        "user_id": user_id,
                        "product_id": req.product_id,
                        "quantity": req.quantity,
                        "size": req.size,
                    }
                )
                .execute()
            )
            return {"message": "Added to cart", "item": insert_res.data[0] if insert_res.data else None}

    except Exception as exc:
        detail = str(exc)
        if "violates foreign key" in detail or "invalid input syntax" in detail:
            raise HTTPException(status_code=400, detail="Invalid product ID or user ID")
        raise HTTPException(status_code=500, detail=f"Failed to add to cart: {detail}")


@router.delete("/{item_id}")
async def remove_from_cart(item_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        response = (
            supabase.table("cart_items")
            .delete()
            .eq("id", item_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Cart item not found")
        return {"message": "Removed from cart"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to remove from cart: {str(exc)}")