"""Departments router — full CRUD"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
from app.database import get_db
from app.dependencies import require_role

router = APIRouter(tags=["Departments"])


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("/departments", response_model=List[dict])
def list_departments(supabase: Client = Depends(get_db)):
    res = supabase.table("departments").select("*").order("name").execute()
    return res.data or []


@router.post("/departments", status_code=201)
def create_department(
    payload: DepartmentCreate,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(require_role("admin", "hr")),
):
    data: dict = {"name": payload.name.strip()}
    if payload.description:
        data["description"] = payload.description.strip()
    res = supabase.table("departments").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Impossible de créer le département")
    return res.data[0]


@router.patch("/departments/{dept_id}")
def update_department(
    dept_id: UUID,
    payload: DepartmentUpdate,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(require_role("admin", "hr")),
):
    data: dict = {}
    if payload.name is not None:
        data["name"] = payload.name.strip()
    if payload.description is not None:
        data["description"] = payload.description.strip()
    if not data:
        raise HTTPException(status_code=400, detail="Aucun champ à modifier")
    res = supabase.table("departments").update(data).eq("id", str(dept_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Département introuvable")
    return res.data[0]


@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(
    dept_id: UUID,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(require_role("admin", "hr")),
):
    res = supabase.table("departments").delete().eq("id", str(dept_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Département introuvable")
