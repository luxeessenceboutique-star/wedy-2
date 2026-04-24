import os
from supabase import create_client

url = "https://dbrag.tybot.ma"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzMzMjczNjl9.rjX0S8mMVBWOhL4QVklBtFvdQjzRjyom8e_l2IaxlHo"

supabase = create_client(url, key)

def list_tables():
    print("Listing tables via raw query...")
    try:
        # Query pg_catalog to get all tables in public schema
        res = supabase.rpc("get_tables", {}).execute()
        print(f"Result: {res.data}")
    except Exception as e:
        print(f"RPC failed: {e}")
        
    print("\nTesting table existence individually:")
    tables = ["generated_documents", "hr_requests", "employees", "profiles", "document_templates", "user_roles", "requests"]
    for t in tables:
        try:
            res = supabase.table(t).select("count", count="exact").limit(0).execute()
            print(f"  - {t}: EXISTS (count={res.count})")
        except Exception as e:
            print(f"  - {t}: FAILED ({e})")

if __name__ == "__main__":
    list_tables()
