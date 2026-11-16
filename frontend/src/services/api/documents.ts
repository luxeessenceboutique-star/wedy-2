import { api, BASE } from './client';

export type GeneratedDoc = {
  id: string; employee_id: string; template_id: string;
  document_type: string; content: string; language: string;
  name?: string; created_at: string; employees?: { full_name: string; cin: string; department: string };
  signature_status?: 'pending' | 'signed' | 'declined';
};

export const generateDocument = (body: {
  employee_id: string; template_id: string;
  language?: string; use_ai_enhancement?: boolean; extra_variables?: Record<string, string>;
}) => api.post<{ document: GeneratedDoc; content: string; html: string; ai_enhanced: boolean; ai_error?: string | null }>('/documents/generate', body, { timeout: 180000 }).then(r => r.data);

/** Save the text changed by hand: the PDF / DOCX and the copy in the person's folder follow. */
export const updateGeneratedDocument = (docId: string, content: string) =>
  api.patch<{ document: GeneratedDoc; content: string; html: string }>(`/documents/generate/${docId}`, { content }).then(r => r.data);

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

export const sendForSignature = (docId: string) =>
  api.post(`/documents/generate/${docId}/send-for-signature`).then(r => r.data);

/** The document as a full page, exactly as in the PDF (same page, same styles). */
async function fetchDocHtml(docId: string): Promise<string> {
  const token = localStorage.getItem('wedy_token');
  const res = await fetch(`${BASE}/documents/generate/${docId}/html`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Erreur ${res.status}`);
  }
  return res.text();
}

function openPage(html: string, print: boolean, title: string) {
  const w = window.open('', '_blank');
  if (!w) throw new Error('Fenêtre bloquée par le navigateur');
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  if (print) setTimeout(() => { w.focus(); w.print(); }, 350);
}

/** Open a generated document in a new tab (no print dialog). */
export async function viewDocument(docId: string, title = 'Document'): Promise<void> {
  openPage(await fetchDocHtml(docId), false, title);
}

/** Open a generated document and the browser's print dialog (→ Save as PDF). */
export async function printDocument(docId: string, title = 'Document'): Promise<void> {
  openPage(await fetchDocHtml(docId), true, title);
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

// ── EmployeeFolder compatibility helper ───────────────────────────────
export const listEmployeeDocuments = (employee_id: string) =>
  listDocuments({ employee_id }).then(r => r.data);
