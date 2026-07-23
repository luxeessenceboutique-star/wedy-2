import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def check():
    url = os.getenv('DATABASE_URL')
    if "asyncpg" in url:
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    elif "psycopg2" in url:
        url = url.replace("postgresql+psycopg2://", "postgresql://")
    
    # Remove any pooler options if present
    if "?" in url:
        url = url.split("?")[0]

    print(f"Connecting to: {url}")
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    
    tables = ['employees', 'hr_requests', 'profiles', 'interns', 'document_templates']
    
    for table in tables:
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
        cols = [r[0] for r in cur.fetchall()]
        print(f"Table {table}: {cols}")
    
    conn.close()

if __name__ == "__main__":
    check()
