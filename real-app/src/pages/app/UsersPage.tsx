import React from 'react';
import { PageHeader } from '../../components/layout/AppShell';

const USERS = [
  { initials: 'FK', color: '#ec4899', name: 'Fatima Khalil', email: 'fatima@acme.com', role: 'Admin', status: 'Active' },
  { initials: 'OI', color: '#10b981', name: 'Omar Idrissi', email: 'omar@acme.com', role: 'HR Manager', status: 'Active' },
  { initials: 'KB', color: '#f59e0b', name: 'Karim Benjelloun', email: 'karim@acme.com', role: 'HR', status: 'Active' },
  { initials: 'CD', color: '#ec4899', name: 'Clara Dubois', email: 'clara@acme.com', role: 'Manager', status: 'Active' },
  { initials: 'JM', color: '#64748b', name: 'Julien Martin', email: 'julien@acme.com', role: 'Read-only', status: 'Invited' },
];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Admin: { bg: '#ede9fe', color: '#6d28d9' },
  'HR Manager': { bg: '#d1fae5', color: '#065f46' },
  HR: { bg: '#dbeafe', color: '#1d4ed8' },
  Manager: { bg: '#fef3c7', color: '#92400e' },
  'Read-only': { bg: '#f1f5f9', color: '#64748b' },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: '#d1fae5', color: '#065f46' },
  Invited: { bg: '#fef9c3', color: '#854d0e' },
};

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function Badge({ label, styles }: { label: string; styles: { bg: string; color: string } }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 5,
      background: styles.bg, color: styles.color,
    }}>
      {label}
    </span>
  );
}

export default function UsersPage() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Users & roles"
        subtitle="5 team members · 2 pending invites"
        action={
          <button style={{
            background: '#0891b2', color: '#fff', border: 'none', borderRadius: 7,
            padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            + Invite user
          </button>
        }
      />

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 32px',
          padding: '10px 20px', borderBottom: '1px solid var(--border)',
          fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <span>User</span><span>Email</span><span>Role</span><span>Status</span><span />
        </div>
        {USERS.map((u, i) => (
          <div key={u.email} style={{
            display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 32px',
            alignItems: 'center', padding: '14px 20px',
            borderBottom: i < USERS.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar initials={u.initials} color={u.color} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{u.name}</span>
            </div>
            <span style={{ fontSize: 13, color: '#0891b2' }}>{u.email}</span>
            <Badge label={u.role} styles={ROLE_COLORS[u.role]} />
            <Badge label={u.status} styles={STATUS_COLORS[u.status]} />
            <span style={{ fontSize: 16, color: '#94a3b8', cursor: 'pointer' }}>···</span>
          </div>
        ))}
      </div>
    </div>
  );
}
