import axios from 'axios';

const BASE = '/api';

export const api = axios.create({ baseURL: BASE, timeout: 15000 });

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
  remuneration?: number;
  skills?: string[];
  experience_summary?: string;
  education_summary?: string;
  certifications?: string[];
  languages?: string[];
  bio?: string;
  photo_url?: string;
  custom_fields?: Record<string, string>;
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

// ── Employee Files ────────────────────────────────────────────────────────────

export type EmployeeFile = {
  id: string;
  employee_id: string;
  name: string;
  file_type: 'cv' | 'certificat' | 'diplome' | 'contrat' | 'autre';
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  created_at: string;
};

export const listEmployeeFiles = (employee_id: string) =>
  api.get<EmployeeFile[]>(`/employees/${employee_id}/files`).then(r => r.data);

export const uploadEmployeeFile = (employee_id: string, file: File, file_type: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('file_type', file_type);
  return api.post<EmployeeFile>(`/employees/${employee_id}/files`, form).then(r => r.data);
};

export const deleteEmployeeFile = (employee_id: string, file_id: string) =>
  api.delete(`/employees/${employee_id}/files/${file_id}`);

export const getEmployeeFileUrl = (file_path: string) => `${BASE}/uploads/${file_path}`;

export type AnalysisResult = {
  files_analyzed: number;
  extracted: {
    full_name?: string; cin?: string; matricule?: string;
    birth_date?: string; nationality?: string; email?: string;
    phone?: string; address?: string; city?: string;
    position?: string; department?: string; hire_date?: string;
    contract_type?: string; contract_start?: string; contract_end?: string;
    salary?: number; manager?: string; cnss_number?: string;
    bank_account?: string; notes?: string;
    education?: { degree: string; field: string; school: string; year: string }[];
    certifications?: { name: string; issuer: string; year: string }[];
    skills?: string[];
    languages?: string[];
  };
};

export const analyzeEmployeeFolder = (employee_id: string) =>
  api.post<AnalysisResult>(`/employees/${employee_id}/analyze`, null, { timeout: 120000 }).then(r => r.data);

export const applyAnalysis = (employee_id: string, fields: Record<string, unknown>) =>
  api.post<Employee>(`/employees/${employee_id}/apply-analysis`, fields).then(r => r.data);

// ── Departments & Positions ───────────────────────────────────────────────────

export type Department = { id: string; name: string; description?: string };

export const listDepartments = () =>
  api.get<Department[]>('/departments').then(r => r.data);

// ── Templates ────────────────────────────────────────────────────────
export type Template = {
  target_type?: 'employee' | 'intern' | 'both';
  id: string; name_fr: string; name_ar?: string; name_en?: string;
  category: string; description?: string; is_active: boolean;
  body_template?: string; created_at?: string;
};

export const listTemplates = (params?: Record<string, string | boolean>) =>
  api.get<{ data: Template[]; count: number }>('/templates', { params }).then(r => r.data);

export const getTemplate = (id: string) =>
  api.get<Template>(`/templates/${id}`).then(r => r.data);

export const createTemplate = (body: {
  code: string; name_fr: string; name_en?: string; name_ar?: string;
  category: string; body_template: string; variables?: string[]; is_active?: boolean;
}) => api.post<Template>('/templates', body).then(r => r.data);

export const updateTemplate = (id: string, body: Partial<Template> & { body_template?: string }) =>
  api.patch<Template>(`/templates/${id}`, body).then(r => r.data);

export const deleteTemplate = (id: string) => api.delete(`/templates/${id}`);

export const importTemplateFromPdf = (form: FormData) =>
  api.post<Template>('/templates/import', form, { timeout: 120000 }).then(r => r.data);

export const seedDefaultTemplates = () =>
  api.post<{ created: string[]; skipped: string[] }>('/templates/seed-defaults').then(r => r.data);

// ── Documents ────────────────────────────────────────────────────────
export type GeneratedDoc = {
  id: string; employee_id: string; template_id: string;
  document_type: string; content: string; language: string;
  name?: string; created_at: string; employees?: { full_name: string; cin: string; department: string };
};

export const generateDocument = (body: {
  employee_id: string; template_id: string;
  language?: string; use_ai_enhancement?: boolean; extra_variables?: Record<string, string>;
}) => api.post<{ document: GeneratedDoc; content: string }>('/documents/generate', body).then(r => r.data);

export const listDocuments = (params?: Record<string, string | number>) =>
  api.get<{ data: GeneratedDoc[]; count: number }>('/documents', { params }).then(r => r.data);

export const uploadDocument = (id: string, type: string, name: string, file: File, isEmployee = false) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/documents`, form, {
    params: {
      [isEmployee ? 'employee_id' : 'profile_id']: id,
      type,
      name
    }
  }).then(r => r.data);
};

export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

export const getPdfUrl = (docId: string) => `${BASE}/documents/generate/${docId}/pdf`;
export const getDocxUrl = (docId: string) => `${BASE}/documents/generate/${docId}/docx`;

/** Open a print-to-PDF window with proper A4 CSS — renders exactly like the on-screen preview. */
function _openPrintWindow(html: string, title: string) {
  const w = window.open('', '_blank')!;
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>` +
    `<style>` +
    `@page{size:A4;margin:2.5cm 2.8cm;}` +
    `body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;margin:0;color:#1a1a1a;}` +
    `img{max-width:100%;height:auto;}` +
    `h1,h2,h3{text-align:center;}` +
    `p{margin:4px 0;}` +
    `</style></head><body>${html}</body></html>`
  );
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}

/** Fetch a generated document's HTML and open it in a new tab for viewing (no print dialog). */
export async function viewDocument(docId: string, title = 'Document'): Promise<void> {
  const token = localStorage.getItem('wedy_token');
  const res = await fetch(`/api/documents/generate/${docId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Erreur ${res.status}`);
  }
  const data = await res.json();
  const w = window.open('', '_blank')!;
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>` +
    `<style>` +
    `body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;margin:0;padding:40px 60px;color:#1a1a1a;max-width:800px;margin:0 auto;}` +
    `img{max-width:100%;height:auto;}` +
    `h1,h2,h3{text-align:center;}` +
    `p{margin:4px 0;}` +
    `</style></head><body>${data.content ?? ''}</body></html>`
  );
  w.document.close();
}

/** Fetch a generated document's HTML and open the browser print dialog (→ Save as PDF). */
export async function printDocument(docId: string, title = 'Document'): Promise<void> {
  const token = localStorage.getItem('wedy_token');
  const res = await fetch(`/api/documents/generate/${docId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Erreur ${res.status}`);
  }
  const data = await res.json();
  _openPrintWindow(data.content ?? '', title);
}

/** Authenticated file download — fetches with Bearer token, triggers browser save-dialog. */
export async function downloadDoc(docId: string, format: 'pdf' | 'docx', filename?: string): Promise<void> {
  const token = localStorage.getItem('wedy_token');
  const url = format === 'pdf' ? getPdfUrl(docId) : getDocxUrl(docId);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Erreur ${res.status}`);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename ?? `document.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

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
    '/copilot/chat', { messages, context }, { timeout: 60000 }
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

// ── Intern Onboarding ────────────────────────────────────────────────
export interface ChecklistItem {
  id: string; label: string; phase: 'pre' | 'integration' | 'evaluation'; done: boolean; done_at?: string | null;
}
export interface Objective { id: string; label: string; done: boolean; }
export interface InternOnboarding {
  id: string; intern_id: string; phase: 'pre' | 'integration' | 'evaluation' | 'completed';
  mentor_name?: string; mentor_email?: string;
  checklist: ChecklistItem[]; objectives: Objective[];
  created_at: string; updated_at: string;
}
export interface InternEvaluation {
  id: string; intern_id: string; evaluation_type: 'weekly' | 'final' | 'self';
  week_number?: number; evaluator_name?: string;
  amana_score: number; itkan_score: number; iltizam_score: number; ibdaa_score: number; nama_score: number;
  comment?: string; created_at: string;
}

export const getInternOnboarding = (internId: string) =>
  api.get<InternOnboarding>(`/interns/${internId}/onboarding`).then(r => r.data);

export const updateInternOnboarding = (internId: string, body: Partial<InternOnboarding>) =>
  api.patch<InternOnboarding>(`/interns/${internId}/onboarding`, body).then(r => r.data);

export const listInternEvaluations = (internId: string) =>
  api.get<InternEvaluation[]>(`/interns/${internId}/evaluations`).then(r => r.data);

export const createInternEvaluation = (internId: string, body: Partial<InternEvaluation>) =>
  api.post<InternEvaluation>(`/interns/${internId}/evaluations`, body).then(r => r.data);

export const deleteInternEvaluation = (internId: string, evalId: string) =>
  api.delete(`/interns/${internId}/evaluations/${evalId}`);

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
  const res = await api.post<CVParseRes>('/cv/upload', formData);
  return res.data;
};
// ── Performance ────────────────────────────────────────────────────────
export type PerformanceReview = {
  id: string; employee_id: string; reviewer_id?: string;
  period: string; score: number; feedback?: string;
  objectives?: string; status: string; created_at: string;
  employees?: { full_name: string; position: string; department: string };
};

export const listPerformanceReviews = (params?: Record<string, string>) =>
  api.get<{ data: PerformanceReview[]; count: number }>('/performance', { params }).then(r => r.data);

export const createPerformanceReview = (body: Partial<PerformanceReview>) =>
  api.post<PerformanceReview>('/performance', body).then(r => r.data);

export const updatePerformanceReview = (id: string, body: Partial<PerformanceReview>) =>
  api.patch<PerformanceReview>(`/performance/${id}`, body).then(r => r.data);

// ── Users ────────────────────────────────────────────────────────────
export type UserProfile = {
  id: string; user_id: string; full_name?: string; email?: string;
  role: string; user?: { email: string };
};

export const listUsers = () =>
  api.get<{ data: UserProfile[]; count: number }>('/users').then(r => r.data);

export const updateUserRole = (userId: string, role: string) =>
  api.patch(`/users/${userId}/role`, { role }).then(r => r.data);

// ── Assets ───────────────────────────────────────────────────────────
export type Asset = {
  id: string; name: string; category?: string; serial_number?: string;
  employee_id?: string; status: string; assigned_at?: string; notes?: string;
  employees?: { full_name: string; department: string };
};

export const listAssets = (params?: Record<string, string>) =>
  api.get<{ data: Asset[]; count: number }>('/assets', { params }).then(r => r.data);

export const createAsset = (body: Partial<Asset>) =>
  api.post<Asset>('/assets', body).then(r => r.data);

export const updateAsset = (id: string, body: Partial<Asset>) =>
  api.patch<Asset>(`/assets/${id}`, body).then(r => r.data);
// ── Notifications ──────────────────────────────────────────────────
export type Notification = {
  id: string; title: string; message: string; type: string;
  is_read: boolean; link?: string; created_at: string;
};
export const listNotifications = () => api.get<{ data: Notification[] }>('/notifications').then(r => r.data);
export const markNotifRead = (id: string) => api.patch(`/notifications/${id}/read`);
export const markAllNotifsRead = () => api.patch('/notifications/read-all');

// ── Holidays ────────────────────────────────────────────────────────
export const listHolidays = () => api.get<{ data: { name: string; date: string }[] }>('/leaves/holidays').then(r => r.data);

// ── Webhooks ────────────────────────────────────────────────────────
export const listWebhooks = () => api.get<{ data: any[] }>('/webhooks').then(r => r.data);
export const createWebhook = (body: any) => api.post('/webhooks', body).then(r => r.data);
export const deleteWebhook = (id: string) => api.delete(`/webhooks/${id}`);

// ── Payroll PDF ─────────────────────────────────────────────────────
export const getPayrollPdfUrl = (id: string) => `${api.defaults.baseURL}/payroll/${id}/pdf`;

// ── EmployeeFolder compatibility helpers ─────────────────────────────────────

export const listLeaveRequests = (params?: Record<string, string | number>) =>
  listLeaves(params).then(r => r.data);

export const listEmployeeDocuments = (employee_id: string) =>
  listDocuments({ employee_id }).then(r => r.data);

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

export type PerformanceGoal = {
  id: string; employee_id: string; title: string; status: string; progress: number; created_at: string;
};

export const listGoals = (_params?: Record<string, string | number>): Promise<PerformanceGoal[]> =>
  Promise.resolve([]);

export const listReviews = (params?: Record<string, string>) =>
  listPerformanceReviews(params).then(r => r.data.map(rev => ({
    ...rev,
    cycle: rev.period,
    overall_score: rev.score,
    comments: rev.feedback,
  })));

// ── Org Chart ────────────────────────────────────────────────────────────────
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

export const getOrgChart = async (): Promise<{ projects: OrgProject[]; unassigned: Employee[] }> => {
  const [projRes, empRes] = await Promise.all([
    api.get<{ data: any[] }>('/orgchart/projects').then(r => r.data.data ?? []),
    listEmployees({ limit: 500 }).then(r => r.data),
  ]);

  const projects: OrgProject[] = await Promise.all(
    projRes.map(async (p: any) => {
      const membersRes = await api.get<{ data: OrgMember[] }>(`/orgchart/projects/${p.id}/members`).then(r => r.data.data ?? []);
      return { ...p, members: membersRes } as OrgProject;
    })
  );

  const assignedIds = new Set(projects.flatMap(p => p.members.map(m => m.employee_id)));
  const unassigned = empRes.filter(e => !assignedIds.has(e.id));

  return { projects, unassigned };
};

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
  api.patch(`/orgchart/projects/${projectId}/members/${employeeId}`, null, { params: { role_in_team: role } }).then(r => r.data);
