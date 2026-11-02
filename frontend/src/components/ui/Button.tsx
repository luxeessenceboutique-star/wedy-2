import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '@/lib/visual';

// `ghost` and `danger` are the legacy names of `secondary` and `dangerOutline`.
export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'dangerOutline' | 'ai' | 'soft' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  dark: 'btn-dark',
  dangerOutline: 'btn-danger-outline',
  ai: 'btn-ai',
  soft: 'btn-soft',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Leading icon (replaced by a spinner while `loading`) */
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cx('btn', VARIANT[variant], size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg', className)}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 size={size === 'sm' ? 13 : 15} className="wedy-spin" /> : icon}
      {children}
    </button>
  );
}
