from pydantic import BaseModel
from typing import Optional

class SignupRequest(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    password: str
    pin: str

class LoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    identifier: Optional[str] = None
    password: str
    role: Optional[str] = None

class VerifyPinRequest(BaseModel):
    pin: str

class LocationUpdateRequest(BaseModel):
    address: str
    city: str
    latitude: float
    longitude: float

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class SessionActionRequest(BaseModel):
    access_token: str

class AddToCartRequest(BaseModel):
    product_id: str
    quantity: int = 1
    size: Optional[str] = None

class RemoveFromCartRequest(BaseModel):
    product_id: str

class CartActionRequest(BaseModel):
    access_token: str

class WishlistActionRequest(BaseModel):
    product_id: str

class ToggleWishlistRequest(BaseModel):
    product_id: str
