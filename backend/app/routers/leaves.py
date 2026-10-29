"""Leave management router — /api/leaves"""
from typing import Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action, create_notification, notify_hr
from app.repositories import leave_repository

router = APIRouter(prefix="/leaves", tags=["Leaves"])


class LeaveRequestCreate(BaseModel):
    employee_id: str
    type: str  # annual | sick | personal | maternity | paternity | unpaid | unjustified (absence)
    start_date: date
    end_date: date
    days: int
    reason: Optional[str] = None


class LeaveRequestUpdate(BaseModel):
    status: Optional[str] = None
    reason: Optional[str] = None
    justification: Optional[str] = None


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
    res, count_res = leave_repository.list_leaves(supabase, employee_id, status, skip, limit)
    return {"data": res.data, "count": count_res.count or 0}


@router.get("/balance/{employee_id}")
def get_balance(
    employee_id: str,
    year: int = Query(default=None),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from datetime import datetime, date as _date
    y = year or datetime.now().year

    def _safe_default() -> dict:
        base = 21
        try:
            emp = leave_repository.get_employee_hire_date(supabase, employee_id)
            if emp.data and emp.data.get("hire_date"):
                hd = _date.fromisoformat(emp.data["hire_date"][:10])
                seniority = (datetime.now().date() - hd).days // 365
                base = min(21 + (seniority // 5) * 1, 30)
        except Exception:
            pass
        return {
            "employee_id": employee_id,
            "year": y,
            "annual_total": int(base),
            "annual_used": 0,
            "sick_total": 12,
            "sick_used": 0,
            "personal_total": 5,
            "personal_used": 0,
        }

    try:
        res = leave_repository.get_leave_balance(supabase, employee_id, y)
        if res.data:
            return res.data
    except Exception:
        pass

    # No record found — create and return default
    default = _safe_default()
    try:
        ins = leave_repository.create_leave_balance(supabase, default)
        if ins.data:
            return ins.data[0]
    except Exception:
        # Duplicate or table error — try fetching again
        try:
            res2 = leave_repository.get_leave_balance(supabase, employee_id, y)
            if res2.data:
                return res2.data
        except Exception:
            pass
    return default


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
    data["status"] = "pending"

    try:
        res = leave_repository.create_leave(supabase, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create leave request")

    leave = res.data[0]
    log_action(supabase, current_user["id"], "CREATE", "leave_request", leave["id"])

    # Notify HR that a new leave request was created (HR-side creation)
    notify_hr(
        supabase,
        title=f"Congé créé pour un employé",
        body=f"Une demande de congé ({data.get('type', '')}) a été créée du {data.get('start_date', '')} au {data.get('end_date', '')}.",
        notif_type="leave_pending",
        link=f"/app/requests?kind=leave&id={leave['id']}",
    )
    return leave


# ── Approve / Reject ─────────────────────────────────────────

@router.patch("/{leave_id}/review")
def review_leave(
    leave_id: str,
    status: str = Query(..., pattern="^(approved|rejected)$"),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    from datetime import datetime
    update_data = {
        "status": status,
        "reviewed_by": current_user["id"],
        "reviewed_at": datetime.utcnow().isoformat(),
    }
    res = leave_repository.update_leave(supabase, leave_id, update_data)
    if not res.data:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave = res.data[0]
    log_action(supabase, current_user["id"], status.upper(), "leave_request", leave_id)

    # Notify the employee who owns this leave request
    _notify_employee_leave_decision(supabase, leave, status)
    return leave


def _notify_employee_leave_decision(supabase: Client, leave: dict, status: str) -> None:
    """Find the user linked to the employee's email and send them a notification."""
    emp_id = leave.get("employee_id")
    if not emp_id:
        return
    try:
        # Get employee email
        emp = leave_repository.get_employee_email(supabase, emp_id)
        emp_email = (emp.data or {}).get("email")
        emp_name  = (emp.data or {}).get("full_name", "Employé")
        if not emp_email:
            return

        # Look up user_id by email via Supabase admin API
        users = leave_repository.list_auth_users(supabase)
        target_user_id = None
        for u in (users or []):
            if getattr(u, "email", None) == emp_email:
                target_user_id = u.id
                break

        if not target_user_id:
            print(f"[leaves] no auth user found for email {emp_email!r}")
            return

        status_label = "approuvée" if status == "approved" else "refusée"
        create_notification(
            supabase,
            user_id=target_user_id,
            message=(
                f"Votre demande de congé du {leave.get('start_date', '')} "
                f"au {leave.get('end_date', '')} a été {status_label}."
            ),
            title=f"Congé {status_label}",
            notif_type="success" if status == "approved" else "warning",
        )
    except Exception as e:
        print(f"[leaves] _notify_employee_leave_decision failed: {e}")


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

    res = leave_repository.update_leave(supabase, leave_id, data)
    if not res.data:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return res.data[0]


@router.delete("/{leave_id}", status_code=204)
def delete_leave(
    leave_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    res = leave_repository.delete_leave(supabase, leave_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Leave request not found")
    leave = res.data[0]
    # An approved leave had been deducted from the balance (DB trigger): give the days back
    col = {"annual": "annual_used", "sick": "sick_used", "personal": "personal_used"}.get(leave.get("type"))
    if col and leave.get("status") == "approved" and leave.get("days"):
        try:
            year = int(str(leave.get("start_date"))[:4])
            bal = (supabase.table("leave_balances").select(f"id,{col}")
                   .eq("employee_id", leave["employee_id"]).eq("year", year).limit(1).execute().data or [])
            if bal:
                supabase.table("leave_balances").update({col: max(0, (bal[0].get(col) or 0) - leave["days"])}).eq("id", bal[0]["id"]).execute()
        except Exception as e:
            print(f"[leaves] balance not restored after delete: {e}")
    log_action(supabase, current_user["id"], "DELETE", "leave_request", leave_id)


@router.get("/holidays")
def list_holidays(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Fetch public holidays."""
    res = leave_repository.list_holidays(supabase)
    return {"data": res.data or []}
