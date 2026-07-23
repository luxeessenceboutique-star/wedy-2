"""Employee repository — raw Supabase access for the employees table + employee_files."""
from typing import Optional
from supabase import Client


def list_employees(supabase: Client, status: Optional[str], department_id: Optional[str], search: Optional[str], exclude_intern: bool, skip: int, limit: int):
    query = supabase.table("employees").select("*", count="exact")
    if status:
        query = query.eq("status", status)
    elif exclude_intern:
        query = query.neq("status", "intern")
    if search:
        query = query.ilike("full_name", f"%{search}%")
    return query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()


def list_employee_files(supabase: Client, employee_id: str):
    return supabase.table("employee_files").select("*").eq("employee_id", employee_id).order("created_at", desc=True).execute()


def get_employee_id(supabase: Client, employee_id: str):
    return supabase.table("employees").select("id").eq("id", employee_id).execute()


def create_employee_file(supabase: Client, record: dict):
    return supabase.table("employee_files").insert(record).execute()


def list_employee_files_full(supabase: Client, employee_id: str):
    return supabase.table("employee_files").select("*").eq("employee_id", employee_id).execute()


def create_employee_analysis(supabase: Client, record: dict):
    return supabase.table("employee_analyses").insert(record).execute()


def apply_employee_analysis(supabase: Client, employee_id: str, data: dict):
    return supabase.table("employees").update(data).eq("id", employee_id).execute()


def get_employee_file(supabase: Client, employee_id: str, file_id: str):
    return supabase.table("employee_files").select("file_path").eq("id", file_id).eq("employee_id", employee_id).execute()


def delete_employee_file(supabase: Client, file_id: str):
    return supabase.table("employee_files").delete().eq("id", file_id).execute()


def get_employee(supabase: Client, employee_id: str):
    return supabase.table("employees").select("*").eq("id", employee_id).execute()


def create_employee(supabase: Client, data: dict):
    return supabase.table("employees").insert(data).execute()


def update_employee(supabase: Client, employee_id: str, data: dict):
    return supabase.table("employees").update(data).eq("id", employee_id).execute()


def delete_employee(supabase: Client, employee_id: str):
    return supabase.table("employees").delete().eq("id", employee_id).execute()
