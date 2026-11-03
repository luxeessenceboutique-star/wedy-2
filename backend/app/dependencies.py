"""FastAPI dependencies — JWT decoded without signature verification (self-hosted Supabase)"""
from fastapi import Depends, HTTPException, Request, status
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
    Identity comes from Tybot (token validated against the Tybot API).
    The Wedy role comes from the local user_roles table, looked up via the user's e-mail.
    """
    from app.services import tybot_auth

    identity = tybot_auth.verify_token(credentials.credentials)
    email = identity["email"]
    full_name = identity.get("full_name") or email

    try:
        user_id = tybot_auth.resolve_wedy_user_id(supabase, email, identity.get("full_name", ""))
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH] user resolution failed for {email}: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Impossible de charger votre compte, réessayez.")

    raw_role = "employee"
    try:
        role_res = supabase.table("user_roles").select("role").eq("user_id", user_id).maybe_single().execute()
        if role_res is not None and role_res.data:
            raw_role = role_res.data.get("role", "employee")
    except Exception as e:
        # A failed lookup must NOT silently demote an HR admin to "employee".
        print(f"[AUTH] role lookup failed for {email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Impossible de vérifier votre rôle pour le moment, réessayez.",
        )

    try:
        profile_res = supabase.table("profiles").select("full_name").eq("user_id", user_id).maybe_single().execute()
        if profile_res is not None and profile_res.data:
            full_name = profile_res.data.get("full_name") or full_name
    except Exception:
        pass

    # Normalize legacy "rh" -> "hr"
    role_name = "hr" if raw_role == "rh" else raw_role

    print(f"[AUTH] user={email} role={role_name}")
    return {
        "id": user_id,
        "email": email,
        "role_name": role_name,
        "role": role_name,
        "full_name": full_name,
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

def require_hr_or_admin(request: Request, current_user: dict = Depends(get_current_user), supabase: Client = Depends(get_db)) -> dict:
    role = current_user.get("role_name", "")
    if role not in ("admin", "hr", "rh"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes. Rôle requis: admin ou hr",
        )
    # Security settings: HR / admin access only from the allowed networks, when enabled.
    from app.services import app_settings
    rules = app_settings.ip_rules(supabase)
    if rules.get("ip_allow") and rules.get("ips"):
        ip = app_settings.client_ip(request)
        if not app_settings.ip_allowed(ip, rules["ips"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"ip_not_allowed:{ip}")
    return current_user
