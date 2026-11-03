import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Check, PenLine, Trash2, UserX } from 'lucide-react';
import { api, createLeave, deleteLeave, getApiError, listEmployees, listHolidays, listLeaves, reviewLeave, updateLeave, type LeaveRequest } from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { mergeHolidays, workingDays, type Holiday } from '@/lib/holidays';
import { AbsencesView } from './AbsencesView';
import { useAppSettings } from '@/lib/appSettings';

export type AbsencesVals = {
  loading: boolean; rtl: boolean;
  declare: () => void;
  today: number; rateLabel: string; rate: string; missing: number; lost: number;
  rows: { id: string; name: string; dates: string; ini: string; av: string; type: string; tBg: string; tColor: string; ok: boolean; okTitle?: string; ko: boolean; sent: boolean; delay: string; remind: () => void; tools: ReactNode; editor: ReactNode }[];
  more: number; toggleAll: () => void; toggleLabel: string;
  deptTitle: string;
  depts: { name: string; title: string; v: string; w: string; bar: string; delay: string }[];
  insight: string;
  drawer: ReactNode;
};

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const parse = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ROWS = 8;
const STAFF = new Set(['active', 'on-leave']);

/** Absence kinds (the rest of leave_requests are time off). Sickness and work accidents are justified by nature. */
const TYPES: Record<string, { key: TKey; bg: string; color: string; justified: boolean }> = {
  sick: { key: 'abs_type_sick', bg: '#fbe9e6', color: '#a33a28', justified: true },
  unjustified: { key: 'abs_type_unjustified', bg: '#fbefda', color: '#8a5207', justified: false },
  accident: { key: 'abs_type_accident', bg: '#ece9fb', color: '#5444b8', justified: true },
};
const DOW_KEYS: TKey[] = ['abs_dow_0', 'abs_dow_1', 'abs_dow_2', 'abs_dow_3', 'abs_dow_4', 'abs_dow_5', 'abs_dow_6'];

const smallBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', borderRadius: 9, border: '1px solid #d6dfe3', background: '#ffffff', color: '#52646d', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };

export default function AbsencesPage() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [now] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sent, setSent] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<string | null>(null);

  const leavesQ = useQuery({ queryKey: ['absences-all'], queryFn: () => listLeaves({ limit: 1000 }), refetchInterval: 60_000 });
  const empQ = useQuery({ queryKey: ['employees', 'staff-list'], queryFn: () => listEmployees({ limit: 1000 }) });
  const holQ = useQuery({ queryKey: ['holidays'], queryFn: listHolidays, staleTime: 3600_000 });
  const { data: appSettings } = useAppSettings();
  const hols = useMemo(() => mergeHolidays(t, holQ.data?.data, appSettings?.leave.off_holidays), [t, holQ.data, appSettings]);
  const staff = useMemo(() => (empQ.data?.data ?? []).filter(e => STAFF.has(e.status ?? 'active')), [empQ.data]);

  const refresh = () => ['absences-all', 'leaves', 'leave-balances', 'dashboard-kpis'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  const del = useMutation({
    mutationFn: (id: string) => deleteLeave(id),
    onSuccess: () => { refresh(); notify.success(t('abs_deleted')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const remind = useMutation({
    mutationFn: (l: LeaveRequest) => api.post(`/leaves/${l.id}/remind`),
    onSuccess: (_, l) => { setSent(s => new Set(s).add(l.id)); notify.success(tf(t('abs_reminded'), { name: l.employees?.full_name ?? '' })); },
    onError: e => notify.error(axios.isAxiosError(e) && e.response?.status === 409 ? t('abs_no_account') : getApiError(e, t('error'))),
  });

  const absences = (leavesQ.data?.data ?? []).filter(l => l.status === 'approved' && TYPES[l.type] && l.start_date);
  const todayIso = iso(now);
  const covers = (l: LeaveRequest, d: string) => l.start_date.slice(0, 10) <= d && d <= (l.end_date || l.start_date).slice(0, 10);
  const overlap = (l: LeaveRequest, from: Date, to: Date) => {
    const s = parse(l.start_date), e = parse(l.end_date || l.start_date);
    const a = s > from ? s : from, b = e < to ? e : to;
    return a <= b ? workingDays(a, b, hols) : 0;
  };

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const today = new Set(absences.filter(l => covers(l, todayIso)).map(l => l.employee_id)).size;
  const missingList = absences.filter(l => !TYPES[l.type].justified && !l.justification?.trim());
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1), mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lost = absences.reduce((s, l) => s + overlap(l, mStart, mEnd), 0);

  // Absenteeism this quarter = absence working days / (headcount × working days elapsed).
  const q = Math.floor(now.getMonth() / 3);
  const qStart = new Date(now.getFullYear(), q * 3, 1);
  const elapsed = workingDays(qStart, now, hols);
  const deptOf = new Map(staff.map(e => [e.id, e.department || t('abs_no_dept')]));
  const lostBy = new Map<string, number>();
  const byDow = Array(7).fill(0) as number[];
  let lostQ = 0;
  for (const l of absences) {
    const n = overlap(l, qStart, now);
    if (!n || !deptOf.has(l.employee_id)) continue;
    lostQ += n;
    const d = deptOf.get(l.employee_id)!;
    lostBy.set(d, (lostBy.get(d) ?? 0) + n);
    const s = parse(l.start_date), e = parse(l.end_date || l.start_date);
    for (let x = s < qStart ? qStart : s; x <= e && x <= now; x = new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1)) byDow[x.getDay()]++;
  }
  const pct = (n: number) => `${n.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  const rateOf = (days: number, heads: number) => (heads && elapsed ? days / (heads * elapsed) * 100 : 0);
  const overall = rateOf(lostQ, staff.length);
  const heads = new Map<string, number>();
  staff.forEach(e => { const d = deptOf.get(e.id)!; heads.set(d, (heads.get(d) ?? 0) + 1); });
  const deptRates = [...heads.entries()].map(([name, h]) => ({ name, h, r: rateOf(lostBy.get(name) ?? 0, h) })).sort((a, b) => b.r - a.r).slice(0, 5);
  const maxR = Math.max(...deptRates.map(d => d.r), 0.0001);
  const qLabel = tf(t('abs_quarter'), { q: q + 1 });

  let insight = t('abs_insight_none');
  if (lostQ > 0 && deptRates.length) {
    const top = deptRates[0];
    const ratio = overall ? top.r / overall : 0;
    const dow = byDow.indexOf(Math.max(...byDow));
    const dowShare = byDow[dow] / byDow.reduce((a, b) => a + b, 0);
    if (ratio >= 1.5 && heads.size > 1) {
      insight = tf(t('abs_insight_top'), { dept: top.name, x: ratio.toLocaleString(loc, { maximumFractionDigits: 1 }), avg: pct(overall) });
      if (dowShare >= 0.3) insight += ' ' + tf(t('abs_insight_dow'), { day: t(DOW_KEYS[dow]) });
      insight += ' ' + t('abs_insight_advice');
    } else insight = tf(t('abs_insight_even'), { avg: pct(overall) });
  }

  // ── rows: the last 30 days, and anything still running ─────────────────────────
  const cutoff = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
  const recent = absences.filter(l => (l.end_date || l.start_date).slice(0, 10) >= cutoff).sort((a, b) => b.start_date.localeCompare(a.start_date));
  const shown = showAll ? recent : recent.slice(0, ROWS);
  const dfm = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' });
  const datesOf = (l: LeaveRequest) => {
    const s = parse(l.start_date), e = parse(l.end_date || l.start_date);
    const n = l.days || workingDays(s, e, hols) || 1;
    const span = covers(l, todayIso) && s.getTime() === e.getTime() ? t('abs_today') : s.getTime() === e.getTime() ? dfm.format(s) : `${dfm.format(s)} → ${dfm.format(e)}`;
    return `${span} · ${tf(t(n === 1 ? 'abs_day_one' : 'abs_days_n'), { n })}`;
  };
  const rows = shown.map((l, i) => {
    const ty = TYPES[l.type], name = l.employees?.full_name || '—';
    const ok = ty.justified || !!l.justification?.trim();
    const wasSent = sent.has(l.id);
    return {
      id: l.id, name, dates: datesOf(l), ini: initialsOf(name), av: avatarGradient(name),
      type: t(ty.key), tBg: ty.bg, tColor: ty.color,
      ok, okTitle: l.justification || undefined, ko: !ok && !wasSent, sent: !ok && wasSent, delay: String(i * 50),
      remind: () => remind.mutate(l),
      tools: (
        <span style={{ display: 'inline-flex', gap: 4, marginInlineStart: 'auto' }}>
          {!ty.justified && <button type="button" onClick={() => setEditing(editing === l.id ? null : l.id)} title={t('abs_justify')} style={smallBtn} className="abs-h2"><PenLine size={13} />{l.justification ? t('edit') : t('abs_justify')}</button>}
          <button type="button" aria-label={t('delete')} title={t('delete')} onClick={() => { if (window.confirm(tf(t('abs_confirm_delete'), { name }))) del.mutate(l.id); }} style={{ ...smallBtn, width: 32, padding: 0, justifyContent: 'center', color: '#7d8f97' }} className="abs-h4"><Trash2 size={13} /></button>
        </span>
      ),
      editor: editing === l.id ? <JustifyEditor leave={l} onDone={() => setEditing(null)} /> : null,
    };
  });

  const v: AbsencesVals = {
    loading: leavesQ.isLoading || empQ.isLoading, rtl: lang === 'ar',
    declare: () => setOpen(true),
    today, rateLabel: tf(t('abs_rate_label'), { q: qLabel }), rate: staff.length ? pct(overall) : '—', missing: missingList.length, lost,
    rows, more: recent.length > ROWS ? recent.length - ROWS : 0, toggleAll: () => setShowAll(x => !x),
    toggleLabel: showAll ? t('tof_show_less') : tf(t('abs_show_all'), { n: recent.length }),
    deptTitle: tf(t('abs_dept_title'), { q: qLabel }),
    depts: deptRates.map((d, i) => ({ name: d.name, title: tf(t('abs_dept_tip'), { n: d.h }), v: pct(d.r), w: String(Math.max(2, Math.round(d.r / maxR * 100))), bar: d.r > 4 ? 'linear-gradient(90deg,#df9326,#df5740)' : 'linear-gradient(90deg,#0e6f84,#16b6c8)', delay: String(i * 80) })),
    insight,
    drawer: <DeclareDrawer open={open} onClose={() => setOpen(false)} staff={staff} hols={hols} onDone={refresh} />,
  };
  return <AbsencesView v={v} />;
}

// ── inline justification (an unjustified absence becomes "justificatif reçu") ──────
function JustifyEditor({ leave, onDone }: { leave: LeaveRequest; onDone: () => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [value, setValue] = useState(leave.justification ?? '');
  const mut = useMutation({
    mutationFn: () => updateLeave(leave.id, { justification: value.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['absences-all'] }); notify.success(t('abs_justif_saved')); onDone(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  return (
    <form onSubmit={e => { e.preventDefault(); mut.mutate(); }} style={{ flexBasis: '100%', display: 'flex', gap: 8, paddingInlineStart: 50 }}>
      <input autoFocus value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') onDone(); }} placeholder={t('abs_justif_ph')}
        style={{ flex: 1, minWidth: 0, height: 36, padding: '0 12px', borderRadius: 10, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' }} />
      <button type="submit" disabled={mut.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        {mut.isPending ? <Spinner size={13} color="#fff" /> : <Check size={14} />}{t('save')}
      </button>
    </form>
  );
}

// ── "Déclarer une absence" ──────────────────────────────────────────────────────
const inputStyle: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };

function DeclareDrawer({ open, onClose, staff, hols, onDone }: { open: boolean; onClose: () => void; staff: { id: string; full_name: string }[]; hols: Holiday[]; onDone: () => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const [today] = useState(() => iso(new Date()));
  const empty = { employee_id: '', type: 'sick', start_date: today, end_date: today, reason: '', justification: '' };
  const [f, setF] = useState(empty);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) setF(empty); }
  const days = f.start_date && f.end_date >= f.start_date ? Math.max(1, workingDays(parse(f.start_date), parse(f.end_date), hols)) : 0;
  const mut = useMutation({
    mutationFn: async () => {
      const leave = await createLeave({ employee_id: f.employee_id, type: f.type, start_date: f.start_date, end_date: f.end_date, days, reason: f.reason || undefined });
      await reviewLeave(leave.id, 'approved');
      if (f.type === 'unjustified' && f.justification.trim()) await updateLeave(leave.id, { justification: f.justification.trim() });
    },
    onSuccess: () => { onDone(); notify.success(t('abs_saved')); onClose(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const ok = !!f.employee_id && days > 0;
  return (
    <Drawer open={open} onClose={onClose} title={t('abs_declarer_une_absence')} subtitle={t('abs_drawer_sub')} icon={<UserX size={17} />} width={480}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!ok || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('save')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t('tof_employee')}</label>
          <select value={f.employee_id} onChange={e => setF(x => ({ ...x, employee_id: e.target.value }))} style={inputStyle}>
            <option value="">{t('tof_pick_employee')}</option>
            {staff.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t('abs_kind')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
            {Object.entries(TYPES).map(([k, ty]) => {
              const on = f.type === k;
              return <button key={k} type="button" onClick={() => setF(x => ({ ...x, type: k }))} style={{ minHeight: 36, padding: '6px 8px', borderRadius: 10, border: `1px solid ${on ? ty.color : '#d6dfe3'}`, background: on ? ty.bg : '#ffffff', color: on ? ty.color : '#33474f', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{t(ty.key)}</button>;
            })}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>{t('abs_from')}</label><input type="date" value={f.start_date} onChange={e => setF(x => ({ ...x, start_date: e.target.value, end_date: x.end_date < e.target.value ? e.target.value : x.end_date }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('abs_to')}</label><input type="date" value={f.end_date} min={f.start_date} onChange={e => setF(x => ({ ...x, end_date: e.target.value }))} style={inputStyle} /></div>
        </div>
        {days > 0 && <div style={{ padding: '10px 12px', borderRadius: 12, background: '#f3fafb', fontSize: 13, color: '#33474f' }}>{tf(t(days === 1 ? 'abs_day_one' : 'abs_days_n'), { n: days })} · {t('abs_days_hint')}</div>}
        <div><label style={labelStyle}>{t('tof_reason')}</label><input value={f.reason} onChange={e => setF(x => ({ ...x, reason: e.target.value }))} placeholder={t('abs_reason_ph')} style={inputStyle} /></div>
        {f.type === 'unjustified' && <div><label style={labelStyle}>{t('abs_justification')}</label><input value={f.justification} onChange={e => setF(x => ({ ...x, justification: e.target.value }))} placeholder={t('abs_justif_ph')} style={inputStyle} /></div>}
      </div>
    </Drawer>
  );
}
