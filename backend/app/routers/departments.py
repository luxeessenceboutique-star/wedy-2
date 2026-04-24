"""Departments & Positions router — (Supabase SDK Version)"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.database import get_db
from app.dependencies import get_current_user, require_admin

router = APIRouter(tags=["Management"])

@router.get("/departments", response_model=List[dict])
def list_departments(supabase: Client = Depends(get_db)):
    res = supabase.table("departments").select("*").execute()
    return res.data

@router.post("/departments", status_code=201)
def create_department(name: str, supabase: Client = Depends(get_db), admin: dict = Depends(require_admin)):
    res = supabase.table("departments").insert({"name": name}).execute()
    return res.data[0]

@router.get("/positions", response_model=List[dict])
def list_positions(supabase: Client = Depends(get_db)):
    res = supabase.table("positions").select("*, departments(name)").execute()
    return res.data

@router.post("/positions", status_code=201)
def create_position(title: str, department_id: UUID, supabase: Client = Depends(get_db), admin: dict = Depends(require_admin)):
    res = supabase.table("positions").insert({"title": title, "department_id": str(department_id)}).execute()
    return res.data[0]
