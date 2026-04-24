import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERREUR : Configuration Supabase manquante dans le .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def sync_templates():
    print(f"Synchronisation des modeles avec {SUPABASE_URL}...")
    
    template_dir = "app/templates"
    templates = [
        {
            "code": "ATTEST_TRAVAIL", 
            "name_fr": "Attestation de Travail", 
            "name_en": "Work Certificate",
            "name_ar": "شهادة عمل",
            "file": "attestation_travail.html"
        },
        {
            "code": "ATTEST_STAGE", 
            "name_fr": "Attestation de Stage", 
            "name_en": "Internship Certificate",
            "name_ar": "شهادة تدريب",
            "file": "attestation_stage.html"
        },
    ]

    for t in templates:
        path = os.path.join(template_dir, t['file'])
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                try:
                    res = supabase.table("document_templates").upsert({
                        "code": t['code'],
                        "name_fr": t['name_fr'],
                        "name_en": t['name_en'],
                        "name_ar": t['name_ar'],
                        "body_template": content,
                        "is_active": True,
                        "category": "autre"
                    }, on_conflict="code").execute()
                    print(f"SUCCESS: Template '{t['name_fr']}' synchronise.")
                except Exception as e:
                    print(f"ERROR lors de la synchronisation de '{t['name_fr']}': {e}")
        else:
            print(f"WARNING: Fichier source introuvable : {path}")

if __name__ == "__main__":
    sync_templates()
