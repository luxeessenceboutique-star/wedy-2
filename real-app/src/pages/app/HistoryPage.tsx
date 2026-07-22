import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Trash2, FileText, Eye } from 'lucide-react';
import { listDocuments, deleteDocument, downloadDoc, printDocument, viewDocument } from '../../lib/api';
import { Card, Badge, Spinner, Empty } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { useLang } from '../../lib/lang';
import { toast } from 'sonner';

export default function HistoryPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['documents'], queryFn: () => listDocuments({ limit: 100 }) });

  const deleteMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success(t('save')); },
    onError: () => toast.error('Delete failed'),
  });

  const docs = (data?.data ?? []).filter(d =>
    !search || d.document_type.toLowerCase().includes(search.toLowerCase()) ||
    (d.employees?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title={t('document_history')} subtitle={`${data?.count ?? 0} ${t('recent_documents').toLowerCase()}`} />

      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
        <input className="input" style={{ paddingLeft: 32 }} placeholder={t('search_documents')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card pad={false}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : docs.length === 0 ? (
          <Empty title={t('no_history')} description={t('no_history_desc')} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {[t('col_type'), t('col_employee'), t('col_language'), t('col_date'), t('col_actions'), ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--line)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 500 }}>{doc.document_type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--ink-2)' }}>{doc.employees?.full_name || '—'}</td>
                  <td style={{ padding: '10px 16px' }}><Badge>{doc.language?.toUpperCase()}</Badge></td>
                  <td style={{ padding: '10px 16px', color: 'var(--ink-2)' }}>{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" title={t('preview')}
                        onClick={() => viewDocument(doc.id, doc.document_type).catch(e => toast.error(e.message))}>
                        <Eye size={12} /> {t('preview')}
                      </button>
                      <button className="btn btn-soft btn-sm"
                        onClick={() => printDocument(doc.id, doc.document_type).catch(e => toast.error(e.message))}>
                        <Download size={12} /> PDF
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => downloadDoc(doc.id, 'docx', `${doc.document_type}.docx`).catch(e => toast.error(e.message))}>
                        <Download size={12} /> DOCX
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                      onClick={() => { if (confirm(t('confirm_delete'))) deleteMut.mutate(doc.id); }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
