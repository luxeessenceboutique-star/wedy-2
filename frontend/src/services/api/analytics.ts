import { api } from './client';
import type { Employee } from './employees';

export interface AnalyticsOverview {
  total_employees: number; total_terminated: number;
  total_interns: number; on_leave: number;
  expiring_contracts: number; expiring_list: { employee: Employee; days_left: number }[];
  contract_breakdown: Record<string, number>;
  department_breakdown: Record<string, number>;
  docs_this_month: number; pending_leaves: number; pending_requests: number;
}

export const getAnalyticsOverview = () =>
  api.get<AnalyticsOverview>('/analytics/overview').then(r => r.data);

export const getHeadcountTrend = () =>
  api.get<{ trend: { label: string; month: number; year: number; count: number }[] }>('/analytics/headcount-trend').then(r => r.data);

export const getDocumentsTrend = () =>
  api.get<{ trend: { label: string; month: number; year: number; count: number }[] }>('/analytics/documents-trend').then(r => r.data);

export const getLeaveStats = () =>
  api.get<{ by_type: Record<string, Record<string, number>> }>('/analytics/leave-stats').then(r => r.data);
