"""Auth router — /api/auth (Supabase SDK Version)"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.repositories import auth_repository
from app.services import tybot_auth

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, supabase: Client = Depends(get_db)):
    """Authenticate with Tybot; the Wedy role is read from user_roles (managed in Wedy)."""
    t = tybot_auth.login(payload.email, payload.password)

    try:
        user_id = tybot_auth.resolve_wedy_user_id(supabase, t["email"], t["full_name"])
        raw_role = "employee"
        role_res = auth_repository.get_user_role(supabase, user_id)
        if role_res is not None and role_res.data:
            raw_role = role_res.data.get("role", "employee")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Impossible de vérifier votre rôle: {e}")

    role_name = "hr" if raw_role == "rh" else raw_role
    return {
        "access_token": t["access_token"],
        "token_type": "bearer",
        "user_id": user_id,
        "email": t["email"],
        "role": role_name,
        "role_name": role_name,
        "refresh_token": t.get("refresh_token"),
    }


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh")
def refresh_session(payload: RefreshRequest):
    """Renew the Tybot access token without asking for the password again."""
    return tybot_auth.refresh(payload.refresh_token)


@router.post("/register", response_model=UserOut)
def register(payload: RegisterRequest):
    """Sign-up is handled by Tybot: accounts are created there, Wedy only assigns the role."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="L'inscription se fait sur Tybot. Connectez-vous avec votre compte Tybot.",
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
