"""Talent repository — raw Supabase access for talent_profiles/employee_okrs/pdi_items."""
from supabase import Client


def list_talent_stats(supabase: Client):
    return supabase.table("talent_profiles").select(
        "talent_category,flight_risk,performance_score,potential_score,is_critical_position"
    ).execute()


def list_mobility_candidates(supabase: Client):
    return (
        supabase.table("talent_profiles")
        .select("*, employees(id,full_name,email,position,department,photo_url,hire_date)")
        .not_.is_("next_role", "null")
        .order("updated_at", desc=True)
        .execute()
    )


def list_active_employee_ids(supabase: Client):
    return supabase.table("employees").select("id").eq("status", "active").execute()


def list_talent_profile_employee_ids(supabase: Client):
    return supabase.table("talent_profiles").select("employee_id").execute()


def bulk_insert_talent_profiles(supabase: Client, records: list):
    return supabase.table("talent_profiles").insert(records).execute()


def list_talents(supabase: Client):
    return (
        supabase.table("talent_profiles")
        .select("*, employees(id,full_name,email,position,department,photo_url)")
        .order("created_at", desc=True)
        .execute()
    )


def get_talent_profile(supabase: Client, employee_id: str):
    return supabase.table("talent_profiles").select("*").eq("employee_id", employee_id).limit(1).execute()


def create_talent_profile(supabase: Client, record: dict):
    return supabase.table("talent_profiles").insert(record).execute()


def get_talent_profile_id(supabase: Client, employee_id: str):
    return supabase.table("talent_profiles").select("id").eq("employee_id", employee_id).limit(1).execute()


def update_talent_profile(supabase: Client, employee_id: str, payload: dict):
    return supabase.table("talent_profiles").update(payload).eq("employee_id", employee_id).execute()


def list_okrs(supabase: Client, employee_id: str):
    return (
        supabase.table("employee_okrs")
        .select("*")
        .eq("employee_id", employee_id)
        .neq("status", "cancelled")
        .order("created_at", desc=True)
        .execute()
    )


def create_okr(supabase: Client, payload: dict):
    return supabase.table("employee_okrs").insert(payload).execute()


def update_okr(supabase: Client, okr_id: str, payload: dict):
    return supabase.table("employee_okrs").update(payload).eq("id", okr_id).execute()


def cancel_okr(supabase: Client, okr_id: str):
    return supabase.table("employee_okrs").update({"status": "cancelled"}).eq("id", okr_id).execute()


def list_pdi(supabase: Client, employee_id: str):
    return (
        supabase.table("pdi_items")
        .select("*")
        .eq("employee_id", employee_id)
        .order("created_at", desc=True)
        .execute()
    )


def create_pdi(supabase: Client, payload: dict):
    return supabase.table("pdi_items").insert(payload).execute()


def update_pdi(supabase: Client, item_id: str, payload: dict):
    return supabase.table("pdi_items").update(payload).eq("id", item_id).execute()


def delete_pdi(supabase: Client, item_id: str):
    return supabase.table("pdi_items").delete().eq("id", item_id).execute()
