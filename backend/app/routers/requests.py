"""HR Requests router — /api/requests (Supabase SDK Version)"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.schemas import HRRequestCreate, HRRequestUpdate, HRRequestOut
from app.services.audit import log_action, create_notification, notify_hr
from app.repositories import hr_request_repository

router = APIRouter(prefix="/requests", tags=["HR Requests"])

@router.get("", response_model=List[HRRequestOut])
def list_requests(
    profile_id: Optional[UUID] = None,
    status: Optional[str] = None,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    response = hr_request_repository.list_requests(
        supabase, str(profile_id) if profile_id else None, status
    )
    return response.data

@router.post("", response_model=HRRequestOut, status_code=201)
def create_request(
    payload: HRRequestCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    data = payload.model_dump()
    response = hr_request_repository.create_request(supabase, data)
    if not response.data:
        raise HTTPException(status_code=400, detail="Could not create request")

    req = response.data[0]
    log_action(supabase, current_user["id"], "CREATE_REQUEST", "hr_request", req["id"])

    # Notify HR/admin that a new request was submitted
    req_type = req.get("type", "demande")
    requester = current_user.get("full_name") or current_user.get("email", "Un employé")
    notify_hr(
        supabase,
        title=f"Nouvelle demande — {requester}",
        body=f"{requester} a soumis une demande de type « {req_type} ».",
        notif_type="employee_request",
        link="/requests",
    )
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

    response = hr_request_repository.update_request_status(supabase, str(request_id), status)
    if not response.data:
        raise HTTPException(status_code=404, detail="Request not found")

    req = response.data[0]
    status_label = "approuvée" if status == "approved" else "refusée"
    create_notification(
        supabase,
        user_id=req["profile_id"],
        message=f"Votre demande de {req.get('type', 'demande')} a été {status_label}.",
        title=f"Demande {status_label}",
        notif_type="info" if status == "approved" else "warning",
    )
    log_action(supabase, current_user["id"], f"{status.upper()}_REQUEST", "hr_request", str(request_id))
    return req
