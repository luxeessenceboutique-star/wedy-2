"""Users & account management — /api/users"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import require_hr_or_admin
from app.repositories import user_repository

router = APIRouter(prefix="/users", tags=["User Management"])

# Valid DB enum values: 'rh' (→ displayed as HR Admin) and 'admin'
# Employee users have NO entry in user_roles (backend defaults to 'employee')

def _to_db_role(role: str) -> str | None:
    """Normalize frontend role string to DB enum value, or None for employee."""
    r = role.strip().lower()
    if r in ("hr", "hr_admin", "admin_rh", "rh"):
        return "rh"
    if r == "admin":
        return "admin"
    return None  # employee — no user_roles entry


def _to_display_role(db_role: str | None) -> str:
    if db_role == "rh":
        return "hr"
    if db_role == "admin":
        return "admin"
    return "employee"


class UserRoleUpdate(BaseModel):
    role: str


# ── List platform users (Tybot accounts + Wedy-only accounts) ─────────────────

@router.get("")
async def list_users(
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    from app.services import tybot_auth
    try:
        roles_res = user_repository.list_user_roles(db)
        roles = {r["user_id"]: r for r in (roles_res.data or [])}
        profiles = user_repository.list_profiles_summary(db).data or []
    except Exception as e:
        return {"data": [], "count": 0, "error": str(e)}

    by_email = {(p.get("email") or "").lower(): p for p in profiles if p.get("email")}

    def row(email, full_name, profile, source, is_active=True, tybot_roles=None):
        uid = profile.get("user_id") if profile else None
        raw_role = roles.get(uid, {}).get("role") if uid else None
        return {
            "user_id": uid,
            "email": email,
            "full_name": full_name,
            "role": _to_display_role(raw_role),
            "source": source,
            "is_active": is_active,
            "tybot_roles": tybot_roles or [],
            "created_at": profile.get("created_at") if profile else None,
        }

    merged, seen, warning = [], set(), None
    try:
        for t in tybot_auth.list_tybot_users():
            seen.add(t["email"])
            p = by_email.get(t["email"])
            merged.append(row(t["email"], (p or {}).get("full_name") or t["full_name"], p, "tybot", t["is_active"], t["tybot_roles"]))
    except HTTPException as e:
        warning = e.detail

    # Wedy-only accounts (no Tybot account): keep them manageable
    for email, p in by_email.items():
        if email not in seen:
            merged.append(row(email, p.get("full_name") or "", p, "wedy"))

    merged.sort(key=lambda r: (r["role"] == "employee", (r["full_name"] or "").lower()))
    out = {"data": merged, "count": len(merged)}
    if warning:
        out["warning"] = warning
    return out


# ── Update user role ───────────────────────────────────────────────────────────

def _apply_role(db: Client, user_id: str, body_role: str, current_user: dict) -> dict:
    db_role = _to_db_role(body_role)

    # Never let an HR/admin demote themselves, nor remove the last privileged account:
    # that is how an HR admin ends up locked out as a plain "employee".
    if db_role is None:
        if user_id == current_user.get("id"):
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas retirer votre propre accès RH")
        try:
            if user_repository.count_privileged_roles(db) <= 1:
                raise HTTPException(status_code=400, detail="Impossible de retirer le dernier compte RH/admin")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Vérification des rôles impossible: {e}")

    try:
        if db_role:
            # Upsert (no delete first): a failed insert can no longer leave the user role-less
            user_repository.upsert_user_role(db, user_id, db_role)
            return {"user_id": user_id, "role": _to_display_role(db_role)}
        # Employee — no entry needed
        user_repository.delete_user_role(db, user_id)
        return {"user_id": user_id, "role": "employee"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class RoleByEmail(BaseModel):
    email: str
    role: str
    full_name: str = ""


@router.patch("/role-by-email")
async def update_role_by_email(
    body: RoleByEmail,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    """Set the Wedy role of a person identified by e-mail (creates the Wedy account on first assignment)."""
    from app.services import tybot_auth
    email = body.email.strip().lower()
    known = {u["email"] for u in tybot_auth.list_tybot_users()}
    local = db.table("profiles").select("user_id").ilike("email", email).limit(1).execute().data
    if email not in known and not local:
        raise HTTPException(status_code=404, detail="Cet email n'existe ni sur Tybot ni dans Wedy")
    user_id = tybot_auth.resolve_wedy_user_id(db, email, body.full_name)
    return _apply_role(db, user_id, body.role, current_user)


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: UserRoleUpdate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    return _apply_role(db, user_id, body.role, current_user)


# ── Create user account (HR or Employee) ──────────────────────────────────────

@router.post("/create-employee", status_code=201)
async def create_user_account(
    payload: dict,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    email     = (payload.get("email") or "").strip()
    password  = payload.get("password") or ""
    full_name = (payload.get("full_name") or email.split("@")[0]).strip()
    role_raw  = payload.get("role", "employee")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Mot de passe minimum 6 caractères")

    db_role = _to_db_role(role_raw)

    # Create Supabase auth user (auto-confirmed)
    try:
        user_res = user_repository.create_auth_user(db, email, password, full_name)
        user_id = user_res.user.id
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur création compte: {str(e)}")

    # Assign role in user_roles (HR Admin only; employees have no entry)
    if db_role:
        try:
            user_repository.delete_user_role(db, user_id)
            user_repository.create_user_role(db, user_id, db_role)
        except Exception:
            pass

    # Create profile
    try:
        user_repository.delete_profile(db, user_id)
        user_repository.create_profile(db, user_id, full_name, email)
    except Exception:
        pass

    # Link to existing employee record so portal email-lookup works
    employee_id = payload.get("employee_id")
    if employee_id:
        try:
            user_repository.link_employee_email(db, employee_id, email)
        except Exception:
            pass

    return {
        "id":        user_id,
        "email":     email,
        "full_name": full_name,
        "role":      _to_display_role(db_role),
    }


# ── List document requests (HR manages) ────────────────────────────────────────

@router.get("/document-requests")
async def list_doc_requests(
    status: str = "",
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        return user_repository.list_document_requests(db, status).data or []
    except Exception:
        return []


@router.patch("/document-requests/{req_id}")
async def update_doc_request(
    req_id: str,
    payload: dict,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    payload.pop("id", None)
    payload["updated_at"] = datetime.utcnow().isoformat()
    try:
        res = user_repository.update_document_request(db, req_id, payload)
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
