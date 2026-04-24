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
  id: string; full_name: string; cin: string; matricule?: string;
  email?: string; phone?: string; position?: string; department?: string;
  status: string; hire_date?: string; contract_type?: string;
  contract_start?: string; contract_end?: string; salary?: number;
  birth_date?: string; address?: string; city?: string;
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
