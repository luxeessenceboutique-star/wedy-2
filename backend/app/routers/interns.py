"""Interns router — uses employees table with status='intern'"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action
from app.repositories import intern_repository

router = APIRouter(prefix="/interns", tags=["Interns"])

# ── Default checklist template ─────────────────────────────────────────────────

DEFAULT_CHECKLIST = [
    {"id": "cin",            "label": "Copie CIN collectée",           "phase": "pre",         "done": False, "done_at": None},
    {"id": "insurance",      "label": "Attestation assurance maladie", "phase": "pre",         "done": False, "done_at": None},
    {"id": "cv",             "label": "CV reçu",                       "phase": "pre",         "done": False, "done_at": None},
    {"id": "convention",     "label": "Convention de stage signée",    "phase": "pre",         "done": False, "done_at": None},
    {"id": "nda",            "label": "NDA / Charte IT signée",        "phase": "pre",         "done": False, "done_at": None},
    {"id": "email_created",  "label": "Adresse email créée",           "phase": "pre",         "done": False, "done_at": None},
    {"id": "tools_access",   "label": "Accès outils configurés",       "phase": "pre",         "done": False, "done_at": None},
    {"id": "intro_company",  "label": "Présentation de l'entreprise",  "phase": "integration", "done": False, "done_at": None},
    {"id": "tools_training", "label": "Formation outils internes",     "phase": "integration", "done": False, "done_at": None},
    {"id": "mentor_met",     "label": "Rencontre avec le mentor",      "phase": "integration", "done": False, "done_at": None},
    {"id": "team_meeting",   "label": "Rencontre avec l'équipe",       "phase": "integration", "done": False, "done_at": None},
    {"id": "office_tour",    "label": "Visite des locaux",             "phase": "integration", "done": False, "done_at": None},
    {"id": "objectives_set", "label": "Objectifs du stage définis",    "phase": "evaluation",  "done": False, "done_at": None},
    {"id": "mid_eval",       "label": "Évaluation mi-parcours",        "phase": "evaluation",  "done": False, "done_at": None},
    {"id": "final_eval",     "label": "Évaluation finale complétée",   "phase": "evaluation",  "done": False, "done_at": None},
    {"id": "report_done",    "label": "Rapport de stage validé",       "phase": "evaluation",  "done": False, "done_at": None},
]

DEFAULT_OBJECTIVES = [
    {"id": "obj1", "label": "Maîtriser les outils internes", "done": False},
    {"id": "obj2", "label": "Livrer un premier projet", "done": False},
    {"id": "obj3", "label": "Intégrer la culture d'entreprise", "done": False},
]


# ── CRUD Interns ───────────────────────────────────────────────────────────────

@router.get("")
def list_interns(
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = intern_repository.list_interns(supabase, skip, limit)
    return {"data": res.data, "count": res.count or 0}


@router.get("/{intern_id}")
def get_intern(
    intern_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = intern_repository.get_intern(supabase, intern_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Stagiaire non trouvé")
    return res.data


@router.post("", status_code=201)
def create_intern(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload["status"] = "intern"
    payload["contract_type"] = payload.get("contract_type", "Stage")
    res = intern_repository.create_intern(supabase, payload)
    if not res.data:
        raise HTTPException(status_code=400, detail="Impossible de créer le stagiaire")
    intern = res.data[0]
    log_action(supabase, current_user["id"], "CREATE", "intern", intern["id"])
    return intern


@router.patch("/{intern_id}")
def update_intern(
    intern_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    res = intern_repository.update_intern(supabase, intern_id, payload)
    if not res.data:
        raise HTTPException(status_code=404, detail="Stagiaire non trouvé")
    log_action(supabase, current_user["id"], "UPDATE", "intern", intern_id)
    return res.data[0]


@router.delete("/{intern_id}", status_code=204)
def delete_intern(
    intern_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    res = intern_repository.delete_intern(supabase, intern_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Stagiaire non trouvé")
    log_action(supabase, current_user["id"], "DELETE", "intern", intern_id)


# ── Onboarding ─────────────────────────────────────────────────────────────────

def _table_missing(e: Exception) -> bool:
    msg = str(e).lower()
    return "42p01" in msg or "does not exist" in msg or "relation" in msg


@router.get("/{intern_id}/onboarding")
def get_onboarding(
    intern_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        res = intern_repository.get_onboarding(supabase, intern_id)
        rows = res.data or []
        if rows:
            row = rows[0]
            # Ensure checklist/objectives are populated if they were saved empty
            if not row.get("checklist"):
                row["checklist"] = DEFAULT_CHECKLIST
            if not row.get("objectives"):
                row["objectives"] = DEFAULT_OBJECTIVES
            return row
        # No record yet — create it
        created = intern_repository.create_onboarding(supabase, {
            "intern_id": intern_id,
            "phase": "pre",
            "checklist": DEFAULT_CHECKLIST,
            "objectives": DEFAULT_OBJECTIVES,
        })
        created_rows = created.data or []
        return created_rows[0] if created_rows else {
            "intern_id": intern_id, "phase": "pre",
            "checklist": DEFAULT_CHECKLIST, "objectives": DEFAULT_OBJECTIVES,
        }
    except Exception as e:
        err = str(e)
        if _table_missing(e):
            raise HTTPException(status_code=503, detail="MIGRATION_NEEDED")
        # Return defaults on any other error so UI still renders
        return {
            "intern_id": intern_id, "phase": "pre",
            "checklist": DEFAULT_CHECKLIST, "objectives": DEFAULT_OBJECTIVES,
            "_error": err[:200],
        }


@router.patch("/{intern_id}/onboarding")
def update_onboarding(
    intern_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    payload.pop("intern_id", None)
    payload["updated_at"] = datetime.utcnow().isoformat()
    try:
        existing = intern_repository.onboarding_exists(supabase, intern_id)
        if existing.data:
            res = intern_repository.update_onboarding(supabase, intern_id, payload)
        else:
            payload["intern_id"] = intern_id
            if "checklist" not in payload:
                payload["checklist"] = DEFAULT_CHECKLIST
            if "objectives" not in payload:
                payload["objectives"] = DEFAULT_OBJECTIVES
            res = intern_repository.create_onboarding(supabase, payload)
        rows = res.data or []
        return rows[0] if rows else {}
    except Exception as e:
        if _table_missing(e):
            raise HTTPException(status_code=503, detail="MIGRATION_NEEDED")
        raise


# ── Evaluations ────────────────────────────────────────────────────────────────

@router.get("/{intern_id}/evaluations")
def list_evaluations(
    intern_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        res = intern_repository.list_evaluations(supabase, intern_id)
        return res.data or []
    except Exception as e:
        if _table_missing(e):
            return []
        raise


@router.post("/{intern_id}/evaluations", status_code=201)
def create_evaluation(
    intern_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload["intern_id"] = intern_id
    try:
        res = intern_repository.create_evaluation(supabase, payload)
    except Exception as e:
        if _table_missing(e):
            raise HTTPException(status_code=503, detail="MIGRATION_NEEDED")
        raise
    if not res.data:
        raise HTTPException(status_code=400, detail="Erreur lors de la création de l'évaluation")
    return res.data[0]


@router.delete("/{intern_id}/evaluations/{eval_id}", status_code=204)
def delete_evaluation(
    intern_id: str,
    eval_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        intern_repository.delete_evaluation(supabase, intern_id, eval_id)
    except Exception:
        pass
