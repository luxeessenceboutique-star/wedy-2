import asyncio
import os
import sys
from supabase import create_client
import redis
import httpx
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine

# Add parent dir to path to import app.config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.config import settings

async def test_all():
    print("=== DIAGNOSTIC DES CONNEXIONS (ASCII) ===")
    
    # 1. Test Supabase Client
    print("\n[1] Supabase Client:")
    try:
        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        # Try a simple query
        res = sb.table("profiles").select("count", count="exact").limit(0).execute()
        print(f"  OK! URL: {settings.SUPABASE_URL}")
        print(f"  Data accessible (profiles count): {res.count}")
    except Exception as e:
        print(f"  ERROR Supabase: {e}")

    # 2. Test PostgreSQL (Direct)
    print("\n[2] PostgreSQL (Direct Connection):")
    try:
        # Use sync engine with psycopg2 for test
        sync_engine = create_engine(settings.DATABASE_URL)
        with sync_engine.connect() as conn:
            # Check version
            res = conn.execute(text("SELECT version();"))
            row = res.fetchone()
            print(f"  OK! Version: {row[0][:50]}...")
            
            # List tables
            print("  Tables existantes dans 'public':")
            tables_res = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';"))
            tables = [t[0] for t in tables_res.fetchall()]
            if tables:
                for table in tables:
                    print(f"    - {table}")
            else:
                print("    (Aucune table trouvee)")
        sync_engine.dispose()
    except Exception as e:
        print(f"  ERROR PostgreSQL: {e}")

    # 3. Test Redis
    print("\n[3] Redis:")
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        print(f"  OK! URL: {settings.REDIS_URL}")
    except Exception as e:
        print(f"  ERROR Redis: {e}")

    # 4. Test OpenAI API
    print("\n[4] OpenAI API:")
    try:
        headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.OPENAI_BASE_URL}models", headers=headers)
            if resp.status_code == 200:
                print(f"  OK! Base URL: {settings.OPENAI_BASE_URL}")
            else:
                print(f"  ERROR OpenAI: Status {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"  ERROR OpenAI: {e}")

if __name__ == "__main__":
    asyncio.run(test_all())
