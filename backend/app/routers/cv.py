"""CV router — upload, parse, page images, zone OCR"""
import uuid
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user
from app.services.cv_parser import (
    extract_raw_text, extract_pages_as_images,
    extract_photo, ocr_zone, build_profile_suggestion, smart_extract_cv
)
from starlette.concurrency import run_in_threadpool
from app.services.audit import log_action

router = APIRouter(prefix="/cv", tags=["CV"])

# Temp storage for uploaded CV files (for zone OCR)
_CV_TEMP: dict[str, bytes] = {}
_CV_TEMP_NAMES: dict[str, str] = {}


@router.post("/upload", status_code=201)
async def upload_and_parse_cv(
    file: UploadFile = File(...),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Full CV processing:
    - Extract text + structured data (name, email, phone, exp, edu, skills…)
    - Convert PDF pages to base64 images for the visual viewer
    - Extract embedded photo if present
    Returns everything needed for the frontend CV importer.
    """
    content = await file.read()
    filename = file.filename or "cv.pdf"

    # 1. Raw text
    raw_text = extract_raw_text(content, filename)

    # 2. Page images (base64 PNG, one per page)
    pages = extract_pages_as_images(content, filename, dpi=150)

    # 3. Structured extraction: Claude (vision + text), regex fallback
    extraction = await run_in_threadpool(smart_extract_cv, raw_text, pages)

    # 4. Profile photo
    photo_b64 = extract_photo(content, filename)

    # 5. Store file in memory for zone OCR (keyed by temp_id)
    temp_id = str(uuid.uuid4())
    _CV_TEMP[temp_id] = content
    _CV_TEMP_NAMES[temp_id] = filename

    # Limit cache size
    if len(_CV_TEMP) > 50:
        oldest = next(iter(_CV_TEMP))
        _CV_TEMP.pop(oldest, None)
        _CV_TEMP_NAMES.pop(oldest, None)

    log_action(supabase, current_user["id"], "UPLOAD_CV", "cv", temp_id)

    return {
        "temp_id":   temp_id,
        "pages":     pages,
        "photo":     photo_b64,
        "extraction": extraction,
        "profile_suggestion": build_profile_suggestion(extraction),
        "raw_text":  raw_text,
    }


class ZoneRequest(BaseModel):
    temp_id: str
    page: int = 0
    x:     float   # fraction [0,1] from left
    y:     float   # fraction [0,1] from top
    w:     float   # fraction [0,1] width
    h:     float   # fraction [0,1] height


@router.post("/ocr-zone")
async def ocr_zone_endpoint(
    body: ZoneRequest,
    _current_user: dict = Depends(get_current_user),
):
    """
    OCR a rectangular zone on a CV page.
    Coordinates are fractions of the page image size [0,1].
    """
    content = _CV_TEMP.get(body.temp_id)
    filename = _CV_TEMP_NAMES.get(body.temp_id, "cv.pdf")
    if content is None:
        raise HTTPException(status_code=404, detail="Fichier CV temporaire introuvable (expiré ?)")

    text = ocr_zone(content, filename, body.page, body.x, body.y, body.w, body.h)
    return {"text": text}


@router.post("/public-extract")
async def public_extract_cv(file: UploadFile = File(...)):
    """
    Publicly accessible CV extraction (no authentication).
    Also saves the file locally in 'backend/data/cvs/' for simulation mode.
    """
    try:
        content = await file.read()
        filename = file.filename or "cv_public.pdf"
        
        # 1. Save locally for simulation
        cv_id = str(uuid.uuid4())
        local_dir = os.path.join("backend", "data", "cvs")
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, f"{cv_id}_{filename}")
        
        with open(local_path, "wb") as f:
            f.write(content)
        
        # 2. Extract text
        raw_text = extract_raw_text(content, filename)
        
        # 3. Structured extraction
        pages = extract_pages_as_images(content, filename, dpi=130)
        extraction = await run_in_threadpool(smart_extract_cv, raw_text, pages)
        
        return {
            "id": cv_id,
            "filename": filename,
            "extraction": extraction,
            "cv_url": f"/api/cv/download/{cv_id}" 
        }
    except Exception as e:
        logging.error(f"Error in public_extract_cv: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse du CV: {str(e)}")


PUBLIC_CV_DIR = os.path.join("backend", "data", "cvs")


def find_public_cv(cv_id: str) -> str | None:
    """Path of a CV sent from the careers page (`/api/cv/download/{cv_id}`), or None."""
    if not cv_id or not os.path.isdir(PUBLIC_CV_DIR) or "/" in cv_id or "\\" in cv_id:
        return None
    for f in os.listdir(PUBLIC_CV_DIR):
        if f.startswith(cv_id):
            return os.path.join(PUBLIC_CV_DIR, f)
    return None


@router.get("/download/{cv_id}")
async def download_cv(cv_id: str):
    """Download a CV from the local simulation storage."""
    path = find_public_cv(cv_id)
    if path:
        from fastapi.responses import FileResponse
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="Fichier introuvable")
