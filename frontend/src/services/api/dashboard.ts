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

// ── HR KPIs (dashboard) ───────────────────────────────────────────────────────
export interface DashboardKpis {
  period_days: number;
  today: string;
  workday: boolean;
  workforce: { total: number; active: number; inactive: number; interns: number };
  today_status: { present: number; on_leave: number; absent: number; late: number | null; late_available: boolean };
  requests: {
    pending: number; pending_leave: number; pending_document: number; pending_other: number;
    accepted: number; refused: number;
  };
  documents: { to_process: number; pending_requests: number; incomplete: number; expired: number; to_renew: number };
  attendance_rate: { rate: number | null; absent_days: number; capacity_days: number };
  by_department: { name: string; value: number }[];
  by_contract: { name: string; value: number }[];
  expiring_contracts: {
    count: number; expired: number;
    items: { id: string; name: string; contract_type?: string; contract_end: string; days_left: number }[];
  };
  evolution: { month: string; label: string; hires: number; departures: number; headcount: number }[];
  warnings?: string[];
}

export const getDashboardKpis = (days = 30) =>
  api.get<DashboardKpis>('/dashboard/kpis', { params: { days } }).then(r => r.data);
