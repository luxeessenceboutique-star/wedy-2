import { api } from './client';
import type { Employee } from './employees';

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
