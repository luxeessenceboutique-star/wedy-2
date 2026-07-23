"""Webhook repository — raw Supabase access for the webhooks table."""
from supabase import Client


def list_webhooks(supabase: Client):
    return supabase.table("webhooks").select("*").execute()


def create_webhook(supabase: Client, data: dict):
    return supabase.table("webhooks").insert(data).execute()


def update_webhook(supabase: Client, hook_id: str, data: dict):
    return supabase.table("webhooks").update(data).eq("id", hook_id).execute()


def delete_webhook(supabase: Client, hook_id: str):
    return supabase.table("webhooks").delete().eq("id", hook_id).execute()
