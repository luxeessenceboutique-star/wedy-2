import os
from supabase import create_client

url = "https://dbrag.tybot.ma"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzMzMjczNjl9.rjX0S8mMVBWOhL4QVklBtFvdQjzRjyom8e_l2IaxlHo"

supabase = create_client(url, key)

def check():
    print("Checking hr_requests columns:")
    res = supabase.table("hr_requests").select("*").limit(1).execute()
    if res.data:
        print(f"Data found: {res.data[0]}")
    else:
        print("No data found in hr_requests")

if __name__ == "__main__":
    check()
