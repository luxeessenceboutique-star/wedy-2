import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/visual';

export function Card({ children, className, pad = true, interactive, ...rest }: {
  children: ReactNode; className?: string; pad?: boolean;
  /** hover lift (translateY(-3px) + card-hover shadow) */
  interactive?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('card', pad && 'card-pad', interactive && 'wy-lift', className)} {...rest}>{children}</div>;
}

export function Divider({ label }: { label?: string }) {
  if (label) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
    );
  }
  return <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />;
}
