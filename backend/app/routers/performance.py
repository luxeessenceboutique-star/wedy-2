from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.dependencies import require_hr_or_admin, get_current_user

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
    query = db.table("performance_reviews").select("*, employees(full_name, position, department)", count="exact")
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if period:
        query = query.eq("period", period)
    
    result = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    return {"data": result.data, "count": result.count or 0}

@router.post("", status_code=201)
async def create_review(
    body: PerformanceReviewCreate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload = body.model_dump()
    payload["reviewer_id"] = current_user["id"]
    result = db.table("performance_reviews").insert(payload).execute()
    return result.data[0]

@router.patch("/{review_id}")
async def update_review(
    review_id: str,
    body: PerformanceReviewUpdate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload = body.model_dump(exclude_none=True)
    result = db.table("performance_reviews").update(payload).eq("id", review_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Review not found")
    return result.data[0]

@router.delete("/{review_id}", status_code=204)
async def delete_review(
    review_id: str,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    check = db.table("performance_reviews").select("id").eq("id", review_id).maybe_single().execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Évaluation introuvable")
    db.table("performance_reviews").delete().eq("id", review_id).execute()
