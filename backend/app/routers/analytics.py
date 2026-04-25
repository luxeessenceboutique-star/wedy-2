"""Analytics router — /api/analytics (real data from Supabase)"""
from datetime import datetime, date
from fastapi import APIRouter, Depends
from supabase import Client

from app.database import get_db
from app.dependencies import require_hr_or_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
def get_overview(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    # Total active employees
    emp_res = supabase.table("employees").select("id, contract_type, department, status, hire_date, gender", count="exact").execute()
    all_emp = emp_res.data or []

    active = [e for e in all_emp if e.get("status") == "active"]
    inactive = [e for e in all_emp if e.get("status") == "terminated"]

    # Contract type breakdown
    from collections import Counter
    contract_counts = Counter(e.get("contract_type", "Unknown") for e in active)

    # Department breakdown
    dept_counts = Counter(e.get("department") or "Unassigned" for e in active)

    # Expiring contracts (next 30 days)
    today = date.today()
    expiring = []
    for e in all_emp:
        ce = e.get("contract_end")
        if ce:
            try:
                d = date.fromisoformat(ce)
                days_left = (d - today).days
                if 0 < days_left <= 30:
                    expiring.append({"employee": e, "days_left": days_left})
            except Exception:
                pass

    # Documents generated this month
    this_month = datetime.now().strftime("%Y-%m")
    doc_res = supabase.table("generated_documents").select("id, created_at").execute()
    docs_this_month = sum(
        1 for d in (doc_res.data or [])
        if (d.get("created_at") or "").startswith(this_month)
    )

    # Pending leave requests
    lr_res = supabase.table("leave_requests").select("id", count="exact").eq("status", "pending").execute()
    pending_leaves = lr_res.count or 0

    # Pending HR requests
    hr_res = supabase.table("hr_requests").select("id", count="exact").eq("status", "pending").execute()
    pending_hr = hr_res.count or 0

    return {
        "total_employees": len(active),
        "total_terminated": len(inactive),
        "total_interns": sum(1 for e in all_emp if e.get("status") == "intern"),
        "on_leave": sum(1 for e in all_emp if e.get("status") == "on-leave"),
        "expiring_contracts": len(expiring),
        "expiring_list": expiring[:10],
        "contract_breakdown": dict(contract_counts),
        "department_breakdown": dict(dept_counts),
        "docs_this_month": docs_this_month,
        "pending_leaves": pending_leaves,
        "pending_requests": pending_hr,
    }


@router.get("/headcount-trend")
def headcount_trend(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Return monthly headcount for the past 12 months based on hire_date."""
    res = supabase.table("employees").select("hire_date, status").execute()
    employees = res.data or []

    from collections import defaultdict
    import calendar

    today = date.today()
    months = []
    for i in range(11, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    # Count employees hired up to each month-end
    monthly_counts = []
    for y, m in months:
        last_day = calendar.monthrange(y, m)[1]
        cutoff = date(y, m, last_day)
        count = sum(
            1 for e in employees
            if e.get("hire_date") and date.fromisoformat(e["hire_date"]) <= cutoff
            and e.get("status") not in ("terminated",)
        )
        monthly_counts.append({
            "label": f"{y}-{str(m).zfill(2)}",
            "month": m,
            "year": y,
            "count": count,
        })

    return {"trend": monthly_counts}


@router.get("/documents-trend")
def documents_trend(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Return monthly document generation count for the past 12 months."""
    res = supabase.table("generated_documents").select("created_at").execute()
    docs = res.data or []

    from collections import defaultdict
    import calendar

    today = date.today()
    months = []
    for i in range(11, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    monthly = []
    for y, m in months:
        prefix = f"{y}-{str(m).zfill(2)}"
        count = sum(1 for d in docs if (d.get("created_at") or "").startswith(prefix))
        monthly.append({"label": prefix, "month": m, "year": y, "count": count})

    return {"trend": monthly}


@router.get("/leave-stats")
def leave_stats(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Return leave request stats by type and status."""
    res = supabase.table("leave_requests").select("type, status, days").execute()
    leaves = res.data or []

    from collections import defaultdict
    by_type: dict = defaultdict(lambda: {"pending": 0, "approved": 0, "rejected": 0, "total_days": 0})
    for l in leaves:
        t = l.get("type", "unknown")
        s = l.get("status", "pending")
        by_type[t][s] = by_type[t].get(s, 0) + 1
        if s == "approved":
            by_type[t]["total_days"] += l.get("days", 0)

    return {"by_type": dict(by_type)}
