import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def seed_users():
    print("Seeding employes et stagiaires...")
    
    # 1. Employes
    employes = [
        {"full_name": "Salah Eddine", "email": "salah.dev@tython.ma", "position": "Developpeur Fullstack", "department": "IT", "status": "active"},
        {"full_name": "Sara RH", "email": "hr@tython.ma", "position": "Responsable RH", "department": "RH", "status": "active"}
    ]
    for emp in employes:
        try:
            supabase.table("employees").insert(emp).execute()
            print(f"OK: Employe {emp['full_name']}")
        except:
            print(f"INFO: {emp['full_name']} deja present.")

    # 2. Stagiaires
    interns = [
        {"full_name": "Amine Bacouche", "email": "intern1@gmail.com", "school": "ENSA"},
        {"full_name": "Yasmine Alami", "email": "intern2@gmail.com", "school": "EMSI"}
    ]
    for i in interns:
        try:
            # On cree un profil pour le stagiaire
            prof = supabase.table("profiles").upsert({
                "full_name": i['full_name'], "email": i['email'], "department": "Stage"
            }, on_conflict="email").execute()
            
            if prof.data:
                supabase.table("interns").upsert({
                    "profile_id": prof.data[0]['id'], "school": i['school'], "supervisor": "Sara RH"
                }, on_conflict="profile_id").execute()
                print(f"OK: Stagiaire {i['full_name']}")
        except Exception as e:
            print(f"Note stagiaire {i['full_name']}: {e}")

if __name__ == "__main__":
    seed_users()
