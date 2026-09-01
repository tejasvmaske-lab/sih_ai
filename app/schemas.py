from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class GrievanceCreate(BaseModel):
    text: str
    language: Optional[str] = "English"
    location: Optional[str] = "ABC Road"
    latitude: Optional[float] = 19.0760
    longitude: Optional[float] = 72.8777
    image_url: Optional[str] = None

class GrievanceResponse(BaseModel):
    id: int
    ticket_id: str
    text: str
    language: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    category: str
    priority: str
    department: str
    summary: str
    explanation: str
    status: str
    related_ids: List[int] = []
    
    # ── Resolution Verification & Timeline Tracking ──
    resolution_image_url: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolution_confidence: Optional[float] = 0.94
    resolution_verified: Optional[int] = 0
    assigned_officer: Optional[str] = "Er. Rajesh Sharma, Ward 4 Officer"
    timeline_events: Optional[List[dict]] = []
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GrievanceStatusUpdate(BaseModel):
    status: str

class UserLogin(BaseModel):
    email: str
    password: str
    portal_type: str = "citizen"  # "citizen" or "admin"

class UserRegister(BaseModel):
    email: str
    username: str
    password: str
    full_name: str
    role: Optional[str] = "citizen"

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    full_name: str
    department: Optional[str] = None

    class Config:
        from_attributes = True

class OfficerAssistRequest(BaseModel):

    complaint_id: int

class OfficerAssistResponse(BaseModel):
    complaint_id: int
    actions: List[str]
    draft_message: str
    assigned_department: str
    recommended_officer: str
    evidence_checklist: List[str]
    explanation: str

class HotspotResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    complaint_count: int
    highest_priority: str
    breakdown: Optional[dict] = None

class DashboardStats(BaseModel):
    total_complaints: int
    pending: int
    high_priority: int
    resolved: int
    related_complaints: int
