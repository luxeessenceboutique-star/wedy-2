from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user
from app.repositories import notification_repository

router = APIRouter(prefix="/notifications", tags=["Notifications"])

TYPE_COLORS = {
    "leave_pending":      "#f59e0b",
    "document_request":   "#3b82f6",
    "employee_request":   "#8b5cf6",
    "contract_expiring":  "#ef4444",
    "cdd_risk":           "#ef4444",
    "document_generated": "#10b981",
    "new_employee":       "#06b6d4",
    "info":               "#6b7280",
    "warning":            "#f59e0b",
    "success":            "#10b981",
    "error":              "#ef4444",
}

def _format(row: dict) -> dict:
    t = row.get("type", "info")
    # Support both "read" and "is_read" column names
    is_read = row.get("read") or row.get("is_read") or False
    return {
        "id":       row.get("id"),
        "type":     t,
        "title":    row.get("title") or row.get("message", "")[:60],
        "body":     row.get("body") or row.get("message", ""),
        "message":  row.get("body") or row.get("message", ""),
        "time":     row.get("created_at", ""),
        "unread":   not is_read,
        "is_read":  is_read,
        "color":    TYPE_COLORS.get(t, "#6b7280"),
        "link":     row.get("link"),
        "priority": 1 if not is_read else 0,
    }


@router.get("")
def list_notifications(
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = notification_repository.list_for_user(supabase, current_user["id"], limit)
    rows = res.data or []
    formatted = [_format(r) for r in rows]
    unread_count = sum(1 for n in formatted if n["unread"])
    return {"data": formatted, "unread_count": unread_count, "count": len(formatted)}


@router.post("/mark-all-read")
@router.patch("/read-all")
def mark_all_read(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    count = notification_repository.mark_all_read(supabase, current_user["id"])
    return {"status": "success", "count": count}


@router.patch("/{notif_id}/read")
def mark_as_read(
    notif_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    row = notification_repository.mark_one_read(supabase, notif_id, current_user["id"])
    if row:
        return _format(row)
    raise HTTPException(status_code=404, detail="Notification not found")


@router.delete("/{notif_id}")
def delete_notification(
    notif_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    notification_repository.delete_notification(supabase, notif_id, current_user["id"])
    return {"status": "deleted"}
