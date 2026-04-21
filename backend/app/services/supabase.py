from supabase import create_client, Client
from app.config import settings


def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_admin() -> Client:
    """Service-role client — bypasses RLS. Use only for server-side operations."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
