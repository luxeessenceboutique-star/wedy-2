"""
Database provider using Supabase Python SDK.
Replaces SQLAlchemy to allow connection via HTTPS (Port 443) 
when PostgreSQL direct port (5432/6543) is blocked.
"""
from supabase import create_client, Client, ClientOptions
from app.config import settings

_supabase: Client = None

def get_supabase() -> Client:
    """
    Singleton pattern to get the Supabase client.
    """
    global _supabase
    if _supabase is None:
        _supabase = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
            options=ClientOptions(schema=settings.SUPABASE_SCHEMA),
        )
        _disable_stale_keepalive(_supabase)
    return _supabase


def _disable_stale_keepalive(client: Client) -> None:
    """The PostgREST session reuses one shared HTTP/2 keep-alive connection. Behind the reverse proxy
    that connection is closed from time to time, so concurrent requests then fail with
    `httpx.RemoteProtocolError: Server disconnected` (seen as random 503s / empty dashboards).
    A session that does not keep connections alive removes the problem (0 / 144 failures in a
    concurrent test, against 17 / 144 before)."""
    try:
        import httpx
        old = client.postgrest.session
        client.postgrest.session = httpx.Client(
            base_url=old.base_url, headers=dict(old.headers), timeout=old.timeout, follow_redirects=True,
            limits=httpx.Limits(max_keepalive_connections=0),
        )
    except Exception as e:  # never block startup because of this optimisation
        print(f"[database] keep-alive patch not applied: {e}")

def get_db():
    """
    FastAPI dependency to get the database client.
    Note: Supabase client is stateless (HTTP), so we can yield it directly.
    """
    yield get_supabase()
