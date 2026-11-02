import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from '@/components/motion';
import { useCountUp } from '@/components/motion/useCountUp';
import { cx } from '@/lib/visual';

export type StatTone = 'default' | 'teal' | 'green' | 'amber' | 'violet';

interface StatCardProps {
  label: string;
  /** numbers count up when the card enters the viewport; strings are shown as-is */
  value: string | number;
  icon?: ReactNode;
  /** `default` = white card; the others are the gradient KPI cards */
  tone?: StatTone;
  /** small line under the value (11.5px on gradient cards) */
  hint?: ReactNode;
  /** legacy trend line: "▲ +4%" */
  change?: string;
  changePositive?: boolean;
  /** icon tile color on white cards */
  color?: string;
  /** internal link (router) */
  to?: string;
  onClick?: () => void;
  /** reveal delay in ms (stagger cards 50ms apart) */
  delay?: number;
  /** count-up delay in ms */
  countDelay?: number;
  format?: (n: number) => string;
  className?: string;
}

export function StatCard({
  label, value, icon, tone = 'default', hint, change, changePositive = true, color = 'var(--primary)',
  to, onClick, delay = 0, countDelay = 0, format, className,
}: StatCardProps) {
  const kpi = tone !== 'default';
  const counted = typeof value === 'number';
  const { ref, text } = useCountUp<HTMLDivElement>(counted ? value : null, { delay: countDelay, format });

  const body = (
    <>
      {kpi && <span className="wy-stat-circle" aria-hidden="true" />}
      {kpi && icon && <span className="wy-stat-bgicon" aria-hidden="true">{icon}</span>}
      <div className="wy-stat-row">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="wy-stat-label">{label}</div>
          <div ref={ref} className="wy-stat-value">{counted ? text : value}</div>
          {hint && <div className="wy-stat-hint">{hint}</div>}
          {change && (
            <div className="wy-stat-delta" style={{ color: changePositive ? 'var(--success-ink)' : 'var(--danger-ink)' }}>
              <span style={{ fontSize: 10 }}>{changePositive ? '▲' : '▼'}</span>{change}
            </div>
          )}
        </div>
        {!kpi && icon && (
          <div className="wy-stat-icon" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}>{icon}</div>
        )}
      </div>
    </>
  );

  const cls = cx('wy-stat', kpi && 'wy-stat--kpi', kpi && `wy-stat--${tone}`, className);
  return (
    <Reveal variant="up" delay={delay} className="wy-stat-wrap">
      {to ? <Link to={to} className={cls}>{body}</Link>
        : onClick ? <button type="button" onClick={onClick} className={cls}>{body}</button>
        : <div className={cls}>{body}</div>}
    </Reveal>
  );
}
