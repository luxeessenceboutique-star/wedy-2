"""Interns router — /api/interns (Supabase SDK Version)"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.schemas import InternCreate, InternUpdate, InternOut
from app.services.audit import log_action

router = APIRouter(prefix="/interns", tags=["Interns"])


@router.get("", response_model=List[InternOut])
def list_interns(
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    response = supabase.table("interns").select("*, profiles(*)").range(skip, skip + limit - 1).execute()
    return response.data


@router.get("/{intern_id}", response_model=InternOut)
def get_intern(
    intern_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    response = supabase.table("interns").select("*, profiles(*)").eq("id", str(intern_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Intern not found")
    return response.data[0]


@router.post("", response_model=InternOut, status_code=201)
def create_intern(
    payload: InternCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    data = payload.model_dump()
    response = supabase.table("interns").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Could not create intern")
    
    intern = response.data[0]
    log_action(supabase, current_user["id"], "CREATE", "intern", intern["id"])
    return intern


@router.patch("/{intern_id}", response_model=InternOut)
def update_intern(
    intern_id: UUID,
    payload: InternUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_intern(intern_id, supabase, current_user)
        
    response = supabase.table("interns").update(data).eq("id", str(intern_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Intern not found")
    
    intern = response.data[0]
    log_action(supabase, current_user["id"], "UPDATE", "intern", intern["id"])
    return intern


@router.delete("/{intern_id}", status_code=204)
def delete_intern(
    intern_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    response = supabase.table("interns").delete().eq("id", str(intern_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Intern not found")
    log_action(supabase, current_user["id"], "DELETE", "intern", str(intern_id))
