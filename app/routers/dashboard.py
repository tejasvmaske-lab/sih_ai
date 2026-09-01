from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Grievance, Hotspot
from app.schemas import DashboardStats

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns dashboard statistical summary:
    Total Complaints, Pending, High Priority, Resolved, Related Complaints count.
    """
    total = db.query(Grievance).count()
    pending = db.query(Grievance).filter(Grievance.status.in_(["Submitted", "AI Classified", "Assigned", "In Progress"])).count()
    high_priority = db.query(Grievance).filter(Grievance.priority.in_(["HIGH", "CRITICAL"])).count()
    resolved = db.query(Grievance).filter(Grievance.status == "Resolved").count()
    
    # Calculate related complaints count
    all_grievances = db.query(Grievance).all()
    related_set = set()
    for g in all_grievances:
        if g.related_ids:
            for r_id in g.related_ids:
                related_set.add(tuple(sorted([g.id, r_id])))
                
    return DashboardStats(
        total_complaints=total,
        pending=pending,
        high_priority=high_priority,
        resolved=resolved,
        related_complaints=len(related_set)
    )

@router.get("/hotspots", response_model=List[Dict[str, Any]])
def get_hotspots(db: Session = Depends(get_db)):
    """
    Aggregates complaints by geographic location to build dynamic hotspots.
    Returns hotspot location details, total complaints, breakdown by category, and highest priority.
    """
    grievances = db.query(Grievance).all()
    
    # Group by location name
    clusters: Dict[str, Dict[str, Any]] = {}
    
    for g in grievances:
        loc = g.location or "General Zone"
        if loc not in clusters:
            clusters[loc] = {
                "name": loc,
                "latitude": g.latitude or 19.0760,
                "longitude": g.longitude or 72.8777,
                "complaint_count": 0,
                "highest_priority": "LOW",
                "categories": {}
            }
            
        cluster = clusters[loc]
        cluster["complaint_count"] += 1
        
        # Category breakdown
        cat = g.category or "Other"
        cluster["categories"][cat] = cluster["categories"].get(cat, 0) + 1
        
        # Priority escalation
        p_order = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
        if p_order.get(g.priority, 1) > p_order.get(cluster["highest_priority"], 1):
            cluster["highest_priority"] = g.priority

    hotspot_list = list(clusters.values())
    hotspot_list.sort(key=lambda x: x["complaint_count"], reverse=True)
    return hotspot_list
