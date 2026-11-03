import { useMemo, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, Banknote, BadgeCheck, Building2, Check, ChevronLeft, ChevronRight, CircleCheck, Clock, Download, FileClock,
  FileSpreadsheet, Landmark, Plus, Trash2, TrendingDown, TrendingUp, UserX, Wallet, WandSparkles,
} from 'lucide-react';
import {
  api, listPayroll, createPayroll, updatePayroll, deletePayroll, generateBulkPayroll, listEmployees, getApiError,
} from '@/services/api';
import type { Employee, PayrollRecord } from '@/services/api';
import { RV, CountText } from '@/components/motion';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import './PayrollPage.css';

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, '\u00a0');
const gross = (r: PayrollRecord) => (r.base_salary || 0) + (r.bonuses || 0);
// Employer contributions (Morocco): CNSS social benefits 8.98 % capped at 6 000 MAD, family allowances 6.40 %,
// vocational training tax 1.60 %, AMO 4.11 % (+ 1.85 % solidarity) — an estimate, the payroll software has the exact figure.
const employerCharges = (g: number) => Math.min(g, 6000) * 0.0898 + g * (0.064 + 0.016 + 0.0411 + 0.0185);
const STEPS: TKey[] = ['pay_step_vars', 'pay_step_ai', 'pay_step_validate', 'pay_step_transfers', 'pay_step_close'];
const verifiedTag = (kind: string) => `[ok:${kind}]`;

type Alert = { id: string; kind: 'missing' | 'bonus' | 'variation' | 'cdd'; emp: string; empId: string; rec?: PayrollRecord; text: string; icon: typeof Clock; bg: string; color: string; title: TKey; done: boolean };

const monthShift = (m: number, y: number, d: number) => { const x = new Date(y, m - 1 + d, 1); return { m: x.getMonth() + 1, y: x.getFullYear() }; };

async function downloadPdf(r: PayrollRecord) {
  const res = await api.get(`/payroll/${r.id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url; a.download = `bulletin_${(r.employees?.full_name || r.employee_id).replace(/\s+/g, '_')}_${r.year}_${String(r.month).padStart(2, '0')}.pdf`;
  a.click(); URL.revokeObjectURL(url);
}

function exportCSV(records: PayrollRecord[], m: number, y: number) {
  const head = ['Employé', 'Département', 'Poste', 'Brut', 'Primes', 'CNSS', 'IR', 'Retenues', 'Net', 'Statut'];
  const rows = records.map(r => [r.employees?.full_name || '', r.employees?.department || '', r.employees?.position || '', r.base_salary, r.bonuses || 0, r.cnss, r.ir, r.deductions || 0, r.net_salary, r.status]);
  const csv = [head, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `paie_${y}_${String(m).padStart(2, '0')}.csv`; a.click(); URL.revokeObjectURL(url);
}

export default function PayrollPage() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const now = new Date();
  const [{ m, y }, setPeriod] = useState({ m: now.getMonth() + 1, y: now.getFullYear() });
  const [showAll, setShowAll] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [prefill, setPrefill] = useState<Employee | null>(null);

  const monthName = (mm: number, yy: number, opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }) => {
    const s = new Date(yy, mm - 1, 1).toLocaleDateString(loc, opts);
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const { data, isLoading } = useQuery({ queryKey: ['payroll', `${m}-${y}`], queryFn: () => listPayroll({ month: m, year: y, limit: 1000 }) });
  const records = useMemo(() => data?.data ?? [], [data]);
  const prev = monthShift(m, y, -1);
  const { data: prevData } = useQuery({ queryKey: ['payroll', `${prev.m}-${prev.y}`], queryFn: () => listPayroll({ month: prev.m, year: prev.y, limit: 1000 }) });
  const { data: hist = [] } = useQuery({
    queryKey: ['payroll', 'history', `${m}-${y}`],
    queryFn: () => Promise.all([5, 4, 3, 2, 1, 0].map(async back => {
      const p = monthShift(m, y, -back);
      const r = await listPayroll({ month: p.m, year: p.y, limit: 1000 });
      return { ...p, total: r.data.reduce((s, x) => s + gross(x), 0) };
    })),
  });
  const { data: empData } = useQuery({ queryKey: ['employees', 'payroll'], queryFn: () => listEmployees({ status: 'active', limit: 1000 }) });
  const employees = useMemo(() => empData?.data ?? [], [empData]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['payroll'] });
  const fail = (e: unknown) => notify.error(getApiError(e, t('error')));
  const bulk = useMutation({
    mutationFn: () => generateBulkPayroll(m, y),
    onSuccess: r => { refresh(); notify.success(tf(t('pay_generated'), { n: r.created }), r.skipped ? { description: tf(t('pay_generated_skipped'), { n: r.skipped }) } : undefined); },
    onError: fail,
  });
  const setStatus = useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => { await Promise.all(records.filter(r => r.status === from).map(r => updatePayroll(r.id, { status: to }))); },
    onSuccess: (_, v) => { refresh(); notify.success(t(v.to === 'paid' ? 'pay_closed_toast' : 'pay_validated_toast')); },
    onError: fail,
  });
  const verify = useMutation({
    mutationFn: (a: Alert) => updatePayroll(a.rec!.id, { notes: `${a.rec!.notes ?? ''} ${verifiedTag(a.kind)}`.trim() }),
    onSuccess: (_, a) => { refresh(); notify.success(tf(t('pay_checked'), { name: a.emp })); },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (r: PayrollRecord) => deletePayroll(r.id),
    onSuccess: () => { refresh(); notify.success(t('pay_deleted')); },
    onError: fail,
  });

  // ── automatic checks on the month's payslips ──
  const alerts: Alert[] = useMemo(() => {
    const out: Alert[] = [];
    const prevBy = new Map((prevData?.data ?? []).map(r => [r.employee_id, r]));
    const byEmp = new Map(records.map(r => [r.employee_id, r]));
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    if (records.length) {
      employees.filter(e => !byEmp.has(e.id) && (!e.hire_date || e.hire_date <= monthEnd)).forEach(e => out.push({
        id: `missing-${e.id}`, kind: 'missing', emp: e.full_name, empId: e.id, text: t('pay_alert_missing_txt'), icon: UserX, bg: '#fbe9e6', color: '#df5740', title: 'pay_alert_missing', done: false,
      }));
    }
    records.forEach(r => {
      const name = r.employees?.full_name || '—';
      const tag = (k: string) => (r.notes ?? '').includes(verifiedTag(k));
      const emp = employees.find(e => e.id === r.employee_id);
      if ((r.bonuses || 0) > 0 && !(r.notes ?? '').replace(/\[ok:[a-z]+\]/g, '').trim()) out.push({
        id: `bonus-${r.id}`, kind: 'bonus', emp: name, empId: r.employee_id, rec: r, icon: Banknote, bg: '#fbe9e6', color: '#df5740', title: 'pay_alert_bonus',
        text: tf(t('pay_alert_bonus_txt'), { amount: fmt(r.bonuses) }), done: tag('bonus'),
      });
      const p = prevBy.get(r.employee_id);
      if (p && gross(p) > 0 && Math.abs(gross(r) - gross(p)) / gross(p) > 0.2) out.push({
        id: `var-${r.id}`, kind: 'variation', emp: name, empId: r.employee_id, rec: r, icon: gross(r) > gross(p) ? TrendingUp : TrendingDown, bg: '#fbefda', color: '#b06b0c', title: 'pay_alert_variation',
        text: tf(t('pay_alert_variation_txt'), { now: fmt(gross(r)), before: fmt(gross(p)) }), done: tag('variation'),
      });
      if (emp?.contract_end && emp.contract_end >= monthStart && emp.contract_end <= monthEnd) out.push({
        id: `cdd-${r.id}`, kind: 'cdd', emp: name, empId: r.employee_id, rec: r, icon: FileClock, bg: '#ece9fb', color: '#6d5ad6', title: 'pay_alert_cdd',
        text: tf(t('pay_alert_cdd_txt'), { date: emp.contract_end.slice(0, 10).split('-').reverse().join('/') }), done: tag('cdd'),
      });
    });
    return out;
  }, [records, prevData, employees, m, y, t]);

  const openRecAlerts = alerts.filter(a => !a.done && a.kind !== 'missing');
  const open = alerts.filter(a => !a.done).length;
  const drafts = records.filter(r => r.status === 'draft').length;
  const validated = records.filter(r => r.status === 'validated').length;
  const paid = records.filter(r => r.status === 'paid').length;
  const step = !records.length ? 0 : openRecAlerts.length ? 1 : drafts ? 2 : validated ? 3 : 5;
  const busy = bulk.isPending || setStatus.isPending;

  const sum = (f: (r: PayrollRecord) => number) => records.reduce((s, r) => s + (f(r) || 0), 0);
  const tGross = sum(gross), tNet = sum(r => r.net_salary), tIr = sum(r => r.ir), tCot = tGross - tNet - tIr;
  const tEmployer = sum(r => employerCharges(gross(r)));
  const cost = tGross + tEmployer;
  const prevGross = (prevData?.data ?? []).reduce((s, r) => s + gross(r), 0);
  const delta = prevGross ? (tGross - prevGross) / prevGross * 100 : null;
  const seg = (v: number) => (cost ? `${(v / cost * 100).toFixed(1)}%` : '0%');
  const lastDay = new Date(y, m, 0);
  const next = monthShift(m, y, 1);
  const dd = (d: Date) => [String(d.getDate()).padStart(2, '0'), d.toLocaleDateString(loc, { month: 'short' }).replace('.', '').toUpperCase()];

  const recAlert = (r: PayrollRecord) => alerts.find(a => a.rec?.id === r.id && !a.done);
  const statusOf = (r: PayrollRecord): [TKey, string, string, string] => {
    const al = recAlert(r);
    if (r.status === 'paid') return ['pay_st_paid', '#e1f5ec', '#0f6f49', '#16a06b'];
    if (r.status === 'validated') return ['pay_st_validated', '#e4f2f4', '#0b5f72', '#16b6c8'];
    if (al) return al.kind === 'cdd' ? ['pay_st_settlement', '#ece9fb', '#5444b8', '#6d5ad6'] : ['pay_st_check', '#fbefda', '#8a5207', '#df9326'];
    return ['pay_st_ready', '#e1f5ec', '#0f6f49', '#16a06b'];
  };
  const rows = [...records].sort((a, b) => Number(!!recAlert(b)) - Number(!!recAlert(a)) || gross(b) - gross(a));
  const shown = showAll ? rows : rows.slice(0, 9);
  const histMax = Math.max(...hist.map(h => h.total), 0);
  const histMin = Math.min(...hist.filter(h => h.total).map(h => h.total), histMax);

  const mainAction = () => {
    if (step === 0) { bulk.mutate(); return; }
    if (step === 1) { notify.info(tf(t('pay_still_open'), { n: openRecAlerts.length })); return; }
    if (step === 2) { if (window.confirm(tf(t('pay_confirm_validate'), { n: drafts }))) setStatus.mutate({ from: 'draft', to: 'validated' }); return; }
    if (step === 3) { if (window.confirm(tf(t('pay_confirm_paid'), { n: validated }))) setStatus.mutate({ from: 'validated', to: 'paid' }); return; }
    notify.info(tf(t('pay_already_closed'), { month: monthName(m, y, { month: 'long' }) }));
  };
  const mainLabel: TKey = step === 0 ? 'pay_generate' : step === 3 ? 'pay_mark_paid' : step === 5 ? 'pay_closed' : 'pay_validate';
  const MainIcon = step === 0 ? WandSparkles : step === 5 ? CircleCheck : BadgeCheck;
  const stepSub = (i: number) => {
    if (i === 0) return records.length ? tf(t('pay_sub_slips'), { n: records.length }) : t('pay_sub_to_generate');
    if (i === 1) return !records.length ? '—' : openRecAlerts.length ? tf(t(openRecAlerts.length > 1 ? 'pay_sub_alerts' : 'pay_sub_alert'), { n: openRecAlerts.length }) : t('pay_sub_all_checked');
    if (i === 2) return step < 2 ? t('pay_sub_waiting') : step === 2 ? tf(t('pay_sub_drafts'), { n: drafts }) : t('pay_sub_validated');
    if (i === 3) return step < 3 ? tf(t('pay_sub_planned'), { date: lastDay.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' }) }) : step === 3 ? tf(t('pay_sub_paid_of'), { n: paid, total: records.length }) : t('pay_sub_done');
    return step === 5 ? t('pay_sub_closed') : t('pay_sub_send');
  };

  const kpi = (icon: typeof Wallet, color: string, label: TKey, value: number, sub: React.ReactNode, delay: number) => {
    const Icon = icon;
    return (
      <RV as="div" variant="up" delay={delay} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}><Icon size={14} style={{ color }} />{t(label)}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}><CountText text={fmt(value)} style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-.04em' }} /><span style={{ fontSize: 13, color: '#52646d' }}>MAD</span></div>
        <div style={{ marginTop: 4, fontSize: 12, color: '#52646d' }}>{sub}</div>
      </RV>
    );
  };

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('pay_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('pay_subtitle')}</RV>
        </div>
        <RV as="div" variant="up" delay={100} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => records.length ? exportCSV(records, m, y) : notify.info(t('pay_nothing_to_export'))} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} className="pay-h1">
            <FileSpreadsheet size={15} />{t('pay_export')}
          </button>
          <button type="button" onClick={mainAction} disabled={busy} style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
            <span className="wedy-shine" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} />
            {busy ? <Spinner size={16} color="#fff" /> : <MainIcon size={16} style={{ position: 'relative' }} />}<span style={{ position: 'relative' }}>{t(mainLabel)}</span>
          </button>
        </RV>
      </div>

      <RV as="section" variant="up" delay={80} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, background: '#06141a', color: '#e8eff1', padding: '24px 26px', isolation: 'isolate' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div className="wedy-drift" style={{ position: 'absolute', left: '-6%', top: '-90%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)' }} />
          <div className="wedy-drift" style={{ position: 'absolute', right: '-4%', top: '-70%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(43,189,134,.28),transparent)', ['--dur' as string]: '26s', ['--delay' as string]: '-8s' } as CSSProperties} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28 }}>
          <div style={{ minWidth: 210 }}>
            <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: '#5fe3f0' }}>{t('pay_cycle')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <button type="button" aria-label={t('pay_prev_month')} onClick={() => setPeriod(monthShift(m, y, -1) as { m: number; y: number })} className="pay-nav"><ChevronLeft size={16} className="wy-flip" /></button>
              <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: '-.04em' }}>{monthName(m, y)}</div>
              <button type="button" aria-label={t('pay_next_month')} onClick={() => setPeriod(monthShift(m, y, 1) as { m: number; y: number })} className="pay-nav"><ChevronRight size={16} className="wy-flip" /></button>
            </div>
            <div style={{ marginTop: 4, fontSize: 13.5, color: '#9fb4bb' }}>{tf(t('pay_cycle_sub'), { n: records.length, date: lastDay.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' }) })}</div>
          </div>
          <div style={{ flex: 1, minWidth: 440, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '10%', right: '10%', top: 17, height: 3, borderRadius: 3, background: 'rgba(255,255,255,.1)' }} />
            <div style={{ position: 'absolute', insetInlineStart: '10%', top: 17, height: 3, borderRadius: 3, width: `${(Math.min(step, 4) / 4 * 80).toFixed(1)}%`, background: 'linear-gradient(90deg,#16b6c8,#2bbd86)', boxShadow: '0 0 12px rgba(39,192,212,.6)', transition: 'width .9s cubic-bezier(.2,.8,.2,1)' }} />
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>
              {STEPS.map((label, i) => {
                const done = i < step, current = i === step, spinning = current && busy;
                return (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', padding: '0 4px' }}>
                    {done && <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', boxShadow: '0 0 0 4px #06141a' }}><Check size={17} strokeWidth={2.6} /></span>}
                    {current && (
                      <span style={{ position: 'relative', width: 36, height: 36 }}>
                        <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #5fe3f0' }} />
                        <span style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06141a', border: '2px solid #5fe3f0', color: '#5fe3f0', boxShadow: '0 0 0 4px #06141a' }}>
                          {spinning ? <span className="wedy-spin" style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(95,227,240,.3)', borderTopColor: '#5fe3f0' }} /> : <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 13, fontWeight: 600 }}>{i + 1}</span>}
                        </span>
                      </span>
                    )}
                    {i > step && <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d2229', border: '1px solid rgba(255,255,255,.14)', color: '#7f969e', fontFamily: "'Geist Mono',monospace", fontSize: 13, boxShadow: '0 0 0 4px #06141a' }}>{i + 1}</span>}
                    <span style={{ fontSize: 13, fontWeight: 600, color: done ? '#cfe9ee' : current ? '#ffffff' : '#8ea5ad' }}>{t(label)}</span>
                    <span style={{ fontSize: 11.5, color: '#8ea5ad' }}>{stepSub(i)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </RV>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
        {kpi(Wallet, '#0e6f84', 'pay_kpi_gross', tGross, delta === null ? t('pay_kpi_no_prev') : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: delta >= 0 ? '#0f6f49' : '#a33a28' }}>{delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{tf(t('pay_kpi_vs'), { pct: `${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}`, month: monthName(prev.m, prev.y, { month: 'long' }).toLowerCase() })}</span>
        ), 100)}
        {kpi(Banknote, '#16a06b', 'pay_kpi_net', tNet, tf(t('pay_kpi_transfers'), { n: records.length }), 150)}
        {kpi(Building2, '#b06b0c', 'pay_kpi_employer', tEmployer, t('pay_kpi_employer_sub'), 200)}
        {kpi(Landmark, '#6d5ad6', 'pay_kpi_ir', tIr, t('pay_kpi_ir_sub'), 250)}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RV as="div" variant="up" style={{ borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', flexWrap: 'wrap' }}>
              <img src="/wedy-avatar.png" alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pay_ai_title')}</div>
                <div style={{ fontSize: 13, color: '#52646d' }}>{!records.length ? t('pay_ai_empty') : open ? tf(t(open > 1 ? 'pay_ai_open_many' : 'pay_ai_open_one'), { n: open, ok: records.length - new Set(alerts.filter(a => !a.done && a.rec).map(a => a.rec!.id)).size }) : t('pay_ai_all_ok')}</div>
              </div>
              {records.length > 0 && <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: open ? '#fbefda' : '#e1f5ec', color: open ? '#8a5207' : '#0f6f49' }}>{open ? tf(t('pay_ai_chip'), { n: open }) : t('pay_ai_ready')}</span>}
            </div>
            {alerts.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px', borderTop: '1px solid #eef2f4', opacity: a.done ? 0.62 : 1, transition: 'opacity .4s' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.bg, color: a.color, flexShrink: 0 }}><Icon size={17} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t(a.title)} · <span style={{ color: '#0e6f84' }}>{a.emp}</span></div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: '#52646d', marginTop: 2 }}>{a.text}</div>
                  </div>
                  {a.done ? (
                    <RV as="span" variant="pill" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, background: '#e1f5ec', color: '#0f6f49', fontSize: 12.5, fontWeight: 600 }}><CircleCheck size={14} />{t('pay_verified')}</RV>
                  ) : a.kind === 'missing' ? (
                    <button type="button" onClick={() => { setPrefill(employees.find(e => e.id === a.empId) ?? null); setCreateOpen(true); }} className="pay-check"><Plus size={14} />{t('pay_create_slip')}</button>
                  ) : (
                    <button type="button" disabled={verify.isPending} onClick={() => verify.mutate(a)} className="pay-check"><Check size={14} />{t('pay_mark_checked')}</button>
                  )}
                </div>
              );
            })}
          </RV>

          <RV as="div" variant="up" delay={80} style={{ borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pay_slips')}</span>
              <span style={{ fontSize: 13, color: '#52646d' }}>{tf(t('pay_shown'), { n: shown.length, total: records.length })}</span>
              <button type="button" onClick={() => { setPrefill(null); setCreateOpen(true); }} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#0e6f84', cursor: 'pointer' }}><Plus size={14} />{t('pay_new_slip')}</button>
              {rows.length > 9 && <button type="button" onClick={() => setShowAll(s => !s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#0e6f84', cursor: 'pointer' }}>{t(showAll ? 'pay_show_less' : 'pay_show_all')}<ArrowRight size={14} className="wy-flip" /></button>}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 900 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,2fr) 130px repeat(4,108px) 140px 64px', alignItems: 'center', padding: '10px 20px', background: '#f8fafb', borderTop: '1px solid #eef2f4', borderBottom: '1px solid #eef2f4', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>
                  <span>{t('pay_col_emp')}</span><span>{t('pay_col_dept')}</span><span style={{ textAlign: 'end' }}>{t('pay_col_gross')}</span><span style={{ textAlign: 'end' }}>{t('pay_col_cot')}</span><span style={{ textAlign: 'end' }}>IR</span><span style={{ textAlign: 'end' }}>{t('pay_col_net')}</span><span style={{ textAlign: 'end' }}>{t('pay_col_status')}</span><span />
                </div>
                {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}><Spinner /></div>}
                {!isLoading && !records.length && (
                  <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 14, color: '#52646d' }}>
                    {t('pay_none')}
                    <div style={{ marginTop: 12 }}><button type="button" onClick={() => bulk.mutate()} disabled={bulk.isPending} className="pay-check" style={{ margin: '0 auto' }}><WandSparkles size={14} />{t('pay_generate')}</button></div>
                  </div>
                )}
                {shown.map((r, i) => {
                  const st = statusOf(r);
                  const name = r.employees?.full_name || '—';
                  return (
                    <RV key={r.id} as="div" variant="up" delay={Math.min(i, 12) * 40} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,2fr) 130px repeat(4,108px) 140px 64px', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #eef2f4', transition: 'background .15s' }} className="pay-h2">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(name), color: '#ffffff', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{initialsOf(name)}</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                      </span>
                      <span style={{ fontSize: 13, color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.employees?.department || '—'}</span>
                      <span style={{ textAlign: 'end', fontFamily: "'Geist Mono',monospace", fontSize: 12.5 }}>{fmt(gross(r))}</span>
                      <span style={{ textAlign: 'end', fontFamily: "'Geist Mono',monospace", fontSize: 12.5, color: '#52646d' }}>{fmt(gross(r) - r.net_salary - r.ir)}</span>
                      <span style={{ textAlign: 'end', fontFamily: "'Geist Mono',monospace", fontSize: 12.5, color: '#52646d' }}>{fmt(r.ir)}</span>
                      <span style={{ textAlign: 'end', fontFamily: "'Geist Mono',monospace", fontSize: 13, fontWeight: 600 }}>{fmt(r.net_salary)}</span>
                      <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: st[1], color: st[2], whiteSpace: 'nowrap' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: st[3] }} />{t(st[0])}</span>
                      </span>
                      <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <button type="button" aria-label={t('pay_pdf')} title={t('pay_pdf')} onClick={() => downloadPdf(r).catch(fail)} className="pay-icon"><Download size={14} /></button>
                        {r.status !== 'paid' && <button type="button" aria-label={t('delete')} title={t('delete')} onClick={() => { if (window.confirm(tf(t('pay_confirm_delete'), { name }))) remove.mutate(r); }} className="pay-icon pay-danger"><Trash2 size={14} /></button>}
                      </span>
                    </RV>
                  );
                })}
              </div>
            </div>
          </RV>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RV as="div" variant="up" delay={120} style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pay_cost')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}><CountText text={fmt(cost)} style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.045em' }} /><span style={{ fontSize: 13, color: '#52646d' }}>MAD</span></div>
            <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', gap: 3, marginTop: 14, background: cost ? 'transparent' : '#eef2f4' }}>
              {[[tNet, '#0e6f84'], [tCot, '#16b6c8'], [tIr, '#6d5ad6'], [tEmployer, '#df9326']].map(([v, c], i) => (
                <RV key={i} as="span" variant="growx" delay={i * 100 + (i ? 50 : 0)} style={{ width: seg(v as number), background: c as string, borderRadius: 99, transformOrigin: 'left' }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14, fontSize: 13 }}>
              {([[t('pay_seg_net'), tNet, '#0e6f84'], [t('pay_seg_cot'), tCot, '#16b6c8'], [t('pay_seg_ir'), tIr, '#6d5ad6'], [t('pay_seg_employer'), tEmployer, '#df9326']] as [string, number, string][]).map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#33474f' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}</span><span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{fmt(v)}</span></div>
              ))}
            </div>
          </RV>
          <RV as="div" variant="up" delay={180} style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pay_hist')}</span><span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, color: '#5f7079' }}>{t('pay_hist_unit')}</span></div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, height: 160, marginTop: 16 }}>
              {hist.map((h, i) => {
                const pct = !h.total ? 4 : histMax === histMin ? 80 : Math.round(35 + (h.total - histMin) / (histMax - histMin) * 60);
                return (
                  <div key={`${h.m}-${h.y}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10.5, color: '#52646d' }}>{h.total ? (h.total / 1e6).toFixed(h.total >= 1e6 ? 2 : 3).replace('.', ',') : '—'}</span>
                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}><RV as="span" variant="growy" delay={i * 70} style={{ display: 'block', width: '100%', height: `${pct}%`, borderRadius: '8px 8px 4px 4px', background: i === hist.length - 1 ? 'linear-gradient(180deg,#16b6c8,#0e6f84)' : '#d7e6ea', transformOrigin: 'bottom' }} /></div>
                    <span style={{ fontSize: 11.5, color: '#5f7079' }}>{monthName(h.m, h.y, { month: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          </RV>
          <RV as="div" variant="up" delay={220} style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pay_deadlines')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {([[lastDay, '#e4f2f4', '#0b5f72', 'pay_dl_transfer', tf(t('pay_dl_transfer_sub'), { n: records.length })], [new Date(next.y, next.m - 1, 10), '#fbefda', '#8a5207', 'pay_dl_cnss', tf(t('pay_dl_cnss_sub'), { month: monthName(m, y, { month: 'long' }).toLowerCase() })], [new Date(next.y, next.m, 0), '#ece9fb', '#5444b8', 'pay_dl_ir', tf(t('pay_dl_ir_sub'), { month: monthName(m, y, { month: 'long' }).toLowerCase() })]] as [Date, string, string, TKey, string][]).map(([d, bg, c, l, s]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 46, textAlign: 'center', padding: '6px 0', borderRadius: 10, background: bg, color: c, fontFamily: "'Geist Mono',monospace", fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{dd(d)[0]}<br />{dd(d)[1]}</span>
                  <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{t(l)}</div><div style={{ fontSize: 12, color: '#5f7079' }}>{s}</div></div>
                </div>
              ))}
            </div>
          </RV>
        </div>
      </div>

      <CreateSlipDrawer open={createOpen} onClose={() => setCreateOpen(false)} employees={employees} month={m} year={y} prefill={prefill} />
    </div>
  );
}

const inputStyle: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };

function CreateSlipDrawer({ open, onClose, employees, month, year, prefill }: { open: boolean; onClose: () => void; employees: Employee[]; month: number; year: number; prefill: Employee | null }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const empty = { employee_id: prefill?.id ?? '', base_salary: prefill?.salary != null ? String(prefill.salary) : '', bonuses: '0', deductions: '0', notes: '' };
  const [f, setF] = useState(empty);
  const [key, setKey] = useState(`${open}|${prefill?.id ?? ''}`);
  if (`${open}|${prefill?.id ?? ''}` !== key) { setKey(`${open}|${prefill?.id ?? ''}`); if (open) setF(empty); }
  const set = (k: keyof typeof empty, v: string) => setF(x => ({ ...x, [k]: v }));
  const mut = useMutation({
    mutationFn: () => createPayroll({ employee_id: f.employee_id, month, year, base_salary: parseFloat(f.base_salary) || 0, bonuses: parseFloat(f.bonuses) || 0, deductions: parseFloat(f.deductions) || 0, notes: f.notes || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); notify.success(t('pay_slip_created')); onClose(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const g = (parseFloat(f.base_salary) || 0) + (parseFloat(f.bonuses) || 0);
  return (
    <Drawer open={open} onClose={onClose} title={t('pay_new_slip')} subtitle={t('pay_new_slip_sub')} icon={<Wallet size={17} />} width={460}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!f.employee_id || !f.base_salary || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('save')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t('pay_col_emp')}</label>
          <select value={f.employee_id} onChange={e => { const emp = employees.find(x => x.id === e.target.value); setF(x => ({ ...x, employee_id: e.target.value, base_salary: emp?.salary != null ? String(emp.salary) : x.base_salary })); }} style={inputStyle}>
            <option value="">{t('pay_pick_emp')}</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>
        <div><label style={labelStyle}>{t('pay_base')} (MAD)</label><input type="number" min={0} value={f.base_salary} onChange={e => set('base_salary', e.target.value)} style={inputStyle} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>{t('pay_bonuses')} (MAD)</label><input type="number" min={0} value={f.bonuses} onChange={e => set('bonuses', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('pay_deductions')} (MAD)</label><input type="number" min={0} value={f.deductions} onChange={e => set('deductions', e.target.value)} style={inputStyle} /></div>
        </div>
        <div><label style={labelStyle}>{t('pay_note')}</label><input value={f.notes} onChange={e => set('notes', e.target.value)} placeholder={t('pay_note_ph')} style={inputStyle} /></div>
        {g > 0 && <div style={{ padding: '10px 12px', borderRadius: 12, background: '#f3fafb', fontSize: 13, color: '#33474f' }}>{t('pay_col_gross')} : <b style={{ color: '#0b5f72' }}>{fmt(g)} MAD</b> · {t('pay_auto_calc')}</div>}
      </div>
    </Drawer>
  );
}
