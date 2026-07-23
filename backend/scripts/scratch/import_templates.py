import os
import sys
import asyncio
import fitz
import re
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.services.ai_service import convert_to_html_template
from app.database import get_supabase

supabase = get_supabase()


async def import_pdf(pdf_path: str, category: str):
    filename = Path(pdf_path).stem.strip()
    name_fr = filename
    if name_fr.startswith("_ "):
        name_fr = name_fr[2:]
        
    print(f"Importing {name_fr}...")
    
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
            
        if not text.strip():
            print(f"Failed to extract text from {pdf_path}")
            return
            
        html_template = convert_to_html_template(text)
        variables = list(set(re.findall(r"\{\{(\w+)\}\}", html_template)))
        
        payload = {
            "code": name_fr.lower().replace(" ", "_").replace("-", "_")[:50],
            "name_fr": name_fr,
            "name_en": name_fr,
            "name_ar": name_fr,
            "category": category,
            "body_template": html_template,
            "variables": variables,
            "is_active": True
        }
        
        result = supabase.table("document_templates").insert(payload).execute()
        print(f"Success! Inserted {name_fr} with variables: {variables}")
    except Exception as e:
        print(f"Error importing {name_fr}: {str(e)}")

async def main():
    uploads_dir = Path(__file__).resolve().parents[2] / "uploads"
    pdfs = [
        ("_ ATTESTATION DE TRAVAIL.pdf", "attestation"),
        ("ATTESTATION DE POURSUITE DE STAGE.pdf", "attestation"),
        ("Attestation de poursuite de travail.pdf", "attestation"),
        ("ATTESTATION DE STAGE .pdf", "attestation"),
        ("CHARTE DE CONFIDENTIALITÉ.pdf", "autre"),
        ("Contrat de travail (CDI) .pdf", "contrat"),
    ]
    
    for pdf_file, category in pdfs:
        pdf_path = uploads_dir / pdf_file
        if pdf_path.exists():
            await import_pdf(str(pdf_path), category)
        else:
            print(f"File not found: {pdf_path}")

if __name__ == "__main__":
    asyncio.run(main())
