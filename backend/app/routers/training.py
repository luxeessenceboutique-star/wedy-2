"""Training router — catalog, assignments, ROI tracking, skills referential"""
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin

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
        q = supabase.table("training_catalog").select("*").eq("is_active", True).order("created_at", desc=True)
        if category:
            q = q.eq("category", category)
        return q.execute().data or []
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
        res = supabase.table("training_catalog").insert(payload).execute()
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
        res = supabase.table("training_catalog").update(payload).eq("id", training_id).execute()
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
        supabase.table("training_catalog").update({"is_active": False}).eq("id", training_id).execute()
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
        q = (
            supabase.table("employee_trainings")
            .select("*, training_catalog(id,title,category,duration_hours,cost_dh), employees(id,full_name,department)")
            .order("assigned_at", desc=True)
        )
        if employee_id:
            q = q.eq("employee_id", employee_id)
        if status:
            q = q.eq("status", status)
        return q.execute().data or []
    except Exception:
        return []


@router.post("/assignments", status_code=201)
def assign_training(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        res = supabase.table("employee_trainings").insert(payload).execute()
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
        res = supabase.table("employee_trainings").update(payload).eq("id", assignment_id).execute()
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
        supabase.table("employee_trainings").delete().eq("id", assignment_id).execute()
    except Exception:
        pass


# ── Stats / ROI ────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        assignments = supabase.table("employee_trainings").select(
            "status, training_catalog(cost_dh, duration_hours)"
        ).execute().data or []

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
        q = supabase.table("skills").select("*").eq("is_active", True).order("name")
        if category:
            q = q.eq("category", category)
        return q.execute().data or []
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
        res = supabase.table("skills").insert(payload).execute()
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
        res = supabase.table("skills").update(payload).eq("id", skill_id).execute()
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
        supabase.table("skills").update({"is_active": False}).eq("id", skill_id).execute()
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
        q = supabase.table("employee_skills").select("*, skills(id,name,category,description)")
        if employee_id:
            q = q.eq("employee_id", employee_id)
        return q.execute().data or []
    except Exception:
        return []


@router.post("/employee-skills", status_code=201)
def upsert_employee_skill(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        res = supabase.table("employee_skills").upsert(
            payload, on_conflict="employee_id,skill_id"
        ).execute()
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
        supabase.table("employee_skills").delete().eq("id", record_id).execute()
    except Exception:
        pass
