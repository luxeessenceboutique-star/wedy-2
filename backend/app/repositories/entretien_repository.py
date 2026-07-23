"""Interview (entretiens) repository — raw Supabase access."""
from supabase import Client


def list_interviews(supabase: Client):
    return supabase.table("entretiens").select("*").order("date").order("start_time").execute()


def create_interview(supabase: Client, data: dict):
    return supabase.table("entretiens").insert(data).execute()


def reserve_slot(supabase: Client, slot_id: str, interview_id: str):
    return (
        supabase.table("creneaux")
        .update({"status": "reserved", "interview_id": interview_id})
        .eq("id", slot_id)
        .execute()
    )


def update_interview_status(supabase: Client, interview_id: str, status: str):
    return supabase.table("entretiens").update({"status": status}).eq("id", interview_id).execute()
