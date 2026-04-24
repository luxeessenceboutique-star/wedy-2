"""
CV Parsing service — IMPROVED LOCAL VERSION
No AI calls, only local Logic/RegEx specialized for IT/Engineering profiles.
"""
import re
import json
import tempfile
import os
from pathlib import Path
from typing import Optional, List
from supabase import Client
from loguru import logger

# ─────────────────────────────────────────────────────────────────────────────
# Local Extraction Patterns (Improved)
# ─────────────────────────────────────────────────────────────────────────────

EMAIL_REGEX = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
# Support +212, +212-, 06, 07, with or without spaces/dashes
PHONE_REGEX = r'(?:\+212|0)[-\s]?([5-7]\d{1}[-\s]?\d{2}[-\s]?\d{2}[-\s]?\d{2})'

# Expanded skills library based on the CV provided
SKILLS_LIBRARY = [
    "python", "javascript", "react", "fastapi", "sql", "excel", "word",
    "comptabilité", "rh", "recrutement", "management", "anglais", "français",
    "php", "java", "marketing", "vente", "logistique", "sage", "canva",
    "ia", "intelligence artificielle", "big data", "data science", "llm",
    "n8n", "langchain", "langgraph", "botpress", "docker", "flask", "mongodb",
    "mysql", "devops", "linux", "c++", "c", "keras", "tensorflow", "pytorch",
    "rag", "automation", "automatisation"
]

def _extract_name_locally(text: str) -> Optional[str]:
    """Improved name extraction: First non-empty lines with valid capitalization."""
    lines = [L.strip() for L in text.split('\n') if L.strip()][:5]
    if not lines:
        return None
    
    # Priority 1: Check if any of the first 3 lines look like a full name
    for line in lines:
        # Avoid lines containing @ or + (likely email/phone)
        if '@' in line or '+' in line:
            continue
        # Avoid very long lines
        if 5 < len(line) < 35:
            # Check if MOST words start with Uppercase
            words = line.split()
            if len(words) >= 2 and all(w[0].isupper() or not w[0].isalpha() for w in words):
                return line
    return lines[0]

def _extract_skills_locally(text: str) -> List[str]:
    found = set()
    text_lower = text.lower()
    for skill in SKILLS_LIBRARY:
        # Use word boundaries to avoid partial matches
        if re.search(rf'\b{re.escape(skill)}\b', text_lower):
            found.add(skill.capitalize())
    return sorted(list(found))

def _extract_sections(text: str) -> dict:
    """Basic section extraction based on known headers."""
    sections = {
        "profile": "",
        "education": "",
        "experience": "",
        "certifications": ""
    }
    
    lines = text.split('\n')
    current_section = None
    
    profile_keywords = ["profil", "profile", "résumé", "summary"]
    edu_keywords = ["formation", "éducation", "parcours académique", "diplôm"]
    exp_keywords = ["expérience", "experience", "parcours professionnel", "stag"]
    cert_keywords = ["certification"]
    skip_keywords = ["compétence", "competence", "skills", "langues", "languages"]
    
    for line in lines:
        stripped = line.strip().lower()
        if not stripped:
            continue
            
        # Detect sections
        if len(stripped) < 35:
            if any(stripped.startswith(k) for k in profile_keywords):
                current_section = "profile"
                continue
            elif any(stripped.startswith(k) for k in edu_keywords):
                current_section = "education"
                continue
            elif any(stripped.startswith(k) for k in exp_keywords):
                current_section = "experience"
                continue
            elif any(stripped.startswith(k) for k in cert_keywords):
                current_section = "certifications"
                continue
            elif any(stripped.startswith(k) for k in skip_keywords):
                current_section = "skip"
                continue
                
        if current_section and current_section != "skip":
            sections[current_section] += line + "\n"
            
    # Clean up
    for k in sections:
        sections[k] = sections[k].strip()
    return sections

def _extract_location(text: str) -> Optional[str]:
    lines = [L.strip() for L in text.split('\n') if L.strip()][:15]
    cities = ["casablanca", "rabat", "marrakech", "agadir", "tanger", "fes", "settat", "khouribga", "maroc", "morocco"]
    for line in lines:
        if "@" in line or "+" in line or len(line) > 50:
            continue
        if any(city in line.lower() for city in cities):
            return line
    return None

# ─────────────────────────────────────────────────────────────────────────────
# Core logic (Unchanged structure, improved rules)
# ─────────────────────────────────────────────────────────────────────────────

def extract_raw_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    try:
        if ext == ".pdf":
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            return "\n".join(page.get_text() for page in doc)
        elif ext in (".docx", ".doc"):
            from docx import Document
            with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            doc = Document(tmp_path)
            os.unlink(tmp_path)
            return "\n".join(p.text for p in doc.paragraphs)
        elif ext in (".png", ".jpg", ".jpeg"):
            import pytesseract
            from PIL import Image
            from io import BytesIO
            img = Image.open(BytesIO(file_bytes))
            return pytesseract.image_to_string(img, lang="fra+eng+ara")
    except Exception as e:
        logger.error(f"Text extraction failed: {e}")
        return ""
    return ""

def local_extract_cv(raw_text: str) -> dict:
    email_match = re.search(EMAIL_REGEX, raw_text)
    phone_match = re.search(PHONE_REGEX, raw_text)
    
    sections = _extract_sections(raw_text)
    
    return {
        "full_name": _extract_name_locally(raw_text),
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0) if phone_match else None,
        "location": _extract_location(raw_text),
        "skills": _extract_skills_locally(raw_text),
        "summary": sections["profile"],
        "education": sections["education"],
        "experience": sections["experience"],
        "certifications": sections["certifications"],
        "languages": ["Français" if "français" in raw_text.lower() else ""] + ["Anglais" if "anglais" in raw_text.lower() or "english" in raw_text.lower() else ""]
    }

# Compatibility wrappers
def ai_extract_cv(raw_text: str) -> dict: return local_extract_cv(raw_text)
def build_anthropic_extract_cv(raw_text: str) -> dict: return local_extract_cv(raw_text)

def save_cv_extraction(supabase: Client, cv_id: str, extracted: dict) -> dict:
    data = {
        "cv_id": cv_id,
        "full_name": extracted.get("full_name"),
        "email": extracted.get("email"),
        "phone": extracted.get("phone"),
        "skills": extracted.get("skills"),
        "raw_json": extracted,
    }
    response = supabase.table("cv_extractions").insert(data).execute()
    return response.data[0]

def build_profile_suggestion(extracted: dict) -> dict:
    full_name = extracted.get("full_name") or ""
    parts = full_name.split()
    
    # Try guessing intern based on CV content
    text_content = (extracted.get("experience", "") + extracted.get("summary", "")).lower()
    profile_type = "intern" if "stage" in text_content or "stagiaire" in text_content else "candidate"
    
    return {
        "type": profile_type,
        "first_name": parts[0] if parts else "",
        "last_name": " ".join(parts[1:]) if len(parts) > 1 else "",
        "email": extracted.get("email"),
        "phone": extracted.get("phone"),
        "address": extracted.get("location"),
    }
