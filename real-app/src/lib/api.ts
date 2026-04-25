import axios from 'axios';

const BASE = '/api';

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wedy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ────────────────────────────────────────────────────────────
export interface LoginRes { access_token: string; user: { id: string; email: string } }

export const login = (email: string, password: string) =>
  api.post<LoginRes>('/auth/login', { email, password }).then(r => r.data);

export const signup = (email: string, password: string, full_name: string) =>
  api.post('/auth/signup', { email, password, full_name }).then(r => r.data);

export const getMe = () => api.get('/auth/me').then(r => r.data);

// ── Employees ────────────────────────────────────────────────────────
export type Employee = {
  id: string; full_name: string; cin?: string; matricule?: string;
  email?: string; phone?: string; position?: string; department?: string;
  status: string; hire_date?: string; contract_type?: string;
  contract_start?: string; contract_end?: string; salary?: number;
  birth_date?: string; address?: string; city?: string;
  nationality?: string; manager?: string; notes?: string;
  internship_start?: string; internship_end?: string;
  created_at?: string;
};

export const listEmployees = (params?: Record<string, string | number>) =>
  api.get<{ data: Employee[]; count: number }>('/employees', { params }).then(r => r.data);

export const getEmployee = (id: string) =>
  api.get<Employee>(`/employees/${id}`).then(r => r.data);

export const createEmployee = (body: Partial<Employee>) =>
  api.post<Employee>('/employees', body).then(r => r.data);

export const updateEmployee = (id: string, body: Partial<Employee>) =>
  api.patch<Employee>(`/employees/${id}`, body).then(r => r.data);

export const deleteEmployee = (id: string) =>
  api.delete(`/employees/${id}`);

// ── Templates ────────────────────────────────────────────────────────
export type Template = {
  id: string; name_fr: string; name_ar?: string; name_en?: string;
  category: string; description?: string; is_active: boolean;
  body_template?: string; created_at?: string;
};

export const listTemplates = (params?: Record<string, string | boolean>) =>
  api.get<{ data: Template[]; count: number }>('/templates', { params }).then(r => r.data);

// ── Documents ────────────────────────────────────────────────────────
export type GeneratedDoc = {
  id: string; employee_id: string; template_id: string;
  document_type: string; content: string; language: string;
  created_at: string; employees?: { full_name: string; cin: string; department: string };
};

export const generateDocument = (body: {
  employee_id: string; template_id: string;
  language?: string; use_ai_enhancement?: boolean; extra_variables?: Record<string, string>;
}) => api.post<{ document: GeneratedDoc; content: string }>('/documents/generate', body).then(r => r.data);

export const listDocuments = (params?: Record<string, string | number>) =>
  api.get<{ data: GeneratedDoc[]; count: number }>('/documents', { params }).then(r => r.data);

export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

export const getPdfUrl = (docId: string) => `${BASE}/documents/generate/${docId}/pdf`;
export const getDocxUrl = (docId: string) => `${BASE}/documents/generate/${docId}/docx`;

export const aiEnhance = (body: { document_content: string; document_type: string; language: string; instructions?: string }) =>
  api.post<{ enhanced_content: string }>('/documents/ai/enhance', body).then(r => r.data);

// ── Dashboard ────────────────────────────────────────────────────────
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

// ── Requests ─────────────────────────────────────────────────────────
export type HRRequest = {
  id: string; employee_id: string; type: string; status: string;
  created_at: string; profiles?: { full_name: string };
};

export const listRequests = (params?: Record<string, string | number>) =>
  api.get<{ data: HRRequest[]; count: number }>('/requests', { params }).then(r => r.data);

// ── Leaves ───────────────────────────────────────────────────────────
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
  sick_total: number;   sick_used: number;
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

// ── Analytics ────────────────────────────────────────────────────────
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

// ── Copilot ──────────────────────────────────────────────────────────
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export const sendCopilotMessage = (messages: ChatMessage[], context?: string) =>
  api.post<{ reply: string; usage: { input_tokens: number; output_tokens: number } }>(
    '/copilot/chat', { messages, context }
  ).then(r => r.data);

export const summarizeEmployee = (employeeId: string) =>
  api.post<{ summary: string; employee: Employee }>(`/copilot/summarize-employee`, null, { params: { employee_id: employeeId } }).then(r => r.data);

// ── Payroll ──────────────────────────────────────────────────────────
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

// ── Audit Logs ───────────────────────────────────────────────────────
export type AuditLog = {
  id: string; user_id: string; action: string; entity: string;
  entity_id?: string; details?: Record<string, unknown>;
  created_at: string; profiles?: { full_name: string };
};

export const listAuditLogs = (params?: Record<string, string | number>) =>
  api.get<{ data: AuditLog[]; count: number }>('/audit-logs', { params }).then(r => r.data);

// ── Interns (employees with status='intern') ─────────────────────────
export type Intern = Employee & { school?: string; };

export const listInterns = (params?: Record<string, string | number>) =>
  api.get<{ data: Intern[]; count: number }>('/interns', { params }).then(r => r.data);

export const createIntern = (body: Partial<Intern>) =>
  api.post<Intern>('/interns', body).then(r => r.data);

export const updateIntern = (id: string, body: Partial<Intern>) =>
  api.patch<Intern>(`/interns/${id}`, body).then(r => r.data);

export const deleteIntern = (id: string) =>
  api.delete(`/interns/${id}`);

// ── CV Parsing ───────────────────────────────────────────────────────
export interface CVParseRes {
  cv_upload: { id: string; file_url: string };
  extraction: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    skills: string[];
    summary: string;
    education: string;
    experience: string;
    certifications: string;
    languages: string[];
  };
  profile_suggestion: {
    type: 'intern' | 'candidate';
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  raw_text: string;
  debug?: string;
}

export const uploadAndParseCV = async (file: File): Promise<CVParseRes> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<CVParseRes>('/cv/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
