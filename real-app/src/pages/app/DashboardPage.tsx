import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, FileText, Wand2, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { listEmployees, listDocuments, listTemplates } from '../../lib/api';
import { Card, Badge, Spinner } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

function StatCard({ icon, label, value, change, color = 'var(--primary)' }: {
  icon: React.ReactNode; label: string; value: string | number; change?: string; color?: string;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--fg)' }}>{value}</p>
          {change && <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>{change}</p>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `color-mix(in oklab, ${color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: empData, isLoading: empLoading } = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees({ limit: 200 }) });
  const { data: docData, isLoading: docLoading } = useQuery({ queryKey: ['documents'], queryFn: () => listDocuments({ limit: 200 }) });
  const { data: tplData } = useQuery({ queryKey: ['templates'], queryFn: () => listTemplates() });

  const employees = empData?.data ?? [];
  const documents = docData?.data ?? [];
  const templates = tplData?.data ?? [];

  const activeEmp = employees.filter(e => e.status === 'active').length;
  const thisMonth = documents.filter(d => new Date(d.created_at).getMonth() === new Date().getMonth()).length;
  const expiring = employees.filter(e => {
    if (!e.contract_end) return false;
    const diff = (new Date(e.contract_end).getTime() - Date.now()) / 86400000;
    return diff > 0 && diff <= 30;
  }).length;

  const recentDocs = documents.slice(0, 8);

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title={`Good morning${user?.profile?.full_name ? `, ${(user.profile.full_name as string).split(' ')[0]}` : ''} 👋`}
        subtitle="Here's what's happening across your HR operations today."
      />

      {/* Stats */}
      {(empLoading || docLoading) ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard icon={<Users size={18} />} label="Total Employees" value={employees.length} change={`${activeEmp} active`} />
          <StatCard icon={<FileText size={18} />} label="Docs This Month" value={thisMonth} color="var(--accent)" />
          <StatCard icon={<Wand2 size={18} />} label="Templates" value={templates.length} color="#10b981" />
          <StatCard icon={<AlertTriangle size={18} />} label="Expiring Contracts" value={expiring} color={expiring > 0 ? 'var(--warning)' : 'var(--fg-muted)'} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Recent documents */}
        <Card pad={false}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Recent Documents</span>
            <Link to="/app/history" style={{ fontSize: 13, color: 'var(--primary)' }}>View all →</Link>
          </div>
          {recentDocs.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
              No documents yet. <Link to="/app/generate" style={{ color: 'var(--primary)' }}>Generate your first →</Link>
            </div>
          ) : (
            <div>
              {recentDocs.map(doc => (
                <div key={doc.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={14} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.document_type}</p>
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{doc.employees?.full_name || '—'}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <Badge variant="default">{doc.language?.toUpperCase()}</Badge>
                    <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 3 }}>{new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick actions + expiring contracts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Quick Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/app/generate', icon: <Wand2 size={14} />, label: 'Generate document' },
                { to: '/app/employees', icon: <Users size={14} />, label: 'Add employee' },
                { to: '/app/copilot', icon: <TrendingUp size={14} />, label: 'Ask AI Copilot' },
                { to: '/app/analytics', icon: <TrendingUp size={14} />, label: 'View analytics' },
              ].map(a => (
                <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
                  <div className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'flex-start', fontSize: 13 }}>
                    <span style={{ color: 'var(--primary)' }}>{a.icon}</span>
                    {a.label}
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {expiring > 0 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Clock size={14} style={{ color: 'var(--warning)' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Expiring Soon</span>
                <Badge variant="warning">{expiring}</Badge>
              </div>
              {employees
                .filter(e => { if (!e.contract_end) return false; const diff = (new Date(e.contract_end).getTime() - Date.now()) / 86400000; return diff > 0 && diff <= 30; })
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>{e.full_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--warning)' }}>
                      {Math.ceil((new Date(e.contract_end!).getTime() - Date.now()) / 86400000)}d
                    </span>
                  </div>
                ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
