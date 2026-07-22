import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env from parent dir
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def check_tables():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Erreur: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY non trouves dans le .env")
        return

    print(f"URL: {SUPABASE_URL}")
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    tables = ['employees', 'document_templates', 'generated_documents', 'profiles', 'user_roles']
    
    print("\nVerification des tables du PDF :")
    for t in tables:
        try:
            res = sb.table(t).select("count", count="exact").limit(0).execute()
            print(f"  - {t}: OK (Count: {res.count})")
        except Exception as e:
            print(f"  - {t}: ERREUR - {e}")

if __name__ == "__main__":
    check_tables()
