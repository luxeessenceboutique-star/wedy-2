"""User/account repository — raw Supabase access for user_roles/profiles/document_requests."""
from supabase import Client


def list_user_roles(supabase: Client):
    return supabase.table("user_roles").select("user_id, role, created_at").execute()


def list_profiles_summary(supabase: Client):
    return supabase.table("profiles").select("user_id, full_name, email, created_at").execute()


def delete_user_role(supabase: Client, user_id: str):
    return supabase.table("user_roles").delete().eq("user_id", user_id).execute()


def create_user_role(supabase: Client, user_id: str, role: str):
    return supabase.table("user_roles").insert({"user_id": user_id, "role": role}).execute()


def upsert_user_role(supabase: Client, user_id: str, role: str):
    return supabase.table("user_roles").upsert({"user_id": user_id, "role": role}, on_conflict="user_id").execute()


def count_privileged_roles(supabase: Client) -> int:
    res = supabase.table("user_roles").select("user_id").in_("role", ["rh", "hr", "admin"]).execute()
    return len(res.data or [])


def create_auth_user(supabase: Client, email: str, password: str, full_name: str):
    return supabase.auth.admin.create_user({
        "email":         email,
        "password":      password,
        "email_confirm": True,
        "user_metadata": {"full_name": full_name},
    })


def delete_profile(supabase: Client, user_id: str):
    return supabase.table("profiles").delete().eq("user_id", user_id).execute()


def create_profile(supabase: Client, user_id: str, full_name: str, email: str):
    return supabase.table("profiles").insert({
        "user_id":   user_id,
        "full_name": full_name,
        "email":     email,
    }).execute()


def link_employee_email(supabase: Client, employee_id: str, email: str):
    return supabase.table("employees").update({"email": email}).eq("id", employee_id).execute()


def list_document_requests(supabase: Client, status: str):
    q = (
        supabase.table("document_requests")
        .select("*, employees(id,full_name,department,position)")
        .order("created_at", desc=True)
    )
    if status:
        q = q.eq("status", status)
    return q.execute()


def update_document_request(supabase: Client, req_id: str, payload: dict):
    return supabase.table("document_requests").update(payload).eq("id", req_id).execute()
