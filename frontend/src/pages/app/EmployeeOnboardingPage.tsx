import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Calendar, Check, FileCheck, Handshake, ListChecks, PenLine, Search, Send, User, UserPlus } from 'lucide-react';
import { api, listEmployees, getApiError } from '@/services/api';
import type { Employee } from '@/services/api';
import { RV } from '@/components/motion';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import './EmployeeOnboardingPage.css';

type Task = { id: string; label: string; done: boolean };
type Onboarding = { employee_id: string; phase?: string; buddy_name?: string | null; contract_signed?: boolean; contract_signed_at?: string | null; plan_30?: Task[]; plan_60?: Task[]; plan_90?: Task[] };
type Pulse = { id: string; week_number?: number; satisfaction_score?: number; integration_score?: number; clarity_score?: number; comment?: string; created_at: string };

const listOnboardings = () => api.get<Onboarding[]>('/employee-onboarding').then(r => r.data);
const getOnboarding = (id: string) => api.get<Onboarding>(`/employee-onboarding/${id}`).then(r => r.data);
const patchOnboarding = (id: string, body: Partial<Onboarding>) => api.patch<Onboarding>(`/employee-onboarding/${id}`, body).then(r => r.data);
const signContract = (id: string) => api.post<Onboarding>(`/employee-onboarding/${id}/sign-contract`).then(r => r.data);
const getPulses = (id: string) => api.get<Pulse[]>(`/employee-onboarding/${id}/pulse`).then(r => r.data);
const createPulse = (id: string, body: Partial<Pulse>) => api.post<Pulse>(`/employee-onboarding/${id}/pulse`, body).then(r => r.data);

// [plan key, label, name key, text color, bar color, tint]
const PH: { key: 'plan_30' | 'plan_60' | 'plan_90'; label: string; name: TKey; color: string; bar: string; bg: string }[] = [
  { key: 'plan_30', label: 'J1–30', name: 'onb_ph1', color: '#8a5207', bar: '#df9326', bg: '#fbefda' },
  { key: 'plan_60', label: 'J31–60', name: 'onb_ph2', color: '#0b5f72', bar: '#16b6c8', bg: '#e4f2f4' },
  { key: 'plan_90', label: 'J61–90', name: 'onb_ph3', color: '#5444b8', bar: '#6d5ad6', bg: '#ece9fb' },
];
const DAY = 86400000;
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayOf = (hire?: string) => (hire ? Math.round((today0() - new Date(`${hire.slice(0, 10)}T00:00:00`).getTime()) / DAY) : null);
const phaseOf = (d: number) => (d < 0 ? -1 : d <= 30 ? 0 : d <= 60 ? 1 : 2);
const pctOf = (o?: Onboarding) => {
  if (!o) return 0;
  const all = [...(o.plan_30 ?? []), ...(o.plan_60 ?? []), ...(o.plan_90 ?? [])];
  return all.length ? Math.round(all.filter(t => t.done).length / all.length * 100) : 0;
};
const scoreOf = (p: Pulse) => p.satisfaction_score ?? p.integration_score ?? p.clarity_score ?? null;
const R = 2 * Math.PI * 21;
const statLabel: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' };
const statValue: CSSProperties = { fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 };

export default function EmployeeOnboardingPage() {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [curId, setCurId] = useState<string | null>(null);
  const [tab, setTab] = useState<'plan' | 'pulse'>('plan');
  const [score, setScore] = useState(4);
  const [comment, setComment] = useState('');
  const [startOpen, setStartOpen] = useState(false);

  const { data: empData, isLoading } = useQuery({ queryKey: ['employees', 'onboarding'], queryFn: () => listEmployees({ status: 'active', limit: 1000 }) });
  const { data: records = [] } = useQuery({ queryKey: ['onboarding'], queryFn: listOnboardings });
  const employees = useMemo(() => empData?.data ?? [], [empData]);
  const recBy = useMemo(() => new Map(records.map(r => [r.employee_id, r])), [records]);

  // new arrivals: arriving soon or hired less than 120 days ago, plus anyone with a started onboarding (< 1 year)
  const hires = useMemo(() => employees
    .map(e => ({ e, day: dayOf(e.hire_date) }))
    .filter(({ e, day }) => day !== null && (day <= 120 || (recBy.has(e.id) && day <= 365)))
    // in progress first (most advanced first), then the upcoming arrivals
    .sort((a, b) => Number((a.day ?? 0) < 0) - Number((b.day ?? 0) < 0) || ((a.day ?? 0) < 0 ? (b.day ?? 0) - (a.day ?? 0) : (b.day ?? 0) - (a.day ?? 0))), [employees, recBy]);

  const pulseQs = useQueries({ queries: hires.slice(0, 40).map(h => ({ queryKey: ['onboarding-pulse', h.e.id], queryFn: () => getPulses(h.e.id) })) });
  const pulsesBy = new Map(hires.slice(0, 40).map((h, i) => [h.e.id, pulseQs[i]?.data ?? []]));

  const cur = hires.find(h => h.e.id === curId) ?? hires.find(h => (h.day ?? 0) >= 0) ?? hires[0];
  const { data: onb } = useQuery({ queryKey: ['onboarding', cur?.e.id], queryFn: () => getOnboarding(cur!.e.id), enabled: !!cur });
  const [buddy, setBuddy] = useState('');
  const buddyKey = `${cur?.e.id}|${onb?.buddy_name ?? ''}`;
  const [lastBuddyKey, setLastBuddyKey] = useState('');
  if (buddyKey !== lastBuddyKey) { setLastBuddyKey(buddyKey); setBuddy(onb?.buddy_name ?? ''); }

  const refresh = () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); };
  const fail = (e: unknown) => notify.error(getApiError(e, t('error')));
  const patch = useMutation({
    mutationFn: (body: Partial<Onboarding>) => patchOnboarding(cur!.e.id, body),
    onMutate: async body => {
      const key = ['onboarding', cur!.e.id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Onboarding>(key);
      qc.setQueryData<Onboarding>(key, o => ({ ...(o ?? { employee_id: cur!.e.id }), ...body }));
      return { prev, key };
    },
    onError: (e, _b, ctx) => { if (ctx) qc.setQueryData(ctx.key, ctx.prev); fail(e); },
    onSettled: refresh,
  });
  const sign = useMutation({ mutationFn: () => signContract(cur!.e.id), onSuccess: () => { refresh(); notify.success(tf(t('onb_signed_toast'), { name: cur!.e.full_name })); }, onError: fail });
  const pulse = useMutation({
    mutationFn: () => createPulse(cur!.e.id, { week_number: Math.max(1, Math.ceil((cur!.day ?? 0) / 7)), satisfaction_score: score, comment: comment.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding-pulse', cur!.e.id] }); setComment(''); notify.success(tf(t('onb_pulse_saved'), { day: cur!.day ?? 0, name: cur!.e.full_name })); },
    onError: fail,
  });

  const needle = q.trim().toLowerCase();
  const list = hires.filter(({ e }) => !needle || `${e.full_name} ${e.position ?? ''} ${e.department ?? ''}`.toLowerCase().includes(needle));
  const active = hires.filter(h => (h.day ?? 0) >= 0);
  const allScores = hires.flatMap(h => (pulsesBy.get(h.e.id) ?? []).map(scoreOf).filter((s): s is number => s !== null));
  const kAvg = active.length ? Math.round(active.reduce((n, h) => n + pctOf(h.e.id === cur?.e.id ? onb : recBy.get(h.e.id)), 0) / active.length) : 0;
  const kSat = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1).replace('.', ',') : '—';

  const day = cur?.day ?? 0;
  const ph = phaseOf(day);
  const pct = pctOf(onb);
  const ml = Math.max(0, Math.min(90, day)) / 90 * 100;
  const curPulses = cur ? [...(pulsesBy.get(cur.e.id) ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)) : [];
  const pulseDay = (p: Pulse) => (cur?.e.hire_date ? Math.max(0, Math.round((new Date(p.created_at).getTime() - new Date(`${cur.e.hire_date.slice(0, 10)}T00:00:00`).getTime()) / DAY)) : 0);

  // Wedy's reading of the file: rules on the real data
  const insight = (() => {
    if (!cur) return '';
    const parts: string[] = [];
    const sc = curPulses.map(scoreOf).filter((s): s is number => s !== null);
    if (day < 0) parts.push(tf(t('onb_ai_pre'), { n: -day }));
    if (sc.length) {
      const avg = sc.reduce((a, b) => a + b, 0) / sc.length;
      parts.push(tf(t(avg >= 4 ? 'onb_ai_good' : avg >= 3 ? 'onb_ai_mixed' : 'onb_ai_bad'), { avg: avg.toFixed(1).replace('.', ',') }));
    } else if (day >= 7) parts.push(t('onb_ai_no_pulse'));
    if (!onb?.buddy_name) parts.push(t('onb_ai_no_buddy'));
    if (!onb?.contract_signed && day >= 0) parts.push(tf(t('onb_ai_unsigned'), { n: day }));
    const late = PH.slice(0, Math.max(0, ph)).flatMap(p => (onb?.[p.key] ?? []).filter(x => !x.done));
    if (late.length) parts.push(tf(t('onb_ai_late'), { n: late.length }));
    return parts.join(' ') || t('onb_ai_ok');
  })();

  const saveBuddy = () => { if (cur && (onb?.buddy_name ?? '') !== buddy.trim()) patch.mutate({ buddy_name: buddy.trim() || null }, { onSuccess: () => notify.success(t('onb_buddy_saved')) }); };
  const toggleTask = (key: 'plan_30' | 'plan_60' | 'plan_90', id: string) => {
    const list2 = (onb?.[key] ?? []).map(x => (x.id === id ? { ...x, done: !x.done } : x));
    const body: Partial<Onboarding> = { [key]: list2 };
    patch.mutate(body);
  };
  const sendPulse = (e: FormEvent) => {
    e.preventDefault();
    if (day < 0) { notify.info(t('onb_pulse_after')); return; }
    pulse.mutate();
  };

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('onb_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('onb_subtitle')}</RV>
        </div>
        <RV as="button" variant="up" delay={100} type="button" onClick={() => setStartOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
          <UserPlus size={16} />{t('onb_start')}
        </RV>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <RV as="div" variant="up" delay={60} style={{ padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(135deg,#0b5f72,#0e7f96)', color: '#ffffff' }}>
          <div style={{ ...statLabel, color: undefined, opacity: 0.9 }}>{t('onb_k_active')}</div><div style={statValue}>{active.filter(h => (h.day ?? 0) <= 90).length}</div>
        </RV>
        <RV as="div" variant="up" delay={110} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}><div style={statLabel}>{t('onb_k_pre')}</div><div style={statValue}>{hires.length - active.length}</div></RV>
        <RV as="div" variant="up" delay={160} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}><div style={statLabel}>{t('onb_k_avg')}</div><div style={statValue}>{kAvg}%</div></RV>
        <RV as="div" variant="up" delay={210} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}><div style={statLabel}>{t('onb_k_sat')}</div><div style={statValue}>{kSat}<span style={{ fontSize: 16, color: '#5f7079', fontWeight: 600 }}> / 5</span></div></RV>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <RV as="div" variant="up" delay={120} style={{ flex: '1 1 300px', minWidth: 0, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', marginTop: -7.5, color: '#7d8f97', pointerEvents: 'none' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('onb_search')} style={{ width: '100%', height: 40, paddingInline: '36px 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' }} className="onb-f1" />
            </div>
          </div>
          {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>}
          {!isLoading && list.length === 0 && <div style={{ padding: '20px 16px 24px', fontSize: 13.5, color: '#52646d', textAlign: 'center', borderTop: '1px solid #eef2f4' }}>{t('onb_none')}</div>}
          {list.map(({ e, day: d }, i) => {
            const dd = d ?? 0, p = phaseOf(dd), on = e.id === cur?.e.id;
            const pc = pctOf(on ? onb : recBy.get(e.id));
            return (
              <RV key={e.id} as="button" variant="up" delay={Math.min(i, 10) * 50} type="button" onClick={() => { setCurId(e.id); setComment(''); setScore(4); }}
                style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', border: 'none', borderTop: '1px solid #eef2f4', background: on ? '#f3fafb' : '#ffffff', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer' }} className="onb-h1">
                {on && <span style={{ position: 'absolute', insetInlineStart: 0, top: 10, bottom: 10, width: 3, borderRadius: '0 3px 3px 0', background: '#16b6c8' }} />}
                <span style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
                  <svg viewBox="0 0 46 46" style={{ position: 'absolute', inset: 0, width: 46, height: 46, transform: 'rotate(-90deg)' }}>
                    <circle cx="23" cy="23" r="21" style={{ fill: 'none', stroke: '#eef2f4', strokeWidth: 3 }} />
                    <circle cx="23" cy="23" r="21" style={{ fill: 'none', stroke: p < 0 ? '#9a8bf0' : PH[p].bar, strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: `${(R * pc / 100).toFixed(1)}px ${R.toFixed(1)}px`, transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.2,1)' }} />
                  </svg>
                  <span style={{ position: 'absolute', inset: 5, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(e.full_name), color: '#ffffff', fontSize: 12, fontWeight: 700 }}>{initialsOf(e.full_name)}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0a1c24' }}>{e.full_name}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: '#5f7079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[e.position, e.department].filter(Boolean).join(' · ') || '—'}</span>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: p < 0 ? '#ece9fb' : PH[p].bg, color: p < 0 ? '#5444b8' : PH[p].color, whiteSpace: 'nowrap' }}>{dd < 0 ? `J${dd}` : `J+${dd}`}</span>
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, color: '#52646d' }}>{pc}%</span>
                </span>
              </RV>
            );
          })}
        </RV>

        {cur && (
          <div style={{ flex: '2.2 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <RV key={cur.e.id} as="section" variant="left" delay={140} style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, background: '#06141a', color: '#e8eff1', padding: '22px 24px', isolation: 'isolate' }}>
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
                <div className="wedy-drift" style={{ position: 'absolute', left: '-10%', top: '-90%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)' }} />
                <div className="wedy-drift" style={{ position: 'absolute', right: '-8%', top: '-70%', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.35),transparent)', ['--dur' as string]: '26s', ['--delay' as string]: '-8s' } as CSSProperties} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
                <span style={{ position: 'relative', width: 66, height: 66, flexShrink: 0 }}>
                  <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.6)' }} />
                  <span style={{ position: 'relative', width: 66, height: 66, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(cur.e.full_name), fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 22, fontWeight: 700, color: '#ffffff', border: '2px solid rgba(255,255,255,.2)' }}>{initialsOf(cur.e.full_name)}</span>
                </span>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 24, letterSpacing: '-.035em' }}>{cur.e.full_name}</div>
                  <div style={{ marginTop: 3, fontSize: 14, color: '#9fb4bb' }}>{[cur.e.position, cur.e.department].filter(Boolean).join(' · ') || '—'}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,.07)', color: '#cfdde1' }}><Calendar size={13} />{tf(t('onb_arrival'), { date: (cur.e.hire_date ?? '').slice(0, 10).split('-').reverse().join('/') })}</span>
                    {cur.e.contract_type && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'rgba(154,139,240,.18)', color: '#c9c0f8' }}>{cur.e.contract_type}</span>}
                    {cur.e.manager && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,.07)', color: '#cfdde1' }}><User size={13} />{tf(t('onb_manager'), { name: cur.e.manager })}</span>}
                  </div>
                </div>
                <div style={{ minWidth: 190, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 42, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 1 }}>{pct}%</span><span style={{ fontSize: 13, color: '#9fb4bb' }}>{t('onb_of_path')}</span></div>
                  {onb?.contract_signed ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#4fd3a0' }}><FileCheck size={16} />{t('onb_signed')}</span>
                  ) : (
                    <button type="button" disabled={sign.isPending || !onb} onClick={() => { if (window.confirm(tf(t('onb_confirm_sign'), { name: cur.e.full_name }))) sign.mutate(); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 38, padding: '0 14px', border: 'none', borderRadius: 11, background: '#effbfc', color: '#06141a', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {sign.isPending ? <Spinner size={15} /> : <PenLine size={15} />}{t('onb_mark_signed')}
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.08)', flexWrap: 'wrap' }}>
                <Handshake size={16} style={{ color: '#5fe3f0' }} />
                <span style={{ fontSize: 13, color: '#b9cbd0' }}>{t('onb_buddy')}</span>
                <input value={buddy} onChange={e => setBuddy(e.target.value)} onBlur={saveBuddy} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} list="onb-people" placeholder={t('onb_buddy_ph')}
                  style={{ flex: 1, minWidth: 170, maxWidth: 280, height: 36, padding: '0 12px', borderRadius: 10, border: `1px solid ${buddy ? 'rgba(255,255,255,.14)' : 'rgba(230,169,72,.8)'}`, background: 'rgba(255,255,255,.06)', color: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, outline: 'none' }} />
                <datalist id="onb-people">{employees.filter(e => e.id !== cur.e.id).map(e => <option key={e.id} value={e.full_name} />)}</datalist>
                <span style={{ marginInlineStart: 'auto', fontSize: 12.5, color: '#9fb4bb' }}>{day < 0 ? tf(t('onb_arrives_in'), { n: -day }) : tf(t('onb_since'), { n: day })}</span>
              </div>
            </RV>

            <RV as="div" variant="up" delay={180} style={{ padding: '18px 22px', borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('onb_path')}</span>
                <span style={{ fontSize: 12.5, color: '#52646d' }}>{ph < 0 ? t('onb_k_pre') : day > 90 ? t('onb_done_path') : tf(t('onb_phase'), { label: PH[ph].label, name: t(PH[ph].name) })}</span>
              </div>
              <div style={{ position: 'relative', marginTop: 40, height: 10 }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 4 }}>
                  <span style={{ flex: 1, borderRadius: '99px 0 0 99px', background: '#f5e3c3' }} /><span style={{ flex: 1, background: '#cdeaef' }} /><span style={{ flex: 1, borderRadius: '0 99px 99px 0', background: '#dcd6f6' }} />
                </div>
                <div style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: `${ml.toFixed(2)}%`, borderRadius: 99, background: 'linear-gradient(90deg,#df9326,#16b6c8 50%,#6d5ad6)', backgroundSize: `${ml > 0 ? (10000 / ml).toFixed(1) : 100}% 100%`, transition: 'width .8s cubic-bezier(.2,.8,.2,1)' }} />
                {day >= 0 ? (
                  <>
                    <span style={{ position: 'absolute', top: '50%', insetInlineStart: `${ml.toFixed(2)}%`, width: 22, height: 22, margin: '-11px -11px 0', transition: 'inset-inline-start .8s cubic-bezier(.2,.8,.2,1)' }}>
                      <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(22,182,200,.45)' }} />
                      <span style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: '#ffffff', border: '3px solid #0e6f84' }} />
                    </span>
                    <span style={{ position: 'absolute', bottom: 20, insetInlineStart: `${ml.toFixed(2)}%`, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: '#0a1c24', color: '#ffffff' }}>{tf(t('onb_today'), { day: `J+${day}` })}</span>
                  </>
                ) : (
                  <span style={{ position: 'absolute', bottom: 20, insetInlineStart: 0, whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: '#ece9fb', color: '#5444b8' }}>{tf(t('onb_pre_label'), { n: -day })}</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: "'Geist Mono',monospace", fontSize: 11, color: '#7d8f97' }}><span>J1</span><span>J30</span><span>J60</span><span>J90</span></div>
            </RV>

            <RV as="div" variant="up" delay={200} style={{ display: 'flex', gap: 4, padding: 5, borderRadius: 14, background: '#ffffff', border: '1px solid #e2e8eb', alignSelf: 'flex-start' }}>
              {([['plan', t('onb_tab_plan'), ListChecks], ['pulse', tf(t('onb_tab_pulse'), { n: curPulses.length }), Activity]] as const).map(([k, label, Icon]) => {
                const on = tab === k;
                return (
                  <button key={k} type="button" onClick={() => setTab(k)} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 15px', border: 'none', borderRadius: 10, background: 'transparent', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: on ? '#ffffff' : '#52646d' }}>
                    {on && <RV as="span" variant="pill" style={{ position: 'absolute', inset: 0, borderRadius: 10, background: '#0a1c24' }} />}
                    <Icon size={15} style={{ position: 'relative' }} /><span style={{ position: 'relative' }}>{label}</span>
                  </button>
                );
              })}
            </RV>

            {tab === 'plan' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, alignItems: 'start' }}>
                {!onb && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>}
                {onb && PH.map((p, pi) => {
                  const tasks = onb[p.key] ?? [];
                  const n = tasks.filter(x => x.done).length;
                  return (
                    <RV key={p.key} as="div" variant="up" delay={pi * 80} style={{ borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden', boxShadow: pi === ph ? `0 0 0 2px ${p.bar}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: p.bg }}>
                        <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: '#ffffff', color: p.color }}>{p.label}</span>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#0a1c24' }}>{t(p.name)}</span>
                        {pi === ph && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: p.color }}><span className="wedy-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: p.bar }} />{t('onb_current')}</span>}
                        <span style={{ marginInlineStart: 'auto', fontFamily: "'Geist Mono',monospace", fontSize: 12, fontWeight: 600, color: p.color }}>{n}/{tasks.length}</span>
                      </div>
                      <div style={{ height: 4, background: '#eef2f4' }}><div style={{ height: '100%', width: `${tasks.length ? Math.round(n / tasks.length * 100) : 0}%`, background: p.bar, transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} /></div>
                      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {tasks.map(task => (
                          <button key={task.id} type="button" onClick={() => toggleTask(p.key, task.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '9px 8px', border: 'none', borderRadius: 10, background: 'transparent', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer' }} className="onb-h2">
                            <span style={{ width: 19, height: 19, borderRadius: 6, border: '1.5px solid #c3ced3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ffffff', background: '#ffffff', marginTop: 1 }}>
                              {task.done && <span style={{ width: 19, height: 19, borderRadius: 6, background: p.bar, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} strokeWidth={3} /></span>}
                            </span>
                            <span style={{ fontSize: 13.5, lineHeight: 1.4, color: task.done ? '#7d8f97' : '#1d3540', textDecoration: task.done ? 'line-through' : 'none' }}>{task.label}</span>
                          </button>
                        ))}
                      </div>
                    </RV>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ flex: '1.3 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <RV as="div" variant="up" style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,rgba(22,182,200,.08),rgba(109,90,214,.08))', border: '1px solid rgba(109,90,214,.18)' }}>
                    <img src="/wedy-avatar.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#e4f2f4' }} />
                    <div><div style={{ fontSize: 12, fontWeight: 700, color: '#5444b8' }}>{t('onb_ai_title')}</div><div style={{ marginTop: 4, fontSize: 13.5, lineHeight: 1.55, color: '#1d3540' }}>{insight}</div></div>
                  </RV>
                  {curPulses.map((p, i) => {
                    const sc = scoreOf(p) ?? 0;
                    return (
                      <RV key={p.id} as="div" variant="up" delay={i * 60} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8eb' }}>
                        <span style={{ width: 48, height: 48, borderRadius: 14, background: sc >= 4 ? '#e1f5ec' : sc === 3 ? '#fbefda' : '#fbe9e6', color: sc >= 4 ? '#0f6f49' : sc === 3 ? '#8a5207' : '#a33a28', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 800, fontSize: 19, lineHeight: 1, flexShrink: 0 }}>{sc}<span style={{ fontSize: 9.5, fontWeight: 600, marginTop: 2 }}>/ 5</span></span>
                        <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{tf(t('onb_pulse_day'), { day: pulseDay(p) })}</div><div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#33474f', marginTop: 3 }}>{p.comment ? `« ${p.comment} »` : t('onb_no_comment')}</div></div>
                      </RV>
                    );
                  })}
                  {!curPulses.length && <div style={{ padding: '28px 16px', borderRadius: 16, border: '1px dashed #d0dadf', textAlign: 'center', fontSize: 13.5, color: '#52646d' }}>{t('onb_no_pulse')}</div>}
                </div>
                <RV as="form" variant="up" delay={100} onSubmit={sendPulse} style={{ flex: '1 1 280px', minWidth: 0, padding: 18, borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('onb_new_pulse')}</div>
                  <div style={{ fontSize: 13.5, color: '#33474f' }}>{tf(t('onb_how'), { name: cur.e.full_name.split(' ')[0] })}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setScore(n)} style={{ height: 44, borderRadius: 11, border: `1px solid ${score === n ? '#0a1c24' : '#d6dfe3'}`, background: score === n ? '#0a1c24' : '#ffffff', color: score === n ? '#ffffff' : '#33474f', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 17, fontWeight: 700, cursor: 'pointer', transition: 'background .15s,border-color .15s' }}>{n}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#7d8f97' }}><span>{t('onb_hard')}</span><span>{t('onb_great')}</span></div>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder={t('onb_comment_ph')} style={{ resize: 'vertical', padding: '10px 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 14, color: '#0a1c24', outline: 'none' }} className="onb-f1" />
                  <button type="submit" disabled={pulse.isPending} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    {pulse.isPending ? <Spinner size={15} color="#fff" /> : <Send size={15} />}{t('onb_save_pulse')}
                  </button>
                </RV>
              </div>
            )}
          </div>
        )}
      </div>

      <StartDrawer open={startOpen} onClose={() => setStartOpen(false)} employees={employees} existing={new Set(hires.map(h => h.e.id))}
        onStarted={id => { setCurId(id); setTab('plan'); refresh(); }} />
    </div>
  );
}

function StartDrawer({ open, onClose, employees, existing, onStarted }: { open: boolean; onClose: () => void; employees: Employee[]; existing: Set<string>; onStarted: (id: string) => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const [id, setId] = useState('');
  const [buddy, setBuddy] = useState('');
  const mut = useMutation({
    mutationFn: async () => { await getOnboarding(id); if (buddy.trim()) await patchOnboarding(id, { buddy_name: buddy.trim() }); },
    onSuccess: () => { const e = employees.find(x => x.id === id); notify.success(tf(t('onb_started'), { name: e?.full_name ?? '' })); onStarted(id); setId(''); setBuddy(''); onClose(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const candidates = [...employees].sort((a, b) => Number(existing.has(a.id)) - Number(existing.has(b.id)) || (b.hire_date ?? '').localeCompare(a.hire_date ?? ''));
  const field: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
  return (
    <Drawer open={open} onClose={onClose} title={t('onb_start')} subtitle={t('onb_start_sub')} icon={<UserPlus size={17} />} width={460}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!id || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('onb_start_btn')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 }}>{t('pay_col_emp')}</label>
          <select value={id} onChange={e => setId(e.target.value)} style={field}>
            <option value="">{t('pay_pick_emp')}</option>
            {candidates.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.hire_date ? ` · ${e.hire_date.slice(0, 10).split('-').reverse().join('/')}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 }}>{t('onb_buddy')}</label>
          <input value={buddy} onChange={e => setBuddy(e.target.value)} list="onb-start-people" placeholder={t('onb_buddy_ph')} style={field} />
          <datalist id="onb-start-people">{employees.filter(e => e.id !== id).map(e => <option key={e.id} value={e.full_name} />)}</datalist>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 12, background: '#f3f6f7', fontSize: 12.5, color: '#52646d', lineHeight: 1.55 }}>{t('onb_start_hint')}</div>
      </div>
    </Drawer>
  );
}
