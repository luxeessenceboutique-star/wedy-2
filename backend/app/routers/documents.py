from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from supabase import Client
from app.services.supabase import get_supabase
from app.dependencies import get_current_user, require_admin
from app.models.document import GenerateDocumentRequest, AIEnhanceRequest
from app.services.document_generator import fill_template, generate_pdf_bytes, generate_docx_bytes
from app.services import ai_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/generate")
async def generate_document(
    body: GenerateDocumentRequest,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    emp_result = db.table("employees").select("*").eq("id", body.employee_id).single().execute()
    if not emp_result.data:
        raise HTTPException(status_code=404, detail="Employee not found")

    tpl_result = db.table("document_templates").select("*").eq("id", body.template_id).single().execute()
    if not tpl_result.data:
        raise HTTPException(status_code=404, detail="Template not found")

    employee = emp_result.data
    template = tpl_result.data

    variables = {k: v for k, v in employee.items() if v is not None}
    if body.extra_variables:
        variables.update(body.extra_variables)

    content = fill_template(template["body_template"], variables)

    if body.use_ai_enhancement:
        try:
            content = ai_service.enhance_document(content, template["name_fr"], body.language)
        except Exception:
            pass

    record = {
        "employee_id": body.employee_id,
        "template_id": body.template_id,
        "document_type": template["name_fr"],
        "content": content,
        "variables_used": variables,
        "language": body.language,
        "generated_by": current_user["id"],
    }
    saved = db.table("generated_documents").insert(record).execute()
    return {"document": saved.data[0], "content": content}


@router.get("/generate/{doc_id}/pdf")
async def download_pdf(
    doc_id: str,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = db.table("generated_documents").select("*").eq("id", doc_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = result.data
    pdf_bytes = generate_pdf_bytes(doc["content"], doc["document_type"])
    filename = f"{doc['document_type'].replace(' ', '_')}_{doc_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/generate/{doc_id}/docx")
async def download_docx(
    doc_id: str,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    result = db.table("generated_documents").select("*").eq("id", doc_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = result.data
    docx_bytes = generate_docx_bytes(doc["content"], doc["document_type"])
    filename = f"{doc['document_type'].replace(' ', '_')}_{doc_id[:8]}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("")
async def list_documents(
    employee_id: str = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    query = (
        db.table("generated_documents")
        .select("*, employees(full_name, cin, department)")
        .order("created_at", desc=True)
    )
    if employee_id:
        query = query.eq("employee_id", employee_id)

    result = query.range(offset, offset + limit - 1).execute()
    return {"data": result.data, "count": len(result.data)}


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(require_admin),
):
    db.table("generated_documents").delete().eq("id", doc_id).execute()


@router.post("/ai/enhance")
async def ai_enhance(
    body: AIEnhanceRequest,
    current_user: dict = Depends(get_current_user),
):
    """Use Claude AI to enhance/improve a document's content."""
    try:
        enhanced = ai_service.enhance_document(
            body.document_content,
            body.document_type,
            body.language,
            body.instructions or "",
        )
        return {"enhanced_content": enhanced}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI enhancement failed: {str(e)}")


@router.post("/ai/suggest")
async def ai_suggest(
    employee_id: str,
    document_type: str,
    language: str = "fr",
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Ask Claude to draft a document from scratch based on employee data."""
    emp_result = db.table("employees").select("*").eq("id", employee_id).single().execute()
    if not emp_result.data:
        raise HTTPException(status_code=404, detail="Employee not found")

    try:
        content = ai_service.suggest_document_content(document_type, emp_result.data, language)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI suggestion failed: {str(e)}")


@router.post("/ai/translate")
async def ai_translate(
    doc_id: str,
    target_language: str,
    db: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Translate an existing document to another language."""
    result = db.table("generated_documents").select("*").eq("id", doc_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        translated = ai_service.translate_document(result.data["content"], target_language)
        return {"translated_content": translated, "language": target_language}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
