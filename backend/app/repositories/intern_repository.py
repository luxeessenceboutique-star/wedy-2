"""Intern repository — raw Supabase access (interns live in employees + intern_* tables)."""
from supabase import Client


def list_interns(supabase: Client, skip: int, limit: int, search: str = "", stage: str = "", internship_type: str = ""):
    """Interns, most recent internship first, undated ones last.

    The sort is done here (not with a PostgREST NULLS LAST parameter): that parameter is spelled
    differently in every supabase-py release, and the server image installs the latest one."""
    from types import SimpleNamespace

    def build():
        query = supabase.table("employees").select("*", count="exact").eq("status", "intern")
        # PostgREST "or" filters use , ( ) as separators: strip them from user input
        term = "".join(c for c in (search or "") if c not in ",()%*\\").strip()
        if term:
            query = query.or_(f"full_name.ilike.%{term}%,email.ilike.%{term}%,school.ilike.%{term}%,position.ilike.%{term}%")
        if stage:
            query = query.eq("internship_status", stage)
        if internship_type:
            query = query.eq("internship_type", internship_type)
        return query.order("created_at", desc=True)

    rows, total, page = [], 0, 1000          # the API returns at most 1000 rows per request
    while True:
        res = build().range(len(rows), len(rows) + page - 1).execute()
        rows += res.data or []
        total = res.count if res.count is not None else len(rows)
        if len(res.data or []) < page or len(rows) >= 10000:
            break
    rows.sort(key=lambda r: r.get("internship_start") or "", reverse=True)       # newest first
    rows.sort(key=lambda r: not r.get("internship_start"))                       # undated last (stable)
    return SimpleNamespace(data=rows[skip: skip + limit], count=total)


def get_intern(supabase: Client, intern_id: str):
    return supabase.table("employees").select("*").eq("id", intern_id).eq("status", "intern").maybe_single().execute()


def create_intern(supabase: Client, payload: dict):
    return supabase.table("employees").insert(payload).execute()


def update_intern(supabase: Client, intern_id: str, payload: dict):
    return supabase.table("employees").update(payload).eq("id", intern_id).execute()


def delete_intern(supabase: Client, intern_id: str):
    return supabase.table("employees").delete().eq("id", intern_id).execute()


def get_onboarding(supabase: Client, intern_id: str):
    return supabase.table("intern_onboarding").select("*").eq("intern_id", intern_id).limit(1).execute()


def onboarding_exists(supabase: Client, intern_id: str):
    return supabase.table("intern_onboarding").select("id").eq("intern_id", intern_id).limit(1).execute()


def create_onboarding(supabase: Client, record: dict):
    return supabase.table("intern_onboarding").insert(record).execute()


def update_onboarding(supabase: Client, intern_id: str, payload: dict):
    return supabase.table("intern_onboarding").update(payload).eq("intern_id", intern_id).execute()


def list_evaluations(supabase: Client, intern_id: str):
    return (
        supabase.table("intern_evaluations")
        .select("*")
        .eq("intern_id", intern_id)
        .order("created_at", desc=True)
        .execute()
    )


def create_evaluation(supabase: Client, payload: dict):
    return supabase.table("intern_evaluations").insert(payload).execute()


def delete_evaluation(supabase: Client, intern_id: str, eval_id: str):
    return supabase.table("intern_evaluations").delete().eq("id", eval_id).eq("intern_id", intern_id).execute()
