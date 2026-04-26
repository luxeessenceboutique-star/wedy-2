"""Payroll router — /api/payroll"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action
from app.services.payroll_service import generate_payroll_pdf

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


def compute_moroccan_payroll(base: float, bonuses: float = 0, deductions: float = 0):
    """Approximate Moroccan CNSS + IR calculation."""
    gross = base + bonuses

    # CNSS employee part ≈ 4.48% (capped at 6 000 MAD/month gross)
    cnss_base = min(gross, 6000)
    cnss = round(cnss_base * 0.0448, 2)

    # Taxable income = gross - CNSS - professional deduction (20%, max 2500)
    prof_ded = min(gross * 0.20, 2500)
    taxable = gross - cnss - prof_ded

    # IR tranches marocaines 2024 (monthly)
    if taxable <= 2500:
        ir = 0
    elif taxable <= 4166:
        ir = taxable * 0.10 - 250
    elif taxable <= 5000:
        ir = taxable * 0.20 - 666.67
    elif taxable <= 6666:
        ir = taxable * 0.30 - 1166.67
    elif taxable <= 15000:
        ir = taxable * 0.34 - 1433.33
    else:
        ir = taxable * 0.38 - 2033.33

    ir = max(round(ir, 2), 0)
    net = round(gross - cnss - ir - deductions, 2)

    return {"cnss": cnss, "ir": ir, "net_salary": net}


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
    query = (
        supabase.table("payroll_records")
        .select("*, employees(id, full_name, position, department)")
    )
    if month:
        query = query.eq("month", month)
    if year:
        query = query.eq("year", year)
    if employee_id:
        query = query.eq("employee_id", employee_id)

    res = query.order("year", desc=True).order("month", desc=True).range(skip, skip + limit - 1).execute()

    # Count
    cq = supabase.table("payroll_records").select("id", count="exact")
    if month:
        cq = cq.eq("month", month)
    if year:
        cq = cq.eq("year", year)
    if employee_id:
        cq = cq.eq("employee_id", employee_id)
    count_res = cq.execute()

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

    res = supabase.table("payroll_records").insert(data).execute()
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
        rec_res = supabase.table("payroll_records").select("base_salary, bonuses, deductions").eq("id", record_id).maybe_single().execute()
        if rec_res.data:
            base = rec_res.data["base_salary"]
            bonuses = data.get("bonuses", rec_res.data["bonuses"])
            deductions = data.get("deductions", rec_res.data["deductions"])
            calcs = compute_moroccan_payroll(base, bonuses, deductions)
            data.update(calcs)

    if data.get("status") == "paid":
        from datetime import datetime
        data["paid_at"] = datetime.utcnow().isoformat()

    res = supabase.table("payroll_records").update(data).eq("id", record_id).execute()
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
    res = supabase.table("payroll_records").delete().eq("id", record_id).execute()
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
    emp_res = supabase.table("employees").select("id, salary").eq("status", "active").execute()
    employees = emp_res.data or []

    created, skipped = 0, 0
    for emp in employees:
        if not emp.get("salary"):
            skipped += 1
            continue
        calcs = compute_moroccan_payroll(float(emp["salary"]))
        record = {
            "employee_id": emp["id"],
            "month": month,
            "year": year,
            "base_salary": float(emp["salary"]),
            "bonuses": 0,
            "deductions": 0,
            **calcs,
            "status": "draft",
            "created_by": current_user["id"],
        }
        try:
            supabase.table("payroll_records").insert(record).execute()
            created += 1
        except Exception:
            skipped += 1  # Already exists for this month/year

    log_action(supabase, current_user["id"], "BULK_GENERATE", "payroll_records", f"{year}-{month}")
    return {"created": created, "skipped": skipped, "month": month, "year": year}


@router.get("/{record_id}/pdf")
def get_payroll_pdf(
    record_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generate and return a PDF payslip for a specific record."""
    res = (
        supabase.table("payroll_records")
        .select("*, employees(id, full_name, position, department)")
        .eq("id", record_id)
        .maybe_single()
        .execute()
    )
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
