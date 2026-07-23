"""OrgChart repository — raw Supabase access for orgchart_projects/orgchart_team_members."""
from supabase import Client


def list_projects(supabase: Client):
    return supabase.table("orgchart_projects").select("*").order("created_at").execute()


def list_team_members(supabase: Client):
    return supabase.table("orgchart_team_members").select("*").execute()


def list_employees_for_orgchart(supabase: Client):
    return supabase.table("employees").select("id, full_name, position, department, photo_url, status").execute()


def create_project(supabase: Client, data: dict):
    return supabase.table("orgchart_projects").insert(data).execute()


def update_project(supabase: Client, project_id: str, updates: dict):
    return supabase.table("orgchart_projects").update(updates).eq("id", project_id).execute()


def delete_project_members(supabase: Client, project_id: str):
    return supabase.table("orgchart_team_members").delete().eq("project_id", project_id).execute()


def delete_project(supabase: Client, project_id: str):
    return supabase.table("orgchart_projects").delete().eq("id", project_id).execute()


def delete_member_by_employee(supabase: Client, employee_id: str):
    return supabase.table("orgchart_team_members").delete().eq("employee_id", employee_id).execute()


def add_member(supabase: Client, project_id: str, employee_id: str, role_in_team: str):
    return supabase.table("orgchart_team_members").insert({
        "project_id": project_id,
        "employee_id": employee_id,
        "role_in_team": role_in_team,
    }).execute()


def update_member_role(supabase: Client, project_id: str, employee_id: str, role: str):
    return (
        supabase.table("orgchart_team_members")
        .update({"role_in_team": role})
        .eq("project_id", project_id)
        .eq("employee_id", employee_id)
        .execute()
    )


def remove_member(supabase: Client, project_id: str, employee_id: str):
    return (
        supabase.table("orgchart_team_members")
        .delete()
        .eq("project_id", project_id)
        .eq("employee_id", employee_id)
        .execute()
    )
