"""Employees router — /api/employees (Supabase SDK Version)"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_role, require_hr_or_admin
from app.schemas import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.services.audit import log_action

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("")
def list_employees(
    status: Optional[str] = None,
    department_id: Optional[UUID] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    query = supabase.table("employees").select("*", count="exact")

    if status:
        query = query.eq("status", status)
    if search:
        query = query.ilike("full_name", f"%{search}%")

    response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    return {"data": response.data, "count": response.count or 0}


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(
    employee_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    response = supabase.table("employees").select("*").eq("id", str(employee_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    return response.data[0]


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(
    payload: EmployeeCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    data = payload.model_dump()
    response = supabase.table("employees").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Could not create employee")
    
    emp = response.data[0]
    log_action(supabase, current_user["id"], "CREATE", "employee", emp["id"])
    return emp


@router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_employee(employee_id, supabase, current_user)
        
    response = supabase.table("employees").update(data).eq("id", str(employee_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp = response.data[0]
    log_action(supabase, current_user["id"], "UPDATE", "employee", emp["id"])
    return emp


@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    response = supabase.table("employees").delete().eq("id", str(employee_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    log_action(supabase, current_user["id"], "DELETE", "employee", str(employee_id))
