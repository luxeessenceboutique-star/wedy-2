import React, { useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import CreneauxRHPage from './CreneauxRHPage';
import CalendrierRHPage from './CalendrierRHPage';
import { useLang } from '../../lib/lang';

type View = 'creneaux' | 'calendrier';

const TABS: { key: View; labelKey: 'creneaux_rh' | 'calendrier_rh'; icon: React.ReactNode }[] = [
  { key: 'creneaux',   labelKey: 'creneaux_rh',   icon: <Clock    size={15} /> },
  { key: 'calendrier', labelKey: 'calendrier_rh',  icon: <Calendar size={15} /> },
];

export default function PlanningRHPage() {
  const { t } = useLang();
  const [view, setView] = useState<View>('creneaux');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '0 24px',
        background: 'var(--bg-elev)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {TABS.map(tab => {
          const active = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '12px 18px',
                fontSize: 13, fontWeight: active ? 700 : 500,
                border: 'none', borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'none', cursor: 'pointer',
                color: active ? 'var(--primary)' : 'var(--fg-muted)',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ color: active ? 'var(--primary)' : 'var(--fg-subtle)', display: 'flex' }}>
                {tab.icon}
              </span>
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Page content — keep both mounted to preserve state across tab switches */}
      <div style={{ flex: 1, overflow: 'auto', display: view === 'creneaux' ? 'block' : 'none' }}>
        <CreneauxRHPage />
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: view === 'calendrier' ? 'block' : 'none' }}>
        <CalendrierRHPage />
      </div>
    </div>
  );
}
