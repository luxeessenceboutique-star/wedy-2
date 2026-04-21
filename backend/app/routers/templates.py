from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from app.services.supabase import get_supabase
from app.dependencies import get_current_user, require_admin
from app.models.document import TemplateCreate, TemplateUpdate

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
async def list_templates(
    category: str = Query(None),
    active_only: bool = Query(True),
    db: Client = Depends(get_supabase),
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
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = db.table("document_templates").select("*").eq("id", template_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")
    return result.data


@router.post("", status_code=201)
async def create_template(
    body: TemplateCreate,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(require_admin),
):
    payload = body.model_dump()
    result = db.table("document_templates").insert(payload).execute()
    return result.data[0]


@router.patch("/{template_id}")
async def update_template(
    template_id: str,
    body: TemplateUpdate,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(require_admin),
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
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(require_admin),
):
    db.table("document_templates").delete().eq("id", template_id).execute()
