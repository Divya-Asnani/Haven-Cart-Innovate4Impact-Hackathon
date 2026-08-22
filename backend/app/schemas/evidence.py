from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class UploadEvidenceRequest(BaseModel):
    evidence_id: UUID
    type: str # 'TEXT', 'PHOTO', 'AUDIO'
    mime_type: Optional[str] = None
    original_filename: Optional[str] = None
    
    encryption_algorithm: str = "AES-256-GCM"
    encryption_version: str = "1"
    
    content_hash: str
    previous_hash: Optional[str] = None
    chain_index: int = Field(ge=0)
    
    captured_at: datetime
    local_assessment_id: Optional[UUID] = None
    
    payload_base64: str # Base64 string containing the JSON { iv, tag, ciphertext }
