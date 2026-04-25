import React from 'react';
import { PageHeader } from '../../components/layout/AppShell';

interface Integration {
  letter: string;
  name: string;
  description: string;
  connected: boolean;
  color: string;
}

const INTEGRATIONS: Integration[] = [
  { letter: 'S', name: 'Slack', description: 'Notifications & approvals', connected: true, color: '#4a154b' },
  { letter: 'M', name: 'Microsoft Teams', description: 'Notifications & calendar', connected: true, color: '#464eb8' },
  { letter: 'G', name: 'Google Workspace', description: 'Calendar, Drive, Meet', connected: true, color: '#4285f4' },
  { letter: 'S', name: 'Sage', description: 'Accounting & payroll', connected: false, color: '#00b04f' },
  { letter: 'C', name: 'Cegid', description: 'HRIS sync', connected: false, color: '#0066cc' },
  { letter: 'H', name: 'HiBob', description: 'HRIS sync', connected: false, color: '#ff5533' },
  { letter: 'P', name: 'Personio', description: 'HRIS sync', connected: false, color: '#3d5a80' },
  { letter: 'D', name: 'DocuSign', description: 'Digital signatures', connected: true, color: '#ffba08' },
  { letter: 'Z', name: 'Zapier', description: '5,000+ app automations', connected: false, color: '#ff4a00' },
  { letter: 'O', name: 'Okta', description: 'SSO & SCIM', connected: true, color: '#007dc1' },
  { letter: 'N', name: 'Notion', description: 'Docs sync', connected: false, color: '#1a1a1a' },
  { letter: 'W', name: 'Webhooks', description: 'Custom endpoints', connected: true, color: '#0891b2' },
];

function IntegCard({ item }: { item: Integration }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
      padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8, background: item.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0,
      }}>
        {item.letter}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.description}</div>
      </div>
      {item.connected ? (
        <span style={{
          fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 5,
          background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7',
        }}>
          ✓ Connected
        </span>
      ) : (
        <button style={{
          border: '1px solid var(--border)', background: '#fff', borderRadius: 6,
          padding: '5px 14px', fontSize: 12, cursor: 'pointer', color: '#475569', fontWeight: 500,
        }}>
          Connect
        </button>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Integrations" subtitle="Connect Wedy to the tools your team already uses" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
      }}>
        {INTEGRATIONS.map(item => (
          <IntegCard key={item.name} item={item} />
        ))}
      </div>
    </div>
  );
}
