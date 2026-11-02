import type { ReactNode } from 'react';
import { Reveal } from '@/components/motion';

/** Dashed empty state: 52px icon tile, title, hint and an optional action (e.g. a reset-filters button). */
export function EmptyState({ icon, title, description, action, className }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string;
}) {
  return (
    <Reveal variant="up" className={`wy-empty${className ? ` ${className}` : ''}`}>
      {icon && <span className="wy-empty-icon">{icon}</span>}
      <div className="wy-empty-title">{title}</div>
      {description && <div className="wy-empty-hint">{description}</div>}
      {action && <div className="wy-empty-action">{action}</div>}
    </Reveal>
  );
}
