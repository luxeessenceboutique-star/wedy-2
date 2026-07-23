"""Template repository — raw Supabase access for document_templates."""
from typing import Optional
from supabase import Client


def list_templates(supabase: Client, active_only: bool, category: Optional[str]):
    query = supabase.table("document_templates").select("*").order("name_fr")
    if active_only:
        query = query.eq("is_active", True)
    if category:
        query = query.eq("category", category)
    return query.execute()


def create_template(supabase: Client, data: dict):
    return supabase.table("document_templates").insert(data).execute()


def list_template_codes(supabase: Client):
    return supabase.table("document_templates").select("code").execute()


def get_template(supabase: Client, template_id: str):
    return supabase.table("document_templates").select("*").eq("id", template_id).single().execute()


def update_template(supabase: Client, template_id: str, data: dict):
    return supabase.table("document_templates").update(data).eq("id", template_id).execute()


def delete_template(supabase: Client, template_id: str):
    return supabase.table("document_templates").delete().eq("id", template_id).execute()
