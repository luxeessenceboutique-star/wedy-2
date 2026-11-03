from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.dependencies import require_hr_or_admin, get_current_user
from app.repositories import performance_repository
from app.services.audit import log_action, create_notification

router = APIRouter(prefix="/performance", tags=["Performance"])

class PerformanceReviewBase(BaseModel):
    employee_id: str
    period: str
    score: Optional[int] = None
    feedback: Optional[str] = None
    objectives: Optional[str] = None
    status: str = "draft"

class PerformanceReviewCreate(PerformanceReviewBase):
    pass

class PerformanceReviewUpdate(BaseModel):
    score: Optional[int] = None
    feedback: Optional[str] = None
    objectives: Optional[str] = None
    status: Optional[str] = None

@router.get("")
async def list_reviews(
    employee_id: Optional[str] = None,
    period: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = performance_repository.list_reviews(db, employee_id, period, skip, limit)
    return {"data": result.data, "count": result.count or 0}

@router.post("", status_code=201)
async def create_review(
    body: PerformanceReviewCreate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload = body.model_dump()
    payload["reviewer_id"] = current_user["id"]
    result = performance_repository.create_review(db, payload)
    return result.data[0]

@router.patch("/{review_id}")
async def update_review(
    review_id: str,
    body: PerformanceReviewUpdate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload = body.model_dump(exclude_none=True)
    result = performance_repository.update_review(db, review_id, payload)
    if not result.data:
        raise HTTPException(status_code=404, detail="Review not found")
    return result.data[0]

@router.delete("/{review_id}", status_code=204)
async def delete_review(
    review_id: str,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    check = performance_repository.get_review_id(db, review_id)
    if not check.data:
        raise HTTPException(status_code=404, detail="Évaluation introuvable")
    performance_repository.delete_review(db, review_id)


# ── Campaigns ────────────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    period: str
    status: str = "planned"


@router.post("/campaign", status_code=201)
async def start_campaign(
    body: CampaignCreate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Open a review campaign: one planned review per active employee who has none for the period."""
    period = body.period.strip()
    if not period:
        raise HTTPException(status_code=422, detail="period required")
    staff = db.table("employees").select("id").in_("status", ["active", "on-leave"]).execute().data or []
    have = {r["employee_id"] for r in (db.table("performance_reviews").select("employee_id").eq("period", period).execute().data or [])}
    rows = [{"employee_id": e["id"], "period": period, "status": body.status, "reviewer_id": current_user["id"]} for e in staff if e["id"] not in have]
    if rows:
        db.table("performance_reviews").insert(rows).execute()
    log_action(db, current_user["id"], "CREATE", "performance_campaign", period)
    return {"created": len(rows), "skipped": len(have), "period": period}


def _user_for_employee(db: Client, emp: Optional[dict]) -> Optional[str]:
    email = (emp or {}).get("email")
    if not email:
        return None
    try:
        users = db.auth.admin.list_users()
    except Exception:
        return None
    for u in users or []:
        if (getattr(u, "email", None) or "").lower() == email.lower():
            return u.id
    return None


@router.post("/{review_id}/remind")
async def remind_review(
    review_id: str,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Remind the employee (and their manager, when the manager has an account) about a pending review."""
    review = (db.table("performance_reviews").select("id, employee_id, period, status").eq("id", review_id).limit(1).execute().data or [None])[0]
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    emp = (db.table("employees").select("id, full_name, email, manager").eq("id", review["employee_id"]).limit(1).execute().data or [None])[0] or {}
    period = review.get("period", "")
    sent = {"employee": False, "manager": False}
    uid = _user_for_employee(db, emp)
    if uid:
        create_notification(db, user_id=uid, title="Entretien annuel à compléter",
                            message=f"Votre entretien {period} est en attente : merci de compléter votre auto-évaluation.",
                            notif_type="warning", link="/employee")
        sent["employee"] = True
    if emp.get("manager"):
        mgr = (db.table("employees").select("id, email").eq("full_name", emp["manager"]).limit(1).execute().data or [None])[0]
        mid = _user_for_employee(db, mgr)
        if mid:
            create_notification(db, user_id=mid, title="Entretien à mener",
                                message=f"L'entretien {period} de {emp.get('full_name', '')} est en attente.",
                                notif_type="warning", link="/app/performance")
            sent["manager"] = True
    if not any(sent.values()):
        raise HTTPException(status_code=409, detail="no_account")
    log_action(db, current_user["id"], "REMIND", "performance_review", review_id)
    return sent
