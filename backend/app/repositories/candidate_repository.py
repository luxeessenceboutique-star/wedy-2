"""Candidate repository — raw Supabase access (candidates live in the employees table)."""
from supabase import Client


def list_candidates(supabase: Client):
    return supabase.table("employees").select("*").eq("status", "candidate").order("created_at", desc=True).execute()


def create_candidate(supabase: Client, data: dict):
    return supabase.table("employees").insert(data).execute()


def update_status(supabase: Client, candidate_id: str, update: dict):
    return supabase.table("employees").update(update).eq("id", candidate_id).execute()


def delete_candidate(supabase: Client, candidate_id: str):
    return supabase.table("employees").delete().eq("id", candidate_id).execute()
