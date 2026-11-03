import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, FileSpreadsheet, FileText, Search, SearchX, Trash2, WandSparkles } from 'lucide-react';
import { listDocuments, listTemplates, deleteDocument, printDocument, viewDocument, getApiError } from '@/services/api';
import type { GeneratedDoc } from '@/services/api';
import { RV, CountText } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import './HistoryPage.css';

// [label key, tint, text] per template category — same palette as Templates
const CAT: Record<string, [TKey, string, string]> = {
  attestation: ['tpl_attestation', '#e1f5ec', '#0f6f49'], contrat: ['tpl_contrat', '#e4f2f4', '#0b5f72'], lettre: ['tpl_lettre', '#fbefda', '#8a5207'],
  avenant: ['tpl_avenant', '#ece9fb', '#5444b8'], autre: ['tpl_autre', '#eef2f4', '#33474f'],
};
const MIN_PER_DOC = 20; // time saved per generated document (estimate shown as such)
const statLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' } as const;
const statValue = { fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4, lineHeight: 1.1 } as const;

function exportRegister(docs: GeneratedDoc[], catName: (d: GeneratedDoc) => string) {
  const head = ['Date', 'Heure', 'Document', 'Type', 'Collaborateur', 'Langue'];
  const rows = docs.map(d => { const c = new Date(d.created_at); return [c.toLocaleDateString('fr-FR'), c.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), d.name || d.document_type, catName(d), d.employees?.full_name ?? '', (d.language || 'fr').toUpperCase()]; });
  const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `registre_documents_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const { t, lang: uiLang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [lang, setLang] = useState('all');
  const [now] = useState(() => new Date());

  const { data, isLoading } = useQuery({ queryKey: ['documents'], queryFn: () => listDocuments({ limit: 1000 }) });
  const { data: tpls } = useQuery({ queryKey: ['templates'], queryFn: () => listTemplates({ active_only: false }) });
  const docs = useMemo(() => [...(data?.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)), [data]);
  const tplCat = useMemo(() => new Map((tpls?.data ?? []).map(x => [x.id, x.category])), [tpls]);
  const catKey = (d: GeneratedDoc) => { const c = tplCat.get(d.template_id) ?? ''; return c in CAT ? c : 'autre'; };

  const remove = useMutation({
    mutationFn: (d: GeneratedDoc) => deleteDocument(d.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); notify.success(t('hist_deleted')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  // ── KPIs ──
  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = docs.filter(d => d.created_at.startsWith(ym(now))).length;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = docs.filter(d => d.created_at.startsWith(ym(prev))).length;
  const delta = lastMonth ? Math.round((thisMonth - lastMonth) / lastMonth * 100) : null;
  const monthName = now.toLocaleDateString(uiLang === 'ar' ? 'ar-MA' : uiLang === 'en' ? 'en-GB' : 'fr-FR', { month: 'long' });
  const hours = Math.round(docs.length * MIN_PER_DOC / 60);
  const people = new Set(docs.map(d => d.employee_id).filter(Boolean)).size;
  const counts = ['fr', 'ar', 'en'].map(l => docs.filter(d => (d.language || 'fr').toLowerCase() === l).length);
  const pct = counts.map(c => (docs.length ? Math.round(c / docs.length * 100) : 0));

  // ── list ──
  const needle = q.trim().toLowerCase();
  const list = docs.filter(d => (type === 'all' || catKey(d) === type) && (lang === 'all' || (d.language || 'fr').toLowerCase() === lang)
    && (!needle || `${d.name ?? ''} ${d.document_type} ${d.employees?.full_name ?? ''}`.toLowerCase().includes(needle)));
  const dayLabel = (iso: string) => {
    const d = new Date(iso), d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((d0.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 864e5);
    if (diff === 0) return t('hist_today');
    if (diff === 1) return t('hist_yesterday');
    const s = d.toLocaleDateString(uiLang === 'ar' ? 'ar-MA' : uiLang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const groups: { label: string; items: GeneratedDoc[] }[] = [];
  list.slice(0, 300).forEach(d => { const l = dayLabel(d.created_at); const g = groups.find(x => x.label === l); if (g) g.items.push(d); else groups.push({ label: l, items: [d] }); });

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('hist_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('hist_subtitle')}</RV>
        </div>
        <RV as="div" variant="up" delay={100} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => (list.length ? exportRegister(list, d => t(CAT[catKey(d)][0])) : notify.info(t('hist_nothing')))} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} className="hist-h1">
            <FileSpreadsheet size={15} />{t('hist_export_reg')}
          </button>
          <Link to="/app/generate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }} className="hist-h2">
            <WandSparkles size={16} />{t('hist_generate')}
          </Link>
        </RV>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
        <RV as="div" variant="up" delay={60} style={{ padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(135deg,#0b5f72,#0e7f96)', color: '#ffffff' }}>
          <div style={{ ...statLabel, opacity: 0.9 }}>{tf(t('hist_k_month'), { month: monthName })}</div>
          <CountText as="div" text={String(thisMonth)} style={statValue} />
          <div style={{ fontSize: 12.5, opacity: 0.9 }}>{delta === null ? tf(t('hist_k_total'), { n: docs.length }) : tf(t('hist_k_delta'), { pct: `${delta >= 0 ? '+' : ''}${delta}` })}</div>
        </RV>
        <RV as="div" variant="up" delay={110} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ ...statLabel, color: '#5f7079' }}>{t('hist_k_time')}</div>
          <div style={statValue}>{hours} h</div>
          <div style={{ fontSize: 12.5, color: '#52646d' }}>{tf(t('hist_k_time_sub'), { n: MIN_PER_DOC })}</div>
        </RV>
        <RV as="div" variant="up" delay={160} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ ...statLabel, color: '#5f7079' }}>{t('hist_k_people')}</div>
          <div style={statValue}>{people}</div>
          <div style={{ fontSize: 12.5, color: '#52646d' }}>{tf(t('hist_k_people_sub'), { n: docs.length })}</div>
        </RV>
        <RV as="div" variant="up" delay={210} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ ...statLabel, color: '#5f7079' }}>{t('hist_k_langs')}</div>
          <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', gap: 3, marginTop: 14, background: docs.length ? 'transparent' : '#eef2f4' }}>
            {pct.map((p, i) => p > 0 && <RV key={i} as="span" variant="growx" delay={i * 120} style={{ width: `${p}%`, background: ['#0e6f84', '#6d5ad6', '#16a06b'][i], borderRadius: 99, transformOrigin: 'left' }} />)}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: '#33474f' }}>
            {['FR', 'AR', 'EN'].map((l, i) => <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: ['#0e6f84', '#6d5ad6', '#16a06b'][i] }} />{l} {pct[i]} %</span>)}
          </div>
        </RV>
      </div>

      <RV as="div" variant="up" delay={120} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', marginTop: -7.5, color: '#7d8f97', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('hist_search_ph')} style={{ width: '100%', height: 40, paddingInline: '36px 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' }} className="hist-f1" />
        </div>
        <select value={type} onChange={e => setType(e.target.value)} style={{ height: 40, padding: '0 30px 0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: '#33474f', cursor: 'pointer', outline: 'none' }}>
          <option value="all">{t('hist_all_types')}</option>
          {Object.keys(CAT).map(k => <option key={k} value={k}>{t(CAT[k][0])}</option>)}
        </select>
        {['all', 'fr', 'ar', 'en'].map(l => {
          const on = lang === l;
          return <button key={l} type="button" onClick={() => setLang(l)} style={{ height: 34, padding: '0 12px', borderRadius: 99, border: `1px solid ${on ? '#0a1c24' : '#e2e8eb'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: l === 'all' ? 'inherit' : "'Geist Mono',monospace", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{l === 'all' ? t('hist_all') : l.toUpperCase()}</button>;
        })}
      </RV>

      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>}
      {groups.map(g => (
        <RV key={g.label} as="div" variant="up" style={{ borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: '#f8fafb' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 14.5 }}>{g.label}</span>
            <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11.5, color: '#5f7079' }}>{tf(t(g.items.length > 1 ? 'hist_n_docs' : 'hist_n_doc'), { n: g.items.length })}</span>
          </div>
          {g.items.map((d, i) => {
            const c = CAT[catKey(d)];
            const title = d.name || d.document_type;
            const isAr = /[؀-ۿ]/.test(title);
            const emp = d.employees?.full_name || '—';
            return (
              <RV key={d.id} as="div" variant="up" delay={Math.min(i, 8) * 40} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderTop: '1px solid #eef2f4', flexWrap: 'wrap', transition: 'background .15s' }} className="hist-h3">
                <span style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c[1], color: c[2], flexShrink: 0 }}><FileText size={17} /></span>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div dir={isAr ? 'rtl' : undefined} style={{ fontSize: 14, fontWeight: 600, textAlign: uiLang === 'ar' ? 'right' : 'left', fontFamily: isAr ? "'Noto Kufi Arabic',system-ui,sans-serif" : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: '#5f7079' }}>{t(c[0])}{d.name && d.document_type && d.document_type !== d.name ? ` · ${d.document_type}` : ''}</div>
                </div>
                <span style={{ flex: '0 1 190px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(emp), color: '#ffffff', fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>{initialsOf(emp)}</span>
                  <span style={{ fontSize: 13, color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp}</span>
                </span>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 7, background: '#eef5f7', color: '#0b5f72' }}>{(d.language || 'fr').toUpperCase()}</span>
                <span style={{ width: 46, fontFamily: "'Geist Mono',monospace", fontSize: 12, color: '#7d8f97', textAlign: 'end' }}>{new Date(d.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ display: 'flex', gap: 2 }}>
                  <button type="button" aria-label={t('preview')} title={t('preview')} onClick={() => viewDocument(d.id, title).catch(e => notify.error(e.message))} className="hist-ic"><Eye size={16} /></button>
                  <button type="button" aria-label={t('hist_download')} title={t('hist_download')} onClick={() => printDocument(d.id, title).catch(e => notify.error(e.message))} className="hist-ic hist-ic-dl"><Download size={16} /></button>
                  <button type="button" aria-label={t('delete')} title={t('delete')} onClick={() => { if (window.confirm(tf(t('hist_confirm_delete'), { name: title }))) remove.mutate(d); }} className="hist-ic hist-ic-del"><Trash2 size={16} /></button>
                </span>
              </RV>
            );
          })}
        </RV>
      ))}
      {!isLoading && !list.length && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 20px', borderRadius: 20, background: '#ffffff', border: '1px dashed #d0dadf', textAlign: 'center' }}>
          <span style={{ width: 50, height: 50, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f6f7', color: '#7d8f97' }}><SearchX size={22} /></span>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{t(docs.length ? 'hist_no_match' : 'no_history')}</div>
          <div style={{ fontSize: 14, color: '#52646d' }}>{t(docs.length ? 'hist_no_match_sub' : 'no_history_desc')}</div>
          {docs.length > 0 && <button type="button" onClick={() => { setQ(''); setType('all'); setLang('all'); }} style={{ marginTop: 6, height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#0a1c24', cursor: 'pointer' }}>{t('tdr_reset')}</button>}
        </div>
      )}
    </div>
  );
}
