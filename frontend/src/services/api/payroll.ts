import { api } from './client';

export type PayrollRecord = {
  id: string; employee_id: string; month: number; year: number;
  base_salary: number; bonuses: number; deductions: number;
  cnss: number; ir: number; net_salary: number;
  status: string; paid_at?: string; notes?: string; created_at: string;
  employees?: { id: string; full_name: string; position?: string; department?: string };
};

export const listPayroll = (params?: Record<string, string | number>) =>
  api.get<{ data: PayrollRecord[]; count: number }>('/payroll', { params }).then(r => r.data);

export const createPayroll = (body: {
  employee_id: string; month: number; year: number;
  base_salary: number; bonuses?: number; deductions?: number; notes?: string;
}) => api.post<PayrollRecord>('/payroll', body).then(r => r.data);

export const updatePayroll = (id: string, body: Partial<PayrollRecord>) =>
  api.patch<PayrollRecord>(`/payroll/${id}`, body).then(r => r.data);

export const deletePayroll = (id: string) => api.delete(`/payroll/${id}`);

export const generateBulkPayroll = (month: number, year: number) =>
  api.post<{ created: number; skipped: number }>('/payroll/generate-bulk', null, { params: { month, year } }).then(r => r.data);

export const getPayrollPdfUrl = (id: string) => `${api.defaults.baseURL}/payroll/${id}/pdf`;

// ── EmployeeFolder compatibility helper ───────────────────────────────
export type Payslip = {
  id: string; employee_id: string;
  period_month: number; period_year: number;
  net_salary: number; gross_salary: number;
  cnss_deduction: number; amo_deduction: number; ir_deduction: number;
  created_at: string;
};

export const listPayslips = (params?: Record<string, string | number>) =>
  listPayroll(params).then(r => r.data.map(p => ({
    id: p.id, employee_id: p.employee_id,
    period_month: p.month, period_year: p.year,
    net_salary: p.net_salary, gross_salary: p.base_salary,
    cnss_deduction: p.cnss, amo_deduction: 0, ir_deduction: p.ir,
    created_at: p.created_at,
  } as Payslip)));
