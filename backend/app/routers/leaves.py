"""Leave management router — /api/leaves"""
from typing import Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action

router = APIRouter(prefix="/leaves", tags=["Leaves"])


class LeaveRequestCreate(BaseModel):
    employee_id: str
    type: str  # annual | sick | personal | maternity | paternity | unpaid
    start_date: date
    end_date: date
    days: int
    reason: Optional[str] = None


class LeaveRequestUpdate(BaseModel):
    status: Optional[str] = None
    reason: Optional[str] = None


# ── List ──────────────────────────────────────────────────────

@router.get("")
def list_leaves(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    query = (
        supabase.table("leave_requests")
        .select("*, employees(id, full_name, position, department)")
    )
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if status:
        query = query.eq("status", status)

    res = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    count_q = supabase.table("leave_requests").select("id", count="exact")
    if employee_id:
        count_q = count_q.eq("employee_id", employee_id)
    if status:
        count_q = count_q.eq("status", status)
    count_res = count_q.execute()
    return {"data": res.data, "count": count_res.count or 0}


@router.get("/balance/{employee_id}")
def get_balance(
    employee_id: str,
    year: int = Query(default=None),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from datetime import datetime
    y = year or datetime.now().year
    res = (
        supabase.table("leave_balances")
        .select("*")
        .eq("employee_id", employee_id)
        .eq("year", y)
        .maybe_single()
        .execute()
    )
    if not res.data:
        # Return default balance
        return {
            "employee_id": employee_id,
            "year": y,
            "annual_total": 21, "annual_used": 0,
            "sick_total": 12,   "sick_used": 0,
            "personal_total": 5, "personal_used": 0,
        }
    return res.data


# ── Create ────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_leave(
    payload: LeaveRequestCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    data = payload.model_dump()
    data["start_date"] = str(data["start_date"])
    data["end_date"] = str(data["end_date"])
    data["created_by"] = current_user["id"]
    data["status"] = "pending"

    res = supabase.table("leave_requests").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create leave request")

    leave = res.data[0]
    log_action(supabase, current_user["id"], "CREATE", "leave_request", leave["id"])
    return leave


# ── Approve / Reject ─────────────────────────────────────────

@router.patch("/{leave_id}/review")
def review_leave(
    leave_id: str,
    status: str = Query(..., regex="^(approved|rejected)$"),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    from datetime import datetime
    update_data = {
        "status": status,
        "reviewed_by": current_user["id"],
        "reviewed_at": datetime.utcnow().isoformat(),
    }
    res = supabase.table("leave_requests").update(update_data).eq("id", leave_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave = res.data[0]
    log_action(supabase, current_user["id"], status.upper(), "leave_request", leave_id)
    return leave


@router.patch("/{leave_id}")
def update_leave(
    leave_id: str,
    payload: LeaveRequestUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    res = supabase.table("leave_requests").update(data).eq("id", leave_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return res.data[0]


@router.delete("/{leave_id}", status_code=204)
def delete_leave(
    leave_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    res = supabase.table("leave_requests").delete().eq("id", leave_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Leave request not found")
    log_action(supabase, current_user["id"], "DELETE", "leave_request", leave_id)
