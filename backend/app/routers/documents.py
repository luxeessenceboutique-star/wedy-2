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
    GeneratedDocOut
)
from app.services.storage import store_file, retrieve_file
from app.services.audit import log_action

router = APIRouter(tags=["Documents"])


# ─────────────────────────────────────────────────────────────────────────────
# Documents
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/documents")
def list_documents(
    profile_id: UUID = None,
    employee_id: UUID = None,
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Generated documents (from the generate flow) are stored in generated_documents
    query = supabase.table("generated_documents").select("*").order("created_at", desc=True)
    if employee_id:
        query = query.eq("employee_id", str(employee_id))
    elif profile_id:
        query = query.eq("profile_id", str(profile_id))
    response = query.range(skip, skip + limit - 1).execute()
    rows = response.data or []

    # Manual join: resolve employee names from the employees table
    emp_ids = list({r["employee_id"] for r in rows if r.get("employee_id")})
    emp_map = {}
    if emp_ids:
        emp_res = supabase.table("employees").select("id, full_name, cin, department").in_("id", emp_ids).execute()
        emp_map = {e["id"]: e for e in (emp_res.data or [])}
    for row in rows:
        eid = row.get("employee_id")
        row["employees"] = emp_map.get(eid) if eid else None

    return {"data": rows, "count": len(rows)}


@router.post("/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    type: str,
    name: str,
    profile_id: UUID = None,
    employee_id: UUID = None,
    file: UploadFile = File(...),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    if not profile_id and not employee_id:
        raise HTTPException(status_code=400, detail="profile_id or employee_id is required")

    content = await file.read()
    url = store_file(content, file.filename, subfolder="documents", content_type=file.content_type)

    data = {
        "profile_id": str(profile_id) if profile_id else None,
        "employee_id": str(employee_id) if employee_id else None,
        "type": type,
        "name": name,
        "file_url": url,
    }
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
