"""Leave management router — /api/leaves"""
from typing import Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client

from app.services import webhooks as webhook_service
from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action, create_notification, notify_hr
from app.repositories import leave_repository
from app.services import app_settings

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


def _default_annual_total(hire_date: Optional[str], rules: Optional[dict] = None) -> float:
    """Default yearly entitlement from the leave rules of the settings (Code du travail by default:
    1.5 d per month, +1.5 d per 5 years of seniority, 30 d max)."""
    from datetime import datetime, date as _date
    rules = rules or app_settings.DEFAULTS["leave"]
    monthly, bonus, cap = float(rules.get("monthly") or 1.5), float(rules.get("bonus") or 0), float(rules.get("cap") or 30)
    seniority = 0
    if hire_date:
        try:
            seniority = (datetime.now().date() - _date.fromisoformat(str(hire_date)[:10])).days // 365
        except ValueError:
            seniority = 0
    total = min(monthly * 12 + bonus * (seniority // 5), cap)
    return int(total) if float(total).is_integer() else round(total, 1)


@router.get("/balances")
def list_balances(
    year: int = Query(default=None),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Every active employee's balance for the year, in one call (read-only).

    A stored leave_balances row wins; for an employee without one, the default entitlement is
    returned with the approved leave of that year counted as used (nothing is written).
    """
    from datetime import datetime
    y = year or datetime.now().year
    staff = leave_repository.list_staff_for_balances(supabase).data or []
    stored = {r["employee_id"]: r for r in (leave_repository.list_leave_balances(supabase, y).data or [])}
    used: dict = {}
    for lv in leave_repository.list_approved_leaves_between(supabase, f"{y}-01-01", f"{y}-12-31").data or []:
        kind = {"annual": "annual_used", "sick": "sick_used", "personal": "personal_used"}.get(lv.get("type"))
        if kind:
            bucket = used.setdefault(lv["employee_id"], {"annual_used": 0, "sick_used": 0, "personal_used": 0})
            bucket[kind] += lv.get("days") or 0
    rules = app_settings.leave_rules(supabase)
    out = []
    for emp in staff:
        row = stored.get(emp["id"])
        if row:
            entry = {k: row.get(k) for k in ("annual_total", "annual_used", "sick_total", "sick_used", "personal_total", "personal_used")}
        else:
            entry = {"annual_total": _default_annual_total(emp.get("hire_date"), rules), "sick_total": 12, "personal_total": 5,
                     **used.get(emp["id"], {"annual_used": 0, "sick_used": 0, "personal_used": 0})}
        entry.update({"employee_id": emp["id"], "full_name": emp.get("full_name"), "department": emp.get("department"),
                      "year": y, "stored": bool(row)})
        out.append(entry)
    return {"data": out, "year": y}


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
        base = _default_annual_total(None, app_settings.leave_rules(supabase))
        try:
            emp = leave_repository.get_employee_hire_date(supabase, employee_id)
            if emp.data and emp.data.get("hire_date"):
                base = _default_annual_total(emp.data["hire_date"], app_settings.leave_rules(supabase))
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
    if status == "approved":
        emp = (leave_repository.get_employee_email(supabase, leave.get("employee_id")).data or {}) if leave.get("employee_id") else {}
        webhook_service.emit(supabase, "leave.approved", {"leave_id": leave_id, "employee_id": leave.get("employee_id"), "employee": emp.get("full_name"),
                                                           "type": leave.get("type"), "start": leave.get("start_date"), "end": leave.get("end_date"), "days": leave.get("days")})
    return leave


def _user_id_for_email(supabase: Client, email: Optional[str]) -> Optional[str]:
    """The auth user behind an employee's email, if the employee has an account."""
    if not email:
        return None
    for u in (leave_repository.list_auth_users(supabase) or []):
        if (getattr(u, "email", None) or "").lower() == email.lower():
            return u.id
    return None


@router.post("/{leave_id}/remind")
def remind_justification(
    leave_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Ask the employee for the missing justification of an absence (in-app notification)."""
    res = supabase.table("leave_requests").select("id, employee_id, start_date, end_date").eq("id", leave_id).limit(1).execute()
    leave = (res.data or [None])[0]
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    emp = leave_repository.get_employee_email(supabase, leave["employee_id"])
    user_id = _user_id_for_email(supabase, (emp.data or {}).get("email"))
    if not user_id:
        raise HTTPException(status_code=409, detail="no_account")
    start, end = leave.get("start_date", ""), leave.get("end_date") or leave.get("start_date", "")
    period = f"du {start}" if start == end else f"du {start} au {end}"
    create_notification(
        supabase,
        user_id=user_id,
        title="Justificatif d'absence demandé",
        message=f"Merci de transmettre aux RH le justificatif de votre absence {period}.",
        notif_type="warning",
        link="/employee/documents",
    )
    log_action(supabase, current_user["id"], "REMIND", "leave_request", leave_id)
    return {"sent": True}


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

        target_user_id = _user_id_for_email(supabase, emp_email)

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


class HolidayIn(BaseModel):
    name: str
    date: date
    is_recurring: bool = False


@router.post("/holidays", status_code=201)
def add_holiday(
    payload: HolidayIn,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """A public holiday HR adds (typically the lunar ones, whose date changes every year)."""
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Nom requis")
    try:
        res = supabase.table("holidays").insert({"name": name, "date": str(payload.date), "is_recurring": payload.is_recurring}).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    log_action(supabase, current_user["id"], "CREATE", "holiday", (res.data or [{}])[0].get("id"))
    return (res.data or [{}])[0]


@router.delete("/holidays/{holiday_id}", status_code=204)
def delete_holiday(
    holiday_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    supabase.table("holidays").delete().eq("id", holiday_id).execute()
    log_action(supabase, current_user["id"], "DELETE", "holiday", holiday_id)
