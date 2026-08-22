from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Dict, Optional
from datetime import datetime
from uuid import UUID

class SafetyAssessmentAnswersSchema(BaseModel):
    safe_now: bool
    perpetrator_present: bool
    can_leave_safely: bool
    medical_help: bool
    contact_requested: bool

class CreateSafetyAssessmentRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    local_assessment_id: UUID
    session_id: Optional[UUID] = None
    answers: SafetyAssessmentAnswersSchema
    ml_risk_level: str
    ml_confidence: float = Field(ge=0, le=1)
    final_risk_level: str
    decision_source: str
    override_reason: Optional[str] = None
    model_version: str
    started_at: datetime
    completed_at: datetime

    @validator("ml_risk_level", "final_risk_level")
    def validate_risk_level(cls, v):
        if v not in ("LOW", "MEDIUM", "HIGH"):
            raise ValueError("must be LOW, MEDIUM, or HIGH")
        return v
        
    @validator("decision_source")
    def validate_decision_source(cls, v):
        if v not in ("ML", "RULE_OVERRIDE"):
            raise ValueError("must be ML or RULE_OVERRIDE")
        return v
