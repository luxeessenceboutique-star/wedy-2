from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.repositories import webhook_repository
from app.services import webhooks as webhook_service

router = APIRouter(prefix="/webhooks", tags=["Integrations"])

class WebhookCreate(BaseModel):
    url: str
    events: List[str]
    active: bool = True
    kind: str = "json"          # json | slack | teams
    secret: Optional[str] = None

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
    data = body.model_dump()
    if not data["url"].startswith("https://"):
        raise HTTPException(status_code=422, detail="L'URL doit commencer par https://")
    data["events"] = [e for e in data["events"] if e in webhook_service.EVENTS]
    if data["kind"] not in ("json", "slack", "teams"):
        data["kind"] = "json"
    res = webhook_repository.create_webhook(supabase, data)
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


@router.post("/{hook_id}/test")
def test_webhook(
    hook_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin)
):
    """Send a test event now and report the HTTP status."""
    rows = supabase.table("webhooks").select("*").eq("id", hook_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Webhook not found")
    status = webhook_service.deliver(rows[0], "test", {"message": "Wedy webhook test"})
    webhook_service._record(supabase, hook_id, status)
    return {"status": status}
