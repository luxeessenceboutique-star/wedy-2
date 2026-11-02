import { useContext, type ReactNode } from 'react';
import { Reveal } from '@/components/motion';
import { cx } from '@/lib/visual';
import { PageContext } from './pageContext';

/**
 * Page title block: Bricolage H1 `clamp(30px,3vw,40px)`, 15px subtitle, actions on the right.
 * `count` renders the mono pill next to the title (e.g. the employee total).
 * Pages not yet wrapped in <Page> keep the old side padding so they do not jump.
 */
export function PageHeader({ title, subtitle, action, count }: {
  title: string; subtitle?: string; action?: ReactNode; count?: number | string;
}) {
  const inPage = useContext(PageContext);
  return (
    <div className={cx('wy-ph', !inPage && 'wy-ph--legacy')}>
      <div>
        <Reveal variant="up" className="wy-ph-title-row">
          <h1 className="wy-ph-title">{title}</h1>
          {count !== undefined && <span className="wy-ph-count">{count}</span>}
        </Reveal>
        {subtitle && <Reveal as="p" variant="up" delay={60} className="wy-ph-sub">{subtitle}</Reveal>}
      </div>
      {action && <Reveal variant="up" delay={100} className="wy-ph-actions">{action}</Reveal>}
    </div>
  );
}
