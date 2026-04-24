import os
from supabase import create_client

url = "https://dbrag.tybot.ma"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzMzMjczNjl9.rjX0S8mMVBWOhL4QVklBtFvdQjzRjyom8e_l2IaxlHo"

supabase = create_client(url, key)

def check():
    print("Checking employee status and contract_type distribution:")
    res = supabase.table("employees").select("status, contract_type").execute()
    if res.data:
        stats = {}
        for row in res.data:
            s = row.get("status")
            c = row.get("contract_type")
            key = f"status={s}, contract={c}"
            stats[key] = stats.get(key, 0) + 1
        for k, v in stats.items():
            print(f"  {k}: {v}")
    else:
        print("No employees found.")

if __name__ == "__main__":
    check()
