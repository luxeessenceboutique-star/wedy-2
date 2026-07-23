"""Performance repository — raw Supabase access for performance_reviews."""
from typing import Optional
from supabase import Client


def list_reviews(supabase: Client, employee_id: Optional[str], period: Optional[str], skip: int, limit: int):
    query = supabase.table("performance_reviews").select("*, employees(full_name, position, department)", count="exact")
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if period:
        query = query.eq("period", period)
    return query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()


def create_review(supabase: Client, payload: dict):
    return supabase.table("performance_reviews").insert(payload).execute()


def update_review(supabase: Client, review_id: str, payload: dict):
    return supabase.table("performance_reviews").update(payload).eq("id", review_id).execute()


def get_review_id(supabase: Client, review_id: str):
    return supabase.table("performance_reviews").select("id").eq("id", review_id).maybe_single().execute()


def delete_review(supabase: Client, review_id: str):
    return supabase.table("performance_reviews").delete().eq("id", review_id).execute()
