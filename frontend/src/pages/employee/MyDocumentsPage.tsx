import { useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Download, FileCheck, FileText, FileX, Send, Sparkles } from 'lucide-react';
import { api, getApiError } from '@/services/api';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import './portal.css';

type DocReq = { id: string; doc_type: string; comment?: string; status: string; hr_note?: string; created_at?: string };
type MyDoc = { id: string; name?: string; document_type: string; language?: string; created_at: string };
const getReqs = () => api.get<DocReq[]>('/portal/me/document-requests').then(r => r.data).catch(() => []);
const getDocs = () => api.get<MyDoc[]>('/portal/me/documents').then(r => r.data).catch(() => []);

const TYPES: [string, TKey, TKey][] = [
  ['attestation_travail', 'doc_type_attestation_travail', 'pdoc_sub_work'], ['bulletin_paie', 'doc_type_bulletin_paie', 'pdoc_sub_payslip'],
  ['attestation_conge', 'doc_type_attestation_conge', 'pdoc_sub_leave'], ['certificat_presence', 'doc_type_certificat_presence', 'pdoc_sub_presence'],
  ['lettre_recommandation', 'doc_type_lettre_recommandation', 'pdoc_sub_reco'], ['autre', 'doc_type_autre', 'pdoc_sub_other'],
];
const MOTIFS: TKey[] = ['pdoc_m_bank', 'pdoc_m_visa', 'pdoc_m_admin', 'pdoc_m_rent', 'pdoc_m_other'];
const LANGS = [['fr', 'Français', 'inherit'], ['ar', 'العربية', "'Noto Kufi Arabic',system-ui,sans-serif"], ['en', 'English', 'inherit']] as const;
const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };

async function openMyDoc(id: string, title: string) {
  const { data } = await api.get<{ content?: string }>(`/portal/me/documents/${id}`);
  const w = window.open('', '_blank'); if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{size:A4;margin:2.5cm 2.8cm}body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;margin:0;color:#1a1a1a}img{max-width:100%}</style></head><body>${data.content ?? ''}</body></html>`);
  w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 350);
}

export default function MyDocumentsPage() {
  const { t, lang: ui } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const loc = LOCALE[ui] ?? 'fr-FR';
  const [type, setType] = useState('attestation_travail');
  const [lang, setLang] = useState<'fr' | 'ar' | 'en'>('fr');
  const [motif, setMotif] = useState<TKey>('pdoc_m_bank');
  const { data: reqs = [], isLoading } = useQuery({ queryKey: ['portal-doc-requests'], queryFn: getReqs });
  const { data: docs = [] } = useQuery({ queryKey: ['portal-documents'], queryFn: getDocs });
  const label = (k: string) => { const x = TYPES.find(y => y[0] === k); return x ? t(x[1]) : k; };

  const mut = useMutation({
    mutationFn: () => api.post('/portal/me/document-requests', { doc_type: type, comment: `${t('pdoc_lang')} : ${lang.toUpperCase()} · ${t('pdoc_motif')} : ${t(motif)}` }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-doc-requests'] }); qc.invalidateQueries({ queryKey: ['portal-stats'] }); notify.success(tf(t('pdoc_sent'), { doc: label(type) })); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  const pending = reqs.filter(r => r.status === 'pending' || r.status === 'in_progress');
  const done = reqs.filter(r => r.status === 'completed' || r.status === 'rejected');
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const row = (key: string, icon: typeof FileText, tint: string, color: string, title: string, sub: string, right: React.ReactNode) => {
    const Icon = icon; const ar = /[؀-ۿ]/.test(title);
    return (
      <RV key={key} as="div" variant="up" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderTop: '1px solid #eef2f4' }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint, color, flexShrink: 0 }}><Icon size={17} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div dir={ar ? 'rtl' : undefined} style={{ fontSize: 14, fontWeight: 600, textAlign: ui === 'ar' ? 'right' : 'left', fontFamily: ar ? "'Noto Kufi Arabic',system-ui,sans-serif" : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          <div style={{ fontSize: 12.5, color: '#5f7079' }}>{sub}</div>
        </div>
        {right}
      </RV>
    );
  };
  const group = (title: string, children: React.ReactNode[]) => children.length ? (
    <RV as="div" variant="up" style={{ borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', background: '#f8fafb' }}><span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 14.5 }}>{title}</span><span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11.5, color: '#5f7079' }}>{children.length}</span></div>
      {children}
    </RV>
  ) : null;
  const selectStyle: CSSProperties = { height: 42, padding: '0 10px', borderRadius: 11, border: '1px solid rgba(255,255,255,.14)', background: '#0d2229', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, outline: 'none' };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 24px 56px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(28px,3vw,38px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('pdoc_title')}</RV>
        <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('pdoc_subtitle')}</RV>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <RV as="div" variant="up" delay={100} style={{ position: 'relative', overflow: 'hidden', flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: 22, borderRadius: 22, background: '#06141a', color: '#e8eff1', isolation: 'isolate' }}>
          <div aria-hidden="true" className="wedy-drift" style={{ position: 'absolute', right: -90, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)', zIndex: -1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/wedy-avatar.png" alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: '#0f262e', border: '2px solid rgba(95,227,240,.5)' }} />
            <div><div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18 }}>{t('pdoc_ask_title')}</div><div style={{ fontSize: 12.5, color: '#9fb4bb' }}>{t('pdoc_ask_sub')}</div></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TYPES.map(([k, l, sub]) => {
              const on = type === k;
              return (
                <button key={k} type="button" onClick={() => setType(k)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, border: `1px solid ${on ? 'rgba(95,227,240,.55)' : 'rgba(255,255,255,.1)'}`, background: on ? 'rgba(22,182,200,.14)' : 'rgba(255,255,255,.04)', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', color: '#e8eff1' }}>
                  <FileText size={16} style={{ color: on ? '#5fe3f0' : '#8ea5ad', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{t(l)}</span><span style={{ display: 'block', fontSize: 12, color: '#9fb4bb' }}>{t(sub)}</span></span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
            {LANGS.map(([k, l, f]) => {
              const on = lang === k;
              return <button key={k} type="button" onClick={() => setLang(k)} style={{ height: 40, borderRadius: 11, border: `1px solid ${on ? '#5fe3f0' : 'rgba(255,255,255,.14)'}`, background: on ? 'rgba(95,227,240,.14)' : 'transparent', color: on ? '#ffffff' : '#b9cbd0', fontFamily: f, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{l}</button>;
            })}
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#b9cbd0' }}>{t('pdoc_motif')}
            <select value={motif} onChange={e => setMotif(e.target.value as TKey)} style={selectStyle}>{MOTIFS.map(m => <option key={m} value={m}>{t(m)}</option>)}</select>
          </label>
          <button type="button" onClick={() => mut.mutate()} disabled={mut.isPending} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, border: 'none', borderRadius: 13, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            <span className="wedy-shine" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} />
            {mut.isPending ? <Spinner size={16} color="#fff" /> : <Send size={16} style={{ position: 'relative' }} />}<span style={{ position: 'relative' }}>{t('pdoc_send')}</span>
          </button>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#9fb4bb' }}><Sparkles size={13} />{t('pdoc_note')}</span>
        </RV>

        <div style={{ flex: '1.3 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>}
          {group(t('pdoc_g_pending'), pending.map(r => row(r.id, Clock, '#fbefda', '#b06b0c', label(r.doc_type), `${when(r.created_at)}${r.comment ? ` · ${r.comment}` : ''}`,
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#fbefda', color: '#8a5207', whiteSpace: 'nowrap' }}>{t('pdoc_hr_check')}</span>)))}
          {group(t('pdoc_g_docs'), docs.map(d => row(d.id, FileCheck, '#e1f5ec', '#0f6f49', d.name || d.document_type, when(d.created_at),
            <>
              {d.language && <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 6, background: '#eef5f7', color: '#0b5f72' }}>{d.language.toUpperCase()}</span>}
              <button type="button" aria-label={t('pdoc_download')} title={t('pdoc_download')} onClick={() => openMyDoc(d.id, d.name || d.document_type).catch(e => notify.error(getApiError(e, t('error'))))} style={{ width: 36, height: 36, border: 'none', borderRadius: 10, background: '#f3f6f7', color: '#33474f', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="pdoc-dl"><Download size={16} /></button>
            </>)))}
          {group(t('pdoc_g_done'), done.map(r => row(r.id, r.status === 'rejected' ? FileX : FileCheck, r.status === 'rejected' ? '#fbe9e6' : '#e4f2f4', r.status === 'rejected' ? '#a33a28' : '#0b5f72', label(r.doc_type), `${when(r.created_at)}${r.hr_note ? ` · ${r.hr_note}` : ''}`,
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: r.status === 'rejected' ? '#fbe9e6' : '#e1f5ec', color: r.status === 'rejected' ? '#a33a28' : '#0f6f49', whiteSpace: 'nowrap' }}>{t(r.status === 'rejected' ? 'ptl_st_rejected' : 'pdoc_done')}</span>)))}
          {!isLoading && !reqs.length && !docs.length && <div style={{ padding: '36px 20px', borderRadius: 20, border: '1px dashed #d0dadf', textAlign: 'center', fontSize: 14, color: '#52646d' }}>{t('pdoc_none')}</div>}
        </div>
      </div>
    </div>
  );
}
