"""Org Chart — the company chart (real structure, edited by HR) and the project teams."""
import re as _re
import unicodedata as _ud
from datetime import datetime as _dt, timezone as _tz
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
from app.database import get_db
from app.dependencies import get_current_user, require_hr_or_admin
from app.repositories import orgchart_repository
from app.services.audit import log_action

router = APIRouter(prefix="/orgchart", tags=["OrgChart"])


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#0891b2"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class MemberAdd(BaseModel):
    employee_id: str
    role_in_team: Optional[str] = None


# ── Main aggregate endpoint ───────────────────────────────────────────────────

@router.get("")
def get_orgchart(
    supabase: Client = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Return all projects with their members + unassigned active employees."""
    projects_res = orgchart_repository.list_projects(supabase)
    projects = projects_res.data or []

    members_res = orgchart_repository.list_team_members(supabase)
    members = members_res.data or []

    employees_res = orgchart_repository.list_employees_for_orgchart(supabase)
    active_employees = [e for e in (employees_res.data or []) if e.get("status") != "terminated"]

    emp_map = {e["id"]: e for e in active_employees}
    assigned_ids = {m["employee_id"] for m in members}

    projects_out = []
    for project in projects:
        project_members = [
            {**m, "employee": emp_map.get(m["employee_id"], {})}
            for m in members
            if m["project_id"] == project["id"]
        ]
        projects_out.append({**project, "members": project_members})

    unassigned = [e for e in active_employees if e["id"] not in assigned_ids]

    return {"projects": projects_out, "unassigned": unassigned}


@router.get("/people")
def get_org_people(
    supabase: Client = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Everyone shown in the company org chart (active, on leave and interns), with department and manager."""
    res = orgchart_repository.list_people(supabase)
    return res.data or []


# ── Projects CRUD ─────────────────────────────────────────────────────────────

@router.post("/projects", status_code=201)
def create_project(
    body: ProjectCreate,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    res = orgchart_repository.create_project(supabase, {
        "name": body.name,
        "description": body.description,
        "color": body.color or "#0891b2",
    })
    if not res.data:
        raise HTTPException(status_code=400, detail="Échec création projet")
    return res.data[0]


@router.patch("/projects/{project_id}")
def update_project(
    project_id: str,
    body: ProjectUpdate,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune donnée")
    res = orgchart_repository.update_project(supabase, project_id, updates)
    return res.data[0] if res.data else {}


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(
    project_id: str,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    orgchart_repository.delete_project_members(supabase, project_id)
    orgchart_repository.delete_project(supabase, project_id)


# ── Team Members ──────────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/members", status_code=201)
def add_member(
    project_id: str,
    body: MemberAdd,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    # An employee can only be in one project at a time
    orgchart_repository.delete_member_by_employee(supabase, body.employee_id)
    res = orgchart_repository.add_member(supabase, project_id, body.employee_id, body.role_in_team)
    return res.data[0] if res.data else {}


@router.patch("/projects/{project_id}/members/{employee_id}")
def update_member_role(
    project_id: str,
    employee_id: str,
    body: dict,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    role = body.get("role_in_team")
    if role is None:
        raise HTTPException(status_code=400, detail="role_in_team requis")
    res = orgchart_repository.update_member_role(supabase, project_id, employee_id, role)
    return res.data[0] if res.data else {}


@router.delete("/projects/{project_id}/members/{employee_id}", status_code=204)
def remove_member(
    project_id: str,
    employee_id: str,
    supabase: Client = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    orgchart_repository.remove_member(supabase, project_id, employee_id)


# ── The company chart: the real structure, edited by HR ───────────────────────
# Top: the person who leads the company (chosen by HR, kept in app_settings « orgchart »). Departments: the
# `departments` table (name, head = manager_id) together with the department written on each person's file — the
# same department spelled differently (« DATA IA » / « Data IA ») is one. Reporting lines: employees.manager_id
# (the `manager` text is kept in step, other screens read it).
_SETTINGS_KEY = "orgchart"


def dept_key(name: Optional[str]) -> str:
    s = _ud.normalize("NFD", name or "")
    s = "".join(c for c in s if _ud.category(c) != "Mn").lower()
    return _re.sub(r"[^a-z0-9]+", " ", s).strip()


def _settings(supabase: Client) -> dict:
    try:
        rows = supabase.table("app_settings").select("value").eq("key", _SETTINGS_KEY).limit(1).execute().data or []
        v = rows[0].get("value") if rows else None
        return v if isinstance(v, dict) else {}
    except Exception:
        return {}


def _departments(supabase: Client) -> list[dict]:
    try:
        return supabase.table("departments").select("*").execute().data or []
    except Exception:
        return []


def _dept_row(supabase: Client, name: str, create: bool = False) -> Optional[dict]:
    k = dept_key(name)
    row = next((d for d in _departments(supabase) if dept_key(d.get("name")) == k), None)
    if row or not create or not k:
        return row
    res = supabase.table("departments").insert({"name": name.strip()[:120]}).execute()
    return (res.data or [None])[0]


def _person(supabase: Client, pid: str) -> Optional[dict]:
    rows = supabase.table("employees").select("*").eq("id", str(pid)).limit(1).execute().data or []
    return rows[0] if rows else None


def _out(p: dict) -> dict:
    return {k: p.get(k) for k in ("id", "full_name", "position", "department", "manager", "manager_id", "email", "photo_url", "status")}


@router.get("/structure")
def get_structure(supabase: Client = Depends(get_db), user: dict = Depends(get_current_user)):
    """Who leads the company, the departments (with their head) and whether this user can change the chart."""
    return {
        "ceo_id": _settings(supabase).get("ceo_id"),
        "departments": [{k: d.get(k) for k in ("id", "name", "manager_id", "description")} for d in _departments(supabase)],
        "can_edit": user.get("role_name") in ("admin", "hr", "rh"),
    }


class PersonIn(BaseModel):
    position: Optional[str] = None
    department: Optional[str] = None
    manager_id: Optional[str] = None      # null = no direct manager (reports to the department head)


@router.patch("/people/{person_id}")
def update_person(person_id: str, body: PersonIn, supabase: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    """Change a person's place on the chart: position, department, direct manager (N+1)."""
    p = _person(supabase, person_id)
    if not p:
        raise HTTPException(status_code=404, detail="Personne introuvable")
    sent = body.model_fields_set
    row: dict = {}
    if "position" in sent:
        row["position"] = (body.position or "").strip()[:160] or None
    if "department" in sent:
        dept = (body.department or "").strip()[:120]
        if dept:
            existing = _dept_row(supabase, dept, create=True)
            dept = (existing or {}).get("name") or dept   # the department's own spelling
        row["department"] = dept or None
    if "manager_id" in sent:
        mid = (body.manager_id or "").strip() or None
        if mid:
            if mid == str(person_id):
                raise HTTPException(status_code=422, detail="Une personne ne peut pas être son propre responsable.")
            boss = _person(supabase, mid)
            if not boss:
                raise HTTPException(status_code=404, detail="Responsable introuvable")
            seen, cur = set(), boss   # no loop: the new manager must not report (even indirectly) to this person
            while cur and cur.get("manager_id") and cur["id"] not in seen:
                seen.add(cur["id"])
                if str(cur["manager_id"]) == str(person_id):
                    raise HTTPException(status_code=422, detail=f"Impossible : {boss.get('full_name')} est déjà sous la responsabilité de {p.get('full_name')}.")
                cur = _person(supabase, cur["manager_id"])
            row.update({"manager_id": mid, "manager": boss.get("full_name")})
        else:
            row.update({"manager_id": None, "manager": None})
    if not row:
        return _out(p)
    try:
        res = supabase.table("employees").update(row).eq("id", str(person_id)).execute()
    except Exception as e:
        if "manager_id" in str(e) and "manager_id" in row:   # no column: the name only
            row.pop("manager_id")
            res = supabase.table("employees").update(row).eq("id", str(person_id)).execute()
        else:
            raise
    log_action(supabase, user["id"], "UPDATE_ORGCHART", "employee", str(person_id))
    return _out((res.data or [{**p, **row}])[0])


class HeadIn(BaseModel):
    employee_id: Optional[str] = None


@router.put("/head")
def set_head(body: HeadIn, supabase: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    """Who is at the top of the chart (null: the company's name)."""
    if body.employee_id and not _person(supabase, body.employee_id):
        raise HTTPException(status_code=404, detail="Personne introuvable")
    value = {**_settings(supabase), "ceo_id": body.employee_id or None}
    try:
        supabase.table("app_settings").upsert({"key": _SETTINGS_KEY, "value": value, "updated_at": _dt.now(_tz.utc).isoformat()}).execute()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Paramètres indisponibles (migration app_settings.sql) : {e}")
    log_action(supabase, user["id"], "UPDATE_ORGCHART", "orgchart", "head")
    return {"ceo_id": value["ceo_id"]}


class DeptIn(BaseModel):
    name: str                                  # the department as shown (any spelling)
    new_name: Optional[str] = None             # rename; an existing name merges the two
    manager_id: Optional[str] = None           # its head (null: none)


def _members(supabase: Client, key: str) -> list[dict]:
    rows = supabase.table("employees").select("id, department, status").neq("status", "candidate").execute().data or []
    return [r for r in rows if r.get("department") and dept_key(r["department"]) == key]


@router.post("/departments", status_code=201)
def create_dept(body: DeptIn, supabase: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    if not dept_key(body.name):
        raise HTTPException(status_code=422, detail="Nom du département requis")
    row = _dept_row(supabase, body.name, create=True)
    log_action(supabase, user["id"], "CREATE", "department", str((row or {}).get("id")))
    return {k: (row or {}).get(k) for k in ("id", "name", "manager_id", "description")}


@router.patch("/departments")
def update_dept(body: DeptIn, supabase: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    """Rename (or merge into another department) and / or set its head."""
    old_key = dept_key(body.name)
    if not old_key:
        raise HTTPException(status_code=422, detail="Département requis")
    row = _dept_row(supabase, body.name, create=True)
    sent = body.model_fields_set
    if "manager_id" in sent:
        mid = (body.manager_id or "").strip() or None
        if mid and not _person(supabase, mid):
            raise HTTPException(status_code=404, detail="Responsable introuvable")
        supabase.table("departments").update({"manager_id": mid}).eq("id", row["id"]).execute()
        row["manager_id"] = mid
    new = (body.new_name or "").strip()[:120]
    if new and new != row.get("name"):
        target = next((d for d in _departments(supabase) if dept_key(d.get("name")) == dept_key(new) and d["id"] != row["id"]), None)
        if target:   # merge: the people go to the other one, which keeps its head unless it had none
            if not target.get("manager_id") and row.get("manager_id"):
                supabase.table("departments").update({"manager_id": row["manager_id"]}).eq("id", target["id"]).execute()
            supabase.table("departments").delete().eq("id", row["id"]).execute()
            new, row = target["name"], target
        else:
            supabase.table("departments").update({"name": new}).eq("id", row["id"]).execute()
            row["name"] = new
        ids = [m["id"] for m in _members(supabase, old_key)]
        if ids:
            supabase.table("employees").update({"department": new}).in_("id", ids).execute()
    log_action(supabase, user["id"], "UPDATE", "department", str(row.get("id")))
    fresh = next((d for d in _departments(supabase) if d["id"] == row["id"]), row)
    return {k: fresh.get(k) for k in ("id", "name", "manager_id", "description")}


@router.delete("/departments")
def delete_dept(name: str, supabase: Client = Depends(get_db), user: dict = Depends(require_hr_or_admin)):
    """Only an empty department."""
    key = dept_key(name)
    n = len(_members(supabase, key))
    if n:
        raise HTTPException(status_code=409, detail=f"Le département compte encore {n} personne(s) : déplacez-les d'abord.")
    for d in _departments(supabase):
        if dept_key(d.get("name")) == key:
            supabase.table("departments").delete().eq("id", d["id"]).execute()
    log_action(supabase, user["id"], "DELETE", "department", key)
    return {"deleted": True}
