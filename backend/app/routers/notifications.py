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
@router.patch("/read-all")
def mark_all_read(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    uid = current_user["id"]
    count = 0
    # Try "read" column first, then "is_read"
    for col in ("read", "is_read"):
        try:
            res = (
                supabase.table("notifications")
                .update({col: True})
                .eq("user_id", uid)
                .eq(col, False)
                .execute()
            )
            count = len(res.data or [])
            break
        except Exception:
            continue
    return {"status": "success", "count": count}


@router.patch("/{notif_id}/read")
def mark_as_read(
    notif_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    uid = current_user["id"]
    for col in ("read", "is_read"):
        try:
            res = (
                supabase.table("notifications")
                .update({col: True})
                .eq("id", notif_id)
                .eq("user_id", uid)
                .execute()
            )
            if res.data:
                return _format(res.data[0])
        except Exception:
            continue
    raise HTTPException(status_code=404, detail="Notification not found")


@router.delete("/{notif_id}")
def delete_notification(
    notif_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    supabase.table("notifications").delete().eq("id", notif_id).eq("user_id", current_user["id"]).execute()
    return {"status": "deleted"}
