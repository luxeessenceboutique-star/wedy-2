import os
from supabase import create_client, Client

# The other URL
url = "https://vaimfbevkbcjjhtrrtdf.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaW1mYmV2a2JjampodHJydGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTc3MTMsImV4cCI6MjA5MjU5MzcxM30.iKinXb0l_PJawpKvYqoqztdo-pJst0-qyrxO11jE9XE"

def main():
    print(f"Checking {url}")
    try:
        supabase = create_client(url, key)
        res = supabase.table("employees").select("id", count="exact").limit(1).execute()
        print(f"Table 'employees': {res.count} records")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
