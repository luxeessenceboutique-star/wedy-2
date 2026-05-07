import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Zap, CheckCircle, Printer, Download, TrendingUp, TrendingDown, ArrowRight, DollarSign, BarChart3, Plus, X } from 'lucide-react';
import { listPayroll, generateBulkPayroll, updatePayroll, createPayroll, listEmployees, type PayrollRecord } from '../../lib/api';
import { Badge, Spinner, Button } from '../../components/ui';

const MONTHS_FR = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success'> = {
  draft: 'default', validated: 'warning', paid: 'success',
};

function fmt(n?: number) {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);
}

// ── SVG Donut Chart ───────────────────────────────────────────────
function DonutChart({ segments, size = 110 }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>N/A</span>
    </div>
  );
  const cx = size / 2, cy = size / 2, outerR = size / 2 - 5, innerR = outerR * 0.6;
  let cur = -Math.PI / 2;
  const paths = segments.filter(s => s.value > 0).map(seg => {
    const pct = seg.value / total, a = pct * 2 * Math.PI;
    const s0 = cur, e0 = cur + a - 0.02; cur += a;
    const x1o = cx + outerR * Math.cos(s0), y1o = cy + outerR * Math.sin(s0);
    const x2o = cx + outerR * Math.cos(e0), y2o = cy + outerR * Math.sin(e0);
    const x1i = cx + innerR * Math.cos(s0), y1i = cy + innerR * Math.sin(s0);
    const x2i = cx + innerR * Math.cos(e0), y2i = cy + innerR * Math.sin(e0);
    return { d: `M${x1o} ${y1o} A${outerR} ${outerR} 0 ${pct>.5?1:0} 1 ${x2o} ${y2o} L${x2i} ${y2i} A${innerR} ${innerR} 0 ${pct>.5?1:0} 0 ${x1i} ${y1i}Z`, color: seg.color, label: seg.label };
  });
  return <svg width={size} height={size}>{paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.9} />)}</svg>;
}

// ── Print Bulletin ────────────────────────────────────────────────
function printBulletin(r: PayrollRecord, monthLabel: string, year: number) {
  const name = r.employees?.full_name ?? '—';
  const dept = r.employees?.department ?? '—';
  const pos  = r.employees?.position  ?? '—';
  const gross = (r.base_salary || 0) + (r.bonuses || 0);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Bulletin de paie — ${name}</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:680px;margin:40px auto;color:#0f172a;font-size:13px}h1{font-size:20px;font-weight:700;margin:0 0 2px}.sub{color:#64748b;font-size:12px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#F8FAFC;padding:8px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#64748B;border-bottom:2px solid #E2E8F0}td{padding:9px 14px;border-bottom:1px solid #F1F5F9}.right{text-align:right}.gross-row td{background:#EFF6FF;color:#1D4ED8;font-weight:600}.deduct-row td{background:#FFF7ED}.total-row td{font-weight:700;font-size:15px;background:#F0FDF4;color:#15803D;border-top:2px solid #86EFAC}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;padding:16px;background:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0}.il{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94A3B8;margin-bottom:3px}.iv{font-size:14px;font-weight:600}.badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;background:#DCFCE7;color:#15803D}.footer{margin-top:32px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px}@media print{body{margin:0}}</style>
</head><body>
<h1>TYTHON SARL</h1><div class="sub">Bulletin de Paie — ${monthLabel} ${year}</div>
<div class="info-grid"><div><div class="il">Employé</div><div class="iv">${name}</div><div style="font-size:12px;color:#64748b;margin-top:2px">${pos} · ${dept}</div></div><div><div class="il">Période</div><div class="iv">${monthLabel} ${year}</div><div style="margin-top:5px"><span class="badge">${r.status==='paid'?'✓ Payé':r.status}</span></div></div></div>
<table><tr><th>Rubrique</th><th class="right">Montant (MAD)</th></tr>
<tr><td>Salaire de base</td><td class="right">${fmt(r.base_salary)}</td></tr>
${(r.bonuses||0)>0?`<tr><td>Primes & avantages</td><td class="right">${fmt(r.bonuses)}</td></tr>`:''}
<tr class="gross-row"><td>Total brut</td><td class="right">${fmt(gross)}</td></tr>
<tr class="deduct-row"><td style="color:#EA580C">Cotisation CNSS (salarié)</td><td class="right" style="color:#EA580C">− ${fmt(r.cnss)}</td></tr>
<tr class="deduct-row"><td style="color:#EA580C">Impôt sur le Revenu (IR)</td><td class="right" style="color:#EA580C">− ${fmt(r.ir)}</td></tr>
${(r.deductions||0)>0?`<tr class="deduct-row"><td style="color:#EA580C">Autres retenues</td><td class="right" style="color:#EA580C">− ${fmt(r.deductions)}</td></tr>`:''}
<tr class="total-row"><td>NET À PAYER</td><td class="right">${fmt(r.net_salary)}</td></tr></table>
${r.notes?`<p style="font-size:12px;color:#64748b;padding:10px 14px;background:#F8FAFC;border-radius:8px"><strong>Note :</strong> ${r.notes}</p>`:''}
<div class="footer">TYTHON SARL · 55 Bd Zerktouni, Casablanca · RC 553131 · ICE 0003106377000035 · CNSS 4912448<br/>Généré le ${new Date().toLocaleDateString('fr-FR')} — Wedy RH Platform</div>
</body></html>`;
  const w = window.open('', '_blank')!; w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
}

// ── Export CSV ────────────────────────────────────────────────────
function exportCSV(records: PayrollRecord[], month: number, year: number) {
  const headers = ['Employé','Département','Poste','Brut','Primes','CNSS','IR','Retenues','Net','Statut'];
  const rows = records.map(r => [r.employees?.full_name||'',r.employees?.department||'',r.employees?.position||'',r.base_salary,r.bonuses||0,r.cnss,r.ir,r.deductions||0,r.net_salary,r.status].map(v=>`"${v}"`));
  const csv = [headers.map(h=>`"${h}"`), ...rows].map(r=>r.join(',')).join('\n');
  const blob = new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`paie_${year}_${String(month).padStart(2,'0')}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  toast.success('Export CSV téléchargé');
}

// ── Create Payroll Modal ──────────────────────────────────────────
function CreatePayrollModal({ defaultMonth, defaultYear, onClose }: { defaultMonth: number; defaultYear: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees({ limit: 100 }) });
  const employees = empData?.data ?? [];

  const [form, setForm] = useState({
    employee_id: '', month: defaultMonth, year: defaultYear,
    base_salary: '', bonuses: '0', deductions: '0', notes: '',
  });
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill salary from employee record
  const onEmpChange = (id: string) => {
    const emp = employees.find(e => e.id === id);
    setForm(f => ({ ...f, employee_id: id, base_salary: emp?.salary != null ? String(emp.salary) : f.base_salary }));
  };

  const gross = (parseFloat(form.base_salary)||0) + (parseFloat(form.bonuses)||0);

  const mutation = useMutation({
    mutationFn: () => createPayroll({
      employee_id: form.employee_id,
      month: Number(form.month),
      year: Number(form.year),
      base_salary: parseFloat(form.base_salary) || 0,
      bonuses: parseFloat(form.bonuses) || 0,
      deductions: parseFloat(form.deductions) || 0,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Fiche de paie créée');
      qc.invalidateQueries({ queryKey: ['payroll'] });
      onClose();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Erreur lors de la création';
      toast.error(msg);
    },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius-lg)', padding: 28, width: 460, boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Créer une fiche de paie</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Employé</label>
            <select className="select" value={form.employee_id} onChange={e => onEmpChange(e.target.value)}>
              <option value="">Sélectionner un employé…</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.salary ? ` — ${fmt(e.salary)}` : ' — salaire non défini'}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Mois</label>
              <select className="select" value={form.month} onChange={e => set('month', +e.target.value)}>
                {MONTHS_FR.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Année</label>
              <input className="input" type="number" value={form.year} onChange={e => set('year', e.target.value)} min={2020} max={2030} />
            </div>
          </div>

          <div>
            <label className="label">Salaire de base (MAD)</label>
            <input className="input" type="number" value={form.base_salary} onChange={e => set('base_salary', e.target.value)} placeholder="Ex: 8000" min={0} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Primes (MAD)</label>
              <input className="input" type="number" value={form.bonuses} onChange={e => set('bonuses', e.target.value)} min={0} />
            </div>
            <div>
              <label className="label">Retenues (MAD)</label>
              <input className="input" type="number" value={form.deductions} onChange={e => set('deductions', e.target.value)} min={0} />
            </div>
          </div>

          {gross > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--primary-soft)', border: '1px solid var(--primary)20', fontSize: 12 }}>
              <span style={{ color: 'var(--fg-muted)' }}>Brut estimé : </span>
              <strong style={{ color: 'var(--primary)' }}>{fmt(gross)}</strong>
              <span style={{ color: 'var(--fg-subtle)', marginLeft: 8 }}>Net calculé automatiquement (CNSS + IR marocain)</span>
            </div>
          )}

          <div>
            <label className="label">Note (optionnel)</label>
            <input className="input" type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Ex: Prime exceptionnelle, congé sans solde…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <Button onClick={onClose} style={{ background: 'var(--bg-muted)', color: 'var(--fg)', border: '1px solid var(--border)' }}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}
            disabled={!form.employee_id || !form.base_salary || parseFloat(form.base_salary) < 0}>
            Créer la fiche
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [allMonths, setAllMonths] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const queryParams = allMonths ? undefined : { month, year };

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', allMonths ? 'all' : `${month}-${year}`],
    queryFn: () => listPayroll(queryParams),
  });
  const records = data?.data ?? [];

  const grossTotal  = records.reduce((s, r) => s + (r.base_salary||0) + (r.bonuses||0), 0);
  const netTotal    = records.reduce((s, r) => s + (r.net_salary||0), 0);
  const cnssTotal   = records.reduce((s, r) => s + (r.cnss||0), 0);
  const irTotal     = records.reduce((s, r) => s + (r.ir||0), 0);
  const draftCount  = records.filter(r => r.status === 'draft').length;
  const validCount  = records.filter(r => r.status === 'validated').length;
  const paidCount   = records.filter(r => r.status === 'paid').length;

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const bulkMutation = useMutation({
    mutationFn: () => generateBulkPayroll(month, year),
    onSuccess: (res: { created: number; skipped: number; no_salary?: string[] }) => {
      if (res.created > 0) {
        toast.success(`${res.created} fiche(s) générée(s)${res.skipped > 0 ? ` · ${res.skipped} déjà existante(s)` : ''}`);
      } else if (res.skipped > 0) {
        toast.info(`Fiches déjà existantes pour ${MONTHS_FR[month]} ${year} — rien à créer.`);
      } else {
        toast.warning('Aucun employé actif trouvé. Vérifiez le statut des employés.');
      }
      if (res.no_salary && res.no_salary.length > 0) {
        toast.warning(`Salaire manquant pour : ${res.no_salary.join(', ')} — fiche créée à 0 MAD.`, { duration: 7000 });
      }
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: () => toast.error('Erreur lors de la génération'),
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => updatePayroll(id, { status: 'validated' } as Partial<PayrollRecord>),
    onSuccess: () => { toast.success('Fiche validée'); qc.invalidateQueries({ queryKey: ['payroll'] }); },
  });
  const payMutation = useMutation({
    mutationFn: (id: string) => updatePayroll(id, { status: 'paid' } as Partial<PayrollRecord>),
    onSuccess: () => { toast.success('Paiement enregistré'); qc.invalidateQueries({ queryKey: ['payroll'] }); },
  });
  const validateAllMutation = useMutation({
    mutationFn: async () => {
      const drafts = records.filter(r => r.status === 'draft');
      await Promise.all(drafts.map(r => updatePayroll(r.id, { status: 'validated' } as Partial<PayrollRecord>)));
      return drafts.length;
    },
    onSuccess: (n) => { toast.success(`${n} fiche(s) validée(s)`); qc.invalidateQueries({ queryKey: ['payroll'] }); },
  });

  const donutSegments = [
    { value: netTotal, color: '#22C55E', label: 'Net' },
    { value: cnssTotal, color: '#F97316', label: 'CNSS' },
    { value: irTotal, color: '#EF4444', label: 'IR' },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      {showCreate && <CreatePayrollModal defaultMonth={month} defaultYear={year} onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 3px' }}>Gestion de la Paie</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
            {records.length} fiche(s) · {allMonths ? 'Tous les mois' : `${MONTHS_FR[month]} ${year}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Month navigator */}
          {!allMonths && (
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', color: 'var(--fg-muted)' }}>
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 130, textAlign: 'center' }}>{MONTHS_FR[month]} {year}</span>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', color: 'var(--fg-muted)' }}>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
          <button
            onClick={() => setAllMonths(v => !v)}
            style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500, border: '1px solid var(--border)', background: allMonths ? 'var(--primary)' : 'var(--bg-elev)', color: allMonths ? '#fff' : 'var(--fg)' }}>
            {allMonths ? 'Vue mensuelle' : 'Tous les mois'}
          </button>
          <Button onClick={() => setShowCreate(true)} style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}>
            <Plus size={14} /> Créer une fiche
          </Button>
          <Button onClick={() => bulkMutation.mutate()} loading={bulkMutation.isPending}
            style={{ background: 'var(--bg-muted)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
            <Zap size={14} /> Générer toutes les fiches
          </Button>
          {records.length > 0 && (
            <Button onClick={() => exportCSV(records, month, year)} style={{ background: 'var(--bg-muted)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
              <Download size={14} /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Masse salariale brute', value: fmt(grossTotal), sub: `${records.length} employé(s)`, color: '#3B82F6', icon: <DollarSign size={16} /> },
          { label: 'Net total à payer', value: fmt(netTotal), sub: grossTotal>0?`${Math.round((netTotal/grossTotal)*100)}% du brut`:'—', color: '#22C55E', icon: <TrendingUp size={16} /> },
          { label: 'Charges (CNSS + IR)', value: fmt(cnssTotal+irTotal), sub: grossTotal>0?`${Math.round(((cnssTotal+irTotal)/grossTotal)*100)}% du brut`:'—', color: '#F97316', icon: <TrendingDown size={16} /> },
          { label: 'Payées', value: `${paidCount} / ${records.length}`, sub: paidCount===records.length&&records.length>0?'✓ Tout payé':`${draftCount} brouillon(s)`, color: paidCount===records.length&&records.length>0?'#22C55E':'var(--fg)', icon: <CheckCircle size={16} /> },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: stat.color+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{stat.label}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: stat.color, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 1 }}>{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline + Donut */}
      {records.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 14, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
            <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 16px' }}>Pipeline de traitement</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {[
                { label: 'Brouillons', count: draftCount, color: '#94A3B8', desc: 'À valider' },
                { label: 'Validées', count: validCount, color: '#F59E0B', desc: 'À payer' },
                { label: 'Payées', count: paidCount, color: '#22C55E', desc: 'Terminé' },
              ].map((stage, i) => (
                <React.Fragment key={stage.label}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '14px 8px', borderRadius: 10, background: stage.color+'12', border: `1px solid ${stage.color}30` }}>
                    <div style={{ fontSize: 30, fontWeight: 700, color: stage.color, lineHeight: 1 }}>{stage.count}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: stage.color, marginTop: 2 }}>{stage.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 1 }}>{stage.desc}</div>
                  </div>
                  {i < 2 && <ArrowRight size={16} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />}
                </React.Fragment>
              ))}
            </div>
            {draftCount > 0 && (
              <button onClick={() => validateAllMutation.mutate()} disabled={validateAllMutation.isPending}
                style={{ marginTop: 14, width: '100%', padding: '9px 0', background: '#F59E0B18', border: '1px dashed #F59E0B60', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#D97706' }}>
                {validateAllMutation.isPending ? 'Validation…' : `Valider tous les brouillons (${draftCount})`}
              </button>
            )}
          </div>
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 12px', alignSelf: 'flex-start' }}>Répartition du brut</p>
            <DonutChart segments={donutSegments} size={110} />
            <div style={{ marginTop: 12, width: '100%' }}>
              {donutSegments.map(seg => (
                <div key={seg.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: seg.color }} />
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{seg.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>{fmt(seg.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: allMonths ? '140px 1fr 110px 120px 80px 80px 90px 120px' : '1fr 110px 120px 80px 80px 90px 120px', gap: 10, fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {allMonths && <span>Période</span>}
          <span>Employé</span><span>Brut</span><span>Net</span><span>CNSS</span><span>IR</span><span>Statut</span><span>Actions</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
        ) : records.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
            <BarChart3 size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <p style={{ fontSize: 14, marginBottom: 8 }}>Aucune fiche pour {allMonths ? 'aucun mois' : `${MONTHS_FR[month]} ${year}`}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShowCreate(true)} style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                <span style={{ marginRight: 6 }}>+</span> Créer une fiche manuellement
              </button>
              <button onClick={() => bulkMutation.mutate()} style={{ padding: '8px 16px', background: 'var(--bg-muted)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Générer toutes les fiches
              </button>
              {!allMonths && (
                <button onClick={() => setAllMonths(true)} style={{ padding: '8px 16px', background: 'var(--bg-muted)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  Voir tous les mois
                </button>
              )}
            </div>
          </div>
        ) : (
          records.map((r: PayrollRecord, i) => {
            const gross = (r.base_salary||0) + (r.bonuses||0);
            const netPct = gross > 0 ? (r.net_salary / gross) * 100 : 0;
            let paidDate = '';
            try { if (r.paid_at) paidDate = format(new Date(r.paid_at), 'dd/MM/yy'); } catch { /* noop */ }
            return (
              <div key={r.id} style={{ padding: '12px 20px', borderBottom: i < records.length-1 ? '1px solid var(--border)' : 'none', display: 'grid', gridTemplateColumns: allMonths ? '140px 1fr 110px 120px 80px 80px 90px 120px' : '1fr 110px 120px 80px 80px 90px 120px', gap: 10, alignItems: 'center' }}>
                {allMonths && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--primary)' }}>{MONTHS_FR[r.month]} {r.year}</span>
                )}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{r.employees?.full_name || '—'}</p>
                  <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{r.employees?.department || r.employees?.position || '—'}</p>
                </div>
                <div>
                  <span style={{ fontSize: 13 }}>{fmt(gross)}</span>
                  {(r.bonuses||0) > 0 && <div style={{ fontSize: 10, color: '#22C55E', marginTop: 1 }}>+{fmt(r.bonuses)} prime</div>}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#22C55E' }}>{fmt(r.net_salary)}</span>
                  <div style={{ marginTop: 4, height: 3, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${netPct}%`, background: '#22C55E', borderRadius: 999 }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#F97316' }}>{fmt(r.cnss)}</span>
                <span style={{ fontSize: 12, color: '#EF4444' }}>{fmt(r.ir)}</span>
                <Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>
                  {r.status === 'draft' ? 'Brouillon' : r.status === 'validated' ? 'Validé' : 'Payé'}
                </Badge>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  {r.status === 'draft' && (
                    <button className="btn btn-sm btn-soft" onClick={() => validateMutation.mutate(r.id)} style={{ fontSize: 11, padding: '3px 8px' }}>Valider</button>
                  )}
                  {r.status === 'validated' && (
                    <button onClick={() => payMutation.mutate(r.id)}
                      style={{ fontSize: 11, padding: '3px 9px', background: '#22C55E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CheckCircle size={11} /> Payer
                    </button>
                  )}
                  {r.status === 'paid' && paidDate && <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{paidDate}</span>}
                  <button className="btn btn-ghost btn-sm" title="Imprimer le bulletin de paie"
                    onClick={() => printBulletin(r, MONTHS_FR[r.month], r.year)}
                    style={{ padding: '3px 6px' }}>
                    <Printer size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
