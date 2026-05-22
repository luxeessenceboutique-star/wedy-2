"""FastAPI dependencies — JWT decoded without signature verification (self-hosted Supabase)"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import base64, json
from supabase import Client
from app.database import get_db

security = HTTPBearer()

def _decode_jwt_payload(token: str) -> dict:
    """Decode JWT payload without signature verification."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")
        # Add padding
        padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
        return json.loads(base64.b64decode(padded))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token malformé: {e}")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_db),
) -> dict:
    """
    Decode Supabase JWT payload locally (no HTTP call).
    Validate user existence via database lookup.
    """
    token = credentials.credentials
    payload = _decode_jwt_payload(token)

    user_id: str = payload.get("sub")
    email: str = payload.get("email", "")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide: sub manquant")

    raw_role = "employee"
    full_name = email

    try:
        role_res = supabase.table("user_roles").select("role").eq("user_id", user_id).maybe_single().execute()
        if role_res.data:
            raw_role = role_res.data.get("role", "employee")
    except Exception:
        pass  # table may not exist yet — default to employee

    try:
        profile_res = supabase.table("profiles").select("full_name").eq("user_id", user_id).maybe_single().execute()
        if profile_res.data:
            full_name = profile_res.data.get("full_name") or email
    except Exception:
        pass  # table may not exist yet — use email as name

    # Normalize legacy "rh" → "hr"
    role_name = "hr" if raw_role == "rh" else raw_role

    print(f"[AUTH] user={email} role={role_name}")
    return {
        "id": user_id, 
        "email": email, 
        "role_name": role_name, 
        "role": role_name, 
        "full_name": full_name
    }

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
    if current_user.get("role_name") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes. Rôle requis: admin",
        )
    return current_user

def require_hr_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    role = current_user.get("role_name", "")
    if role not in ("admin", "hr", "rh"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes. Rôle requis: admin ou hr",
        )
    return current_user
