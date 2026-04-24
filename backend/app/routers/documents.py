"""Documents & Templates router — (Supabase SDK Version)"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.schemas import (
    DocumentCreate, DocumentOut,
    TemplateCreate, TemplateUpdate, TemplateOut,
    GenerateDocRequest, GeneratedDocOut,
)
from app.services.document_generator import generate_document
from app.services.storage import store_file, retrieve_file
from app.services.audit import log_action

router = APIRouter(tags=["Documents"])


# ─────────────────────────────────────────────────────────────────────────────
# Documents
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/documents", response_model=List[DocumentOut])
def list_documents(
    profile_id: UUID = None,
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = supabase.table("documents").select("*")
    if profile_id:
        query = query.eq("profile_id", str(profile_id))
    response = query.range(skip, skip + limit - 1).execute()
    return response.data


@router.post("/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    profile_id: UUID,
    type: str,
    name: str,
    file: UploadFile = File(...),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    content = await file.read()
    url = store_file(content, file.filename, subfolder="documents", content_type=file.content_type)
    
    data = {"profile_id": str(profile_id), "type": type, "name": name, "file_url": url}
    response = supabase.table("documents").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Could not upload document")
    
    doc = response.data[0]
    log_action(supabase, current_user["id"], "UPLOAD_DOCUMENT", "document", doc["id"])
    return doc


@router.get("/documents/{doc_id}/download")
def download_document(
    doc_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    response = supabase.table("documents").select("*").eq("id", str(doc_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = response.data[0]
    data = retrieve_file(doc["file_url"])
    return Response(content=data, media_type="application/octet-stream",
                    headers={"Content-Disposition": f"attachment; filename={doc['name']}"})


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(
    doc_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    response = supabase.table("documents").delete().eq("id", str(doc_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")


# ─────────────────────────────────────────────────────────────────────────────
# Document Generation
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/documents/generate", response_model=GeneratedDocOut, status_code=201)
def generate_doc(
    payload: GenerateDocRequest,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    res_t = supabase.table("document_templates").select("*").eq("id", str(payload.template_id)).execute()
    if not res_t.data:
        raise HTTPException(status_code=404, detail="Template not found")
    template = res_t.data[0]

    res_p = supabase.table("profiles").select("*, employees(*, positions(*, departments(*))), interns(*)").eq("id", str(payload.profile_id)).execute()
    if not res_p.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = res_p.data[0]

    # Note: generate_document might need adaptation to handle raw dicts
    file_bytes, media_type = generate_document(
        supabase=supabase,
        template=template,
        profile=profile,
        extra_vars=payload.extra_vars,
        output_format=payload.output_format,
    )

    ext = "pdf" if payload.output_format == "pdf" else "docx"
    filename = f"gen_{profile['id']}_{payload.template_id}.{ext}"
    url = store_file(file_bytes, filename, subfolder="generated", content_type=media_type)

    data = {
        "template_id": str(payload.template_id),
        "profile_id": str(payload.profile_id),
        "file_url": url,
    }
    res_gen = supabase.table("generated_documents").insert(data).execute()
    gen_doc = res_gen.data[0]
    
    log_action(supabase, current_user["id"], "GENERATE_DOCUMENT", "generated_document", gen_doc["id"])
    return gen_doc


@router.get("/documents/generated", response_model=List[GeneratedDocOut])
def list_generated(
    profile_id: UUID = None,
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = supabase.table("generated_documents").select("*")
    if profile_id:
        query = query.eq("profile_id", str(profile_id))
    response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    return response.data
