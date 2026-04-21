from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from supabase import Client
from app.services.supabase import get_supabase
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


@router.post("/login")
async def login(body: LoginRequest, db: Client = Depends(get_supabase)):
    try:
        response = db.auth.sign_in_with_password({"email": body.email, "password": body.password})
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "user": {
                "id": response.user.id,
                "email": response.user.email,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/signup")
async def signup(body: SignupRequest, db: Client = Depends(get_supabase)):
    try:
        response = db.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {"data": {"full_name": body.full_name}},
        })
        return {"message": "Account created. Please check your email for confirmation.", "user_id": response.user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/logout")
async def logout(db: Client = Depends(get_supabase), current_user: dict = Depends(get_current_user)):
    db.auth.sign_out()
    return {"message": "Logged out"}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user), db: Client = Depends(get_supabase)):
    profile = db.table("profiles").select("*").eq("user_id", current_user["id"]).single().execute()
    roles = db.table("user_roles").select("role").eq("user_id", current_user["id"]).execute()
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "profile": profile.data,
        "roles": [r["role"] for r in roles.data],
    }
