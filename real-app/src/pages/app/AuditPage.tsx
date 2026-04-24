import React from 'react';
import { PageHeader } from '../../components/layout/AppShell';

const LOGS = [
  { actor: 'Fatima Khalil', action: 'Generated', target: 'Attestation de travail for Amira Benali', time: '2026-04-23  14:23', actionColor: '#0891b2' },
  { actor: 'Omar Idrissi', action: 'Approved', target: 'Time off request from Leila Haddad', time: '2026-04-23  11:08', actionColor: '#22c55e' },
  { actor: 'AI Copilot', action: 'Enhanced', target: 'Avenant for Youssef El Amrani', time: '2026-04-23  10:42', actionColor: '#7c3aed' },
  { actor: 'Fatima Khalil', action: 'Updated', target: 'Employee record · Sofia Alaoui', time: '2026-04-22  16:55', actionColor: '#f59e0b' },
  { actor: 'System', action: 'Synced', target: '247 employees from Okta', time: '2026-04-22  06:00', actionColor: '#64748b' },
  { actor: 'Karim Benjelloun', action: 'Exported', target: 'Payroll Q1 2026 to bank file', time: '2026-04-21  17:40', actionColor: '#64748b' },
  { actor: 'Fatima Khalil', action: 'Deleted', target: 'Template v2 · Attestation draft', time: '2026-04-21  09:12', actionColor: '#ef4444' },
];

function ActionBadge({ action, color }: { action: string; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: 5,
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>
      {action}
    </span>
  );
}

export default function AuditPage() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Audit log"
        subtitle="Every action, recorded and cryptographically chained · SOC 2 ready"
        action={
          <button style={{
            border: '1px solid var(--border)', background: '#fff', borderRadius: 7,
            padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#475569', fontWeight: 500,
          }}>
            ↓ Export CSV
          </button>
        }
      />

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '200px 130px 1fr 170px',
          padding: '10px 20px', borderBottom: '1px solid var(--border)',
          fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <span>Actor</span><span>Action</span><span>Target</span><span>Timestamp</span>
        </div>
        {LOGS.map((l, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '200px 130px 1fr 170px',
            alignItems: 'center', padding: '14px 20px',
            borderBottom: i < LOGS.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{l.actor}</span>
            <ActionBadge action={l.action} color={l.actionColor} />
            <span style={{ fontSize: 13, color: '#0891b2' }}>{l.target}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{l.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
