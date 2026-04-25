"""Interns router — uses employees table with status='intern'"""
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.services.audit import log_action

router = APIRouter(prefix="/interns", tags=["Interns"])


@router.get("")
def list_interns(
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = (
        supabase.table("employees")
        .select("*", count="exact")
        .eq("status", "intern")
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )
    return {"data": res.data, "count": res.count or 0}


@router.get("/{intern_id}")
def get_intern(
    intern_id: str,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    res = supabase.table("employees").select("*").eq("id", intern_id).eq("status", "intern").maybe_single().execute()
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
    res = supabase.table("employees").insert(payload).execute()
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
    res = supabase.table("employees").update(payload).eq("id", intern_id).execute()
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
    res = supabase.table("employees").delete().eq("id", intern_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Stagiaire non trouvé")
    log_action(supabase, current_user["id"], "DELETE", "intern", intern_id)
