"""Slot (creneaux) repository — raw Supabase access."""
from typing import Optional
from supabase import Client


def list_slots(supabase: Client, ad_id: Optional[str], current_date: Optional[str]):
    query = supabase.table("creneaux").select("*").order("date").order("start_time")
    if ad_id:
        query = query.or_(f"ad_id.eq.{ad_id},ad_id.is.null")
    if current_date:
        query = query.eq("date", current_date)
    return query.execute()


def insert_slots(supabase: Client, records: list):
    return supabase.table("creneaux").insert(records).execute()


def delete_slot(supabase: Client, slot_id: str):
    return supabase.table("creneaux").delete().eq("id", slot_id).execute()
