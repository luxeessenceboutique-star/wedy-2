from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user
from app.repositories import notification_repository
from app.services import app_settings

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


# Categories a user can mute (in-app channel). Types not listed belong to "other" and are always shown.
CATEGORY = {
    "leave_pending": "request", "document_request": "request", "employee_request": "request",
    "contract_expiring": "contract", "cdd_risk": "contract",
    "new_employee": "recruit", "candidate": "recruit",
    "payroll": "payroll", "security": "security",
    "document_generated": "ai",
}
PREF_KEYS = ("request", "contract", "recruit", "payroll", "security", "ai")


def _prefs_key(user_id: str) -> str:
    return f"notif:{user_id}"


def _load_prefs(supabase: Client, user_id: str) -> dict:
    prefs = {k: True for k in PREF_KEYS}
    try:
        rows = supabase.table("app_settings").select("value").eq("key", _prefs_key(user_id)).limit(1).execute().data or []
        if rows and isinstance(rows[0].get("value"), dict):
            prefs.update({k: bool(v) for k, v in rows[0]["value"].items() if k in PREF_KEYS})
    except Exception:
        pass  # table not created yet: everything on
    return prefs


class PrefsIn(BaseModel):
    prefs: dict[str, bool]


@router.get("/preferences")
def get_preferences(supabase: Client = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return {"prefs": _load_prefs(supabase, current_user["id"])}


@router.put("/preferences")
def put_preferences(body: PrefsIn, supabase: Client = Depends(get_db), current_user: dict = Depends(get_current_user)):
    prefs = {**_load_prefs(supabase, current_user["id"]), **{k: bool(v) for k, v in body.prefs.items() if k in PREF_KEYS}}
    try:
        supabase.table("app_settings").upsert({"key": _prefs_key(current_user["id"]), "value": prefs, "updated_by": current_user["id"],
                                               "updated_at": datetime.utcnow().isoformat()}).execute()
    except Exception as e:
        if app_settings.missing_table(e):
            raise HTTPException(status_code=503, detail="settings_table_missing")
        raise HTTPException(status_code=400, detail=str(e))
    return {"prefs": prefs}


@router.get("")
def list_notifications(
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = notification_repository.list_for_user(supabase, current_user["id"], limit)
    prefs = _load_prefs(supabase, current_user["id"])
    rows = [r for r in (res.data or []) if prefs.get(CATEGORY.get(r.get("type", ""), ""), True)]
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


@router.delete("/read")
def delete_read_notifications(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Clear the notifications the user has already read (unread ones are kept)."""
    return {"status": "deleted", "count": notification_repository.delete_read(supabase, current_user["id"])}


@router.delete("/{notif_id}")
def delete_notification(
    notif_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = notification_repository.delete_notification(supabase, notif_id, current_user["id"])  # only the user's own: someone else's id deletes nothing
    return {"status": "deleted", "count": len(res.data or [])}
