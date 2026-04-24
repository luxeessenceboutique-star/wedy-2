import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env from parent dir
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")

def check_schema():
    if not DATABASE_URL:
        print("Erreur: DATABASE_URL non trouve")
        return

    engine = create_engine(DATABASE_URL)
    tables = ['employees', 'document_templates', 'generated_documents', 'profiles', 'user_roles']
    
    print("STRUCTURE DES TABLES ACTUELLES :")
    with engine.connect() as conn:
        for t in tables:
            print(f"\n[{t}]:")
            try:
                res = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{t}' ORDER BY ordinal_position;"))
                for col in res.fetchall():
                    print(f"  - {col[0]} ({col[1]})")
            except Exception as e:
                print(f"  ERROR: {e}")
    engine.dispose()

if __name__ == "__main__":
    check_schema()
