import os
import random
import uuid
from datetime import date, timedelta, datetime
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

def seed():
    print("Remplissage massif de TOUTES les tables...")

    # 1. Nettoyage partiel ou ajout
    # (On ajoute simplement pour ne pas supprimer les données existantes)

    personnel = [
        {"full_name": "Mehdi Tazi", "email": "mehdi@yodabot.ma", "status": "active", "department": "Developpement", "position": "Lead Dev"},
        {"full_name": "Anas Alaoui", "email": "anas@yodabot.ma", "status": "active", "department": "Ventes", "position": "Commercial"},
        {"full_name": "Sofia Filali", "email": "sofia@yodabot.ma", "status": "intern", "department": "RH", "contract_type": "Stage"},
    ]

    for p in personnel:
        # A. Employee
        emp_data = {
            **p,
            "cin": f"SH{random.randint(100000, 999999)}",
            "matricule": f"MAT-{random.randint(10000, 99999)}",
            "hire_date": str(date.today() - timedelta(days=random.randint(200, 1000))),
            "salary": random.randint(15000, 35000) if p["status"] != "intern" else 0
        }
        if p["status"] == "intern":
             emp_data["internship_start"] = str(date.today())
             emp_data["internship_end"] = str(date.today() + timedelta(days=120))

        emp_res = sb.table("employees").insert(emp_data).execute()
        emp_id = emp_res.data[0]["id"]

        # B. Profile (Dummy user_id car contrainte FK auth.users possiblement active)
        # On va tenter d'utiliser un UUID constant pour les tests si possible ou unique
        dummy_uid = str(uuid.uuid4())
        try:
            prof_res = sb.table("profiles").insert({
                "user_id": dummy_uid,
                "full_name": p["full_name"],
                "email": p["email"],
                "department": p["department"]
            }).execute()
            prof_id = prof_res.data[0]["id"]

            # C. HR Requests
            sb.table("hr_requests").insert({
                "profile_id": prof_id,
                "type": random.choice(["Demande de conge", "Avance sur salaire", "Attestation de travail"]),
                "status": random.choice(["pending", "approved"]),
                "created_at": str(datetime.now())
            }).execute()

            # D. Notifications
            sb.table("notifications").insert({
                "profile_id": prof_id,
                "title": "Bienvenue",
                "message": f"Bonjour {p['full_name']}, votre compte est pret.",
                "is_read": False
            }).execute()

            # E. Generated Documents
            sb.table("generated_documents").insert({
                "employee_id": emp_id,
                "document_type": "Attestation de travail",
                "content": "<p>Ceci est une attestation de test...</p>",
                "language": "fr"
            }).execute()

            # F. Audit Logs
            sb.table("audit_logs").insert({
                "profile_id": prof_id,
                "action": "LOGIN",
                "target_type": "USER",
                "details": f"User {p['full_name']} logged in."
            }).execute()
            
        except Exception as e:
            print(f"  Note: Impossible de lier Profile/Request pour {p['full_name']} (Fk auth.users probable).")

    print("\nSucces ! Les tables employees, generated_documents, notifications et audit_logs ont ete enrichies.")

if __name__ == "__main__":
    seed()
