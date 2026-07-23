"""Payroll repository — raw Supabase access for payroll_records."""
from typing import Optional
from supabase import Client


def list_payroll(supabase: Client, month: Optional[int], year: Optional[int], employee_id: Optional[str], skip: int, limit: int):
    query = supabase.table("payroll_records").select("*, employees(id, full_name, position, department)")
    if month:
        query = query.eq("month", month)
    if year:
        query = query.eq("year", year)
    if employee_id:
        query = query.eq("employee_id", employee_id)
    res = query.order("year", desc=True).order("month", desc=True).range(skip, skip + limit - 1).execute()

    cq = supabase.table("payroll_records").select("id", count="exact")
    if month:
        cq = cq.eq("month", month)
    if year:
        cq = cq.eq("year", year)
    if employee_id:
        cq = cq.eq("employee_id", employee_id)
    count_res = cq.execute()
    return res, count_res


def create_payroll(supabase: Client, data: dict):
    return supabase.table("payroll_records").insert(data).execute()


def get_payroll_components(supabase: Client, record_id: str):
    return supabase.table("payroll_records").select("base_salary, bonuses, deductions").eq("id", record_id).maybe_single().execute()


def update_payroll(supabase: Client, record_id: str, data: dict):
    return supabase.table("payroll_records").update(data).eq("id", record_id).execute()


def delete_payroll(supabase: Client, record_id: str):
    return supabase.table("payroll_records").delete().eq("id", record_id).execute()


def list_active_employees_for_payroll(supabase: Client):
    return supabase.table("employees").select("id, full_name, salary").eq("status", "active").execute()


def get_payroll_with_employee(supabase: Client, record_id: str):
    return (
        supabase.table("payroll_records")
        .select("*, employees(id, full_name, position, department)")
        .eq("id", record_id)
        .maybe_single()
        .execute()
    )
