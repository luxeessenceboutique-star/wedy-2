// Fields of document templates: their labels, the custom fields an imported template carries (label + default value,
// kept in an HTML comment at the top of the body by the server), and the values computed at generation (salary in
// words / figures, duration) — the same rules as backend/app/services/template_fields.py so the form shows what the
// document will contain.
import type { TKey } from '@/lib/lang';

/** Wedy fields a placeholder can be mapped to, in the order the import screen lists them. */
export const FIELD_LABELS: [string, TKey][] = [
  ['civility', 'tpl_v_civility'], ['full_name', 'tpl_v_full_name'], ['cin', 'tpl_v_cin'], ['address', 'tpl_v_address'],
  ['city', 'tpl_v_city'], ['birth_date', 'tpl_v_birth_date'], ['nationality', 'tpl_v_nationality'], ['email', 'tpl_v_email'],
  ['phone', 'tpl_v_phone'], ['matricule', 'tpl_v_matricule'], ['cnss_number', 'tpl_v_cnss'], ['bank_account', 'tpl_v_bank'],
  ['position', 'tpl_v_position'], ['department', 'tpl_v_department'], ['manager', 'tpl_v_manager'], ['school', 'tpl_v_school'],
  ['contract_type', 'tpl_v_contract_type'], ['hire_date', 'tpl_v_hire_date'], ['contract_start', 'tpl_v_contract_start'],
  ['contract_end', 'tpl_v_contract_end'], ['duration', 'tpl_v_duration'], ['salary', 'tpl_v_salary'],
  ['salary_figures', 'tpl_v_salary_figures'], ['salary_words', 'tpl_v_salary_words'], ['work_mode', 'tpl_v_work_mode'],
  ['today', 'tpl_v_today'], ['company', 'tpl_v_company'], ['company_address', 'tpl_v_company_address'], ['company_city', 'tpl_v_company_city'],
];
export const FIELD_LABEL: Record<string, TKey> = Object.fromEntries(FIELD_LABELS);
export const KEEP = '__keep__';

export type FieldMeta = Record<string, { label: string; default?: string }>;
const META = /^\s*<!--wedy-fields:([\s\S]*?)-->/;
export const readMeta = (body = ''): FieldMeta => {
  const m = META.exec(body);
  if (!m) return {};
  try { return JSON.parse(m[1]) as FieldMeta; } catch { return {}; }
};
export const stripMeta = (body = '') => body.replace(META, '');

/** « Durée du CDD » → f_duree_du_cdd (the key the server gives a custom field). */
export const customKey = (label: string) => {
  const s = label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40).replace(/_+$/, '');
  return `f_${s || 'champ'}`;
};

// ── French number in words (« 3 500 » → « trois mille cinq cents ») ─────────────────────────────────────────
const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS: Record<number, string> = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };
const below100 = (n: number): string => {
  if (n <= 16) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const t = Math.floor(n / 10), u = n % 10;
  if (t === 7) return u === 1 ? 'soixante et onze' : `soixante-${below100(10 + u)}`;
  if (t === 9) return `quatre-vingt-${below100(10 + u)}`;
  if (t === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[u]}`;
  return u === 0 ? TENS[t] : u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
};
const below1000 = (n: number, pluralOk = true): string => {
  const h = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(h === 1 ? 'cent' : `${UNITS[h]} cent${r === 0 && pluralOk ? 's' : ''}`);
  if (r) { let w = below100(r); if (!pluralOk && w.endsWith('quatre-vingts')) w = w.slice(0, -1); parts.push(w); }
  return parts.join(' ') || 'zéro';
};
export const numberToFrench = (n: number): string => {
  if (n < 0) return `moins ${numberToFrench(-n)}`;
  if (n < 1000) return below1000(n);
  const words: string[] = [];
  const millions = Math.floor(n / 1_000_000); let rest = n % 1_000_000;
  if (millions) words.push(`${numberToFrench(millions)} million${millions > 1 ? 's' : ''}`);
  const thousands = Math.floor(rest / 1000); rest %= 1000;
  if (thousands) words.push(thousands === 1 ? 'mille' : `${below1000(thousands, false)} mille`);
  if (rest) words.push(below1000(rest));
  return words.join(' ');
};

/** « 3 500,50 MAD » / 3500.5 → 3500.5 */
export const parseAmount = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[^\d,.-]/g, '');
  if ((s.match(/,/g) ?? []).length === 1 && (!s.includes('.') || s.lastIndexOf(',') > s.lastIndexOf('.'))) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
};
export const salaryFigures = (n: number) => {
  const whole = Math.trunc(n), cents = Math.round((n - whole) * 100);
  const s = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return cents ? `${s},${String(cents).padStart(2, '0')}` : s;
};
export const salaryWords = (n: number) => {
  const whole = Math.trunc(n), cents = Math.round((n - whole) * 100);
  return numberToFrench(whole) + (cents ? ` virgule ${numberToFrench(cents)}` : '');
};

const asDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v) ?? null;
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return iso ? new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3])) : null;
};
/** 01/09/2026 → 31/12/2026 = « 4 mois »; « du 19/08 au 19/11 » = « 3 mois » too. */
export const durationText = (start?: string | null, end?: string | null): string => {
  const a = asDate(start), b0 = asDate(end);
  if (!a || !b0 || b0 < a) return '';
  const b = new Date(b0.getTime() + 86_400_000);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  const y = a.getUTCFullYear() + Math.floor((a.getUTCMonth() + months) / 12), mo = (a.getUTCMonth() + months) % 12;
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const anchor = new Date(Date.UTC(y, mo, Math.min(a.getUTCDate(), lastDay)));
  let days = Math.round((b.getTime() - anchor.getTime()) / 86_400_000);
  if (days === 1) days = 0;
  const parts: string[] = [];
  if (months >= 12 && months % 12 === 0) parts.push(`${months / 12} an${months / 12 > 1 ? 's' : ''}`);
  else if (months) parts.push(`${months} mois`);
  if (days > 0) parts.push(`${days} jour${days > 1 ? 's' : ''}`);
  return parts.join(' et ');
};
