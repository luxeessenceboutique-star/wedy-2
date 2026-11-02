import type { CSSProperties } from 'react';

/** Drifting radial glow used behind dark panels (`wedy-drift`, 22s). Position it with `style` (top/left/right/bottom). */
export function Orb({ color = 'teal', size, style, delay = 0, duration = 22 }: {
  color?: 'teal' | 'violet'; size?: number; style?: CSSProperties; delay?: number; duration?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`wy-orb wy-orb--${color} wedy-drift`}
      style={{ ...(size ? { width: size, height: size } : null), ['--dur' as string]: `${duration}s`, ['--delay' as string]: `${delay}s`, ...style }}
    />
  );
}
