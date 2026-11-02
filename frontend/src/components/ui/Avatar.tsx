import type { CSSProperties } from 'react';
import { avatarGradient, initialsOf } from '@/lib/visual';

/** Initials on a gradient picked by name (or the photo). `src` may be a data URI or raw base64 jpeg. */
export function Avatar({ name = 'U', src, size = 32, className, style }: {
  name?: string; src?: string; size?: number; className?: string; style?: CSSProperties;
}) {
  const safeName = name || 'U';
  const fullSrc = src ? (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/') ? src : `data:image/jpeg;base64,${src}`) : null;
  return (
    <span
      className={`wy-avatar${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.36, background: fullSrc ? 'var(--subtle)' : avatarGradient(safeName), ...style }}
    >
      {fullSrc ? <img src={fullSrc} alt={safeName} /> : initialsOf(safeName)}
    </span>
  );
}
