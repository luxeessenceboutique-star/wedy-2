"""Contract type repository — raw Supabase access for contract_types."""
from supabase import Client


def list_contract_types(supabase: Client):
    return supabase.table("contract_types").select("*").order("name").execute()


def create_contract_type(supabase: Client, data: dict):
    return supabase.table("contract_types").insert(data).execute()


def update_contract_type(supabase: Client, ct_id: str, data: dict):
    return supabase.table("contract_types").update(data).eq("id", ct_id).execute()


def delete_contract_type(supabase: Client, ct_id: str):
    return supabase.table("contract_types").delete().eq("id", ct_id).execute()
