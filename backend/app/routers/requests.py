"""HR Requests router — /api/requests (Supabase SDK Version)"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from pydantic import BaseModel
from app.dependencies import get_current_user, require_role, require_hr_or_admin
from app.schemas import HRRequestCreate, HRRequestUpdate, HRRequestOut
from app.services.audit import log_action, create_notification, notify_hr
from app.repositories import hr_request_repository

router = APIRouter(prefix="/requests", tags=["HR Requests"])

@router.get("", response_model=List[HRRequestOut])
def list_requests(
    profile_id: Optional[UUID] = None,
    status: Optional[str] = None,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    response = hr_request_repository.list_requests(
        supabase, str(profile_id) if profile_id else None, status
    )
    return response.data

@router.post("", response_model=HRRequestOut, status_code=201)
def create_request(
    payload: HRRequestCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    data = payload.model_dump()
    response = hr_request_repository.create_request(supabase, data)
    if not response.data:
        raise HTTPException(status_code=400, detail="Could not create request")

    req = response.data[0]
    log_action(supabase, current_user["id"], "CREATE_REQUEST", "hr_request", req["id"])

    # Notify HR/admin that a new request was submitted
    req_type = req.get("type", "demande")
    requester = current_user.get("full_name") or current_user.get("email", "Un employé")
    notify_hr(
        supabase,
        title=f"Nouvelle demande — {requester}",
        body=f"{requester} a soumis une demande de type « {req_type} ».",
        notif_type="employee_request",
        link=f"/app/requests?kind=other&id={req['id']}",
    )
    return req

@router.patch("/{request_id}/approve", response_model=HRRequestOut)
def approve_request(
    request_id: UUID,
    status: str, # 'approved' or 'rejected'
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr", "manager")),
):
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")

    response = hr_request_repository.update_request_status(supabase, str(request_id), status)
    if not response.data:
        raise HTTPException(status_code=404, detail="Request not found")

    req = response.data[0]
    status_label = "approuvée" if status == "approved" else "refusée"
    create_notification(
        supabase,
        user_id=req["profile_id"],
        message=f"Votre demande de {req.get('type', 'demande')} a été {status_label}.",
        title=f"Demande {status_label}",
        notif_type="info" if status == "approved" else "warning",
    )
    log_action(supabase, current_user["id"], f"{status.upper()}_REQUEST", "hr_request", str(request_id))
    return req


# ══════════════════════════════════════════════════════════════════════════════
# HR inbox — every request submitted by employees, in one place
#   leave      -> leave_requests      (approved / rejected)
#   document   -> document_requests   (pending / in_progress / completed / rejected)
#   other      -> hr_requests         (approved / rejected)
# ══════════════════════════════════════════════════════════════════════════════

LEAVE_LABELS = {
    "annual": "Congé annuel", "sick": "Congé maladie", "personal": "Congé personnel", "unjustified": "Absence non justifiée",
    "maternity": "Congé maternité", "paternity": "Congé paternité", "unpaid": "Congé sans solde",
}
DOC_LABELS = {
    "attestation_travail": "Attestation de travail", "bulletin_paie": "Bulletin de paie",
    "attestation_conge": "Attestation de congé", "certificat_presence": "Certificat de présence",
    "lettre_recommandation": "Lettre de recommandation", "autre": "Autre document",
}
OTHER_LABELS = {"leave": "Demande de congé", "document": "Demande de document",
                "update": "Mise à jour des informations", "other": "Autre demande"}
PENDING_STATES = ("pending", "in_progress")


def _state(status: str) -> str:
    """pending = needs HR action, done = handled positively, rejected."""
    if status in PENDING_STATES:
        return "pending"
    return "rejected" if status == "rejected" else "done"


def _inbox_items(supabase: Client) -> tuple[list, list]:
    items, warnings = [], []

    try:
        rows = (supabase.table("leave_requests")
                .select("*, employees(id, full_name, position, department)")
                .order("created_at", desc=True).limit(500).execute().data or [])
        for r in rows:
            e = r.get("employees") or {}
            span = f"Du {r.get('start_date', '')} au {r.get('end_date', '')}"
            if r.get("days"):
                span += f" ({r['days']} j)"
            items.append({
                "kind": "leave", "id": r["id"], "employee_id": r.get("employee_id"),
                "employee_name": e.get("full_name") or "—", "department": e.get("department"),
                "title": LEAVE_LABELS.get(r.get("type"), r.get("type") or "Congé"),
                "details": " · ".join(x for x in (span, r.get("reason")) if x),
                "status": r.get("status") or "pending", "note": r.get("comment"),
                "created_at": r.get("created_at"),
            })
    except Exception as ex:
        warnings.append(f"congés: {ex}")

    try:
        rows = (supabase.table("document_requests")
                .select("*, employees(id, full_name, position, department)")
                .order("created_at", desc=True).limit(500).execute().data or [])
        for r in rows:
            e = r.get("employees") or {}
            items.append({
                "kind": "document", "id": r["id"], "employee_id": r.get("employee_id"),
                "employee_name": e.get("full_name") or "—", "department": e.get("department"),
                "title": DOC_LABELS.get(r.get("doc_type"), r.get("doc_type") or "Document"),
                "details": r.get("comment") or "",
                "status": r.get("status") or "pending", "note": r.get("hr_note"),
                "created_at": r.get("created_at"),
            })
    except Exception as ex:
        warnings.append(f"documents: {ex}")

    try:
        try:
            rows = (supabase.table("hr_requests").select("*, profiles(full_name, email)")
                    .order("created_at", desc=True).limit(500).execute().data or [])
        except Exception:
            rows = (supabase.table("hr_requests").select("*")
                    .order("created_at", desc=True).limit(500).execute().data or [])
        for r in rows:
            p = r.get("profiles") or {}
            items.append({
                "kind": "other", "id": r["id"], "employee_id": None,
                "employee_name": p.get("full_name") or p.get("email") or "—", "department": None,
                "title": OTHER_LABELS.get(r.get("type"), r.get("type") or "Demande"),
                "details": r.get("comment") or "",
                "status": r.get("status") or "pending", "note": None,
                "created_at": r.get("created_at"),
            })
    except Exception as ex:
        warnings.append(f"demandes: {ex}")

    for it in items:
        it["state"] = _state(it["status"])
    # needs action first, then newest first
    items.sort(key=lambda i: i.get("created_at") or "", reverse=True)
    items.sort(key=lambda i: 0 if i["state"] == "pending" else 1)
    return items, warnings


@router.get("/inbox")
def requests_inbox(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    items, warnings = _inbox_items(supabase)
    counts = {"total": len(items), "pending": sum(1 for i in items if i["state"] == "pending")}
    for k in ("leave", "document", "other"):
        counts[k] = sum(1 for i in items if i["kind"] == k)
        counts[f"pending_{k}"] = sum(1 for i in items if i["kind"] == k and i["state"] == "pending")
    out = {"data": items, "counts": counts}
    if warnings:
        out["warnings"] = warnings
    return out


@router.get("/inbox/count")
def requests_inbox_count(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Cheap pending counter for the sidebar badge."""
    def count(table: str, statuses: tuple) -> int:
        try:
            r = supabase.table(table).select("id", count="exact").in_("status", list(statuses)).execute()
            return r.count or 0
        except Exception:
            return 0
    return {"pending": count("leave_requests", ("pending",))
                       + count("document_requests", PENDING_STATES)
                       + count("hr_requests", ("pending",))}


class InboxDecision(BaseModel):
    status: str
    note: Optional[str] = None


def _notify_employee(supabase: Client, employee_id: Optional[str], title: str, message: str, ok: bool, link: str):
    """Notify the user linked (by e-mail) to this employee record. Never raises."""
    if not employee_id:
        return
    try:
        emp = supabase.table("employees").select("email").eq("id", employee_id).maybe_single().execute()
        email = ((emp.data if emp is not None else None) or {}).get("email")
        if not email:
            return
        prof = supabase.table("profiles").select("user_id").ilike("email", email).limit(1).execute().data
        if prof:
            create_notification(supabase, user_id=prof[0]["user_id"], message=message, title=title,
                                notif_type="success" if ok else "warning", link=link)
    except Exception as e:
        print(f"[requests] employee notification failed: {e}")


@router.patch("/inbox/{kind}/{req_id}")
def decide_request(
    kind: str,
    req_id: str,
    body: InboxDecision,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    from datetime import datetime
    note = (body.note or "").strip() or None

    if kind == "leave":
        if body.status not in ("approved", "rejected"):
            raise HTTPException(status_code=400, detail="Statut invalide pour un congé")
        from app.routers.leaves import review_leave
        review_leave(req_id, body.status, supabase, current_user)  # audit + employee notification
        if note:
            try:
                supabase.table("leave_requests").update({"comment": note}).eq("id", req_id).execute()
            except Exception as e:
                print(f"[requests] leave comment not saved: {e}")
        return {"kind": kind, "id": req_id, "status": body.status}

    if kind == "document":
        if body.status not in ("pending", "in_progress", "completed", "rejected"):
            raise HTTPException(status_code=400, detail="Statut invalide pour un document")
        upd = {"status": body.status, "updated_at": datetime.utcnow().isoformat()}
        if note is not None:
            upd["hr_note"] = note
        res = supabase.table("document_requests").update(upd).eq("id", req_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Demande introuvable")
        row = res.data[0]
        log_action(supabase, current_user["id"], f"DOCUMENT_REQUEST_{body.status.upper()}", "document_request", req_id)
        label = DOC_LABELS.get(row.get("doc_type"), "document")
        if body.status == "completed":
            _notify_employee(supabase, row.get("employee_id"), "Document prêt",
                             f"Votre demande « {label} » a été traitée." + (f" Note RH : {note}" if note else ""),
                             True, "/employee/documents")
        elif body.status == "rejected":
            _notify_employee(supabase, row.get("employee_id"), "Demande refusée",
                             f"Votre demande « {label} » a été refusée." + (f" Motif : {note}" if note else ""),
                             False, "/employee/documents")
        return {"kind": kind, "id": req_id, "status": body.status}

    if kind == "other":
        if body.status not in ("approved", "rejected"):
            raise HTTPException(status_code=400, detail="Statut invalide")
        approve_request(req_id, body.status, supabase, current_user)  # notifies the requester
        return {"kind": kind, "id": req_id, "status": body.status}

    raise HTTPException(status_code=400, detail="Type de demande inconnu")
