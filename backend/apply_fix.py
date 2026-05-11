import psycopg2
import os
from dotenv import load_dotenv

def apply_migration():
    # Attempt to use the connection string from run_migration.py which seems correct for the environment
    DSN = "postgresql://postgres:qacgjigYlsR0NXUUA2yG2lDF8Z@dbrag.tybot.ma:5432/postgres"
    
    try:
        conn = psycopg2.connect(DSN)
        cur = conn.cursor()
        
        migration_path = os.path.join(os.path.dirname(__file__), 'fix_profiles_for_recruitment.sql')
        with open(migration_path, 'r', encoding='utf-8') as f:
            sql = f.read()
            
        print(f"Applying migration: {migration_path}...")
        cur.execute(sql)
        conn.commit()
        print("Migration applied successfully.")
        
    except Exception as e:
        print(f"Error applying migration: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    apply_migration()
