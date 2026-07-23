"""Asset repository — raw Supabase access for the assets table."""
from typing import Optional
from supabase import Client


def list_assets(supabase: Client, employee_id: Optional[str], category: Optional[str]):
    query = supabase.table("assets").select("*, employees(full_name, department)")
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if category:
        query = query.eq("category", category)
    return query.execute()


def create_asset(supabase: Client, payload: dict):
    return supabase.table("assets").insert(payload).execute()


def update_asset(supabase: Client, asset_id: str, payload: dict):
    return supabase.table("assets").update(payload).eq("id", asset_id).execute()


def delete_asset(supabase: Client, asset_id: str):
    return supabase.table("assets").delete().eq("id", asset_id).execute()
