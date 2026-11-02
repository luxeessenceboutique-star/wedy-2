import { Check, Minus } from 'lucide-react';
import { cx } from '@/lib/visual';

/** 20px box, radius 6; checked = `#0e6f84` fill with a stroke-3 check. */
export function Checkbox({ checked, indeterminate, onChange, disabled, label, id, className }: {
  checked: boolean; indeterminate?: boolean; onChange: (next: boolean) => void;
  disabled?: boolean;
  /** accessible name */
  label: string; id?: string; className?: string;
}) {
  const on = checked || !!indeterminate;
  return (
    <button
      type="button" role="checkbox" id={id} aria-checked={indeterminate ? 'mixed' : checked} aria-label={label} disabled={disabled}
      className={cx('wy-check', on && 'is-on', className)}
      onClick={() => onChange(!checked)}
    >
      {on && (indeterminate ? <Minus size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />)}
    </button>
  );
}
