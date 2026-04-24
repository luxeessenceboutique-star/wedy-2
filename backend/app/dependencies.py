"""FastAPI dependencies — Adapted to use Supabase Auth validation"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.database import get_db

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_db),
) -> dict:
    """
    Validate the Supabase JWT using the Supabase SDK.
    This is the most reliable way when the frontend uses Supabase Auth.
    """
    token = credentials.credentials
    
    try:
        # Ask Supabase to verify the token and return the user
        auth_res = supabase.auth.get_user(token)
        if not auth_res or not auth_res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session invalide ou expirée",
            )
        
        # Get additional user info from our 'user_roles' and 'profiles' tables
        user_id = auth_res.user.id
        
        # Check role in user_roles
        role_res = supabase.table("user_roles").select("role").eq("user_id", user_id).maybe_single().execute()
        
        # Check profile name
        profile_res = supabase.table("profiles").select("full_name").eq("user_id", user_id).maybe_single().execute()
        
        role_name = role_res.data.get("role") if role_res.data else "employee"
        profile = profile_res.data or {}
        full_name = profile.get('full_name') or auth_res.user.email
        
        return {
            "id": user_id,
            "email": auth_res.user.email,
            "role_name": role_name,
            "full_name": full_name
        }

    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Erreur d'authentification: {str(e)}",
        )

def require_role(*roles: str):
    def _check(current_user: dict = Depends(get_current_user)) -> dict:
        role_name = current_user.get("role_name")
        if role_name not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissions insuffisantes. Rôle requis: {roles}",
            )
        return current_user
    return _check

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    return require_role("admin")(current_user)

def require_hr_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    return require_role("admin", "hr")(current_user)
