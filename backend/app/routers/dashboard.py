"""Dashboard metrics router — (Supabase SDK Version)"""
from fastapi import APIRouter, Depends
from supabase import Client
from app.database import get_db
from app.dependencies import require_hr_or_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metrics")
def get_metrics(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin)
):
    # Note: Supabase SDK doesn't have aggregate 'count' easily in one line without fetching data
    # but we can use the 'count' parameter in select
    
    emp_res = supabase.table("employees").select("id", count="exact").execute()
    total_employees = emp_res.count if emp_res.count is not None else 0
    
    intern_res = supabase.table("interns").select("id", count="exact").execute()
    total_interns = intern_res.count if intern_res.count is not None else 0
    
    req_res = supabase.table("hr_requests").select("id", count="exact").eq("status", "pending").execute()
    pending_requests = req_res.count if req_res.count is not None else 0
    
    return {
        "total_employees": total_employees,
        "total_interns": total_interns,
        "pending_requests": pending_requests,
        "active_users": 0 # requires more logic
    }
