"""Employee onboarding repository — raw Supabase access for employee_onboarding/pulse_surveys."""
from supabase import Client


def safe_get_by_employee(table: str, supabase: Client, employee_id: str):
    try:
        res = supabase.table(table).select("*").eq("employee_id", employee_id).limit(1).execute()
        return res.data or []
    except Exception:
        return []


def list_onboarding(supabase: Client):
    return (
        supabase.table("employee_onboarding")
        .select("*, employees(id,full_name,email,position,department,photo_url,hire_date)")
        .order("created_at", desc=True)
        .execute()
    )


def create_onboarding(supabase: Client, record: dict):
    return supabase.table("employee_onboarding").insert(record).execute()


def update_onboarding(supabase: Client, employee_id: str, payload: dict):
    return supabase.table("employee_onboarding").update(payload).eq("employee_id", employee_id).execute()


def list_pulse_surveys(supabase: Client, employee_id: str):
    return (
        supabase.table("pulse_surveys")
        .select("*")
        .eq("employee_id", employee_id)
        .order("created_at", desc=True)
        .execute()
    )


def create_pulse_survey(supabase: Client, payload: dict):
    return supabase.table("pulse_surveys").insert(payload).execute()


def delete_pulse_survey(supabase: Client, pulse_id: str):
    return supabase.table("pulse_surveys").delete().eq("id", pulse_id).execute()
