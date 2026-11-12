"""Événements — CVs collected at a job fair / forum: scan in bulk, extract everything with the AI, keep a searchable pool
(« vivier »), and turn the people you like into candidates later.

POST   /cv-events/{id}/scan      one CV file (PDF, Word, image) → extracted and stored as a prospect
POST   /cv-prospects/convert     prospects → candidates (employees with status « candidate », CV copied to their folder)
Everything is for HR / admin.  Tables: rh.cv_events, rh.cv_prospects (migration cv_events.sql)."""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from loguru import logger
from pydantic import BaseModel, Field
from supabase import Client

from app.config import settings
from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.services import cv_pool
from app.services import storage as file_storage
from app.services.audit import log_action

router = APIRouter(tags=["Événements — vivier de CV"])

STATUSES = {"new", "shortlisted", "rejected"}   # « converted » is set only by the conversion


# ── events ────────────────────────────────────────────────────────────────────────

class EventIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    event_date: Optional[str] = Field(default=None, max_length=10)   # YYYY-MM-DD
    location: Optional[str] = Field(default=None, max_length=160)
    notes: Optional[str] = Field(default=None, max_length=2000)


def _event_or_404(db: Client, event_id: str) -> dict:
    rows = db.table("cv_events").select("*").eq("id", event_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Événement introuvable")
    return rows[0]


def _event_values(body: EventIn) -> dict:
    d = {"name": body.name.strip(), "location": (body.location or "").strip() or None, "notes": (body.notes or "").strip() or None}
    if body.event_date:
        try:
            datetime.strptime(body.event_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=422, detail="Date invalide (AAAA-MM-JJ)")
        d["event_date"] = body.event_date
    else:
        d["event_date"] = None
    return d


@router.get("/cv-events")
def list_events(db: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    """The events with how many CVs were scanned, kept (shortlisted) and already converted."""
    events = db.table("cv_events").select("*").order("created_at", desc=True).execute().data or []
    people = db.table("cv_prospects").select("event_id, status").limit(20000).execute().data or []
    out = []
    for e in events:
        mine = [p for p in people if p.get("event_id") == e["id"]]
        out.append({**e, "total": len(mine), "shortlisted": sum(1 for p in mine if p.get("status") == "shortlisted"),
                    "converted": sum(1 for p in mine if p.get("status") == "converted")})
    out.sort(key=lambda e: (str(e.get("event_date") or ""), str(e.get("created_at") or "")), reverse=True)
    return out


@router.post("/cv-events", status_code=201)
def create_event(body: EventIn, db: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    row = {**_event_values(body), "created_by": user.get("id")}
    res = db.table("cv_events").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Création impossible")
    log_action(db, user["id"], "CREATE_CV_EVENT", "cv_event", res.data[0]["id"])
    return {**res.data[0], "total": 0, "shortlisted": 0, "converted": 0}


@router.patch("/cv-events/{event_id}")
def update_event(event_id: UUID, body: EventIn, db: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    _event_or_404(db, str(event_id))
    res = db.table("cv_events").update(_event_values(body)).eq("id", str(event_id)).execute()
    return res.data[0] if res.data else _event_or_404(db, str(event_id))


def _forget_file(path: Optional[str]) -> None:
    if not path:
        return
    full = file_storage.resolve_upload(path)
    if full and os.path.isfile(full):
        try:
            os.remove(full)
        except OSError:
            pass
    file_storage.durable_delete(path)


@router.delete("/cv-events/{event_id}", status_code=204)
def delete_event(event_id: UUID, db: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    """Deletes the event and the CVs scanned for it. Candidates already created from them are kept (with their own copy of the CV)."""
    _event_or_404(db, str(event_id))
    for p in db.table("cv_prospects").select("id, file_path").eq("event_id", str(event_id)).execute().data or []:
        _forget_file(p.get("file_path"))       # a converted CV was copied to the candidate's own folder, so the original can go
    db.table("cv_prospects").delete().eq("event_id", str(event_id)).execute()
    db.table("cv_events").delete().eq("id", str(event_id)).execute()
    log_action(db, user["id"], "DELETE_CV_EVENT", "cv_event", str(event_id))


# ── prospects ─────────────────────────────────────────────────────────────────────

@router.get("/cv-events/{event_id}/prospects")
def list_prospects(event_id: UUID, db: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    _event_or_404(db, str(event_id))
    rows = db.table("cv_prospects").select("*").eq("event_id", str(event_id)).order("created_at", desc=True).limit(3000).execute().data or []
    return rows


@router.post("/cv-events/{event_id}/scan", status_code=201)
async def scan_cv(event_id: UUID, file: UploadFile = File(...), db: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    """One CV file → stored, fully extracted (identity, contact, skills, experience, education, languages…) and added to the pool.
    The page sends the files one by one, so a bad file never blocks the others."""
    event = _event_or_404(db, str(event_id))
    filename = os.path.basename(file.filename or "cv.pdf")
    ext = cv_pool.safe_ext(filename)
    if not ext:
        raise HTTPException(status_code=415, detail="Format non pris en charge (PDF, Word, PNG, JPG ou WebP)")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Fichier vide")
    if len(content) > cv_pool.MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (15 Mo maximum)")

    rel = f"cv-events/{event_id}/{uuid.uuid4().hex}{ext}"
    full = os.path.join(settings.UPLOAD_DIR, rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "wb") as fh:
        fh.write(content)
    await asyncio.to_thread(file_storage.durable_put, rel, content, file.content_type or "application/octet-stream")

    extraction_state, error, fields = "ok", None, {}
    try:
        extracted = await run_in_threadpool(cv_pool.extract_cv_file, content, filename)
        fields = cv_pool.prospect_fields(extracted, filename)
        if not extracted.get("ai_used"):
            extraction_state = "partial"          # the AI was not available: text rules only, to be checked by a human
        if not (cv_pool.clean_text(extracted.get("full_name")) or cv_pool.norm_email(extracted.get("email"))):
            extraction_state, error = "failed", "Aucune identité lisible dans ce document"   # the file name is only a placeholder
    except Exception as e:                        # the file is kept: HR can still open it and fill the fields in
        logger.warning(f"[cv-events] extraction failed for {filename}: {type(e).__name__}: {e}")
        extraction_state, error = "failed", f"Extraction impossible ({type(e).__name__})"
        fields = {"full_name": cv_pool.name_from_filename(filename), "skills": [], "profile": {}}

    pool = db.table("cv_prospects").select("id, email, phone, full_name").limit(20000).execute().data or []
    twin = cv_pool.find_duplicate(pool, fields.get("email"), fields.get("phone"))
    row = {
        "event_id": str(event_id), **{k: v for k, v in fields.items() if v not in (None, "")},
        "skills": fields.get("skills") or [], "profile": fields.get("profile") or {},
        "file_name": filename, "file_path": rel, "file_size": len(content), "mime_type": file.content_type or "",
        "status": "new", "extraction": extraction_state, "extraction_error": error,
        "duplicate_of": twin["id"] if twin else None, "created_by": user.get("id"),
    }
    res = db.table("cv_prospects").insert(row).execute()
    if not res.data:
        _forget_file(rel)
        raise HTTPException(status_code=500, detail="Enregistrement impossible")
    return {**res.data[0], "duplicate_name": twin.get("full_name") if twin else None, "event_name": event.get("name")}


class ProspectPatch(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=160)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=60)
    city: Optional[str] = Field(default=None, max_length=100)
    headline: Optional[str] = Field(default=None, max_length=200)
    years_experience: Optional[float] = Field(default=None, ge=0, le=60)
    skills: Optional[List[str]] = None
    status: Optional[str] = None
    rating: Optional[int] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = Field(default=None, max_length=4000)


def _prospect_or_404(db: Client, pid: str) -> dict:
    rows = db.table("cv_prospects").select("*").eq("id", pid).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="CV introuvable")
    return rows[0]


@router.patch("/cv-prospects/{prospect_id}")
def update_prospect(prospect_id: UUID, body: ProspectPatch, db: Client = Depends(get_db), _user: dict = Depends(require_hr_or_admin)):
    """Corrections of the extracted fields, status (new / shortlisted / rejected), rating and notes."""
    current = _prospect_or_404(db, str(prospect_id))
    patch = body.model_dump(exclude_unset=True)
    if "status" in patch:
        if patch["status"] not in STATUSES:
            raise HTTPException(status_code=422, detail="Statut inconnu")
        if current.get("status") == "converted":
            raise HTTPException(status_code=409, detail="Ce CV est déjà devenu une candidature")
    if "skills" in patch:
        patch["skills"] = [s.strip() for s in (patch["skills"] or []) if s and s.strip()][:40]
    if "email" in patch:
        patch["email"] = cv_pool.norm_email(patch["email"]) or None
    for k in ("full_name", "phone", "city", "headline", "notes"):
        if k in patch:
            patch[k] = cv_pool.clean_text(patch[k]) if k != "notes" else ((patch[k] or "").strip() or None)
    if current.get("extraction") == "failed" and ("full_name" in patch or "email" in patch) and (patch.get("full_name") or patch.get("email")):
        patch.update({"extraction": "partial", "extraction_error": None})     # a person has now read and fixed the identity
    if not patch:
        return current
    res = db.table("cv_prospects").update(patch).eq("id", str(prospect_id)).execute()
    return res.data[0] if res.data else {**current, **patch}


@router.delete("/cv-prospects/{prospect_id}", status_code=204)
def delete_prospect(prospect_id: UUID, db: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    p = _prospect_or_404(db, str(prospect_id))
    _forget_file(p.get("file_path"))
    db.table("cv_prospects").delete().eq("id", str(prospect_id)).execute()
    log_action(db, user["id"], "DELETE_CV_PROSPECT", "cv_prospect", str(prospect_id))


# ── conversion to candidates ──────────────────────────────────────────────────────

class ConvertIn(BaseModel):
    ids: List[UUID] = Field(min_length=1, max_length=200)
    ad_id: Optional[UUID] = None        # the job post the candidates apply to (optional)
    position: Optional[str] = Field(default=None, max_length=200)


def _known_person(db: Client, email: str, ad: Optional[dict]) -> Optional[dict]:
    """Someone with this e-mail who should not be added again: staff / interns always; a candidate when no job post is chosen or
    when they already applied to that same job post (applying to another post is a new application)."""
    if not email:
        return None
    for e in db.table("employees").select("id, status, custom_fields").eq("email", email).execute().data or []:
        if e.get("status") in ("active", "intern", "on-leave"):
            return e
        if e.get("status") == "candidate" and (not ad or (e.get("custom_fields") or {}).get("ad_id") == str(ad["id"])):
            return e
    return None


def _convert_one(db: Client, p: dict, event: dict, ad: Optional[dict], position: Optional[str], user: dict) -> dict:
    if p.get("candidate_id") or p.get("status") == "converted":
        return {"id": p["id"], "ok": False, "error": "already_converted", "candidate_id": p.get("candidate_id")}
    name = cv_pool.clean_text(p.get("full_name"))
    if not name or len(name) < 2:
        return {"id": p["id"], "ok": False, "error": "no_name"}
    if p.get("extraction") == "failed":      # the name is only the file's name: read the CV and fix the identity first
        return {"id": p["id"], "ok": False, "error": "needs_review"}
    email = cv_pool.norm_email(p.get("email"))
    known = _known_person(db, email, ad)
    if known:
        return {"id": p["id"], "ok": False, "error": "already_known", "candidate_id": known["id"], "known_as": known.get("status")}
    profile = p.get("profile") or {}
    custom = {
        "source": f"Événement · {event.get('name')}", "recruitment_stage": "new", "stage_changed_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "event_id": event["id"], "prospect_id": p["id"], "skills": p.get("skills") or [], "cv_profile": profile,
    }
    if ad:
        custom["ad_id"] = str(ad["id"])
    row = {
        "full_name": name, "email": email or None, "phone": p.get("phone"), "city": p.get("city"),
        "position": (position or (ad or {}).get("poste") or p.get("headline") or None), "status": "candidate",
        "address": profile.get("address"), "nationality": profile.get("nationality"), "notes": profile.get("summary") or None,
        "custom_fields": custom,
    }
    created = db.table("employees").insert({k: v for k, v in row.items() if v not in (None, "")}).execute()
    if not created.data:
        return {"id": p["id"], "ok": False, "error": "create_failed"}
    cand = created.data[0]
    # the CV goes to the candidate's own folder (Candidats, interview room): same circuit as every employee file
    try:
        if p.get("file_path"):
            data = file_storage.read_upload(p["file_path"])
            if data:
                ext = os.path.splitext(p["file_path"])[1]
                rel = f"employees/{cand['id']}/{uuid.uuid4().hex}{ext}"
                full = os.path.join(settings.UPLOAD_DIR, rel)
                os.makedirs(os.path.dirname(full), exist_ok=True)
                with open(full, "wb") as fh:
                    fh.write(data)
                file_storage.durable_put(rel, data, p.get("mime_type") or "application/octet-stream")
                db.table("employee_files").insert({
                    "employee_id": cand["id"], "name": p.get("file_name") or f"CV{ext}", "file_type": "cv", "file_path": rel,
                    "file_size": len(data), "mime_type": p.get("mime_type") or "", "uploaded_by": user.get("id"),
                }).execute()
    except Exception as e:  # the candidate exists anyway; the CV stays available in the pool
        logger.warning(f"[cv-events] CV copy failed for prospect {p['id']}: {type(e).__name__}: {e}")
    db.table("cv_prospects").update({"status": "converted", "candidate_id": cand["id"]}).eq("id", p["id"]).execute()
    log_action(db, user["id"], "CONVERT_CV_PROSPECT", "cv_prospect", p["id"])
    return {"id": p["id"], "ok": True, "candidate_id": cand["id"]}


@router.post("/cv-prospects/convert")
def convert_prospects(body: ConvertIn, db: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    """Makes candidates (status « candidate », stage « new », linked to the job post when one is chosen) from the selected CVs.
    One result per CV: a CV that cannot be converted (already a candidate, no name…) never blocks the others."""
    ad = None
    if body.ad_id:
        from app.repositories import annonce_repository
        res = annonce_repository.get_annonce(db, str(body.ad_id))
        ad = (res.data[0] if isinstance(res.data, list) and res.data else res.data) if res else None
        if not ad or not ad.get("is_active", True):
            raise HTTPException(status_code=404, detail="Cette offre n'est plus disponible")
    position = cv_pool.clean_text(body.position)
    events: dict = {}
    results = []
    for pid in body.ids:
        p = (db.table("cv_prospects").select("*").eq("id", str(pid)).limit(1).execute().data or [None])[0]
        if not p:
            results.append({"id": str(pid), "ok": False, "error": "not_found"})
            continue
        if p["event_id"] not in events:
            events[p["event_id"]] = (db.table("cv_events").select("*").eq("id", p["event_id"]).limit(1).execute().data or [{"id": p["event_id"], "name": ""}])[0]
        results.append(_convert_one(db, p, events[p["event_id"]], ad, position, user))
    return {"results": results, "converted": sum(1 for r in results if r["ok"])}
