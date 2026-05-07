import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def check_employee():
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("Missing Supabase credentials")
        return

    supabase = create_client(url, key)
    email = "employee.wedy@wedy.ma"
    
    print(f"Checking for employee: {email}")
    res = supabase.table("employees").select("*").eq("email", email).execute()
    
    if res.data:
        print(f"FOUND: {res.data[0]}")
    else:
        print("NOT FOUND. Creating a dummy employee record for testing...")
        new_emp = {
            "full_name": "Wedy Employee",
            "email": email,
            "position": "Développeur",
            "department": "IT",
            "status": "active",
            "matricule": "EMP-001"
        }
        ins = supabase.table("employees").insert(new_emp).execute()
        print(f"CREATED: {ins.data}")

if __name__ == "__main__":
    check_employee()
