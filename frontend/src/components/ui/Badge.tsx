import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/visual';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'ai';

const VARIANT: Record<BadgeVariant, string> = {
  default: '', primary: 'badge-primary', success: 'badge-success', warning: 'badge-warning',
  danger: 'badge-danger', info: 'badge-info', violet: 'badge-violet', ai: 'badge-ai',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** 6px dot before the label, in the badge's text color */
  dot?: boolean;
  /** 12.5px chip (5px 11px) instead of the 11px status badge */
  size?: 'sm' | 'lg';
  children: ReactNode;
}

export function Badge({ variant = 'default', dot, size = 'sm', children, className, ...rest }: BadgeProps) {
  return (
    <span className={cx('badge', VARIANT[variant], size === 'lg' && 'badge-lg', className)} {...rest}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}
