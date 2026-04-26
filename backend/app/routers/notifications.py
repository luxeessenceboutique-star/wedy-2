from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def list_notifications(
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Fetch notifications for the current user's profile
    res = (
        supabase.table("notifications")
        .select("*")
        .eq("profile_id", current_user["id"])
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"data": res.data or []}

@router.patch("/{notif_id}/read")
def mark_as_read(
    notif_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("id", notif_id)
        .eq("profile_id", current_user["id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return res.data[0]

@router.patch("/read-all")
def mark_all_as_read(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("profile_id", current_user["id"])
        .eq("is_read", False)
        .execute()
    )
    return {"status": "success", "count": len(res.data or [])}

@router.delete("/{notif_id}")
def delete_notification(
    notif_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    res = (
        supabase.table("notifications")
        .delete()
        .eq("id", notif_id)
        .eq("profile_id", current_user["id"])
        .execute()
    )
    return {"status": "deleted"}
