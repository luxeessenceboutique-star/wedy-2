import React from 'react';
import { PageHeader } from '../../components/layout/AppShell';

const STATS = [
  { label: 'Headcount', value: '247', change: '+12% YoY', up: true },
  { label: 'Turnover', value: '8.2%', change: '−2.1 pt YoY', up: false },
  { label: 'Avg tenure', value: '2.3y', change: '+0.4 YoY', up: true },
  { label: 'Gender parity', value: '47 / 53', change: 'Improving', up: true },
];

const HEADCOUNT = [32, 34, 35, 36, 38, 40, 42, 44, 46, 50, 52, 54, 58, 62];
const DOCS_PER_MONTH = [12, 15, 14, 18, 20, 22, 24, 24, 30, 28, 35, 42, 48, 58];

const MONTHS = ['M', 'J', 'J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M', 'A'];

function BarChart({ data, color, months }: { data: number[]; color: string; months: string[] }) {
  const max = Math.max(...data);
  const barW = 36;
  const gap = 8;
  const h = 120;
  const total = data.length * (barW + gap) - gap;

  return (
    <svg width={total} height={h + 20} style={{ overflow: 'visible' }}>
      {data.map((v, i) => {
        const barH = (v / max) * h;
        const x = i * (barW + gap);
        const y = h - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} />
            <text x={x + barW / 2} y={h + 14} textAnchor="middle" fontSize={11} fill="#94a3b8">
              {months[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AnalyticsPage() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Analytics" subtitle="People insights · refreshed every hour" />

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {STATS.map(s => (
          <div key={s.label} style={{
            flex: 1, background: '#fff', border: '1px solid var(--border)',
            borderRadius: 10, padding: '18px 20px',
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.up ? '#16a34a' : '#dc2626' }}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{
          flex: 1, background: '#fff', border: '1px solid var(--border)',
          borderRadius: 10, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>Headcount evolution</div>
          <div style={{ overflowX: 'auto' }}>
            <BarChart data={HEADCOUNT} color="#0891b2" months={MONTHS} />
          </div>
        </div>
        <div style={{
          flex: 1, background: '#fff', border: '1px solid var(--border)',
          borderRadius: 10, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>Documents per month</div>
          <div style={{ overflowX: 'auto' }}>
            <BarChart data={DOCS_PER_MONTH} color="#7c3aed" months={MONTHS} />
          </div>
        </div>
      </div>
    </div>
  );
}
