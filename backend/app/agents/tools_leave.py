"""Leave, absences and employee requests agent."""
from datetime import date, timedelta
from typing import Optional

from app.agents.runtime import PEOPLE, STAFF, ToolError, ctx, hr_tool, link, name_of, one_person, parse_date, roster, run_handler, tr
from app.routers import leaves as leaves_router
from app.routers import requests as requests_router

A = "leave"
LEAVE_TYPES = ("annual", "sick", "personal", "maternity", "paternity", "unpaid", "unjustified")
TYPE_LABEL = {"annual": ("annuel", "annual", "سنوية"), "sick": ("maladie", "sick", "مرضية"), "personal": ("personnel", "personal", "شخصية"), "maternity": ("maternité", "maternity", "أمومة"),
              "paternity": ("paternité", "paternity", "أبوة"), "unpaid": ("sans solde", "unpaid", "بدون أجر"), "unjustified": ("absence non justifiée", "unjustified absence", "غياب غير مبرر")}


def _holiday_dates() -> set[str]:
    try:
        rows = run_handler(leaves_router.list_holidays, ctx().db, ctx().user).get("data") or []
        return {str(r.get("date"))[:10] for r in rows}
    except Exception:
        return set()


def working_days(start: date, end: date) -> int:
    """Monday–Friday days between two dates (inclusive), minus the public holidays of the table."""
    hol, n, d = _holiday_dates(), 0, start
    while d <= end:
        if d.weekday() < 5 and d.isoformat() not in hol:
            n += 1
        d += timedelta(days=1)
    return n


@hr_tool(A, ("Demandes de congé", "Leave requests", "طلبات العطل"))
def leave_requests(status: str = "pending", employee: str = "", limit: int = 30) -> dict:
    """Leave requests, newest first, with the employee's name.

    Args:
      status: pending, approved or rejected. Empty = all.
      employee: Only this person (name or id). Empty = everyone.
      limit: Maximum rows (default 30).
    """
    emp_id = one_person(employee, PEOPLE)["id"] if employee else None
    res = run_handler(leaves_router.list_leaves, emp_id, status or None, 0, limit, ctx().db, ctx().user)
    rows = res.get("data") or []
    return {"count": res.get("count", len(rows)), "requests": [
        {"id": r["id"], "employee": name_of(r.get("employee_id")), "type": r.get("type"), "start": r.get("start_date"), "end": r.get("end_date"),
         "days": r.get("days"), "status": r.get("status"), "reason": r.get("reason")} for r in rows],
        "links": [link("/app/requests?kind=leave", tr("Ouvrir Demandes", "Open Requests", "فتح الطلبات"))]}


@hr_tool(A, ("Solde de congés", "Leave balance", "رصيد العطل"))
def leave_balance(employee: str, year: int = 0) -> dict:
    """Leave balance of one employee (annual, sick, personal: total, used, remaining).

    Args:
      employee: Name or id.
      year: Year (default current).
    """
    r = one_person(employee, STAFF | {"intern"})
    b = run_handler(leaves_router.get_balance, r["id"], year or None, ctx().db, ctx().user)
    return {"employee": r["full_name"], **{k: b.get(k) for k in ("year", "annual_total", "annual_used", "sick_total", "sick_used", "personal_total", "personal_used")}}


@hr_tool(A, ("Qui est absent", "Who is absent", "من هو غائب"))
def who_is_absent(on_date: str = "") -> dict:
    """People on approved leave on a given day (default today), plus those whose leave starts within the next 7 days.

    Args:
      on_date: Day, YYYY-MM-DD (default today).
    """
    d = parse_date(on_date, "on_date") if on_date else date.today()
    rows = ctx().db.table("leave_requests").select("employee_id, type, start_date, end_date, days").eq("status", "approved").lte("start_date", (d + timedelta(days=7)).isoformat()).gte("end_date", d.isoformat()).execute().data or []
    now = [r for r in rows if r["start_date"] <= d.isoformat() <= r["end_date"]]
    soon = [r for r in rows if r["start_date"] > d.isoformat()]
    fmt = lambda r: {"employee": name_of(r.get("employee_id")), "type": r.get("type"), "start": r.get("start_date"), "end": r.get("end_date")}
    return {"date": d.isoformat(), "absent_count": len(now), "absent": [fmt(r) for r in now], "starting_within_7_days": [fmt(r) for r in soon],
            "links": [link("/app/absences", tr("Ouvrir Absences", "Open Absences", "فتح الغيابات"))]}


@hr_tool(A, ("Jours fériés", "Public holidays", "الأعياد"))
def list_holidays(year: int = 0) -> dict:
    """Public holidays stored in Wedy (fixed and added lunar ones).

    Args:
      year: Only this year (default: all).
    """
    rows = run_handler(leaves_router.list_holidays, ctx().db, ctx().user).get("data") or []
    return {"holidays": [{"name": r.get("name"), "date": r.get("date")} for r in rows if not year or str(r.get("date", "")).startswith(str(year))]}


def _request_preview(a: dict) -> dict:
    r = one_person(a["employee"], STAFF | {"intern"})
    s, e = parse_date(a["start_date"], "start_date"), parse_date(a["end_date"], "end_date")
    if e < s:
        raise ToolError(tr("La fin du congé est avant son début.", "The leave ends before it starts.", "نهاية العطلة قبل بدايتها."))
    t = a.get("type") or "annual"
    if t not in LEAVE_TYPES:
        raise ToolError(f"type: {', '.join(LEAVE_TYPES)}")
    n = working_days(s, e)
    return {"summary": tr(f"Créer une demande de congé pour {r['full_name']}", f"Create a leave request for {r['full_name']}", f"إنشاء طلب عطلة لـ {r['full_name']}"),
            "details": [[tr("Type", "Type", "النوع"), tr(*TYPE_LABEL[t])], [tr("Du", "From", "من"), s.isoformat()], [tr("Au", "To", "إلى"), e.isoformat()],
                        [tr("Jours ouvrés", "Working days", "أيام العمل"), n]] + ([[tr("Motif", "Reason", "السبب"), a["reason"]]] if a.get("reason") else [])}


@hr_tool(A, ("Créer une demande de congé", "Create a leave request", "إنشاء طلب عطلة"), write=True, preview=_request_preview)
def request_leave(employee: str, start_date: str, end_date: str, type: str = "annual", reason: str = "") -> dict:
    """Create a leave request for an employee (status pending; approve it with review_leave). Working days are computed
    (Mon–Fri minus public holidays).

    Args:
      employee: Name or id.
      start_date: First day, YYYY-MM-DD.
      end_date: Last day, YYYY-MM-DD.
      type: annual, sick, personal, maternity, paternity, unpaid or unjustified.
      reason: Reason (optional).
    """
    r = one_person(employee, STAFF | {"intern"})
    s, e = parse_date(start_date, "start_date"), parse_date(end_date, "end_date")
    body = leaves_router.LeaveRequestCreate(employee_id=r["id"], type=type, start_date=s, end_date=e, days=max(1, working_days(s, e)), reason=reason or None)
    leave = run_handler(leaves_router.create_leave, body, ctx().db, ctx().user)
    return {"created": True, "leave_id": leave.get("id"), "employee": r["full_name"], "days": body.days, "status": "pending",
            "links": [link(f"/app/requests?kind=leave&id={leave.get('id')}", tr("Voir la demande", "See the request", "عرض الطلب"))]}


def _pending_leave(a: dict) -> dict:
    """The leave to decide: by id, else the only pending one of the named employee."""
    if a.get("leave_id"):
        rows = ctx().db.table("leave_requests").select("*").eq("id", a["leave_id"]).limit(1).execute().data or []
        if not rows:
            raise ToolError(tr("Demande de congé introuvable.", "Leave request not found.", "طلب العطلة غير موجود."))
        return rows[0]
    if not a.get("employee"):
        raise ToolError(tr("Précisez l'employé ou l'identifiant de la demande.", "Give the employee or the request id.", "حدّد الموظف أو معرّف الطلب."))
    r = one_person(a["employee"], PEOPLE)
    rows = ctx().db.table("leave_requests").select("*").eq("employee_id", r["id"]).eq("status", "pending").execute().data or []
    if not rows:
        raise ToolError(tr(f"{r['full_name']} n'a aucune demande de congé en attente.", f"{r['full_name']} has no pending leave request.", f"لا يوجد طلب عطلة معلّق لـ {r['full_name']}."))
    if len(rows) > 1:
        raise ToolError(tr("Plusieurs demandes en attente : ", "Several pending requests: ", "عدة طلبات معلقة: ") + "; ".join(f"{x['start_date']}→{x['end_date']} (id {x['id']})" for x in rows))
    return rows[0]


def _review_preview(a: dict) -> dict:
    if a.get("decision") not in ("approved", "rejected"):
        raise ToolError("decision: approved | rejected")
    lv = _pending_leave(a)
    ok = a["decision"] == "approved"
    who = name_of(lv.get("employee_id"))
    return {"summary": tr(f"{'Approuver' if ok else 'Refuser'} le congé de {who}", f"{'Approve' if ok else 'Reject'} {who}'s leave", f"{'الموافقة على' if ok else 'رفض'} عطلة {who}"),
            "details": [[tr("Du", "From", "من"), lv.get("start_date")], [tr("Au", "To", "إلى"), lv.get("end_date")], [tr("Jours", "Days", "الأيام"), lv.get("days")], [tr("Type", "Type", "النوع"), lv.get("type")]]}


@hr_tool(A, ("Décider d'un congé", "Decide a leave request", "البت في طلب عطلة"), write=True, preview=_review_preview)
def review_leave(decision: str, leave_id: str = "", employee: str = "", note: str = "") -> dict:
    """Approve or reject a pending leave request. The employee is notified. Identify it by leave_id (from leave_requests)
    or by the employee when they have a single pending request.

    Args:
      decision: approved or rejected.
      leave_id: Id of the leave request.
      employee: Name of the employee (when leave_id is unknown).
      note: Optional comment kept on the request.
    """
    lv = _pending_leave({"leave_id": leave_id, "employee": employee})
    out = run_handler(leaves_router.review_leave, lv["id"], decision, ctx().db, ctx().user)
    if note:
        try:
            ctx().db.table("leave_requests").update({"comment": note}).eq("id", lv["id"]).execute()
        except Exception:
            pass
    return {"done": True, "employee": name_of(lv.get("employee_id")), "status": out.get("status", decision), "links": [link("/app/requests?kind=leave", tr("Ouvrir Demandes", "Open Requests", "فتح الطلبات"))]}


@hr_tool(A, ("Boîte de demandes", "Requests inbox", "صندوق الطلبات"))
def requests_inbox(only_pending: bool = True, kind: str = "", limit: int = 25) -> dict:
    """Employees' requests waiting for HR: leave, document requests and other requests, with counts.

    Args:
      only_pending: Only the ones needing action (default true).
      kind: leave, document or other. Empty = all.
      limit: Maximum rows (default 25).
    """
    items, _ = requests_router._inbox_items(ctx().db)
    if only_pending:
        items = [i for i in items if i["state"] == "pending"]
    if kind:
        items = [i for i in items if i["kind"] == kind]
    return {"count": len(items), "items": [{k: i.get(k) for k in ("kind", "id", "employee_name", "title", "details", "status", "created_at")} for i in items[:limit]],
            "links": [link("/app/requests", tr("Ouvrir Demandes", "Open Requests", "فتح الطلبات"))]}


def _decide_preview(a: dict) -> dict:
    kind = a.get("kind")
    if kind not in ("leave", "document", "other"):
        raise ToolError("kind: leave | document | other")
    items, _ = requests_router._inbox_items(ctx().db)
    it = next((i for i in items if i["kind"] == kind and i["id"] == a.get("request_id")), None)
    if not it:
        raise ToolError(tr("Demande introuvable.", "Request not found.", "الطلب غير موجود."))
    return {"summary": tr(f"Mettre « {it['title']} » de {it['employee_name']} à « {a.get('status')} »", f"Set “{it['title']}” of {it['employee_name']} to “{a.get('status')}”", f"تحديث «{it['title']}» لـ {it['employee_name']} إلى «{a.get('status')}»"),
            "details": [[tr("Détail", "Detail", "التفاصيل"), it.get("details") or "—"]] + ([[tr("Note", "Note", "ملاحظة"), a["note"]]] if a.get("note") else [])}


@hr_tool(A, ("Traiter une demande", "Handle a request", "معالجة طلب"), write=True, preview=_decide_preview)
def decide_request(kind: str, request_id: str, status: str, note: str = "") -> dict:
    """Change the status of an employee request from the inbox.

    Args:
      kind: leave, document or other (from requests_inbox).
      request_id: Id of the request.
      status: leave → approved|rejected; document → in_progress|completed|rejected; other → approved|rejected.
      note: Optional note shown to the employee.
    """
    body = requests_router.InboxDecision(status=status, note=note or None)
    out = run_handler(requests_router.decide_request, kind, request_id, body, ctx().db, ctx().user)
    return {"done": True, **{k: out.get(k) for k in ("kind", "id", "status")}}
