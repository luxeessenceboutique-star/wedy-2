"""Audit log router — /api/audit-logs"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends
from supabase import Client

from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.repositories import audit_log_repository

router = APIRouter(prefix="/audit-logs", tags=["Audit"])


@router.get("")
def list_audit_logs(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    entity: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    res, count_res = audit_log_repository.list_audit_logs(
        supabase, user_id, action, entity, skip, limit
    )
    return {"data": res.data, "count": count_res.count or 0}


# ── Readable feed: each entry with the name of what it touched ─────────────────

# entity → (table, columns, how to build the label from a row and the employee names)
def _label_employee(row, names):
    return row.get("full_name")


def _via_employee(row, names):
    return names.get(row.get("employee_id"))


_TARGETS = {
    "employee": ("employees", "id, full_name", _label_employee),
    "intern": ("employees", "id, full_name", _label_employee),
    "employee_onboarding": ("employees", "id, full_name", _label_employee),
    "leave_request": ("leave_requests", "id, employee_id", _via_employee),
    "performance_review": ("performance_reviews", "id, employee_id", _via_employee),
    "payroll_record": ("payroll_records", "id, employee_id", _via_employee),
    "generated_documents": ("generated_documents", "id, employee_id, document_type", lambda r, n: " · ".join(x for x in [r.get("document_type"), n.get(r.get("employee_id"))] if x)),
    "meeting": ("meetings", "id, title", lambda r, n: r.get("title")),
    "meeting_report": ("meetings", "id, title", lambda r, n: r.get("title")),
    "holiday": ("holidays", "id, name", lambda r, n: r.get("name")),
    "hr_request": ("hr_requests", "id, employee_id, type", lambda r, n: " · ".join(x for x in [r.get("type"), n.get(r.get("employee_id"))] if x)),
}


@router.get("/feed")
def audit_feed(
    days: int = 30,
    limit: int = 300,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """The latest entries (default: 30 days, 300 rows) with the author's name and a target label."""
    since = (datetime.utcnow() - timedelta(days=max(1, min(days, 730)))).isoformat()
    rows = (supabase.table("audit_logs").select("*, profiles(full_name)").gte("created_at", since)
            .order("created_at", desc=True).limit(max(1, min(limit, 1000))).execute().data or [])
    total = supabase.table("audit_logs").select("id", count="exact").execute().count or 0

    by_entity: dict[str, set] = {}
    for r in rows:
        if r.get("entity") in _TARGETS and r.get("entity_id"):
            by_entity.setdefault(r["entity"], set()).add(str(r["entity_id"]))
    fetched: dict[str, dict] = {}
    emp_ids: set = set()
    for entity, ids in by_entity.items():
        table, cols, _ = _TARGETS[entity]
        try:
            for row in supabase.table(table).select(cols).in_("id", list(ids)[:500]).execute().data or []:
                fetched[f"{entity}:{row['id']}"] = row
                if row.get("employee_id"):
                    emp_ids.add(row["employee_id"])
        except Exception:
            continue  # table missing or renamed: the entry keeps its raw id
    names = {}
    if emp_ids:
        try:
            names = {e["id"]: e.get("full_name") for e in supabase.table("employees").select("id, full_name").in_("id", list(emp_ids)[:1000]).execute().data or []}
        except Exception:
            names = {}

    out = []
    for r in rows:
        entity, eid = r.get("entity"), r.get("entity_id")
        row = fetched.get(f"{entity}:{eid}")
        target = _TARGETS[entity][2](row, names) if row and entity in _TARGETS else None
        out.append({
            "id": r.get("id"), "created_at": r.get("created_at"), "action": r.get("action"), "entity": entity,
            "entity_id": eid, "user_id": r.get("user_id"), "user_name": (r.get("profiles") or {}).get("full_name"),
            "target": target, "deleted": bool(eid) and entity in _TARGETS and row is None,
        })
    return {"data": out, "total": total}
