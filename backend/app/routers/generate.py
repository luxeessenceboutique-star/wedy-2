"""Document generation router — uses employees table directly."""
import re
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action

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


def build_context(emp: dict, extra: dict = None) -> dict:
    ctx = {
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
    t_res = supabase.table("document_templates").select("*").eq("id", payload.template_id).maybe_single().execute()
    if not t_res.data:
        raise HTTPException(status_code=404, detail="Template introuvable")
    template = t_res.data

    # 2. Fetch employee
    e_res = supabase.table("employees").select("*").eq("id", payload.employee_id).maybe_single().execute()
    if not e_res.data:
        raise HTTPException(status_code=404, detail="Employé introuvable")
    employee = e_res.data

    # 3. Build context and render
    ctx = build_context(employee, payload.extra_variables or {})
    content = render_template(template.get("body_template", ""), ctx)

    # 4. Optional AI enhancement
    if payload.use_ai_enhancement:
        try:
            from app.services.ai_service import enhance_document
            content = enhance_document(content, template.get("name_fr", "document"), payload.language)
        except Exception:
            pass  # AI unavailable — use rendered content as-is

    # 5. Persist to generated_documents
    doc_data = {
        "employee_id":   payload.employee_id,
        "template_id":   payload.template_id,
        "document_type": template.get("name_fr", "document"),
        "content":       content,
        "language":      payload.language,
    }
    try:
        ins = supabase.table("generated_documents").insert(doc_data).execute()
        doc = ins.data[0] if ins.data else doc_data
    except Exception:
        doc = {**doc_data, "id": "local", "created_at": str(date.today())}

    log_action(supabase, current_user["id"], "GENERATE_DOCUMENT", "generated_documents",
               doc.get("id", ""))

    return {"document": doc, "content": content}
