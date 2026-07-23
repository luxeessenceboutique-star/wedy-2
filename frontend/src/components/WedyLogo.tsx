import React from 'react';

export function WedyLogo({ size = 28, showText = true, mono = false }: {
  size?: number;
  showText?: boolean;
  mono?: boolean;
}) {
  const id = `wl-${size}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
        {!mono && (
          <defs>
            <linearGradient id={id} x1="6" y1="32" x2="34" y2="8" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--primary)" />
              <stop offset="1" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
        )}
        <path
          d="M7 30 L19 19 L31 9"
          stroke={mono ? '#fff' : `url(#${id})`}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="7"  cy="30" r="3"   fill={mono ? '#fff' : 'var(--primary)'} />
        <circle cx="19" cy="19" r="3.4" fill={mono ? '#fff' : 'var(--accent)'} />
        <circle cx="31" cy="9"  r="4.6" fill={mono ? '#fff' : `url(#${id})`} />
      </svg>

      {showText && (
        <span style={{
          fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: size * 0.65,
          letterSpacing: '-0.03em',
          color: 'var(--ink)',
          lineHeight: 1,
        }}>
          Wedy
        </span>
      )}
    </div>
  );
}
