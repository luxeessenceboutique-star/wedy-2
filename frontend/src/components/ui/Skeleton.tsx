import type { CSSProperties } from 'react';

/** Placeholder block with the `scan` sweep. */
export function Skeleton({ width = '100%', height = 14, radius, className, style }: {
  width?: number | string; height?: number | string; radius?: number | string; className?: string; style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`wy-skel${className ? ` ${className}` : ''}`}
      style={{ display: 'block', width, height, ...(radius !== undefined ? { borderRadius: radius } : null), ...style }}
    />
  );
}
