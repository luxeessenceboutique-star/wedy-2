// Shared constants of the Stagiaires screens. The register values (internship status / type) are stored as
// French text in the database (they come from the « ETAT DES STAGIAIRES » sheet): they stay the stored value,
// only their label is translated.
import { Flame, Shield, Star, TrendingUp, Zap, type LucideIcon } from 'lucide-react';
import type { TKey } from '@/lib/lang';

export const STAGE_OPTIONS = ['En cours', 'Embauché', 'Terminé', 'Fin de stage', 'Validé', 'Quitté', 'Désistement', 'Déperdition', 'Arrêté', 'Démissionné', 'Expulsion', 'Annulée', 'En attente', 'En cours de décision', 'Non validé', 'À distance'];
export const STAGE_KEY: Record<string, TKey> = Object.fromEntries(STAGE_OPTIONS.map((s, i) => [s, `stg_st_${i}` as TKey]));

export const INTERNSHIP_TYPES = [
  'Stage fonctionnel', 'Stage d’apprentissage', 'Stage fonctionnel pré-embauche', 'Stage PFE (Projet de Fin d’Études)',
  'Stage PFA (Projet de Fin d’Année)', 'Stage pré-embauche', 'En cours de décision',
];
export const TYPE_KEY: Record<string, TKey> = Object.fromEntries(INTERNSHIP_TYPES.map((s, i) => [s, `stg_ty_${i}` as TKey]));
// [background, ink] per type, in the order above
export const TYPE_TONE: [string, string][] = [['#e4f2f4', '#0b5f72'], ['#ece9fb', '#5444b8'], ['#e7f4f6', '#0e6f84'], ['#e1f5ec', '#0f6f49'], ['#fbefda', '#8a5207'], ['#fbe9e6', '#a33a28'], ['#eef2f4', '#33474f']];
export const typeTone = (t?: string | null): [string, string] => TYPE_TONE[INTERNSHIP_TYPES.indexOf(t ?? '')] ?? ['#eef2f4', '#33474f'];

/** [background, ink, dot] of an internship status chip. */
export function stageTone(st?: string | null): [string, string, string] {
  if (!st) return ['#f3f6f7', '#7d8f97', '#c3ced3'];
  if (st === 'En cours' || st === 'À distance') return ['#e4f2f4', '#0b5f72', '#16b6c8'];
  if (['Embauché', 'Terminé', 'Fin de stage', 'Validé'].includes(st)) return ['#e1f5ec', '#0f6f49', '#16a06b'];
  if (['Quitté', 'Désistement', 'Déperdition', 'En attente', 'En cours de décision'].includes(st)) return ['#fbefda', '#8a5207', '#df9326'];
  return ['#fbe9e6', '#a33a28', '#df5740'];
}

// Onboarding phases: [id, label key, accent, tint]
export type PhaseId = 'pre' | 'integration' | 'evaluation' | 'completed';
export const PHASES: [PhaseId, TKey, string, string][] = [
  ['pre', 'stg_ph_pre', '#df9326', '#fbefda'],
  ['integration', 'stg_ph_integration', '#0e6f84', '#e4f2f4'],
  ['evaluation', 'stg_ph_evaluation', '#6d5ad6', '#ece9fb'],
  ['completed', 'stg_ph_completed', '#16a06b', '#e1f5ec'],
];

// Moovwin values scored in the evaluations
export const SCORES: [key: 'amana_score' | 'itkan_score' | 'iltizam_score' | 'ibdaa_score' | 'nama_score', label: string, desc: TKey, icon: LucideIcon][] = [
  ['amana_score', 'Amana', 'stg_sc_amana', Shield],
  ['itkan_score', 'Itkan', 'stg_sc_itkan', Star],
  ['iltizam_score', 'Iltizam', 'stg_sc_iltizam', Flame],
  ['ibdaa_score', 'Ibdaa', 'stg_sc_ibdaa', Zap],
  ['nama_score', 'Nama', 'stg_sc_nama', TrendingUp],
];

export const INTERN_COLS = [
  { key: 'full_name', label: 'Nom complet', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'position', label: 'Mission' },
  { key: 'school', label: 'École' },
  { key: 'education_summary', label: 'Étude / Diplôme' },
  { key: 'department', label: 'Département' },
  { key: 'manager', label: 'Encadrant' },
  { key: 'internship_type', label: 'Type de stage' },
  { key: 'internship_status', label: 'Statut du stage' },
  { key: 'internship_start', label: 'Début du stage' },
  { key: 'internship_end', label: 'Fin du stage' },
  { key: 'internship_period', label: 'Période de stage' },
  { key: 'remuneration', label: 'Rémunération (DH)' },
  { key: 'school_contact', label: 'Contact responsable (école)' },
  { key: 'skills', label: 'Compétences' },
  { key: 'languages', label: 'Langues' },
  { key: 'notes', label: 'Observation' },
  { key: 'bio', label: 'Bio' },
];

const DAY = 86400000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const daysLeft = (d?: string | null) => (d ? Math.round((new Date(d.slice(0, 10)).getTime() - startOfToday()) / DAY) : null);
export const fmtDate = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');

/** ongoing | upcoming | done | none, from the internship dates. */
export function periodOf(start?: string | null, end?: string | null): 'ongoing' | 'upcoming' | 'done' | 'none' {
  const today = new Date().toISOString().slice(0, 10);
  const s = (start || '').slice(0, 10), e = (end || '').slice(0, 10);
  if (!s && !e) return 'none';
  if (s && s > today) return 'upcoming';
  if (e && e < today) return 'done';
  return 'ongoing';
}

/** Short label of a test link (GitHub / Drive / Démo / Lien). */
export const linkLabel = (url: string) => (url.includes('github.com') ? 'GitHub' : url.includes('drive.google') ? 'Drive'
  : /vercel|netlify|render\.com/.test(url) ? 'Démo' : 'Lien');
