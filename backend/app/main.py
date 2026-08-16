from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, session, products, cart, wishlist, profile

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

@app.get("/")
def root():
    return {"message": "Welcome to HavenCart API! Check /docs for interactive documentation."}
