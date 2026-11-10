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
  file_type: 'cv' | 'certificat' | 'diplome' | 'contrat' | 'autre' | (string & {});
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
  return api.post<EmployeeFile>(`/employees/${employee_id}/files`, form, { timeout: 0 }).then(r => r.data);
};

export const deleteEmployeeFile = (employee_id: string, file_id: string) =>
  api.delete(`/employees/${employee_id}/files/${file_id}`);

export const getEmployeeFileUrl = (file_path: string) => `${BASE}/uploads/${file_path}`;

const MIME: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', txt: 'text/plain' };

/** Open a protected upload in a new tab (PDF / image preview). The tab is opened first so the browser does not block it. */
export const viewEmployeeFile = async (file_path: string, name: string, mime?: string) => {
  const w = window.open('', '_blank');
  try {
    const res = await api.get<Blob>(`/uploads/${file_path}`, { responseType: 'blob', timeout: 0 });
    const ext = (name.split('.').pop() ?? file_path.split('.').pop() ?? '').toLowerCase();
    const type = mime || (res.data.type && res.data.type !== 'application/octet-stream' ? res.data.type : '') || MIME[ext] || 'application/octet-stream';
    const url = URL.createObjectURL(new Blob([res.data], { type }));
    if (w) w.location.href = url; else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } catch (e) { w?.close(); throw e; }
};

/** Download a protected upload: the endpoint needs the Bearer token, so a plain link can't be used. */
export const downloadEmployeeFile = async (file_path: string, name: string) => {
  const res = await api.get<Blob>(`/uploads/${file_path}`, { responseType: 'blob', timeout: 0 });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

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
    /** values the server dropped because they are not written in the documents */
    _removed?: string[];
    /** values that could not be checked (scanned documents): never pre-selected */
    _unverified?: string[];
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

// ── AI-powered bulk import ─────────────────────────────────────────────────

export type ImportTargetType = 'employee' | 'intern';

export type ImportColumnMapping = {
  mapping: Record<string, string | null>;
  method: Record<string, 'exact' | 'fuzzy' | 'ai' | 'unmapped'>;
};

export type ImportDuplicateMatch = {
  duplicate: true;
  source: 'database' | 'file';
  matched_id?: string;
  matched_status?: string;
  matched_row_index?: number;
  matched_on: string;
};

export type ImportRowAction = 'create' | 'update' | 'skip';

export type ImportPreviewRow = {
  row_index: number;
  data: Partial<Employee>;
  custom_fields: Record<string, unknown>;
  errors: string[];
  duplicate: ImportDuplicateMatch | null;
};

export type ImportSummary = {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  missing_required_fields: number;
  duplicate_employees: number;
  duplicate_interns: number;
  duplicate_in_file: number;
};

export type ImportPreviewResponse = {
  column_mapping: ImportColumnMapping;
  rows: ImportPreviewRow[];
  summary: ImportSummary;
};

export type ImportCommitRow = {
  data: Partial<Employee>;
  custom_fields: Record<string, unknown>;
  action: ImportRowAction;
  matched_id?: string;
};

export type ImportCommitResult = { created: number; updated: number; skipped: number };

export const previewEmployeeImport = (file: File, targetType: ImportTargetType) => {
  const form = new FormData();
  form.append('file', file);
  form.append('target_type', targetType);
  return api.post<ImportPreviewResponse>('/employees/import/preview', form, { timeout: 180000 }).then(r => r.data);
};

export const commitEmployeeImport = (
  targetType: ImportTargetType,
  filename: string,
  columnMapping: ImportColumnMapping,
  rows: ImportCommitRow[],
) =>
  api.post<ImportCommitResult>('/employees/import/commit', {
    target_type: targetType,
    filename,
    column_mapping: columnMapping,
    rows,
  }, { timeout: 180000 }).then(r => r.data);
