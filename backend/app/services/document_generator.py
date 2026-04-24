"""Document generator service — Template rendering + PDF/DOCX export (Supabase SDK Version)"""
import re
from datetime import date, datetime
from io import BytesIO
from supabase import Client

from docx import Document as DocxDocument
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from jinja2 import Environment, BaseLoader

from app.config import settings


# ──────────────────────────────────────────────────────────────────────────────
# Template filling
# ──────────────────────────────────────────────────────────────────────────────
def _format_date(value) -> str:
    if not value:
        return ""
    if isinstance(value, (date, datetime)):
        return value.strftime("%d/%m/%Y")
    try:
        return datetime.fromisoformat(str(value)).strftime("%d/%m/%Y")
    except Exception:
        return str(value)


def fill_template(body_template: str, variables: dict) -> str:
    """Replace {{variable}} placeholders with actual values using Jinja2."""
    today = date.today().strftime("%d/%m/%Y")
    ctx = {"today": today, **variables}

    date_fields = {"hire_date", "contract_start", "contract_end",
                   "internship_start", "internship_end", "birth_date"}
    for key in date_fields:
        if key in ctx:
            ctx[key] = _format_date(ctx[key])

    if "salary" in ctx and ctx["salary"] is not None:
        try:
            ctx["salary"] = f"{float(ctx['salary']):,.2f} MAD"
        except (TypeError, ValueError):
            pass

    env = Environment(loader=BaseLoader(), variable_start_string="{{", variable_end_string="}}")
    try:
        return env.from_string(body_template).render(**ctx)
    except Exception:
        def replacer(match: re.Match) -> str:
            key = match.group(1).strip()
            return str(ctx.get(key, match.group(0)))
        return re.sub(r"\{\{(\w+)\}\}", replacer, body_template)


def build_context_from_profile(profile: dict, extra_vars: dict = None) -> dict:
    """Build the template variable context from a Profile dictionary (from Supabase SDK)."""
    ctx = {}
    if profile:
        ctx["full_name"] = f"{profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip()
        ctx["first_name"] = profile.get("first_name") or ""
        ctx["last_name"] = profile.get("last_name") or ""
        ctx["email"] = profile.get("email") or ""
        ctx["phone"] = profile.get("phone") or ""
        ctx["cin"] = profile.get("cin") or ""
        ctx["address"] = profile.get("address") or ""

        # Handle nested employee/intern data if present in profile dict
        employee = profile.get("employees")
        if isinstance(employee, list) and employee:
            employee = employee[0]
            
        if employee:
            ctx["hire_date"] = employee.get("hire_date")
            ctx["salary"] = employee.get("salary")
            ctx["status"] = employee.get("status") or ""
            
            position = employee.get("positions")
            if isinstance(position, list) and position:
                position = position[0]
                
            if position:
                ctx["position"] = position.get("title") or ""
                dept = position.get("departments")
                if isinstance(dept, list) and dept:
                    dept = dept[0]
                if dept:
                    ctx["department"] = dept.get("name") or ""

        intern = profile.get("interns")
        if isinstance(intern, list) and intern:
            intern = intern[0]
            
        if intern:
            ctx["school"] = intern.get("school") or ""
            ctx["internship_start"] = intern.get("internship_start")
            ctx["internship_end"] = intern.get("internship_end")
            ctx["supervisor"] = intern.get("supervisor") or ""

    if extra_vars:
        ctx.update(extra_vars)
    return ctx


# ──────────────────────────────────────────────────────────────────────────────
# PDF/DOCX generation (unchanged logic)
# ──────────────────────────────────────────────────────────────────────────────

def generate_pdf_bytes(content: str, title: str = "Document RH") -> bytes:
    from weasyprint import HTML
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body {{ font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11pt; line-height: 1.6; padding: 2cm; }}
    .header {{ border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; margin-bottom: 20px; }}
    .content {{ white-space: pre-wrap; }}
    </style></head><body>
    <div class="header">TYTHON - {title}</div>
    <div class="content">{content}</div>
    </body></html>"""
    return HTML(string=html).write_pdf()

def generate_docx_bytes(content: str, title: str = "Document RH") -> bytes:
    doc = DocxDocument()
    doc.add_heading(title, 0)
    for line in content.split("\n"):
        doc.add_paragraph(line)
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()

def generate_document(
    supabase: Client,
    template: dict,
    profile: dict,
    extra_vars: dict = None,
    output_format: str = "pdf",
) -> tuple[bytes, str]:
    ctx = build_context_from_profile(profile, extra_vars)
    
    # Try body_template first (new), then content (old)
    template_text = template.get("body_template") or template.get("content") or ""
    rendered = fill_template(template_text, ctx)

    # Try name_fr first (new), then name (old)
    doc_title = template.get("name_fr") or template.get("name") or "Document"

    if output_format == "docx":
        data = generate_docx_bytes(rendered, doc_title)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        data = generate_pdf_bytes(rendered, doc_title)
        media_type = "application/pdf"

    return data, media_type
