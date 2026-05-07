import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, FileText, Wand2, TrendingUp, Clock, MessageSquare, Briefcase } from 'lucide-react';
import { listEmployees, listDocuments, getDashboardMetrics, listRequests } from '../../lib/api';
import { Card, Badge, Spinner } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useLang } from '../../lib/lang';
import { format } from 'date-fns';

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
  const { t } = useLang();
  
  // Fetch real-time metrics from the dashboard endpoint
  const { data: metrics, isLoading: metricsLoading } = useQuery({ 
    queryKey: ['dashboard-metrics'], 
    queryFn: getDashboardMetrics 
  });

  const { data: docData, isLoading: docLoading } = useQuery({ 
    queryKey: ['documents'], 
    queryFn: () => listDocuments({ limit: 10 }) 
  });

  const { data: reqData, isLoading: reqLoading } = useQuery({ 
    queryKey: ['requests'], 
    queryFn: () => listRequests({ limit: 5 }) 
  });

  const { data: empData } = useQuery({ 
    queryKey: ['employees-expiring'], 
    queryFn: () => listEmployees({ limit: 100 }) 
  });

  const documents = docData?.data ?? [];
  const requests = reqData?.data ?? [];
  const employees = empData?.data ?? [];

  const expiring = employees.filter(e => {
    if (!e.contract_end) return false;
    const diff = (new Date(e.contract_end).getTime() - Date.now()) / 86400000;
    return diff > 0 && diff <= 30;
  }).length;

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title={`${t('good_morning')}${user?.profile?.full_name ? `, ${(user.profile.full_name as string).split(' ')[0]}` : ''} 👋`}
        subtitle={t('dashboard_subtitle')}
      />

      {/* Stats */}
      {metricsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard icon={<Users size={18} />} label={t('total_employees_label')} value={metrics?.total_employees || 0} change={t('active_workforce')} />
          <StatCard icon={<Briefcase size={18} />} label={t('interns')} value={metrics?.total_interns || 0} color="var(--accent)" />
          <StatCard icon={<MessageSquare size={18} />} label={t('pending_requests_label')} value={metrics?.pending_requests || 0} color="var(--warning)" />
          <StatCard icon={<FileText size={18} />} label={t('expiring_contracts')} value={expiring} color={expiring > 0 ? 'var(--danger)' : 'var(--fg-muted)'} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recent documents */}
          <Card pad={false}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t('recent_documents')}</span>
              <Link to="/app/history" style={{ fontSize: 13, color: 'var(--primary)' }}>{t('view_all')}</Link>
            </div>
            {docLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            ) : documents.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                {t('no_documents')} <Link to="/app/generate" style={{ color: 'var(--primary)' }}>{t('generate_first')}</Link>
              </div>
            ) : (
              <div>
                {documents.map(doc => (
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
                      <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 3 }}>{format(new Date(doc.created_at), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Requests */}
          <Card pad={false}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t('pending_requests_section')}</span>
              <Link to="/app/requests" style={{ fontSize: 13, color: 'var(--primary)' }}>{t('manage')}</Link>
            </div>
            {reqLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            ) : requests.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                {t('no_pending_requests')}
              </div>
            ) : (
              <div>
                {requests.map(req => (
                  <div key={req.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MessageSquare size={14} style={{ color: 'var(--fg-muted)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{req.type}</p>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{req.profiles?.full_name || t('anonymous')}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Badge variant={req.status === 'pending' ? 'warning' : 'success'}>{req.status}</Badge>
                      <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 3 }}>{format(new Date(req.created_at), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>{t('quick_actions')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/app/generate', icon: <Wand2 size={14} />, label: t('generate_document') },
                { to: '/app/employees', icon: <Users size={14} />, label: t('add_employee') },
                { to: '/app/copilot', icon: <TrendingUp size={14} />, label: t('ask_ai_copilot') },
                { to: '/app/analytics', icon: <TrendingUp size={14} />, label: t('view_analytics') },
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
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t('expiring_soon')}</span>
                <Badge variant="warning">{expiring}</Badge>
              </div>
              {employees
                .filter(e => { if (!e.contract_end) return false; const diff = (new Date(e.contract_end).getTime() - Date.now()) / 86400000; return diff > 0 && diff <= 30; })
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>{e.full_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--warning)' }}>
                      {Math.ceil((new Date(e.contract_end!).getTime() - Date.now()) / 86400000)}{t('days_short')}
                    </span>
                  </div>
                ))}
            </Card>
          )}

          <div style={{ background: 'var(--primary)', borderRadius: 'var(--radius-lg)', padding: 20, color: 'white', position: 'relative', overflow: 'hidden' }}>
             <div style={{ position: 'relative', zIndex: 1 }}>
               <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{t('ai_power_up')}</p>
               <p style={{ fontSize: 12, opacity: 0.9, marginBottom: 16 }}>{t('ai_power_up_desc')}</p>
               <Link to="/app/copilot" className="btn" style={{ background: 'white', color: 'var(--primary)', border: 'none', width: '100%', justifyContent: 'center' }}>{t('try_it_now')}</Link>
             </div>
             <TrendingUp size={80} style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1, transform: 'rotate(-15deg)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
