"""Dashboard metrics router — /api/dashboard"""
from datetime import date
from fastapi import APIRouter, Depends
from supabase import Client
from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.repositories import dashboard_repository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics")
def get_metrics(
    supabase: Client = Depends(get_db),
    _current_user: dict = Depends(require_hr_or_admin),
):
    total_employees = dashboard_repository.count_active_employees(supabase)
    total_interns = dashboard_repository.count_interns(supabase)
    pending_requests = dashboard_repository.count_pending_hr_requests(supabase)
    pending_leaves = dashboard_repository.count_pending_leave_requests(supabase)

    # Expiring contracts (next 30 days)
    expiring = dashboard_repository.count_expiring_contracts(supabase, date.today())

    # Documents generated this month
    this_month = date.today().strftime("%Y-%m")
    docs_this_month = dashboard_repository.count_documents_generated_in(supabase, this_month)

    return {
        "total_employees": total_employees,
        "total_interns": total_interns,
        "pending_requests": pending_requests,
        "pending_leaves": pending_leaves,
        "expiring_contracts": expiring,
        "docs_this_month": docs_this_month,
        "active_users": 0,
    }
