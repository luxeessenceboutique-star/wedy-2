/**
 * Remembers the filters of the employees list, so that opening a profile and coming back does not
 * reset the list (department DATA, search, status…). The filters live in the page address
 * (?dept=DATA&q=ammar&status=active) and in the session as a fallback (e.g. a click on the sidebar).
 */
export type EmployeeFilters = { q: string; dept: string; status: string };

const FILTERS_KEY = 'wedy_employees_filters';
const URL_KEY = 'wedy_employees_list_url';
export const EMPTY_FILTERS: EmployeeFilters = { q: '', dept: '', status: '' };

const read = (key: string): string | null => { try { return sessionStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string | null) => {
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* storage blocked: filters just are not remembered */ }
};

/** Filters from the address if it carries any, otherwise the ones remembered for this session. */
export function readEmployeeFilters(search: string): EmployeeFilters {
  const p = new URLSearchParams(search);
  if (p.has('q') || p.has('dept') || p.has('status')) {
    return { q: p.get('q') ?? '', dept: p.get('dept') ?? '', status: p.get('status') ?? '' };
  }
  try {
    const saved = JSON.parse(read(FILTERS_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      return { q: String(saved.q ?? ''), dept: String(saved.dept ?? ''), status: String(saved.status ?? '') };
    }
  } catch { /* ignore a corrupted value */ }
  return { ...EMPTY_FILTERS };
}

/** The address query for these filters ("" when none is active). */
export const filtersToQuery = (f: EmployeeFilters): string => {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.dept) p.set('dept', f.dept);
  if (f.status) p.set('status', f.status);
  return p.toString();
};

export function rememberEmployeeList(f: EmployeeFilters) {
  write(FILTERS_KEY, JSON.stringify(f));
  const query = filtersToQuery(f);
  write(URL_KEY, `/app/employees${query ? `?${query}` : ''}`);
}

/** Where the "back" button of a profile must lead: the list exactly as it was left. */
export const employeesListUrl = (): string => read(URL_KEY) || '/app/employees';
