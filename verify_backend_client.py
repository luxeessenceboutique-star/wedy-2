import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import get_supabase
from app.config import settings

def main():
    print(f"Settings Schema: {settings.SUPABASE_SCHEMA}")
    print(f"Settings URL: {settings.SUPABASE_URL}")
    
    client = get_supabase()
    # Postgrest client schema
    print(f"Client Postgrest Schema: {client.postgrest.schema}")
    
    # Try a simple select
    try:
        res = client.table("employees").select("id", count="exact").limit(1).execute()
        print(f"Employees count: {res.count}")
    except Exception as e:
        print(f"Error executing: {e}")

if __name__ == "__main__":
    main()
