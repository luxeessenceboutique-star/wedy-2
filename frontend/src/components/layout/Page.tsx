import type { ReactNode } from 'react';
import { cx } from '@/lib/visual';
import { PageContext } from './pageContext';

/** Page container: `28px 32px 56px`, 20px between blocks, max-width 1440 (1180 with `narrow`). */
export function Page({ children, narrow, className }: { children: ReactNode; narrow?: boolean; className?: string }) {
  return (
    <PageContext.Provider value={true}>
      <div className={cx('wy-page', narrow && 'wy-page--narrow', className)}>{children}</div>
    </PageContext.Provider>
  );
}
