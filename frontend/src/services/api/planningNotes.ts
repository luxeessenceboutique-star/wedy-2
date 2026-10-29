import { api } from './client';

export type PlanningNote = {
  id: string;
  note_date: string;          // yyyy-MM-dd
  content: string;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at?: string | null;
};

/** Notes of a date range (the month shown in the planning calendar). */
export const listPlanningNotes = (start: string, end: string) =>
  api.get<{ data: PlanningNote[] }>('/planning-notes', { params: { start, end } }).then(r => r.data.data);

export const createPlanningNote = (body: { note_date: string; content: string }) =>
  api.post<PlanningNote>('/planning-notes', body).then(r => r.data);

export const updatePlanningNote = (id: string, content: string) =>
  api.patch<PlanningNote>(`/planning-notes/${id}`, { content }).then(r => r.data);

export const deletePlanningNote = (id: string) =>
  api.delete(`/planning-notes/${id}`);
