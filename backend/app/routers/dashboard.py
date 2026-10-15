"""Dashboard metrics router — /api/dashboard"""
from datetime import date
from fastapi import APIRouter, Depends, Query
from supabase import Client
from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.repositories import dashboard_repository
from app.services.dashboard_kpis import compute_kpis

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


@router.get("/kpis")
def get_kpis(
    days: int = Query(30, ge=1, le=366, description="Period for rate / accepted / refused / evolution"),
    supabase: Client = Depends(get_db),
    _current_user: dict = Depends(require_hr_or_admin),
):
    """HR KPIs for the dashboard (workforce, today, requests, documents, contracts, evolution)."""
    return compute_kpis(supabase, days)
