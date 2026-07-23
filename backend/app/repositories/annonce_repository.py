"""Job ad (annonces) repository — raw Supabase access."""
from supabase import Client


def list_annonces(supabase: Client):
    return supabase.table("annonces").select("*").order("created_at", desc=True).execute()


def get_annonce(supabase: Client, ad_id: str):
    return supabase.table("annonces").select("*").eq("id", ad_id).maybe_single().execute()


def create_annonce(supabase: Client, data: dict):
    return supabase.table("annonces").insert(data).execute()


def update_annonce(supabase: Client, ad_id: str, data: dict):
    return supabase.table("annonces").update(data).eq("id", ad_id).execute()


def delete_annonce(supabase: Client, ad_id: str):
    return supabase.table("annonces").delete().eq("id", ad_id).execute()
