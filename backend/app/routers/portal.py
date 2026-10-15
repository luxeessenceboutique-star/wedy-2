"""Employee self-service portal — /api/portal"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user
from app.services.audit import notify_hr, create_notification
from app.repositories import portal_repository

router = APIRouter(prefix="/portal", tags=["Employee Portal"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_my_employee(supabase: Client, current_user: dict) -> dict:
    """Find the employee record linked to the authenticated user by email."""
    email = current_user["email"]
    try:
        res = portal_repository.find_employee_by_email(supabase, email)
        rows = res.data or []
        if rows:
            return rows[0]
    except Exception:
        pass
    raise HTTPException(
        status_code=404,
        detail="Aucun profil employé lié à ce compte. Contactez votre responsable RH.",
    )


# ── My profile ─────────────────────────────────────────────────────────────────

@router.get("/me")
def get_my_profile(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return _get_my_employee(supabase, current_user)


# ── Dashboard stats ────────────────────────────────────────────────────────────

@router.get("/me/stats")
def get_my_stats(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    emp = _get_my_employee(supabase, current_user)
    emp_id = emp["id"]
    stats: dict = {}

    try:
        leaves = portal_repository.list_leaves_for_stats(supabase, emp_id).data or []
        stats["leaves_pending"]  = sum(1 for l in leaves if l.get("status") == "pending")
        stats["leaves_approved"] = sum(1 for l in leaves if l.get("status") == "approved")
        stats["leaves_total"]    = len(leaves)
    except Exception:
        stats.update({"leaves_pending": 0, "leaves_approved": 0, "leaves_total": 0})

    try:
        training = portal_repository.list_trainings_for_stats(supabase, emp_id).data or []
        stats["training_total"]     = len(training)
        stats["training_completed"] = sum(1 for t in training if t.get("status") == "completed")
        stats["training_planned"]   = sum(1 for t in training if t.get("status") in ("planned", "in_progress"))
    except Exception:
        stats.update({"training_total": 0, "training_completed": 0, "training_planned": 0})

    try:
        doc_reqs = portal_repository.list_document_requests_for_stats(supabase, emp_id).data or []
        stats["doc_requests_pending"] = sum(1 for d in doc_reqs if d.get("status") == "pending")
        stats["doc_requests_total"]   = len(doc_reqs)
    except Exception:
        stats.update({"doc_requests_pending": 0, "doc_requests_total": 0})

    return stats


# ── Leave requests ─────────────────────────────────────────────────────────────

@router.get("/me/leaves")
def get_my_leaves(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    emp = _get_my_employee(supabase, current_user)
    try:
        res = portal_repository.list_my_leaves(supabase, emp["id"])
        return res.data or []
    except Exception:
        return []


@router.post("/me/leaves", status_code=201)
def submit_leave(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    emp = _get_my_employee(supabase, current_user)
    payload["employee_id"] = emp["id"]
    payload.setdefault("status", "pending")
    try:
        res = portal_repository.create_leave(supabase, payload)
        leave = (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    notify_hr(
        supabase,
        title=f"Demande de congé — {emp['full_name']}",
        body=(
            f"{emp['full_name']} a soumis une demande de congé "
            f"({payload.get('type', '')}) "
            f"du {payload.get('start_date', '')} au {payload.get('end_date', '')}"
        ),
        notif_type="leave_pending",
        link=f"/app/requests?kind=leave&id={leave.get('id', '')}",
    )
    return leave


# ── Document requests ──────────────────────────────────────────────────────────

@router.get("/me/document-requests")
def get_my_doc_requests(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    emp = _get_my_employee(supabase, current_user)
    try:
        res = portal_repository.list_my_document_requests(supabase, emp["id"])
        return res.data or []
    except Exception:
        return []


@router.post("/me/document-requests", status_code=201)
def submit_doc_request(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    emp = _get_my_employee(supabase, current_user)
    payload["employee_id"] = emp["id"]
    payload.setdefault("status", "pending")
    try:
        res = portal_repository.create_document_request(supabase, payload)
        doc_req = (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    notify_hr(
        supabase,
        title=f"Demande de document — {emp['full_name']}",
        body=f"{emp['full_name']} a demandé : {payload.get('doc_type', 'document')}",
        notif_type="document_request",
        link=f"/app/requests?kind=document&id={doc_req.get('id', '')}",
    )
    return doc_req


# ── Training ───────────────────────────────────────────────────────────────────

@router.get("/me/training")
def get_my_training(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    emp = _get_my_employee(supabase, current_user)
    try:
        res = portal_repository.list_my_training(supabase, emp["id"])
        return res.data or []
    except Exception:
        return []


# ── OKRs ───────────────────────────────────────────────────────────────────────

@router.get("/me/okrs")
def get_my_okrs(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    emp = _get_my_employee(supabase, current_user)
    try:
        res = portal_repository.list_my_okrs(supabase, emp["id"])
        return res.data or []
    except Exception:
        return []
