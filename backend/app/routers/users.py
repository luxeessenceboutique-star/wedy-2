"""Users & account management — /api/users"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.database import get_db
from app.dependencies import require_admin, require_hr_or_admin, get_current_user

router = APIRouter(prefix="/users", tags=["User Management"])


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

        profiles_res = db.table("profiles").select("user_id, full_name").execute()
        profiles = {p["user_id"]: p for p in (profiles_res.data or [])}

        merged = []
        for uid, role_info in roles.items():
            profile = profiles.get(uid, {})
            merged.append({
                "user_id":    uid,
                "role":       role_info.get("role", "employee"),
                "full_name":  profile.get("full_name", ""),
                "created_at": role_info.get("created_at"),
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
    current_user: dict = Depends(require_admin),
):
    try:
        result = db.table("user_roles").upsert({"user_id": user_id, "role": body.role}).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Create employee account (HR only) ─────────────────────────────────────────

@router.post("/create-employee", status_code=201)
async def create_employee_account(
    payload: dict,
    db: Client = Depends(get_db),
    current_user: dict = Depends(require_hr_or_admin),
):
    email     = (payload.get("email") or "").strip()
    password  = payload.get("password") or ""
    full_name = payload.get("full_name") or email.split("@")[0]

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email et mot de passe requis")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Mot de passe minimum 6 caractères")

    # Create Supabase auth user (auto-confirmed, no email required)
    try:
        user_res = db.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name},
        })
        user_id = user_res.user.id
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur création compte: {str(e)}")

    # Assign employee role
    try:
        db.table("user_roles").upsert({"user_id": user_id, "role": "employee"}).execute()
    except Exception:
        pass

    # Create profile
    try:
        db.table("profiles").upsert({"user_id": user_id, "full_name": full_name}).execute()
    except Exception:
        pass

    return {
        "id":        user_id,
        "email":     email,
        "full_name": full_name,
        "role":      "employee",
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
