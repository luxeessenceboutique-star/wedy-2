"""Analytics router — /api/analytics (real data from Supabase)"""
from datetime import datetime, date
from fastapi import APIRouter, Depends
from supabase import Client

from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.repositories import analytics_repository

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
def get_overview(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        # Total active employees
        emp_res = analytics_repository.list_employees_for_overview(supabase)
        all_emp = emp_res.data or []
    except Exception as e:
        print(f"Error fetching employees for analytics: {e}")
        all_emp = []

    active = [e for e in all_emp if e.get("status") == "active"]
    inactive = [e for e in all_emp if e.get("status") == "terminated"]

    # Contract type breakdown
    from collections import Counter
    contract_counts = Counter(e.get("contract_type", "Inconnu") for e in active)

    # Department breakdown
    dept_counts = Counter(e.get("department") or "Non assign" for e in active)

    # Expiring contracts (next 30 days)
    today = date.today()
    expiring = []
    for e in all_emp:
        ce = e.get("contract_end")
        if ce:
            try:
                # Handle possible string formats
                d = date.fromisoformat(ce[:10]) if isinstance(ce, str) else ce
                days_left = (d - today).days
                if 0 < days_left <= 30:
                    expiring.append({"employee": e, "days_left": days_left})
            except Exception:
                pass

    # Documents generated this month
    docs_this_month = 0
    try:
        this_month = datetime.now().strftime("%Y-%m")
        doc_res = analytics_repository.list_generated_documents_meta(supabase)
        docs_this_month = sum(
            1 for d in (doc_res.data or [])
            if (d.get("created_at") or "").startswith(this_month)
        )
    except Exception as e:
        print(f"Error fetching documents for analytics: {e}")

    # Pending leave requests
    pending_leaves = 0
    try:
        lr_res = analytics_repository.count_pending_leave_requests(supabase)
        pending_leaves = lr_res.count or 0
    except Exception as e:
        print(f"Error fetching leaves for analytics: {e}")

    # Pending HR requests
    pending_hr = 0
    try:
        hr_res = analytics_repository.count_pending_hr_requests(supabase)
        pending_hr = hr_res.count or 0
    except Exception as e:
        print(f"Error fetching hr_requests for analytics: {e}")

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
    try:
        res = analytics_repository.list_employees_hire_status(supabase)
        employees = res.data or []
    except Exception as e:
        print(f"Error fetching headcount trend: {e}")
        return {"trend": []}

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

    monthly_counts = []
    for y, m in months:
        last_day = calendar.monthrange(y, m)[1]
        cutoff = date(y, m, last_day)
        count = 0
        for e in employees:
            hd = e.get("hire_date")
            if hd:
                try:
                    hdate = date.fromisoformat(hd[:10])
                    if hdate <= cutoff and e.get("status") not in ("terminated",):
                        count += 1
                except:
                    pass
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
    try:
        res = analytics_repository.list_generated_documents_dates(supabase)
        docs = res.data or []
    except Exception as e:
        print(f"Error fetching documents trend: {e}")
        return {"trend": []}

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
    try:
        res = analytics_repository.list_leave_requests_stats(supabase)
        leaves = res.data or []
    except Exception as e:
        print(f"Error fetching leave stats: {e}")
        return {"by_type": {}}

    from collections import defaultdict
    by_type: dict = defaultdict(lambda: {"pending": 0, "approved": 0, "rejected": 0, "total_days": 0})
    for l in leaves:
        t = l.get("type", "unknown")
        s = l.get("status", "pending")
        by_type[t][s] = by_type[t].get(s, 0) + 1
        if s == "approved":
            by_type[t]["total_days"] += l.get("days", 0)

    return {"by_type": dict(by_type)}
