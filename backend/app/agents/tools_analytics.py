"""Analytics, payroll and audit agent (read-mostly)."""
from datetime import date

from app.agents.runtime import ctx, hr_tool, link, name_of, run_handler, tr
from app.routers import analytics as analytics_router
from app.routers import audit_log as audit_router
from app.routers import dashboard as dash_router
from app.routers import payroll as payroll_router

A = "analytics"


@hr_tool(A, ("Indicateurs RH", "HR indicators", "مؤشرات الموارد البشرية"))
def hr_kpis(days: int = 30) -> dict:
    """Dashboard indicators: headcount (active, inactive, interns), who is absent today, pending requests, contracts ending,
    attendance rate, distribution by department and contract, hires / departures per month.

    Args:
      days: Period in days for rates and evolution (default 30).
    """
    k = run_handler(dash_router.get_kpis, days, ctx().db, ctx().user)
    keep = ("period_days", "today", "workforce", "today_status", "requests", "documents", "contracts", "attendance", "distribution", "evolution")
    out = {key: k[key] for key in keep if key in k}
    for key in list(k):
        if key not in out and not isinstance(k[key], (list, dict)):
            out[key] = k[key]
    out["links"] = [link("/app", tr("Ouvrir le tableau de bord", "Open the dashboard", "فتح لوحة التحكم")), link("/app/analytics", tr("Ouvrir Analytics", "Open Analytics", "فتح التحليلات"))]
    return out


@hr_tool(A, ("Vue d'ensemble des effectifs", "Workforce overview", "نظرة على الموظفين"))
def workforce_overview() -> dict:
    """Headcount by contract type and department, contracts ending soon, interns, people on leave."""
    out = run_handler(analytics_router.get_overview, ctx().db, ctx().user)
    out["links"] = [link("/app/analytics", tr("Ouvrir Analytics", "Open Analytics", "فتح التحليلات"))]
    return out


@hr_tool(A, ("Paie d'un mois", "Payroll of a month", "رواتب شهر"))
def payroll_summary(month: int = 0, year: int = 0) -> dict:
    """Payroll records of a month with totals (gross, net, CNSS, IR) and the number of drafts. Defaults to the current month.

    Args:
      month: 1-12 (default current).
      year: Year (default current).
    """
    today = date.today()
    m, y = month or today.month, year or today.year
    res = run_handler(payroll_router.list_payroll, m, y, None, 0, 500, ctx().db, ctx().user)
    rows = res.get("data") or []
    num = lambda r, k: float(r.get(k) or 0)
    return {"month": m, "year": y, "records": len(rows), "drafts": sum(1 for r in rows if r.get("status") == "draft"),
            "totals": {"base": round(sum(num(r, "base_salary") for r in rows), 2), "net": round(sum(num(r, "net_salary") for r in rows), 2),
                       "cnss": round(sum(num(r, "cnss") for r in rows), 2), "ir": round(sum(num(r, "ir") for r in rows), 2)},
            "lines": [{"employee": name_of(r.get("employee_id")), "base": r.get("base_salary"), "net": r.get("net_salary"), "status": r.get("status")} for r in rows[:30]],
            "links": [link("/app/payroll", tr("Ouvrir Paie", "Open Payroll", "فتح الرواتب"))]}


def _payroll_preview(a: dict) -> dict:
    today = date.today()
    m, y = int(a.get("month") or today.month), int(a.get("year") or today.year)
    staff = ctx().db.table("employees").select("id, salary").eq("status", "active").execute().data or []
    have = {r["employee_id"] for r in (ctx().db.table("payroll_records").select("employee_id").eq("month", m).eq("year", y).execute().data or [])}
    return {"summary": tr(f"Générer les bulletins de paie (brouillons) de {m:02d}/{y}", f"Generate the draft payslips of {m:02d}/{y}", f"إنشاء مسودات كشوف الأجور لـ {m:02d}/{y}"),
            "details": [[tr("Salariés actifs", "Active staff", "الموظفون النشطون"), len(staff)], [tr("Sans salaire renseigné", "Without a salary", "بدون أجر"), sum(1 for e in staff if not e.get("salary"))],
                        [tr("Déjà générés", "Already generated", "منشأة مسبقًا"), len(have)]]}


@hr_tool(A, ("Générer la paie", "Generate payroll", "إنشاء الرواتب"), write=True, preview=_payroll_preview)
def generate_payroll(month: int = 0, year: int = 0) -> dict:
    """Generate draft payslips (CNSS and IR computed) for every active employee for a month. Existing ones are kept.

    Args:
      month: 1-12 (default current).
      year: Year (default current).
    """
    today = date.today()
    out = run_handler(payroll_router.generate_bulk_payroll, month or today.month, year or today.year, ctx().db, ctx().user)
    return {**{k: v for k, v in out.items() if not isinstance(v, list) or len(v) < 25}, "links": [link("/app/payroll", tr("Ouvrir Paie", "Open Payroll", "فتح الرواتب"))]}


@hr_tool(A, ("Journal d'activité", "Activity log", "سجل النشاط"))
def recent_activity(days: int = 7, limit: int = 30) -> dict:
    """Latest actions in Wedy (who did what on which record), newest first.

    Args:
      days: Look-back window (default 7).
      limit: Maximum rows (default 30).
    """
    res = run_handler(audit_router.audit_feed, days, limit, ctx().db, ctx().user)
    return {"total_logged": res.get("total"), "entries": [{"when": str(e.get("created_at"))[:16], "who": e.get("user_name"), "action": e.get("action"), "entity": e.get("entity"), "target": e.get("target")} for e in (res.get("data") or [])[:limit]],
            "links": [link("/app/audit", tr("Ouvrir le journal d'audit", "Open the audit log", "فتح سجل التدقيق"))]}
