import psycopg2
import sys

def test_conn():
    # Trying the project-specific supabase host
    DSN = "postgresql://postgres:qacgjigYlsR0NXUUA2yG2lDF8Z@db.vaimfbevkbcjjhtrrtdf.supabase.co:5432/postgres"
    try:
        conn = psycopg2.connect(DSN, connect_timeout=10)
        print("Success: Connected to Supabase PostgreSQL!")
        conn.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_conn()
