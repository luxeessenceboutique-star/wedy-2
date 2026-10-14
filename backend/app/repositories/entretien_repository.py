"""Interview (entretiens) repository — raw Supabase access."""
from supabase import Client


def list_interviews(supabase: Client):
    return supabase.table("interviews").select("*").order("date").order("start_time").execute()


def create_interview(supabase: Client, data: dict):
    return supabase.table("interviews").insert(data).execute()


def reserve_slot(supabase: Client, slot_id: str, interview_id: str):
    return (
        supabase.table("hr_slots")
        .update({"status": "reserved", "interview_id": interview_id})
        .eq("id", slot_id)
        .execute()
    )


def update_interview_status(supabase: Client, interview_id: str, status: str):
    return supabase.table("interviews").update({"status": status}).eq("id", interview_id).execute()
