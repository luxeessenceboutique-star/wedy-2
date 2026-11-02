import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/lib/visual';

/**
 * Table shell built on CSS grid: `columns` is the grid-template-columns of header and rows,
 * `minWidth` keeps wide tables scrollable inside the rounded card.
 */
export function DataTable({ columns, minWidth = 760, head, children, className, style }: {
  columns: string; minWidth?: number; head: ReactNode; children: ReactNode; className?: string; style?: CSSProperties;
}) {
  return (
    <div className={cx('wy-dt', className)} style={style}>
      <div className="wy-dt-scroll">
        <div className="wy-dt-inner" role="table" style={{ ['--dt-cols' as string]: columns, ['--dt-min' as string]: `${minWidth}px` }}>
          <div className="wy-dt-head" role="row">{head}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function DataRow({ selected, onClick, children, className, style }: {
  selected?: boolean; onClick?: () => void; children: ReactNode; className?: string; style?: CSSProperties;
}) {
  return (
    <div role="row" className={cx('wy-dt-row', selected && 'is-selected', className)} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined, ...style }}>
      {children}
    </div>
  );
}
