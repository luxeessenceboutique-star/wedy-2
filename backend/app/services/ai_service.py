import anthropic
from app.config import settings

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    return _client


SYSTEM_PROMPT = """You are an expert HR document specialist for TYTHON, a Moroccan company.
You write and enhance formal HR documents in French, English, or Arabic.
Your documents must comply with Moroccan Labor Code (Code du Travail marocain).
Tone: formal, professional, legally precise.
Never invent facts — only work with information provided.
When enhancing, preserve all variable placeholders like {{variable_name}} as-is."""


def enhance_document(content: str, document_type: str, language: str = "fr", instructions: str = "") -> str:
    """Use Claude to improve/enhance a generated HR document."""
    lang_name = {"fr": "French", "en": "English", "ar": "Arabic"}.get(language, "French")
    extra = f"\nAdditional instructions: {instructions}" if instructions else ""

    message = get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Enhance the following {document_type} document written in {lang_name}. "
                    f"Keep the same structure but improve clarity, formality, and legal precision. "
                    f"Return ONLY the improved document text, no commentary.{extra}\n\n"
                    f"Document:\n{content}"
                ),
            }
        ],
    )
    return message.content[0].text


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


def convert_to_html_template(raw_text: str) -> str:
    """Use Claude to convert raw text from a document into a well-formatted HTML template."""
    try:
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is not set")
            
        message = get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Convert the following raw text from an HR document into a clean, professional, and well-structured HTML template. "
                        "Identify specific employee or document details (like names, dates, job titles, salaries, ID numbers, etc.) "
                        "and replace them with template variables in the format {{variable_name}}. "
                        "Use common variable names like: full_name, cin, cnss, job_title, department, hire_date, today, salary, address. "
                        "The HTML should only contain the content to be placed inside a <body> tag, no <html> or <head> tags. "
                        "Use inline CSS for styling (like text-align: center, font-weight: bold, margins, etc.) to make it look like a formal document. "
                        "Return ONLY the raw HTML string, without any markdown formatting or explanations.\n\n"
                        f"Raw Text:\n{raw_text}"
                    ),
                }
            ],
        )
        return message.content[0].text
    except Exception:
        return _local_convert_template(raw_text)

