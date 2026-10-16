import { api } from './client';
import type { Employee } from './employees';

export type Intern = Employee & {
  school?: string;
  /** register columns (ETAT DES STAGIAIRES) */
  education_summary?: string;
  internship_period?: string;
  internship_status?: string;
  internship_type?: string;
  /** developer recruitment test (sheet "ETAT TESTS") */
  test_code_source?: string;
  test_demo_link?: string;
  test_cv?: string;
  test_note_rh?: string;
  test_note_test?: string;
  school_contact?: string;
};

export const listInterns = (params?: Record<string, string | number>) =>
  api.get<{ data: Intern[]; count: number }>('/interns', { params }).then(r => r.data);

export const createIntern = (body: Partial<Intern>) =>
  api.post<Intern>('/interns', body).then(r => r.data);

export const updateIntern = (id: string, body: Partial<Intern>) =>
  api.patch<Intern>(`/interns/${id}`, body).then(r => r.data);

/** Hire an intern: active employee (CDI), hire date set, register status « Embauché ». */
export const convertIntern = (id: string, body?: { contract_type?: string; hire_date?: string }) =>
  api.post<Intern>(`/interns/${id}/convert`, body ?? {}).then(r => r.data);

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
