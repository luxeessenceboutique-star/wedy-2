"""Auth router — /api/auth (Supabase SDK Version)"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.repositories import auth_repository

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, supabase: Client = Depends(get_db)):
    """Delegate login to Supabase Auth"""
    try:
        res = auth_repository.sign_in_with_password(supabase, payload.email, payload.password)
        if not res.session:
            raise HTTPException(status_code=400, detail="Identifiants invalides")

        user_id = res.user.id
        email = res.user.email

        # Fetch actual role
        raw_role = "employee"
        try:
            role_res = auth_repository.get_user_role(supabase, user_id)
            if role_res.data:
                raw_role = role_res.data.get("role", "employee")
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
    """Register via admin API (bypasses Supabase public-signup restrictions)."""
    full_name = payload.full_name or payload.email.split("@")[0]
    try:
        res = auth_repository.create_user(supabase, payload.email, payload.password, full_name)
        if not res.user:
            raise HTTPException(status_code=400, detail="Erreur lors de l'inscription")

        user_id = res.user.id

        # Ensure a profile row exists
        try:
            auth_repository.upsert_profile(supabase, user_id, full_name, payload.email)
        except Exception:
            pass

        return {
            "id":        user_id,
            "email":     res.user.email,
            "role_name": "employee",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
