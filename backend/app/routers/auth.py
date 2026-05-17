"""Auth router — /api/auth (Supabase SDK Version)"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth_service import verify_password, hash_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, supabase: Client = Depends(get_db)):
    """Delegate login to Supabase Auth"""
    try:
        res = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        if not res.session:
            raise HTTPException(status_code=400, detail="Identifiants invalides")
        
        user_id = res.user.id
        email = res.user.email
        
        # Fetch actual role
        raw_role = "hr"  # default matches schema: user_roles.role DEFAULT 'hr'
        try:
            role_res = supabase.table("user_roles").select("role").eq("user_id", user_id).maybe_single().execute()
            if role_res.data:
                raw_role = role_res.data.get("role", "hr")
        except Exception:
            pass

        role_name = "hr" if raw_role == "rh" else raw_role

        return {
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "user_id": user_id,
            "email": email,
            "role": role_name,
            "role_name": role_name
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/register", response_model=UserOut)
def register(payload: RegisterRequest, supabase: Client = Depends(get_db)):
    """Delegate registration to Supabase Auth"""
    try:
        res = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {"full_name": payload.email.split("@")[0]}
            }
        })
        if not res.user:
            raise HTTPException(status_code=400, detail="Erreur lors de l'inscription")
        
        # Le déclencheur Supabase (Trigger) devrait s'occuper de créer le profil et le rôle
        return {
            "id": res.user.id,
            "email": res.user.email,
            "role_name": "employee"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
