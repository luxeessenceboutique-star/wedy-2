from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import require_admin, get_current_user

router = APIRouter(prefix="/users", tags=["User Management"])

class UserRoleUpdate(BaseModel):
    role: str

@router.get("")
async def list_users(
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    # Fetch users from the 'profiles' table which typically mirrors auth.users
    # or joins with a 'roles' table if implemented.
    # In this project, 'profiles' has role information or we can check the 'roles' table.
    
    # Let's try to get a list of profiles with their associated user emails
    result = db.table("profiles").select("*, user:user_id(email)").execute()
    return {"data": result.data, "count": len(result.data)}

@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: UserRoleUpdate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    # This logic depends on how roles are stored. 
    # If in 'profiles' table:
    result = db.table("profiles").update({"role": body.role}).eq("user_id", user_id).execute()
    
    # If using a separate roles/user_roles table, update that too.
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]
