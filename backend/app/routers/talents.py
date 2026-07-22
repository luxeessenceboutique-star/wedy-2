"""Talents router — profiling, OKRs, PDI, succession planning, mobility"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin

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
        profiles = supabase.table("talent_profiles").select(
            "talent_category,flight_risk,performance_score,potential_score,is_critical_position"
        ).execute().data or []

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
        res = (
            supabase.table("talent_profiles")
            .select("*, employees(id,full_name,email,position,department,photo_url,hire_date)")
            .not_.is_("next_role", "null")
            .order("updated_at", desc=True)
            .execute()
        )
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
        employees = (
            supabase.table("employees")
            .select("id")
            .eq("status", "active")
            .execute()
            .data or []
        )
        existing = {
            r["employee_id"]
            for r in (supabase.table("talent_profiles").select("employee_id").execute().data or [])
        }
        to_create = [
            {"employee_id": e["id"], "performance_score": 3, "potential_score": 3,
             "talent_category": "key_player", "flight_risk": "low",
             "successor_names": []}
            for e in employees if e["id"] not in existing
        ]
        if to_create:
            supabase.table("talent_profiles").insert(to_create).execute()
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
        res = (
            supabase.table("talent_profiles")
            .select("*, employees(id,full_name,email,position,department,photo_url)")
            .order("created_at", desc=True)
            .execute()
        )
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
        res = supabase.table("talent_profiles").select("*").eq("employee_id", employee_id).limit(1).execute()
        rows = res.data or []
        if rows:
            return rows[0]
        created = supabase.table("talent_profiles").insert({
            "employee_id": employee_id,
            "performance_score": 3, "potential_score": 3,
            "talent_category": "key_player", "flight_risk": "low",
            "successor_names": [],
        }).execute()
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
    perf = payload.get("performance_score", 3)
    pot  = payload.get("potential_score", 3)
    payload["talent_category"] = _classify(int(perf), int(pot))
    try:
        res = supabase.table("talent_profiles").select("id").eq("employee_id", employee_id).limit(1).execute()
        if res.data:
            r = supabase.table("talent_profiles").update(payload).eq("employee_id", employee_id).execute()
        else:
            payload["employee_id"] = employee_id
            r = supabase.table("talent_profiles").insert(payload).execute()
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
        res = (
            supabase.table("employee_okrs")
            .select("*")
            .eq("employee_id", employee_id)
            .neq("status", "cancelled")
            .order("created_at", desc=True)
            .execute()
        )
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
        res = supabase.table("employee_okrs").insert(payload).execute()
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
        res = supabase.table("employee_okrs").update(payload).eq("id", okr_id).execute()
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
        supabase.table("employee_okrs").update({"status": "cancelled"}).eq("id", okr_id).execute()
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
        res = (
            supabase.table("pdi_items")
            .select("*")
            .eq("employee_id", employee_id)
            .order("created_at", desc=True)
            .execute()
        )
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
        res = supabase.table("pdi_items").insert(payload).execute()
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
        res = supabase.table("pdi_items").update(payload).eq("id", item_id).execute()
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
        supabase.table("pdi_items").delete().eq("id", item_id).execute()
    except Exception:
        pass
