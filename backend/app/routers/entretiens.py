from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from datetime import date
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import get_current_user
from app import mock_store
from supabase import Client

router = APIRouter(prefix="/entretiens", tags=["Recruitment - Interviews"])

class InterviewBase(BaseModel):
    candidate_id: UUID
    recruiter_id: Optional[UUID] = None
    date: date
    start_time: str
    end_time: str
    type: str
    meet_link: Optional[str] = None
    notes: Optional[str] = None
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    recruiter_name: Optional[str] = None

class InterviewCreate(InterviewBase):
    slot_id: Optional[UUID] = None

class InterviewOut(InterviewBase):
    id: UUID
    status: str

    class Config:
        from_attributes = True

@router.get("", response_model=List[InterviewOut])
def list_interviews():
    return mock_store.get_collection("entretiens")

@router.post("", response_model=InterviewOut)
def schedule_interview(payload: InterviewCreate):
    item = payload.dict(exclude={'slot_id'})
    item["status"] = "confirmed"
    db_interview = mock_store.add_item("entretiens", item)
    
    if payload.slot_id:
        mock_store.update_item("creneaux", str(payload.slot_id), {
            "status": "reserved",
            "interview_id": db_interview["id"]
        })
    
    return db_interview

@router.patch("/{id}/status")
def update_interview_status(id: UUID, status: str):
    mock_store.update_item("entretiens", str(id), {"status": status})
    # Find the interview to return it
    items = mock_store.get_collection("entretiens")
    for item in items:
        if str(item.get("id")) == str(id):
            return item
    raise HTTPException(status_code=404, detail="Entretien non trouvé")
