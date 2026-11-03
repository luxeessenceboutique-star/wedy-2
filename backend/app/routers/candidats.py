from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID
from app.services import webhooks as webhook_service
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


# ── Public application (careers page /postuler/:id) ──────────────────────────

class PublicApplication(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    ad_id: UUID
    linkedin: Optional[str] = None
    message: Optional[str] = None
    cv_url: Optional[str] = None
    slot_id: Optional[UUID] = None
    interview_time: Optional[str] = None  # "HH:MM" inside the chosen slot


@router.post("/apply", status_code=201)
def apply_public(body: PublicApplication, db: Client = Depends(get_db)):
    """No account needed: creates the candidate (status=candidate) linked to the job post, and books the
    chosen interview slot when one is given. HR is notified."""
    from app.repositories import annonce_repository, entretien_repository
    from app.services.audit import notify_hr

    name, email = body.full_name.strip(), body.email.strip().lower()
    if len(name) < 2 or "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Nom et email valides requis")
    ad_res = annonce_repository.get_annonce(db, str(body.ad_id))
    ad = (ad_res.data[0] if isinstance(ad_res.data, list) and ad_res.data else ad_res.data) if ad_res else None
    if not ad or not ad.get("is_active", True):
        raise HTTPException(status_code=404, detail="Cette offre n'est plus disponible")

    existing = db.table("employees").select("id, custom_fields").eq("email", email).eq("status", "candidate").execute().data or []
    if any((e.get("custom_fields") or {}).get("ad_id") == str(body.ad_id) for e in existing):
        raise HTTPException(status_code=409, detail="Vous avez déjà postulé à cette offre")

    from datetime import datetime as _dt
    custom = {"ad_id": str(body.ad_id), "source": "Site carrière", "recruitment_stage": "new", "stage_changed_at": _dt.utcnow().isoformat()}
    if body.linkedin:
        custom["linkedin"] = body.linkedin.strip()
    if body.cv_url:
        custom["cv_url"] = body.cv_url
    res = candidate_repository.create_candidate(db, {
        "full_name": name, "email": email, "phone": (body.phone or "").strip() or None,
        "position": ad.get("poste"), "status": "candidate", "notes": (body.message or "").strip() or None, "custom_fields": custom,
    })
    if not res.data:
        raise HTTPException(status_code=500, detail="Échec de l'enregistrement")
    cand = res.data[0]

    booked = None
    if body.slot_id:
        slot = (db.table("hr_slots").select("*").eq("id", str(body.slot_id)).limit(1).execute().data or [None])[0]
        if slot and slot.get("status") == "free":
            start = (body.interview_time or slot.get("start_time") or "")[:5]
            try:
                iv = entretien_repository.create_interview(db, {
                    "candidate_id": cand["id"], "date": slot["date"], "start_time": start, "end_time": (slot.get("end_time") or start)[:5],
                    "type": "rh", "status": "confirmed",
                })
            except Exception as e:  # the application is saved anyway; HR plans the interview by hand
                print(f"[apply] interview booking failed for {cand['id']}: {e}")
                iv = None
            if iv is not None and iv.data:
                entretien_repository.reserve_slot(db, str(body.slot_id), iv.data[0]["id"])
                booked = {"date": slot["date"], "time": start}
                custom["recruitment_stage"] = "interview"
                candidate_repository.update_status(db, cand["id"], {"custom_fields": custom})

    notify_hr(
        db,
        title=f"Nouvelle candidature — {name}",
        body=f"{name} a postulé à « {ad.get('poste', '')} »" + (f", entretien le {booked['date']} à {booked['time']}" if booked else ""),
        notif_type="candidate",
        link=f"/app/candidats?c={cand['id']}",
    )
    return {"id": cand["id"], "interview": booked}


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
    res = candidate_repository.update_status(db, str(candidate_id), update)
    row = (getattr(res, "data", None) or [{}])[0] if res is not None else {}
    webhook_service.emit(db, "candidate.hired", {"employee_id": str(candidate_id), "employee": row.get("full_name"), "position": row.get("position") or payload.get("position")})
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
