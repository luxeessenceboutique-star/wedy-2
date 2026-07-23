"""HR request repository — raw Supabase access for hr_requests."""
from typing import Optional
from supabase import Client


def list_requests(supabase: Client, profile_id: Optional[str], status: Optional[str]):
    query = supabase.table("hr_requests").select("*")
    if profile_id:
        query = query.eq("profile_id", profile_id)
    if status:
        query = query.eq("status", status)
    return query.order("created_at", desc=True).execute()


def create_request(supabase: Client, data: dict):
    return supabase.table("hr_requests").insert(data).execute()


def update_request_status(supabase: Client, request_id: str, status: str):
    return supabase.table("hr_requests").update({"status": status}).eq("id", request_id).execute()
