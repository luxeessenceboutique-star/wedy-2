"""Generated-document repository — raw Supabase access used by the /documents/generate flow."""
from supabase import Client


def get_template(supabase: Client, template_id: str):
    return supabase.table("document_templates").select("*").eq("id", template_id).maybe_single().execute()


def get_employee(supabase: Client, employee_id: str):
    return supabase.table("employees").select("*").eq("id", employee_id).maybe_single().execute()


def create_generated_document(supabase: Client, doc_data: dict):
    return supabase.table("generated_documents").insert(doc_data).execute()


def create_employee_file(supabase: Client, record: dict):
    return supabase.table("employee_files").insert(record).execute()


def get_generated_document_with_employee(supabase: Client, doc_id: str):
    return (
        supabase.table("generated_documents")
        .select("*, employees(full_name)")
        .eq("id", doc_id)
        .maybe_single()
        .execute()
    )


def get_generated_document(supabase: Client, doc_id: str):
    return supabase.table("generated_documents").select("*").eq("id", doc_id).maybe_single().execute()
