"""Document generation router — uses employees table directly."""
import re
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from supabase import Client

from app.services import webhooks as webhook_service
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


def _parse_any_date(v):
    """dd/mm/yyyy (what the form sends) or ISO."""
    from datetime import datetime as _dt
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return _dt.strptime(str(v)[:10], fmt).date()
        except (TypeError, ValueError):
            pass
    return None


def _amount(v):
    """« 3 500,50 MAD » / 3500.5 → 3500.5 (None when there is no number)."""
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = re.sub(r"[^\d,.\-]", "", str(v))
    if s.count(",") == 1 and (s.count(".") == 0 or s.rfind(",") > s.rfind(".")):
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


_MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]


def _long_date(d: date) -> str:
    return f"{'1er' if d.day == 1 else d.day} {_MONTHS_FR[d.month - 1]} {d.year}"


def _contract_phrase(contract_type) -> str:
    """« à durée indéterminée (CDI) » — what follows « sous contrat » in an attestation."""
    c = (contract_type or "").strip()
    u = c.upper()
    if u == "CDI":
        return "à durée indéterminée (CDI)"
    if u == "CDD":
        return "à durée déterminée (CDD)"
    return f"de type {c}" if c else ""


def build_context(emp: dict, extra: dict = None, company: Optional[dict] = None, meta: Optional[dict] = None) -> dict:
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
        "school":           emp.get("school") or "",
        "cnss_number":      emp.get("cnss_number") or "",
        "bank_account":     emp.get("bank_account") or "",
        "internship_start": _fmt_date(emp.get("internship_start")),
        "internship_end":   _fmt_date(emp.get("internship_end")) or "à ce jour",
        "birth_date":       _fmt_date(emp.get("birth_date")),
        "birth_place":      emp.get("birth_place") or ((emp.get("custom_fields") or {}).get("birth_place") if isinstance(emp.get("custom_fields"), dict) else "") or "",
        "today_long":       _long_date(date.today()),
        "notes":            emp.get("notes") or "",
    }
    intern = emp.get("status") == "intern"
    if intern:  # an intern's contract dates are the internship's
        ctx["contract_start"] = _fmt_date(emp.get("contract_start") or emp.get("internship_start") or emp.get("hire_date"))
        ctx["contract_end"] = _fmt_date(emp.get("contract_end") or emp.get("internship_end")) or "à ce jour"
    sal = emp.get("salary")
    if sal in (None, "") and intern:
        sal = emp.get("remuneration")
    if sal not in (None, ""):
        try:
            ctx["salary"] = f"{float(sal):,.2f} MAD"
        except Exception:
            ctx["salary"] = str(sal)
    else:
        ctx["salary"] = ""
    cf = emp.get("custom_fields") or {}
    ctx["civility"] = (cf.get("civility") or cf.get("civilite") or "") if isinstance(cf, dict) else ""
    for key, info in (meta or {}).items():  # fields of an imported template: their default value
        ctx.setdefault(key, (info or {}).get("default") or "")

    if extra:
        ctx.update({k: v for k, v in extra.items() if v is not None})

    # values computed from the others (after the form's values, so a typed salary / date is the one used)
    from app.services import template_fields as tfields
    amount = _amount((extra or {}).get("salary_figures")) or _amount(ctx.get("salary"))
    if amount is not None:  # typed or from the record, always written « 3 000 »
        ctx["salary_figures"] = tfields.salary_figures(amount)
    elif not (extra or {}).get("salary_figures"):
        ctx["salary_figures"] = ""
    if not (extra or {}).get("salary_words"):
        ctx["salary_words"] = tfields.salary_words(amount) if amount is not None else ""
    if not (extra or {}).get("duration"):
        ctx["duration"] = tfields.duration_text(_parse_any_date(ctx.get("contract_start")), _parse_any_date(ctx.get("contract_end")))
    if not (extra or {}).get("contract_phrase"):
        ctx["contract_phrase"] = _contract_phrase(ctx.get("contract_type"))
    civ, short = tfields.civility_pair(ctx.get("civility"), ctx.get("civility_short"))
    ctx["civility"] = civ or "Monsieur/Madame"   # unknown: the document's own wording is kept
    ctx["civility_short"] = short or "M./Mme"
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
    from app.services import template_fields as tfields
    body = template.get("body_template", "")
    ctx = build_context(employee, payload.extra_variables or {}, app_settings.load(supabase)[0]["company"], tfields.read_meta(body))
    # « intégré(e) », « il/elle » written for the person once the civility is known
    content = tfields.agree(render_template(tfields.strip_meta(body), ctx), ctx.get("civility", ""))

    # 4. Optional AI (another language, or a smoother wording): the HTML must come back with its tags, else it is refused
    ai_enhanced, ai_error = False, None
    if payload.use_ai_enhancement:
        try:
            from app.services.ai_service import enhance_document
            out = enhance_document(content, template.get("name_fr", "document"), payload.language)
            if keeps_layout(content, out):
                content, ai_enhanced = out, True
            else:
                ai_error = "La rédaction IA a changé la mise en page : le modèle a été gardé tel quel."
        except Exception as e:
            print(f"[generate] AI enhancement unavailable, using rendered template as-is: {e}")
            ai_error = "Rédaction IA indisponible : le modèle a été gardé tel quel."

    # 5. One page for everything (preview, PDF, DOCX, the person's folder): the template as it is, or on the letterhead
    import uuid as _uuid
    from app.services import document_layout
    doc_id = str(_uuid.uuid4())
    settings_all = app_settings.load(supabase)[0]
    content = document_layout.compose(
        content, title=(template.get(f"name_{payload.language}") or template.get("name_fr") or ""),
        company=settings_all["company"], assets=settings_all.get("assets") or {}, lang=payload.language,
        code=doc_id[:8].upper(), signer=employee.get("manager") or "")
    doc_data = {
        "id":            doc_id,
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
        try:  # a table whose id cannot be given: let the database choose it
            ins = generated_document_repository.create_generated_document(supabase, {k: v for k, v in doc_data.items() if k != "id"})
            doc = ins.data[0] if ins.data else doc_data
        except Exception:
            doc = {**doc_data, "id": "local", "created_at": str(date.today())}

    # 6. The PDF filed in the person's folder (like an uploaded file)
    _file_pdf(supabase, doc, payload.employee_id, current_user["id"])

    log_action(supabase, current_user["id"], "GENERATE_DOCUMENT", "generated_documents",
               doc.get("id", ""))

    webhook_service.emit(supabase, "document.generated", {"document_id": (doc or {}).get("id"), "document": template.get("name_fr"),
                                                       "employee_id": payload.employee_id, "employee": employee.get("full_name"), "language": payload.language})
    from app.services import document_layout as _dl
    return {"document": doc, "content": content, "html": _dl.full_html(content, doc.get("document_type") or "Document"),
            "ai_enhanced": ai_enhanced, "ai_error": ai_error}


_LAYOUT_TAGS = re.compile(r"<(p|div|br|h[1-6]|li|table|tr|td|b|strong|img)\b", re.I)


def keeps_layout(before: str, after: str) -> bool:
    """The AI's answer kept the document's shape: about the same tags, and not a truncated text."""
    if not after or not after.strip():
        return False
    tb, ta = len(_LAYOUT_TAGS.findall(before or "")), len(_LAYOUT_TAGS.findall(after))
    if tb and ta < tb * 0.7:
        return False
    if after.count("{{") > (before or "").count("{{"):   # the AI wrote a field instead of a value
        return False
    txt = lambda h: len(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h or "")).strip())
    return txt(after) >= txt(before) * 0.6


def _generated_path(employee_id: str, doc_id: str) -> str:
    return f"employees/{employee_id}/generated-{doc_id}.pdf"


def _file_pdf(supabase: Client, doc: dict, employee_id: str, user_id: str, replace: bool = False) -> None:
    """Write the document's PDF into the person's folder (a durable copy too); on an edit, the same file is rewritten."""
    try:
        import os
        from app.config import settings
        from app.services import document_layout
        from app.services.storage import durable_put
        doc_id = str(doc.get("id") or "")
        if not doc_id or doc_id == "local":
            return
        pdf_bytes = document_layout.html_to_pdf(doc.get("content") or "", doc.get("document_type") or "Document")
        rel = _generated_path(str(employee_id), doc_id)
        full = os.path.join(settings.UPLOAD_DIR, rel)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(pdf_bytes)
        durable_put(rel, pdf_bytes, "application/pdf")
        rows = supabase.table("employee_files").select("id").eq("file_path", rel).limit(1).execute().data or []
        if rows:
            supabase.table("employee_files").update({"file_size": len(pdf_bytes)}).eq("id", rows[0]["id"]).execute()
            return
        if replace:
            return
        record = {
            "employee_id": str(employee_id),
            "name": f"{doc.get('document_type') or 'document'}_{date.today().isoformat()}.pdf",
            "file_type": "autre",
            "file_path": rel,
            "file_size": len(pdf_bytes),
            "mime_type": "application/pdf",
            "uploaded_by": user_id,
        }
        res = generated_document_repository.create_employee_file(supabase, record)
        if res.data:
            log_action(supabase, user_id, "UPLOAD_FILE_GENERATED", "employee_file", res.data[0]["id"])
    except Exception as e:
        print(f"Failed to save physical file to employee folder: {e}")


class DocumentEdit(BaseModel):
    content: str


@router.patch("/generate/{doc_id}")
def update_generated_doc(doc_id: str, body: DocumentEdit, supabase: Client = Depends(get_db),
                         current_user: dict = Depends(require_hr_or_admin)):
    """Save the text changed by hand in the preview: the PDF / DOCX downloads and the filed copy follow."""
    res = generated_document_repository.get_generated_document(supabase, doc_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Document introuvable")
    doc = res.data
    content = re.sub(r"<script\b[^>]*>.*?</script>", "", body.content or "", flags=re.S | re.I)
    content = re.sub(r"\son\w+\s*=\s*(\"[^\"]*\"|'[^']*')", "", content)
    if not re.sub(r"<[^>]+>", "", content).strip():
        raise HTTPException(status_code=422, detail="Le document est vide")
    supabase.table("generated_documents").update({"content": content}).eq("id", doc_id).execute()
    doc = {**doc, "content": content}
    if doc.get("employee_id"):
        _file_pdf(supabase, doc, doc["employee_id"], current_user["id"], replace=True)
    log_action(supabase, current_user["id"], "UPDATE", "generated_documents", doc_id)
    from app.services import document_layout as _dl
    return {"document": doc, "content": content, "html": _dl.full_html(content, doc.get("document_type") or "Document")}


@router.get("/generate/{doc_id}/html")
def generated_doc_html(doc_id: str, supabase: Client = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """The document as a full page (view / print in the browser), exactly as in the PDF."""
    from fastapi.responses import HTMLResponse
    from app.services import document_layout
    res = generated_document_repository.get_generated_document(supabase, doc_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Document introuvable")
    content = res.data.get("content") or ""
    page = content if document_layout.is_composed(content) else f'<div class="wedy-doc own">{content}</div>'
    return HTMLResponse(document_layout.full_html(page, res.data.get("document_type") or "Document"))


# ── DOCX download ─────────────────────────────────────────────────────────────

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
        from app.services.docx_export import html_to_docx
        data = html_to_docx(html)
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

    pdf_bytes: bytes | None = None
    try:
        from app.services import document_layout
        pdf_bytes = document_layout.html_to_pdf(html, doc_type)
    except Exception as e:
        print(f"[generate] weasyprint unavailable for {doc_id}: {e}")

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
