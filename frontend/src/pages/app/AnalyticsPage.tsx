import { useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, FileClock, Hourglass, LogOut, Minus, Repeat, Sparkles, Timer, TrendingDown, TrendingUp, TriangleAlert, Users, UserX } from 'lucide-react';
import { getDashboardKpis, listEmployees } from '@/services/api';
import { RV } from '@/components/motion';
import { useLang, type TKey } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { tf } from '@/lib/format';
import './AnalyticsPage.css';

type Icon = ComponentType<{ size?: number; style?: CSSProperties }>;
const W = 700, PL = 34, PR = 14, PT = 16, PB = 28, H = 220;
const smooth = (pts: number[][]) => pts.map((p, i) => {
  if (!i) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p3 = pts[i + 1] || p;
  return `C${(p1[0] + (p[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p[1] - p0[1]) / 6).toFixed(1)} ${(p[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p[0].toFixed(1)},${p[1].toFixed(1)}`;
}).join(' ');
const spark = (arr: number[]) => { if (arr.length < 2) return ''; const mn = Math.min(...arr), mx = Math.max(...arr), r = mx - mn || 1; return smooth(arr.map((v, i) => [i * (100 / (arr.length - 1)), 28 - (v - mn) / r * 26])); };
const dec = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const C = 2 * Math.PI * 40;
const DEPT_COLORS: Record<string, string> = { 'opérations': '#df9326', operations: '#df9326', commercial: '#16a06b', tech: '#6d5ad6', 'service client': '#0e6f84', marketing: '#df5740', finance: '#4a69d8', rh: '#16b6c8' };
const PALETTE = ['#0e6f84', '#6d5ad6', '#16a06b', '#df9326', '#df5740', '#4a69d8', '#16b6c8'];
const DONUT = ['#0e6f84', '#6d5ad6', '#df9326', '#16a06b', '#4a69d8', '#df5740'];
const years = (from: string | undefined, to: number) => (from ? (to - new Date(from).getTime()) / (365.25 * 864e5) : NaN);

export default function AnalyticsPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const [n, setN] = useState<3 | 6 | 12>(6);
  const [hover, setHover] = useState(-1);
  const [now] = useState(() => Date.now());

  const { data: year } = useQuery({ queryKey: ['dashboard-kpis', 365], queryFn: () => getDashboardKpis(365) });
  const { data: period } = useQuery({ queryKey: ['dashboard-kpis', n * 30], queryFn: () => getDashboardKpis(n * 30) });
  const { data: act } = useQuery({ queryKey: ['employees', 'analytics-active'], queryFn: () => listEmployees({ status: 'active', limit: 1000 }) });
  const { data: gone } = useQuery({ queryKey: ['employees', 'analytics-terminated'], queryFn: () => listEmployees({ status: 'terminated', limit: 1000 }) });
  const active = useMemo(() => act?.data ?? [], [act]);
  const leavers = useMemo(() => gone?.data ?? [], [gone]);
  const company = typeof user?.profile?.company === 'string' && user.profile.company ? user.profile.company : '';

  const evo = year?.evolution ?? [];
  const HC = evo.map(e => e.headcount), HIRES = evo.map(e => e.hires), DEPS = evo.map(e => e.departures);
  const months = evo.map(e => { const d = new Date(`${e.month}-01T00:00:00`); const s = d.toLocaleDateString('fr-FR', { month: 'short' }); return s.charAt(0).toUpperCase() + s.slice(1); });
  const L = Math.max(evo.length, 1), from = Math.max(0, L - n);
  const sl = (a: number[]) => a.slice(from);
  const ymin = HC.length ? Math.floor(Math.min(...HC) * 0.95 / 5) * 5 : 0, ymax = HC.length ? Math.ceil(Math.max(...HC) * 1.03 / 5) * 5 || 10 : 10;
  const X = (i: number) => PL + i * (W - PL - PR) / Math.max(L - 1, 1);
  const Y = (v: number) => PT + (ymax - v) / (ymax - ymin || 1) * (H - PT - PB);
  const line = HC.length ? smooth(HC.map((v, i) => [X(i), Y(v)])) : '';
  const base = HC[from - 1] ?? HC[0] ?? 0, last = HC[L - 1] ?? 0;
  const growth = base ? (last - base) / base * 100 : 0;
  const deps = sl(DEPS).reduce((a, b) => a + b, 0), hires = sl(HIRES).reduce((a, b) => a + b, 0);
  const avgHc = sl(HC).length ? sl(HC).reduce((a, b) => a + b, 0) / sl(HC).length : 0;
  const turnover = avgHc ? deps / avgHc * (12 / n) * 100 : 0;
  const rate = period?.attendance_rate?.rate;
  const absent = rate === null || rate === undefined ? null : Math.max(0, 100 - rate);
  const tenure = active.map(e => years(e.hire_date, now)).filter(Number.isFinite);
  const avgTenure = tenure.length ? tenure.reduce((a, b) => a + b, 0) / tenure.length : null;
  const hiresFromPipeline = active.filter(e => e.custom_fields?.recruitment_stage === 'hired' && e.hire_date && e.created_at);
  const tth = hiresFromPipeline.length ? hiresFromPipeline.reduce((s, e) => s + Math.max(0, (new Date(e.hire_date!).getTime() - new Date(e.created_at!).getTime()) / 864e5), 0) / hiresFromPipeline.length : null;
  const ticks = [0, 1, 2, 3].map(i => ymax - (ymax - ymin) * i / 3);

  // ── insights computed from the data ──
  const insights = (() => {
    const out: { icon: Icon; bg: string; color: string; title: string; text: string }[] = [];
    const sinceIso = new Date(now - n * 30 * 864e5).toISOString().slice(0, 10);
    const recentLeavers = leavers.filter(e => (e.contract_end || '').slice(0, 10) >= sinceIso);
    if (recentLeavers.length) {
      const byDept = new Map<string, number>();
      recentLeavers.forEach(e => byDept.set(e.department || '—', (byDept.get(e.department || '—') ?? 0) + 1));
      const [dept, cnt] = [...byDept.entries()].sort((a, b) => b[1] - a[1])[0];
      out.push({ icon: Repeat, bg: 'rgba(239,107,84,.16)', color: '#ef8b78', title: tf(t('an_in_deps_title'), { dept }), text: tf(t('an_in_deps_text'), { n: cnt, total: recentLeavers.length, months: n }) });
    }
    const soon = active.filter(e => { const d = e.contract_end ? (new Date(e.contract_end).getTime() - now) / 864e5 : NaN; return d >= 0 && d <= 30; });
    if (soon.length) out.push({ icon: FileClock, bg: 'rgba(230,169,72,.16)', color: '#f0bd6a', title: tf(t('an_in_cdd_title'), { n: soon.length }), text: soon.slice(0, 3).map(e => e.full_name).join(', ') + (soon.length > 3 ? '…' : '') + '. ' + t('an_in_cdd_text') });
    if (base && last !== base) out.push({ icon: last > base ? TrendingUp : TrendingDown, bg: last > base ? 'rgba(43,189,134,.16)' : 'rgba(239,107,84,.16)', color: last > base ? '#4fd3a0' : '#ef8b78', title: tf(t(last > base ? 'an_in_up_title' : 'an_in_down_title'), { n: Math.abs(last - base) }), text: tf(t('an_in_flow_text'), { hires, deps, months: n }) });
    if (absent !== null && absent >= 4) out.push({ icon: UserX, bg: 'rgba(230,169,72,.16)', color: '#f0bd6a', title: tf(t('an_in_abs_title'), { pct: dec(absent) }), text: t('an_in_abs_text') });
    if (!out.length) out.push({ icon: Sparkles, bg: 'rgba(39,192,212,.16)', color: '#5fe3f0', title: t('an_in_calm_title'), text: t('an_in_calm_text') });
    return out.slice(0, 3);
  })();

  const depts = (year?.by_department ?? []).slice(0, 7);
  const dmax = Math.max(...depts.map(d => d.value), 1);
  const contracts = (year?.by_contract ?? []).filter(c => c.value > 0).slice(0, 6);
  const ctot = contracts.reduce((s, c) => s + c.value, 0);
  const top = contracts[0];
  const lens = contracts.map(c => (ctot ? c.value / ctot * C : 0));
  const donut = lens.map((len, i) => ({ dash: `${Math.max(len - 1.2, 0).toFixed(2)} ${C.toFixed(2)}`, off: (-lens.slice(0, i).reduce((a, b) => a + b, 0)).toFixed(2) }));
  const ages = (() => {
    const b = [['< 25', 0, 25], ['25–34', 25, 35], ['35–44', 35, 45], ['45–54', 45, 55], ['55 +', 55, 200]] as [string, number, number][];
    const ys = active.map(e => years(e.birth_date, now)).filter(Number.isFinite);
    if (!ys.length) return null;
    const counts = b.map(([, lo, hi]) => ys.filter(y => y >= lo && y < hi).length);
    const mx = Math.max(...counts, 1);
    return b.map(([label], i) => ({ label, n: counts[i], h: counts[i] / mx * 100, top: counts[i] === mx }));
  })();
  const flowMax = Math.max(...HIRES, ...DEPS, 1);
  const step = (W - PL - PR) / Math.max(L - 1, 1);
  const kpis: { label: TKey; icon: Icon; color: string; value: string; delta: string; dColor: string; dIcon: Icon; spark: string }[] = [
    { label: 'an_k_headcount', icon: Users, color: '#0e6f84', value: String(last || active.length), delta: tf(t('an_k_growth'), { pct: `${growth >= 0 ? '+' : ''}${dec(growth)}`, n }), dColor: growth >= 0 ? '#0f6f49' : '#a33a28', dIcon: growth >= 0 ? TrendingUp : TrendingDown, spark: spark(sl(HC)) },
    { label: 'an_k_turnover', icon: Repeat, color: '#df5740', value: `${dec(turnover)} %`, delta: tf(t(deps > 1 ? 'an_k_deps' : 'an_k_dep'), { n: deps }), dColor: '#52646d', dIcon: LogOut, spark: spark(sl(DEPS)) },
    { label: 'an_k_absent', icon: UserX, color: '#df9326', value: absent === null ? '—' : `${dec(absent)} %`, delta: absent === null ? t('an_k_no_data') : tf(t('an_k_absent_days'), { n: period?.attendance_rate?.absent_days ?? 0 }), dColor: absent !== null && absent >= 4 ? '#8a5207' : '#52646d', dIcon: absent !== null && absent >= 4 ? TriangleAlert : Minus, spark: '' },
    { label: 'an_k_tth', icon: Timer, color: '#6d5ad6', value: tth === null ? '—' : `${Math.round(tth)} j`, delta: tth === null ? t('an_k_no_data') : tf(t('an_k_tth_sub'), { n: hiresFromPipeline.length }), dColor: '#52646d', dIcon: Minus, spark: '' },
    { label: 'an_k_tenure', icon: Hourglass, color: '#16a06b', value: avgTenure === null ? '—' : `${dec(avgTenure)} ${t('an_years')}`, delta: tf(t('an_k_tenure_sub'), { n: tenure.length }), dColor: '#52646d', dIcon: Minus, spark: '' },
  ];

  const exportReport = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const row = (l: string, v: string) => `<tr><td>${l}</td><td>${v}</td></tr>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t('an_title')}</title><style>@page{size:A4;margin:2cm}body{font-family:system-ui,sans-serif;color:#0a1c24}h1{margin:0}p{color:#52646d}table{border-collapse:collapse;width:100%;margin-top:14px}td{border-bottom:1px solid #e2e8eb;padding:8px 4px;font-size:13px}td:last-child{text-align:right;font-weight:600}h2{font-size:15px;margin-top:24px}</style></head><body><h1>${t('an_title')}${company ? ` — ${company}` : ''}</h1><p>${tf(t('an_report_period'), { n })} · ${new Date().toLocaleDateString('fr-FR')}</p><table>${kpis.map(k => row(t(k.label), `${k.value} <small>(${k.delta})</small>`)).join('')}</table><h2>${t('an_flows')}</h2><table>${evo.map((e, i) => row(months[i] + ' ' + e.month.slice(0, 4), `+${e.hires} / −${e.departures} · ${e.headcount}`)).join('')}</table><h2>${t('an_by_dept')}</h2><table>${depts.map(d => row(d.name, String(d.value))).join('')}</table><h2>${t('an_composition')}</h2><table>${contracts.map(c => row(c.name, String(c.value))).join('')}</table></body></html>`);
    w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  const hv = hover >= 0 && HC[hover] !== undefined ? { x: X(hover), y: Y(HC[hover]) } : null;
  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('an_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{company ? tf(t('an_subtitle_co'), { company }) : t('an_subtitle')}</RV>
        </div>
        <RV as="div" variant="up" delay={100} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', padding: 4, borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            {([3, 6, 12] as const).map(k => (
              <button key={k} type="button" onClick={() => setN(k)} style={{ position: 'relative', height: 34, padding: '0 13px', border: 'none', borderRadius: 9, background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: n === k ? '#ffffff' : '#52646d' }}>
                {n === k && <RV as="span" variant="pill" style={{ position: 'absolute', inset: 0, borderRadius: 9, background: '#0a1c24' }} />}<span style={{ position: 'relative' }}>{tf(t('an_months'), { n: k })}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={exportReport} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} className="an-h1"><Download size={15} />{t('an_export')}</button>
        </RV>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
        {kpis.map((k, i) => {
          const Ic = k.icon, DI = k.dIcon;
          return (
            <RV key={k.label} as="div" variant="up" delay={i * 60} style={{ position: 'relative', overflow: 'hidden', padding: '16px 18px 14px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}><Ic size={14} style={{ color: k.color }} />{t(k.label)}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-.04em', marginTop: 6 }}>{k.value}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: k.dColor }}><DI size={13} />{k.delta}</span>
                {k.spark && <svg viewBox="0 0 100 30" style={{ width: 84, height: 26, overflow: 'visible', flexShrink: 0 }}><RV as="path" variant="draw" d={k.spark} style={{ fill: 'none', stroke: k.color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }} /></svg>}
              </div>
            </RV>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        <RV as="div" variant="up" delay={120} style={{ flex: '2 1 560px', minWidth: 0, padding: '20px 22px', borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div><div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 17 }}>{t('an_hc_title')}</div><div style={{ fontSize: 13, color: '#52646d', marginTop: 2 }}>{t('an_hc_sub')}</div></div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: last >= base ? '#e1f5ec' : '#fbe9e6', color: last >= base ? '#0f6f49' : '#a33a28' }}>{last >= base ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{tf(t('an_hc_delta'), { d: `${last - base >= 0 ? '+' : '−'}${Math.abs(last - base)}`, n })}</span>
          </div>
          <div onMouseLeave={() => setHover(-1)} style={{ position: 'relative', width: '100%', aspectRatio: '700 / 220', marginTop: 16 }}>
            <svg viewBox="0 0 700 220" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              <defs><linearGradient id="hcFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: '#16b6c8', stopOpacity: 0.3 }} /><stop offset="1" style={{ stopColor: '#16b6c8', stopOpacity: 0 }} /></linearGradient></defs>
              {HC.length > 0 && <rect x={X(from) - 24} y="10" width={X(L - 1) - X(from) + 38} height="186" rx="12" style={{ fill: '#e4f2f4', opacity: 0.6, transition: 'x .6s cubic-bezier(.2,.8,.2,1),width .6s cubic-bezier(.2,.8,.2,1)' }} />}
              {ticks.map((v, i) => (
                <g key={i}>
                  <line x1="34" x2="686" y1={16 + i * 58.67} y2={16 + i * 58.67} style={{ stroke: i === 3 ? '#dfe6e9' : '#eef2f4', strokeWidth: 1 }} />
                  <text x="26" y={20 + i * 58.67} textAnchor="end" style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, fill: '#8a9ba3' }}>{Math.round(v)}</text>
                </g>
              ))}
              {line && <RV as="path" variant="fade" delay={400} d={`${line} L${X(L - 1).toFixed(1)},192 L${X(0).toFixed(1)},192 Z`} style={{ fill: 'url(#hcFill)' }} />}
              {line && <RV as="path" variant="draw" duration={1600} d={line} style={{ fill: 'none', stroke: '#0e6f84', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' }} />}
              <line x1={hv?.x ?? 0} x2={hv?.x ?? 0} y1="16" y2="192" style={{ stroke: '#0a1c24', strokeWidth: 1, strokeDasharray: '3 4', opacity: hv ? 1 : 0, transition: 'opacity .15s' }} />
              <circle cx={hv?.x ?? 0} cy={hv?.y ?? 0} r="5.5" style={{ fill: '#ffffff', stroke: '#0e6f84', strokeWidth: 3, opacity: hv ? 1 : 0, transition: 'opacity .15s' }} />
              {HC.length > 0 && <circle cx={X(L - 1)} cy={Y(last)} r="5" style={{ fill: '#0e6f84', stroke: '#ffffff', strokeWidth: 2 }} />}
            </svg>
            {HC.map((_, i) => <span key={i} onMouseEnter={() => setHover(i)} style={{ position: 'absolute', top: 0, bottom: 0, left: `${((X(i) - step / 2) / W * 100).toFixed(2)}%`, width: `${(step / W * 100).toFixed(2)}%`, cursor: 'crosshair' }} />)}
            {hv && (
              <div style={{ position: 'absolute', left: `${(hv.x / W * 100).toFixed(2)}%`, top: `${(hv.y / H * 100).toFixed(2)}%`, transform: 'translate(-50%,calc(-100% - 14px))', pointerEvents: 'none', padding: '8px 11px', borderRadius: 10, background: '#0a1c24', color: '#ffffff', fontSize: 12, whiteSpace: 'nowrap', boxShadow: '0 12px 24px -10px rgba(10,28,36,.6)' }}>
                <div style={{ fontWeight: 700 }}>{tf(t('an_tip_people'), { month: months[hover], n: HC[hover] })}</div>
                <div style={{ color: '#9fb4bb', marginTop: 2 }}>{tf(t('an_tip_flow'), { h: HIRES[hover], d: DEPS[hover] })}</div>
              </div>
            )}
          </div>
          <div style={{ position: 'relative', height: 16, marginTop: 6 }}>
            {months.map((m, i) => <span key={i} style={{ position: 'absolute', left: `${(X(i) / W * 100).toFixed(2)}%`, transform: 'translateX(-50%)', fontFamily: "'Geist Mono',monospace", fontSize: 10.5, color: i >= from ? '#0b5f72' : '#8a9ba3', fontWeight: i >= from ? 600 : 400 }}>{m}</span>)}
          </div>
        </RV>

        <RV as="div" variant="up" delay={160} style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 20, background: 'linear-gradient(160deg,#06141a,#0d2a33)', color: '#e8eff1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><img src="/wedy-avatar.png" alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', background: '#0f262e', border: '2px solid rgba(95,227,240,.5)' }} /><div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('an_insights')}</div></div>
          {insights.map((x, i) => {
            const Ic = x.icon;
            return (
              <RV key={x.title} as="div" variant="up" delay={200 + i * 100} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: 12, borderRadius: 14, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: x.bg, color: x.color, flexShrink: 0 }}><Ic size={15} /></span>
                <div><div style={{ fontSize: 13.5, fontWeight: 600, color: '#ffffff' }}>{x.title}</div><div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#b9cbd0', marginTop: 2 }}>{x.text}</div></div>
              </RV>
            );
          })}
          <Link to="/app/copilot" style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 40, borderRadius: 11, background: '#effbfc', color: '#06141a', fontSize: 13.5, fontWeight: 600 }} className="an-h2"><Sparkles size={15} />{t('an_deeper')}</Link>
        </RV>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 16 }}>
        <RV as="div" variant="up" style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('an_flows')}</span>
            <span style={{ display: 'flex', gap: 10, fontSize: 11.5, color: '#33474f' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#16b6c8' }} />{t('an_hires')}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef6b54' }} />{t('an_deps')}</span></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${L},minmax(0,1fr))`, gap: 4, height: 150, marginTop: 16 }}>
            {evo.map((e, i) => (
              <div key={e.month} title={`${months[i]} : +${e.hires} / −${e.departures}`} style={{ display: 'grid', gridTemplateRows: '1fr 1fr', opacity: i >= from ? 1 : 0.3, transition: 'opacity .4s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', borderBottom: '1px solid #dfe6e9' }}><RV as="span" variant="growy" delay={i * 40} style={{ display: 'block', width: '70%', maxWidth: 16, height: `${e.hires / flowMax * 92}%`, borderRadius: '5px 5px 2px 2px', background: '#16b6c8', transformOrigin: 'bottom' }} /></div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}><RV as="span" variant="growy" delay={i * 40} style={{ display: 'block', width: '70%', maxWidth: 16, height: `${e.departures / flowMax * 92}%`, borderRadius: '2px 2px 5px 5px', background: '#ef6b54', transformOrigin: 'top' }} /></div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid #eef2f4', fontSize: 13 }}>
            <span style={{ color: '#52646d' }}>{t('an_on_period')}</span>
            <span><strong style={{ color: '#0b5f72' }}>+{hires}</strong> · <strong style={{ color: '#b8402c' }}>−{deps}</strong> · {t('an_net')} <strong>{hires - deps >= 0 ? '+' : '−'}{Math.abs(hires - deps)}</strong></span>
          </div>
        </RV>

        <RV as="div" variant="up" delay={60} style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('an_by_dept')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {!depts.length && <div style={{ fontSize: 13, color: '#52646d' }}>{t('an_k_no_data')}</div>}
            {depts.map((d, i) => (
              <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '104px minmax(0,1fr) 30px', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                <span style={{ height: 10, borderRadius: 99, background: '#eef2f4', overflow: 'hidden' }}><RV as="span" variant="growx" delay={i * 60} style={{ display: 'block', height: '100%', width: `${d.value / dmax * 100}%`, borderRadius: 99, background: DEPT_COLORS[d.name.toLowerCase()] ?? PALETTE[i % PALETTE.length], transformOrigin: 'left' }} /></span>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600, textAlign: 'end' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </RV>

        <RV as="div" variant="up" delay={120} style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('an_composition')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 118, height: 118, flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ display: 'block', width: 118, height: 118, transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" style={{ fill: 'none', stroke: '#eef2f4', strokeWidth: 13 }} />
                {donut.map((d, i) => <RV key={i} as="circle" variant="fade" delay={i * 100 + (i ? 50 : 0)} cx="50" cy="50" r="40" style={{ fill: 'none', stroke: DONUT[i], strokeWidth: 13, strokeDasharray: d.dash, strokeDashoffset: d.off }} />)}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 22, fontWeight: 800 }}>{top && ctot ? `${Math.round(top.value / ctot * 100)} %` : '—'}</span>
                <span style={{ fontSize: 10.5, color: '#5f7079' }}>{top ? tf(t('an_in_contract'), { c: top.name }) : ''}</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 130, display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13 }}>
              {contracts.map((c, i) => <span key={c.name} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: DONUT[i] }} />{c.name}</span><strong>{c.value}</strong></span>)}
            </div>
          </div>
          {ages && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #eef2f4' }}>
              <div style={{ fontSize: 12.5, color: '#52646d' }}>{t('an_ages')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 6, alignItems: 'end', height: 70, marginTop: 10 }}>
                {ages.map((a, i) => (
                  <div key={a.label} title={`${a.label} : ${a.n}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%' }}>
                    <RV as="span" variant="growy" delay={i * 70} style={{ display: 'block', width: '100%', height: `${Math.max(a.h, 3)}%`, borderRadius: '6px 6px 3px 3px', background: a.top ? 'linear-gradient(180deg,#16b6c8,#0e6f84)' : '#cfe7ec', transformOrigin: 'bottom' }} />
                    <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, color: '#5f7079' }}>{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </RV>
      </div>
    </div>
  );
}
