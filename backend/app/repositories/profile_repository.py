"""Profile repository — raw Supabase access for the profiles table."""
from typing import Optional
from supabase import Client


def list_profiles(supabase: Client, type_: Optional[str], search: Optional[str], skip: int, limit: int):
    query = supabase.table("profiles").select("*")
    if type_:
        query = query.eq("type", type_)
    if search:
        query = query.or_(f"full_name.ilike.%{search}%,email.ilike.%{search}%,cin.ilike.%{search}%")
    return query.range(skip, skip + limit - 1).execute()


def get_profile(supabase: Client, profile_id: str):
    return supabase.table("profiles").select("*").eq("id", profile_id).execute()


def get_profile_by_user_id(supabase: Client, user_id: str):
    return supabase.table("profiles").select("*").eq("user_id", user_id).maybe_single().execute()


def update_profile_by_user_id(supabase: Client, user_id: str, payload: dict):
    return supabase.table("profiles").update(payload).eq("user_id", user_id).execute()


def create_profile(supabase: Client, data: dict):
    return supabase.table("profiles").insert(data).execute()


def update_profile(supabase: Client, profile_id: str, data: dict):
    return supabase.table("profiles").update(data).eq("id", profile_id).execute()


def delete_profile(supabase: Client, profile_id: str):
    return supabase.table("profiles").delete().eq("id", profile_id).execute()
