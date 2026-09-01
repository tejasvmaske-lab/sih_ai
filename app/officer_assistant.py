from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models import Grievance
from app.config import DEPARTMENTS

def generate_officer_recommendations(complaint_id: int, db: Session) -> Dict[str, Any]:
    """
    Deterministic rule engine for Officer Assistant per SIH requirements.
    """
    grievance = db.query(Grievance).filter(Grievance.id == complaint_id).first()
    if not grievance:
        return {
            "error": "Complaint not found",
            "complaint_id": complaint_id,
            "actions": ["review-record"],
            "draft_message": "Complaint record not found in system database.",
            "assigned_department": "General Civic Cell",
            "recommended_officer": "Duty Officer",
            "evidence_checklist": ["System ID verification"],
            "explanation": "Invalid complaint ID requested."
        }

    actions: List[str] = []
    evidence_checklist: List[str] = ["GPS location verification"]
    reasons: List[str] = []

    priority = grievance.priority.upper() if grievance.priority else "MEDIUM"
    category = grievance.category or "Other"
    related_count = len(grievance.related_ids) if grievance.related_ids else 0

    # 1. Priority Rules
    if priority == "CRITICAL":
        actions.append("urgent-escalation")
        actions.append("site-inspect")
        reasons.append("CRITICAL urgency status requiring immediate emergency response")
    elif priority == "HIGH":
        actions.append("site-inspect")
        reasons.append("HIGH priority due to public safety risk or sensitive location")
    else:
        actions.append("standard-dispatch")
        reasons.append("Routine priority complaint scheduled for standard work queue")

    # 2. Category Specific Rules
    if category == "Roads":
        if priority in ["HIGH", "CRITICAL"]:
            actions.append("temporary-barricade")
        evidence_checklist.append("Photo of pothole / road surface defect with scale marker")
        recommended_officer = "Roads Field Inspection & Repair Crew"
    elif category == "Waste Management":
        actions.append("deploy-sanitation-crew")
        evidence_checklist.append("Pre & post cleanup photograph of waste site")
        recommended_officer = "Ward Sanitation Supervisor"
    elif category == "Water Supply":
        if priority in ["HIGH", "CRITICAL"]:
            actions.append("isolate-pipeline-valve")
        evidence_checklist.append("Pressure gauge reading & pipe defect photo")
        recommended_officer = "Hydraulic Engineering Quick Response Team"
    elif category in ["Electricity", "Street Lighting"]:
        if priority == "CRITICAL":
            actions.append("isolate-power-line")
        evidence_checklist.append("Pole identification number & cable inspection photo")
        recommended_officer = "Electrical Maintenance & Line Inspection Unit"
    elif category == "Drainage":
        actions.append("desiltation-dispatch")
        evidence_checklist.append("Drain flow photo & blockage depth measurement")
        recommended_officer = "Stormwater Drain Operational Unit"
    elif category == "Public Safety":
        actions.append("police-patrol-dispatch")
        evidence_checklist.append("Incident area safety checklist & witness contact info")
        recommended_officer = "Municipal Enforcement & Safety Taskforce"
    else:
        actions.append("site-verify")
        evidence_checklist.append("Site inspection report photo")
        recommended_officer = "General Ward Inspection Officer"

    # 3. Image missing rule
    if not grievance.image_url:
        actions.append("request-photo-evidence")
        evidence_checklist.append("Citizen photo submission request")
        reasons.append("No visual image was attached with citizen report")

    # 4. Related / Duplicate complaints rule
    if related_count > 0:
        actions.append("cluster-review")
        actions.append("escalation-recommendation")
        reasons.append(f"{related_count} related citizen complaint(s) detected at same location cluster")

    # 5. Draft Message Generation
    department = grievance.department or DEPARTMENTS.get(category, "General Civic Cell")
    
    if priority == "CRITICAL":
        draft_message = (
            f"Dear Citizen, your complaint (Ref: {grievance.ticket_id}) regarding {category.lower()} "
            f"has been marked CRITICAL and assigned to the {department}. An emergency response team "
            "has been dispatched for immediate site inspection."
        )
    elif priority == "HIGH":
        draft_message = (
            f"Dear Citizen, your grievance (Ref: {grievance.ticket_id}) has been registered with HIGH priority "
            f"and routed to {department}. A field officer has been assigned for inspection within 24 hours."
        )
    else:
        draft_message = (
            f"Thank you for reporting this civic issue (Ref: {grievance.ticket_id}). It has been routed to "
            f"{department} for resolution in accordance with standard municipal service timelines."
        )

    explanation = f"Recommendations generated based on: " + "; ".join(reasons) + "."

    # Deduplicate actions preserving order
    unique_actions = list(dict.fromkeys(actions))

    return {
        "complaint_id": grievance.id,
        "ticket_id": grievance.ticket_id,
        "actions": unique_actions,
        "draft_message": draft_message,
        "assigned_department": department,
        "recommended_officer": recommended_officer,
        "evidence_checklist": evidence_checklist,
        "explanation": explanation
    }
