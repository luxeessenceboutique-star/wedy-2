import React from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{
      padding: '26px 30px 0',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 22, gap: 16,
    }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700,
          letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 3,
        }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>{action}</div>}
    </div>
  );
}
