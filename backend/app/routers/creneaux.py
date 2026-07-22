from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from datetime import date
from pydantic import BaseModel
from app.database import get_db
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
    current_date: Optional[date] = None,
    supabase: Client = Depends(get_db),
):
    query = supabase.table("creneaux").select("*").order("date").order("start_time")

    if ad_id:
        query = query.or_(f"ad_id.eq.{ad_id},ad_id.is.null")
    if current_date:
        query = query.eq("date", str(current_date))

    res = query.execute()
    slots = res.data or []

    # Build reserved_times per date from same result set
    times_by_date: dict = {}
    for s in slots:
        if s.get("status") == "reserved":
            d = s.get("date", "")
            times_by_date.setdefault(d, []).append(s.get("start_time", ""))

    for s in slots:
        s["reserved_times"] = times_by_date.get(s.get("date", ""), [])

    return slots


@router.post("", response_model=List[SlotOut])
def add_slots(payload: List[SlotCreate], supabase: Client = Depends(get_db)):
    records = []
    for p in payload:
        d = p.dict()
        d["date"] = str(d["date"])
        if d.get("ad_id"):
            d["ad_id"] = str(d["ad_id"])
        d["status"] = "free"
        records.append(d)

    if not records:
        return []

    res = supabase.table("creneaux").insert(records).execute()
    rows = res.data or []
    for r in rows:
        r.setdefault("reserved_times", [])
    return rows


@router.delete("/{id}")
def delete_slot(id: UUID, supabase: Client = Depends(get_db)):
    supabase.table("creneaux").delete().eq("id", str(id)).execute()
    return {"message": "Créneau supprimé"}
