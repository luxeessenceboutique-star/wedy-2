import React from 'react';
import { Loader2 } from 'lucide-react';

// ── Button ────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'ghost' | 'soft' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: BtnSize; loading?: boolean;
}
export function Button({ variant = 'primary', size = 'md', loading, children, className = '', ...rest }: BtnProps) {
  const v = variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : variant === 'soft' ? 'btn-soft' : 'btn-danger';
  const s = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <button className={`btn ${v} ${s} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';
export function Badge({ variant = 'default', children, className = '' }: { variant?: BadgeVariant; children: React.ReactNode; className?: string }) {
  const v = variant === 'primary' ? 'badge-primary' : variant === 'success' ? 'badge-success' : variant === 'warning' ? 'badge-warning' : variant === 'danger' ? 'badge-danger' : '';
  return <span className={`badge ${v} ${className}`}>{children}</span>;
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({ children, className = '', pad = true }: { children: React.ReactNode; className?: string; pad?: boolean }) {
  return <div className={`card ${pad ? 'card-pad' : ''} ${className}`}>{children}</div>;
}

// ── Input ─────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string;
}
export function Input({ label, error, className = '', ...rest }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label className="label">{label}</label>}
      <input className={`input ${error ? 'border-danger' : ''} ${className}`} {...rest} />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
export function Empty({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', marginBottom: 6 }}>{title}</p>
      {description && <p style={{ fontSize: 14, marginBottom: 20 }}>{description}</p>}
      {action}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 540 }:
  { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const hue = name.charCodeAt(0) * 17 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},60%,55%)`,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
    }}>{initials}</div>
  );
}
