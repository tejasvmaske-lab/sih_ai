import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Grievance
from app.schemas import GrievanceResponse, GrievanceStatusUpdate
from app.ai_engine import analyze_complaint
from app.duplicate_engine import find_related_grievances
from app.config import UPLOAD_DIR, STATUSES

router = APIRouter(prefix="/api/grievances", tags=["Grievances"])

@router.post("", response_model=GrievanceResponse)
def submit_grievance(
    text: str = Form(...),
    language: str = Form("English"),
    location: str = Form("ABC Road"),
    latitude: Optional[float] = Form(19.0760),
    longitude: Optional[float] = Form(72.8777),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Submits a citizen grievance, executes AI analysis, detects duplicates, and saves to database.
    """
    image_url = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = UPLOAD_DIR / filename
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/static/uploads/{filename}"

    # 1. AI Analysis (Category, Priority, Department, Summary, Explanation)
    ai_result = analyze_complaint(text=text, language=language, location=location)

    # 2. Duplicate / Related detection against existing DB grievances
    related_ids = find_related_grievances(
        text=text,
        category=ai_result["category"],
        location=location,
        db=db
    )

    # 3. Create Ticket ID
    count = db.query(Grievance).count()
    ticket_id = f"GRV-{1001 + count}"

    # 4. Save to Database
    grievance = Grievance(
        ticket_id=ticket_id,
        text=text,
        language=language,
        location=location,
        latitude=latitude,
        longitude=longitude,
        image_url=image_url,
        category=ai_result["category"],
        priority=ai_result["priority"],
        department=ai_result["department"],
        summary=ai_result["summary"],
        explanation=ai_result["explanation"],
        status="AI Classified",
        related_ids=related_ids
    )

    db.add(grievance)
    db.commit()
    db.refresh(grievance)

    # Also update bi-directional related IDs on existing complaints
    if related_ids:
        existing = db.query(Grievance).filter(Grievance.id.in_(related_ids)).all()
        for g in existing:
            current = list(g.related_ids or [])
            if grievance.id not in current:
                current.append(grievance.id)
                g.related_ids = current
        db.commit()
        db.refresh(grievance)

    return grievance


@router.get("", response_model=List[GrievanceResponse])
def get_grievances(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns list of grievances with optional filtering.
    """
    query = db.query(Grievance)

    if category:
        query = query.filter(Grievance.category == category)
    if priority:
        query = query.filter(Grievance.priority == priority)
    if department:
        query = query.filter(Grievance.department == department)
    if status:
        query = query.filter(Grievance.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Grievance.text.like(search_pattern)) |
            (Grievance.ticket_id.like(search_pattern)) |
            (Grievance.summary.like(search_pattern)) |
            (Grievance.location.like(search_pattern))
        )

    return query.order_by(Grievance.created_at.desc()).all()


@router.get("/{grievance_id}", response_model=GrievanceResponse)
def get_grievance_detail(grievance_id: int, db: Session = Depends(get_db)):
    """
    Gets detailed grievance record.
    """
    grievance = db.query(Grievance).filter(Grievance.id == grievance_id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")
    return grievance


@router.patch("/{grievance_id}/status", response_model=GrievanceResponse)
def update_grievance_status(
    grievance_id: int,
    status_update: GrievanceStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates the status of a grievance.
    """
    grievance = db.query(Grievance).filter(Grievance.id == grievance_id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")

    if status_update.status not in STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {STATUSES}")

    grievance.status = status_update.status
    db.commit()
    db.refresh(grievance)
    return grievance
