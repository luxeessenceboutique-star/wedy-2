import anthropic
from app.config import settings

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY n'est pas configurée dans .env")
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


SYSTEM_PROMPT = """You are an expert HR document specialist for TYTHON, a Moroccan company.
You write and enhance formal HR documents in French, English, or Arabic.
Your documents must comply with Moroccan Labor Code (Code du Travail marocain).
Tone: formal, professional, legally precise.
Never invent facts — only work with information provided.
When enhancing, preserve all variable placeholders like {{variable_name}} as-is."""


def _enhance_prompt(content: str, document_type: str, language: str, instructions: str) -> tuple[str, str]:
    lang_name = {"fr": "French", "en": "English", "ar": "Arabic"}.get(language, "French")
    extra = f"\nAdditional instructions: {instructions}" if instructions else ""
    user = (
        f"The following {document_type} document may be written in a different language than the target. "
        f"Rewrite it entirely in {lang_name} (translate if needed), keeping the same structure, and improve "
        f"clarity, formality, and legal precision. Return ONLY the document text in {lang_name}, no commentary, "
        f"no notes, no markdown.{extra}\n\nDocument:\n{content}"
    )
    return SYSTEM_PROMPT, user


def enhance_document(content: str, document_type: str, language: str = "fr", instructions: str = "") -> str:
    """Improve/translate a generated HR document. Tries Claude first, then the OpenAI-compatible
    router (same fallback pattern as the Copilot chat) so the feature works with whichever key is configured."""
    system, user = _enhance_prompt(content, document_type, language, instructions)

    if settings.ANTHROPIC_API_KEY:
        message = get_client().messages.create(
            model="claude-sonnet-4-6", max_tokens=2048, system=system,
            messages=[{"role": "user", "content": user}],
        )
        return message.content[0].text

    if settings.OPENAI_API_KEY:
        from openai import OpenAI
        base = settings.OPENAI_BASE_URL or None
        if base and not base.rstrip("/").endswith("/v1"):
            base = base.rstrip("/") + "/v1"
        oa = OpenAI(api_key=settings.OPENAI_API_KEY, base_url=base)
        resp = oa.chat.completions.create(
            model=settings.OPENAI_MODEL, max_tokens=2048,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        )
        return resp.choices[0].message.content

    raise RuntimeError("No AI API key configured")


def extract_missing_variables(template: str, employee_data: dict) -> list[str]:
    """Use Claude to identify which variables are missing from employee data."""
    import re
    placeholders = re.findall(r"\{\{(\w+)\}\}", template)
    missing = [p for p in placeholders if not employee_data.get(p)]
    return missing


def suggest_document_content(
    document_type: str,
    employee_data: dict,
    language: str = "fr",
) -> str:
    """Ask Claude to draft a document when template is insufficient."""
    lang_name = {"fr": "French", "en": "English", "ar": "Arabic"}.get(language, "French")

    employee_info = "\n".join(
        f"- {k}: {v}" for k, v in employee_data.items() if v
    )

    message = get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Draft a formal {document_type} document in {lang_name} for TYTHON company "
                    f"based on the following employee information:\n{employee_info}\n\n"
                    f"The document must follow Moroccan Labor Code standards. "
                    f"Return only the document text."
                ),
            }
        ],
    )
    return message.content[0].text


def translate_document(content: str, target_language: str) -> str:
    """Translate a document to the target language while preserving formatting."""
    lang_name = {"fr": "French", "en": "English", "ar": "Arabic"}.get(target_language, "French")

    message = get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Translate the following HR document to {lang_name}. "
                    f"Preserve all formatting, structure, and any {{{{variable}}}} placeholders exactly as they are. "
                    f"Return only the translated document.\n\nDocument:\n{content}"
                ),
            }
        ],
    )
    return message.content[0].text


def _local_convert_template(raw_text: str) -> str:
    """Library-only fallback: convert raw PDF text to an HTML template with {{variables}}."""
    import re as _re

    # Use tuples of (pattern, replacement) — note: apostrophe handled with \\x27 or \\u2019
    subs = [
        (r"\[Nom et pr[ée]nom du stagiaire\]", "{{full_name}}"),
        (r"\[Nom et pr[ée]nom\s*\]",           "{{full_name}}"),
        (r"\[Nom et pr[ée]nom\]",              "{{full_name}}"),
        (r"\(Nom Pr[ée]nom\)",                 "{{full_name}}"),
        (r"\[Num[ée]ro CIN\]",                 "{{cin}}"),
        (r"\[CIN\s*\]",                        "{{cin}}"),
        (r"\(CIN\s*\)",                        "{{cin}}"),
        # apostrophe variants in "date d'embauche"
        (r"\[date d.embauche\]",               "{{hire_date}}"),
        (r"\[date de d[ée]but\]",              "{{contract_start}}"),
        (r"\[date de fin\s*/\s*.+?\]",         "{{contract_end}}"),
        (r"\[date de fin\]",                   "{{contract_end}}"),
        (r"\[poste occup[ée]\s*\]",            "{{position}}"),
        (r"\[ poste occup[ée] \]",             "{{position}}"),
        (r"\[poste\]",                         "{{position}}"),
        (r"\[montant en dirhams\s*\]",         "{{salary}}"),
        (r"\[Date\]",                          "{{today}}"),
        (r"\(adresse\s*\)",                    "{{address}}"),
        (r"\[adresse\]",                       "{{address}}"),
    ]

    text = raw_text
    for pat, rep in subs:
        text = _re.sub(pat, rep, text, flags=_re.IGNORECASE)

    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    parts = []
    for line in lines:
        low = line.lower()
        if len(line) < 65 and (line.isupper() or low.startswith("attestation") or low.startswith("contrat") or low.startswith("charte")):
            parts.append("<h2 style=\"text-align:center;font-size:18px;font-weight:bold;text-decoration:underline;margin:30px 0 40px;\">" + line + "</h2>")
        elif low.startswith("la soci") or low.startswith("je soussign"):
            parts.append("<p style=\"font-weight:bold;margin-bottom:20px;font-size:13px;line-height:1.6;\">" + line + "</p>")
        elif low.startswith("fait ") or low.startswith("signature"):
            parts.append("<p style=\"font-weight:bold;margin-top:40px;font-size:13px;\">" + line + "</p>")
        elif low.startswith("article"):
            parts.append("<p style=\"font-weight:bold;text-align:center;margin:20px 0 10px;font-size:13px;\">" + line + "</p>")
        else:
            parts.append("<p style=\"margin-bottom:15px;font-size:13px;line-height:1.7;\">" + line + "</p>")

    body = "\n  ".join(parts)
    header = (
        "<div style=\"font-family:'Times New Roman',serif;max-width:700px;margin:0 auto;padding:60px 40px;\">\n"
        "  <div style=\"margin-bottom:40px;padding-bottom:12px;border-bottom:2px solid #5b21b6;\">\n"
        "    <p style=\"font-size:26px;font-weight:900;color:#5b21b6;letter-spacing:4px;margin:0;font-family:Arial,sans-serif;\">TYTHON</p>\n"
        "    <p style=\"font-size:10px;color:#9ca3af;margin:2px 0;letter-spacing:2px;\">&#8212; INNOVATE NOW</p>\n"
        "  </div>\n  "
    )
    footer = (
        "\n  <div style=\"text-align:right;margin-top:60px;\">"
        "<p style=\"font-weight:bold;font-size:13px;\">Signature et cachet</p></div>\n</div>"
    )
    return header + body + footer


def convert_document_to_template(raw_text: str) -> str:
    """Public alias for the local regex+HTML template converter."""
    return _local_convert_template(raw_text)


FOLDER_ANALYSIS_SYSTEM = """You are an expert HR data extractor for a Moroccan company.
You receive text extracted from documents in an employee's folder (CV, diplomas, certificates, contracts, payslips, etc.).
Extract ONLY the information that is literally written in these documents and return it as a single valid JSON object.

Return ONLY a JSON object with these keys (omit every key whose value is not literally written in the documents):
{
  "full_name": "string",
  "cin": "string - Moroccan national ID",
  "birth_date": "YYYY-MM-DD",
  "nationality": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "city": "string",
  "position": "string - job title",
  "department": "string",
  "hire_date": "YYYY-MM-DD",
  "contract_type": "CDI|CDD|Stage|ANAPEC|Consultant|Freelance",
  "contract_start": "YYYY-MM-DD",
  "contract_end": "YYYY-MM-DD",
  "salary": number,
  "manager": "string",
  "cnss_number": "string",
  "bank_account": "string - RIB",
  "matricule": "string",
  "education": [{"degree": "string", "field": "string", "school": "string", "year": "string"}],
  "certifications": [{"name": "string", "issuer": "string", "year": "string"}],
  "skills": ["string"],
  "languages": ["string"],
  "notes": "string - any extra relevant info"
}

Rules:
- Return ONLY the raw JSON, no markdown, no explanation
- Copy values exactly as written. NEVER guess, infer, deduce, translate, complete or "improve" anything.
- If a value is not literally present in the documents, OMIT the key. An empty answer is better than a wrong one.
- Do NOT deduce: the department from a job title, the contract type from the context, the nationality from a name or a country,
  the hire date from a CV timeline, a salary, or a manager.
- "position" is only the job the person holds in THIS company, stated by a contract, work certificate or payslip.
  The jobs listed on a CV are previous experience, not the current position.
- Never write "notes".
- Dates must be in YYYY-MM-DD format; convert from French formats (ex: 15/03/1995 → 1995-03-15)
- salary must be a number (MAD/month), only when a contract or payslip states it"""

# Every extracted value is then checked against the documents' text (see _ground_extracted).


_FR_MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"]
_TEXT_FIELDS = ("full_name", "position", "department", "manager", "address", "city", "nationality", "notes")
_ID_FIELDS = ("cin", "matricule", "cnss_number", "bank_account")
_DATE_FIELDS = ("birth_date", "hire_date", "contract_start", "contract_end")


def _plain(value) -> str:
    import unicodedata
    text = unicodedata.normalize("NFD", str(value))
    return "".join(c for c in text if unicodedata.category(c) != "Mn").lower()


def _ground_extracted(data: dict, file_contents: list[dict]) -> dict:
    """Keep only what the documents really say.

    The model sometimes "completes" a record (department from a job title, a position taken from an old job,
    a made-up note). Each value is looked for in the documents' text:
      - all documents are text  -> an ungrounded value is removed (listed in `_removed`)
      - some are scans (images) -> it cannot be verified: kept but listed in `_unverified` (the UI never pre-selects it)
    """
    import re
    if not isinstance(data, dict):
        return {}
    hay = _plain(" ".join((fc.get("text") or "") for fc in file_contents))
    if not hay.strip():
        return data                                         # nothing readable to compare with (scans only)
    has_images = any(fc.get("images") for fc in file_contents)
    hay_words = set(re.findall("[a-z0-9]+", hay))
    hay_alnum = re.sub("[^a-z0-9]", "", hay)
    hay_digits = re.sub("[^0-9]", "", hay)

    def word_found(w: str) -> bool:
        return w in hay_words or (len(w) >= 6 and any(h.startswith(w[:-2]) for h in hay_words))

    def text_ok(val) -> bool:
        words = [w for w in re.findall("[a-z0-9]+", _plain(val)) if len(w) >= 3]
        return not words or sum(word_found(w) for w in words) / len(words) >= 0.75

    def date_ok(val) -> bool:
        m = re.fullmatch("([0-9]{4})-([0-9]{2})-([0-9]{2})", str(val).strip())
        if not m:
            return False
        y, mo, d = m.group(1), int(m.group(2)), int(m.group(3))
        forms = [f"{d:02d}/{mo:02d}/{y}", f"{d}/{mo}/{y}", f"{d:02d}-{mo:02d}-{y}", f"{d:02d}.{mo:02d}.{y}", f"{y}-{mo:02d}-{d:02d}",
                 f"{d} {_FR_MONTHS[mo - 1]} {y}", f"{d:02d} {_FR_MONTHS[mo - 1]} {y}"]
        return any(f in hay for f in forms) or f"{d:02d}{mo:02d}{y}" in hay_alnum

    def ok(key: str, val) -> bool:
        if val in (None, "", [], {}):
            return True
        if key in _TEXT_FIELDS:
            return text_ok(val)
        if key in _ID_FIELDS:
            token = re.sub("[^a-z0-9]", "", _plain(val))
            return len(token) >= 4 and token in hay_alnum
        if key == "phone":
            digits = re.sub("[^0-9]", "", str(val))
            return len(digits) >= 8 and digits[-9:] in hay_digits
        if key == "email":
            return _plain(val).strip() in hay
        if key in _DATE_FIELDS:
            return date_ok(val)
        if key == "salary":
            try:
                digits = str(int(float(val)))
            except (TypeError, ValueError):
                return False
            return len(digits) >= 3 and digits in hay_digits
        if key == "contract_type":
            return _plain(val).strip() in hay_words
        return True

    out, removed, unverified = {}, [], []
    for key, val in data.items():
        if key == "skills" and isinstance(val, list):
            out[key] = [x for x in val if text_ok(x)] if not has_images else val
        elif key == "languages" and isinstance(val, list):
            out[key] = [x for x in val if text_ok(x)] if not has_images else val
        elif key in ("education", "certifications") and isinstance(val, list):
            keep = [it for it in val if isinstance(it, dict) and any(text_ok(it.get(k)) for k in ("school", "degree", "name", "issuer") if it.get(k))]
            out[key] = keep if not has_images else val
        elif ok(key, val):
            out[key] = val
        elif has_images:
            out[key] = val
            unverified.append(key)
        else:
            removed.append(key)
    if removed:
        out["_removed"] = removed
    if unverified:
        out["_unverified"] = unverified
    return out


def analyze_employee_folder(file_contents: list[dict]) -> dict:
    """
    Send all extracted file content to AI and get structured employee data.
    file_contents: [{"filename": str, "file_type": str, "text": str, "images": [b64_str], "mime": str}]
    Tries Anthropic Claude first, falls back to OpenAI.
    """
    import json
    import os

    # Build shared text and collect images
    text_parts = ["Analyze these HR documents and extract all employee data:\n"]
    images_data: list[dict] = []

    for i, fc in enumerate(file_contents, 1):
        text_parts.append(f"\n=== Document {i}: {fc['filename']} ({fc['file_type']}) ===")
        if fc.get("text", "").strip():
            text_parts.append(fc["text"][:4000])
        for b64 in fc.get("images", [])[:3]:
            images_data.append({"b64": b64, "mime": fc.get("mime", "image/jpeg")})

    combined_text = "\n".join(text_parts)
    raw = ""

    # ── Anthropic Claude (primary) ────────────────────────────────
    anthropic_key = os.getenv("ANTHROPIC_API_KEY") or getattr(settings, "ANTHROPIC_API_KEY", "")
    if anthropic_key:
        import anthropic as _anthropic
        ac = _anthropic.Anthropic(api_key=anthropic_key)

        content: list[dict] = [{"type": "text", "text": combined_text}]
        for img in images_data[:5]:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": img["mime"],
                    "data": img["b64"],
                },
            })

        try:
            resp = ac.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                temperature=0.0,
                system=FOLDER_ANALYSIS_SYSTEM,
                messages=[{"role": "user", "content": content}],
            )
            raw = resp.content[0].text.strip()
        except Exception as e:
            raise RuntimeError(f"Analyse IA (Anthropic) échouée : {e}")

    # ── OpenAI fallback ───────────────────────────────────────────
    else:
        openai_key = os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", "")
        if not openai_key:
            raise RuntimeError(
                "Aucune clé API configurée. Ajoutez ANTHROPIC_API_KEY ou OPENAI_API_KEY dans .env"
            )
        from openai import OpenAI as _OpenAI
        base = os.getenv("OPENAI_BASE_URL") or getattr(settings, "OPENAI_BASE_URL", "") or None
        if base and not base.rstrip("/").endswith("/v1"):
            base = base.rstrip("/") + "/v1"
        oa = _OpenAI(api_key=openai_key, base_url=base)

        oa_content: list[dict] = [{"type": "text", "text": combined_text}]
        for img in images_data[:5]:
            oa_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{img['mime']};base64,{img['b64']}"},
            })

        try:
            model = os.getenv("OPENAI_MODEL") or getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
            resp = oa.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": FOLDER_ANALYSIS_SYSTEM},
                    {"role": "user",   "content": oa_content},
                ],
                max_tokens=2048,
                temperature=0.0,
            )
            raw = resp.choices[0].message.content.strip()
        except Exception as e:
            raise RuntimeError(f"Analyse IA (OpenAI) échouée : {e}")

    # ── Parse JSON ────────────────────────────────────────────────
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        parsed = json.loads(raw.strip())
    except json.JSONDecodeError:
        return {}
    return _ground_extracted(parsed, file_contents)


def convert_to_html_template(raw_text: str) -> str:
    """Legacy: convert raw text to HTML template (fallback only)."""
    return _local_convert_template(raw_text)


_HEADER_MAPPING_SYSTEM = """You are an expert HR data analyst. You will be given a list of
spreadsheet column headers (possibly in French, English, or Arabic, possibly abbreviated
or ambiguous) and a list of known employee-record field names.

For each header, decide which known field it most likely represents, or null if it does not
match any of them (e.g. it's clearly something else like a free-text comment column).

Return ONLY a single valid JSON object mapping each input header (exactly as given) to either
one of the known field names or null. No markdown, no explanation, no extra keys."""


def map_import_headers(headers: list[str], known_fields: list[str]) -> dict:
    """
    Ask the AI to map spreadsheet headers that couldn't be resolved by the
    deterministic synonym/fuzzy matcher (see app/services/import_service.py).
    Called once per import with only the *remaining ambiguous* headers, not
    once per column — keeps cost and latency low even for wide spreadsheets.

    Returns {header: field_name_or_None}. On any failure (no API key, bad
    JSON, request error) returns {} so the caller can fall back to leaving
    those headers unmapped (they end up in custom_fields).
    """
    if not headers:
        return {}

    prompt = (
        f"Known fields: {known_fields}\n\n"
        f"Headers to map: {headers}"
    )

    raw = ""
    try:
        anthropic_key = settings.ANTHROPIC_API_KEY
        if anthropic_key:
            client = get_client()
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=_HEADER_MAPPING_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = resp.content[0].text.strip()
        elif settings.OPENAI_API_KEY:
            from openai import OpenAI as _OpenAI
            base = settings.OPENAI_BASE_URL or None
            if base and not base.rstrip("/").endswith("/v1"):
                base = base.rstrip("/") + "/v1"
            oa = _OpenAI(api_key=settings.OPENAI_API_KEY, base_url=base)
            resp = oa.chat.completions.create(
                model=settings.OPENAI_MODEL or "gpt-4o-mini",
                messages=[
                    {"role": "system", "content": _HEADER_MAPPING_SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1024,
                temperature=0.0,
            )
            raw = resp.choices[0].message.content.strip()
        else:
            return {}
    except Exception:
        return {}

    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        import json
        result = json.loads(raw.strip())
        return result if isinstance(result, dict) else {}
    except json.JSONDecodeError:
        return {}


_CLEAN_SYSTEM = """You are an expert HR document formatter for TYTHON, a Moroccan company.

Your task is to take HTML extracted from a PDF or DOCX and return a CLEAN, PROFESSIONAL version that:
1. PRESERVES all original styling: fonts, sizes, bold, italic, alignment, colors, images, logos
2. REMOVES extraction artifacts: stray single letters (like lone "g", "f", etc.), duplicate blank lines, junk characters from PDF font encoding
3. REPLACES all data placeholders with {{variable_name}} format:
   - [Nom et prénom...] / [Nom complet] / (Nom Prénom) → {{full_name}}
   - [CIN...] / (CIN) → {{cin}}
   - [date d'embauche] / [date de début] → {{hire_date}} or {{contract_start}}
   - [date de fin...] → {{contract_end}}
   - [poste occupé] / [poste] / [fonction] → {{position}}
   - [département] / [service] → {{department}}
   - [salaire] / [montant...] / [rémunération] → {{salary}}
   - [adresse] / (adresse) → {{address}}
   - [ville] → {{city}}
   - [email] → {{email}}
   - [téléphone] / [tél] → {{phone}}
   - [matricule] → {{matricule}}
   - [type de contrat] / [nature du contrat] → {{contract_type}}
   - [nationalité] → {{nationality}}
   - [manager] / [responsable] → {{manager}}
   - [Date] / [date du jour] / [Date du jour] → {{today}}
   - [Nom et prénom du stagiaire] → {{full_name}}
   - Blank underscores "______" next to a known field → replace with the appropriate {{variable}}
4. DO NOT change any wording, paragraph structure, or visual layout
5. Return ONLY the raw HTML — no markdown, no explanation, no ```html wrapper"""


def clean_template_html(styled_html: str) -> str:
    """Use OpenAI (TybotFlow) to clean extraction artifacts and detect {{variables}}."""
    import os
    from openai import OpenAI as _OpenAI

    openai_key = os.getenv("OPENAI_API_KEY") or getattr(settings, "OPENAI_API_KEY", "")
    if not openai_key:
        return styled_html

    base = os.getenv("OPENAI_BASE_URL") or getattr(settings, "OPENAI_BASE_URL", "") or None
    if base and not base.rstrip("/").endswith("/v1"):
        base = base.rstrip("/") + "/v1"
    model = os.getenv("OPENAI_MODEL") or getattr(settings, "OPENAI_MODEL", "gpt-4.1-mini")

    prompt = (
        "Here is HTML extracted from an HR document. Clean it and replace all data fields "
        "with {{variable_name}} placeholders. Return only the cleaned HTML.\n\n"
        f"HTML:\n{styled_html[:12000]}"
    )

    try:
        oa = _OpenAI(api_key=openai_key, base_url=base)
        resp = oa.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _CLEAN_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=4096,
            temperature=0.0,
        )
        result = resp.choices[0].message.content.strip()
        if result.startswith("```"):
            result = result.split("```")[1]
            if result.startswith("html"):
                result = result[4:]
        return result.strip()
    except Exception:
        return styled_html

def complete(system: str, user: str, max_tokens: int = 800) -> str:
    """One short completion with whichever provider is configured (Claude first, then the
    OpenAI-compatible router) — the same fallback as enhance_document."""
    if settings.ANTHROPIC_API_KEY:
        message = get_client().messages.create(
            model="claude-sonnet-4-6", max_tokens=max_tokens, system=system,
            messages=[{"role": "user", "content": user}],
        )
        return message.content[0].text
    if settings.OPENAI_API_KEY:
        from openai import OpenAI
        base = settings.OPENAI_BASE_URL or None
        if base and not base.rstrip("/").endswith("/v1"):
            base = base.rstrip("/") + "/v1"
        oa = OpenAI(api_key=settings.OPENAI_API_KEY, base_url=base, timeout=60)
        resp = oa.chat.completions.create(
            model=settings.OPENAI_MODEL, max_tokens=max_tokens,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        )
        return resp.choices[0].message.content or ""
    raise RuntimeError("No AI API key configured")
