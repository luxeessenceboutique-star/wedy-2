"""Documents agent: templates, generation, history."""
from app.agents.runtime import PEOPLE, ToolError, ctx, hr_tool, link, name_of, norm, one_person, run_handler, tr
from app.repositories import template_repository
from app.routers import generate as gen_router

A = "documents"


def _templates() -> list[dict]:
    return template_repository.list_templates(ctx().db, True, None).data or []


def _find_template(ref: str) -> dict:
    n = norm(ref)
    tpls = _templates()
    hits = [t for t in tpls if t["id"] == ref or n in (norm(t.get("name_fr")), norm(t.get("name_en")), norm(t.get("name_ar")))]
    hits = hits or [t for t in tpls if n and any(n in norm(t.get(k)) for k in ("name_fr", "name_en", "name_ar", "category"))]
    if not hits:
        raise ToolError(tr(f"Aucun modèle « {ref} ». Modèles : ", f"No template “{ref}”. Templates: ", f"لا يوجد نموذج «{ref}». النماذج: ") + ", ".join(t.get("name_fr") or "" for t in tpls[:20]))
    if len(hits) > 1 and norm(hits[0].get("name_fr")) != n:
        raise ToolError(tr("Plusieurs modèles correspondent : ", "Several templates match: ", "عدة نماذج مطابقة: ") + "; ".join(f"{t.get('name_fr')} (id {t['id']})" for t in hits[:6]))
    return hits[0]


@hr_tool(A, ("Modèles de documents", "Document templates", "نماذج الوثائق"))
def list_document_templates(category: str = "") -> dict:
    """Active document templates (attestations, contracts, certificates, letters…).

    Args:
      category: Filter by category (optional).
    """
    rows = [t for t in _templates() if not category or norm(category) in norm(t.get("category"))]
    return {"templates": [{"id": t["id"], "name": t.get("name_fr"), "category": t.get("category")} for t in rows[:60]],
            "links": [link("/app/templates", tr("Ouvrir Modèles", "Open Templates", "فتح النماذج"))]}


def _gen_preview(a: dict) -> dict:
    e = one_person(a["employee"], PEOPLE)
    t = _find_template(a["template"])
    return {"summary": tr(f"Générer « {t.get('name_fr')} » pour {e['full_name']}", f"Generate “{t.get('name_fr')}” for {e['full_name']}", f"إنشاء «{t.get('name_fr')}» لـ {e['full_name']}"),
            "details": [[tr("Langue", "Language", "اللغة"), (a.get("language") or "fr").upper()]] + ([[tr("Variables", "Variables", "المتغيرات"), a["extra"]]] if a.get("extra") else [])}


@hr_tool(A, ("Générer un document", "Generate a document", "إنشاء وثيقة"), write=True, preview=_gen_preview)
def generate_document(employee: str, template: str, language: str = "fr", extra: str = "") -> dict:
    """Generate an official document from a template for an employee (filled with their file and the company profile).
    It is saved in their folder and in the history, ready to download as PDF / DOCX.

    Args:
      employee: Name or id of the employee or intern.
      template: Template name or id (see list_document_templates), e.g. « Attestation de travail ».
      language: fr, en or ar.
      extra: Extra variables as « key=value; key=value » (optional).
    """
    e = one_person(employee, PEOPLE)
    t = _find_template(template)
    extra_vars = {}
    for part in [p for p in (extra or "").split(";") if "=" in p]:
        k, v = part.split("=", 1)
        extra_vars[k.strip()] = v.strip()
    body = gen_router.GenerateRequest(employee_id=e["id"], template_id=t["id"], language=language if language in ("fr", "en", "ar") else "fr", use_ai_enhancement=False, extra_variables=extra_vars or None)
    out = run_handler(gen_router.generate_doc, body, ctx().db, ctx().user)
    doc = out.get("document") or {}
    text = " ".join(str(out.get("content") or "").replace("<", " <").split())
    import re
    plain = re.sub(r"<[^>]+>", " ", text)
    return {"generated": True, "document": t.get("name_fr"), "employee": e["full_name"], "document_id": doc.get("id"), "preview": re.sub(r"\s+", " ", plain).strip()[:500],
            "links": [link("/app/history", tr("Ouvrir l'historique (PDF / Word)", "Open history (PDF / Word)", "فتح السجل (PDF / Word)"))]}


@hr_tool(A, ("Historique des documents", "Document history", "سجل الوثائق"))
def generated_documents(employee: str = "", limit: int = 20) -> dict:
    """Documents already generated (newest first), optionally for one employee.

    Args:
      employee: Name or id (optional).
      limit: Maximum rows (default 20).
    """
    q = ctx().db.table("generated_documents").select("id, employee_id, document_type, language, created_at").order("created_at", desc=True).limit(limit)
    if employee:
        q = q.eq("employee_id", one_person(employee, PEOPLE)["id"])
    rows = q.execute().data or []
    return {"documents": [{"id": r["id"], "type": r.get("document_type"), "employee": name_of(r.get("employee_id")), "language": r.get("language"), "date": str(r.get("created_at"))[:10]} for r in rows],
            "links": [link("/app/history", tr("Ouvrir l'historique", "Open history", "فتح السجل"))]}
