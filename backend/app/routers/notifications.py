from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user

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
    return {
        "id":       row.get("id"),
        "type":     t,
        "title":    row.get("title", ""),
        "body":     row.get("body") or row.get("message", ""),
        "time":     row.get("created_at", ""),
        "unread":   not row.get("read", False),
        "color":    TYPE_COLORS.get(t, "#6b7280"),
        "link":     row.get("link"),
        "priority": 1 if not row.get("read") else 0,
    }


@router.get("")
def list_notifications(
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows = res.data or []
    formatted = [_format(r) for r in rows]
    unread_count = sum(1 for n in formatted if n["unread"])
    return {"data": formatted, "unread_count": unread_count, "count": len(formatted)}


@router.post("/mark-all-read")
def mark_all_read(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = (
        supabase.table("notifications")
        .update({"read": True})
        .eq("user_id", current_user["id"])
        .eq("read", False)
        .execute()
    )
    return {"status": "success", "count": len(res.data or [])}


@router.patch("/{notif_id}/read")
def mark_as_read(
    notif_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = (
        supabase.table("notifications")
        .update({"read": True})
        .eq("id", notif_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _format(res.data[0])


@router.delete("/{notif_id}")
def delete_notification(
    notif_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    supabase.table("notifications").delete().eq("id", notif_id).eq("user_id", current_user["id"]).execute()
    return {"status": "deleted"}
