"""Copilot repository — raw Supabase access used to build AI context."""
from supabase import Client


def list_employees_full_context(supabase: Client):
    return supabase.table("employees").select(
        "id,full_name,position,department,status,contract_type,contract_end,hire_date,salary"
    ).neq("status", "candidate").execute()


def list_leave_requests_context(supabase: Client):
    return supabase.table("leave_requests").select(
        "employee_id,type,start_date,end_date,days,status"
    ).execute()


def list_recent_payroll(supabase: Client):
    return (
        supabase.table("payroll_records")
        .select("employee_id,month,year,net_salary,status")
        .order("year", desc=True)
        .order("month", desc=True)
        .limit(20)
        .execute()
    )


def list_active_templates(supabase: Client):
    return supabase.table("document_templates").select("name_fr,category").eq("is_active", True).execute()


def get_employee(supabase: Client, employee_id: str):
    return supabase.table("employees").select("*").eq("id", employee_id).maybe_single().execute()


def list_employee_generated_documents(supabase: Client, employee_id: str):
    return supabase.table("generated_documents").select("document_type,created_at").eq("employee_id", employee_id).execute()


def list_employee_leave_requests(supabase: Client, employee_id: str):
    return supabase.table("leave_requests").select("type,days,status,start_date").eq("employee_id", employee_id).execute()
