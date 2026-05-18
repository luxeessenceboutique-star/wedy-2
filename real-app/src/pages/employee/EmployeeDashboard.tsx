import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, FileText, BookOpen, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Spinner } from '../../components/ui';
import { useLang } from '../../lib/lang';

const getMyProfile = () => api.get('/portal/me').then(r => r.data).catch(() => null);
const getMyStats   = () => api.get('/portal/me/stats').then(r => r.data).catch(() => ({}));
const getMyLeaves  = () => api.get('/portal/me/leaves').then(r => r.data).catch(() => []);
const getMyOKRs    = () => api.get('/portal/me/okrs').then(r => r.data).catch(() => []);

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const fullName = (user as any)?.full_name || user?.email?.split('@')[0] || t('role_employee_label');

  const { data: profile } = useQuery({ queryKey: ['portal-me'], queryFn: getMyProfile, retry: false });
  const { data: stats = {}, isLoading: statsLoading } = useQuery({ queryKey: ['portal-stats'], queryFn: getMyStats, retry: false });
  const { data: leaves = [] } = useQuery({ queryKey: ['portal-leaves'], queryFn: getMyLeaves, retry: false });
  const { data: okrs = [] } = useQuery({ queryKey: ['portal-okrs'], queryFn: getMyOKRs, retry: false });

  const recentLeaves = (leaves as any[]).slice(0, 3);
  const activeOKRs = (okrs as any[]).filter((o: any) => o.status === 'active').slice(0, 3);

  const LEAVE_TYPE_LABELS: Record<string, string> = {
    annual:    t('leave_type_annual'),
    sick:      t('leave_type_sick'),
    personal:  t('leave_type_personal'),
    maternity: t('leave_type_maternity'),
    paternity: t('leave_type_paternity'),
    unpaid:    t('leave_type_unpaid'),
  };

  const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:  { label: t('leave_pending'),  color: '#f59e0b', bg: '#fffbeb', icon: <Clock size={12} /> },
    approved: { label: t('leave_approved'), color: '#10b981', bg: '#ecfdf5', icon: <CheckCircle size={12} /> },
    rejected: { label: t('leave_rejected'), color: '#ef4444', bg: '#fef2f2', icon: <AlertCircle size={12} /> },
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Welcome */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #0891b2 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
            {t('emp_hello')}, {profile?.full_name || fullName} 👋
          </h1>
          <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>
            {profile?.position ? `${profile.position} · ` : ''}{profile?.department ?? ''}
          </p>
        </div>
        {profile?.hire_date && (
          <div style={{ textAlign: 'right', opacity: 0.85 }}>
            <p style={{ fontSize: 12, margin: 0 }}>{t('emp_since')}</p>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
              {new Date(profile.hire_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: t('emp_leaves_pending'),      value: (stats as any).leaves_pending ?? 0,    color: '#f59e0b', icon: <Clock size={18} />,      link: '/employee/conges' },
            { label: t('emp_leaves_approved'),     value: (stats as any).leaves_approved ?? 0,   color: '#10b981', icon: <CheckCircle size={18} />, link: '/employee/conges' },
            { label: t('emp_trainings_assigned'),  value: (stats as any).training_planned ?? 0,  color: '#8b5cf6', icon: <BookOpen size={18} />,    link: '/employee/formation' },
          ].map(s => (
            <Link key={s.label} to={s.link} style={{ textDecoration: 'none' }}>
              <div className="card card-pad hover-scale" style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{s.label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Quick Actions */}
        <div className="card card-pad">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{t('emp_quick_actions')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/employee/conges" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', cursor: 'pointer' }}>
                <Calendar size={16} style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>{t('emp_request_leave')}</span>
              </div>
            </Link>
            <Link to="/employee/documents" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', cursor: 'pointer' }}>
                <FileText size={16} style={{ color: '#8b5cf6' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#8b5cf6' }}>{t('emp_request_doc')}</span>
              </div>
            </Link>
            <Link to="/employee/formation" style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', cursor: 'pointer' }}>
                <BookOpen size={16} style={{ color: '#10b981' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{t('emp_see_trainings')}</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Leave Requests */}
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{t('emp_recent_requests')}</h3>
            <Link to="/employee/conges" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>{t('view_all')}</Link>
          </div>
          {recentLeaves.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center', padding: '16px 0' }}>{t('emp_no_requests')}</p>
          ) : recentLeaves.map((l: any) => {
            const sm = STATUS_META[l.status] ?? STATUS_META.pending;
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 2px' }}>{LEAVE_TYPE_LABELS[l.type] ?? l.type}</p>
                  <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>
                    {l.start_date} → {l.end_date} · {l.days} {t('myleave_days')}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg, padding: '2px 8px', borderRadius: 5 }}>
                  {sm.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* OKRs */}
        {activeOKRs.length > 0 && (
          <div className="card card-pad" style={{ gridColumn: '1/-1' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={15} style={{ color: '#8b5cf6' }} /> {t('talent_okrs')}
            </h3>
            {activeOKRs.map((okr: any) => (
              <div key={okr.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', padding: '1px 6px', borderRadius: 4, marginRight: 8 }}>{okr.quarter}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{okr.title}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>{okr.progress}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 6 }}>
                  <div style={{ height: 6, width: `${okr.progress}%`, background: okr.progress >= 100 ? '#10b981' : '#8b5cf6', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
