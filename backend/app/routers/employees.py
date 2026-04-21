from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from app.services.supabase import get_supabase
from app.dependencies import get_current_user, require_admin
from app.models.employee import EmployeeCreate, EmployeeUpdate

router = APIRouter(prefix="/employees", tags=["employees"])


def _serialize(emp: dict) -> dict:
    for field in ("hire_date", "contract_start", "contract_end", "internship_start", "internship_end", "birth_date"):
        if emp.get(field):
            emp[field] = str(emp[field])
    return emp


@router.get("")
async def list_employees(
    search: str = Query(None),
    department: str = Query(None),
    status: str = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    query = db.table("employees").select("*").order("full_name")

    if search:
        query = query.or_(f"full_name.ilike.%{search}%,cin.ilike.%{search}%,matricule.ilike.%{search}%")
    if department:
        query = query.eq("department", department)
    if status:
        query = query.eq("status", status)

    result = query.range(offset, offset + limit - 1).execute()
    return {"data": [_serialize(e) for e in result.data], "count": len(result.data)}


@router.get("/{employee_id}")
async def get_employee(
    employee_id: str,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = db.table("employees").select("*").eq("id", employee_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _serialize(result.data)


@router.post("", status_code=201)
async def create_employee(
    body: EmployeeCreate,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    payload = body.model_dump(exclude_none=True)
    for field in ("hire_date", "contract_start", "contract_end", "internship_start", "internship_end", "birth_date"):
        if field in payload and payload[field]:
            payload[field] = str(payload[field])
    payload["created_by"] = current_user["id"]
    result = db.table("employees").insert(payload).execute()
    return _serialize(result.data[0])


@router.patch("/{employee_id}")
async def update_employee(
    employee_id: str,
    body: EmployeeUpdate,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    for field in ("hire_date", "contract_start", "contract_end", "internship_start", "internship_end", "birth_date"):
        if field in payload and payload[field]:
            payload[field] = str(payload[field])
    result = db.table("employees").update(payload).eq("id", employee_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _serialize(result.data[0])


@router.delete("/{employee_id}", status_code=204)
async def delete_employee(
    employee_id: str,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(require_admin),
):
    db.table("employees").delete().eq("id", employee_id).execute()
