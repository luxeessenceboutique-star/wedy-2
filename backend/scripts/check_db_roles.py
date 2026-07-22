import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url  = os.getenv("SUPABASE_URL")
key  = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
sb   = create_client(url, key)

def check_roles():
    emails = ["admin.rh@wedy.ma", "employee.wedy@wedy.ma", "amarrabeh1998@gmail.com"]
    
    users = sb.auth.admin.list_users()
    for u in users:
        if u.email in emails:
            print(f"User: {u.email} (ID: {u.id})")
            role_res = sb.table("user_roles").select("*").eq("user_id", u.id).execute()
            print(f"  Role: {role_res.data}")
            prof_res = sb.table("profiles").select("*").eq("user_id", u.id).execute()
            print(f"  Profile: {prof_res.data}")
            print("-" * 20)

if __name__ == "__main__":
    check_roles()
