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
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    complaint_count = Column(Integer, default=0)
    highest_priority = Column(String, default="LOW")
