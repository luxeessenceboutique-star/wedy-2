from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from app.config import settings


def get_supabase() -> Client:
    # Backend is a trusted server — use service_role to bypass RLS
    options = ClientOptions(schema=settings.SUPABASE_SCHEMA)
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY, options=options)


def get_supabase_admin() -> Client:
    """Service-role client — bypasses RLS. Use only for server-side operations."""
    options = ClientOptions(schema=settings.SUPABASE_SCHEMA)
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY, options=options)
