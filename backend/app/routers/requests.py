"""HR Requests router — /api/requests (Supabase SDK Version)"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.schemas import HRRequestCreate, HRRequestUpdate, HRRequestOut
from app.services.audit import log_action, create_notification

router = APIRouter(prefix="/requests", tags=["HR Requests"])

@router.get("", response_model=List[HRRequestOut])
def list_requests(
    profile_id: Optional[UUID] = None,
    status: Optional[str] = None,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = supabase.table("hr_requests").select("*, profiles(*)")
    if profile_id:
        query = query.eq("profile_id", str(profile_id))
    if status:
        query = query.eq("status", status)
        
    response = query.order("created_at", desc=True).execute()
    return response.data

@router.post("", response_model=HRRequestOut, status_code=201)
def create_request(
    payload: HRRequestCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    data = payload.model_dump()
    response = supabase.table("hr_requests").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Could not create request")
    
    req = response.data[0]
    log_action(supabase, current_user["id"], "CREATE_REQUEST", "hr_request", req["id"])
    return req

@router.patch("/{request_id}/approve", response_model=HRRequestOut)
def approve_request(
    request_id: UUID,
    status: str, # 'approved' or 'rejected'
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr", "manager")),
):
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")
        
    response = supabase.table("hr_requests").update({"status": status}).eq("id", str(request_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Request not found")
        
    req = response.data[0]
    create_notification(supabase, req["profile_id"], f"Votre demande de {req['type']} a été {status}.")
    log_action(supabase, current_user["id"], f"{status.upper()}_REQUEST", "hr_request", str(request_id))
    return req
