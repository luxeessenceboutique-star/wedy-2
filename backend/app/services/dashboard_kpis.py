"""HR dashboard KPIs — computed from the data the platform really has.

There is no clock-in / attendance table, so "présence", "absences" and "taux de présence" are
derived from approved leave requests; "retards" has no data source and is reported as unavailable.
"""
import time
from calendar import monthrange
from collections import Counter
from datetime import date, timedelta
from typing import Optional

from fastapi import HTTPException
from supabase import Client

ABSENCE_TYPES = {"sick", "unpaid"}          # counted as "absences"; every other leave type is a "congé"
ACTIVE_STATUSES = {"active", "on-leave"}    # still part of the workforce
INACTIVE_STATUSES = {"inactive", "terminated"}
PENDING_DOC = ("pending", "in_progress")
MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]


def _d(v) -> Optional[date]:
    try:
        return date.fromisoformat(str(v)[:10]) if v else None
    except ValueError:
        return None


def _all(sb: Client, table: str, cols: str, warnings: list, required: bool = False) -> list:
    """Read a whole table (one retry). A required table that cannot be read raises, so the dashboard
    shows an error instead of misleading zeros; an optional one is reported in `warnings`."""
    for attempt in (1, 2):
        try:
            return sb.table(table).select(cols).range(0, 9999).execute().data or []
        except Exception:
            if attempt == 1:
                time.sleep(0.3)
    if required:
        raise HTTPException(status_code=502, detail=f"Lecture de « {table} » impossible, réessayez.")
    warnings.append(table)
    return []


def _holidays(sb: Client, warnings: list) -> tuple[set, set]:
    """(exact dates, recurring (month, day) pairs)"""
    exact, recurring = set(), set()
    for h in _all(sb, "holidays", "date,is_recurring", warnings):
        d = _d(h.get("date"))
        if d:
            (recurring if h.get("is_recurring") else exact).add((d.month, d.day) if h.get("is_recurring") else d)
    return exact, recurring


def _is_workday(d: date, hol: tuple[set, set]) -> bool:
    return d.weekday() < 5 and d not in hol[0] and (d.month, d.day) not in hol[1]


def _month_start(d: date, back: int) -> date:
    y, m = d.year, d.month - back
    while m <= 0:
        m += 12
        y -= 1
    return date(y, m, 1)


def compute_kpis(sb: Client, days: int = 30, today: Optional[date] = None) -> dict:
    today = today or date.today()
    days = max(1, min(int(days), 366))
    period_start = today - timedelta(days=days - 1)
    warnings: list = []
    hol = _holidays(sb, warnings)

    # ── Workforce ────────────────────────────────────────────────────────────
    emp = _all(sb, "employees", "id,full_name,status,department,contract_type,contract_end,hire_date,cin,updated_at", warnings, required=True)
    workforce = [e for e in emp if e.get("status") != "intern"]
    active = [e for e in workforce if e.get("status") in ACTIVE_STATUSES]
    inactive = [e for e in workforce if e.get("status") in INACTIVE_STATUSES]
    interns = sum(1 for e in emp if e.get("status") == "intern")
    active_ids = {e["id"] for e in active}

    # ── Leaves ───────────────────────────────────────────────────────────────
    leaves = _all(sb, "leave_requests", "id,employee_id,type,start_date,end_date,status,reviewed_at,updated_at,created_at", warnings, required=True)
    approved = [l for l in leaves if l.get("status") == "approved"]

    def covers(l: dict, day: date) -> bool:
        s, e = _d(l.get("start_date")), _d(l.get("end_date")) or _d(l.get("start_date"))
        return bool(s and e and s <= day <= e)

    today_leaves = [l for l in approved if l.get("employee_id") in active_ids and covers(l, today)]
    absent_ids = {l["employee_id"] for l in today_leaves if l.get("type") in ABSENCE_TYPES}
    on_leave_ids = {l["employee_id"] for l in today_leaves if l.get("type") not in ABSENCE_TYPES} - absent_ids
    workday = _is_workday(today, hol)
    present = len(active_ids - absent_ids - on_leave_ids) if workday else 0

    # ── Requests (leaves + document requests + generic HR requests) ───────────
    docs = _all(sb, "document_requests", "id,employee_id,status,created_at,updated_at", warnings)
    hr_req = _all(sb, "hr_requests", "id,status,created_at,updated_at", warnings)
    pending_leave = sum(1 for l in leaves if l.get("status") == "pending")
    pending_doc = sum(1 for r in docs if r.get("status") in PENDING_DOC)
    pending_other = sum(1 for r in hr_req if r.get("status") == "pending")

    def decided_in_period(row: dict) -> bool:
        d = _d(row.get("reviewed_at") or row.get("updated_at") or row.get("created_at"))
        return bool(d and period_start <= d <= today)

    decided = [r for r in leaves + docs + hr_req if decided_in_period(r)]
    accepted = sum(1 for r in decided if r.get("status") in ("approved", "completed"))
    refused = sum(1 for r in decided if r.get("status") == "rejected")

    # ── Contracts ────────────────────────────────────────────────────────────
    expiring, expired = [], []
    for e in active:
        end = _d(e.get("contract_end"))
        if not end:
            continue
        left = (end - today).days
        row = {"id": e["id"], "name": e.get("full_name"), "contract_type": e.get("contract_type"),
               "contract_end": end.isoformat(), "days_left": left}
        if left < 0:
            expired.append(row)
        elif left <= 30:
            expiring.append(row)
    expiring.sort(key=lambda r: r["days_left"])

    # ── Documents to process: pending document requests + dossiers incomplete / expired / to renew ──
    incomplete = [e for e in active if not e.get("cin") or not e.get("contract_type") or not e.get("hire_date")]
    problem_ids = {e["id"] for e in incomplete} | {r["id"] for r in expired} | {r["id"] for r in expiring}

    # ── Attendance rate over the period (from approved leaves, working days only) ──
    cap = absent_days = 0
    day = period_start
    while day <= today:
        if _is_workday(day, hol):
            here = {e["id"] for e in active if not _d(e.get("hire_date")) or _d(e.get("hire_date")) <= day}
            cap += len(here)
            absent_days += len({l["employee_id"] for l in approved if l.get("employee_id") in here and covers(l, day)})
        day += timedelta(days=1)
    rate = round((cap - absent_days) / cap * 100, 1) if cap else None

    # ── Distributions ────────────────────────────────────────────────────────
    by_dept = Counter((e.get("department") or "Sans service") for e in active)
    by_contract = Counter((e.get("contract_type") or "Non renseigné") for e in active)
    if interns:
        by_contract["Stagiaires"] = interns

    # ── Workforce evolution (hires / departures per month) ───────────────────
    def departure(e: dict) -> Optional[date]:
        if e.get("status") != "terminated":
            return None
        return _d(e.get("contract_end")) or _d(e.get("updated_at"))

    months = 12 if days >= 365 else 6
    evolution = []
    for back in range(months - 1, -1, -1):
        first = _month_start(today, back)
        last = date(first.year, first.month, monthrange(first.year, first.month)[1])
        hires = sum(1 for e in workforce if (h := _d(e.get("hire_date"))) and first <= h <= last)
        leavers = sum(1 for e in workforce if (x := departure(e)) and first <= x <= last)
        headcount = sum(
            1 for e in workforce
            if (not _d(e.get("hire_date")) or _d(e.get("hire_date")) <= last)
            and not ((x := departure(e)) and x <= last)
        )
        evolution.append({"month": first.strftime("%Y-%m"), "label": f"{MONTHS_FR[first.month - 1]} {str(first.year)[2:]}",
                          "hires": hires, "departures": leavers, "headcount": headcount})

    return {
        "period_days": days,
        "today": today.isoformat(),
        "workday": workday,
        "workforce": {"total": len(workforce), "active": len(active), "inactive": len(inactive), "interns": interns},
        "today_status": {
            "present": present, "on_leave": len(on_leave_ids), "absent": len(absent_ids),
            "late": None, "late_available": False,
        },
        "requests": {
            "pending": pending_leave + pending_doc + pending_other,
            "pending_leave": pending_leave, "pending_document": pending_doc, "pending_other": pending_other,
            "accepted": accepted, "refused": refused,
        },
        "documents": {
            "to_process": pending_doc + len(problem_ids),
            "pending_requests": pending_doc, "incomplete": len(incomplete),
            "expired": len(expired), "to_renew": len(expiring),
        },
        "attendance_rate": {"rate": rate, "absent_days": absent_days, "capacity_days": cap},
        "by_department": [{"name": k, "value": v} for k, v in by_dept.most_common()],
        "by_contract": [{"name": k, "value": v} for k, v in by_contract.most_common()],
        "expiring_contracts": {"count": len(expiring), "expired": len(expired), "items": expiring[:6]},
        "evolution": evolution,
        "warnings": warnings,
    }
