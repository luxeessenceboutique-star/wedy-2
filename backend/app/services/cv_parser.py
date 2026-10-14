"""
CV Parsing service — Library-based extraction
Uses PyMuPDF, pdfplumber, pytesseract, regex. No AI.
"""
import re
import os
import io
import base64
import tempfile
from pathlib import Path
from typing import Optional, List, Dict, Any
from supabase import Client
from loguru import logger


# ── Regex patterns ──────────────────────────────────────────────────────────

EMAIL_RE    = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_RE    = re.compile(r'(?:\+212|00212|0)[\s.\-]?[5-7]\d[\s.\-]?\d{2}[\s.\-]?\d{2}[\s.\-]?\d{2}')
LINKEDIN_RE = re.compile(r'linkedin\.com/in/[\w\-]+', re.I)
GITHUB_RE   = re.compile(r'github\.com/[\w\-]+', re.I)
DATE_RE     = re.compile(
    r'(?:jan|fév|mar|avr|mai|juin|juil|aoû|sep|oct|nov|déc|'
    r'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)'
    r'[\w.]*\s*\d{2,4}|\d{1,2}[/\-]\d{2,4}|\d{4}',
    re.I
)

NATIONALITY_WORDS = ['marocain', 'marocaine', 'français', 'française', 'algérien',
                     'tunisien', 'belge', 'suisse', 'canadien']
CITY_WORDS = ['casablanca', 'rabat', 'marrakech', 'agadir', 'tanger', 'fès', 'fes',
              'settat', 'khouribga', 'oujda', 'meknès', 'paris', 'lyon', 'montréal']
LANG_WORDS = {
    'français': 'Français', 'french': 'Français', 'arabe': 'Arabe', 'arabic': 'Arabe',
    'anglais': 'Anglais', 'english': 'Anglais', 'espagnol': 'Espagnol', 'spanish': 'Espagnol',
    'allemand': 'Allemand', 'german': 'Allemand', 'italien': 'Italien',
}
LEVEL_WORDS = {
    'natif': 'Natif', 'native': 'Natif', 'courant': 'Courant', 'fluent': 'Courant',
    'avancé': 'Avancé', 'advanced': 'Avancé', 'intermédiaire': 'Intermédiaire',
    'débutant': 'Débutant', 'basic': 'Débutant', 'b2': 'Avancé', 'b1': 'Intermédiaire',
    'c1': 'Courant', 'c2': 'Natif', 'a2': 'Débutant', 'a1': 'Débutant',
}
SKILLS_LIB = [
    'python','javascript','typescript','react','vue','angular','node','fastapi','django','flask',
    'sql','mysql','postgresql','mongodb','redis','docker','kubernetes','linux','git','aws','azure',
    'gcp','java','php','c++','c#','rust','go','swift','kotlin','r','matlab','excel','word','powerpoint',
    'sage','sap','erp','crm','jira','figma','photoshop','canva','marketing','seo','rh','recrutement',
    'comptabilité','finance','logistique','management','agile','scrum','devops','tensorflow','pytorch',
    'keras','data science','machine learning','nlp','blockchain','n8n','langchain','rag','chatgpt',
    'power bi','tableau','hadoop','spark','flutter','react native','spring','laravel','symfony',
]
SECTION_HEADERS = {
    'experience': ['expérience', 'experience', 'parcours professionnel', 'emploi', 'poste', 'travail'],
    'education':  ['formation', 'éducation', 'education', 'diplôme', 'scolarité', 'études', 'parcours académique'],
    'skills':     ['compétence', 'competence', 'skill', 'technologie', 'outil', 'savoir'],
    'languages':  ['langue', 'language'],
    'certifications': ['certification', 'certificate', 'certificat', 'licence', 'license'],
    'summary':    ['profil', 'profile', 'résumé', 'summary', 'objectif', 'à propos'],
    'interests':  ['intérêt', 'loisir', 'hobby', 'centre d\'intérêt'],
}


# ── PDF → text ───────────────────────────────────────────────────────────────

def extract_raw_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    try:
        if ext == '.pdf':
            import fitz
            doc = fitz.open(stream=file_bytes, filetype='pdf')
            text = '\n'.join(page.get_text() for page in doc)
            if len(text.strip()) < 80:  # scanned PDF / image-only: OCR every page
                text = _ocr_pdf(doc) or text
            return text
        elif ext in ('.docx', '.doc'):
            from docx import Document
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
                tmp.write(file_bytes); tmp_path = tmp.name
            doc = Document(tmp_path); os.unlink(tmp_path)
            return '\n'.join(p.text for p in doc.paragraphs)
        elif ext in ('.png', '.jpg', '.jpeg'):
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(file_bytes))
            return pytesseract.image_to_string(img, lang='fra+eng+ara')
    except Exception as e:
        logger.error(f'Text extraction failed: {e}')
    return ''


def _ocr_pdf(doc) -> str:
    """OCR every page of a PDF that has no usable text layer."""
    try:
        import fitz
        import pytesseract
        from PIL import Image
        out = []
        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(200 / 72, 200 / 72), alpha=False)
            img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            out.append(pytesseract.image_to_string(img, lang='fra+eng+ara'))
        return '\n'.join(out)
    except Exception as e:
        logger.warning(f'PDF OCR failed: {e}')
        return ''


# ── PDF → page images (base64 PNG) ───────────────────────────────────────────

def extract_pages_as_images(file_bytes: bytes, filename: str, dpi: int = 150) -> List[str]:
    """Convert each PDF page to a base64-encoded PNG."""
    ext = Path(filename).suffix.lower()
    pages_b64 = []

    if ext == '.pdf':
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype='pdf')
            for page in doc:
                mat = fitz.Matrix(dpi / 72, dpi / 72)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_bytes = pix.tobytes('png')
                pages_b64.append(base64.b64encode(img_bytes).decode())
        except Exception as e:
            logger.error(f'Page image extraction failed: {e}')
    elif ext in ('.png', '.jpg', '.jpeg'):
        pages_b64.append(base64.b64encode(file_bytes).decode())

    return pages_b64


# ── Profile photo extraction from PDF ────────────────────────────────────────

def extract_photo(file_bytes: bytes, filename: str) -> Optional[str]:
    """
    Extract a profile photo from a PDF CV.
    Returns a complete data-URL  (data:image/...;base64,...) or None.
    Prefers portrait-oriented images; skips tiny icons and huge backgrounds.
    """
    file_ext = Path(filename).suffix.lower()
    # For image files, the whole file IS the photo
    if file_ext in ('.jpg', '.jpeg', '.png', '.webp'):
        mime = 'jpeg' if file_ext in ('.jpg', '.jpeg') else file_ext.lstrip('.')
        return f"data:image/{mime};base64,{base64.b64encode(file_bytes).decode()}"
    if file_ext != '.pdf':
        return None
    try:
        import fitz
        doc = fitz.open(stream=file_bytes, filetype='pdf')

        candidates = []
        for page in doc:
            for img_tuple in page.get_images(full=True):
                xref = img_tuple[0]
                try:
                    base_image = doc.extract_image(xref)
                    img_bytes = base_image['image']
                    w, h = base_image['width'], base_image['height']
                    img_ext = base_image.get('ext', 'jpeg').lower()
                    if img_ext == 'jpx':
                        img_ext = 'jpeg'

                    # Skip tiny icons (< 30px) and full-page backgrounds (> 900px)
                    if w < 30 or h < 30 or w > 900 or h > 900:
                        continue
                    # Skip very wide images (banners, logos are wider than tall)
                    aspect = w / h if h > 0 else 1
                    if aspect > 1.5:  # too wide → likely a logo/header, not a face
                        continue

                    # Score: prefer portrait (aspect < 1), medium size
                    portrait_bonus = 1.5 if aspect < 1.0 else 1.0
                    size_score = min(w, h) * portrait_bonus
                    candidates.append((size_score, img_bytes, img_ext))
                except Exception:
                    continue

        if not candidates:
            return None

        # Best candidate = highest score
        candidates.sort(key=lambda c: c[0], reverse=True)
        _, best_bytes, best_ext = candidates[0]
        b64 = base64.b64encode(best_bytes).decode()
        return f"data:image/{best_ext};base64,{b64}"

    except Exception as e:
        logger.warning(f'Photo extraction failed: {e}')
    return None


# ── Zone OCR (bounding box on page image) ────────────────────────────────────

def ocr_zone(file_bytes: bytes, filename: str, page_num: int,
             x_frac: float, y_frac: float, w_frac: float, h_frac: float) -> str:
    """OCR a rectangular zone of a PDF page. Coordinates are fractions [0,1]."""
    try:
        import fitz, pytesseract
        from PIL import Image

        ext = Path(filename).suffix.lower()
        if ext == '.pdf':
            doc = fitz.open(stream=file_bytes, filetype='pdf')
            if page_num >= len(doc):
                return ''
            page = doc[page_num]
            # Full page at 150 dpi
            mat = fitz.Matrix(150 / 72, 150 / 72)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        elif ext in ('.png', '.jpg', '.jpeg'):
            img = Image.open(io.BytesIO(file_bytes))
        else:
            return ''

        iw, ih = img.size
        x1 = int(x_frac * iw); y1 = int(y_frac * ih)
        x2 = int((x_frac + w_frac) * iw); y2 = int((y_frac + h_frac) * ih)
        crop = img.crop((x1, y1, x2, y2))

        # Upscale for better OCR
        scale = max(1, 200 // max(crop.width, crop.height, 1))
        if scale > 1:
            crop = crop.resize((crop.width * scale, crop.height * scale), Image.LANCZOS)

        text = pytesseract.image_to_string(crop, lang='fra+eng+ara')
        return text.strip()
    except Exception as e:
        logger.error(f'Zone OCR failed: {e}')
        return ''


# ── Structured field extraction ───────────────────────────────────────────────

def _detect_sections(lines: List[str]) -> Dict[str, List[str]]:
    """Split raw text lines into named sections."""
    sections: Dict[str, List[str]] = {k: [] for k in SECTION_HEADERS}
    sections['other'] = []
    current = 'other'

    for line in lines:
        stripped = line.strip()
        low = stripped.lower()
        if not stripped:
            continue

        matched = False
        if len(stripped) < 40:
            for sec, kws in SECTION_HEADERS.items():
                if any(low.startswith(kw) or low == kw for kw in kws):
                    current = sec
                    matched = True
                    break
        if not matched:
            sections[current].append(stripped)

    return sections


def _parse_experience_blocks(lines: List[str]) -> List[Dict]:
    """Parse experience lines into structured job entries."""
    jobs = []
    current: Dict[str, Any] = {}

    for line in lines:
        low = line.lower()
        dates = DATE_RE.findall(line)
        # Detect a new job block: line with dates or looks like a title/company
        if dates and len(line) < 80:
            if current:
                jobs.append(current)
            current = {'title': '', 'company': '', 'dates': ' - '.join(dates[:2]), 'description': ''}
            # Remove dates from line to get title/company
            clean = DATE_RE.sub('', line).strip(' -–|•')
            parts = re.split(r'[|@–\-]{1,2}', clean)
            if len(parts) >= 2:
                current['title']   = parts[0].strip()
                current['company'] = parts[1].strip()
            elif parts:
                current['title'] = parts[0].strip()
        elif current:
            if current['description']:
                current['description'] += ' ' + line
            else:
                current['description'] = line

    if current:
        jobs.append(current)
    return [j for j in jobs if j.get('title') or j.get('company')]


def _parse_education_blocks(lines: List[str]) -> List[Dict]:
    """Parse education lines into structured entries."""
    items = []
    current: Dict[str, Any] = {}

    for line in lines:
        dates = DATE_RE.findall(line)
        if dates:
            if current:
                items.append(current)
            clean = DATE_RE.sub('', line).strip(' -–|•')
            parts = re.split(r'[|@–\-]{1,2}', clean)
            current = {
                'degree': parts[0].strip() if parts else line,
                'institution': parts[1].strip() if len(parts) > 1 else '',
                'dates': ' - '.join(dates[:2]),
            }
        elif current and line.strip():
            if not current.get('institution'):
                current['institution'] = line.strip()
        elif line.strip():
            items.append({'degree': line.strip(), 'institution': '', 'dates': ''})

    if current:
        items.append(current)
    return [i for i in items if i.get('degree')]


def _extract_languages(lines: List[str], full_text: str) -> List[Dict]:
    """Extract language + level pairs."""
    found: Dict[str, str] = {}
    # From dedicated section lines
    for line in lines:
        low = line.lower()
        for lang_kw, lang_label in LANG_WORDS.items():
            if lang_kw in low:
                level = 'Non précisé'
                for lv_kw, lv_label in LEVEL_WORDS.items():
                    if lv_kw in low:
                        level = lv_label
                        break
                found[lang_label] = level
    # Fallback: scan full text
    if not found:
        low_text = full_text.lower()
        for lang_kw, lang_label in LANG_WORDS.items():
            if lang_kw in low_text:
                found[lang_label] = 'Non précisé'
    return [{'name': k, 'level': v} for k, v in found.items()]


def _extract_skills(lines: List[str], full_text: str) -> List[str]:
    """Extract skills from dedicated section + full text scan."""
    found = set()
    # Scan lines from skills section
    for line in lines:
        for skill in SKILLS_LIB:
            if re.search(rf'\b{re.escape(skill)}\b', line.lower()):
                found.add(skill.title())
    # Also scan full text
    low = full_text.lower()
    for skill in SKILLS_LIB:
        if re.search(rf'\b{re.escape(skill)}\b', low):
            found.add(skill.title())
    return sorted(found)


def _extract_certifications(lines: List[str]) -> List[str]:
    certs = []
    for line in lines:
        clean = line.strip(' •-–*')
        if clean and len(clean) > 3:
            certs.append(clean)
    return certs


def _extract_name(lines: List[str]) -> Optional[str]:
    for line in lines[:6]:
        stripped = line.strip()
        if not stripped or '@' in stripped or '+' in stripped:
            continue
        if len(stripped) < 50:
            words = stripped.split()
            if 2 <= len(words) <= 4 and all(
                w[0].isupper() or not w[0].isalpha() for w in words if w
            ):
                return stripped
    return lines[0].strip() if lines else None


def _extract_address(lines: List[str]) -> Optional[str]:
    for line in lines[:20]:
        low = line.lower()
        if any(city in low for city in CITY_WORDS):
            return line.strip()
    return None


def _extract_nationality(full_text: str) -> Optional[str]:
    low = full_text.lower()
    for word in NATIONALITY_WORDS:
        if word in low:
            return word.capitalize()
    return None


# ── Main extraction function ──────────────────────────────────────────────────

def local_extract_cv(raw_text: str) -> dict:
    """Full structured extraction using regex + heuristics."""
    lines = [l for l in raw_text.split('\n') if l.strip()]
    sections = _detect_sections(lines)

    email    = EMAIL_RE.search(raw_text)
    phone    = PHONE_RE.search(raw_text)
    linkedin = LINKEDIN_RE.search(raw_text)
    github   = GITHUB_RE.search(raw_text)

    return {
        'full_name':      _extract_name(lines),
        'email':          email.group(0) if email else None,
        'phone':          phone.group(0) if phone else None,
        'address':        _extract_address(lines),
        'nationality':    _extract_nationality(raw_text),
        'linkedin':       linkedin.group(0) if linkedin else None,
        'github':         github.group(0) if github else None,
        'summary':        ' '.join(sections.get('summary', [])),
        'experience':     _parse_experience_blocks(sections.get('experience', [])),
        'education':      _parse_education_blocks(sections.get('education', [])),
        'skills':         _extract_skills(sections.get('skills', []), raw_text),
        'languages':      _extract_languages(sections.get('languages', []), raw_text),
        'certifications': _extract_certifications(sections.get('certifications', [])),
        'interests':      ' '.join(sections.get('interests', [])),
    }


# ── AI extraction (Claude vision + text) ─────────────────────────────────────

_AI_SYSTEM = """You are an expert CV/resume parser for an HR platform.
You receive the page images of a CV and the text extracted from it (possibly noisy or incomplete).
Read the CV carefully, including sidebars, columns, headers and footers, and extract EVERYTHING.
Rules:
- full_name is the person's real name (never a section title like CONTACT, PROFIL, CV).
- Never invent data. Use null / empty list when something is absent.
- Keep the CV's original language. Keep dates as written (e.g. "15/05/2026 - 15/08/2026").
- experience: every job/internship/project, most recent first. description = the bullet points joined by " ; " and the technologies if listed.
- skills: every individual skill/technology/tool as its own short string (no categories, no duplicates).
- languages: spoken languages with level (Natif, Courant, Avancé, Intermédiaire, Débutant) when stated.
Return ONLY a JSON object, no markdown, with exactly these keys:
{"full_name":str|null,"email":str|null,"phone":str|null,"address":str|null,"nationality":str|null,
"linkedin":str|null,"github":str|null,"portfolio":str|null,"date_of_birth":str|null,"job_title":str|null,
"summary":str,
"experience":[{"title":str,"company":str,"dates":str,"description":str}],
"education":[{"degree":str,"institution":str,"dates":str}],
"skills":[str],"languages":[{"name":str,"level":str}],
"certifications":[str],"interests":str}"""


def _parse_json_reply(text: str) -> dict:
    import json
    text = text.strip()
    start, end = text.find('{'), text.rfind('}')
    return json.loads(text[start:end + 1])


def _ai_anthropic(raw_text: str, pages_b64: List[str]) -> dict:
    import anthropic
    from app.config import settings
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    content: list = [
        {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/png', 'data': b64}}
        for b64 in pages_b64[:4]
    ]
    content.append({'type': 'text', 'text': _AI_USER.format(text=raw_text[:12000])})
    msg = client.messages.create(
        model=settings.CV_AI_MODEL, max_tokens=4096, system=_AI_SYSTEM,
        messages=[{'role': 'user', 'content': content}],
    )
    return _parse_json_reply(''.join(b.text for b in msg.content if getattr(b, 'type', '') == 'text'))


def _ai_openai(raw_text: str, pages_b64: List[str]) -> dict:
    """OpenAI-compatible endpoint (OPENAI_BASE_URL / OPENAI_MODEL)."""
    from openai import OpenAI
    from app.config import settings
    client = OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL or None, timeout=120)
    content: list = [
        {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{b64}'}}
        for b64 in pages_b64[:4]
    ]
    content.append({'type': 'text', 'text': _AI_USER.format(text=raw_text[:12000])})
    res = client.chat.completions.create(
        model=settings.OPENAI_MODEL or 'gpt-4.1-mini',
        temperature=0,
        messages=[{'role': 'system', 'content': _AI_SYSTEM}, {'role': 'user', 'content': content}],
    )
    return _parse_json_reply(res.choices[0].message.content or '')


_AI_USER = 'Extracted text (may be noisy):\n"""\n{text}\n"""\n\nReturn the JSON.'


def ai_extract_cv_vision(raw_text: str, pages_b64: List[str]) -> Optional[dict]:
    """Extract structured CV data with an LLM (page images + text). Tries Anthropic, then OpenAI-compatible."""
    from app.config import settings
    providers = []
    if settings.ANTHROPIC_API_KEY:
        providers.append(('anthropic', _ai_anthropic))
    if settings.OPENAI_API_KEY:
        providers.append(('openai', _ai_openai))
    for name, fn in providers:
        try:
            return fn(raw_text, pages_b64)
        except Exception as e:
            logger.error(f'AI CV extraction failed ({name}): {e}')
    return None


def _clean_ai(d: dict) -> dict:
    def s(v):
        return v.strip() if isinstance(v, str) and v.strip() else None
    skills: List[str] = []
    for x in d.get('skills') or []:
        x = s(x)
        if x and x.lower() not in {k.lower() for k in skills}:
            skills.append(x)
    return {
        'full_name': s(d.get('full_name')), 'email': s(d.get('email')), 'phone': s(d.get('phone')),
        'address': s(d.get('address')), 'nationality': s(d.get('nationality')),
        'linkedin': s(d.get('linkedin')), 'github': s(d.get('github')),
        'portfolio': s(d.get('portfolio')), 'date_of_birth': s(d.get('date_of_birth')),
        'job_title': s(d.get('job_title')),
        'summary': s(d.get('summary')) or '',
        'experience': [
            {'title': e.get('title') or '', 'company': e.get('company') or '',
             'dates': e.get('dates') or '', 'description': e.get('description') or ''}
            for e in d.get('experience') or [] if isinstance(e, dict) and (e.get('title') or e.get('company'))
        ],
        'education': [
            {'degree': e.get('degree') or '', 'institution': e.get('institution') or '', 'dates': e.get('dates') or ''}
            for e in d.get('education') or [] if isinstance(e, dict) and (e.get('degree') or e.get('institution'))
        ],
        'skills': skills,
        'languages': [
            {'name': l.get('name') or '', 'level': l.get('level') or 'Non précisé'}
            for l in d.get('languages') or [] if isinstance(l, dict) and l.get('name')
        ],
        'certifications': [c.strip() for c in d.get('certifications') or [] if isinstance(c, str) and c.strip()],
        'interests': s(d.get('interests')) or '',
    }


def smart_extract_cv(raw_text: str, pages_b64: List[str]) -> dict:
    """AI extraction first; regex extraction fills whatever the AI left empty."""
    local = local_extract_cv(raw_text)
    ai = ai_extract_cv_vision(raw_text, pages_b64)
    if not ai:
        local['ai_used'] = False
        return local
    merged = _clean_ai(ai)
    for k, v in local.items():
        if k != 'nationality' and not merged.get(k) and v:
            merged[k] = v
    merged['ai_used'] = True
    return merged


# ── Compatibility wrappers ────────────────────────────────────────────────────

def ai_extract_cv(raw_text: str) -> dict:          return local_extract_cv(raw_text)
def build_anthropic_extract_cv(raw_text: str):     return local_extract_cv(raw_text)


def save_cv_extraction(supabase: Client, cv_id: str, extracted: dict) -> dict:
    data = {
        'cv_id':      cv_id,
        'full_name':  extracted.get('full_name'),
        'email':      extracted.get('email'),
        'phone':      extracted.get('phone'),
        'skills':     extracted.get('skills'),
        'raw_json':   extracted,
    }
    res = supabase.table('cv_extractions').insert(data).execute()
    return res.data[0] if res.data else data


def build_profile_suggestion(extracted: dict) -> dict:
    full_name = extracted.get('full_name') or ''
    parts = full_name.split()
    return {
        'type':       'candidate',
        'first_name': parts[0] if parts else '',
        'last_name':  ' '.join(parts[1:]) if len(parts) > 1 else '',
        'email':      extracted.get('email'),
        'phone':      extracted.get('phone'),
        'address':    extracted.get('address'),
    }
