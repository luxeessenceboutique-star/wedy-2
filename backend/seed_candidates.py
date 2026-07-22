import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

def seed():
    candidates = [
        {
            "full_name": "Salma Mansouri",
            "email": "salma.m@example.com",
            "phone": "0612345678",
            "skills": ["React", "TypeScript", "Node.js"],
            "education": "Master en Informatique",
            "experience": "2 ans chez Tech solutions"
        },
        {
            "full_name": "Karim Bennani",
            "email": "karim.b@example.com",
            "phone": "0677889900",
            "skills": ["UI/UX", "Figma", "Tailwind CSS"],
            "education": "Licence Design Graphique",
            "experience": "3 ans en Freelance"
        },
        {
            "full_name": "Yassine Filali",
            "email": "yassine@example.com",
            "phone": "0655443322",
            "skills": ["Python", "FastAPI", "PostgreSQL"],
            "education": "École d'Ingénieur",
            "experience": "1 an de stage chez OCP"
        }
    ]
    
    print("Seeding candidates into cv_extractions...")
    for c in candidates:
        try:
            supabase.table("cv_extractions").insert(c).execute()
        except Exception as e:
            print(f"Error seeding {c['full_name']}: {e}")
    print("Done!")

if __name__ == "__main__":
    seed()
