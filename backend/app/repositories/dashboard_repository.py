"""Dashboard repository — metric counts, resilient to tables that may not exist yet."""
from datetime import date
from supabase import Client


def count_active_employees(supabase: Client) -> int:
    res = supabase.table("employees").select("id", count="exact").eq("status", "active").execute()
    return res.count or 0


def count_interns(supabase: Client) -> int:
    res = supabase.table("employees").select("id", count="exact").eq("status", "intern").execute()
    return res.count or 0


def count_pending_hr_requests(supabase: Client) -> int:
    try:
        res = supabase.table("hr_requests").select("id", count="exact").eq("status", "pending").execute()
        return res.count or 0
    except Exception:
        return 0


def count_pending_leave_requests(supabase: Client) -> int:
    try:
        res = supabase.table("leave_requests").select("id", count="exact").eq("status", "pending").execute()
        return res.count or 0
    except Exception:
        return 0


def count_expiring_contracts(supabase: Client, today: date, within_days: int = 30) -> int:
    try:
        all_emp = supabase.table("employees").select("contract_end").neq("contract_end", None).execute().data or []
        return sum(
            1 for e in all_emp
            if e.get("contract_end")
            and 0 < (date.fromisoformat(e["contract_end"]) - today).days <= within_days
        )
    except Exception:
        return 0


def count_documents_generated_in(supabase: Client, month_prefix: str) -> int:
    try:
        res = (
            supabase.table("generated_documents")
            .select("id", count="exact")
            .like("created_at", f"{month_prefix}%")
            .execute()
        )
        return res.count or 0
    except Exception:
        return 0
