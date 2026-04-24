import React from 'react';
import { PageHeader } from '../../components/layout/AppShell';

const NOTIFS = [
  { id: 1, initials: 'LH', color: '#0891b2', name: 'Leila Haddad', action: 'requested time off', detail: 'May 5–16', time: '2h ago', unread: true },
  { id: 2, initials: 'AC', color: '#7c3aed', name: 'Ayra Copilot', action: 'generated Avenant for', detail: 'Youssef El Amrani', time: '4h ago', unread: true },
  { id: 3, initials: 'S', color: '#64748b', name: 'System', action: "Sofia Alaoui's Stage contract ends in", detail: '8 days', time: 'Today', unread: true },
  { id: 4, initials: 'OI', color: '#10b981', name: 'Omar Idrissi', action: 'submitted Q2 review for', detail: '4 reports', time: 'Yesterday', unread: false },
  { id: 5, initials: 'S', color: '#f59e0b', name: 'Slack', action: 'integration refreshed ·', detail: '247 users synced', time: '2 days ago', unread: false },
];

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Notifications" subtitle="3 unread" />
      <div style={{ maxWidth: 640 }}>
        {NOTIFS.map(n => (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            background: n.unread ? '#f0fdff' : '#fff',
            border: '1px solid var(--border)',
            borderRadius: 8, marginBottom: 6,
            position: 'relative',
          }}>
            {n.unread && (
              <span style={{
                position: 'absolute', left: -2, top: '50%', transform: 'translateY(-50%)',
                width: 6, height: 6, borderRadius: '50%', background: '#0891b2',
              }} />
            )}
            <Avatar initials={n.initials} color={n.color} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, color: '#0f172a' }}>
                <strong>{n.name}</strong>{' '}
                <span style={{ color: '#475569' }}>{n.action}</span>{' '}
                <span style={{ color: '#0891b2' }}>{n.detail}</span>
              </span>
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
