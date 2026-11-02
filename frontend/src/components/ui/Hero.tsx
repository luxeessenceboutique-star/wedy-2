import type { CSSProperties, ReactNode } from 'react';
import { Orb } from '@/components/motion';
import { useLang } from '@/lib/lang';
import { cx } from '@/lib/visual';

/**
 * Dark hero panel: `#06141a`, rounded, two drifting orbs (teal ~520px, violet ~460px) and an optional
 * 36–40px grid with a fading mask. Children paint above the decoration (it sits at z-index -1).
 */
export function DarkHeroPanel({ children, radius = 24, orbs = true, grid = false, className, style }: {
  children?: ReactNode; radius?: number; orbs?: boolean;
  /** `true` = 40px grid, or a pixel size */
  grid?: boolean | number;
  className?: string; style?: CSSProperties;
}) {
  return (
    <div className={cx('wy-hero', className)} style={{ borderRadius: radius, ...style }}>
      {orbs && (
        <>
          <Orb color="teal" size={520} style={{ left: -140, top: -220 }} />
          <Orb color="violet" size={460} delay={-8} style={{ right: -120, bottom: -240 }} />
        </>
      )}
      {grid && <span aria-hidden="true" className="wy-hero-grid" style={{ ['--grid' as string]: `${grid === true ? 40 : grid}px` }} />}
      {children}
    </div>
  );
}

/** "Analyse de Wedy" block: AI tint gradient, Wedy avatar, violet label. */
export function AIInsight({ children, title, className, style }: {
  children: ReactNode; title?: string; className?: string; style?: CSSProperties;
}) {
  const { t } = useLang();
  return (
    <div className={cx('wy-ai', className)} style={style}>
      <img className="wy-ai-avatar" src="/wedy-avatar.png" alt="" />
      <div style={{ minWidth: 0 }}>
        <div className="wy-ai-label">{title ?? t('wedy_analysis')}</div>
        <div className="wy-ai-text">{children}</div>
      </div>
    </div>
  );
}
