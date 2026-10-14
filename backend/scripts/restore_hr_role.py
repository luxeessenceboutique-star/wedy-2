"""
Restore HR admin access for an account that was downgraded to "employee".
Run from the backend/ directory:  python scripts/restore_hr_role.py <email> [rh|admin]
"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client, ClientOptions

load_dotenv()

if len(sys.argv) < 2:
    print("Usage: python scripts/restore_hr_role.py <email> [rh|admin]")
    sys.exit(1)

email = sys.argv[1].strip().lower()
role  = sys.argv[2] if len(sys.argv) > 2 else "rh"
if role not in ("rh", "admin"):
    print("Role must be 'rh' or 'admin'")
    sys.exit(1)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env")
    sys.exit(1)

sb = create_client(url, key, options=ClientOptions(schema=os.getenv("SUPABASE_SCHEMA", "public")))

user = next((u for u in sb.auth.admin.list_users() if (u.email or "").lower() == email), None)
if not user:
    print(f"No auth user found for {email}")
    sys.exit(1)

before = sb.table("user_roles").select("role").eq("user_id", user.id).execute().data
print(f"[BEFORE] {email} ({user.id}) user_roles = {before or 'NO ROW (-> employee)'}")

sb.table("user_roles").upsert({"user_id": user.id, "role": role}, on_conflict="user_id").execute()
after = sb.table("user_roles").select("role").eq("user_id", user.id).execute().data
print(f"[AFTER]  user_roles = {after}")
print("Done. Log out and log back in to reach the HR dashboard.")
