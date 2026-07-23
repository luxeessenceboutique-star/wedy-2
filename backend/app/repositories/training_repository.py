"""Training repository — raw Supabase access for training/skills tables."""
from supabase import Client


def list_catalog(supabase: Client, category: str):
    q = supabase.table("training_catalog").select("*").eq("is_active", True).order("created_at", desc=True)
    if category:
        q = q.eq("category", category)
    return q.execute()


def create_training(supabase: Client, payload: dict):
    return supabase.table("training_catalog").insert(payload).execute()


def update_training(supabase: Client, training_id: str, payload: dict):
    return supabase.table("training_catalog").update(payload).eq("id", training_id).execute()


def deactivate_training(supabase: Client, training_id: str):
    return supabase.table("training_catalog").update({"is_active": False}).eq("id", training_id).execute()


def list_assignments(supabase: Client, employee_id: str, status: str):
    q = (
        supabase.table("employee_trainings")
        .select("*, training_catalog(id,title,category,duration_hours,cost_dh), employees(id,full_name,department)")
        .order("assigned_at", desc=True)
    )
    if employee_id:
        q = q.eq("employee_id", employee_id)
    if status:
        q = q.eq("status", status)
    return q.execute()


def create_assignment(supabase: Client, payload: dict):
    return supabase.table("employee_trainings").insert(payload).execute()


def update_assignment(supabase: Client, assignment_id: str, payload: dict):
    return supabase.table("employee_trainings").update(payload).eq("id", assignment_id).execute()


def delete_assignment(supabase: Client, assignment_id: str):
    return supabase.table("employee_trainings").delete().eq("id", assignment_id).execute()


def list_assignments_for_stats(supabase: Client):
    return supabase.table("employee_trainings").select(
        "status, training_catalog(cost_dh, duration_hours)"
    ).execute()


def list_skills(supabase: Client, category: str):
    q = supabase.table("skills").select("*").eq("is_active", True).order("name")
    if category:
        q = q.eq("category", category)
    return q.execute()


def create_skill(supabase: Client, payload: dict):
    return supabase.table("skills").insert(payload).execute()


def update_skill(supabase: Client, skill_id: str, payload: dict):
    return supabase.table("skills").update(payload).eq("id", skill_id).execute()


def deactivate_skill(supabase: Client, skill_id: str):
    return supabase.table("skills").update({"is_active": False}).eq("id", skill_id).execute()


def get_employee_skills(supabase: Client, employee_id: str):
    q = supabase.table("employee_skills").select("*, skills(id,name,category,description)")
    if employee_id:
        q = q.eq("employee_id", employee_id)
    return q.execute()


def upsert_employee_skill(supabase: Client, payload: dict):
    return supabase.table("employee_skills").upsert(payload, on_conflict="employee_id,skill_id").execute()


def remove_employee_skill(supabase: Client, record_id: str):
    return supabase.table("employee_skills").delete().eq("id", record_id).execute()
