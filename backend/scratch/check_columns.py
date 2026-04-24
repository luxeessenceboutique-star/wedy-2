import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

def check_table(table_name):
    print(f"\nStructure of table: {table_name}")
    try:
        # Get one row to see columns
        res = supabase.table(table_name).select("*").limit(1).execute()
        if res.data:
            print(f"Columns: {list(res.data[0].keys())}")
        else:
            print("Table is empty, trying to get columns via query...")
            # We can't easily get column names from an empty table with the SDK 
            # without running a raw SQL query or checking a view.
    except Exception as e:
        print(f"Error checking {table_name}: {e}")

check_table("generated_documents")
check_table("hr_requests")
check_table("document_templates")
check_table("employees")
check_table("profiles")
