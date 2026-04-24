import os
from supabase import create_client

url = "https://dbrag.tybot.ma"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzMzMjczNjl9.rjX0S8mMVBWOhL4QVklBtFvdQjzRjyom8e_l2IaxlHo"

supabase = create_client(url, key)

def check():
    print("Checking user roles:")
    res = supabase.table("user_roles").select("*").execute()
    if res.data:
        for row in res.data:
            print(f"  {row}")
    else:
        print("No roles found.")

if __name__ == "__main__":
    check()
