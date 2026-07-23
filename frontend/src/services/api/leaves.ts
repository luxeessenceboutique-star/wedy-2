import { api } from './client';

export type LeaveRequest = {
  id: string; employee_id: string; type: string;
  start_date: string; end_date: string; days: number;
  reason?: string; status: string;
  created_at: string;
  employees?: { id: string; full_name: string; position?: string; department?: string };
};

export type LeaveBalance = {
  employee_id: string; year: number;
  annual_total: number; annual_used: number;
  sick_total: number; sick_used: number;
  personal_total: number; personal_used: number;
};

export const listLeaves = (params?: Record<string, string | number>) =>
  api.get<{ data: LeaveRequest[]; count: number }>('/leaves', { params }).then(r => r.data);

export const getLeaveBalance = (employeeId: string, year?: number) =>
  api.get<LeaveBalance>(`/leaves/balance/${employeeId}`, { params: year ? { year } : {} }).then(r => r.data);

export const createLeave = (body: {
  employee_id: string; type: string; start_date: string;
  end_date: string; days: number; reason?: string;
}) => api.post<LeaveRequest>('/leaves', body).then(r => r.data);

export const reviewLeave = (id: string, status: 'approved' | 'rejected') =>
  api.patch<LeaveRequest>(`/leaves/${id}/review`, null, { params: { status } }).then(r => r.data);

export const deleteLeave = (id: string) => api.delete(`/leaves/${id}`);

export const listHolidays = () => api.get<{ data: { name: string; date: string }[] }>('/leaves/holidays').then(r => r.data);

// ── EmployeeFolder compatibility helper ───────────────────────────────
export const listLeaveRequests = (params?: Record<string, string | number>) =>
  listLeaves(params).then(r => r.data);
