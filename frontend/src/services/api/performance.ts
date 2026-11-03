import { api } from './client';

export type PerformanceReview = {
  id: string; employee_id: string; reviewer_id?: string;
  period: string; score: number; feedback?: string;
  objectives?: string; status: string; created_at: string;
  employees?: { full_name: string; position: string; department: string; manager?: string };
  cycle?: string; overall_score?: number; comments?: string;
};

export const listPerformanceReviews = (params?: Record<string, string>) =>
  api.get<{ data: PerformanceReview[]; count: number }>('/performance', { params }).then(r => r.data);

export const createPerformanceReview = (body: Partial<PerformanceReview>) =>
  api.post<PerformanceReview>('/performance', body).then(r => r.data);

export const updatePerformanceReview = (id: string, body: Partial<PerformanceReview>) =>
  api.patch<PerformanceReview>(`/performance/${id}`, body).then(r => r.data);

// ── EmployeeFolder compatibility helpers ───────────────────────────────
export type PerformanceGoal = {
  id: string; employee_id: string; title: string; status: string; progress: number; created_at: string;
};

export const listGoals = (_params?: Record<string, string | number>): Promise<PerformanceGoal[]> =>
  Promise.resolve([]);

export const listReviews = (params?: Record<string, string>) =>
  listPerformanceReviews(params).then(r => r.data.map(rev => ({
    ...rev,
    cycle: rev.period,
    overall_score: rev.score,
    comments: rev.feedback,
  })));
