import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DollarSign, Zap, CheckCircle, Printer } from 'lucide-react';
import { listPayroll, generateBulkPayroll, updatePayroll, type PayrollRecord } from '../../lib/api';
import { Card, Badge, Spinner, Button } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success'> = {
  draft: 'default', validated: 'warning', paid: 'success',
};

const MONTHS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function fmt(n?: number) {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);
}

function printBulletin(r: PayrollRecord, monthLabel: string, year: number) {
  const name = r.employees?.full_name ?? '—';
  const dept = r.employees?.department ?? '—';
  const pos  = r.employees?.position ?? '—';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Bulletin de paie — ${name}</title>
<style>
  body{font-family:'Times New Roman',serif;max-width:680px;margin:40px auto;color:#0f172a;font-size:13px}
  h1{font-size:18px;text-align:center;margin-bottom:4px}
  .sub{text-align:center;color:#64748b;font-size:12px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#475569}
  td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
  .right{text-align:right}
  .total td{font-weight:700;font-size:15px;background:#f0fdf4;color:#15803d}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;padding:14px;background:#f8fafc;border-radius:8px}
  .info p{margin:4px 0;font-size:12px} .info strong{font-size:13px}
  .footer{margin-top:32px;font-size:11px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px}
</style></head><body>
<h1>TYTHON SARL — Bulletin de Paie</h1>
<div class="sub">${monthLabel} ${year}</div>
<div class="info">
  <div><p>Employé</p><strong>${name}</strong><p style="margin-top:4px;color:#64748b">${pos} · ${dept}</p></div>
  <div><p>Période</p><strong>${monthLabel} ${year}</strong><p style="margin-top:4px;color:#64748b">Statut : ${r.status}</p></div>
</div>
<table>
  <tr><th>Rubrique</th><th class="right">Montant (MAD)</th></tr>
  <tr><td>Salaire de base</td><td class="right">${fmt(r.base_salary)}</td></tr>
  ${r.bonuses > 0 ? `<tr><td>Primes & avantages</td><td class="right">${fmt(r.bonuses)}</td></tr>` : ''}
  <tr><td>Brut total</td><td class="right"><strong>${fmt(r.base_salary + r.bonuses)}</strong></td></tr>
  <tr><td style="color:#ef4444">Cotisation CNSS (salarié)</td><td class="right" style="color:#ef4444">- ${fmt(r.cnss)}</td></tr>
  <tr><td style="color:#ef4444">Impôt sur le Revenu (IR)</td><td class="right" style="color:#ef4444">- ${fmt(r.ir)}</td></tr>
  ${r.deductions > 0 ? `<tr><td style="color:#ef4444">Autres retenues</td><td class="right" style="color:#ef4444">- ${fmt(r.deductions)}</td></tr>` : ''}
  <tr class="total"><td>NET À PAYER</td><td class="right">${fmt(r.net_salary)}</td></tr>
</table>
${r.notes ? `<p style="font-size:12px;color:#64748b"><strong>Note :</strong> ${r.notes}</p>` : ''}
<div class="footer">
  TYTHON SARL · 55 Bd Zerktouni, Casablanca · RC 553131 · ICE 0003106377000035 · CNSS 4912448<br/>
  Document généré automatiquement — Wedy RH Platform
</div>
</body></html>`;
  const w = window.open('', '_blank')!;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

export default function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['payroll', month, year],
    queryFn: () => listPayroll({ month, year }),
  });

  const records = data?.data ?? [];
  const total = data?.count ?? 0;

  const grossTotal = records.reduce((s, r) => s + (r.base_salary || 0) + (r.bonuses || 0), 0);
  const netTotal = records.reduce((s, r) => s + (r.net_salary || 0), 0);
  const paidCount = records.filter(r => r.status === 'paid').length;

  const bulkMutation = useMutation({
    mutationFn: () => generateBulkPayroll(month, year),
    onSuccess: (res) => {
      toast.success(`${res.created} fiches générées · ${res.skipped} ignorées`);
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: () => toast.error('Erreur lors de la génération en masse'),
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => updatePayroll(id, { status: 'validated' } as Partial<PayrollRecord>),
    onSuccess: () => { toast.success('Fiche validée'); qc.invalidateQueries({ queryKey: ['payroll'] }); },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => updatePayroll(id, { status: 'paid' } as Partial<PayrollRecord>),
    onSuccess: () => { toast.success('Paiement enregistré'); qc.invalidateQueries({ queryKey: ['payroll'] }); },
    onError: () => toast.error('Erreur lors du paiement'),
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Paie"
        subtitle={`${MONTHS_FR[month]} ${year} · ${total} fiche(s)`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              onClick={() => bulkMutation.mutate()}
              loading={bulkMutation.isPending}
              style={{ background: 'var(--bg-muted)', color: 'var(--fg)', border: '1px solid var(--border)' }}
            >
              <Zap size={14} /> Générer toutes les fiches
            </Button>
          </div>
        }
      />

      {/* Month/Year picker */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select className="select" style={{ width: 140 }} value={month} onChange={e => setMonth(+e.target.value)}>
          {MONTHS_FR.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select className="select" style={{ width: 100 }} value={year} onChange={e => setYear(+e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Masse salariale brute', value: fmt(grossTotal), color: 'var(--primary)' },
          { label: 'Masse salariale nette', value: fmt(netTotal), color: 'var(--success)' },
          { label: 'Fiches générées', value: total, color: 'var(--fg)' },
          { label: 'Payées', value: `${paidCount} / ${total}`, color: paidCount === total && total > 0 ? 'var(--success)' : 'var(--warning)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card pad={false}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px 90px 90px 90px 120px', gap: 10, fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Employé</span><span>Brut</span><span>Net</span><span>CNSS</span><span>IR</span><span>Primes</span><span>Statut</span><span>Actions</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
        ) : records.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
            <DollarSign size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>Aucune fiche pour ce mois. Cliquez sur "Générer toutes les fiches".</p>
          </div>
        ) : (
          records.map((r: PayrollRecord, i) => (
            <div key={r.id} style={{
              padding: '12px 20px',
              borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px 90px 90px 90px 120px', gap: 10,
              alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{r.employees?.full_name || '—'}</p>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{r.employees?.department}</p>
              </div>
              <span style={{ fontSize: 13 }}>{fmt(r.base_salary + r.bonuses)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{fmt(r.net_salary)}</span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{fmt(r.cnss)}</span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{fmt(r.ir)}</span>
              <span style={{ fontSize: 12, color: r.bonuses > 0 ? 'var(--success)' : 'var(--fg-subtle)' }}>{fmt(r.bonuses)}</span>
              <Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>{r.status}</Badge>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {r.status === 'draft' && (
                  <button className="btn btn-sm btn-soft" onClick={() => validateMutation.mutate(r.id)} style={{ fontSize: 11, padding: '3px 8px' }}>
                    Valider
                  </button>
                )}
                {r.status === 'validated' && (
                  <button className="btn btn-sm" onClick={() => payMutation.mutate(r.id)} style={{ fontSize: 11, padding: '3px 8px', background: 'var(--success)', color: '#fff', border: 'none' }}>
                    <CheckCircle size={11} /> Payer
                  </button>
                )}
                {r.status === 'paid' && r.paid_at && (
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{format(new Date(r.paid_at), 'dd/MM/yy')}</span>
                )}
                <button className="btn btn-ghost btn-sm" title="Imprimer le bulletin"
                  onClick={() => printBulletin(r, MONTHS_FR[month], year)}
                  style={{ padding: '3px 6px' }}>
                  <Printer size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
