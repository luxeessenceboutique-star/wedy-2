"""Performance, training and talent agent."""
from datetime import date

from app.agents.runtime import PEOPLE, STAFF, ToolError, ctx, hr_tool, link, name_of, norm, one_person, run_handler, tr
from app.routers import performance as perf_router
from app.routers import talents as talent_router
from app.routers import training as training_router

A = "talent"


def _period() -> str:
    return str(date.today().year)


@hr_tool(A, ("Entretiens annuels", "Performance reviews", "التقييمات السنوية"))
def performance_reviews(period: str = "", status: str = "", employee: str = "", limit: int = 40) -> dict:
    """Performance reviews of a period with their status and score, plus counts per status.

    Args:
      period: Review period (e.g. 2026). Empty = all.
      status: planned, in_progress, draft, completed… Empty = all.
      employee: Only this person (name or id).
      limit: Maximum rows.
    """
    emp_id = one_person(employee, PEOPLE)["id"] if employee else None
    res = run_handler(perf_router.list_reviews, emp_id, period or None, 0, 500, ctx().db, ctx().user)
    rows = res.get("data") or []
    counts: dict = {}
    for r in rows:
        counts[r.get("status")] = counts.get(r.get("status"), 0) + 1
    rows = [r for r in rows if not status or r.get("status") == status]
    return {"count": len(rows), "by_status": counts, "reviews": [
        {"id": r["id"], "employee": (r.get("employees") or {}).get("full_name") or name_of(r.get("employee_id")), "period": r.get("period"), "status": r.get("status"), "score": r.get("score")} for r in rows[:limit]],
        "links": [link("/app/performance", tr("Ouvrir Performance", "Open Performance", "فتح الأداء"))]}


def _campaign_preview(a: dict) -> dict:
    period = (a.get("period") or "").strip()
    if not period:
        raise ToolError("period")
    staff = [r for r in ctx().db.table("employees").select("id").in_("status", ["active", "on-leave"]).execute().data or []]
    have = {r["employee_id"] for r in (ctx().db.table("performance_reviews").select("employee_id").eq("period", period).execute().data or [])}
    n = sum(1 for e in staff if e["id"] not in have)
    return {"summary": tr(f"Lancer la campagne d'entretiens annuels {period}", f"Start the {period} review campaign", f"إطلاق حملة التقييم السنوي {period}"),
            "details": [[tr("Entretiens à créer", "Reviews to create", "تقييمات للإنشاء"), n], [tr("Déjà existants", "Already existing", "موجودة مسبقًا"), len(have)]]}


@hr_tool(A, ("Lancer une campagne d'entretiens", "Start a review campaign", "إطلاق حملة تقييم"), write=True, preview=_campaign_preview)
def start_review_campaign(period: str = "") -> dict:
    """Open a performance review campaign: one planned review per active employee who has none for the period.

    Args:
      period: Period label, e.g. 2026 or 2026-S1 (default current year).
    """
    out = run_handler(perf_router.start_campaign, perf_router.CampaignCreate(period=(period or _period()).strip(), status="planned"), ctx().db, ctx().user)
    return {**out, "links": [link("/app/performance", tr("Ouvrir Performance", "Open Performance", "فتح الأداء"))]}


def _remind_preview(a: dict) -> dict:
    e = one_person(a["employee"], PEOPLE)
    return {"summary": tr(f"Relancer {e['full_name']} pour son entretien {a.get('period') or _period()}", f"Remind {e['full_name']} about their {a.get('period') or _period()} review", f"تذكير {e['full_name']} بتقييم {a.get('period') or _period()}"), "details": []}


@hr_tool(A, ("Relancer un entretien annuel", "Remind a review", "تذكير بتقييم"), write=True, preview=_remind_preview)
def remind_review(employee: str, period: str = "") -> dict:
    """Send a reminder (notification) to an employee and their manager about a pending performance review.

    Args:
      employee: Name or id.
      period: Review period (default current year).
    """
    e = one_person(employee, PEOPLE)
    p = period or _period()
    rows = ctx().db.table("performance_reviews").select("id, status").eq("employee_id", e["id"]).eq("period", p).limit(1).execute().data or []
    if not rows:
        raise ToolError(tr(f"{e['full_name']} n'a pas d'entretien {p}. Lancez d'abord la campagne.", f"{e['full_name']} has no {p} review. Start the campaign first.", f"لا يوجد تقييم {p} لـ {e['full_name']}."))
    try:
        out = run_handler(perf_router.remind_review, rows[0]["id"], ctx().db, ctx().user)
    except ToolError as err:
        if "no_account" in str(err):
            raise ToolError(tr(f"Ni {e['full_name']} ni son manager n'ont de compte Wedy : impossible d'envoyer le rappel.", f"Neither {e['full_name']} nor their manager has a Wedy account: the reminder cannot be sent.", f"لا {e['full_name']} ولا مديره لديه حساب Wedy: تعذر إرسال التذكير."))
        raise
    return {"reminded": e["full_name"], "notified": [k for k in ("employee", "manager") if isinstance(out, dict) and out.get(k)]}


@hr_tool(A, ("Catalogue de formations", "Training catalog", "كتالوج التكوينات"))
def training_catalog(category: str = "") -> dict:
    """Trainings available in the catalog (title, category, hours, cost).

    Args:
      category: Category filter (optional).
    """
    rows = run_handler(training_router.list_catalog, category, ctx().db, ctx().user)
    return {"trainings": [{"id": r["id"], "title": r.get("title"), "category": r.get("category"), "hours": r.get("duration_hours"), "cost_mad": r.get("cost_dh"), "provider": r.get("provider")} for r in rows[:40]],
            "links": [link("/app/training", tr("Ouvrir Formation", "Open Training", "فتح التكوين"))]}


@hr_tool(A, ("Formations d'un employé", "Employee trainings", "تكوينات موظف"))
def training_assignments(employee: str = "", status: str = "") -> dict:
    """Trainings assigned to employees with their status.

    Args:
      employee: Name or id (optional).
      status: planned, in_progress, completed or cancelled.
    """
    emp_id = one_person(employee, PEOPLE)["id"] if employee else ""
    rows = run_handler(training_router.list_assignments, emp_id, status, ctx().db, ctx().user)
    return {"count": len(rows), "assignments": [{"id": r["id"], "employee": (r.get("employees") or {}).get("full_name"), "training": (r.get("training_catalog") or {}).get("title"),
                                                  "status": r.get("status"), "assigned": str(r.get("assigned_at"))[:10], "score": r.get("score")} for r in rows[:40]]}


def _find_training(ref: str) -> dict:
    rows = run_handler(training_router.list_catalog, "", ctx().db, ctx().user)
    n = norm(ref)
    hits = [r for r in rows if r["id"] == ref or norm(r.get("title")) == n] or [r for r in rows if n and n in norm(r.get("title"))]
    if not hits:
        raise ToolError(tr(f"Aucune formation « {ref} » dans le catalogue.", f"No training “{ref}” in the catalog.", f"لا يوجد تكوين «{ref}» في الكتالوج."))
    if len(hits) > 1:
        raise ToolError(tr("Plusieurs formations : ", "Several trainings: ", "عدة تكوينات: ") + "; ".join(f"{h['title']} (id {h['id']})" for h in hits[:5]))
    return hits[0]


def _assign_preview(a: dict) -> dict:
    e = one_person(a["employee"], PEOPLE)
    t = _find_training(a["training"])
    return {"summary": tr(f"Inscrire {e['full_name']} à « {t['title']} »", f"Enrol {e['full_name']} in “{t['title']}”", f"تسجيل {e['full_name']} في «{t['title']}»"),
            "details": [[tr("Durée", "Duration", "المدة"), f"{t.get('duration_hours') or 0} h"], [tr("Coût", "Cost", "التكلفة"), f"{t.get('cost_dh') or 0} MAD"]]}


@hr_tool(A, ("Inscrire à une formation", "Enrol in a training", "التسجيل في تكوين"), write=True, preview=_assign_preview)
def assign_training(employee: str, training: str) -> dict:
    """Assign a catalog training to an employee (status planned).

    Args:
      employee: Name or id.
      training: Title or id of the training (see training_catalog).
    """
    e = one_person(employee, PEOPLE)
    t = _find_training(training)
    out = run_handler(training_router.assign_training, {"employee_id": e["id"], "training_id": t["id"], "status": "planned"}, ctx().db, ctx().user)
    return {"assigned": True, "employee": e["full_name"], "training": t["title"], "id": out.get("id"), "links": [link("/app/training", tr("Ouvrir Formation", "Open Training", "فتح التكوين"))]}


@hr_tool(A, ("Synthèse talents", "Talent overview", "ملخص المواهب"))
def talent_overview() -> dict:
    """Talent profiles overview (9-box categories, flight risk, critical positions) and OKR progress."""
    stats = run_handler(talent_router.talent_stats, ctx().db, ctx().user)
    try:
        okr = run_handler(talent_router.okr_summary, ctx().db, ctx().user)
    except Exception:
        okr = {}
    try:
        tr_stats = run_handler(training_router.get_stats, ctx().db, ctx().user)
    except Exception:
        tr_stats = {}
    return {"talents": stats, "okrs": okr, "training": tr_stats, "links": [link("/app/talents", tr("Ouvrir Talents", "Open Talents", "فتح المواهب"))]}
