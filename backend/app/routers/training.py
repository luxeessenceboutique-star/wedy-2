"""Training router — catalog, assignments, ROI tracking, skills referential"""
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.repositories import training_repository

router = APIRouter(prefix="/training", tags=["Training"])

CATEGORIES = ["technique", "soft_skills", "compliance", "management", "langue", "securite"]


# ── Catalog ────────────────────────────────────────────────────────────────────

@router.get("/catalog")
def list_catalog(
    category: str = "",
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        return training_repository.list_catalog(supabase, category).data or []
    except Exception:
        return []


@router.post("/catalog", status_code=201)
def create_training(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.setdefault("is_active", True)
    try:
        res = training_repository.create_training(supabase, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/catalog/{training_id}")
def update_training(
    training_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    try:
        res = training_repository.update_training(supabase, training_id, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/catalog/{training_id}", status_code=204)
def delete_training(
    training_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        training_repository.deactivate_training(supabase, training_id)
    except Exception:
        pass


# ── Assignments ────────────────────────────────────────────────────────────────

@router.get("/assignments")
def list_assignments(
    employee_id: str = "",
    status: str = "",
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        return training_repository.list_assignments(supabase, employee_id, status).data or []
    except Exception:
        return []


@router.post("/assignments", status_code=201)
def assign_training(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        res = training_repository.create_assignment(supabase, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/assignments/{assignment_id}")
def update_assignment(
    assignment_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    try:
        res = training_repository.update_assignment(supabase, assignment_id, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(
    assignment_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        training_repository.delete_assignment(supabase, assignment_id)
    except Exception:
        pass


# ── Stats / ROI ────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        assignments = training_repository.list_assignments_for_stats(supabase).data or []

        total       = len(assignments)
        completed   = sum(1 for a in assignments if a.get("status") == "completed")
        in_progress = sum(1 for a in assignments if a.get("status") == "in_progress")
        planned     = sum(1 for a in assignments if a.get("status") == "planned")
        total_cost  = sum(
            float((a.get("training_catalog") or {}).get("cost_dh") or 0)
            for a in assignments
        )
        total_hours = sum(
            int((a.get("training_catalog") or {}).get("duration_hours") or 0)
            for a in assignments if a.get("status") == "completed"
        )
        return {
            "total": total, "completed": completed,
            "in_progress": in_progress, "planned": planned,
            "completion_rate": round(completed / total * 100) if total else 0,
            "total_budget_dh": total_cost,
            "total_hours_completed": total_hours,
        }
    except Exception:
        return {"total": 0, "completed": 0, "in_progress": 0, "planned": 0,
                "completion_rate": 0, "total_budget_dh": 0, "total_hours_completed": 0}


# ── Référentiel Compétences ────────────────────────────────────────────────────

@router.get("/skills")
def list_skills(
    category: str = "",
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        return training_repository.list_skills(supabase, category).data or []
    except Exception:
        return []


@router.post("/skills", status_code=201)
def create_skill(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.setdefault("is_active", True)
    try:
        res = training_repository.create_skill(supabase, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/skills/{skill_id}")
def update_skill(
    skill_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    try:
        res = training_repository.update_skill(supabase, skill_id, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/skills/{skill_id}", status_code=204)
def delete_skill(
    skill_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        training_repository.deactivate_skill(supabase, skill_id)
    except Exception:
        pass


# ── Employee Skills ────────────────────────────────────────────────────────────

@router.get("/employee-skills")
def get_employee_skills(
    employee_id: str = "",
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        return training_repository.get_employee_skills(supabase, employee_id).data or []
    except Exception:
        return []


@router.post("/employee-skills", status_code=201)
def upsert_employee_skill(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        res = training_repository.upsert_employee_skill(supabase, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/employee-skills/{record_id}", status_code=204)
def remove_employee_skill(
    record_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        training_repository.remove_employee_skill(supabase, record_id)
    except Exception:
        pass
