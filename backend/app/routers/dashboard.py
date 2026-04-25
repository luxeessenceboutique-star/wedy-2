"""Dashboard metrics router — /api/dashboard"""
from datetime import date
from fastapi import APIRouter, Depends
from supabase import Client
from app.database import get_db
from app.dependencies import require_hr_or_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics")
def get_metrics(
    supabase: Client = Depends(get_db),
    _current_user: dict = Depends(require_hr_or_admin),
):
    # Active employees
    emp_res = supabase.table("employees").select("id", count="exact").eq("status", "active").execute()
    total_employees = emp_res.count or 0

    # Interns
    intern_res = supabase.table("employees").select("id", count="exact").eq("status", "intern").execute()
    total_interns = intern_res.count or 0

    # Pending HR requests (table may not exist yet if v2 schema not applied)
    try:
        req_res = supabase.table("hr_requests").select("id", count="exact").eq("status", "pending").execute()
        pending_requests = req_res.count or 0
    except Exception:
        pending_requests = 0

    # Pending leave requests
    try:
        lr_res = supabase.table("leave_requests").select("id", count="exact").eq("status", "pending").execute()
        pending_leaves = lr_res.count or 0
    except Exception:
        pending_leaves = 0

    # Expiring contracts (next 30 days)
    today = date.today()
    try:
        all_emp = supabase.table("employees").select("contract_end").neq("contract_end", None).execute().data or []
        expiring = sum(
            1 for e in all_emp
            if e.get("contract_end")
            and 0 < (date.fromisoformat(e["contract_end"]) - today).days <= 30
        )
    except Exception:
        expiring = 0

    # Documents generated this month
    try:
        this_month = date.today().strftime("%Y-%m")
        docs_res = supabase.table("generated_documents").select("id", count="exact").like("created_at", f"{this_month}%").execute()
        docs_this_month = docs_res.count or 0
    except Exception:
        docs_this_month = 0

    return {
        "total_employees": total_employees,
        "total_interns": total_interns,
        "pending_requests": pending_requests,
        "pending_leaves": pending_leaves,
        "expiring_contracts": expiring,
        "docs_this_month": docs_this_month,
        "active_users": 0,
    }
