import { api, BASE } from './client';

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
