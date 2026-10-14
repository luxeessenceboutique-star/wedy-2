"""Employees router — /api/employees"""
import os
import uuid
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_role, require_hr_or_admin
from app.schemas import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.services.audit import log_action
from app.services import import_service
from app.config import settings
from app.repositories import employee_repository

router = APIRouter(prefix="/employees", tags=["Employees"])


def _serialize(obj):
    """Recursively convert date/datetime objects to ISO strings."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(i) for i in obj]
    return obj


@router.get("")
def list_employees(
    status: Optional[str] = None,
    department_id: Optional[UUID] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    exclude_intern: bool = True,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    response = employee_repository.list_employees(
        supabase, status, str(department_id) if department_id else None, search, exclude_intern, skip, limit,
        department=department,
    )
    return _serialize({"data": response.data, "count": response.count or 0})


# ── Bulk import (BEFORE parameterized /{employee_id}) ─────────────────────────

@router.post("/import/preview")
async def preview_import(
    file: UploadFile = File(...),
    target_type: str = Form("employee"),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """
    Parse an uploaded spreadsheet, map every header to a known field (or
    custom_fields), clean/normalize every value, validate each row, and flag
    duplicates against existing records — without writing anything to the DB.
    The frontend renders this as an editable preview before commit_import.
    """
    content = await file.read()
    filename = file.filename or "import.xlsx"

    try:
        headers, raw_rows = import_service.parse_spreadsheet(content, filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Impossible de lire le fichier : {e}")

    if not raw_rows:
        raise HTTPException(status_code=422, detail="Le fichier ne contient aucune ligne de données.")

    mapping_result = import_service.map_columns(headers)
    mapping = mapping_result["mapping"]

    cleaned_rows, custom_rows, row_errors = [], [], []
    for raw in raw_rows:
        cleaned, custom, warnings = import_service.clean_row(raw, mapping)
        errors = warnings + import_service.validate_row(cleaned)
        cleaned_rows.append(cleaned)
        custom_rows.append(custom)
        row_errors.append(errors)

    cins = [r["cin"] for r in cleaned_rows if r.get("cin")]
    emails = [r["email"] for r in cleaned_rows if r.get("email")]
    phones = [r["phone"] for r in cleaned_rows if r.get("phone")]
    existing = employee_repository.find_by_identifiers(supabase, cins, emails, phones)
    duplicates = import_service.match_duplicates(cleaned_rows, existing)

    row_results = []
    for i in range(len(cleaned_rows)):
        row_results.append({
            "row_index":     i,
            "data":          _serialize(cleaned_rows[i]),
            "custom_fields": custom_rows[i],
            "errors":        row_errors[i],
            "duplicate":     duplicates.get(i),
        })

    return {
        "column_mapping": mapping_result,
        "rows":            row_results,
        "summary":         import_service.build_summary(row_results),
    }


@router.post("/import/commit")
def commit_import(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """
    Write a reviewed import to the database. Expected payload shape:
    {target_type, filename, column_mapping, rows: [{data, custom_fields, action, matched_id}]}
    where action is one of 'create' | 'update' | 'skip', and 'update' does a
    full overwrite of every non-empty field the spreadsheet provided (blank
    cells never clobber existing data — they're simply absent from `data`).
    """
    target_type = payload.get("target_type", "employee")
    rows = payload.get("rows", [])

    to_create, to_update = [], []
    skipped = 0

    for row in rows:
        action = row.get("action", "create")
        if action == "skip":
            skipped += 1
            continue

        data = {k: v for k, v in (row.get("data") or {}).items() if v not in (None, "", [])}
        custom = row.get("custom_fields") or {}
        if custom:
            data["custom_fields"] = custom
        if target_type == "intern":
            data["status"] = "intern"
            data.setdefault("contract_type", "Stage")

        if action == "update" and row.get("matched_id"):
            to_update.append((row["matched_id"], data))
        else:
            data["created_by"] = current_user["id"]
            to_create.append(data)

    try:
        created = employee_repository.bulk_create_employees(supabase, to_create) if to_create else []
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la création en masse : {e}")

    try:
        updated = employee_repository.bulk_update_employees(supabase, to_update) if to_update else []
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour en masse : {e}")

    try:
        employee_repository.create_import_log(supabase, {
            "entity_type":    target_type,
            "filename":       payload.get("filename"),
            "total_rows":     len(rows),
            "created_count":  len(created),
            "updated_count":  len(updated),
            "skipped_count":  skipped,
            "failed_count":   0,
            "column_mapping": payload.get("column_mapping") or {},
            "initiated_by":   current_user["id"],
        })
    except Exception:
        pass
    log_action(supabase, current_user["id"], "IMPORT", target_type, None)

    return {"created": len(created), "updated": len(updated), "skipped": skipped}


# ── Employee file sub-resources (BEFORE parameterized /{employee_id}) ─────────

@router.get("/{employee_id}/files")
def list_employee_files(
    employee_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = employee_repository.list_employee_files(supabase, str(employee_id))
    return res.data


@router.post("/{employee_id}/files", status_code=201)
async def upload_employee_file(
    employee_id: UUID,
    file: UploadFile = File(...),
    file_type: str = Form("autre"),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    emp_res = employee_repository.get_employee_id(supabase, str(employee_id))
    if not emp_res.data:
        raise HTTPException(status_code=404, detail="Employé introuvable")

    content = await file.read()
    original_name = file.filename or "fichier"
    ext = original_name.rsplit(".", 1)[-1] if "." in original_name else ""
    safe_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex

    emp_dir = os.path.join(settings.UPLOAD_DIR, "employees", str(employee_id))
    os.makedirs(emp_dir, exist_ok=True)
    file_path_rel = os.path.join("employees", str(employee_id), safe_name)
    full_path = os.path.join(settings.UPLOAD_DIR, file_path_rel)

    with open(full_path, "wb") as f:
        f.write(content)

    record = {
        "employee_id": str(employee_id),
        "name":        original_name,
        "file_type":   file_type,
        "file_path":   file_path_rel.replace("\\", "/"),
        "file_size":   len(content),
        "mime_type":   file.content_type or "",
        "uploaded_by": current_user["id"],
    }
    try:
        res = employee_repository.create_employee_file(supabase, record)
    except Exception as e:
        os.remove(full_path)
        raise HTTPException(status_code=400, detail=f"Erreur base de données : {e}")

    log_action(supabase, current_user["id"], "UPLOAD_FILE", "employee_file", res.data[0]["id"])
    return res.data[0]


@router.post("/{employee_id}/analyze")
async def analyze_employee_folder(
    employee_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Read all files in the folder, extract text/images, call AI, return structured employee data."""
    import base64
    from app.services.ai_service import analyze_employee_folder as ai_analyze

    files_res = employee_repository.list_employee_files_full(supabase, str(employee_id))
    files = files_res.data
    if not files:
        raise HTTPException(status_code=422, detail="Aucun fichier dans le dossier. Ajoutez d'abord des fichiers.")

    file_contents = []
    for f in files:
        file_path_abs = os.path.join(settings.UPLOAD_DIR, f["file_path"])
        if not os.path.exists(file_path_abs):
            continue

        ext = (f["name"].lower().rsplit(".", 1)[-1]) if "." in f["name"] else ""
        text = ""
        images = []
        mime = "image/jpeg"

        try:
            with open(file_path_abs, "rb") as fp:
                content = fp.read()

            if ext == "pdf":
                import fitz
                doc = fitz.open(stream=content, filetype="pdf")
                text = "\n".join(page.get_text() for page in doc)
                if len(text.strip()) < 80:
                    for page in list(doc)[:4]:
                        pix = page.get_pixmap(dpi=120)
                        images.append(base64.b64encode(pix.tobytes("jpeg")).decode())
                    mime = "image/jpeg"
            elif ext in ("docx", "doc"):
                from docx import Document as DocxDoc
                from io import BytesIO
                doc = DocxDoc(BytesIO(content))
                text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            elif ext in ("jpg", "jpeg", "png", "gif", "bmp", "webp"):
                images.append(base64.b64encode(content).decode())
                mime = f["mime_type"] or f"image/{ext}"
            else:
                text = content.decode("utf-8", errors="ignore")
        except Exception:
            text = ""

        if text.strip() or images:
            file_contents.append({
                "filename":  f["name"],
                "file_type": f["file_type"],
                "text":      text,
                "images":    images,
                "mime":      mime,
            })

    if not file_contents:
        raise HTTPException(status_code=422, detail="Impossible de lire les fichiers du dossier.")

    try:
        extracted = ai_analyze(file_contents)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Analyse IA échouée : {e}")

    try:
        employee_repository.create_employee_analysis(supabase, {
            "employee_id":    str(employee_id),
            "extracted_data": extracted,
            "files_analyzed": len(file_contents),
            "analyzed_by":    current_user["id"],
        })
    except Exception:
        pass

    log_action(supabase, current_user["id"], "ANALYZE_FOLDER", "employee", str(employee_id))
    return {"files_analyzed": len(file_contents), "extracted": extracted}


@router.post("/{employee_id}/apply-analysis")
def apply_analysis(
    employee_id: UUID,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    allowed = {
        "full_name", "cin", "matricule", "email", "phone", "position",
        "department", "salary", "hire_date", "contract_type", "contract_start",
        "contract_end", "manager", "address", "city", "birth_date",
        "nationality", "cnss_number", "bank_account", "notes",
    }
    data = {k: v for k, v in payload.items() if k in allowed and v not in (None, "", [])}
    if not data:
        raise HTTPException(status_code=400, detail="Aucune donnée à appliquer")

    res = employee_repository.apply_employee_analysis(supabase, str(employee_id), data)
    if not res.data:
        raise HTTPException(status_code=404, detail="Employé introuvable")

    log_action(supabase, current_user["id"], "APPLY_ANALYSIS", "employee", str(employee_id))
    return res.data[0]


@router.delete("/{employee_id}/files/{file_id}", status_code=204)
def delete_employee_file(
    employee_id: UUID,
    file_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    res = employee_repository.get_employee_file(supabase, str(employee_id), str(file_id))
    if not res.data:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    file_path = os.path.join(settings.UPLOAD_DIR, res.data[0]["file_path"])
    if os.path.exists(file_path):
        os.remove(file_path)

    employee_repository.delete_employee_file(supabase, str(file_id))


# ── Single employee + CRUD ────────────────────────────────────────────────────

@router.get("/{employee_id}")
def get_employee(
    employee_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    response = employee_repository.get_employee(supabase, str(employee_id))
    if not response.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _serialize(response.data[0])


@router.post("", status_code=201)
def create_employee(
    payload: EmployeeCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    data = _serialize({k: v for k, v in payload.model_dump().items() if v is not None})
    data["created_by"] = current_user["id"]
    response = employee_repository.create_employee(supabase, data)
    if not response.data:
        raise HTTPException(status_code=400, detail="Could not create employee")

    emp = response.data[0]
    log_action(supabase, current_user["id"], "CREATE", "employee", emp["id"])
    return _serialize(emp)


@router.patch("/{employee_id}")
def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    data = _serialize(payload.model_dump(exclude_unset=True))
    if not data:
        return get_employee(employee_id, supabase, current_user)

    response = employee_repository.update_employee(supabase, str(employee_id), data)
    if not response.data:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp = response.data[0]
    log_action(supabase, current_user["id"], "UPDATE", "employee", emp["id"])
    return _serialize(emp)


@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    response = employee_repository.delete_employee(supabase, str(employee_id))
    if not response.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    log_action(supabase, current_user["id"], "DELETE", "employee", str(employee_id))
