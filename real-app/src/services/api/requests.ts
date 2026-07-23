import { api } from './client';

export type HRRequest = {
  id: string; employee_id: string; type: string; status: string;
  created_at: string; profiles?: { full_name: string };
};

export const listRequests = (params?: Record<string, string | number>) =>
  api.get<{ data: HRRequest[]; count: number }>('/requests', { params }).then(r => r.data);
