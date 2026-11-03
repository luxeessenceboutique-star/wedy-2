"""Org Chart — project teams and member assignments (Supabase SDK)."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
from app.database import get_db
from app.dependencies import get_current_user
from app.repositories import orgchart_repository

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
