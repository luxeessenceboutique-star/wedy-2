"""Employee portal repository — raw Supabase access for the self-service portal."""
from supabase import Client


def find_employee_by_email(supabase: Client, email: str):
    return supabase.table("employees").select("*").eq("email", email).limit(1).execute()


def list_leaves_for_stats(supabase: Client, employee_id: str):
    return supabase.table("leave_requests").select("status").eq("employee_id", employee_id).execute()


def list_trainings_for_stats(supabase: Client, employee_id: str):
    return supabase.table("employee_trainings").select("status").eq("employee_id", employee_id).execute()


def list_document_requests_for_stats(supabase: Client, employee_id: str):
    return supabase.table("document_requests").select("status").eq("employee_id", employee_id).execute()


def list_my_leaves(supabase: Client, employee_id: str):
    return (
        supabase.table("leave_requests")
        .select("*")
        .eq("employee_id", employee_id)
        .order("created_at", desc=True)
        .execute()
    )


def create_leave(supabase: Client, payload: dict):
    return supabase.table("leave_requests").insert(payload).execute()


def list_my_document_requests(supabase: Client, employee_id: str):
    return (
        supabase.table("document_requests")
        .select("*")
        .eq("employee_id", employee_id)
        .order("created_at", desc=True)
        .execute()
    )


def create_document_request(supabase: Client, payload: dict):
    return supabase.table("document_requests").insert(payload).execute()


def list_my_training(supabase: Client, employee_id: str):
    return (
        supabase.table("employee_trainings")
        .select("*, training_catalog(id,title,category,duration_hours,provider,description)")
        .eq("employee_id", employee_id)
        .order("assigned_at", desc=True)
        .execute()
    )


def list_my_okrs(supabase: Client, employee_id: str):
    return (
        supabase.table("employee_okrs")
        .select("*")
        .eq("employee_id", employee_id)
        .neq("status", "cancelled")
        .order("created_at", desc=True)
        .execute()
    )
