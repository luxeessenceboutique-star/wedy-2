import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Check } from 'lucide-react';
import { createLeave, getApiError, listEmployees, listHolidays, listLeaveBalances, listLeaves, reviewLeave, type StaffBalance } from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { holidayAt, mergeHolidays, upcomingHolidays, workingDays, type Holiday } from '@/lib/holidays';
import { TimeOffView } from './TimeOffView';
import { useAppSettings } from '@/lib/appSettings';

export type TimeOffVals = {
  loading: boolean;
  rtl: boolean;
  pending: number; pendingLabel: string;
  addLeave: () => void;
  onToday: number; monthDays: number; monthDaysLabel: string; avgLeft: string; holMonth: number;
  monthLabel: string; isCurrent: boolean; prev: () => void; next: () => void; thisMonth: () => void;
  dayCount: number;
  days: { n: string; dow: string; color: string; numColor: string; bg: string; col: string }[];
  rows: { name: string; ini: string; av: string; bars: { left: string; width: string; bg: string; shadow: string; label: string; title: string; delay: string }[] }[];
  todayAt: number | null;
  balances: { name: string; title: string; left: string; total: string; pct: string; bar: string }[];
  moreBalances: number; toggleAll: () => void; toggleLabel: string;
  holidaysYear: string;
  holidays: { key: string; day: string; mon: string; label: string; soon: boolean }[];
  drawer: ReactNode;
};

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const BAL_ROWS = 8;

/** The reference shows three families of leave; every backend type falls in one of them. */
const FAMILY: Record<string, 'a' | 'e' | 'm'> = { annual: 'a', sick: 'm', unjustified: 'm', personal: 'e', maternity: 'e', paternity: 'e', unpaid: 'e' };
const COLORS = { a: ['#16b6c8', 'rgba(22,182,200,.8)'], e: ['#6d5ad6', 'rgba(109,90,214,.8)'], m: ['#df5740', 'rgba(223,87,64,.8)'] } as const;
const TYPE_KEYS: [string, TKey][] = [['annual', 'tof_type_annual'], ['sick', 'tof_type_sick'], ['personal', 'tof_type_personal'], ['maternity', 'tof_type_maternity'], ['paternity', 'tof_type_paternity'], ['unpaid', 'tof_type_unpaid'], ['unjustified', 'tof_type_unjustified']];


export default function TimeOffPage() {
  const { t, lang } = useLang();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [now] = useState(() => new Date());
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(false);

  const leavesQ = useQuery({ queryKey: ['leaves', 'all'], queryFn: () => listLeaves({ limit: 1000 }) });
  const balQ = useQuery({ queryKey: ['leave-balances', cursor.getFullYear()], queryFn: () => listLeaveBalances(cursor.getFullYear()) });
  const holQ = useQuery({ queryKey: ['holidays'], queryFn: listHolidays, staleTime: 3600_000 });

  const leaves = useMemo(() => leavesQ.data?.data ?? [], [leavesQ.data]);
  const { data: appSettings } = useAppSettings();
  const hols = useMemo(() => mergeHolidays(t, holQ.data?.data, appSettings?.leave.off_holidays), [t, holQ.data, appSettings]);
  const balances = useMemo(() => balQ.data?.data ?? [], [balQ.data]);

  const y = cursor.getFullYear(), m = cursor.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const mStart = new Date(y, m, 1), mEnd = new Date(y, m, dim);
  const isCurrent = now.getFullYear() === y && now.getMonth() === m;
  const todayN = isCurrent ? now.getDate() : null;
  const fmtNum = (n: number, dec = 1) => n.toLocaleString(loc, { maximumFractionDigits: dec });
  const dowFmt = new Intl.DateTimeFormat(loc, { weekday: 'narrow' });
  const monthName = new Intl.DateTimeFormat(loc, { month: 'long' }).format(mStart);
  const dayFmt = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' });

  // ── timeline: approved leave overlapping the month ───────────────────────────
  const approved = leaves.filter(l => l.status === 'approved' && l.start_date);
  const inMonth = approved.flatMap(l => {
    const s = parse(l.start_date), e = parse(l.end_date || l.start_date);
    if (e < mStart || s > mEnd) return [];
    const a = s < mStart ? mStart : s, b = e > mEnd ? mEnd : e;
    const whole = s >= mStart && e <= mEnd;
    const days = whole && l.days ? l.days : workingDays(a, b, hols);
    return [{ l, s, e, a: a.getDate(), b: b.getDate(), days }];
  });
  const typeLabel = (type: string) => t(TYPE_KEYS.find(([k]) => k === type)?.[1] ?? 'tof_type_personal');
  const byEmp = new Map<string, { name: string; items: typeof inMonth }>();
  for (const it of [...inMonth].sort((p, q) => p.a - q.a)) {
    const id = it.l.employee_id;
    if (!byEmp.has(id)) byEmp.set(id, { name: it.l.employees?.full_name || '—', items: [] });
    byEmp.get(id)!.items.push(it);
  }
  const rows = [...byEmp.values()].map(({ name, items }, i) => ({
    name, ini: initialsOf(name), av: avatarGradient(name),
    bars: items.map((it, k) => {
      const fam = FAMILY[it.l.type] ?? 'e';
      const label = `${typeLabel(it.l.type)} · ${fmtNum(it.days)} ${t('tof_d')}`;
      return {
        left: ((it.a - 1) / dim * 100).toFixed(3), width: ((it.b - it.a + 1) / dim * 100).toFixed(3),
        bg: COLORS[fam][0], shadow: COLORS[fam][1], label,
        title: `${name} — ${typeLabel(it.l.type)} · ${dayFmt.format(it.s)} → ${dayFmt.format(it.e)}`,
        delay: String(200 + i * 60 + k * 40),
      };
    }),
  }));

  const days = Array.from({ length: dim }, (_, i) => {
    const d = new Date(y, m, i + 1);
    const we = d.getDay() === 0 || d.getDay() === 6, hol = !!holidayAt(hols, d), today = i + 1 === todayN;
    return {
      n: String(i + 1), dow: dowFmt.format(d),
      color: we || hol ? '#a3b1b7' : '#52646d', numColor: today ? '#ffffff' : 'inherit',
      bg: today ? '#0a1c24' : 'transparent',
      col: hol ? 'repeating-linear-gradient(45deg,#f5e3c3 0 3px,#fbf3e4 3px 6px)' : we ? '#f6f8f9' : 'transparent',
    };
  });

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const todayIso = iso(now);
  const onToday = new Set(approved.filter(l => l.start_date.slice(0, 10) <= todayIso && todayIso <= (l.end_date || l.start_date).slice(0, 10)).map(l => l.employee_id)).size;
  const monthDays = Math.round(inMonth.reduce((s, it) => s + it.days, 0));
  const lefts = balances.map(b => (b.annual_total ?? 0) - (b.annual_used ?? 0));
  const avg = lefts.length ? lefts.reduce((a, b) => a + b, 0) / lefts.length : null;
  const holMonth = days.filter((_, i) => holidayAt(hols, new Date(y, m, i + 1))).length;
  const pending = leaves.filter(l => l.status === 'pending').length;

  // ── balances ─────────────────────────────────────────────────────────────────
  const sorted = [...balances].sort((p, q) => ((q.annual_total - q.annual_used) - (p.annual_total - p.annual_used)) || p.full_name.localeCompare(q.full_name));
  const shown = showAll ? sorted : sorted.slice(0, BAL_ROWS);
  const balRows = shown.map(b => {
    const left = Math.max(0, b.annual_total - b.annual_used), total = b.annual_total || 0;
    const r = total ? left / total : 0;
    return {
      name: b.full_name, title: [b.full_name, b.department].filter(Boolean).join(' · '),
      left: fmtNum(left), total: fmtNum(total), pct: String(Math.round(r * 100)),
      bar: r < 0.35 ? '#df9326' : 'linear-gradient(90deg,#0e6f84,#16b6c8)',
    };
  });

  // ── holidays ─────────────────────────────────────────────────────────────────
  const monShort = (d: Date) => {
    const s = new Intl.DateTimeFormat(loc, { month: lang === 'ar' ? 'long' : 'short' }).format(d).replace('.', '');
    return lang === 'ar' ? s : s.slice(0, 3).toUpperCase();
  };
  const upcoming = upcomingHolidays(hols, now, 3).map(h => ({
    key: iso(h.date), day: String(h.date.getDate()).padStart(2, '0'), mon: monShort(h.date), label: h.label,
    soon: h.date.getFullYear() === now.getFullYear() && h.date.getMonth() === now.getMonth(),
  }));

  const v: TimeOffVals = {
    loading: leavesQ.isLoading,
    rtl: lang === 'ar',
    pending, pendingLabel: tf(t(pending === 1 ? 'tof_pending_one' : 'tof_pending_n'), { n: pending }),
    addLeave: () => setOpen(true),
    onToday, monthDays, monthDaysLabel: tf(t('tof_days_in_month'), { month: monthName }),
    avgLeft: avg == null ? '—' : `${fmtNum(avg)} ${t('tof_d')}`, holMonth,
    monthLabel: cap(new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(mStart)), isCurrent,
    prev: () => setCursor(new Date(y, m - 1, 1)), next: () => setCursor(new Date(y, m + 1, 1)),
    thisMonth: () => setCursor(new Date(now.getFullYear(), now.getMonth(), 1)),
    dayCount: dim, days, rows,
    todayAt: todayN ? (todayN - 0.5) / dim : null,
    balances: balRows,
    moreBalances: sorted.length > BAL_ROWS ? sorted.length - BAL_ROWS : 0,
    toggleAll: () => setShowAll(x => !x),
    toggleLabel: showAll ? t('tof_show_less') : tf(t('tof_show_all'), { n: sorted.length }),
    holidaysYear: tf(t('tof_morocco_year'), { year: y }),
    holidays: upcoming,
    drawer: <NewLeaveDrawer open={open} onClose={() => setOpen(false)} balances={balances} hols={hols} />,
  };
  return <TimeOffView v={v} />;
}

// ── "Enregistrer un congé" ──────────────────────────────────────────────────────
const inputStyle: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };
const BALANCE_COL: Record<string, 'annual' | 'sick' | 'personal'> = { annual: 'annual', sick: 'sick', personal: 'personal' };

function NewLeaveDrawer({ open, onClose, balances, hols }: { open: boolean; onClose: () => void; balances: StaffBalance[]; hols: Holiday[] }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const empQ = useQuery({ queryKey: ['employees', 'staff-list'], queryFn: () => listEmployees({ limit: 1000 }), enabled: open });
  const staff = (empQ.data?.data ?? []).filter(e => e.status !== 'candidate' && e.status !== 'terminated');
  const empty = { employee_id: '', type: 'annual', start_date: '', end_date: '', days: '', reason: '', approve: true };
  const [f, setF] = useState(empty);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) setF(empty); }

  const auto = f.start_date && f.end_date && f.end_date >= f.start_date ? workingDays(parse(f.start_date), parse(f.end_date), hols) : 0;
  const days = f.days !== '' ? Math.max(0, Number(f.days) || 0) : auto;
  const bal = balances.find(b => b.employee_id === f.employee_id);
  const col = BALANCE_COL[f.type];
  const remaining = bal && col ? (bal[`${col}_total`] ?? 0) - (bal[`${col}_used`] ?? 0) : null;
  const over = remaining != null && days > remaining;

  const mut = useMutation({
    mutationFn: async () => {
      const leave = await createLeave({ employee_id: f.employee_id, type: f.type, start_date: f.start_date, end_date: f.end_date, days, reason: f.reason || undefined });
      if (f.approve) await reviewLeave(leave.id, 'approved');
      return leave;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      notify.success(t(f.approve ? 'tof_saved_approved' : 'tof_saved_pending'));
      onClose();
    },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const ok = !!f.employee_id && !!f.start_date && !!f.end_date && f.end_date >= f.start_date && days > 0;

  return (
    <Drawer open={open} onClose={onClose} title={t('tof_enregistrer_un_conge')} subtitle={t('tof_drawer_sub')} icon={<CalendarPlus size={17} />} width={480}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!ok || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('save')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t('tof_employee')}</label>
          <select value={f.employee_id} onChange={e => setF(x => ({ ...x, employee_id: e.target.value }))} style={inputStyle}>
            <option value="">{empQ.isLoading ? t('loading') : t('tof_pick_employee')}</option>
            {staff.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t('tof_type')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(118px,1fr))', gap: 6 }}>
            {TYPE_KEYS.map(([k, key]) => {
              const on = f.type === k, c = COLORS[FAMILY[k] ?? 'e'][0];
              return <button key={k} type="button" onClick={() => setF(x => ({ ...x, type: k }))} style={{ height: 36, borderRadius: 10, border: `1px solid ${on ? c : '#d6dfe3'}`, background: on ? `${c}14` : '#ffffff', color: on ? c : '#33474f', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{t(key)}</button>;
            })}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>{t('tof_start')}</label><input type="date" value={f.start_date} onChange={e => setF(x => ({ ...x, start_date: e.target.value, days: '' }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('tof_end')}</label><input type="date" value={f.end_date} min={f.start_date || undefined} onChange={e => setF(x => ({ ...x, end_date: e.target.value, days: '' }))} style={inputStyle} /></div>
        </div>
        <div>
          <label style={labelStyle}>{t('tof_days')}</label>
          <input type="number" min={0} step={0.5} value={f.days !== '' ? f.days : auto || ''} onChange={e => setF(x => ({ ...x, days: e.target.value }))} style={inputStyle} />
          <div style={{ marginTop: 6, fontSize: 12, color: '#5f7079' }}>{t('tof_days_hint')}</div>
        </div>
        {days > 0 && remaining != null && (
          <div style={{ padding: '10px 12px', borderRadius: 12, background: over ? '#fdeeeb' : '#f3fafb', fontSize: 13, color: over ? '#b8402c' : '#33474f' }}>
            {over ? tf(t('tof_over_balance'), { n: remaining }) : tf(t('tof_after_balance'), { n: remaining - days })}
          </div>
        )}
        <div><label style={labelStyle}>{t('tof_reason')}</label><input value={f.reason} onChange={e => setF(x => ({ ...x, reason: e.target.value }))} placeholder={t('tof_reason_ph')} style={inputStyle} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: '#33474f', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.approve} onChange={e => setF(x => ({ ...x, approve: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#0e6f84' }} />
          {t('tof_approve_now')}
        </label>
      </div>
    </Drawer>
  );
}

