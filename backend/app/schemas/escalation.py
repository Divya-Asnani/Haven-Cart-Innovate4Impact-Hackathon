from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class SupportService(BaseModel):
    id: UUID
    name: str
    service_type: str
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_verified: bool
    is_active: bool
    priority: int
    coverage_radius_km: Optional[float] = None
    distance_km: Optional[float] = None  # Added via Haversine calculation

    model_config = ConfigDict(from_attributes=True)

class TrustedContactCreate(BaseModel):
    name: str
    relationship: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    preferred_channel: str = "SMS"
    priority: int = 1
    is_active: bool = True

class TrustedContactUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    preferred_channel: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

class TrustedContactResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    relationship: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    preferred_channel: str
    priority: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CaseAssignmentResponse(BaseModel):
    id: UUID
    case_id: UUID
    support_service_id: Optional[UUID] = None
    assigned_user_id: Optional[UUID] = None
    assigned_by_user_id: Optional[UUID] = None
    assignment_status: str
    assigned_at: datetime
    accepted_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EmergencyAlertResponse(BaseModel):
    id: UUID
    case_id: UUID
    support_service_id: Optional[UUID] = None
    trusted_contact_id: Optional[UUID] = None
    recipient_type: str
    channel: str
    delivery_mode: str
    status: str
    external_reference: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class EscalationPayload(BaseModel):
    case_id: str
    risk_level: str
    support_services_assigned: int
    trusted_contacts_notified: int
    alerts_created: int
    status: str

class NGOCaseResponse(BaseModel):
    case_id: UUID
    user_id: UUID
    risk_level: str
    case_status: str
    created_at: datetime
    assigned_service: Optional[SupportService] = None
    assignment_status: Optional[str] = None
    assignment_id: Optional[UUID] = None
    has_location: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    medical_help_requested: bool = False
    evidence_count: int = 0
    last_updated_at: Optional[datetime] = None
    alerts: List[EmergencyAlertResponse] = []
