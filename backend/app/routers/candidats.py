from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID
from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.repositories import candidate_repository
from supabase import Client

router = APIRouter(prefix="/candidats", tags=["Recruitment - Candidats"])


class CandidateCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("")
def list_candidates(
    db: Client = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    res = candidate_repository.list_candidates(db)
    return res.data or []


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_candidate(
    body: CandidateCreate,
    db: Client = Depends(get_db),
    _user: dict = Depends(require_hr_or_admin),
):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    data["status"] = "candidate"
    res = candidate_repository.create_candidate(db, data)
    if not res.data:
        raise HTTPException(status_code=500, detail="Échec de la création")
    return res.data[0]


# ── Promote ───────────────────────────────────────────────────────────────────

@router.post("/{candidate_id}/promote-to-employee")
def promote_to_employee(
    candidate_id: UUID,
    payload: dict,
    db: Client = Depends(get_db),
    _user: dict = Depends(require_hr_or_admin),
):
    update = {"status": "active"}
    if payload.get("hire_date"):
        update["hire_date"] = payload["hire_date"]
    if payload.get("position"):
        update["position"] = payload["position"]
    candidate_repository.update_status(db, str(candidate_id), update)
    return {"message": "Candidat promu en employé"}


@router.post("/{candidate_id}/promote-to-intern")
def promote_to_intern(
    candidate_id: UUID,
    payload: dict,
    db: Client = Depends(get_db),
    _user: dict = Depends(require_hr_or_admin),
):
    update = {"status": "intern"}
    if payload.get("internship_start"):
        update["internship_start"] = payload["internship_start"]
    candidate_repository.update_status(db, str(candidate_id), update)
    return {"message": "Candidat promu en stagiaire"}


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{candidate_id}", status_code=204)
def delete_candidate(
    candidate_id: UUID,
    db: Client = Depends(get_db),
    _user: dict = Depends(require_hr_or_admin),
):
    candidate_repository.delete_candidate(db, str(candidate_id))
