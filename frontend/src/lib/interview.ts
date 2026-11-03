// Shared helpers of the Entretiens screens (list + interview room).
import type { InterviewDecision, Recommendation, ScCriterion } from '@/services/api';
import type { TKey } from '@/lib/lang';

/** Weighted average of the rated criteria, on 100 (same formula as the backend). Null while nothing is rated. */
export function overallScore(criteria: ScCriterion[]): number | null {
  const rated = criteria.filter(c => c.score > 0);
  if (!rated.length) return null;
  const total = rated.reduce((s, c) => s + (c.weight || 1), 0);
  return Math.round((rated.reduce((s, c) => s + (c.score / 5) * (c.weight || 1), 0) / total) * 100);
}

export const scoreTone = (s: number) => (s >= 80 ? '#16a06b' : s >= 65 ? '#16b6c8' : s >= 50 ? '#df9326' : '#df5740');

// [label key, background, ink]
export const RECO: Record<Recommendation, [TKey, string, string]> = {
  strong_yes: ['itv_reco_strong_yes', '#e1f5ec', '#0f6f49'],
  yes: ['itv_reco_yes', '#e4f2f4', '#0b5f72'],
  maybe: ['itv_reco_maybe', '#fbefda', '#8a5207'],
  no: ['itv_reco_no', '#fbe9e6', '#a33a28'],
};
export const RECO_ORDER: Recommendation[] = ['strong_yes', 'yes', 'maybe', 'no'];

// [label key, description key, accent]
export const DECISIONS: [InterviewDecision, TKey, TKey, string][] = [
  ['next', 'itv_dec_next', 'itv_dec_next_s', '#6d5ad6'],
  ['offer', 'itv_dec_offer', 'itv_dec_offer_s', '#df9326'],
  ['hire_employee', 'itv_dec_hire', 'itv_dec_hire_s', '#16a06b'],
  ['hire_intern', 'itv_dec_intern', 'itv_dec_intern_s', '#0e6f84'],
  ['reject', 'itv_dec_reject', 'itv_dec_reject_s', '#df5740'],
  ['later', 'itv_dec_later', 'itv_dec_later_s', '#7d8f97'],
];

/** Local Date of an interview's day + "HH:MM[:SS]". */
export const interviewStart = (date: string, time: string) => new Date(`${date}T${(time || '00:00').slice(0, 5)}:00`);

export const durationMin = (start: string, end: string) => {
  const [a, b] = [start, end].map(x => { const [h, m] = (x || '0:0').split(':').map(Number); return h * 60 + (m || 0); });
  return Math.max(5, b - a || 60);
};

/** "mm:ss" or "h:mm:ss" since `iso`. */
export function elapsed(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
