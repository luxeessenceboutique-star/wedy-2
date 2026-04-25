import React from 'react';

export function WedyLogo({ size = 28, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="var(--primary)" />
        <path d="M6 10 L10 22 L16 14 L22 22 L26 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {showText && (
        <span style={{ fontWeight: 700, fontSize: size * 0.6, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
          Wedy
        </span>
      )}
    </div>
  );
}
