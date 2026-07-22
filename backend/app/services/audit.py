"""Audit logging and notifications — adapted for Supabase SDK"""
from typing import Optional, List
from supabase import Client


def log_action(
    supabase: Client,
    user_id: str,
    action: str,
    entity: str,
    entity_id: Optional[str] = None
):
    try:
        supabase.table("audit_logs").insert({
            "user_id": user_id,
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
        }).execute()
    except Exception as e:
        print(f"[audit] log_action failed: {e}")


def _safe_insert_notif(supabase: Client, record: dict) -> bool:
    """
    Try inserting a notification with progressively simpler schemas.
    Handles tables with different column names (read vs is_read, body vs message, etc.)
    Returns True if any attempt succeeded.
    """
    # Attempt 1 — full schema (body, title, type, read, link)
    try:
        supabase.table("notifications").insert(record).execute()
        return True
    except Exception as e1:
        print(f"[notif] full insert failed ({e1}), trying fallbacks…")

    # Attempt 2 — swap "read" → "is_read" in case that's the column name
    try:
        r2 = {k: v for k, v in record.items() if k != "read"}
        r2["is_read"] = record.get("read", False)
        supabase.table("notifications").insert(r2).execute()
        return True
    except Exception:
        pass

    # Attempt 3 — drop optional columns, keep user_id + message only
    try:
        minimal = {
            "user_id": record["user_id"],
            "message": record.get("body") or record.get("message", ""),
        }
        if "link" in record and record["link"]:
            minimal["link"] = record["link"]
        supabase.table("notifications").insert(minimal).execute()
        return True
    except Exception as e3:
        print(f"[notif] all insert attempts failed: {e3}")
        return False


def create_notification(
    supabase: Client,
    user_id: str,
    message: str,
    title: str = "",
    notif_type: str = "info",
    link: str = None,
):
    """Insert a single notification for one user — resilient to schema differences."""
    record = {
        "user_id": user_id,
        "message": message,
        "body":    message,
        "title":   title or message[:60],
        "type":    notif_type,
        "read":    False,
    }
    if link:
        record["link"] = link
    _safe_insert_notif(supabase, record)


def notify_hr(
    supabase: Client,
    title: str,
    body: str,
    notif_type: str = "employee_request",
    link: str = None,
) -> int:
    """
    Insert a notification row for every HR / admin user.
    Returns the number of notifications inserted.
    """
    try:
        hr_res = (
            supabase.table("user_roles")
            .select("user_id")
            .in_("role", ["hr", "admin", "rh"])
            .execute()
        )
        hr_users: List[dict] = hr_res.data or []
    except Exception as e:
        print(f"[notify_hr] could not fetch HR users: {e}")
        return 0

    if not hr_users:
        print("[notify_hr] WARNING — no HR/admin users found in user_roles table")
        return 0

    inserted = 0
    for u in hr_users:
        record = {
            "user_id": u["user_id"],
            "type":    notif_type,
            "title":   title,
            "body":    body,
            "message": body,
            "read":    False,
        }
        if link:
            record["link"] = link
        if _safe_insert_notif(supabase, record):
            inserted += 1

    print(f"[notify_hr] inserted {inserted}/{len(hr_users)} notification(s): {title!r}")
    return inserted
