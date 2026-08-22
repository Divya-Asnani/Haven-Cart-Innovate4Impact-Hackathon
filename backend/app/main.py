import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, session, products, cart, wishlist, profile, responder, alerts

app = FastAPI(
    title="HavenCart API",
    description="Backend API for the HavenCart app with Supabase PostgreSQL",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(session.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(wishlist.router)
app.include_router(profile.router)
app.include_router(responder.router)
app.include_router(alerts.router)

@app.get("/")
def root():
    return {"message": "Welcome to HavenCart API! Check /docs for interactive documentation."}


@app.get("/health")
def health():
    """Lightweight health check — does not require a database connection."""
    env_ok = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"))
    return {"status": "ok", "database_configured": env_ok}

@app.post("/admin/fix-images")
async def fix_image_urls():
    """One-time migration: replace broken example.com image URLs with real picsum.photos URLs."""
    from app.database.supabase_client import supabase

    # Map product names to real image URLs
    image_fixes = {
        "Cotton Kurta": "https://picsum.photos/seed/kurta1/400/500",
        "Embroidered Silk Suit": "https://picsum.photos/seed/suit1/400/500",
        "Basic Crew Neck T-Shirt": "https://picsum.photos/seed/tshirt1/400/500",
        "Graphic Print Tee": "https://picsum.photos/seed/tshirt2/400/500",
        "Slim Fit Denim": "https://picsum.photos/seed/jeans1/400/500",
        "Relaxed Mom Jeans": "https://picsum.photos/seed/jeans2/400/500",
        "Floral Maxi Dress": "https://picsum.photos/seed/dress1/400/500",
        "Little Black Dress": "https://picsum.photos/seed/dress2/400/500",
        "White Sneakers": "https://picsum.photos/seed/shoes1/400/500",
        "Running Shoes": "https://picsum.photos/seed/shoes2/400/500",
        "Leather Biker Jacket": "https://picsum.photos/seed/jacket1/400/500",
        "Denim Jacket": "https://picsum.photos/seed/jacket2/400/500",
        "Straight Kurta": "https://picsum.photos/seed/kurta2/400/500",
        "Anarkali Kurta": "https://picsum.photos/seed/kurta3/400/500",
        "Polo T-Shirt": "https://picsum.photos/seed/polo1/400/500",
        "Oversized Tee": "https://picsum.photos/seed/tshirt4/400/500",
        "Bootcut Jeans": "https://picsum.photos/seed/jeans3/400/500",
        "Skinny Fit Jeans": "https://picsum.photos/seed/jeans4/400/500",
        "Slip Dress": "https://picsum.photos/seed/dress3/400/500",
        "Wrap Dress": "https://picsum.photos/seed/dress4/400/500",
        "Formal Oxfords": "https://picsum.photos/seed/shoes3/400/500",
        "Chunky Boots": "https://picsum.photos/seed/shoes4/400/500",
        "Bomber Jacket": "https://picsum.photos/seed/jacket3/400/500",
        "Puffer Jacket": "https://picsum.photos/seed/jacket4/400/500",
    }

    updated = 0
    for name, url in image_fixes.items():
        res = supabase.table("products").update({"image_url": url}).eq("name", name).execute()
        if res.data:
            updated += len(res.data)

    # Ensure the covert trigger product exists
    trigger_check = supabase.table("products").select("id").eq("name", "Classic Cotton T-Shirt").execute()
    trigger_created = False
    if not trigger_check.data:
        supabase.table("products").insert({
            "name": "Classic Cotton T-Shirt",
            "brand": "Roadster",
            "category_id": "11111111-1111-1111-1111-111111111111",
            "price": 499,
            "mrp": 999,
            "discount_percent": 50,
            "image_url": "https://picsum.photos/seed/trigger1/400/500",
            "sizes": ["S", "M", "L", "XL"],
            "description": "A comfortable cotton t-shirt for daily wear."
        }).execute()
        trigger_created = True

    return {
        "message": f"Updated {updated} product image URLs",
        "trigger_product_created": trigger_created
    }

