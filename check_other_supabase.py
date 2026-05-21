import os
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

# Try the other URL
url = "https://vaimfbevkbcjjhtrrtdf.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW1mYmV2a2JjampodHJydGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTc3MTMsImV4cCI6MjA5MjU5MzcxM30.iKinXb0l_PJawpKvYqoqztdo-pJst0-qyrxO11jE9XE"

def check_schema(schema_name):
    print(f"\n--- Checking Schema: {schema_name} on {url} ---")
    try:
        options = ClientOptions(schema=schema_name)
        supabase = create_client(url, key, options=options)
        
        tables = ["employees", "candidate_applications"]
        for table in tables:
            try:
                res = supabase.table(table).select("id", count="exact").limit(1).execute()
                print(f"Table '{table}': {res.count} records")
            except Exception as e:
                print(f"Table '{table}': Error ({e})")
    except Exception as e:
        print(f"Failed: {e}")

def main():
    check_schema("public")
    check_schema("rh")

if __name__ == "__main__":
    main()
