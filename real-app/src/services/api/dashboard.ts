import { api } from './client';

export interface DashboardMetrics {
  total_employees: number;
  total_interns: number;
  pending_requests: number;
  pending_leaves: number;
  expiring_contracts: number;
  docs_this_month: number;
  active_users: number;
}

export const getDashboardMetrics = () =>
  api.get<DashboardMetrics>('/dashboard/metrics').then(r => r.data);
