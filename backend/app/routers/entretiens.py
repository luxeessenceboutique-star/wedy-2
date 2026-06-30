from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from datetime import date
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import get_current_user
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
    res = supabase.table("entretiens").select("*").order("date").order("start_time").execute()
    return res.data or []


@router.post("", response_model=InterviewOut)
def schedule_interview(payload: InterviewCreate, supabase: Client = Depends(get_db)):
    data = payload.dict(exclude={"slot_id"})
    data["date"] = str(data["date"])
    data["candidate_id"] = str(data["candidate_id"])
    if data.get("recruiter_id"):
        data["recruiter_id"] = str(data["recruiter_id"])
    data["status"] = "confirmed"

    res = supabase.table("entretiens").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erreur lors de la planification")
    interview = res.data[0]

    # Mark the slot as reserved
    if payload.slot_id:
        supabase.table("creneaux").update({
            "status": "reserved",
            "interview_id": interview["id"],
        }).eq("id", str(payload.slot_id)).execute()

    return interview


@router.patch("/{id}/status")
def update_interview_status(
    id: UUID,
    status: str,
    supabase: Client = Depends(get_db),
):
    res = (
        supabase.table("entretiens")
        .update({"status": status})
        .eq("id", str(id))
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Entretien non trouvé")
    return res.data[0]
