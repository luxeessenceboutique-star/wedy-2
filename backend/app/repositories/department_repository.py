"""Department repository — raw Supabase access for the departments table."""
from supabase import Client


def list_departments(supabase: Client):
    return supabase.table("departments").select("*").order("name").execute()


def create_department(supabase: Client, data: dict):
    return supabase.table("departments").insert(data).execute()


def update_department(supabase: Client, dept_id: str, data: dict):
    return supabase.table("departments").update(data).eq("id", dept_id).execute()


def delete_department(supabase: Client, dept_id: str):
    return supabase.table("departments").delete().eq("id", dept_id).execute()
