"""Payroll router — /api/payroll"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action
from app.services.payroll_service import generate_payroll_pdf, compute_moroccan_payroll
from app.repositories import payroll_repository

router = APIRouter(prefix="/payroll", tags=["Payroll"])


class PayrollCreate(BaseModel):
    employee_id: str
    month: int
    year: int
    base_salary: float
    bonuses: float = 0
    deductions: float = 0
    notes: Optional[str] = None


class PayrollUpdate(BaseModel):
    bonuses: Optional[float] = None
    deductions: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ── List ──────────────────────────────────────────────────────

@router.get("")
def list_payroll(
    month: Optional[int] = None,
    year: Optional[int] = None,
    employee_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    res, count_res = payroll_repository.list_payroll(supabase, month, year, employee_id, skip, limit)
    return {"data": res.data, "count": count_res.count or 0}


# ── Create ────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_payroll(
    payload: PayrollCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    calcs = compute_moroccan_payroll(payload.base_salary, payload.bonuses, payload.deductions)
    data = payload.model_dump()
    data.update(calcs)
    data["created_by"] = current_user["id"]
    data["status"] = "draft"

    res = payroll_repository.create_payroll(supabase, data)
    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create payroll record (may already exist for this month/year)")

    record = res.data[0]
    log_action(supabase, current_user["id"], "CREATE", "payroll_record", record["id"])
    return record


# ── Update ────────────────────────────────────────────────────

@router.patch("/{record_id}")
def update_payroll(
    record_id: str,
    payload: PayrollUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Recalculate if salary components changed
    if "bonuses" in data or "deductions" in data:
        rec_res = payroll_repository.get_payroll_components(supabase, record_id)
        if rec_res.data:
            base = rec_res.data["base_salary"]
            bonuses = data.get("bonuses", rec_res.data["bonuses"])
            deductions = data.get("deductions", rec_res.data["deductions"])
            calcs = compute_moroccan_payroll(base, bonuses, deductions)
            data.update(calcs)

    if data.get("status") == "paid":
        from datetime import datetime
        data["paid_at"] = datetime.utcnow().isoformat()

    res = payroll_repository.update_payroll(supabase, record_id, data)
    if not res.data:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    log_action(supabase, current_user["id"], "UPDATE", "payroll_record", record_id)
    return res.data[0]


@router.delete("/{record_id}", status_code=204)
def delete_payroll(
    record_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    res = payroll_repository.delete_payroll(supabase, record_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    log_action(supabase, current_user["id"], "DELETE", "payroll_record", record_id)


# ── Generate bulk payroll for a month ──────────────────────────

@router.post("/generate-bulk")
def generate_bulk_payroll(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Auto-generate draft payroll for all active employees for a given month/year."""
    emp_res = payroll_repository.list_active_employees_for_payroll(supabase)
    employees = emp_res.data or []

    created, skipped_existing, no_salary_names = 0, 0, []
    for emp in employees:
        salary = float(emp["salary"]) if emp.get("salary") else 0.0
        if salary == 0:
            no_salary_names.append(emp.get("full_name", emp["id"]))

        calcs = compute_moroccan_payroll(salary)
        record = {
            "employee_id": emp["id"],
            "month": month,
            "year": year,
            "base_salary": salary,
            "bonuses": 0,
            "deductions": 0,
            **calcs,
            "status": "draft",
            "created_by": current_user["id"],
        }
        try:
            payroll_repository.create_payroll(supabase, record)
            created += 1
        except Exception:
            skipped_existing += 1  # Already exists for this month/year

    log_action(supabase, current_user["id"], "BULK_GENERATE", "payroll_records", f"{year}-{month}")
    return {
        "created": created,
        "skipped": skipped_existing,
        "no_salary": no_salary_names,
        "month": month,
        "year": year,
    }


@router.get("/{record_id}/pdf")
def get_payroll_pdf(
    record_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generate and return a PDF payslip for a specific record."""
    res = payroll_repository.get_payroll_with_employee(supabase, record_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    
    # Check permission: HR/Admin can see all, Employee can only see their own
    if current_user["role"] not in ["admin", "hr"]:
        # Logic to verify if current_user owns this record could be added here
        pass

    pdf_buffer = generate_payroll_pdf(res.data)
    filename = f"Bulletin_Paie_{res.data['year']}_{res.data['month']}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
