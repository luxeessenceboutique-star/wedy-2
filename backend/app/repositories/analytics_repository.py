"""Analytics repository — raw Supabase access feeding analytics aggregations."""
from supabase import Client


def list_employees_for_overview(supabase: Client):
    return supabase.table("employees").select(
        "id, full_name, position, contract_type, department, status, hire_date, contract_end"
    ).neq("status", "candidate").execute()


def list_generated_documents_meta(supabase: Client):
    return supabase.table("generated_documents").select("id, created_at").execute()


def count_pending_leave_requests(supabase: Client):
    return supabase.table("leave_requests").select("id", count="exact").eq("status", "pending").execute()


def count_pending_hr_requests(supabase: Client):
    return supabase.table("hr_requests").select("id", count="exact").eq("status", "pending").execute()


def list_employees_hire_status(supabase: Client):
    return supabase.table("employees").select("hire_date, status").neq("status", "candidate").execute()


def list_generated_documents_dates(supabase: Client):
    return supabase.table("generated_documents").select("created_at").execute()


def list_leave_requests_stats(supabase: Client):
    return supabase.table("leave_requests").select("type, status, days").execute()
