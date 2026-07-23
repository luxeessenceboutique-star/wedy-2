import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, CheckCircle } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '../../components/ui';
import { format, isValid } from 'date-fns';
import { useLang } from '../../lib/lang';

const getMyTraining = () => api.get('/portal/me/training').then(r => r.data).catch(() => []);

const safeFormat = (d: any, fmt = 'dd/MM/yyyy') => {
  if (!d) return '—'; const dt = new Date(d);
  return isValid(dt) ? format(dt, fmt) : d;
};

export default function MyTrainingPage() {
  const { t } = useLang();
  const { data: training = [], isLoading } = useQuery({
    queryKey: ['portal-training'], queryFn: getMyTraining, retry: false,
  });

  const CATS: Record<string, { label: string; color: string; bg: string }> = {
    technique:   { label: t('training_cat_technique'),   color: 'var(--primary)', bg: 'var(--primary-soft)' },
    soft_skills: { label: t('training_cat_soft_skills'), color: 'var(--violet)', bg: 'var(--violet-soft)' },
    compliance:  { label: t('training_cat_compliance'),  color: 'var(--danger)', bg: '#fef2f2' },
    management:  { label: t('training_cat_management'),  color: 'var(--warn)', bg: 'var(--warn-soft)' },
    langue:      { label: t('training_cat_langue'),      color: 'var(--success)', bg: 'var(--success-soft)' },
    securite:    { label: t('training_cat_securite'),    color: 'var(--ink-2)', bg: 'var(--surface-2)' },
  };

  const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    planned:     { label: t('training_status_planned'),   color: 'var(--warn)', bg: 'var(--warn-soft)' },
    in_progress: { label: t('training_status_ongoing'),   color: 'var(--primary)', bg: 'var(--primary-soft)' },
    completed:   { label: t('training_status_done'),      color: 'var(--success)', bg: 'var(--success-soft)' },
    cancelled:   { label: t('training_status_cancelled'), color: 'var(--danger)', bg: '#fef2f2' },
  };

  const completed  = (training as any[]).filter((tr: any) => tr.status === 'completed').length;
  const inProgress = (training as any[]).filter((tr: any) => tr.status === 'in_progress').length;

  const totalHours = (training as any[])
    .filter((tr: any) => tr.status === 'completed')
    .reduce((sum: number, tr: any) => sum + (tr.training_catalog?.duration_hours ?? 0), 0);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 780, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{t('mytrain_title')}</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 24 }}>{t('mytrain_subtitle')}</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: t('mytrain_total'),           value: (training as any[]).length, color: 'var(--primary)', icon: <BookOpen size={16} /> },
          { label: t('mytrain_in_progress'),     value: inProgress,                 color: 'var(--warn)', icon: <Clock size={16} /> },
          { label: t('mytrain_completed_count'), value: completed,                  color: 'var(--success)', icon: <CheckCircle size={16} /> },
          { label: t('mytrain_hours_done'),      value: `${totalHours}h`,           color: 'var(--violet)', icon: <Clock size={16} /> },
        ].map(s => (
          <div key={s.label} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'var(--ink-2)', margin: 0 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : (training as any[]).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-2)' }}>
          <BookOpen size={40} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 500 }}>{t('mytrain_empty')}</p>
          <p style={{ fontSize: 13 }}>{t('mytrain_empty_desc')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(training as any[]).map((tr: any) => {
            const cat = CATS[tr.training_catalog?.category ?? ''] ?? CATS.technique;
            const sm  = STATUS_META[tr.status] ?? STATUS_META.planned;
            const tc  = tr.training_catalog ?? {};
            return (
              <div key={tr.id} style={{
                padding: '16px 18px', border: '1px solid var(--line)',
                borderLeft: `4px solid ${cat.color}`,
                borderRadius: 12, background: 'var(--surface)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, background: cat.bg, padding: '2px 8px', borderRadius: 5 }}>{cat.label}</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{tc.title ?? '—'}</span>
                    </div>
                    {tc.provider    && <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0 }}>{t('mytrain_provider_prefix')} {tc.provider}</p>}
                    {tc.description && <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '4px 0 0', lineHeight: 1.4 }}>{tc.description}</p>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg, padding: '4px 10px', borderRadius: 20, flexShrink: 0, marginLeft: 12 }}>
                    {sm.label}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-2)', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                  {tc.duration_hours && <span><Clock size={11} /> {tc.duration_hours}h</span>}
                  <span>{t('mytrain_assigned_on')} {safeFormat(tr.assigned_at)}</span>
                  {tr.completed_at && <span><CheckCircle size={11} /> {t('mytrain_completed_on')} {safeFormat(tr.completed_at)}</span>}
                </div>

                {tr.status === 'in_progress' && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 4, background: 'var(--line)', borderRadius: 4 }}>
                      <div style={{ height: 4, width: '40%', background: 'var(--primary)', borderRadius: 4 }} />
                    </div>
                  </div>
                )}
                {tr.status === 'completed' && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 4, background: '#a7f3d0', borderRadius: 4 }}>
                      <div style={{ height: 4, width: '100%', background: 'var(--success)', borderRadius: 4 }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
