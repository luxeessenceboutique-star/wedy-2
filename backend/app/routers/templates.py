from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
import re
from supabase import Client
from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_hr_or_admin
from app.models.document import TemplateCreate, TemplateUpdate
from app.services.pdf_template_extractor import extract_pdf_template

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
async def list_templates(
    category: str = Query(None),
    active_only: bool = Query(True),
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.table("document_templates").select("*").order("name_fr")
    if active_only:
        query = query.eq("is_active", True)
    if category:
        query = query.eq("category", category)
    result = query.execute()
    return {"data": result.data, "count": len(result.data)}


@router.get("/{template_id}")
async def get_template(
    template_id: str,
    db: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = db.table("document_templates").select("*").eq("id", template_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return result.data


@router.post("", status_code=201)
async def create_template(
    body: TemplateCreate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload = body.model_dump()
    result = db.table("document_templates").insert(payload).execute()
    return result.data[0]


@router.patch("/{template_id}")
async def update_template(
    template_id: str,
    body: TemplateUpdate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = db.table("document_templates").update(payload).eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return result.data[0]


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    db.table("document_templates").delete().eq("id", template_id).execute()

@router.post("/import", status_code=201)
async def import_template_from_file(
    file: UploadFile = File(...),
    name_fr: str = Form(...),
    name_en: str = Form(""),
    name_ar: str = Form(""),
    category: str = Form("autre"),
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    filename = file.filename or "template.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Fichier vide")

        # Smart extraction: images + formatted text + variable substitution
        html_template = extract_pdf_template(content, filename)

        variables = list(set(re.findall(r"\{\{(\w+)\}\}", html_template)))

        code = re.sub(r"[^a-z0-9_]", "", name_fr.lower().replace(" ", "_").replace("-", "_"))[:50]

        payload = {
            "code":          code,
            "name_fr":       name_fr,
            "name_en":       name_en or name_fr,
            "name_ar":       name_ar or name_fr,
            "category":      category,
            "body_template": html_template,
            "variables":     variables,
            "is_active":     True,
        }

        result = db.table("document_templates").insert(payload).execute()
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
