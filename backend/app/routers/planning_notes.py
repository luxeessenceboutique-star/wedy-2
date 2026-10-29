"""Planning RH notes — /api/planning-notes (notes attached to a calendar day, shared by the HR team)"""
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from supabase import Client

from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.services.audit import log_action

router = APIRouter(prefix="/planning-notes", tags=["Planning RH"])
TABLE = "planning_notes"


class NoteCreate(BaseModel):
    note_date: date
    content: str = Field(min_length=1, max_length=4000)


class NoteUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


@router.get("")
def list_notes(
    start: Optional[date] = Query(None),
    end: Optional[date] = Query(None),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Notes of a date range (the month shown in the calendar), oldest first within a day."""
    q = supabase.table(TABLE).select("*")
    if start:
        q = q.gte("note_date", str(start))
    if end:
        q = q.lte("note_date", str(end))
    res = q.order("note_date").order("created_at").limit(2000).execute()
    return {"data": res.data or []}


@router.post("", status_code=201)
def create_note(
    payload: NoteCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="La note est vide")
    row = {
        "note_date": str(payload.note_date),
        "content": content,
        "created_by": current_user["id"],
        "created_by_name": current_user.get("full_name") or current_user.get("email"),
    }
    res = supabase.table(TABLE).insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Impossible d'enregistrer la note")
    log_action(supabase, current_user["id"], "CREATE", "planning_note", res.data[0]["id"])
    return res.data[0]


@router.patch("/{note_id}")
def update_note(
    note_id: str,
    payload: NoteUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="La note est vide")
    res = supabase.table(TABLE).update({"content": content, "updated_at": datetime.utcnow().isoformat()}).eq("id", note_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Note introuvable")
    return res.data[0]


@router.delete("/{note_id}", status_code=204)
def delete_note(
    note_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    res = supabase.table(TABLE).delete().eq("id", note_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Note introuvable")
    log_action(supabase, current_user["id"], "DELETE", "planning_note", note_id)
