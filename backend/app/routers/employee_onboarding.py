"""Employee onboarding router — 30-60-90 day plans, pulse surveys, e-signature"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action
from app.repositories import onboarding_repository

router = APIRouter(prefix="/employee-onboarding", tags=["EmployeeOnboarding"])

DEFAULT_PLAN_30 = [
    {"id": "p30_1", "label": "Rencontre avec le manager direct",      "done": False},
    {"id": "p30_2", "label": "Formation onboarding RH",               "done": False},
    {"id": "p30_3", "label": "Accès outils et systèmes configurés",   "done": False},
    {"id": "p30_4", "label": "Présentation aux équipes",              "done": False},
    {"id": "p30_5", "label": "Lecture documentation interne",         "done": False},
    {"id": "p30_6", "label": "Premier point formel avec le manager",  "done": False},
    {"id": "p30_7", "label": "Signature contrat de travail",          "done": False},
]
DEFAULT_PLAN_60 = [
    {"id": "p60_1", "label": "Première mission/livraison réalisée",   "done": False},
    {"id": "p60_2", "label": "Maîtrise des processus internes",       "done": False},
    {"id": "p60_3", "label": "Évaluation mi-période (30j) complétée", "done": False},
    {"id": "p60_4", "label": "Plan de développement individuel défini","done": False},
    {"id": "p60_5", "label": "Intégration culture d'entreprise",      "done": False},
    {"id": "p60_6", "label": "Buddy / mentor rencontré régulièrement","done": False},
]
DEFAULT_PLAN_90 = [
    {"id": "p90_1", "label": "Objectifs 90j atteints",                "done": False},
    {"id": "p90_2", "label": "Autonomie opérationnelle confirmée",    "done": False},
    {"id": "p90_3", "label": "Évaluation finale onboarding",          "done": False},
    {"id": "p90_4", "label": "Plan de formation identifié",           "done": False},
    {"id": "p90_5", "label": "Feedback 360° collecté",                "done": False},
    {"id": "p90_6", "label": "Objectifs N+1 définis",                 "done": False},
]


def _safe_get(table, supabase, employee_id):
    return onboarding_repository.safe_get_by_employee(table, supabase, employee_id)


# ── Onboarding plan ────────────────────────────────────────────────────────────

@router.get("")
def list_onboarding(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all employees that have an onboarding record."""
    try:
        res = onboarding_repository.list_onboarding(supabase)
        return res.data or []
    except Exception:
        return []


@router.get("/{employee_id}")
def get_onboarding(
    employee_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    rows = _safe_get("employee_onboarding", supabase, employee_id)
    if rows:
        row = rows[0]
        if not row.get("plan_30"): row["plan_30"] = DEFAULT_PLAN_30
        if not row.get("plan_60"): row["plan_60"] = DEFAULT_PLAN_60
        if not row.get("plan_90"): row["plan_90"] = DEFAULT_PLAN_90
        return row
    try:
        created = onboarding_repository.create_onboarding(supabase, {
            "employee_id": employee_id,
            "phase": "day30",
            "plan_30": DEFAULT_PLAN_30,
            "plan_60": DEFAULT_PLAN_60,
            "plan_90": DEFAULT_PLAN_90,
        })
        return (created.data or [{}])[0]
    except Exception as e:
        return {
            "employee_id": employee_id, "phase": "day30",
            "plan_30": DEFAULT_PLAN_30, "plan_60": DEFAULT_PLAN_60,
            "plan_90": DEFAULT_PLAN_90, "contract_signed": False,
            "_error": str(e)[:100],
        }


@router.patch("/{employee_id}")
def update_onboarding(
    employee_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    payload.pop("employee_id", None)
    payload["updated_at"] = datetime.utcnow().isoformat()
    rows = _safe_get("employee_onboarding", supabase, employee_id)
    if rows:
        res = onboarding_repository.update_onboarding(supabase, employee_id, payload)
    else:
        payload["employee_id"] = employee_id
        for k, v in [("plan_30", DEFAULT_PLAN_30), ("plan_60", DEFAULT_PLAN_60), ("plan_90", DEFAULT_PLAN_90)]:
            payload.setdefault(k, v)
        res = onboarding_repository.create_onboarding(supabase, payload)
    return (res.data or [{}])[0]


@router.post("/{employee_id}/sign-contract")
def sign_contract(
    employee_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    now = datetime.utcnow().isoformat()
    rows = _safe_get("employee_onboarding", supabase, employee_id)
    if rows:
        res = onboarding_repository.update_onboarding(supabase, employee_id, {
            "contract_signed": True, "contract_signed_at": now, "updated_at": now,
        })
    else:
        res = onboarding_repository.create_onboarding(supabase, {
            "employee_id": employee_id, "contract_signed": True,
            "contract_signed_at": now, "phase": "day30",
            "plan_30": DEFAULT_PLAN_30, "plan_60": DEFAULT_PLAN_60, "plan_90": DEFAULT_PLAN_90,
        })
    log_action(supabase, current_user["id"], "UPDATE", "employee_onboarding", employee_id)
    return (res.data or [{}])[0]


# ── Pulse surveys ──────────────────────────────────────────────────────────────

@router.get("/{employee_id}/pulse")
def list_pulse(
    employee_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        res = onboarding_repository.list_pulse_surveys(supabase, employee_id)
        return res.data or []
    except Exception:
        return []


@router.post("/{employee_id}/pulse", status_code=201)
def create_pulse(
    employee_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload["employee_id"] = employee_id
    try:
        res = onboarding_repository.create_pulse_survey(supabase, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{employee_id}/pulse/{pulse_id}", status_code=204)
def delete_pulse(
    employee_id: str,
    pulse_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        onboarding_repository.delete_pulse_survey(supabase, pulse_id)
    except Exception:
        pass
