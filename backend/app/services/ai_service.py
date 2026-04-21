import anthropic
from app.config import settings

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
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
