"""Leave repository — raw Supabase access for leave_requests/leave_balances/holidays."""
from typing import Optional
from supabase import Client


def list_leaves(supabase: Client, employee_id: Optional[str], status: Optional[str], skip: int, limit: int):
    query = supabase.table("leave_requests").select("*, employees(id, full_name, position, department)")
    if employee_id:
        query = query.eq("employee_id", employee_id)
    if status:
        query = query.eq("status", status)
    res = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()

    count_q = supabase.table("leave_requests").select("id", count="exact")
    if employee_id:
        count_q = count_q.eq("employee_id", employee_id)
    if status:
        count_q = count_q.eq("status", status)
    count_res = count_q.execute()
    return res, count_res


def get_employee_hire_date(supabase: Client, employee_id: str):
    return supabase.table("employees").select("hire_date").eq("id", employee_id).maybe_single().execute()


def get_leave_balance(supabase: Client, employee_id: str, year: int):
    return (
        supabase.table("leave_balances")
        .select("*")
        .eq("employee_id", employee_id)
        .eq("year", year)
        .maybe_single()
        .execute()
    )


def create_leave_balance(supabase: Client, default: dict):
    return supabase.table("leave_balances").insert(default).execute()


def create_leave(supabase: Client, data: dict):
    return supabase.table("leave_requests").insert(data).execute()


def update_leave(supabase: Client, leave_id: str, data: dict):
    return supabase.table("leave_requests").update(data).eq("id", leave_id).execute()


def delete_leave(supabase: Client, leave_id: str):
    return supabase.table("leave_requests").delete().eq("id", leave_id).execute()


def get_employee_email(supabase: Client, employee_id: str):
    return supabase.table("employees").select("email, full_name").eq("id", employee_id).maybe_single().execute()


def list_auth_users(supabase: Client):
    return supabase.auth.admin.list_users()


def list_holidays(supabase: Client):
    return supabase.table("holidays").select("*").order("date").execute()
