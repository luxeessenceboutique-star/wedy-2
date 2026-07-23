"""
Setup HR and Employee accounts.
Run: python setup_accounts.py
"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
sb  = create_client(url, key)  # public schema (PostgREST only exposes public)

HR_EMAIL       = "amarrabeh1998@gmail.com"
HR_PASSWORD    = "admin1234"
HR_NAME        = "Admin RH"

EMP_EMAIL      = "employe.test@rh.com"
EMP_PASSWORD   = "employe1234"
EMP_NAME       = "Employé Test"

def set_role(user_id: str, role: str, full_name: str, email: str):
    # user_roles: delete existing then insert fresh
    sb.table("user_roles").delete().eq("user_id", user_id).execute()
    sb.table("user_roles").insert({"user_id": user_id, "role": role}).execute()

    # profiles: delete existing then insert fresh
    sb.table("profiles").delete().eq("user_id", user_id).execute()
    sb.table("profiles").insert({"user_id": user_id, "full_name": full_name, "email": email}).execute()
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

print("\n-- Setting up HR account --")
hr_id = get_or_create_user(HR_EMAIL, HR_PASSWORD, HR_NAME)
set_role(hr_id, "hr", HR_NAME, HR_EMAIL)

print("\n-- Setting up Employee test account --")
emp_id = get_or_create_user(EMP_EMAIL, EMP_PASSWORD, EMP_NAME)
set_role(emp_id, "employee", EMP_NAME, EMP_EMAIL)

print("\n==========================================")
print("  ACCOUNTS READY")
print("==========================================")
print()
print("  HR Manager")
print("    Email    : amarrabeh1998@gmail.com")
print("    Password : admin1234")
print("    Portal   : /login -> /app")
print()
print("  Employee (test)")
print("    Email    : employe.test@rh.com")
print("    Password : employe1234")
print("    Portal   : /login -> /employee")
print("==========================================\n")
