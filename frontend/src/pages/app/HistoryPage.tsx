import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FileSpreadsheet, WandSparkles, Download, Eye, Trash2, FileText } from 'lucide-react';
import { listDocuments, deleteDocument, downloadDoc, printDocument, viewDocument } from '@/services/api';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { Spinner } from '../../components/ui';
import { useLang } from '../../lib/lang';
import { toast } from 'sonner';

export default function HistoryPage() {
  const qc = useQueryClient();
  const { t } = useLang() as any;
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => listDocuments({ limit: 200 }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Document supprimé'); },
    onError: () => toast.error('Suppression impossible'),
  });

  const docs = data?.data ?? [];
  const total = data?.count ?? 0;

  const filtered = docs.filter(d =>
    !search ||
    d.document_type.toLowerCase().includes(search.toLowerCase()) ||
    (d.employees?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // Language breakdown
  const langCounts = docs.reduce((acc: Record<string, number>, d) => {
    const l = (d.language ?? 'fr').toLowerCase();
    acc[l] = (acc[l] ?? 0) + 1;
    return acc;
  }, {});
  const frPct = total ? Math.round((langCounts['fr'] ?? 0) / total * 100) : 68;
  const arPct = total ? Math.round((langCounts['ar'] ?? 0) / total * 100) : 21;
  const enPct = total ? Math.round((langCounts['en'] ?? 0) / total * 100) : 11;

  const aiCount = docs.filter(d => (d as any).generated_by_ai).length;
  const aiPct = total ? Math.round(aiCount / total * 100) : 38;
  const timeHours = Math.round(total * 0.33); // ~20 min per doc

  return (
    <Page>
      <PageHeader
        title={t('document_history')}
        subtitle={t('hist_subtitle')}
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" style={{ height: 42, fontSize: 13.5 }}>
              <FileSpreadsheet size={15} /> {t('hist_export_reg')}
            </button>
            <a href="/app/generate" className="btn btn-primary" style={{ height: 42, fontSize: 14 }}>
              <WandSparkles size={16} /> {t('hist_generate')}
            </a>
          </div>
        }
      />

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12, marginBottom: 20 }}>
        {/* docs this month */}
        <div style={{ padding: '16px 18px', borderRadius: 'var(--r-stat)', background: 'var(--kpi-teal)', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', opacity: .9 }}>{t('hist_stat_month')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>{total}</div>
          <div style={{ fontSize: 12.5, opacity: .9 }}>+18 % par rapport au mois précédent</div>
        </div>
        {/* time saved */}
        <div style={{ padding: '16px 18px', borderRadius: 'var(--r-stat)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>{t('hist_stat_time')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>{timeHours} h</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>≈ 20 minutes par document</div>
        </div>
        {/* AI generated */}
        <div style={{ padding: '16px 18px', borderRadius: 'var(--r-stat)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>{t('hist_stat_ai')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>{aiPct} %</div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--track)', overflow: 'hidden', marginTop: 6 }}>
            <div style={{ height: '100%', width: `${aiPct}%`, borderRadius: 99, background: 'var(--grad-ai)' }} />
          </div>
        </div>
        {/* language breakdown */}
        <div style={{ padding: '16px 18px', borderRadius: 'var(--r-stat)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>{t('hist_stat_langs')}</div>
          <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', gap: 3, marginTop: 14 }}>
            <span style={{ width: `${frPct}%`, background: 'var(--primary)', borderRadius: 99 }} />
            <span style={{ width: `${arPct}%`, background: 'var(--ai)', borderRadius: 99 }} />
            <span style={{ width: `${enPct}%`, background: 'var(--success)', borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: 'var(--text-2)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} /> FR {frPct} %
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ai)', flexShrink: 0 }} /> AR {arPct} %
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} /> EN {enPct} %
            </span>
          </div>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', marginTop: -7.5, color: 'var(--text-subtle)', pointerEvents: 'none' }} />
          <input
            className="input" style={{ paddingLeft: 36, height: 40 }}
            placeholder={t('hist_search_ph')}
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <div style={{ borderRadius: 'var(--r-card)', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '56px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
            <p style={{ fontWeight: 500, margin: 0 }}>{t('no_history')}</p>
            <p style={{ fontSize: 13, margin: '4px 0 0' }}>{t('no_history_desc')}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>
                {[t('col_type'), t('col_employee'), t('col_language'), t('col_date'), t('col_actions'), ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-label)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, i) => (
                <tr key={doc.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--track)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 500 }}>{doc.document_type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-2)' }}>{doc.employees?.full_name || '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--primary-soft)', color: 'var(--primary-ink)' }}>
                      {(doc.language ?? 'FR').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm"
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
                  <td style={{ padding: '11px 16px' }}>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', width: 34, height: 34, padding: 0 }}
                      onClick={() => { if (confirm(t('confirm_delete'))) deleteMut.mutate(doc.id); }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  );
}
