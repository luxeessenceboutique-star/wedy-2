from supabase import create_client, Client
from app.config import settings


def get_supabase() -> Client:
    # Backend is a trusted server — use service_role to bypass RLS
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_supabase_admin() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
