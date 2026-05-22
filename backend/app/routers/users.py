"""Users & account management — /api/users"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import require_admin, require_hr_or_admin, get_current_user

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


# ── List platform users ────────────────────────────────────────────────────────

@router.get("")
async def list_users(
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        roles_res = db.table("user_roles").select("user_id, role, created_at").execute()
        roles = {r["user_id"]: r for r in (roles_res.data or [])}

        profiles_res = db.table("profiles").select("user_id, full_name, email, created_at").execute()

        merged = []
        for p in (profiles_res.data or []):
            uid = p.get("user_id")
            if not uid:
                continue
            role_info = roles.get(uid)
            raw_role = role_info.get("role") if role_info else None
            merged.append({
                "user_id":    uid,
                "role":       _to_display_role(raw_role),
                "full_name":  p.get("full_name") or "",
                "email":      p.get("email") or "",
                "created_at": p.get("created_at"),
            })

        return {"data": merged, "count": len(merged)}
    except Exception as e:
        return {"data": [], "count": 0, "error": str(e)}


# ── Update user role ───────────────────────────────────────────────────────────

@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: UserRoleUpdate,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    try:
        db_role = _to_db_role(body.role)
        # Always delete existing entry first (avoids unique-constraint issues)
        db.table("user_roles").delete().eq("user_id", user_id).execute()
        if db_role:
            result = db.table("user_roles").insert({"user_id": user_id, "role": db_role}).execute()
            return {"user_id": user_id, "role": _to_display_role(db_role)}
        # Employee — no entry needed
        return {"user_id": user_id, "role": "employee"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
        user_res = db.auth.admin.create_user({
            "email":         email,
            "password":      password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name},
        })
        user_id = user_res.user.id
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur création compte: {str(e)}")

    # Assign role in user_roles (HR Admin only; employees have no entry)
    if db_role:
        try:
            db.table("user_roles").delete().eq("user_id", user_id).execute()
            db.table("user_roles").insert({"user_id": user_id, "role": db_role}).execute()
        except Exception:
            pass

    # Create profile
    try:
        db.table("profiles").delete().eq("user_id", user_id).execute()
        db.table("profiles").insert({
            "user_id":   user_id,
            "full_name": full_name,
            "email":     email,
        }).execute()
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
        q = (
            db.table("document_requests")
            .select("*, employees(id,full_name,department,position)")
            .order("created_at", desc=True)
        )
        if status:
            q = q.eq("status", status)
        return q.execute().data or []
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
    payload["updated_at"] = __import__("datetime").datetime.utcnow().isoformat()
    try:
        res = db.table("document_requests").update(payload).eq("id", req_id).execute()
        return (res.data or [{}])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
