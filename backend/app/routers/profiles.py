"""Profiles router — /api/profiles (Supabase SDK Version)"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.schemas import ProfileCreate, ProfileUpdate, ProfileOut
from app.services.audit import log_action
from app.services.storage import store_file

router = APIRouter(prefix="/profiles", tags=["Profiles"])


@router.get("", response_model=List[ProfileOut])
def list_profiles(
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = supabase.table("profiles").select("*")
    
    if type:
        query = query.eq("type", type)
    
    if search:
        # Supabase 'or' query for multiple fields
        query = query.or_(f"first_name.ilike.%{search}%,last_name.ilike.%{search}%,email.ilike.%{search}%,cin.ilike.%{search}%")
        
    response = query.range(skip, skip + limit - 1).execute()
    return response.data


@router.get("/{profile_id}", response_model=ProfileOut)
def get_profile(
    profile_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    response = supabase.table("profiles").select("*").eq("id", str(profile_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return response.data[0]


@router.post("", response_model=ProfileOut, status_code=201)
def create_profile(
    payload: ProfileCreate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "hr")),
):
    data = payload.model_dump()
    response = supabase.table("profiles").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Could not create profile")
    
    profile = response.data[0]
    log_action(supabase, current_user["id"], "CREATE", "profile", profile["id"])
    return profile


@router.patch("/{profile_id}", response_model=ProfileOut)
def update_profile(
    profile_id: UUID,
    payload: ProfileUpdate,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return get_profile(profile_id, supabase, current_user)
        
    response = supabase.table("profiles").update(data).eq("id", str(profile_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile = response.data[0]
    log_action(supabase, current_user["id"], "UPDATE", "profile", profile["id"])
    return profile


@router.delete("/{profile_id}", status_code=204)
def delete_profile(
    profile_id: UUID,
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    response = supabase.table("profiles").delete().eq("id", str(profile_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    log_action(supabase, current_user["id"], "DELETE", "profile", str(profile_id))


@router.post("/{profile_id}/photo")
async def upload_photo(
    profile_id: UUID,
    file: UploadFile = File(...),
    supabase: Client = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    content = await file.read()
    url = store_file(content, file.filename, subfolder="photos", content_type=file.content_type)
    
    response = supabase.table("profiles").update({"photo_url": url}).eq("id", str(profile_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    return {"photo_url": url}
