from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import OfficerAssistRequest, OfficerAssistResponse
from app.officer_assistant import generate_officer_recommendations

router = APIRouter(prefix="/api", tags=["Officer Assistant"])

@router.post("/officer_assist", response_model=OfficerAssistResponse)
def officer_assist_endpoint(
    req: OfficerAssistRequest,
    db: Session = Depends(get_db)
):
    """
    Officer Assistant recommendation endpoint.
    Receives complaint_id, applies deterministic rules, and returns recommendations.
    """
    res = generate_officer_recommendations(complaint_id=req.complaint_id, db=db)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res
