import { api } from './client';
import type { Employee } from './employees';

export type OrgMember = {
  employee_id: string;
  project_id: string;
  role_in_team?: string;
  employee?: { id: string; full_name: string; position?: string; department?: string };
};

export type OrgProject = {
  id: string;
  name: string;
  color: string;
  description?: string;
  members: OrgMember[];
};

export const getOrgChart = () =>
  api.get<{ projects: OrgProject[]; unassigned: Employee[] }>('/orgchart').then(r => r.data);

export const createOrgProject = (body: { name: string; color: string; description?: string }) =>
  api.post<OrgProject>('/orgchart/projects', body).then(r => r.data);

export const updateOrgProject = (id: string, body: { name?: string; color?: string; description?: string }) =>
  api.patch<OrgProject>(`/orgchart/projects/${id}`, body).then(r => r.data);

export const deleteOrgProject = (id: string) =>
  api.delete(`/orgchart/projects/${id}`);

export const addOrgMember = (projectId: string, body: { employee_id: string; role_in_team?: string }) =>
  api.post<OrgMember>(`/orgchart/projects/${projectId}/members`, {
    employee_id: body.employee_id,
    project_id: projectId,
    role_in_team: body.role_in_team,
  }).then(r => r.data);

export const removeOrgMember = (projectId: string, employeeId: string) =>
  api.delete(`/orgchart/projects/${projectId}/members/${employeeId}`);

export const updateOrgMemberRole = (projectId: string, employeeId: string, role: string) =>
  api.patch(`/orgchart/projects/${projectId}/members/${employeeId}`, { role_in_team: role }).then(r => r.data);

export type OrgPerson = {
  id: string; full_name: string; position?: string; department?: string; manager?: string;
  /** the direct manager (N+1); none: reports to the department's head */
  manager_id?: string | null;
  email?: string; photo_url?: string; status: string;
};
export type OrgDeptRow = { id: string; name: string; manager_id?: string | null; description?: string | null };
/** Who leads the company (top of the chart), the departments with their head, whether this user may edit. */
export type OrgStructure = { ceo_id: string | null; departments: OrgDeptRow[]; can_edit: boolean };
export const getOrgStructure = () => api.get<OrgStructure>('/orgchart/structure').then(r => r.data);
export const updateOrgPerson = (id: string, body: { position?: string; department?: string; manager_id?: string | null }) =>
  api.patch<OrgPerson>(`/orgchart/people/${id}`, body).then(r => r.data);
export const setOrgHead = (employee_id: string | null) => api.put<{ ceo_id: string | null }>('/orgchart/head', { employee_id }).then(r => r.data);
export const createOrgDept = (name: string) => api.post<OrgDeptRow>('/orgchart/departments', { name }).then(r => r.data);
/** Rename (an existing name merges the two) and / or set the head (null: none). */
export const updateOrgDept = (body: { name: string; new_name?: string; manager_id?: string | null }) =>
  api.patch<OrgDeptRow>('/orgchart/departments', body).then(r => r.data);
export const deleteOrgDept = (name: string) => api.delete('/orgchart/departments', { params: { name } });
/** Everyone in the company org chart (active, on leave, interns), readable by every signed-in user. */
export const getOrgPeople = () => api.get<OrgPerson[]>('/orgchart/people').then(r => r.data);
