"""Document repository — raw Supabase access for documents/generated_documents."""
from typing import Optional
from supabase import Client


def list_generated_documents(supabase: Client, employee_id: Optional[str], profile_id: Optional[str], skip: int, limit: int):
    query = supabase.table("generated_documents").select("*").order("created_at", desc=True)
    if employee_id:
        query = query.eq("employee_id", employee_id)
    elif profile_id:
        query = query.eq("profile_id", profile_id)
    return query.range(skip, skip + limit - 1).execute()


def get_employees_by_ids(supabase: Client, employee_ids: list):
    return supabase.table("employees").select("id, full_name, cin, department").in_("id", employee_ids).execute()


def create_document(supabase: Client, data: dict):
    return supabase.table("documents").insert(data).execute()


def get_document(supabase: Client, doc_id: str):
    return supabase.table("documents").select("*").eq("id", doc_id).execute()


def delete_document(supabase: Client, doc_id: str):
    return supabase.table("documents").delete().eq("id", doc_id).execute()


def list_generated_by_profile(supabase: Client, profile_id: Optional[str], skip: int, limit: int):
    query = supabase.table("generated_documents").select("*")
    if profile_id:
        query = query.eq("profile_id", profile_id)
    return query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
