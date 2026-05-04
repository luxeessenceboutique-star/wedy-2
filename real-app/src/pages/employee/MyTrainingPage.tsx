import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { format, isValid } from 'date-fns';

const getMyTraining = () => api.get('/portal/me/training').then(r => r.data).catch(() => []);

const safeFormat = (d: any, fmt = 'dd/MM/yyyy') => {
  if (!d) return '—'; const dt = new Date(d);
  return isValid(dt) ? format(dt, fmt) : d;
};

const CATS: Record<string, { label: string; color: string; bg: string }> = {
  technique:   { label: 'Technique',   color: '#3b82f6', bg: '#eff6ff' },
  soft_skills: { label: 'Soft Skills', color: '#8b5cf6', bg: '#f5f3ff' },
  compliance:  { label: 'Conformité',  color: '#ef4444', bg: '#fef2f2' },
  management:  { label: 'Management',  color: '#f59e0b', bg: '#fffbeb' },
  langue:      { label: 'Langue',      color: '#10b981', bg: '#ecfdf5' },
  securite:    { label: 'Sécurité',    color: '#64748b', bg: '#f8fafc' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  planned:     { label: 'Planifié',  color: '#f59e0b', bg: '#fffbeb' },
  in_progress: { label: 'En cours',  color: '#3b82f6', bg: '#eff6ff' },
  completed:   { label: 'Terminé',   color: '#10b981', bg: '#ecfdf5' },
  cancelled:   { label: 'Annulé',    color: '#ef4444', bg: '#fef2f2' },
};

export default function MyTrainingPage() {
  const { data: training = [], isLoading } = useQuery({
    queryKey: ['portal-training'], queryFn: getMyTraining, retry: false,
  });

  const completed  = (training as any[]).filter((t: any) => t.status === 'completed').length;
  const inProgress = (training as any[]).filter((t: any) => t.status === 'in_progress').length;
  const planned    = (training as any[]).filter((t: any) => t.status === 'planned').length;

  const totalHours = (training as any[])
    .filter((t: any) => t.status === 'completed')
    .reduce((sum: number, t: any) => sum + (t.training_catalog?.duration_hours ?? 0), 0);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 780, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Ma Formation</h1>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 24 }}>Formations assignées par votre responsable RH</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total assignées',  value: (training as any[]).length, color: '#3b82f6', icon: <BookOpen size={16} /> },
          { label: 'En cours',         value: inProgress,                 color: '#f59e0b', icon: <Clock size={16} /> },
          { label: 'Terminées',        value: completed,                  color: '#10b981', icon: <CheckCircle size={16} /> },
          { label: 'Heures validées',  value: `${totalHours}h`,           color: '#8b5cf6', icon: <Clock size={16} /> },
        ].map(s => (
          <div key={s.label} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'var(--fg-muted)', margin: 0 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : (training as any[]).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <BookOpen size={40} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 500 }}>Aucune formation assignée.</p>
          <p style={{ fontSize: 13 }}>Votre responsable RH vous assignera des formations selon votre plan de développement.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(training as any[]).map((t: any) => {
            const cat   = CATS[t.training_catalog?.category ?? ''] ?? CATS.technique;
            const sm    = STATUS_META[t.status] ?? STATUS_META.planned;
            const tc    = t.training_catalog ?? {};
            return (
              <div key={t.id} style={{
                padding: '16px 18px', border: '1px solid var(--border)',
                borderLeft: `4px solid ${cat.color}`,
                borderRadius: 12, background: 'var(--bg-elev)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, background: cat.bg, padding: '2px 8px', borderRadius: 5 }}>{cat.label}</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{tc.title ?? '—'}</span>
                    </div>
                    {tc.provider && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>Organisme : {tc.provider}</p>}
                    {tc.description && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>{tc.description}</p>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg, padding: '4px 10px', borderRadius: 20, flexShrink: 0, marginLeft: 12 }}>
                    {sm.label}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--fg-muted)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  {tc.duration_hours && <span><Clock size={11} /> {tc.duration_hours}h</span>}
                  <span>Assignée le {safeFormat(t.assigned_at)}</span>
                  {t.completed_at && <span><CheckCircle size={11} /> Terminée le {safeFormat(t.completed_at)}</span>}
                </div>

                {/* Completion progress bar */}
                {t.status === 'in_progress' && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 4 }}>
                      <div style={{ height: 4, width: '40%', background: '#3b82f6', borderRadius: 4 }} />
                    </div>
                  </div>
                )}
                {t.status === 'completed' && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 4, background: '#a7f3d0', borderRadius: 4 }}>
                      <div style={{ height: 4, width: '100%', background: '#10b981', borderRadius: 4 }} />
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
