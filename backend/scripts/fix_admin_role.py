"""
Fix: ensure admin.rh@wedy.ma has role='hr' in user_roles table.
Run from the backend/ directory:  python scripts/fix_admin_role.py
"""
import os, sys
from dotenv import load_dotenv
from supabase import create_client, ClientOptions

load_dotenv()

url    = os.getenv("SUPABASE_URL")
key    = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
schema = os.getenv("SUPABASE_SCHEMA", "public")

if not url or not key:
    print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env")
    sys.exit(1)

sb = create_client(url, key, options=ClientOptions(schema=schema))

TARGET_EMAIL = "admin.rh@wedy.ma"
TARGET_ROLE  = "hr"

# Find user by email
user_id = None
try:
    users = sb.auth.admin.list_users()
    for u in users:
        if u.email == TARGET_EMAIL:
            user_id = u.id
            break
except Exception as e:
    print(f"ERROR listing users: {e}")
    sys.exit(1)

if not user_id:
    print(f"No user found with email '{TARGET_EMAIL}' — creating account...")
    try:
        res = sb.auth.admin.create_user({
            "email":         TARGET_EMAIL,
            "password":      "AdminRH2024!",
            "email_confirm": True,
            "user_metadata": {"full_name": "Wedy Admin"},
        })
        user_id = res.user.id
        print(f"[CREATED] {TARGET_EMAIL} -> {user_id}")
    except Exception as e:
        print(f"ERROR creating user: {e}")
        sys.exit(1)
else:
    print(f"[FOUND] {TARGET_EMAIL} -> {user_id}")

# Upsert role
try:
    sb.table("user_roles").upsert(
        {"user_id": user_id, "role": TARGET_ROLE},
        on_conflict="user_id"
    ).execute()
    print(f"[OK] user_roles -> role='{TARGET_ROLE}' for {TARGET_EMAIL}")
except Exception as e:
    print(f"ERROR upserting user_roles: {e}")
    sys.exit(1)

# Upsert profile
try:
    sb.table("profiles").upsert(
        {"user_id": user_id, "full_name": "Wedy Admin", "email": TARGET_EMAIL},
        on_conflict="user_id"
    ).execute()
    print(f"[OK] profiles updated for {TARGET_EMAIL}")
except Exception as e:
    print(f"Warning: could not update profiles: {e}")

print("\nDone. Log in with admin.rh@wedy.ma / AdminRH2024! — you will land on the HR Admin dashboard.")
