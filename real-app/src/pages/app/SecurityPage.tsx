import React from 'react';
import { PageHeader } from '../../components/layout/AppShell';
import { Shield, Lock, FileCheck, Globe } from 'lucide-react';

const ITEMS = [
  { icon: <Shield size={18} />, title: 'GDPR compliance', desc: 'Data processing agreements, right to erasure, and consent management.', status: 'Active' },
  { icon: <FileCheck size={18} />, title: 'Moroccan Labor Law 2026', desc: 'Templates and workflows aligned with the latest Code du Travail.', status: 'Active' },
  { icon: <Lock size={18} />, title: 'Data encryption', desc: 'All data encrypted at rest (AES-256) and in transit (TLS 1.3).', status: 'Active' },
  { icon: <Globe size={18} />, title: 'Data residency', desc: 'Choose where your HR data is stored — EU or Morocco region.', status: 'Configured' },
];

export default function SecurityPage() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Security & Compliance" subtitle="GDPR, Moroccan labor law compliance settings." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 800 }}>
        {ITEMS.map(item => (
          <div key={item.title} style={{
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 10, padding: '20px 22px',
            display: 'flex', gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: '#ecfeff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0891b2', flexShrink: 0,
            }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.title}</span>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 5,
                  background: '#d1fae5', color: '#065f46',
                }}>
                  {item.status}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
