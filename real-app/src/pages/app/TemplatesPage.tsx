import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Wand2 } from 'lucide-react';
import { listTemplates } from '../../lib/api';
import { Card, Badge, Spinner, Empty } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { Link } from 'react-router-dom';

const CATEGORY_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
  contrat: 'primary', attestation: 'success', lettre: 'warning', avenant: 'default',
};

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['templates'], queryFn: () => listTemplates() });
  const templates = (data?.data ?? []).filter(t =>
    !search || t.name_fr.toLowerCase().includes(search.toLowerCase()) || (t.name_en ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(templates.map(t => t.category))].sort();

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Templates" subtitle={`${data?.count ?? 0} document templates available`} />

      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
        <input className="input" style={{ paddingLeft: 32 }} placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
      ) : templates.length === 0 ? (
        <Empty title="No templates found" />
      ) : (
        categories.map(cat => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--fg-muted)', marginBottom: 12, textTransform: 'capitalize' as 'capitalize' }}>
              {cat}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {templates.filter(t => t.category === cat).map(tpl => (
                <Card key={tpl.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={16} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{tpl.name_fr}</p>
                      {tpl.name_en && <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{tpl.name_en}</p>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                        <Badge variant={CATEGORY_COLORS[cat] ?? 'default'}>{tpl.category}</Badge>
                        <Link to={`/app/generate?template_id=${tpl.id}`}>
                          <button className="btn btn-soft btn-sm">
                            <Wand2 size={11} /> Use
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
