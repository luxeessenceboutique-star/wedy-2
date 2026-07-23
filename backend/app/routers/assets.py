from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.dependencies import require_hr_or_admin, get_current_user
from app.repositories import asset_repository

router = APIRouter(prefix="/assets", tags=["Assets Management"])

class AssetBase(BaseModel):
    name: str
    category: Optional[str] = None
    serial_number: Optional[str] = None
    employee_id: Optional[str] = None
    status: str = "available"
    notes: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    serial_number: Optional[str] = None
    employee_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_at: Optional[datetime] = None

@router.get("")
async def list_assets(
    employee_id: Optional[str] = None,
    category: Optional[str] = None,
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = asset_repository.list_assets(db, employee_id, category)
    return {"data": result.data, "count": len(result.data)}

@router.post("", status_code=201)
async def create_asset(
    body: AssetCreate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload = body.model_dump()
    if payload.get("employee_id") and not payload.get("assigned_at"):
        payload["assigned_at"] = datetime.now().isoformat()
        payload["status"] = "assigned"
        
    result = asset_repository.create_asset(db, payload)
    return result.data[0]

@router.patch("/{asset_id}")
async def update_asset(
    asset_id: str,
    body: AssetUpdate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload = body.model_dump(exclude_none=True)
    if "employee_id" in payload:
        if payload["employee_id"]:
            payload["status"] = "assigned"
            payload["assigned_at"] = datetime.now().isoformat()
        else:
            payload["status"] = "available"
            payload["assigned_at"] = None
            
    result = asset_repository.update_asset(db, asset_id, payload)
    if not result.data:
        raise HTTPException(status_code=404, detail="Asset not found")
    return result.data[0]

@router.delete("/{asset_id}", status_code=204)
async def delete_asset(
    asset_id: str,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    asset_repository.delete_asset(db, asset_id)
