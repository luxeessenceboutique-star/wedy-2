"""Notification repository — raw Supabase access, resilient to read/is_read column naming."""
from supabase import Client


def list_for_user(supabase: Client, user_id: str, limit: int):
    return (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )


def mark_all_read(supabase: Client, user_id: str) -> int:
    """Try the 'read' column first, then 'is_read' — schemas differ across environments."""
    for col in ("read", "is_read"):
        try:
            res = (
                supabase.table("notifications")
                .update({col: True})
                .eq("user_id", user_id)
                .eq(col, False)
                .execute()
            )
            return len(res.data or [])
        except Exception:
            continue
    return 0


def mark_one_read(supabase: Client, notif_id: str, user_id: str):
    """Try the 'read' column first, then 'is_read'. Returns the updated row or None."""
    for col in ("read", "is_read"):
        try:
            res = (
                supabase.table("notifications")
                .update({col: True})
                .eq("id", notif_id)
                .eq("user_id", user_id)
                .execute()
            )
            if res.data:
                return res.data[0]
        except Exception:
            continue
    return None


def delete_notification(supabase: Client, notif_id: str, user_id: str):
    return supabase.table("notifications").delete().eq("id", notif_id).eq("user_id", user_id).execute()
