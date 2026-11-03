"""Paramètres — /api/settings: company profile, preferences, leave rules, documents, images."""
import base64
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services import app_settings
from app.services.audit import log_action

router = APIRouter(prefix="/settings", tags=["Settings"])
ASSETS = {"logo", "signature", "stamp"}
MAX_IMAGE = 600 * 1024


class SettingsPatch(BaseModel):
    company: Optional[dict[str, Any]] = None
    prefs: Optional[dict[str, Any]] = None
    leave: Optional[dict[str, Any]] = None
    docs: Optional[dict[str, Any]] = None


def _save(supabase: Client, key: str, value: dict, user_id: str):
    try:
        supabase.table("app_settings").upsert({"key": key, "value": value, "updated_by": user_id, "updated_at": datetime.utcnow().isoformat()}).execute()
    except Exception as e:
        if app_settings.missing_table(e):
            raise HTTPException(status_code=503, detail="settings_table_missing")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
def get_settings(supabase: Client = Depends(get_db), current_user: dict = Depends(get_current_user)):
    data, stored = app_settings.load(supabase)
    return {**data, "stored": stored}


@router.patch("")
def update_settings(payload: SettingsPatch, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    data, _ = app_settings.load(supabase)
    for key, value in payload.model_dump(exclude_none=True).items():
        allowed = app_settings.DEFAULTS[key].keys()
        merged = {**data[key], **{k: v for k, v in value.items() if k in allowed}}
        _save(supabase, key, merged, current_user["id"])
        data[key] = merged
    log_action(supabase, current_user["id"], "UPDATE", "settings", None)
    return {**data, "stored": True}


@router.post("/assets/{kind}")
async def upload_asset(kind: str, file: UploadFile = File(...), supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    """Logo / signature / stamp, kept as a data URL (small PNG, JPEG, SVG or WebP)."""
    if kind not in ASSETS:
        raise HTTPException(status_code=404, detail="Unknown asset")
    ctype = (file.content_type or "").lower()
    if ctype not in ("image/png", "image/jpeg", "image/svg+xml", "image/webp"):
        raise HTTPException(status_code=415, detail="PNG, JPEG, SVG ou WebP uniquement")
    raw = await file.read()
    if len(raw) > MAX_IMAGE:
        raise HTTPException(status_code=413, detail="Image trop lourde (600 Ko max)")
    data, _ = app_settings.load(supabase)
    assets = {**data["assets"], kind: f"data:{ctype};base64,{base64.b64encode(raw).decode()}"}
    _save(supabase, "assets", assets, current_user["id"])
    return {"assets": assets}


@router.delete("/assets/{kind}")
def delete_asset(kind: str, supabase: Client = Depends(get_db), current_user: dict = Depends(require_hr_or_admin)):
    if kind not in ASSETS:
        raise HTTPException(status_code=404, detail="Unknown asset")
    data, _ = app_settings.load(supabase)
    assets = {**data["assets"], kind: None}
    _save(supabase, "assets", assets, current_user["id"])
    return {"assets": assets}
