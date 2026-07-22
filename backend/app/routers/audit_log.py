"""Audit log router — /api/audit-logs"""
from typing import Optional
from fastapi import APIRouter, Depends
from supabase import Client

from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.repositories import audit_log_repository

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
    res, count_res = audit_log_repository.list_audit_logs(
        supabase, user_id, action, entity, skip, limit
    )
    return {"data": res.data, "count": count_res.count or 0}
