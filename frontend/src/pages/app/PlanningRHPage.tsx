import React, { useState } from 'react';
import { Clock, Calendar, Plus } from 'lucide-react';
import CreneauxRHPage from './CreneauxRHPage';
import CalendrierRHPage from './CalendrierRHPage';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { useLang } from '../../lib/lang';

type View = 'creneaux' | 'calendrier';

const TABS: { key: View; labelKey: 'creneaux_rh' | 'calendrier_rh'; icon: React.ReactNode }[] = [
  { key: 'creneaux',   labelKey: 'creneaux_rh',  icon: <Clock    size={15} strokeWidth={1.8} /> },
  { key: 'calendrier', labelKey: 'calendrier_rh', icon: <Calendar size={15} strokeWidth={1.8} /> },
];

export default function PlanningRHPage() {
  const { t } = useLang();
  const [view, setView] = useState<View>('creneaux');

  return (
    <Page>
      <PageHeader
        title={t('planning_rh')}
        subtitle="Entretiens, onboardings, formations et réunions de la semaine."
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 12px', borderRadius: 99, background: 'var(--success-soft)', color: 'var(--success-ink)', fontSize: 12.5, fontWeight: 600 }}>
              <span className="wedy-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-ink)' }} />
              Synchronisé avec Google Calendar
            </span>
            <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} strokeWidth={2.2} /> Nouvel événement
            </button>
          </div>
        }
      />

      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'var(--surface)', borderRadius: 14,
        border: '1px solid var(--border)', padding: 4,
        alignSelf: 'flex-start', marginBottom: 16,
      }}>
        {TABS.map(tab => {
          const active = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', fontSize: 13.5, fontWeight: 600,
                border: 'none', borderRadius: 10,
                background: active ? 'var(--ink-950)' : 'transparent',
                color: active ? '#fff' : 'var(--text-2)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {tab.icon}
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Page content */}
      <div style={{ display: view === 'creneaux' ? 'block' : 'none' }}>
        <CreneauxRHPage />
      </div>
      <div style={{ display: view === 'calendrier' ? 'block' : 'none' }}>
        <CalendrierRHPage />
      </div>
    </Page>
  );
}
