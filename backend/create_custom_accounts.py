"""
Create custom HR and Employee accounts.
Run: python create_custom_accounts.py
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Ensure we are in the right directory to load .env
load_dotenv()

url  = os.getenv("SUPABASE_URL")
key  = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
    exit(1)

sb   = create_client(url, key)

def upsert_role(user_id: str, role: str, full_name: str):
    sb.table("user_roles").upsert({"user_id": user_id, "role": role}, on_conflict="user_id").execute()
    sb.table("profiles").upsert({"user_id": user_id, "full_name": full_name}, on_conflict="user_id").execute()
    print(f"  [OK] user_roles + profiles set -> {role}")

def get_or_create_user(email: str, password: str, full_name: str):
    try:
        users = sb.auth.admin.list_users()
        for u in users:
            if u.email == email:
                print(f"[FOUND] {email} -> id={u.id}")
                return u.id
    except Exception as e:
        print(f"  Warning listing users: {e}")

    res = sb.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"full_name": full_name},
    })
    print(f"[CREATED] {email} -> id={res.user.id}")
    return res.user.id

def create_accounts():
    print("\n-- Creating New HR Admin Account --")
    # You can change these details as needed
    NEW_HR_EMAIL = "admin.rh@wedy.ma"
    NEW_HR_PASS  = "admin1234"
    NEW_HR_NAME  = "Wedy Admin"
    
    hr_id = get_or_create_user(NEW_HR_EMAIL, NEW_HR_PASS, NEW_HR_NAME)
    upsert_role(hr_id, "hr", NEW_HR_NAME)

    print("\n-- Creating New Employee Account --")
    # You can change these details as needed
    NEW_EMP_EMAIL = "employee.wedy@wedy.ma"
    NEW_EMP_PASS  = "employee1234"
    NEW_EMP_NAME  = "Wedy Employee"
    
    emp_id = get_or_create_user(NEW_EMP_EMAIL, NEW_EMP_PASS, NEW_EMP_NAME)
    upsert_role(emp_id, "employee", NEW_EMP_NAME)

    print("\n==========================================")
    print("  NEW ACCOUNTS CREATED")
    print("==========================================")
    print(f"  HR Admin: {NEW_HR_EMAIL} / {NEW_HR_PASS}")
    print(f"  Employee: {NEW_EMP_EMAIL} / {NEW_EMP_PASS}")
    print("==========================================\n")

if __name__ == "__main__":
    create_accounts()
