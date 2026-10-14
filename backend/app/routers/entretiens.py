from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from datetime import date
from pydantic import BaseModel
from app.database import get_db
from app.repositories import entretien_repository
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
def list_interviews(supabase: Client = Depends(get_db)):
    res = entretien_repository.list_interviews(supabase)
    return res.data or []


@router.post("", response_model=InterviewOut)
def schedule_interview(payload: InterviewCreate, supabase: Client = Depends(get_db)):
    # candidate_name / job_title / recruiter_name are display-only: not columns of interviews
    data = payload.dict(exclude={"slot_id", "candidate_name", "job_title", "recruiter_name"})
    data["date"] = str(data["date"])
    data["candidate_id"] = str(data["candidate_id"])
    if data.get("recruiter_id"):
        data["recruiter_id"] = str(data["recruiter_id"])
    data["status"] = "confirmed"

    res = entretien_repository.create_interview(supabase, data)
    if not res.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la planification")
    interview = res.data[0]

    # Mark the slot as reserved
    if payload.slot_id:
        entretien_repository.reserve_slot(supabase, str(payload.slot_id), interview["id"])

    return interview


@router.patch("/{id}/status")
def update_interview_status(
    id: UUID,
    status: str,
    supabase: Client = Depends(get_db),
):
    res = entretien_repository.update_interview_status(supabase, str(id), status)
    if not res.data:
        raise HTTPException(status_code=404, detail="Entretien non trouvé")
    return res.data[0]
