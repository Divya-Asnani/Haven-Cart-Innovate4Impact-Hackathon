from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.database.supabase_client import supabase
from app.api.auth_deps import get_current_user_id
from app.schemas.escalation import TrustedContactCreate, TrustedContactUpdate, TrustedContactResponse
import uuid

router = APIRouter(prefix="/api/v1/safety", tags=["Trusted Contacts"])

@router.get("/trusted-contacts", response_model=List[TrustedContactResponse])
async def get_trusted_contacts(user_id: str = Depends(get_current_user_id)):
    response = supabase.table("trusted_contacts").select("*").eq("user_id", user_id).order("priority").execute()
    return response.data

@router.post("/trusted-contacts", response_model=TrustedContactResponse)
async def create_trusted_contact(req: TrustedContactCreate, user_id: str = Depends(get_current_user_id)):
    if not req.phone and not req.email:
        raise HTTPException(status_code=400, detail="Either phone or email must be provided")
        
    new_contact = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": req.name,
        "relationship": req.relationship,
        "phone": req.phone,
        "email": req.email,
        "preferred_channel": req.preferred_channel,
        "priority": req.priority,
        "is_active": req.is_active
    }
    
    response = supabase.table("trusted_contacts").insert(new_contact).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create trusted contact")
        
    return response.data[0]

@router.patch("/trusted-contacts/{contact_id}", response_model=TrustedContactResponse)
async def update_trusted_contact(contact_id: str, req: TrustedContactUpdate, user_id: str = Depends(get_current_user_id)):
    # Verify ownership
    existing = supabase.table("trusted_contacts").select("user_id").eq("id", contact_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Contact not found")
    if existing.data[0].get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this contact")
        
    update_data = req.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
        
    response = supabase.table("trusted_contacts").update(update_data).eq("id", contact_id).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update trusted contact")
        
    return response.data[0]
