"""Intern repository — raw Supabase access (interns live in employees + intern_* tables)."""
from supabase import Client


def list_interns(supabase: Client, skip: int, limit: int):
    return (
        supabase.table("employees")
        .select("*", count="exact")
        .eq("status", "intern")
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )


def get_intern(supabase: Client, intern_id: str):
    return supabase.table("employees").select("*").eq("id", intern_id).eq("status", "intern").maybe_single().execute()


def create_intern(supabase: Client, payload: dict):
    return supabase.table("employees").insert(payload).execute()


def update_intern(supabase: Client, intern_id: str, payload: dict):
    return supabase.table("employees").update(payload).eq("id", intern_id).execute()


def delete_intern(supabase: Client, intern_id: str):
    return supabase.table("employees").delete().eq("id", intern_id).execute()


def get_onboarding(supabase: Client, intern_id: str):
    return supabase.table("intern_onboarding").select("*").eq("intern_id", intern_id).limit(1).execute()


def onboarding_exists(supabase: Client, intern_id: str):
    return supabase.table("intern_onboarding").select("id").eq("intern_id", intern_id).limit(1).execute()


def create_onboarding(supabase: Client, record: dict):
    return supabase.table("intern_onboarding").insert(record).execute()


def update_onboarding(supabase: Client, intern_id: str, payload: dict):
    return supabase.table("intern_onboarding").update(payload).eq("intern_id", intern_id).execute()


def list_evaluations(supabase: Client, intern_id: str):
    return (
        supabase.table("intern_evaluations")
        .select("*")
        .eq("intern_id", intern_id)
        .order("created_at", desc=True)
        .execute()
    )


def create_evaluation(supabase: Client, payload: dict):
    return supabase.table("intern_evaluations").insert(payload).execute()


def delete_evaluation(supabase: Client, intern_id: str, eval_id: str):
    return supabase.table("intern_evaluations").delete().eq("id", eval_id).eq("intern_id", intern_id).execute()
