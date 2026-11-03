// Shared helpers of the recruitment screens (pipeline + candidates).
// Candidates are rows of the employees table with status = 'candidate'. The pipeline stage, the AI score and the
// source are kept in `custom_fields` (no dedicated columns): recruitment_stage, ai_score / score, source.
import type { Employee, Interview } from '@/services/api';
import type { TKey } from '@/lib/lang';

export type Stage = 'new' | 'screen' | 'interview' | 'offer' | 'hired' | 'rejected';

// [key, label key, dot color, column background] — the reference's palette
export const STAGES: [Exclude<Stage, 'rejected'>, TKey, string, string][] = [
  ['new', 'rec_stage_new', '#7d8f97', '#eef2f4'],
  ['screen', 'rec_stage_screen', '#16b6c8', '#e7f4f6'],
  ['interview', 'rec_stage_interview', '#6d5ad6', '#efedfa'],
  ['offer', 'rec_stage_offer', '#df9326', '#f8f0e1'],
  ['hired', 'rec_stage_hired', '#16a06b', '#e5f4ec'],
];
// chip colors of a stage on light cards
export const STAGE_CHIP: Record<Stage, [string, string]> = {
  new: ['#eef2f4', '#33474f'], screen: ['#e4f2f4', '#0b5f72'], interview: ['#ece9fb', '#5444b8'], offer: ['#fbefda', '#8a5207'], hired: ['#e1f5ec', '#0f6f49'], rejected: ['#fbe9e6', '#a33a28'],
};

const cf = (e: Employee) => (e.custom_fields ?? {}) as Record<string, unknown>;

export function stageOf(e: Employee, upcoming?: Interview): Stage {
  const s = cf(e).recruitment_stage;
  if (s === 'new' || s === 'screen' || s === 'interview' || s === 'offer' || s === 'hired' || s === 'rejected') return s;
  if (e.status !== 'candidate') return 'hired';
  return upcoming ? 'interview' : 'new';
}

/** AI match score (0-100) when the CV analysis stored one. */
export function scoreOf(e: Employee): number | null {
  const v = cf(e).ai_score ?? cf(e).score ?? cf(e).match_score;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

export const sourceOf = (e: Employee): string => {
  const v = cf(e).source;
  return typeof v === 'string' ? v : '';
};

/** When the candidate entered the current stage (falls back to the application date). */
export const stageSince = (e: Employee): string | undefined => {
  const v = cf(e).stage_changed_at;
  return typeof v === 'string' && v ? v : e.created_at;
};

/** Years of experience when known (custom_fields.experience_years). */
export const yearsOf = (e: Employee): number | null => {
  const v = cf(e).experience_years ?? cf(e).years_experience;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export const scoreColor = (s: number) => (s >= 85 ? '#16a06b' : s >= 75 ? '#16b6c8' : '#df9326');

export const daysSince = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null);

/** Next interview of each candidate (not cancelled, today or later). */
export function upcomingByCandidate(interviews: Interview[]): Map<string, Interview> {
  const today = new Date().toISOString().slice(0, 10);
  const m = new Map<string, Interview>();
  interviews
    .filter(i => i.status !== 'cancelled' && i.status !== 'realized' && i.status !== 'completed' && i.date >= today)
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
    .forEach(i => { if (!m.has(i.candidate_id)) m.set(i.candidate_id, i); });
  return m;
}

// [label key, tint, text, accent] per interview type — the Planning reference's palette
export const INTERVIEW_KIND: Record<string, [TKey, string, string, string]> = {
  rh: ['pl_kind_rh', '#ece9fb', '#3d2f99', '#6d5ad6'],
  technical: ['pl_kind_technical', '#e4f2f4', '#0b5f72', '#16b6c8'],
  final: ['pl_kind_final', '#fbefda', '#7a4706', '#df9326'],
  realized: ['pl_kind_done', '#e1f5ec', '#0f5a3c', '#16a06b'],
};
