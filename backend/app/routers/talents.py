"""Talents router — profiling, OKRs, PDI, succession planning, mobility"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.repositories import talent_repository

router = APIRouter(prefix="/talents", tags=["Talents"])


def _classify(perf: int, pot: int) -> str:
    if perf >= 4 and pot >= 4: return "star"
    if perf >= 4 and pot <= 2: return "solid"
    if perf <= 2 and pot >= 4: return "potential"
    if perf <= 2 and pot <= 2: return "needs_improvement"
    return "key_player"


# ── Stats (before /{employee_id} to avoid route conflict) ─────────────────────

@router.get("/stats/summary")
def talent_stats(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        profiles = talent_repository.list_talent_stats(supabase).data or []

        cats = {}
        for p in profiles:
            c = p.get("talent_category", "other")
            cats[c] = cats.get(c, 0) + 1

        high_risk = sum(1 for p in profiles if p.get("flight_risk") == "high")
        critical  = sum(1 for p in profiles if p.get("is_critical_position"))
        avg_perf  = round(sum(p.get("performance_score", 3) for p in profiles) / len(profiles), 1) if profiles else 0
        avg_pot   = round(sum(p.get("potential_score", 3) for p in profiles) / len(profiles), 1) if profiles else 0

        return {
            "total": len(profiles),
            "by_category": cats,
            "high_flight_risk": high_risk,
            "critical_positions": critical,
            "avg_performance": avg_perf,
            "avg_potential": avg_pot,
        }
    except Exception:
        return {"total": 0, "by_category": {}, "high_flight_risk": 0,
                "critical_positions": 0, "avg_performance": 0, "avg_potential": 0}


# ── Mobility candidates (before /{employee_id}) ───────────────────────────────

@router.get("/mobility/candidates")
def list_mobility_candidates(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        res = talent_repository.list_mobility_candidates(supabase)
        # Filter out empty next_role strings
        data = [r for r in (res.data or []) if r.get("next_role", "").strip()]
        return data
    except Exception:
        return []


# ── Bulk profile (before /{employee_id}) ──────────────────────────────────────

@router.post("/bulk-profile", status_code=201)
def bulk_create_profiles(
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        employees = talent_repository.list_active_employee_ids(supabase).data or []
        existing = {
            r["employee_id"]
            for r in (talent_repository.list_talent_profile_employee_ids(supabase).data or [])
        }
        to_create = [
            {"employee_id": e["id"], "performance_score": 3, "potential_score": 3,
             "talent_category": "key_player", "flight_risk": "low",
             "successor_names": []}
            for e in employees if e["id"] not in existing
        ]
        if to_create:
            talent_repository.bulk_insert_talent_profiles(supabase, to_create)
        return {"created": len(to_create), "skipped": len(existing)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Talent profiles ────────────────────────────────────────────────────────────

@router.get("")
def list_talents(
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        res = talent_repository.list_talents(supabase)
        return res.data or []
    except Exception:
        return []


@router.get("/{employee_id}")
def get_talent(
    employee_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        res = talent_repository.get_talent_profile(supabase, employee_id)
        rows = res.data or []
        if rows:
            return rows[0]
        created = talent_repository.create_talent_profile(supabase, {
            "employee_id": employee_id,
            "performance_score": 3, "potential_score": 3,
            "talent_category": "key_player", "flight_risk": "low",
            "successor_names": [],
        })
        return (created.data or [{}])[0]
    except Exception as e:
        return {"employee_id": employee_id, "performance_score": 3, "potential_score": 3,
                "talent_category": "key_player", "flight_risk": "low", "_error": str(e)[:100]}


@router.patch("/{employee_id}")
def update_talent(
    employee_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    payload.pop("employee_id", None)
    payload["updated_at"] = datetime.utcnow().isoformat()
    # Re-classify only when a score changes, completing it with the stored one (a partial update — risk, notes,
    # successors… — must not reset the category to the 3/3 default).
    if "performance_score" in payload or "potential_score" in payload:
        current = {}
        try:
            rows = talent_repository.get_talent_profile(supabase, employee_id).data or []
            current = rows[0] if rows else {}
        except Exception:
            pass
        perf = payload.get("performance_score", current.get("performance_score", 3))
        pot  = payload.get("potential_score", current.get("potential_score", 3))
        payload["talent_category"] = _classify(int(perf), int(pot))
    try:
        res = talent_repository.get_talent_profile_id(supabase, employee_id)
        if res.data:
            r = talent_repository.update_talent_profile(supabase, employee_id, payload)
        else:
            payload["employee_id"] = employee_id
            r = talent_repository.create_talent_profile(supabase, payload)
        return (r.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── OKRs ──────────────────────────────────────────────────────────────────────

@router.get("/{employee_id}/okrs")
def list_okrs(
    employee_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        res = talent_repository.list_okrs(supabase, employee_id)
        return res.data or []
    except Exception:
        return []


@router.post("/{employee_id}/okrs", status_code=201)
def create_okr(
    employee_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload["employee_id"] = employee_id
    payload.setdefault("status", "active")
    payload.setdefault("progress", 0)
    try:
        res = talent_repository.create_okr(supabase, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{employee_id}/okrs/{okr_id}")
def update_okr(
    employee_id: str,
    okr_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    payload["updated_at"] = datetime.utcnow().isoformat()
    try:
        res = talent_repository.update_okr(supabase, okr_id, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{employee_id}/okrs/{okr_id}", status_code=204)
def delete_okr(
    employee_id: str,
    okr_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        talent_repository.cancel_okr(supabase, okr_id)
    except Exception:
        pass


# ── PDI ────────────────────────────────────────────────────────────────────────

@router.get("/{employee_id}/pdi")
def list_pdi(
    employee_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        res = talent_repository.list_pdi(supabase, employee_id)
        return res.data or []
    except Exception:
        return []


@router.post("/{employee_id}/pdi", status_code=201)
def create_pdi(
    employee_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload["employee_id"] = employee_id
    payload.setdefault("status", "pending")
    try:
        res = talent_repository.create_pdi(supabase, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{employee_id}/pdi/{item_id}")
def update_pdi(
    employee_id: str,
    item_id: str,
    payload: dict,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    payload["updated_at"] = datetime.utcnow().isoformat()
    try:
        res = talent_repository.update_pdi(supabase, item_id, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{employee_id}/pdi/{item_id}", status_code=204)
def delete_pdi(
    employee_id: str,
    item_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        talent_repository.delete_pdi(supabase, item_id)
    except Exception:
        pass
