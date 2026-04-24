"""Notifications & Audit router — (Supabase SDK Version)"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from supabase import Client
from app.database import get_db
from app.dependencies import get_current_user, require_admin

router = APIRouter(tags=["Internal"])

@router.get("/notifications", response_model=List[dict])
def get_my_notifications(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = supabase.table("notifications").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).limit(20).execute()
    return res.data

@router.patch("/notifications/{notif_id}/read")
def mark_read(
    notif_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    supabase.table("notifications").update({"is_read": True}).eq("id", str(notif_id)).eq("user_id", current_user["id"]).execute()
    return {"status": "ok"}

@router.get("/audit", response_model=List[dict])
def view_audit_logs(
    supabase: Client = Depends(get_db),
    admin: dict = Depends(require_admin)
):
    res = supabase.table("audit_logs").select("*, users(email)").order("created_at", desc=True).limit(100).execute()
    return res.data
