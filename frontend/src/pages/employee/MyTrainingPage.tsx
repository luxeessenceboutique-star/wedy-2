import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, BookOpen, CircleCheck, Clock, GraduationCap } from 'lucide-react';
import { api, getApiError } from '@/services/api';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import './portal.css';

type Course = { id: string; title: string; category?: string; duration_hours?: number; provider?: string; description?: string };
type Mine = { id: string; training_id?: string; status: string; assigned_at?: string; completed_at?: string; score?: number | null; training_catalog?: Course };
type DocReq = { id: string; doc_type: string; comment?: string; status: string };
const getMine = () => api.get<Mine[]>('/portal/me/training').then(r => r.data).catch(() => []);
const getCatalog = () => api.get<Course[]>('/training/catalog').then(r => r.data).catch(() => []);
const getReqs = () => api.get<DocReq[]>('/portal/me/document-requests').then(r => r.data).catch(() => []);
const statLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' } as const;
const statValue = { fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 } as const;
const TINTS = [['#ece9fb', '#5444b8', 'linear-gradient(90deg,#5444b8,#9a8bf0)'], ['#e4f2f4', '#0b5f72', 'linear-gradient(90deg,#0e6f84,#16b6c8)'], ['#fbefda', '#8a5207', 'linear-gradient(90deg,#a8650a,#e6a948)']];

export default function MyTrainingPage() {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [year] = useState(() => new Date().getFullYear());
  const { data: mine = [], isLoading } = useQuery({ queryKey: ['portal-training'], queryFn: getMine });
  const { data: catalog = [] } = useQuery({ queryKey: ['training', 'catalog'], queryFn: getCatalog });
  const { data: reqs = [] } = useQuery({ queryKey: ['portal-doc-requests'], queryFn: getReqs });

  const reqTitle = (c: Course) => tf(t('ptrn_req_title'), { title: c.title });
  const ask = useMutation({
    mutationFn: (c: Course) => api.post('/portal/me/document-requests', { doc_type: 'autre', comment: reqTitle(c) }).then(r => r.data),
    onSuccess: (_, c) => { qc.invalidateQueries({ queryKey: ['portal-doc-requests'] }); notify.success(tf(t('ptrn_asked'), { title: c.title })); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  const current = mine.filter(m => m.status === 'in_progress' || m.status === 'planned');
  const done = mine.filter(m => m.status === 'completed');
  const hours = done.filter(m => (m.completed_at ?? '').startsWith(String(year))).reduce((s, m) => s + (m.training_catalog?.duration_hours ?? 0), 0);
  const mineIds = new Set(mine.map(m => m.training_id ?? m.training_catalog?.title));
  const recos = catalog.filter(c => !mineIds.has(c.id) && !mineIds.has(c.title)).slice(0, 4);
  const asked = (c: Course) => reqs.some(r => r.comment === reqTitle(c));

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 24px 56px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(28px,3vw,38px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('ptrn_title')}</RV>
        <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('ptrn_subtitle')}</RV>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <RV as="div" variant="up" delay={60} style={{ padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(135deg,#5444b8,#6d5ad6)', color: '#ffffff' }}><div style={{ ...statLabel, opacity: 0.9 }}>{t('ptrn_k_now')}</div><div style={statValue}>{current.length}</div></RV>
        <RV as="div" variant="up" delay={110} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}><div style={{ ...statLabel, color: '#5f7079' }}>{t('ptrn_k_done')}</div><div style={statValue}>{done.length}</div></RV>
        <RV as="div" variant="up" delay={160} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}><div style={{ ...statLabel, color: '#5f7079' }}>{tf(t('ptrn_k_hours'), { year })}</div><div style={statValue}>{hours} h</div></RV>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <RV as="div" variant="up" style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18 }}>{t('ptrn_now')}</RV>
        {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 14 }}>
          {current.map((c, i) => {
            const tint = TINTS[i % TINTS.length], pct = c.status === 'in_progress' ? 50 : 0;
            return (
              <RV key={c.id} as="div" variant="up" delay={i * 80} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint[0], color: tint[1], flexShrink: 0 }}><GraduationCap size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 600, fontSize: 16.5, letterSpacing: '-.02em', lineHeight: 1.25 }}>{c.training_catalog?.title ?? '—'}</div>
                    <div style={{ fontSize: 12.5, color: '#5f7079', marginTop: 3 }}>{[c.training_catalog?.provider, c.training_catalog?.duration_hours ? `${c.training_catalog.duration_hours} h` : ''].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: tint[0], color: tint[1], whiteSpace: 'nowrap' }}>{t(c.status === 'in_progress' ? 'trn_st_progress' : 'trn_st_planned')}</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: '#eef2f4', overflow: 'hidden' }}><div className={pct ? 'wedy-shimmer' : undefined} style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: tint[2], transition: 'width .8s cubic-bezier(.2,.8,.2,1)' }} /></div>
                {c.training_catalog?.description && <div style={{ fontSize: 13, lineHeight: 1.5, color: '#33474f' }}>{c.training_catalog.description}</div>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#33474f' }}><Clock size={14} style={{ color: '#7d8f97' }} />{tf(t('ptrn_since'), { date: c.assigned_at ? new Date(c.assigned_at).toLocaleDateString('fr-FR') : '—' })}</span>
              </RV>
            );
          })}
        </div>
        {!isLoading && !current.length && <div style={{ padding: 26, borderRadius: 18, border: '1px dashed #d0dadf', textAlign: 'center', fontSize: 14, color: '#52646d' }}>{t('ptrn_none_now')}</div>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <RV as="div" variant="up" delay={80} style={{ flex: '1.3 1 420px', minWidth: 0, padding: 20, borderRadius: 20, background: '#06141a', color: '#e8eff1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/wedy-avatar.png" alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', background: '#0f262e', border: '2px solid rgba(95,227,240,.5)' }} />
            <div><div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('ptrn_recos')}</div><div style={{ fontSize: 12.5, color: '#9fb4bb' }}>{t('ptrn_recos_sub')}</div></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {!recos.length && <div style={{ fontSize: 13, color: '#b9cbd0' }}>{t('ptrn_no_recos')}</div>}
            {recos.map((c, i) => (
              <RV key={c.id} as="div" variant="up" delay={i * 80} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', flexWrap: 'wrap' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(95,227,240,.12)', color: '#5fe3f0', flexShrink: 0 }}><BookOpen size={16} /></span>
                <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{c.title}</div><div style={{ fontSize: 12.5, color: '#b9cbd0', marginTop: 2 }}>{c.provider || c.description || ''}</div></div>
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11.5, color: '#9fb4bb' }}>{c.duration_hours ?? 0} h</span>
                {asked(c) ? <RV as="span" variant="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#4fd3a0' }}><CircleCheck size={14} />{t('ptrn_sent')}</RV>
                  : <button type="button" disabled={ask.isPending} onClick={() => ask.mutate(c)} style={{ height: 34, padding: '0 12px', border: 'none', borderRadius: 10, background: '#effbfc', color: '#06141a', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('ptrn_ask')}</button>}
              </RV>
            ))}
          </div>
        </RV>
        <RV as="div" variant="up" delay={140} style={{ flex: '1 1 300px', minWidth: 0, padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('ptrn_certs')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {!done.length && <div style={{ fontSize: 13, color: '#52646d' }}>{t('ptrn_no_certs')}</div>}
            {done.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, background: '#f8fafb' }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#0f6f49' }}><Award size={15} /></span>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{d.training_catalog?.title ?? '—'}</span><span style={{ display: 'block', fontSize: 12, color: '#5f7079' }}>{d.completed_at ? new Date(d.completed_at).toLocaleDateString('fr-FR') : ''}{d.score ? ` · ${d.score}/100` : ''}</span></span>
              </div>
            ))}
          </div>
        </RV>
      </div>
    </div>
  );
}
