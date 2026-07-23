"""Audit log repository — raw Supabase access for the audit_logs table."""
from typing import Optional
from supabase import Client


def list_audit_logs(
    supabase: Client,
    user_id: Optional[str],
    action: Optional[str],
    entity: Optional[str],
    skip: int,
    limit: int,
):
    query = supabase.table("audit_logs").select("*, profiles(full_name)")
    if user_id:
        query = query.eq("user_id", user_id)
    if action:
        query = query.eq("action", action)
    if entity:
        query = query.eq("entity", entity)
    res = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()

    count_query = supabase.table("audit_logs").select("id", count="exact")
    if user_id:
        count_query = count_query.eq("user_id", user_id)
    if action:
        count_query = count_query.eq("action", action)
    if entity:
        count_query = count_query.eq("entity", entity)
    count_res = count_query.execute()

    return res, count_res
