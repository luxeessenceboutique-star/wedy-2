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
