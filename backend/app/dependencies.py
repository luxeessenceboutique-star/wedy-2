from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.services.supabase import get_supabase

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Client = Depends(get_supabase),
) -> dict:
    token = credentials.credentials
    try:
        response = db.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"id": response.user.id, "email": response.user.email, "token": token}
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


async def require_admin(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase),
) -> dict:
    result = (
        db.table("user_roles")
        .select("role")
        .eq("user_id", current_user["id"])
        .eq("role", "admin")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
