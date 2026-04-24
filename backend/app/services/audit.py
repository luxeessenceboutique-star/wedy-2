"""Audit logging and notifications — adapted for Supabase SDK"""
from typing import Optional
from uuid import UUID
from supabase import Client

def log_action(
    supabase: Client,
    user_id: str,
    action: str,
    entity: str,
    entity_id: Optional[str] = None
):
    """Log an action in the audit_logs table."""
    try:
        supabase.table("audit_logs").insert({
            "user_id": user_id,
            "action": action,
            "entity": entity,
            "entity_id": entity_id
        }).execute()
    except Exception as e:
        print(f"Failed to log action: {e}")

def create_notification(
    supabase: Client,
    user_id: str,
    message: str
):
    """Create a notification in the notifications table."""
    try:
        supabase.table("notifications").insert({
            "user_id": user_id,
            "message": message
        }).execute()
    except Exception as e:
        print(f"Failed to create notification: {e}")
