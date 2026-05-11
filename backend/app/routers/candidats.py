from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
import logging
from pydantic import BaseModel
from uuid import UUID
from datetime import date
from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from supabase import Client
from app import mock_store

router = APIRouter(prefix="/candidats", tags=["Recruitment - Candidats"])

class CandidateApply(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    cv_url: Optional[str] = None
    ad_id: Optional[UUID] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None

class CandidateOut(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cin: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "pending"
    position: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.get("", response_model=List[CandidateOut])
def list_candidates(db: Client = Depends(get_db)):
    # Use cv_extractions table which already exists and has candidate-like fields
    res = db.table("cv_extractions").select("*").execute()
    candidates = []
    for item in res.data:
        full_name = item.get("full_name") or "Candidat Anonyme"
        raw_json = item.get("raw_json") or {}
        position = raw_json.get("job_title") if isinstance(raw_json, dict) else "Poste inconnu"
        
        candidates.append({
            "id": item["id"],
            "full_name": full_name,
            "first_name": full_name.split(" ")[0],
            "last_name": " ".join(full_name.split(" ")[1:]),
            "email": item.get("email"),
            "phone": item.get("phone"),
            "status": "pending",
            "position": position
        })
    return candidates

@router.post("/apply")
def apply_candidate(payload: CandidateApply, db: Client = Depends(get_db)):
    try:
        # In simulator mode, we insert into cv_extractions
        # Fetch job title if ad_id is present
        job_title = "Poste inconnu"
        if payload.ad_id:
            ad = mock_store.get_item("annonces", str(payload.ad_id))
            if ad:
                job_title = ad.get("poste", "Poste inconnu")

        new_cand = {
            "full_name": payload.full_name,
            "email": payload.email,
            "phone": payload.phone,
            "file_url": payload.cv_url,
            "raw_json": {"ad_id": str(payload.ad_id), "job_title": job_title} if payload.ad_id else {"job_title": job_title},
        }
        res = db.table("cv_extractions").insert(new_cand).execute()
        
        # If a slot was selected, create an entretien in simulator mode
        if payload.interview_date and payload.interview_time:
            entretien = {
                "candidate_name": payload.full_name,
                "candidate_id": str(res.data[0]["id"]) if (res.data and len(res.data) > 0) else None,
                "date": payload.interview_date,
                "start_time": payload.interview_time,
                "end_time": payload.interview_time, # Simplify for simulator
                "ad_id": str(payload.ad_id) if payload.ad_id else None,
                "job_title": job_title,
                "status": "scheduled",
                "type": "RH"
            }
            mock_store.add_item("entretiens", entretien)

        return {"message": "Candidature reçue", "id": res.data[0]["id"] if (res.data and len(res.data) > 0) else None}
    except Exception as e:
        logging.error(f"Erreur dans apply_candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{profile_id}/promote-to-employee")
def promote_to_employee(
    profile_id: UUID,
    payload: dict, # contient position_id, hire_date, salary
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin)
):
    # Update profile type
    db.table("profiles").update({"type": "employee"}).eq("id", str(profile_id)).execute()
    
    # Create employee record
    new_emp = {
        "profile_id": str(profile_id),
        "position_id": payload.get("position_id"),
        "hire_date": payload.get("hire_date"),
        "salary": payload.get("salary"),
        "status": "active"
    }
    db.table("employees").insert(new_emp).execute()
    return {"message": "Candidat promu en employé"}

@router.post("/{profile_id}/promote-to-intern")
def promote_to_intern(
    profile_id: UUID,
    payload: dict, # contient school, internship_start, internship_end
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin)
):
    # Update profile type
    db.table("profiles").update({"type": "intern"}).eq("id", str(profile_id)).execute()
    
    # Create intern record
    new_intern = {
        "profile_id": str(profile_id),
        "school": payload.get("school"),
        "internship_start": payload.get("start_date"),
        "internship_end": payload.get("end_date")
    }
    db.table("interns").insert(new_intern).execute()
    return {"message": "Candidat promu en stagiaire"}

@router.delete("/{profile_id}")
def delete_candidate(profile_id: UUID, db: Client = Depends(get_db)):
    db.table("cv_extractions").delete().eq("id", str(profile_id)).execute()
    return {"message": "Candidat supprimé"}
