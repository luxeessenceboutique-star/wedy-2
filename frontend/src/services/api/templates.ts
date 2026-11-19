import { api } from './client';

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

/** A field found in an uploaded document: its text there, what it was mapped to, how many times it appears. */
export type DetectedField = { placeholder: string; label: string; key: string; known: boolean; count: number; kind: 'bracket' | 'blank' | 'civility' | 'variable' | 'value'; default: string };
/** Look again at the fields of a saved template (a document imported already filled for someone): nothing is saved. */
/** A document holding several examples (one attestation per page, each for someone else): one of them is kept. */
export type TemplateExample = { index: number; person: string | null; title: string };
export const analyseSavedTemplate = (id: string, mapping: Record<string, string> = {}, example: number | null = null) =>
  api.post<{ body_template: string; fields: DetectedField[]; examples: TemplateExample[]; example: number | null }>(`/templates/${id}/analyse`, { mapping, example }).then(r => r.data);
/** Turn the values found into fields (with the user's corrections) and save the template. */
export const saveTemplateFields = (id: string, mapping: Record<string, string> = {}, example: number | null = null) =>
  api.post<{ template: Template; fields: DetectedField[] }>(`/templates/${id}/fields`, { mapping, example }).then(r => r.data);
/** Read an uploaded document without saving it: its fields (and the template it would give). `mapping` = the user's corrections. */
export const previewTemplateImport = (form: FormData) =>
  api.post<{ body_template: string; variables: string[]; fields: DetectedField[]; known_fields: Record<string, string>; examples: TemplateExample[]; example: number | null; scanned?: boolean }>('/templates/preview-import', form, { timeout: 120000 }).then(r => r.data);

export const seedDefaultTemplates = () =>
  api.post<{ created: string[]; skipped: string[] }>('/templates/seed-defaults').then(r => r.data);
