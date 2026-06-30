import React from 'react';
import { Loader2, X } from 'lucide-react';

// ── Button ────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'ghost' | 'soft' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: BtnSize; loading?: boolean;
}
export function Button({ variant = 'primary', size = 'md', loading, children, className = '', style, ...rest }: BtnProps) {
  const v = variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : variant === 'soft' ? 'btn-soft' : 'btn-danger';
  const s = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <button className={`btn ${v} ${s} ${className}`} disabled={loading || rest.disabled} style={style} {...rest}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'violet';
export function Badge({ variant = 'default', dot, children, className = '', ...rest }: {
  variant?: BadgeVariant; dot?: boolean; children: React.ReactNode; className?: string
} & React.HTMLAttributes<HTMLSpanElement>) {
  const v = variant === 'primary' ? 'badge-primary' : variant === 'success' ? 'badge-success'
    : variant === 'warning' ? 'badge-warning' : variant === 'danger' ? 'badge-danger'
    : variant === 'violet' ? 'badge-violet' : '';
  const dotColor = variant === 'success' ? 'var(--success)' : variant === 'warning' ? 'var(--warn)'
    : variant === 'danger' ? 'var(--danger)' : variant === 'primary' ? 'var(--primary)' : 'var(--ink-3)';
  return (
    <span className={`badge ${v} ${className}`} {...rest}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({ children, className = '', pad = true, ...rest }: {
  children: React.ReactNode; className?: string; pad?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${pad ? 'card-pad' : ''} ${className}`} {...rest}>{children}</div>;
}

// ── Input ─────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string;
}
export function Input({ label, error, className = '', ...rest }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label className="label">{label}</label>}
      <input className={`input ${error ? 'input-error' : ''} ${className}`} {...rest} />
      {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export function Select({ label, children, className = '', ...rest }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label className="label">{label}</label>}
      <select className={`select ${className}`} {...rest}>{children}</select>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" style={{ color: 'var(--primary)' }} />;
}

// ── Empty state ───────────────────────────────────────────────────────
export function Empty({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px' }}>
      {icon && (
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'var(--primary-soft)', border: '1px solid var(--primary-line)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16, color: 'var(--primary)',
        }}>{icon}</div>
      )}
      <p style={{
        fontSize: 15, fontWeight: 600,
        fontFamily: 'var(--font-display)', color: 'var(--ink)',
        marginBottom: 6,
      }}>{title}</p>
      {description && <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>{description}</p>}
      {action}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 540 }:
  { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  if (!open) return null;

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(10,28,36,.55)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn .15s ease both',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 16,
          width, maxWidth: '100%', maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: 'var(--shadow-lg)',
          animation: 'scaleIn .18s cubic-bezier(.2,.8,.2,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0,
          background: 'var(--surface)', zIndex: 1,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 16, color: 'var(--ink)', letterSpacing: '-.02em',
          }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              border: '1px solid var(--line)', background: 'none',
              cursor: 'pointer', color: 'var(--ink-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: '20px 22px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────
export function Avatar({ name = 'U', src, size = 32 }: { name?: string; src?: string; size?: number }) {
  const safeName = name || 'U';
  const initials = safeName.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase();
  const hue = (safeName.charCodeAt(0) * 41 + (safeName.charCodeAt(1) || 0) * 17) % 360;

  if (src) {
    const fullSrc = src.startsWith('data:') ? src : `data:image/jpeg;base64,${src}`;
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--surface-2)' }}>
        <img src={fullSrc} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},55%,52%)`,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0, letterSpacing: '-.01em',
    }}>{initials}</div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, change, changePositive = true, color = 'var(--primary)', to }: {
  icon: React.ReactNode; label: string; value: string | number;
  change?: string; changePositive?: boolean; color?: string; to?: string;
}) {
  const [hov, setHov] = React.useState(false);
  const inner = (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: hov ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'box-shadow .15s, transform .15s',
        transform: hov && to ? 'translateY(-2px)' : 'none',
        cursor: to ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 3, bottom: 0,
        background: color,
        borderRadius: '14px 0 0 14px',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '.06em',
            textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8,
          }}>{label}</p>
          <p style={{
            fontSize: 30, fontWeight: 700, color: 'var(--ink)',
            fontFamily: 'var(--font-display)', letterSpacing: '-.03em',
            lineHeight: 1, marginBottom: change ? 8 : 0,
          }}>{value}</p>
          {change && (
            <p style={{ fontSize: 12, color: changePositive ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10 }}>{changePositive ? '▲' : '▼'}</span>
              {change}
            </p>
          )}
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: `color-mix(in oklab, ${color} 14%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <a href={to} style={{ textDecoration: 'none', display: 'block' }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        {inner}
      </a>
    );
  }
  return <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{inner}</div>;
}

// ── Divider ───────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  if (label) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
    );
  }
  return <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />;
}
