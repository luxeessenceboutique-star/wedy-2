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


def create_notification(
    supabase: Client,
    user_id: str,
    message: str,
    title: str = "",
    notif_type: str = "info",
    link: str = None,
):
    """Insert a single notification for one user."""
    try:
        record = {
            "user_id": user_id,
            "message": message,   # legacy column — always populated
            "body": message,      # new column — same value
            "title": title or message[:60],
            "type": notif_type,
            "read": False,
        }
        if link:
            record["link"] = link
        supabase.table("notifications").insert(record).execute()
    except Exception as e:
        print(f"[audit] create_notification failed for user {user_id}: {e}")


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

    records = []
    for u in hr_users:
        record = {
            "user_id": u["user_id"],
            "type": notif_type,
            "title": title,
            "body": body,
            "message": body,   # legacy column
            "read": False,
        }
        if link:
            record["link"] = link
        records.append(record)

    try:
        supabase.table("notifications").insert(records).execute()
        print(f"[notify_hr] inserted {len(records)} notification(s): {title!r}")
        return len(records)
    except Exception as e:
        print(f"[notify_hr] insert failed: {e}")
        return 0
