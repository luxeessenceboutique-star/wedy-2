"""
Database provider using Supabase Python SDK.
Replaces SQLAlchemy to allow connection via HTTPS (Port 443) 
when PostgreSQL direct port (5432/6543) is blocked.
"""
from supabase import create_client, Client
from app.config import settings

_supabase: Client = None

def get_supabase() -> Client:
    """
    Singleton pattern to get the Supabase client.
    """
    global _supabase
    if _supabase is None:
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _supabase

def get_db():
    """
    FastAPI dependency to get the database client.
    Note: Supabase client is stateless (HTTP), so we can yield it directly.
    """
    yield get_supabase()

class Base:
    """Dummy class to prevent import errors from legacy SQLAlchemy models."""
    pass
