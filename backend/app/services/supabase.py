from supabase import create_client, Client, ClientOptions
from app.config import settings


def get_supabase() -> Client:
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
        options=ClientOptions(schema=settings.SUPABASE_SCHEMA),
    )


def get_supabase_admin() -> Client:
    """Service-role client — bypasses RLS. Use only for server-side operations."""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
        options=ClientOptions(schema=settings.SUPABASE_SCHEMA),
    )
