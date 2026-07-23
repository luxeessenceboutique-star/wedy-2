import fitz
import os
from pathlib import Path

uploads = Path("uploads")
files = [
    "_ ATTESTATION DE TRAVAIL.pdf",
    "ATTESTATION DE POURSUITE DE STAGE.pdf",
    "Attestation de poursuite de travail.pdf",
    "ATTESTATION DE STAGE .pdf",
    "CHARTE DE CONFIDENTIALITÉ.pdf",
    "Contrat de travail (CDI) .pdf"
]

with open("scratch/extracted_texts.txt", "w", encoding="utf-8") as f:
    for filename in files:
        path = uploads / filename
        if not path.exists():
            f.write(f"--- MISSING: {filename} ---\n\n")
            continue
        
        f.write(f"--- FILE: {filename} ---\n")
        doc = fitz.open(path)
        for page in doc:
            f.write(page.get_text())
        f.write("\n\n")
