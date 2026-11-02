import type { CSSProperties, ReactNode } from 'react';
import { useReveal } from '@/components/motion';
import { scoreColor } from '@/lib/visual';

/** SVG ring that draws itself on enter. Color follows the score unless `color` is given. */
export function ProgressRing({ value, size = 56, stroke = 5, color, track = 'var(--track)', delay = 0, children, className, style }: {
  value: number; size?: number; stroke?: number; color?: string; track?: string; delay?: number;
  /** centered label */
  children?: ReactNode; className?: string; style?: CSSProperties;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const ref = useReveal<SVGCircleElement>('draw', { frac: v / 100, delay });
  return (
    <span className={className} style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0, ...style }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ display: 'block' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          ref={ref} cx={c} cy={c} r={r} fill="none" stroke={color ?? scoreColor(v)} strokeWidth={stroke} strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
          style={{ strokeDasharray: `${(circ * v / 100).toFixed(2)}px ${circ.toFixed(2)}px`, transition: 'stroke-dasharray .6s var(--ease)' }}
        />
      </svg>
      {children !== undefined && (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
      )}
    </span>
  );
}
