import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsOverview, getHeadcountTrend, getDocumentsTrend, getLeaveStats } from '../../lib/api';
import { Card, Spinner } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { Users, FileText, Clock, TrendingUp, AlertTriangle, UserX } from 'lucide-react';

function StatCard({ label, value, sub, icon, color = 'var(--primary)' }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)' }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: `color-mix(in oklab, ${color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, color }: { data: { label: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const h = 100;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: h + 28, overflowX: 'auto' }}>
      {data.map((d, i) => {
        const barH = Math.max((d.count / max) * h, d.count > 0 ? 4 : 0);
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32 }}>
            <div title={`${d.label}: ${d.count}`} style={{
              width: 28, height: barH, background: color,
              borderRadius: 4, cursor: 'default',
              transition: 'height 0.3s',
            }} />
            <span style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 6, whiteSpace: 'nowrap' }}>
              {d.label.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Aucune donnée</p>;

  let offset = 0;
  const r = 40, cx = 50, cy = 50, stroke = 18;
  const circ = 2 * Math.PI * r;

  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const dash = circ * pct;
    const gap = circ - dash;
    const el = (
      <circle key={i} cx={cx} cy={cy} r={r} fill="none"
        stroke={colors[i % colors.length]}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        style={{ transition: 'all 0.3s' }}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={100} height={100} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        {slices}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ color: 'var(--fg-muted)' }}>{d.label}</span>
            <span style={{ color: 'var(--fg)', fontWeight: 600, marginLeft: 'auto' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CONTRACT_COLORS: Record<string, string> = {
  CDI: '#0891b2', CDD: '#7c3aed', Stage: '#f59e0b',
  Freelance: '#10b981', ANAPEC: '#ec4899', Consultant: '#64748b',
};
const DEPT_COLORS = ['#0891b2','#7c3aed','#f59e0b','#10b981','#ec4899','#64748b','#ef4444','#06b6d4'];

export default function AnalyticsPage() {
  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['analytics-overview'], queryFn: getAnalyticsOverview,
  });
  const { data: headcount } = useQuery({
    queryKey: ['analytics-headcount'], queryFn: getHeadcountTrend,
  });
  const { data: docsT } = useQuery({
    queryKey: ['analytics-docs'], queryFn: getDocumentsTrend,
  });

  if (ovLoading) return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Analytics" subtitle="Données RH en temps réel" />
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>
    </div>
  );

  const ov = overview!;

  const contractData = Object.entries(ov?.contract_breakdown ?? {}).map(([label, value]) => ({ label, value }));
  const contractColors = contractData.map(d => CONTRACT_COLORS[d.label] || '#94a3b8');

  const deptData = Object.entries(ov?.department_breakdown ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Analytics" subtitle="Données RH en temps réel · mise à jour continue" />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Effectif actif" value={ov?.total_employees ?? 0} icon={<Users size={17} />} color="var(--primary)" />
        <StatCard label="Stagiaires" value={ov?.total_interns ?? 0} icon={<Users size={17} />} color="var(--accent)" />
        <StatCard label="En congé" value={ov?.on_leave ?? 0} icon={<Clock size={17} />} color="var(--warning)" />
        <StatCard label="Contrats exp." value={ov?.expiring_contracts ?? 0} sub="dans 30 jours" icon={<AlertTriangle size={17} />} color="var(--danger)" />
        <StatCard label="Docs ce mois" value={ov?.docs_this_month ?? 0} icon={<FileText size={17} />} color="var(--success)" />
        <StatCard label="Congés en att." value={ov?.pending_leaves ?? 0} icon={<TrendingUp size={17} />} color="var(--warning)" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 20 }}>Évolution des effectifs (12 mois)</p>
          {headcount?.trend ? (
            <BarChart data={headcount.trend} color="var(--primary)" />
          ) : <Spinner />}
        </Card>

        <Card>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 20 }}>Documents générés (12 mois)</p>
          {docsT?.trend ? (
            <BarChart data={docsT.trend} color="var(--accent)" />
          ) : <Spinner />}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 20 }}>Répartition par type de contrat</p>
          {contractData.length > 0 ? (
            <DonutChart data={contractData} colors={contractColors} />
          ) : <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Aucune donnée</p>}
        </Card>

        <Card>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 20 }}>Top départements</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deptData.map((d, i) => {
              const pct = ov?.total_employees ? Math.round((d.value / ov.total_employees) * 100) : 0;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--fg)' }}>{d.label}</span>
                    <span style={{ color: 'var(--fg-muted)' }}>{d.value} ({pct}%)</span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 999, height: 5 }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Expiring contracts */}
      {(ov?.expiring_list?.length ?? 0) > 0 && (
        <Card pad={false}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Contrats expirant dans 30 jours</span>
          </div>
          <div>
            {ov.expiring_list.map((item, i) => (
              <div key={i} style={{ padding: '12px 20px', borderBottom: i < ov.expiring_list.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{item.employee.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{item.employee.position} · {item.employee.department}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: item.days_left <= 7 ? 'var(--danger)' : 'var(--warning)', background: item.days_left <= 7 ? '#fee2e2' : '#fef3c7', padding: '3px 10px', borderRadius: 999 }}>
                  J-{item.days_left}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
