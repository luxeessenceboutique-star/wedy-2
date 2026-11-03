import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, CalendarPlus, FileCheck, FilePlus, GraduationCap, Info, Target } from 'lucide-react';
import { api, getLeaveBalance, listHolidays } from '@/services/api';
import { RV } from '@/components/motion';
import { useLang, type TKey } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { tf } from '@/lib/format';
import { displayName } from '@/lib/visual';
import { nextHolidays } from '@/lib/holidays';
import './portal.css';

type Me = { id: string; full_name: string; contract_type?: string; contract_end?: string; manager?: string; hire_date?: string };
type Leave = { id: string; type?: string; start_date: string; end_date: string; status: string; created_at?: string };
type DocReq = { id: string; doc_type?: string; status: string; created_at?: string };
type Training = { id: string; status: string; training_catalog?: { title?: string; duration_hours?: number; provider?: string } };
type Okr = { id: string; title: string; progress: number; status: string };

const getMe = () => api.get<Me>('/portal/me').then(r => r.data);
const getLeaves = () => api.get<Leave[]>('/portal/me/leaves').then(r => r.data).catch(() => []);
const getDocReqs = () => api.get<DocReq[]>('/portal/me/document-requests').then(r => r.data).catch(() => []);
const getTraining = () => api.get<Training[]>('/portal/me/training').then(r => r.data).catch(() => []);
const getOkrs = () => api.get<Okr[]>('/portal/me/okrs').then(r => r.data).catch(() => []);
const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const R = 2 * Math.PI * 40;
const ST: Record<string, [TKey, string, string]> = {
  pending: ['ptl_st_pending', '#fbefda', '#8a5207'], approved: ['ptl_st_approved', '#e1f5ec', '#0f6f49'], done: ['ptl_st_ready', '#e1f5ec', '#0f6f49'],
  completed: ['ptl_st_ready', '#e1f5ec', '#0f6f49'], rejected: ['ptl_st_rejected', '#fbe9e6', '#a33a28'], cancelled: ['ptl_st_cancelled', '#eef2f4', '#52646d'],
};
const card: CSSProperties = { padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' };
const kicker: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' };
const display: CSSProperties = { fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700 };

export default function EmployeeDashboard() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const { data: me } = useQuery({ queryKey: ['portal-me'], queryFn: getMe, retry: false });
  const { data: balance } = useQuery({ queryKey: ['leave-balance', me?.id], queryFn: () => getLeaveBalance(me!.id), enabled: !!me?.id });
  const { data: leaves = [] } = useQuery({ queryKey: ['portal-leaves'], queryFn: getLeaves });
  const { data: docs = [] } = useQuery({ queryKey: ['portal-doc-requests'], queryFn: getDocReqs });
  const { data: training = [] } = useQuery({ queryKey: ['portal-training'], queryFn: getTraining });
  const { data: okrs = [] } = useQuery({ queryKey: ['portal-okrs'], queryFn: getOkrs });
  const { data: hol } = useQuery({ queryKey: ['holidays'], queryFn: listHolidays, retry: false });

  const first = (me?.full_name || displayName(user)).split(' ')[0];
  const today = new Date();
  const dateLine = today.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const b = balance as unknown as { annual_total?: number; annual_used?: number } | undefined;
  const avail = b ? Math.max(0, (b.annual_total ?? 0) - (b.annual_used ?? 0)) : null;
  const frac = b && b.annual_total ? Math.min(1, (avail ?? 0) / b.annual_total) : 0;
  const pendingDays = leaves.filter(l => l.status === 'pending').length;

  const requests = [
    ...docs.map(d => ({ id: 'd' + d.id, kind: 'doc' as const, title: d.doc_type || t('ptl_document'), status: d.status, at: d.created_at ?? '' })),
    ...leaves.map(l => ({ id: 'l' + l.id, kind: 'leave' as const, title: tf(t('ptl_leave_range'), { from: new Date(l.start_date).toLocaleDateString(loc, { day: 'numeric', month: 'short' }), to: new Date(l.end_date).toLocaleDateString(loc, { day: 'numeric', month: 'short' }) }), status: l.status, at: l.created_at ?? l.start_date })),
  ].sort((a, b2) => b2.at.localeCompare(a.at)).slice(0, 3);

  const current = training.find(x => x.status === 'in_progress') ?? training.find(x => x.status === 'planned');
  const holidays = (hol?.data ?? []).map(h => ({ date: new Date(`${h.date.slice(0, 10)}T00:00:00`), name: h.name })).filter(h => h.date >= new Date(today.getFullYear(), today.getMonth(), today.getDate())).sort((a, b2) => a.date.getTime() - b2.date.getTime());
  const next = holidays[0] ?? nextHolidays(today, 1).map(h => ({ date: h.date, name: t(h.key) }))[0];
  const inDays = next ? Math.round((next.date.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 864e5) : 0;
  const contractEnd = me?.contract_end ? new Date(`${me.contract_end.slice(0, 10)}T00:00:00`) : null;
  const endSoon = contractEnd && (contractEnd.getTime() - today.getTime()) / 864e5 <= 45 && contractEnd >= today;
  const liveOkrs = okrs.filter(o => o.status !== 'cancelled');

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 24px 56px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <RV as="section" variant="up" style={{ position: 'relative', overflow: 'hidden', borderRadius: 26, background: '#06141a', color: '#e8eff1', padding: '30px 28px', isolation: 'isolate' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div className="wedy-drift" style={{ position: 'absolute', left: '-8%', top: '-80%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.65),transparent)' }} />
          <div className="wedy-drift" style={{ position: 'absolute', right: '-6%', top: '-60%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.38),transparent)', ['--dur' as string]: '27s', ['--delay' as string]: '-9s' } as CSSProperties} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11.5, letterSpacing: '.12em', color: '#5fe3f0' }}>{dateLine}</div>
            <h1 style={{ margin: '10px 0 0', ...display, fontSize: 'clamp(32px,4vw,48px)', letterSpacing: '-.045em', lineHeight: 1, color: '#f1f8f9' }}>{tf(t('ptl_hello'), { name: first })}</h1>
            <p style={{ margin: '10px 0 0', fontSize: 15.5, color: '#b9cbd0' }}>{t('ptl_hello_sub')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/employee/conges" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 46, padding: '0 16px', borderRadius: 13, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: 14, fontWeight: 600, boxShadow: '0 14px 30px -12px rgba(22,182,200,.8)' }} className="ptl-hw"><CalendarPlus size={16} />{t('ptl_ask_leave')}</Link>
            <Link to="/employee/documents" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 46, padding: '0 16px', borderRadius: 13, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', color: '#ffffff', fontSize: 14, fontWeight: 600 }} className="ptl-hg"><FilePlus size={16} />{t('ptl_ask_doc')}</Link>
          </div>
        </div>
      </RV>

      {endSoon && contractEnd && (
        <RV as="div" variant="up" delay={80} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 16, background: '#fbefda', border: '1px solid rgba(230,169,72,.4)' }}>
          <Info size={18} style={{ color: '#b06b0c', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#5c3a05' }}><strong>{tf(t('ptl_contract_end'), { type: me?.contract_type || t('ptl_contract'), date: contractEnd.toLocaleDateString('fr-FR') })}</strong> {t('ptl_contract_end_sub')}</div>
        </RV>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14 }}>
        <RV as={Link} variant="up" delay={100} to="/employee/conges" style={{ display: 'flex', alignItems: 'center', gap: 18, ...card, color: '#0a1c24', transition: 'border-color .2s,transform .2s' }} className="ptl-card">
          <span style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
            <svg viewBox="0 0 96 96" style={{ display: 'block', width: 96, height: 96, transform: 'rotate(-90deg)' }}>
              <circle cx="48" cy="48" r="40" style={{ fill: 'none', stroke: '#eef2f4', strokeWidth: 10 }} />
              <RV as="circle" variant="draw" frac={frac} delay={300} cx="48" cy="48" r="40" style={{ fill: 'none', stroke: '#16b6c8', strokeWidth: 10, strokeLinecap: 'round', strokeDasharray: `${(R * frac).toFixed(1)}px ${R.toFixed(1)}px` }} />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ ...display, fontSize: 22, fontWeight: 800 }}>{avail === null ? '—' : String(avail).replace('.', ',')}</span><span style={{ fontSize: 10.5, color: '#5f7079' }}>{t('ptl_days')}</span></span>
          </span>
          <span>
            <span style={kicker}>{t('ptl_balance')}</span>
            <span style={{ display: 'block', ...display, fontSize: 18, marginTop: 4 }}>{t('ptl_available_now')}</span>
            <span style={{ display: 'block', fontSize: 13, color: '#52646d', marginTop: 4 }}>{pendingDays ? tf(t('ptl_pending_n'), { n: pendingDays }) : b ? tf(t('ptl_used_n'), { n: b.annual_used ?? 0, total: b.annual_total ?? 0 }) : ''}</span>
          </span>
        </RV>

        <RV as="div" variant="up" delay={150} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ ...display, fontSize: 16 }}>{t('ptl_my_requests')}</span><Link to="/employee/documents" style={{ fontSize: 12.5, fontWeight: 600 }}>{t('ptl_see_all')}</Link></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {!requests.length && <div style={{ padding: '14px 10px', borderRadius: 12, background: '#f8fafb', fontSize: 13, color: '#52646d', textAlign: 'center' }}>{t('ptl_no_requests')}</div>}
            {requests.map(r => {
              const st = ST[r.status] ?? ST.pending;
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, background: '#f8fafb' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: r.kind === 'doc' ? '#e1f5ec' : '#fbefda', color: r.kind === 'doc' ? '#0f6f49' : '#b06b0c' }}>{r.kind === 'doc' ? <FileCheck size={15} /> : <Calendar size={15} />}</span>
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span><span style={{ display: 'block', fontSize: 12, color: '#5f7079' }}>{r.at ? new Date(r.at).toLocaleDateString(loc, { day: 'numeric', month: 'short' }) : ''}{r.kind === 'leave' && me?.manager ? ` · ${tf(t('ptl_with'), { name: me.manager })}` : ''}</span></span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: st[1], color: st[2], whiteSpace: 'nowrap' }}>{t(st[0])}</span>
                </div>
              );
            })}
          </div>
        </RV>

        <RV as={Link} variant="up" delay={200} to="/employee/formation" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 20, background: 'linear-gradient(140deg,#5444b8,#6d5ad6 55%,#0e7f96)', color: '#ffffff' }} className="ptl-violet">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', opacity: 0.9 }}><GraduationCap size={15} />{t(current?.status === 'in_progress' ? 'ptl_training_now' : 'ptl_training_next')}</span>
          <span style={{ ...display, fontSize: 19, lineHeight: 1.25 }}>{current?.training_catalog?.title || t('ptl_no_training')}</span>
          {current && <span style={{ fontSize: 13, opacity: 0.85 }}>{[current.training_catalog?.provider, current.training_catalog?.duration_hours ? `${current.training_catalog.duration_hours} h` : ''].filter(Boolean).join(' · ')}</span>}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginTop: 'auto' }}>{t('ptl_see_trainings')}<ArrowRight size={14} className="wy-flip" /></span>
        </RV>

        {next && (
          <RV as="div" variant="up" delay={120} style={{ display: 'flex', alignItems: 'center', gap: 14, ...card }}>
            <span style={{ width: 56, textAlign: 'center', padding: '9px 0', borderRadius: 14, background: '#fbefda', color: '#8a5207', fontFamily: "'Geist Mono',monospace", fontSize: 13, fontWeight: 700, lineHeight: 1.25, flexShrink: 0 }}>{String(next.date.getDate()).padStart(2, '0')}<br />{next.date.toLocaleDateString(loc, { month: 'short' }).replace('.', '').toUpperCase()}</span>
            <span>
              <span style={kicker}>{t('ptl_next_holiday')}</span>
              <span style={{ display: 'block', ...display, fontSize: 17, marginTop: 3 }}>{next.name}</span>
              <span style={{ display: 'block', fontSize: 13, color: '#52646d', marginTop: 2 }}>{tf(t(inDays === 0 ? 'ptl_today_is' : 'ptl_in_days'), { day: (() => { const s = next.date.toLocaleDateString(loc, { weekday: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); })(), n: inDays })}</span>
            </span>
          </RV>
        )}

        <RV as="div" variant="up" delay={170} style={{ ...card, gridColumn: 'span 2' }} className="ptl-wide">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Target size={17} style={{ color: '#0e6f84' }} /><span style={{ ...display, fontSize: 16 }}>{t('ptl_okrs')}</span></div>
          {!liveOkrs.length && <div style={{ marginTop: 12, fontSize: 13.5, color: '#52646d' }}>{t('ptl_no_okrs')}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 10, marginTop: 12 }}>
            {liveOkrs.slice(0, 4).map(o => (
              <div key={o.id} style={{ padding: '12px 14px', borderRadius: 14, background: '#f8fafb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5, fontWeight: 600 }}><span>{o.title}</span><span style={{ fontFamily: "'Geist Mono',monospace", color: '#0b5f72' }}>{o.progress}%</span></div>
                <div style={{ height: 6, borderRadius: 99, background: '#e2e8eb', overflow: 'hidden', marginTop: 8 }}><RV as="div" variant="growx" style={{ height: '100%', width: `${o.progress}%`, borderRadius: 99, background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', transformOrigin: 'left' }} /></div>
              </div>
            ))}
          </div>
        </RV>
      </div>
    </div>
  );
}
