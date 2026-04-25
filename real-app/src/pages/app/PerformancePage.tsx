import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Star } from 'lucide-react';
import { listEmployees } from '../../lib/api';
import { Card, Badge, Spinner } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';

function Stars({ score }: { score: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={13} fill={i <= score ? 'var(--warning)' : 'none'} style={{ color: i <= score ? 'var(--warning)' : 'var(--border-strong)' }} />
      ))}
    </div>
  );
}

const SCORE_LABEL: Record<number, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  5: { label: 'Exceptionnel', variant: 'success' },
  4: { label: 'Très bien', variant: 'success' },
  3: { label: 'Satisfaisant', variant: 'default' },
  2: { label: 'À améliorer', variant: 'warning' },
  1: { label: 'Insuffisant', variant: 'danger' },
};

// Mock reviews — will be replaced by real API once performance_reviews backend endpoint is added
const MOCK_SCORES: Record<string, number> = {};

function randomScore(id: string) {
  if (!MOCK_SCORES[id]) MOCK_SCORES[id] = Math.floor(Math.random() * 5) + 1;
  return MOCK_SCORES[id];
}

export default function PerformancePage() {
  const [period, setPeriod] = useState(`${new Date().getFullYear()}-S1`);

  const { data, isLoading } = useQuery({
    queryKey: ['employees-perf'],
    queryFn: () => listEmployees({ limit: 50, status: 'active' }),
  });

  const employees = data?.data ?? [];

  const periods = [
    `${new Date().getFullYear()}-S1`,
    `${new Date().getFullYear()}-S2`,
    `${new Date().getFullYear() - 1}-S2`,
    `${new Date().getFullYear() - 1}-S1`,
  ];

  const avgScore = employees.length > 0
    ? (employees.reduce((s, e) => s + randomScore(e.id), 0) / employees.length).toFixed(1)
    : '—';

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Performance"
        subtitle={`Évaluations ${period} · ${employees.length} employé(s)`}
        action={
          <select className="select" style={{ width: 160 }} value={period} onChange={e => setPeriod(e.target.value)}>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        }
      />

      {/* KPI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Score moyen', value: avgScore + ' / 5', color: 'var(--success)' },
          { label: 'Évaluations', value: employees.length, color: 'var(--primary)' },
          { label: 'Exceptionnels', value: employees.filter(e => randomScore(e.id) === 5).length, color: 'var(--success)' },
          { label: 'À améliorer', value: employees.filter(e => randomScore(e.id) <= 2).length, color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card pad={false}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 120px 100px 140px', gap: 12, fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Employé</span><span>Département</span><span>Score</span><span>Évaluation</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
            <TrendingUp size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>Aucun employé actif trouvé.</p>
          </div>
        ) : (
          employees.map((emp, i) => {
            const score = randomScore(emp.id);
            const info = SCORE_LABEL[score];
            return (
              <div key={emp.id} style={{
                padding: '13px 20px',
                borderBottom: i < employees.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'grid', gridTemplateColumns: '1fr 120px 100px 140px', gap: 12,
                alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{emp.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{emp.position || '—'}</p>
                </div>
                <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{emp.department || '—'}</span>
                <Stars score={score} />
                <Badge variant={info.variant}>{info.label}</Badge>
              </div>
            );
          })
        )}
      </Card>

      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--primary-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', fontSize: 12, color: 'var(--primary)' }}>
        Les évaluations seront connectées à la base de données une fois les entretiens annuels saisis. Cette vue affiche un aperçu temporaire.
      </div>
    </div>
  );
}
