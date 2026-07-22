import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def seed_interns():
    print("Finalisation des stagiaires...")
    interns = [
        {"full_name": "Amine Bacouche", "email": "amine.intern@gmail.com", "school": "ENSA"},
        {"full_name": "Yasmine Alami", "email": "yasmine.intern@gmail.com", "school": "EMSI"}
    ]
    for i in interns:
        try:
            # On insere le profil
            prof = supabase.table("profiles").insert({
                "full_name": i['full_name'], "email": i['email'], "department": "Stage"
            }).execute()
            
            if prof.data:
                supabase.table("interns").insert({
                    "profile_id": prof.data[0]['id'], "school": i['school'], "supervisor": "Sara RH"
                }).execute()
                print(f"OK: Stagiaire {i['full_name']}")
        except Exception as e:
            print(f"Note: {i['full_name']} est peut-être déjà là.")

if __name__ == "__main__":
    seed_interns()
