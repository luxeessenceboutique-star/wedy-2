from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import require_hr_or_admin, get_current_user
from app.repositories import webhook_repository

router = APIRouter(prefix="/webhooks", tags=["Integrations"])

class WebhookCreate(BaseModel):
    url: str
    events: List[str]
    active: bool = True

@router.get("")
def list_webhooks(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin)
):
    res = webhook_repository.list_webhooks(supabase)
    return {"data": res.data or []}

@router.post("", status_code=201)
def create_webhook(
    body: WebhookCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin)
):
    res = webhook_repository.create_webhook(supabase, body.model_dump())
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create webhook")
    return res.data[0]

@router.patch("/{hook_id}")
def update_webhook(
    hook_id: str,
    body: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin)
):
    res = webhook_repository.update_webhook(supabase, hook_id, body)
    if not res.data:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return res.data[0]

@router.delete("/{hook_id}", status_code=204)
def delete_webhook(
    hook_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin)
):
    webhook_repository.delete_webhook(supabase, hook_id)
