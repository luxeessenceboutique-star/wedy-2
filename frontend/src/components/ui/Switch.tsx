import { cx } from '@/lib/visual';

/** 40×24 track (32×18 when `size="sm"`), 18px knob sliding in .25s. */
export function Switch({ checked, onChange, size = 'md', tone = 'primary', disabled, label, id, className }: {
  checked: boolean; onChange: (next: boolean) => void;
  size?: 'md' | 'sm'; tone?: 'primary' | 'green';
  disabled?: boolean;
  /** accessible name (icon-only control) */
  label: string; id?: string; className?: string;
}) {
  return (
    <button
      type="button" role="switch" id={id} aria-checked={checked} aria-label={label} disabled={disabled}
      className={cx('wy-switch', size === 'sm' && 'wy-switch--sm', tone === 'green' && 'wy-switch--green', checked && 'is-on', className)}
      onClick={() => onChange(!checked)}
    >
      <span className="wy-switch-knob" />
    </button>
  );
}
