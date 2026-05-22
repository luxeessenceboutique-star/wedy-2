from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from app.config import settings


def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_supabase_admin() -> Client:
    """Service-role client — bypasses RLS. Use only for server-side operations."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
