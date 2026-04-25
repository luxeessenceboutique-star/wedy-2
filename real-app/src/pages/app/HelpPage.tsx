import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/AppShell';
import { Search } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Getting started',
    color: '#0891b2',
    links: ['Create your first document', 'Import your employees', 'Invite your team'],
  },
  {
    title: 'Documents',
    color: '#0891b2',
    links: ['Customizing templates', 'Using variables', 'Signing & sealing'],
  },
  {
    title: 'AI Copilot',
    color: '#0891b2',
    links: ['How Claude helps with HR', 'Translation quality', 'Data privacy & AI'],
  },
  {
    title: 'Compliance',
    color: '#0891b2',
    links: ['Moroccan Labor Code 2026', 'GDPR checklist', 'Exporting audit logs'],
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState('');

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Help center" subtitle="Docs · tutorials · API reference" />

      {/* Search */}
      <div style={{ maxWidth: 560, margin: '0 auto 32px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid var(--border)', borderRadius: 10,
          padding: '11px 16px', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search the docs..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 14, color: '#0f172a', background: 'transparent',
            }}
          />
        </div>
      </div>

      {/* Cards grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 16, maxWidth: 740, margin: '0 auto',
      }}>
        {SECTIONS.map(section => (
          <div key={section.title} style={{
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 10, padding: '20px 22px',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0891b2', marginBottom: 14 }}>
              {section.title}
            </div>
            {section.links.map(link => (
              <div key={link} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: section.links.indexOf(link) < section.links.length - 1
                  ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 13, color: '#475569' }}>{link}</span>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>›</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
