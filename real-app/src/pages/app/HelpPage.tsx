import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/AppShell';
import { Search } from 'lucide-react';
import { useLang } from '../../lib/lang';

export default function HelpPage() {
  const { t } = useLang();
  const [query, setQuery] = useState('');

  const SECTIONS = [
    {
      title: t('help_getting_started'),
      links: [t('help_create_doc'), t('help_import_emp'), t('help_invite_team')],
    },
    {
      title: t('help_documents_cat'),
      links: [t('help_custom_templates'), t('help_variables'), t('help_signing')],
    },
    {
      title: t('help_ai_cat'),
      links: [t('help_claude_hr'), t('help_translation_q'), t('help_data_privacy')],
    },
    {
      title: t('help_compliance_cat'),
      links: [t('help_labor_code'), t('help_gdpr_check'), t('help_audit_export')],
    },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title={t('help_center_title')} subtitle={t('help_subtitle')} />

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
            placeholder={t('help_search_ph')}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 14, color: '#0f172a', background: 'transparent',
            }}
          />
        </div>
      </div>

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
            {section.links.map((link, idx) => (
              <div key={link} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: idx < section.links.length - 1 ? '1px solid var(--border)' : 'none',
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
