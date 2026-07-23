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

export const sendForSignature = (docId: string) =>
  api.post(`/documents/generate/${docId}/send-for-signature`).then(r => r.data);

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

// ── EmployeeFolder compatibility helper ───────────────────────────────
export const listEmployeeDocuments = (employee_id: string) =>
  listDocuments({ employee_id }).then(r => r.data);
