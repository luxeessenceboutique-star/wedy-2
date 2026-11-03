import { useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Baby, Ban, GitBranch, Heart, Send, Sun, Thermometer, Wallet } from 'lucide-react';
import { api, getLeaveBalance, listHolidays, getApiError } from '@/services/api';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { FIXED_HOLIDAYS } from '@/lib/holidays';
import './portal.css';

type Leave = { id: string; type?: string; start_date: string; end_date: string; days?: number; status: string; reason?: string; created_at?: string };
type Me = { id: string; manager?: string };
const getMe = () => api.get<Me>('/portal/me').then(r => r.data);
const getLeaves = () => api.get<Leave[]>('/portal/me/leaves').then(r => r.data).catch(() => []);
const submitLeave = (body: Record<string, unknown>) => api.post('/portal/me/leaves', body).then(r => r.data);

// [type, label key, icon, tint, text]
const TYPES: [string, TKey, typeof Sun, string, string][] = [
  ['annual', 'leave_type_annual', Sun, '#e4f2f4', '#0b5f72'], ['sick', 'leave_type_sick', Thermometer, '#fbe9e6', '#a33a28'],
  ['personal', 'leave_type_personal', Heart, '#ece9fb', '#5444b8'], ['unpaid', 'leave_type_unpaid', Wallet, '#eef2f4', '#33474f'],
  ['maternity', 'leave_type_maternity', Baby, '#e1f5ec', '#0f6f49'], ['paternity', 'leave_type_paternity', Baby, '#e1f5ec', '#0f6f49'],
];
const typeOf = (k?: string) => TYPES.find(x => x[0] === k) ?? TYPES[0];
const ST: Record<string, [TKey, string, string]> = { pending: ['ptl_st_pending', '#fbefda', '#8a5207'], approved: ['ptl_st_approved', '#e1f5ec', '#0f6f49'], rejected: ['ptl_st_rejected', '#fbe9e6', '#a33a28'], cancelled: ['ptl_st_cancelled', '#eef2f4', '#52646d'] };
const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const fmtDays = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const statLabel: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' };
const statValue: CSSProperties = { fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 };
const dateInput: CSSProperties = { height: 44, padding: '0 10px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: '#0a1c24', outline: 'none' };

export default function MyLeavePage() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [type, setType] = useState('annual');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [motif, setMotif] = useState('');
  const [year] = useState(() => new Date().getFullYear());

  const { data: me } = useQuery({ queryKey: ['portal-me'], queryFn: getMe, retry: false });
  const { data: balance } = useQuery({ queryKey: ['leave-balance', me?.id], queryFn: () => getLeaveBalance(me!.id), enabled: !!me?.id });
  const { data: leaves = [], isLoading } = useQuery({ queryKey: ['portal-leaves'], queryFn: getLeaves });
  const { data: hol } = useQuery({ queryKey: ['holidays'], queryFn: listHolidays, retry: false });

  const holidaySet = new Set([...(hol?.data ?? []).map(h => h.date.slice(0, 10))]);
  const isHoliday = (d: Date) => holidaySet.has(iso(d)) || FIXED_HOLIDAYS.some(h => iso(d).slice(5) === h.md);
  const workingDays = (a: string, b: string) => {
    if (!a || !b || b < a) return 0;
    let n = 0;
    for (let d = new Date(`${a}T00:00:00`); iso(d) <= b; d.setDate(d.getDate() + 1)) { const w = d.getDay(); if (w !== 0 && w !== 6 && !isHoliday(d)) n++; }
    return n;
  };
  const daysOf = (l: Leave) => l.days ?? workingDays(l.start_date.slice(0, 10), l.end_date.slice(0, 10));

  const b = balance as unknown as { annual_total?: number; annual_used?: number } | undefined;
  const avail = b ? Math.max(0, (b.annual_total ?? 0) - (b.annual_used ?? 0)) : null;
  const pending = leaves.filter(l => l.status === 'pending' && (l.type ?? 'annual') === 'annual').reduce((s, l) => s + daysOf(l), 0);
  const taken = leaves.filter(l => l.status === 'approved' && l.start_date.startsWith(String(year))).reduce((s, l) => s + daysOf(l), 0);
  const days = workingDays(start, end);
  const after = avail === null ? null : avail - pending - (type === 'annual' ? days : 0);
  const over = type === 'annual' && avail !== null && days > 0 && after !== null && after < 0;

  const mut = useMutation({
    mutationFn: () => submitLeave({ type, start_date: start, end_date: end, reason: motif.trim() || undefined, days }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-leaves'] }); qc.invalidateQueries({ queryKey: ['portal-stats'] }); notify.success(tf(t('pleave_sent'), { n: days })); setStart(''); setEnd(''); setMotif(''); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!start || !end) { notify.error(t('pleave_pick_dates')); return; }
    if (end < start) { notify.error(t('pleave_bad_range')); return; }
    if (!days) { notify.error(t('pleave_no_workday')); return; }
    mut.mutate();
  };
  const sorted = [...leaves].sort((a, c) => c.start_date.localeCompare(a.start_date));
  const range = (l: Leave) => `${new Date(l.start_date).toLocaleDateString(loc, { day: 'numeric', month: 'short' })} → ${new Date(l.end_date).toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 24px 56px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(28px,3vw,38px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('pleave_title')}</RV>
        <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('pleave_subtitle')}</RV>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <RV as="div" variant="up" delay={60} style={{ padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(135deg,#0b5f72,#0e7f96)', color: '#ffffff' }}><div style={{ ...statLabel, opacity: 0.9 }}>{t('pleave_k_avail')}</div><div style={statValue}>{avail === null ? '—' : `${fmtDays(avail)} j`}</div></RV>
        <RV as="div" variant="up" delay={110} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}><div style={{ ...statLabel, color: '#5f7079' }}>{t('pleave_k_pending')}</div><div style={statValue}>{fmtDays(pending)} j</div></RV>
        <RV as="div" variant="up" delay={160} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}><div style={{ ...statLabel, color: '#5f7079' }}>{t('pleave_k_after')}</div><div style={{ ...statValue, color: after !== null && after < 0 ? '#a33a28' : '#0b5f72' }}>{after === null ? '—' : `${fmtDays(after)} j`}</div></RV>
        <RV as="div" variant="up" delay={210} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}><div style={{ ...statLabel, color: '#5f7079' }}>{tf(t('pleave_k_taken'), { year })}</div><div style={statValue}>{fmtDays(taken)} j</div></RV>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <RV as="form" variant="up" delay={100} onSubmit={submit} style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: 22, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18 }}>{t('pleave_new')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
            {TYPES.map(([k, label, Icon]) => {
              const on = type === k;
              return <button key={k} type="button" onClick={() => setType(k)} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 12px', borderRadius: 12, border: `1px solid ${on ? '#16b6c8' : '#d6dfe3'}`, background: on ? '#e4f2f4' : '#ffffff', color: on ? '#0b5f72' : '#33474f', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'start' }}><Icon size={15} />{t(label)}</button>;
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>{t('pleave_from')}<input type="date" value={start} onChange={e => { setStart(e.target.value); if (!end || end < e.target.value) setEnd(e.target.value); }} style={dateInput} className="ptl-f1" /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>{t('pleave_to')}<input type="date" value={end} min={start || undefined} onChange={e => setEnd(e.target.value)} style={dateInput} className="ptl-f1" /></label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: over ? '#fbe9e6' : '#f3fafb' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 28, fontWeight: 800, color: over ? '#a33a28' : '#0e6f84' }}>{days}</span>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: '#33474f' }}>{!start || !end ? t('pleave_calc_empty') : over ? tf(t('pleave_calc_over'), { n: fmtDays(-(after ?? 0)) }) : type === 'annual' && after !== null ? tf(t('pleave_calc_left'), { n: fmtDays(after) }) : t('pleave_calc_plain')}</span>
          </div>
          <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={2} placeholder={t('pleave_motif_ph')} style={{ resize: 'vertical', padding: '10px 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 14, color: '#0a1c24', outline: 'none' }} className="ptl-f1" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#52646d', flexWrap: 'wrap' }}>
            <GitBranch size={14} />{t('pleave_validation')} {me?.manager && <><strong style={{ color: '#0a1c24' }}>{me.manager}</strong><ArrowRight size={12} className="wy-flip" /></>}<strong style={{ color: '#0a1c24' }}>{t('pleave_hr')}</strong>
          </div>
          <button type="submit" disabled={mut.isPending} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, border: 'none', borderRadius: 13, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 14px 30px -14px rgba(22,182,200,.85)' }}>
            {mut.isPending ? <Spinner size={16} color="#fff" /> : <Send size={16} />}{t('pleave_send')}
          </button>
        </RV>

        <RV as="div" variant="up" delay={140} style={{ flex: '1.2 1 420px', minWidth: 0, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pleave_history')}</div>
          {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>}
          {!isLoading && !sorted.length && <div style={{ padding: '20px', borderTop: '1px solid #eef2f4', fontSize: 13.5, color: '#52646d', textAlign: 'center' }}>{t('pleave_none')}</div>}
          {sorted.map(l => {
            const ty = typeOf(l.type), st = ST[l.status] ?? ST.pending, Icon = ty[2] ?? Ban;
            return (
              <RV key={l.id} as="div" variant="up" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid #eef2f4', flexWrap: 'wrap' }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ty[3], color: ty[4], flexShrink: 0 }}><Icon size={17} /></span>
                <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{t(ty[1])}</div><div style={{ fontSize: 12.5, color: '#5f7079' }}>{range(l)}</div></div>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12.5, color: '#33474f' }}>{fmtDays(daysOf(l))} j</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: st[1], color: st[2] }}>{t(st[0])}</span>
              </RV>
            );
          })}
        </RV>
      </div>
    </div>
  );
}
