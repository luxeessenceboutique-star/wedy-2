"""Auth repository — raw Supabase Auth + profile/role table access."""
from supabase import Client


def sign_in_with_password(supabase: Client, email: str, password: str):
    return supabase.auth.sign_in_with_password({"email": email, "password": password})


def get_user_role(supabase: Client, user_id: str):
    return supabase.table("user_roles").select("role").eq("user_id", user_id).maybe_single().execute()


def create_user(supabase: Client, email: str, password: str, full_name: str):
    return supabase.auth.admin.create_user({
        "email":         email,
        "password":      password,
        "email_confirm": True,
        "user_metadata": {"full_name": full_name},
    })


def upsert_profile(supabase: Client, user_id: str, full_name: str, email: str):
    return supabase.table("profiles").upsert({
        "user_id":   user_id,
        "full_name": full_name,
        "email":     email,
    }, on_conflict="user_id").execute()
