import React from 'react';
import { PageHeader } from '../../components/layout/AppShell';

const PIPELINE = [
  { label: 'Applied', count: 48, color: '#0891b2' },
  { label: 'Screening', count: 18, color: '#7c3aed' },
  { label: 'Interview', count: 9, color: '#f59e0b' },
  { label: 'Offer', count: 3, color: '#10b981' },
  { label: 'Hired', count: 2, color: '#22c55e' },
];

const CANDIDATES = [
  { initials: 'HA', color: '#0891b2', name: 'Hamza Akhiate', role: 'Senior Backend Engineer', stage: 'Interview', rating: 4.2 },
  { initials: 'SB', color: '#ec4899', name: 'Salma Berrada', role: 'Product Designer', stage: 'Interview', rating: 4.8 },
  { initials: 'AT', color: '#10b981', name: 'Ayoub Tazi', role: 'Data Analyst', stage: 'Screening', rating: 3.9 },
  { initials: 'IF', color: '#7c3aed', name: 'Imane Filali', role: 'Marketing Manager', stage: 'Offer', rating: 4.5 },
  { initials: 'RE', color: '#f59e0b', name: 'Rachid El Mansouri', role: 'DevOps', stage: 'Applied', rating: null },
];

const STAGE_COLORS: Record<string, string> = {
  Interview: '#dbeafe',
  Screening: '#f3e8ff',
  Offer: '#d1fae5',
  Applied: '#f1f5f9',
  Hired: '#dcfce7',
};
const STAGE_TEXT: Record<string, string> = {
  Interview: '#1d4ed8',
  Screening: '#7c3aed',
  Offer: '#065f46',
  Applied: '#475569',
  Hired: '#15803d',
};

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize: 13, color: '#f59e0b' }}>
      ★ <span style={{ color: '#475569', fontWeight: 500 }}>{rating}</span>
    </span>
  );
}

export default function RecruitmentPage() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Recruitment"
        subtitle="8 active openings · 80 candidates in pipeline"
        action={
          <button style={{
            background: '#0891b2', color: '#fff', border: 'none', borderRadius: 7,
            padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            + New opening
          </button>
        }
      />

      {/* Pipeline stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {PIPELINE.map(p => (
          <div key={p.label} style={{
            flex: 1, background: '#fff', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 20px',
            borderTop: `3px solid ${p.color}`,
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{p.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{p.count}</div>
          </div>
        ))}
      </div>

      {/* Top candidates */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Top candidates
        </div>
        {CANDIDATES.map((c, i) => (
          <div key={c.name} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 20px',
            borderBottom: i < CANDIDATES.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <Avatar initials={c.initials} color={c.color} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#0891b2' }}>{c.role}</div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 500,
              background: STAGE_COLORS[c.stage], color: STAGE_TEXT[c.stage],
              borderRadius: 5, padding: '2px 9px', marginRight: 12,
            }}>
              {c.stage}
            </span>
            {c.rating !== null && <Stars rating={c.rating} />}
            <button style={{
              marginLeft: 16, background: 'none', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: '#475569',
            }}>
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
