import React from 'react';

export function WedyLogo({ size = 28, showText = true, mono = false }: {
  size?: number;
  showText?: boolean;
  mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <img
        src="/wedy-avatar.png"
        alt="Wedy"
        width={size}
        height={size}
        draggable={false}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          background: mono ? 'rgba(255,255,255,0.22)' : 'var(--primary-soft)',
          border: mono ? '1.5px solid rgba(255,255,255,0.55)' : '1.5px solid var(--line)',
        }}
      />

      {showText && (
        <span style={{
          fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: size * 0.65,
          letterSpacing: '-0.03em',
          color: mono ? '#fff' : 'var(--ink)',
          lineHeight: 1,
        }}>
          Wedy
        </span>
      )}
    </div>
  );
}
