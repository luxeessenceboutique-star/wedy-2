import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, FileText, Wand2, TrendingUp, Clock, MessageSquare, Briefcase, ArrowRight, Bot } from 'lucide-react';
import { listEmployees, listDocuments, getDashboardMetrics, listRequests } from '../../lib/api';
import { Badge, Spinner, StatCard } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useLang } from '../../lib/lang';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: getDashboardMetrics,
  });
  const { data: docData, isLoading: docLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => listDocuments({ limit: 10 }),
  });
  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => listRequests({ limit: 5 }),
  });
  const { data: empData } = useQuery({
    queryKey: ['employees-expiring'],
    queryFn: () => listEmployees({ limit: 100 }),
  });

  const documents = docData?.data ?? [];
  const requests  = reqData?.data ?? [];
  const employees = empData?.data ?? [];

  const expiring = employees.filter(e => {
    if (!e.contract_end) return false;
    const diff = (new Date(e.contract_end).getTime() - Date.now()) / 86400000;
    return diff > 0 && diff <= 30;
  }).length;

  const firstName = (user?.profile?.full_name as string | undefined)?.split(' ')[0];

  return (
    <div style={{ padding: '0 30px 40px' }}>
      <PageHeader
        title={`${t('good_morning')}${firstName ? `, ${firstName}` : ''} 👋`}
        subtitle={t('dashboard_subtitle')}
      />

      {/* ── Stat cards ── */}
      {metricsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 30 }}>
          <StatCard
            icon={<Users size={19} />}
            label={t('total_employees_label')}
            value={metrics?.total_employees ?? 0}
            change={t('active_workforce')}
            to="/app/employees"
          />
          <StatCard
            icon={<Briefcase size={19} />}
            label={t('interns')}
            value={metrics?.total_interns ?? 0}
            color="var(--accent)"
            to="/app/interns"
          />
          <StatCard
            icon={<MessageSquare size={19} />}
            label={t('pending_requests_label')}
            value={metrics?.pending_requests ?? 0}
            color="var(--warn)"
            changePositive={false}
            to="/app/requests"
          />
          <StatCard
            icon={<Clock size={19} />}
            label={t('expiring_contracts')}
            value={expiring}
            color={expiring > 0 ? 'var(--danger)' : 'var(--ink-3)'}
            changePositive={false}
            to="/app/employees"
          />
        </div>
      )}

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 22 }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Recent documents */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 22px', borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>
                {t('recent_documents')}
              </span>
              <Link to="/app/history" style={{ fontSize: 12.5, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                {t('view_all')} <ArrowRight size={12} />
              </Link>
            </div>
            {docLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
            ) : documents.length === 0 ? (
              <div style={{ padding: '36px 24px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--primary)' }}>
                  <FileText size={18} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{t('no_documents')}</p>
                <Link to="/app/generate" style={{ fontSize: 13, color: 'var(--primary)' }}>{t('generate_first')}</Link>
              </div>
            ) : (
              <div>
                {documents.map((doc, i) => (
                  <div key={doc.id} style={{
                    padding: '13px 22px',
                    borderBottom: i < documents.length - 1 ? '1px solid var(--line)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'background .1s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: 'var(--primary-soft)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--primary)',
                    }}>
                      <FileText size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.document_type}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{doc.employees?.full_name || '—'}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Badge>{doc.language?.toUpperCase()}</Badge>
                      <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                        {format(new Date(doc.created_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending requests */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 22px', borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--ink)' }}>
                {t('pending_requests_section')}
              </span>
              <Link to="/app/requests" style={{ fontSize: 12.5, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                {t('manage')} <ArrowRight size={12} />
              </Link>
            </div>
            {reqLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
            ) : requests.length === 0 ? (
              <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>
                {t('no_pending_requests')}
              </div>
            ) : (
              <div>
                {requests.map((req, i) => (
                  <div key={req.id} style={{
                    padding: '13px 22px',
                    borderBottom: i < requests.length - 1 ? '1px solid var(--line)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'background .1s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--surface-2)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--ink-3)',
                    }}>
                      <MessageSquare size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{req.type}</p>
                      <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{req.profiles?.full_name || t('anonymous')}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Badge dot variant={req.status === 'pending' ? 'warning' : 'success'}>{req.status}</Badge>
                      <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>
                        {format(new Date(req.created_at), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quick actions */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '18px 18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 12 }}>
              {t('quick_actions')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { to: '/app/generate',  icon: <Wand2 size={15} />,    label: t('generate_document'), color: 'var(--primary)' },
                { to: '/app/employees', icon: <Users size={15} />,    label: t('add_employee'),      color: 'var(--accent)' },
                { to: '/app/copilot',   icon: <Bot size={15} />,      label: t('ask_ai_copilot'),    color: 'var(--violet)' },
                { to: '/app/analytics', icon: <TrendingUp size={15} />, label: t('view_analytics'),  color: 'var(--success)' },
              ].map(a => (
                <Link key={a.to} to={a.to} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 9,
                    border: '1px solid var(--line)',
                    transition: 'background .12s, border-color .12s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line-2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line)'; }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `color-mix(in oklab, ${a.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0 }}>
                      {a.icon}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{a.label}</span>
                    <ArrowRight size={12} style={{ marginLeft: 'auto', color: 'var(--ink-3)' }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Expiring contracts warning */}
          {expiring > 0 && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--warn-soft)',
              borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--warn-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warn)' }}>
                  <Clock size={14} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{t('expiring_soon')}</span>
                <Badge variant="warning" dot>{expiring}</Badge>
              </div>
              {employees
                .filter(e => { if (!e.contract_end) return false; const d = (new Date(e.contract_end).getTime() - Date.now()) / 86400000; return d > 0 && d <= 30; })
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.full_name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--warn)', background: 'var(--warn-soft)', padding: '2px 7px', borderRadius: 99, flexShrink: 0 }}>
                      {Math.ceil((new Date(e.contract_end!).getTime() - Date.now()) / 86400000)}{t('days_short')}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* AI Copilot promo */}
          <div style={{
            background: 'var(--grad)',
            borderRadius: 14, padding: '22px 20px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 14 }}>
                <Bot size={17} />
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8 }}>
                {t('ai_power_up')}
              </p>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.82)', lineHeight: 1.6, marginBottom: 18 }}>
                {t('ai_power_up_desc')}
              </p>
              <Link to="/app/copilot" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: '#fff', color: 'var(--primary)',
                borderRadius: 9, padding: '9px 16px',
                fontWeight: 600, fontSize: 13, textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,.15)',
              }}>
                {t('try_it_now')} <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
