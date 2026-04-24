import React from 'react';
import { PageHeader } from '../../components/layout/AppShell';

const REVIEWS = [
  { initials: 'AB', color: '#0891b2', name: 'Amira Benali', reviewer: 'Omar Idrissi', pct: 100 },
  { initials: 'YE', color: '#f59e0b', name: 'Youssef El Amrani', reviewer: 'Omar Idrissi', pct: 80 },
  { initials: 'CD', color: '#ec4899', name: 'Clara Dubois', reviewer: 'Omar Idrissi', pct: 60 },
  { initials: 'OI', color: '#10b981', name: 'Omar Idrissi', reviewer: 'Omar Idrissi', pct: 40 },
  { initials: 'LH', color: '#7c3aed', name: 'Leila Haddad', reviewer: 'Omar Idrissi', pct: 20 },
  { initials: 'JM', color: '#64748b', name: 'Julien Martin', reviewer: 'Omar Idrissi', pct: 0 },
];

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

const DONUT_R = 52;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;

export default function PerformancePage() {
  const pct = 73;
  const dash = (pct / 100) * DONUT_CIRC;

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Performance" subtitle="Q2 2026 review cycle · 247 employees · 73% complete" />

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Reviews list */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            Current reviews
          </div>
          {REVIEWS.map((r, i) => (
            <div key={r.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 20px',
              borderBottom: i < REVIEWS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <Avatar initials={r.initials} color={r.color} />
              <div style={{ width: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Reviewer: {r.reviewer}</div>
              </div>
              <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  width: `${r.pct}%`,
                  background: r.pct === 100 ? '#22c55e' : '#0891b2',
                  transition: 'width 0.4s',
                }} />
              </div>
              <span style={{ fontSize: 12, color: '#475569', width: 36, textAlign: 'right' }}>{r.pct}%</span>
            </div>
          ))}
        </div>

        {/* Cycle progress donut */}
        <div style={{
          width: 240, background: '#fff', border: '1px solid var(--border)',
          borderRadius: 10, padding: '20px', textAlign: 'center', flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Cycle progress</div>
          <svg width={128} height={128} viewBox="0 0 128 128" style={{ display: 'block', margin: '0 auto 12px' }}>
            <circle cx={64} cy={64} r={DONUT_R} fill="none" stroke="#e2e8f0" strokeWidth={12} />
            <circle
              cx={64} cy={64} r={DONUT_R} fill="none"
              stroke="#0891b2" strokeWidth={12}
              strokeDasharray={`${dash} ${DONUT_CIRC - dash}`}
              strokeLinecap="round"
              transform="rotate(-90 64 64)"
            />
            <text x={64} y={60} textAnchor="middle" fontSize={20} fontWeight={700} fill="#0f172a">{pct}%</text>
            <text x={64} y={76} textAnchor="middle" fontSize={11} fill="#94a3b8">Complete</text>
          </svg>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
            181 of 247 reviews submitted. Cycle closes May 15.
          </p>
        </div>
      </div>
    </div>
  );
}
