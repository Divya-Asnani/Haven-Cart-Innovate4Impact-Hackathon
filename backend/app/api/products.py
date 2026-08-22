from typing import Optional
from fastapi import APIRouter, HTTPException
from app.database.supabase_client import supabase

router = APIRouter(prefix="/api/v1/products", tags=["Products"])


@router.get("/categories")
async def list_categories():
    response = supabase.table("categories").select("id, name, slug").order("name").execute()
    return response.data

@router.get("")
async def list_products(category: Optional[str] = None, search: Optional[str] = None):
    query = supabase.table("products").select("*, categories!inner(name, slug)")
    
    if category and category != 'all':
        query = query.eq("categories.slug", category)
        
    if search:
        # Supabase Python client supports ilike
        search_pattern = f"%{search}%"
        query = query.or_(f"name.ilike.{search_pattern},brand.ilike.{search_pattern}")
        
    response = query.execute()
    
    # Map back to expected response format
    products = response.data
    
    return [
        {
            "id": str(p.get("id")),
            "name": p.get("name"),
            "brand": p.get("brand"),
            "price": float(p.get("price")) if p.get("price") else 0,
            "mrp": float(p.get("mrp")) if p.get("mrp") else 0,
            "discount_percent": p.get("discount_percent"),
            "image_url": p.get("image_url"),
            "sizes": p.get("sizes"),
            "description": p.get("description"),
            "category_id": str(p.get("category_id")),
            "category": (p.get("categories") or {}).get("slug")
        } for p in products
    ]

@router.get("/{product_id}")
async def get_product(product_id: str):
    response = supabase.table("products").select("*").eq("id", product_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Product not found")
        
    p = response.data[0]
    
    return {
        "id": str(p.get("id")),
        "name": p.get("name"),
        "brand": p.get("brand"),
        "price": float(p.get("price")) if p.get("price") else 0,
        "mrp": float(p.get("mrp")) if p.get("mrp") else 0,
        "discount_percent": p.get("discount_percent"),
        "image_url": p.get("image_url"),
        "sizes": p.get("sizes"),
        "description": p.get("description"),
        "category_id": str(p.get("category_id"))
    }
