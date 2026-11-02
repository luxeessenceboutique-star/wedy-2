import type { ReactNode } from 'react';
import { Reveal } from '@/components/motion';
import { cx } from '@/lib/visual';

export interface TabItem<V extends string> {
  value: V;
  label?: ReactNode;
  icon?: ReactNode;
  count?: number;
  /** required for icon-only items */
  ariaLabel?: string;
}

/**
 * Segmented control: white container, the active item gets a `#0a1c24` pill behind white text
 * (the pill re-plays the `pill` reveal each time it moves).
 */
export function SegmentedTabs<V extends string>({ items, value, onChange, size = 'md', iconOnly, className, ariaLabel }: {
  items: TabItem<V>[]; value: V; onChange: (v: V) => void;
  size?: 'md' | 'lg'; iconOnly?: boolean; className?: string; ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cx('wy-seg', size === 'lg' && 'wy-seg--lg', iconOnly && 'wy-seg--icon', className)}>
      {items.map(it => {
        const active = it.value === value;
        return (
          <button
            key={it.value} type="button" role="tab" aria-selected={active} aria-label={it.ariaLabel}
            className={cx('wy-seg-item', active && 'is-active')}
            onClick={() => onChange(it.value)}
          >
            {active && <Reveal as="span" variant="pill" className="wy-seg-pill" aria-hidden="true" />}
            {it.icon}
            {it.label}
            {it.count !== undefined && <span className="wy-seg-count">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Filter pills (99px): active = `#0a1c24` + white text, inactive = white + border. */
export function FilterPills<V extends string>({ items, value, onChange, size = 'md', className, ariaLabel }: {
  items: TabItem<V>[]; value: V; onChange: (v: V) => void;
  size?: 'md' | 'lg'; className?: string; ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cx(className)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(it => {
        const active = it.value === value;
        return (
          <button
            key={it.value} type="button" aria-pressed={active}
            className={cx('wy-pill', size === 'lg' && 'wy-pill--lg', active && 'is-active')}
            onClick={() => onChange(it.value)}
          >
            {it.icon}
            {it.label}
            {it.count !== undefined && <span className="wy-seg-count">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
