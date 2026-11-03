// Moroccan public holidays with a fixed civil date (the religious ones follow the lunar calendar and are
// announced each year, so they are not listed here).
import type { TKey } from '@/lib/lang';

export const FIXED_HOLIDAYS: { md: string; key: TKey }[] = [
  { md: '01-01', key: 'hol_new_year' },
  { md: '01-11', key: 'hol_independence_manifesto' },
  { md: '01-14', key: 'hol_amazigh_new_year' },
  { md: '05-01', key: 'hol_labour_day' },
  { md: '07-30', key: 'hol_throne_day' },
  { md: '08-14', key: 'hol_oued_eddahab' },
  { md: '08-20', key: 'hol_revolution' },
  { md: '08-21', key: 'hol_youth_day' },
  { md: '11-06', key: 'hol_green_march' },
  { md: '11-18', key: 'hol_independence_day' },
];

/** The holiday falling on an ISO date (yyyy-mm-dd), if any. */
export const holidayOn = (iso: string) => FIXED_HOLIDAYS.find(h => iso.slice(5, 10) === h.md);

/** The next `n` holidays from `from` (inclusive), with their date. */
export function nextHolidays(from: Date, n = 3): { date: Date; key: TKey }[] {
  const out: { date: Date; key: TKey }[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let y = start.getFullYear(); out.length < n && y <= start.getFullYear() + 1; y++) {
    for (const h of FIXED_HOLIDAYS) {
      const [m, d] = h.md.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      if (date >= start && out.length < n) out.push({ date, key: h.key });
    }
  }
  return out;
}

/** A holiday as the screens use it: month-day, a year when it only applies once, and its label. */
export type Holiday = { md: string; year: number | null; label: string };

/** The fixed civil holidays (minus those switched off in Settings) plus the ones HR stored in the `holidays` table (e.g. the religious ones). */
export function mergeHolidays(t: (k: TKey) => string, stored: { name: string; date: string; is_recurring?: boolean | null }[] = [], off: string[] = []): Holiday[] {
  const out: Holiday[] = FIXED_HOLIDAYS.filter(h => !off.includes(h.md)).map(h => ({ md: h.md, year: null, label: t(h.key) }));
  for (const h of stored) {
    const md = h.date.slice(5, 10);
    const year = h.is_recurring === false ? +h.date.slice(0, 4) : null;
    if (!out.some(x => x.md === md && (x.year === null || x.year === year))) out.push({ md, year, label: h.name });
  }
  return out;
}

const mdOf = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The holiday on a date, if any. */
export const holidayAt = (list: Holiday[], d: Date) => list.find(h => h.md === mdOf(d) && (h.year === null || h.year === d.getFullYear()));

/** The next `n` holidays from `from` (inclusive), soonest first. */
export function upcomingHolidays(list: Holiday[], from: Date, n = 3): { date: Date; label: string }[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const all: { date: Date; label: string }[] = [];
  for (const y of [start.getFullYear(), start.getFullYear() + 1]) {
    for (const h of list) {
      if (h.year !== null && h.year !== y) continue;
      const [m, d] = h.md.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      if (date >= start) all.push({ date, label: h.label });
    }
  }
  return all.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, n);
}

/** Days counted as "jours ouvrables" between two dates (inclusive): every day but Sunday and public holidays. */
export function workingDays(from: Date, to: Date, list: Holiday[]): number {
  let n = 0;
  for (let d = new Date(from.getFullYear(), from.getMonth(), from.getDate()); d <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (d.getDay() !== 0 && !holidayAt(list, d)) n++;
  }
  return n;
}

/** Lunar holidays (Morocco): [key, Hijri month, Hijri day, number of days]. Their Gregorian date moves every year. */
export const LUNAR_HOLIDAYS: { key: TKey; month: number; day: number; days: number }[] = [
  { key: 'hol_eid_fitr', month: 10, day: 1, days: 2 },
  { key: 'hol_eid_adha', month: 12, day: 10, days: 2 },
  { key: 'hol_muharram', month: 1, day: 1, days: 1 },
  { key: 'hol_mawlid', month: 3, day: 12, days: 2 },
];

/** Estimated Gregorian date of a Hijri day in a Gregorian year (Umm al-Qura calendar; Morocco may differ by a day). */
export function estimateLunar(year: number, month: number, day: number): Date | null {
  let fmt: Intl.DateTimeFormat;
  try { fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', day: 'numeric' }); } catch { return null; }
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const parts = fmt.formatToParts(d);
    const m = Number(parts.find(p => p.type === 'month')?.value), dd = Number(parts.find(p => p.type === 'day')?.value);
    if (m === month && dd === day) return d;
  }
  return null;
}
