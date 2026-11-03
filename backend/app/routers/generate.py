"""Document generation router — uses employees table directly."""
import re
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from supabase import Client

from app.services import app_settings
from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action
from app.repositories import generated_document_repository

router = APIRouter(prefix="/documents", tags=["Generate"])

# ── Request / Response schemas ────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    employee_id: str
    template_id: str
    language: str = "fr"
    use_ai_enhancement: bool = False
    extra_variables: Optional[dict] = None


# ── Context builder from employees table ──────────────────────────────────────

def _fmt_date(val) -> str:
    if not val:
        return ""
    try:
        from datetime import datetime
        return datetime.fromisoformat(str(val)).strftime("%d/%m/%Y")
    except Exception:
        return str(val)


def build_context(emp: dict, extra: dict = None, company: Optional[dict] = None) -> dict:
    co = company or app_settings.DEFAULTS["company"]
    ctx = {
        "company":          co.get("name") or "",
        "company_address":  co.get("address") or "",
        "company_city":     co.get("city") or "",
        "company_phone":    co.get("phone") or "",
        "company_email":    co.get("email") or "",
        "company_ice":      co.get("ice") or "",
        "company_rc":       co.get("rc") or "",
        "company_if":       co.get("if") or "",
        "company_cnss":     co.get("cnss") or "",
        "today":            date.today().strftime("%d/%m/%Y"),
        "full_name":        emp.get("full_name") or "",
        "cin":              emp.get("cin") or "",
        "email":            emp.get("email") or "",
        "phone":            emp.get("phone") or "",
        "address":          emp.get("address") or "",
        "city":             emp.get("city") or "",
        "nationality":      emp.get("nationality") or "",
        "position":         emp.get("position") or "",
        "department":       emp.get("department") or "",
        "manager":          emp.get("manager") or "",
        "matricule":        emp.get("matricule") or "",
        "status":           emp.get("status") or "",
        "contract_type":    emp.get("contract_type") or "",
        "hire_date":        _fmt_date(emp.get("hire_date")),
        "contract_start":   _fmt_date(emp.get("contract_start") or emp.get("hire_date")),
        "contract_end":     _fmt_date(emp.get("contract_end")) or "à ce jour",
        "internship_start": _fmt_date(emp.get("internship_start")),
        "internship_end":   _fmt_date(emp.get("internship_end")) or "à ce jour",
        "birth_date":       _fmt_date(emp.get("birth_date")),
        "notes":            emp.get("notes") or "",
    }
    sal = emp.get("salary")
    if sal is not None:
        try:
            ctx["salary"] = f"{float(sal):,.2f} MAD"
        except Exception:
            ctx["salary"] = str(sal)
    else:
        ctx["salary"] = ""

    if extra:
        ctx.update(extra)
    return ctx


# ── Template renderer ─────────────────────────────────────────────────────────

def render_template(body: str, ctx: dict) -> str:
    """Jinja2 render with {{var}} syntax, with regex fallback."""
    try:
        from jinja2 import Environment, BaseLoader
        env = Environment(loader=BaseLoader(),
                          variable_start_string="{{", variable_end_string="}}")
        return env.from_string(body).render(**ctx)
    except Exception:
        def repl(m):
            return str(ctx.get(m.group(1).strip(), m.group(0)))
        return re.sub(r"\{\{\s*(\w+)\s*\}\}", repl, body)


# ── Generate endpoint ─────────────────────────────────────────────────────────

@router.post("/generate", status_code=201)
def generate_doc(
    payload: GenerateRequest,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    # 1. Fetch template
    t_res = generated_document_repository.get_template(supabase, payload.template_id)
    if not t_res.data:
        raise HTTPException(status_code=404, detail="Template introuvable")
    template = t_res.data

    # 2. Fetch employee
    e_res = generated_document_repository.get_employee(supabase, payload.employee_id)
    if not e_res.data:
        raise HTTPException(status_code=404, detail="Employé introuvable")
    employee = e_res.data

    # 3. Build context and render
    ctx = build_context(employee, payload.extra_variables or {}, app_settings.load(supabase)[0]["company"])
    content = render_template(template.get("body_template", ""), ctx)

    # 4. Optional AI enhancement
    ai_enhanced = False
    if payload.use_ai_enhancement:
        try:
            from app.services.ai_service import enhance_document
            content = enhance_document(content, template.get("name_fr", "document"), payload.language)
            ai_enhanced = True
        except Exception as e:
            print(f"[generate] AI enhancement unavailable, using rendered template as-is: {e}")

    # 5. Persist to generated_documents
    doc_data = {
        "employee_id":   payload.employee_id,
        "template_id":   payload.template_id,
        "document_type": template.get("name_fr", "document"),
        "content":       content,
        "language":      payload.language,
    }
    try:
        ins = generated_document_repository.create_generated_document(supabase, doc_data)
        doc = ins.data[0] if ins.data else doc_data
    except Exception:
        doc = {**doc_data, "id": "local", "created_at": str(date.today())}

    # 6. Save as physical file in employee's folder (like uploaded files)
    try:
        import os, uuid
        from weasyprint import HTML
        from app.config import settings
        
        # Convert HTML to PDF bytes
        pdf_bytes = HTML(string=content).write_pdf()
        
        # Determine paths
        safe_name = f"{uuid.uuid4().hex}.pdf"
        emp_dir = os.path.join(settings.UPLOAD_DIR, "employees", str(payload.employee_id))
        os.makedirs(emp_dir, exist_ok=True)
        file_path_rel = os.path.join("employees", str(payload.employee_id), safe_name)
        full_path = os.path.join(settings.UPLOAD_DIR, file_path_rel)
        
        # Write to disk
        with open(full_path, "wb") as f:
            f.write(pdf_bytes)
            
        # Record in employee_files
        record = {
            "employee_id": str(payload.employee_id),
            "name": f"{doc_data['document_type']}_{date.today().isoformat()}.pdf",
            "file_type": "autre",  # Generic type for generated docs
            "file_path": file_path_rel.replace("\\", "/"),
            "file_size": len(pdf_bytes),
            "mime_type": "application/pdf",
            "uploaded_by": current_user["id"],
        }
        res = generated_document_repository.create_employee_file(supabase, record)
        if res.data:
            log_action(supabase, current_user["id"], "UPLOAD_FILE_GENERATED", "employee_file", res.data[0]["id"])
    except Exception as e:
        print(f"Failed to save physical file to employee folder: {e}")

    log_action(supabase, current_user["id"], "GENERATE_DOCUMENT", "generated_documents",
               doc.get("id", ""))

    return {"document": doc, "content": content, "ai_enhanced": ai_enhanced}


# ── DOCX download ─────────────────────────────────────────────────────────────

def _html_to_docx_bytes(html_content: str) -> bytes:
    """Convert HTML content to a DOCX file and return bytes."""
    import re as _re
    from io import BytesIO
    from docx import Document as DocxDoc
    from docx.shared import Pt, Cm
    from html.parser import HTMLParser

    class _P(HTMLParser):
        def __init__(self, doc):
            super().__init__()
            self._d = doc
            self._para = None
            self._bold = False
            self._italic = False
            self._under = False
            self._fsize: float | None = None
            self._skip_tag: str | None = None

        def _para_open(self, align: int = 0):
            self._para = self._d.add_paragraph()
            self._para.alignment = align

        def handle_starttag(self, tag, attrs):
            if self._skip_tag:
                return
            tag = tag.lower()
            if tag in ('script', 'style', 'head'):
                self._skip_tag = tag
                return
            a = dict(attrs)
            style = a.get('style', '')
            align = (1 if 'center' in style else
                     2 if 'text-align:right' in style.replace(' ', '') else
                     3 if 'justify' in style else 0)
            if tag in ('h1', 'h2', 'h3', 'h4'):
                self._para_open(1)
                self._bold = True
                self._fsize = [22, 17, 14, 13][min(int(tag[1]) - 1, 3)]
            elif tag in ('p', 'div', 'section'):
                self._para_open(align)
            elif tag in ('strong', 'b'):
                self._bold = True
            elif tag in ('em', 'i'):
                self._italic = True
            elif tag == 'u':
                self._under = True
            elif tag == 'br':
                if self._para:
                    self._para.add_run('\n')
            elif tag == 'hr':
                self._d.add_paragraph('─' * 55)
                self._para = None
            elif tag == 'span':
                m = _re.search(r'font-size:\s*([\d.]+)pt', style)
                if m:
                    self._fsize = float(m.group(1))
                if 'bold' in style:
                    self._bold = True
                if 'italic' in style:
                    self._italic = True
                if 'underline' in style:
                    self._under = True

        def handle_endtag(self, tag):
            tag = tag.lower()
            if self._skip_tag == tag:
                self._skip_tag = None
                return
            if self._skip_tag:
                return
            if tag in ('h1', 'h2', 'h3', 'h4', 'p', 'div', 'section'):
                self._bold = False
                self._fsize = None
                self._para = None
            elif tag in ('strong', 'b'):
                self._bold = False
            elif tag in ('em', 'i'):
                self._italic = False
            elif tag == 'u':
                self._under = False
            elif tag == 'span':
                self._bold = False
                self._italic = False
                self._under = False
                self._fsize = None

        def handle_data(self, data):
            if self._skip_tag:
                return
            text = data
            if not text.strip():
                return
            if self._para is None:
                self._para = self._d.add_paragraph()
            run = self._para.add_run(text)
            run.bold = self._bold
            run.italic = self._italic
            run.underline = self._under
            if self._fsize:
                run.font.size = Pt(self._fsize)

    docx = DocxDoc()
    sec = docx.sections[0]
    sec.top_margin    = Cm(2.5)
    sec.bottom_margin = Cm(2.5)
    sec.left_margin   = Cm(2.8)
    sec.right_margin  = Cm(2.8)

    try:
        n = docx.styles['Normal']
        n.font.name = 'Times New Roman'
        n.font.size = Pt(12)
    except Exception:
        pass

    _P(docx).feed(html_content)

    buf = BytesIO()
    docx.save(buf)
    return buf.getvalue()


@router.get("/generate/{doc_id}")
def get_generated_doc(
    doc_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = generated_document_repository.get_generated_document_with_employee(supabase, doc_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Document introuvable")
    return res.data


@router.get("/generate/{doc_id}/docx")
def download_docx(
    doc_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = generated_document_repository.get_generated_document(supabase, doc_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Document introuvable")

    doc      = res.data
    html     = doc.get("content", "")
    doc_type = doc.get("document_type", "document")

    try:
        data = _html_to_docx_bytes(html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur génération DOCX : {e}")

    fname = doc_type.replace(" ", "_")[:50] + ".docx"
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ── PDF download ──────────────────────────────────────────────────────────────

def _reportlab_pdf(html_content: str, title: str = "Document") -> bytes:
    """Generate a clean PDF via reportlab (cross-platform fallback)."""
    import re as _re
    import html as _html_mod
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib import colors

    # Convert HTML → plain paragraphs with minimal formatting hints
    raw = html_content
    # headings → HEADING marker
    raw = _re.sub(r'<h[1-3][^>]*>(.*?)</h[1-3]>', r'\n##HEADING## \1\n', raw, flags=_re.S | _re.I)
    raw = _re.sub(r'<br\s*/?>', '\n', raw, flags=_re.I)
    raw = _re.sub(r'</(?:p|div|li|tr)[^>]*>', '\n', raw, flags=_re.I)
    raw = _re.sub(r'<hr[^>]*/?\s*>', '\n---\n', raw, flags=_re.I)
    # Bold → keep text (reportlab Paragraph handles <b>)
    raw = _re.sub(r'<(?:strong|b)>(.*?)</(?:strong|b)>', r'<b>\1</b>', raw, flags=_re.S | _re.I)
    raw = _re.sub(r'<(?:em|i)>(.*?)</(?:em|i)>', r'<i>\1</i>', raw, flags=_re.S | _re.I)
    # Strip remaining tags
    raw = _re.sub(r'<[^>]+>', '', raw)
    raw = _html_mod.unescape(raw)

    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=12, leading=20,
        spaceAfter=4, alignment=TA_JUSTIFY,
    )
    head_style = ParagraphStyle(
        'Head', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=14, leading=22,
        spaceAfter=10, spaceBefore=14, alignment=TA_CENTER,
    )

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                             topMargin=2.5*cm, bottomMargin=2.5*cm,
                             leftMargin=2.8*cm, rightMargin=2.8*cm,
                             title=title)
    story = []
    for line in raw.split('\n'):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 4))
        elif line == '---':
            story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
        elif line.startswith('##HEADING##'):
            text = line.replace('##HEADING##', '').strip()
            # strip any leftover html in heading text
            text = _re.sub(r'<[^>]+>', '', text)
            story.append(Paragraph(text, head_style))
        else:
            try:
                story.append(Paragraph(line, body_style))
            except Exception:
                story.append(Paragraph(_re.sub(r'<[^>]+>', '', line), body_style))

    doc.build(story)
    return buf.getvalue()


@router.get("/generate/{doc_id}/pdf")
def download_pdf(
    doc_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = generated_document_repository.get_generated_document(supabase, doc_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Document introuvable")

    doc      = res.data
    html     = doc.get("content", "")
    doc_type = doc.get("document_type", "document")

    full_html = (
        "<!DOCTYPE html><html><head><meta charset='utf-8'>"
        "<style>"
        "body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.7;"
        "margin:0;padding:0;color:#1a1a1a;}"
        "@page{size:A4;margin:2.5cm 2.8cm;}"
        "h1,h2,h3{text-align:center;}"
        "p{margin:4px 0;}"
        "</style></head>"
        f"<body>{html}</body></html>"
    )

    pdf_bytes: bytes | None = None
    try:
        import weasyprint
        pdf_bytes = weasyprint.HTML(string=full_html).write_pdf()
    except Exception:
        pass

    if not pdf_bytes:
        try:
            pdf_bytes = _reportlab_pdf(html, doc_type)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur génération PDF : {e}")

    fname = doc_type.replace(" ", "_")[:50] + ".pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
