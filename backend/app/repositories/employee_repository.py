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


# ── Bulk import support ───────────────────────────────────────────────────────

def find_by_identifiers(supabase: Client, cins: list[str], emails: list[str], phones: list[str]) -> list[dict]:
    """
    Fetch id/status/cin/email/phone for every existing employee or intern
    matching any of the given identifiers. Uses one parameterized `.in_()`
    query per field (rather than hand-building a single OR filter string)
    so identifier values can't break or inject into the filter syntax.
    Used by import_service.match_duplicates. Returns a plain merged list,
    not a raw Supabase response — this already combines multiple queries.
    """
    by_id: dict[str, dict] = {}
    for field, values in (("cin", cins), ("email", emails), ("phone", phones)):
        if not values:
            continue
        res = (
            supabase.table("employees")
            .select("id, status, cin, email, phone")
            .in_(field, values)
            .execute()
        )
        for row in res.data or []:
            by_id[row["id"]] = row
    return list(by_id.values())


def bulk_create_employees(supabase: Client, rows: list[dict], batch_size: int = 500):
    """Insert many employee rows in chunks rather than one call per row."""
    created = []
    for i in range(0, len(rows), batch_size):
        chunk = rows[i:i + batch_size]
        res = supabase.table("employees").insert(chunk).execute()
        created.extend(res.data or [])
    return created


def create_import_log(supabase: Client, record: dict):
    return supabase.table("import_logs").insert(record).execute()


def bulk_update_employees(supabase: Client, updates: list[tuple[str, dict]]):
    """Update many existing employees by id. Supabase/PostgREST has no
    per-row-different-values bulk update, so this loops server-side — still
    far faster than the previous client-side loop since it's backend-to-Supabase,
    not browser-to-backend-to-Supabase per row."""
    updated = []
    for employee_id, data in updates:
        res = supabase.table("employees").update(data).eq("id", employee_id).execute()
        if res.data:
            updated.extend(res.data)
    return updated
