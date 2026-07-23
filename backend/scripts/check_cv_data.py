import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

def check_data():
    res = supabase.table("cv_extractions").select("*").limit(5).execute()
    print(f"Candidates found: {len(res.data)}")
    for c in res.data:
        print(f" - {c.get('full_name')} ({c.get('email')})")

if __name__ == "__main__":
    check_data()
