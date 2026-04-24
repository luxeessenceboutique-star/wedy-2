import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/AppShell';

type Status = 'pending' | 'approved' | 'rejected';

interface Request {
  id: number;
  initials: string;
  color: string;
  name: string;
  type: string;
  dateRange: string;
  days: number;
  status: Status;
}

const INITIAL: Request[] = [
  { id: 1, initials: 'LH', color: '#7c3aed', name: 'Leila Haddad', type: 'Annual leave', dateRange: 'May 5 → May 16', days: 12, status: 'pending' },
  { id: 2, initials: 'AB', color: '#0891b2', name: 'Amira Benali', type: 'Sick leave', dateRange: 'Apr 21 → Apr 22', days: 2, status: 'approved' },
  { id: 3, initials: 'OI', color: '#10b981', name: 'Omar Idrissi', type: 'Annual leave', dateRange: 'Jun 1 → Jun 14', days: 14, status: 'pending' },
  { id: 4, initials: 'CD', color: '#ec4899', name: 'Clara Dubois', type: 'Parental leave', dateRange: 'Jul 1 → Oct 1', days: 90, status: 'approved' },
];

const BALANCE = [
  { label: 'Annual leave', used: 3, total: 21, color: '#0891b2' },
  { label: 'Sick leave', used: 12, total: 12, color: '#22c55e' },
  { label: 'Personal', used: 3, total: 5, color: '#f59e0b' },
];

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

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, { bg: string; color: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    approved: { bg: '#d1fae5', color: '#065f46' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
  };
  const s = styles[status];
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 9px',
      borderRadius: 5, background: s.bg, color: s.color,
    }}>
      {status}
    </span>
  );
}

export default function TimeOffPage() {
  const [requests, setRequests] = useState<Request[]>(INITIAL);

  const approve = (id: number) => setRequests(r => r.map(x => x.id === id ? { ...x, status: 'approved' } : x));
  const reject = (id: number) => setRequests(r => r.map(x => x.id === id ? { ...x, status: 'rejected' } : x));

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Time off & leave"
        subtitle="3 pending requests · 18 people on leave this month"
        action={
          <button style={{
            background: '#0891b2', color: '#fff', border: 'none', borderRadius: 7,
            padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            + New request
          </button>
        }
      />

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Requests table */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            Recent requests
          </div>
          {requests.map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 20px',
              borderBottom: i < requests.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <Avatar initials={r.initials} color={r.color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.type} · {r.dateRange} · {r.days} days</div>
              </div>
              {r.status === 'pending' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => reject(r.id)} style={{
                    border: '1px solid var(--border)', background: '#fff', borderRadius: 6,
                    padding: '5px 14px', fontSize: 12, cursor: 'pointer', color: '#475569',
                  }}>Reject</button>
                  <button onClick={() => approve(r.id)} style={{
                    border: 'none', background: '#0891b2', borderRadius: 6,
                    padding: '5px 14px', fontSize: 12, cursor: 'pointer', color: '#fff', fontWeight: 500,
                  }}>Approve</button>
                </div>
              ) : (
                <StatusBadge status={r.status} />
              )}
            </div>
          ))}
        </div>

        {/* Leave balance */}
        <div style={{
          width: 260, background: '#fff', border: '1px solid var(--border)',
          borderRadius: 10, padding: '20px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>
            Leave balance · you
          </div>
          {BALANCE.map(b => (
            <div key={b.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 5 }}>
                <span>{b.label}</span>
                <span style={{ color: '#94a3b8' }}>{b.used} of {b.total} days</span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  width: `${(b.used / b.total) * 100}%`,
                  background: b.color,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
