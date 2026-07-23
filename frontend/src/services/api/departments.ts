import { api } from './client';

export type Department = { id: string; name: string; description?: string };

export const listDepartments = () =>
  api.get<Department[]>('/departments').then(r => r.data);

export const createDepartment = (body: { name: string; description?: string }) =>
  api.post<Department>('/departments', body).then(r => r.data);

export const updateDepartment = (id: string, body: { name?: string; description?: string }) =>
  api.patch<Department>(`/departments/${id}`, body).then(r => r.data);

export const deleteDepartment = (id: string) =>
  api.delete(`/departments/${id}`);
