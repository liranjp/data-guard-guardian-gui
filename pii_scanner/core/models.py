from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import enum

class PIIType(str, enum.Enum):
    EMAIL = EMAIL
    PHONE = PHONE
    CREDIT_CARD = CREDIT_CARD
    PERSON = PERSON
    LOCATION = LOCATION
    ORGANIZATION = ORGANIZATION
    DATE_TIME = DATE_TIME
    SSN = SSN
    # Add other PII types as needed

class RiskLevel(str, enum.Enum):
    LOW = LOW
    MEDIUM = MEDIUM
    HIGH = HIGH

class PIIResult(BaseModel):
    sample: str
    pii_type: PIIType
    confidence_score: Optional[float]
    risk_level: RiskLevel
    model: str
    timestamp: datetime
    source: str

    class Config:
        orm_mode = True

class ScanResult(BaseModel):
    results: List[PIIResult]
    scan_duration: float

