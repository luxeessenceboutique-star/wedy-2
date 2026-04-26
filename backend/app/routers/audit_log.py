"""Audit log router — /api/audit-logs"""
from typing import Optional
from fastapi import APIRouter, Depends
from supabase import Client

from app.database import get_db
from app.dependencies import require_hr_or_admin

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
    query = (
        supabase.table("audit_logs")
        .select("*, profiles(full_name)")
    )
    if user_id:
        query = query.eq("user_id", user_id)
    if action:
        query = query.eq("action", action)
    if entity:
        query = query.eq("entity", entity)

    res = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()

    cq = supabase.table("audit_logs").select("id", count="exact")
    if user_id:
        cq = cq.eq("user_id", user_id)
    if action:
        cq = cq.eq("action", action)
    if entity:
        cq = cq.eq("entity", entity)
    count_res = cq.execute()

    return {"data": res.data, "count": count_res.count or 0}
