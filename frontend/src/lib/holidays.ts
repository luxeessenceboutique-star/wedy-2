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
