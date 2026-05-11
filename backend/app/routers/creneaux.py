from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from datetime import date
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import get_current_user
from app import mock_store
from supabase import Client

router = APIRouter(prefix="/creneaux", tags=["Recruitment - Scheduling"])

class SlotBase(BaseModel):
    date: date
    start_time: str
    end_time: str
    ad_id: Optional[UUID] = None

class SlotCreate(SlotBase):
    pass

class SlotOut(SlotBase):
    id: UUID
    status: str = "free"
    interview_id: Optional[UUID] = None
    reserved_times: List[str] = []

    class Config:
        from_attributes = True

@router.get("", response_model=List[SlotOut])
def list_slots(
    ad_id: Optional[UUID] = None,
    current_date: Optional[date] = None
):
    from loguru import logger
    slots = mock_store.get_collection("creneaux")
    entretiens = mock_store.get_collection("entretiens")
    
    logger.info(f"LIST SLOTS: Total slots in DB: {len(slots)}")
    
    # Filter slots
    if ad_id:
        slots = [s for s in slots if s.get("ad_id") == str(ad_id) or s.get("ad_id") is None]
        logger.info(f"Filtered by ad_id={ad_id} -> {len(slots)} left")
    if current_date:
        slots = [s for s in slots if s.get("date") == str(current_date)]
        logger.info(f"Filtered by current_date={current_date} -> {len(slots)} left")
    
    # Mark reserved times
    for s in slots:
        s["reserved_times"] = [e["start_time"] for e in entretiens if e["date"] == s["date"]]
        
    return slots

@router.post("", response_model=List[SlotOut])
def add_slots(payload: List[SlotCreate]):
    added = []
    for p in payload:
        added.append(mock_store.add_item("creneaux", p.dict()))
    return added

@router.delete("/{id}")
def delete_slot(id: UUID):
    mock_store.delete_item("creneaux", str(id))
    return {"message": "Créneau supprimé"}
