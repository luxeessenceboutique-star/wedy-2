import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cx } from '@/lib/visual';

/** Label + control + hint/error column (label 12.5px / 600 `#33474f`). */
export function Field({ label, htmlFor, error, hint, className, children }: {
  label?: ReactNode; htmlFor?: string; error?: string; hint?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <div className={cx('wy-field', className)}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="wy-field-error" role="alert">{error}</span> : hint ? <span className="wy-field-hint">{hint}</span> : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode; error?: string; hint?: ReactNode;
  /** leading icon (search-style input) */
  icon?: ReactNode;
  /** 44px instead of 42px */
  large?: boolean;
}

export function Input({ label, error, hint, icon, large, className, id, ...rest }: InputProps) {
  const auto = useId();
  const fid = id ?? auto;
  const control = <input id={fid} className={cx('input', large && 'input-lg', error && 'input-error', className)} aria-invalid={error ? true : undefined} {...rest} />;
  return (
    <Field label={label} htmlFor={fid} error={error} hint={hint}>
      {icon ? (
        <div className="wy-input-wrap">
          <span className="wy-input-icon" aria-hidden="true">{icon}</span>
          {control}
        </div>
      ) : control}
    </Field>
  );
}

/** Search box: icon at 14px, 44px tall, `padding-inline-start: 40px`. */
export function SearchInput({ className, style, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { className?: string }) {
  return (
    <div className={cx('wy-input-wrap', className)} style={style}>
      <span className="wy-input-icon" aria-hidden="true"><Search size={16} /></span>
      <input type="search" className="input input-lg" {...rest} />
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode; error?: string; hint?: ReactNode; large?: boolean;
}

export function Select({ label, error, hint, large, children, className, id, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} htmlFor={fid} error={error} hint={hint}>
      <select id={fid} className={cx('select', large && 'select-lg', error && 'input-error', className)} {...rest}>{children}</select>
    </Field>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode; error?: string; hint?: ReactNode;
}

export function Textarea({ label, error, hint, className, id, ...rest }: TextareaProps) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} htmlFor={fid} error={error} hint={hint}>
      <textarea id={fid} className={cx('textarea', error && 'input-error', className)} aria-invalid={error ? true : undefined} {...rest} />
    </Field>
  );
}
