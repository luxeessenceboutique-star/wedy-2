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

export const seedDefaultTemplates = () =>
  api.post<{ created: string[]; skipped: string[] }>('/templates/seed-defaults').then(r => r.data);
