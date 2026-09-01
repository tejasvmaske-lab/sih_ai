from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, JSON
from app.database import Base

class Grievance(Base):
    __tablename__ = "grievances"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True)
    text = Column(Text, nullable=False)
    language = Column(String, default="English")
    location = Column(String, nullable=False, default="Unknown Location")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)
    
    category = Column(String, nullable=False, default="Other")
    priority = Column(String, nullable=False, default="MEDIUM")
    department = Column(String, nullable=False, default="General Civic Cell")
    summary = Column(Text, nullable=False, default="")
    explanation = Column(Text, nullable=False, default="")
    
    status = Column(String, nullable=False, default="AI Classified")
    related_ids = Column(JSON, default=list)
    
    # ── Resolution Verification & Timeline Tracking ──
    resolution_image_url = Column(String, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolution_confidence = Column(Float, default=0.94)
    resolution_verified = Column(Integer, default=0) # 1 = True, 0 = False
    assigned_officer = Column(String, nullable=True, default="Er. Rajesh Sharma, Ward 4 Officer")
    timeline_events = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="citizen") # "citizen" or "admin"
    full_name = Column(String, nullable=False, default="")
    department = Column(String, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class Hotspot(Base):
    __tablename__ = "hotspots"


    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    complaint_count = Column(Integer, default=0)
    highest_priority = Column(String, default="LOW")
