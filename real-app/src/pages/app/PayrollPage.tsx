import React from 'react';
import { PageHeader } from '../../components/layout/AppShell';

const STATS = [
  { label: 'Gross payroll', value: '2.84M MAD', color: '#0891b2' },
  { label: 'Net payroll', value: '2.11M MAD', color: '#7c3aed' },
  { label: 'Social charges', value: '612k MAD', color: '#f59e0b' },
  { label: 'Pending reviews', value: '3', color: '#ef4444' },
];

const PAYSLIPS = [
  { initials: 'AB', color: '#0891b2', name: 'Amira Benali', dept: 'Design', gross: '28 000 MAD', net: '21 000 MAD', status: 'ready' },
  { initials: 'YE', color: '#f59e0b', name: 'Youssef El Amrani', dept: 'Engineering', gross: '31 500 MAD', net: '23 800 MAD', status: 'ready' },
  { initials: 'CD', color: '#ec4899', name: 'Clara Dubois', dept: 'People', gross: '35 000 MAD', net: '26 600 MAD', status: 'ready' },
  { initials: 'OI', color: '#10b981', name: 'Omar Idrissi', dept: 'Sales', gross: '38 500 MAD', net: '29 400 MAD', status: 'ready' },
  { initials: 'LH', color: '#7c3aed', name: 'Leila Haddad', dept: 'Engineering', gross: '42 000 MAD', net: '32 200 MAD', status: 'ready' },
  { initials: 'JM', color: '#64748b', name: 'Julien Martin', dept: 'Marketing', gross: '45 500 MAD', net: '35 000 MAD', status: 'review' },
  { initials: 'SA', color: '#f97316', name: 'Sofia Alaoui', dept: 'Engineering', gross: '49 000 MAD', net: '37 800 MAD', status: 'review' },
];

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isReady = status === 'ready';
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: 5,
      background: isReady ? '#d1fae5' : '#fef3c7',
      color: isReady ? '#065f46' : '#92400e',
    }}>
      {status}
    </span>
  );
}

export default function PayrollPage() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Payroll"
        subtitle="April 2026 · closing in 4 days"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              border: '1px solid var(--border)', background: '#fff', borderRadius: 7,
              padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#475569', fontWeight: 500,
            }}>
              ↓ Export bank file
            </button>
            <button style={{
              background: '#0891b2', color: '#fff', border: 'none', borderRadius: 7,
              padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              Run payroll
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {STATS.map(s => (
          <div key={s.label} style={{
            flex: 1, background: '#fff', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 20px',
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Payslips table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Payslips · April 2026
        </div>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 120px 32px',
          padding: '9px 20px', borderBottom: '1px solid var(--border)',
          fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <span>Employee</span><span>Department</span><span>Gross</span><span>Net</span><span>Status</span><span />
        </div>
        {PAYSLIPS.map((p, i) => (
          <div key={p.name} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 120px 32px',
            alignItems: 'center', padding: '13px 20px',
            borderBottom: i < PAYSLIPS.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Avatar initials={p.initials} color={p.color} />
              <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{p.name}</span>
            </div>
            <span style={{ fontSize: 13, color: '#0891b2' }}>{p.dept}</span>
            <span style={{ fontSize: 13, color: '#0f172a' }}>{p.gross}</span>
            <span style={{ fontSize: 13, color: '#0891b2' }}>{p.net}</span>
            <StatusBadge status={p.status} />
            <span style={{ fontSize: 16, color: '#94a3b8', cursor: 'pointer' }}>···</span>
          </div>
        ))}
      </div>
    </div>
  );
}
