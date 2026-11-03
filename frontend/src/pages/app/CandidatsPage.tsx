import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ClipboardCheck, GraduationCap, Megaphone, Plus, Search, Sparkles, Trash2, UserPlus, X, Mail, Phone } from 'lucide-react';
import { listAnnonces, listCandidates, listInterviews, createCandidate, updateEmployee, promoteToEmployee, promoteToIntern, deleteCandidate, getApiError } from '@/services/api';
import type { Employee, JobAd } from '@/services/api';
import { RV } from '@/components/motion';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { NO_AD, adGroups, adIdOf, STAGE_CHIP, stageOf, scoreOf, sourceOf, yearsOf, scoreColor, upcomingByCandidate, type Stage } from '@/lib/recruitment';
import { ScheduleInterviewDrawer } from '@/components/recruitment/ScheduleInterviewDrawer';
import './CandidatsPage.css';

const STAGE_LABEL: Record<Stage, TKey> = {
  new: 'rec_stage_new', screen: 'rec_stage_screen', interview: 'rec_stage_interview', offer: 'rec_stage_offer', hired: 'rec_stage_hired', rejected: 'cand_rejected',
};
const FILTERS: ('all' | Stage)[] = ['all', 'new', 'screen', 'interview', 'offer'];
const R = 2 * Math.PI * 19;
const inputStyle: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };

const summaryOf = (c: Employee) => (c.experience_summary || c.bio || c.notes || '').trim();

export default function CandidatsPage() {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<'all' | Stage>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [schedFor, setSchedFor] = useState<string | null>(null);
  const openId = params.get('c');
  const setOpen = (id: string | null) => setParams(p => { const n = new URLSearchParams(p); if (id) n.set('c', id); else n.delete('c'); return n; }, { replace: true });

  const { data: cands = [], isLoading } = useQuery<Employee[]>({ queryKey: ['candidates'], queryFn: listCandidates });
  const { data: interviews = [] } = useQuery({ queryKey: ['interviews'], queryFn: listInterviews });
  const { data: ads = [] } = useQuery<JobAd[]>({ queryKey: ['annonces'], queryFn: listAnnonces });
  const adSel = params.get('ad') ?? '';
  const setAdSel = (id: string) => setParams(p => { const n = new URLSearchParams(p); if (id) n.set('ad', id); else n.delete('ad'); return n; }, { replace: true });
  const adName = (c: Employee) => ads.find(a => a.id === adIdOf(c, ads))?.poste ?? '';
  const upcoming = useMemo(() => upcomingByCandidate(interviews), [interviews]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && openId) setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['candidates'] }); qc.invalidateQueries({ queryKey: ['employees'] }); };
  const fail = (e: unknown) => notify.error(getApiError(e, t('error')));
  const setStageMut = useMutation({
    mutationFn: ({ c, s }: { c: Employee; s: Stage }) => updateEmployee(c.id, { custom_fields: { ...(c.custom_fields ?? {}), recruitment_stage: s, stage_changed_at: new Date().toISOString() } }),
    onSuccess: refresh, onError: fail,
  });
  const promote = useMutation({
    mutationFn: ({ c, as }: { c: Employee; as: 'employee' | 'intern' }) => {
      const today = new Date().toISOString().slice(0, 10);
      const custom_fields = { ...(c.custom_fields ?? {}), recruitment_stage: 'hired', stage_changed_at: new Date().toISOString() };
      return as === 'employee' ? promoteToEmployee(c.id, { hire_date: today, custom_fields }) : promoteToIntern(c.id, { internship_start: today, custom_fields });
    },
    onSuccess: (_, { c, as }) => { refresh(); setOpen(null); notify.success(tf(t(as === 'employee' ? 'cand_promoted_emp' : 'cand_promoted_intern'), { name: c.full_name })); },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (c: Employee) => deleteCandidate(c.id),
    onSuccess: (_, c) => { refresh(); setOpen(null); notify.success(tf(t('cand_deleted'), { name: c.full_name })); },
    onError: fail,
  });

  const needle = q.trim().toLowerCase();
  const list = cands.filter(c => {
    const s = stageOf(c, upcoming.get(c.id));
    const hay = [c.full_name, c.position, c.email, ...(c.skills ?? [])].filter(Boolean).join(' ').toLowerCase();
    return (stage === 'all' || s === stage) && (!needle || hay.includes(needle)) && (!adSel || adIdOf(c, ads) === adSel);
  }).sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
  const cur = cands.find(c => c.id === openId);
  const curScore = cur ? scoreOf(cur) : null;
  const curStage = cur ? stageOf(cur, upcoming.get(cur.id)) : 'new';
  const yearsLabel = (c: Employee) => { const y = yearsOf(c); return y === null ? '' : tf(t(y > 1 ? 'cand_years' : 'cand_year'), { n: y }); };

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('cand_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('cand_subtitle')}</RV>
        </div>
        <RV as="button" variant="up" delay={100} type="button" onClick={() => setAddOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
          <Plus size={16} strokeWidth={2.2} />{t('cand_add')}
        </RV>
      </div>
      <RV as="div" variant="up" delay={100} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', insetInlineStart: 14, top: '50%', marginTop: -8, color: '#7d8f97', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('cand_search_ph')} style={{ width: '100%', height: 44, paddingInline: '40px 14px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 14, outline: 'none' }} className="cand-f1" />
        </div>
        <select value={adSel} onChange={e => setAdSel(e.target.value)} aria-label={t('cand_by_post')} style={{ height: 44, maxWidth: 280, padding: '0 34px 0 14px', borderRadius: 12, border: `1px solid ${adSel ? '#0e6f84' : '#d6dfe3'}`, background: adSel ? '#f2f9fa' : '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#0a1c24', cursor: 'pointer', outline: 'none' }}>
          <option value="">{tf(t('cand_all_posts'), { n: cands.length })}</option>
          {adGroups(cands, ads).map(g => <option key={g.id} value={g.id}>{g.ad ? `${g.ad.poste}${g.ad.is_active ? '' : ` (${t('ads_st_closed')})`}` : t('rec_no_ad')} · {g.n}</option>)}
        </select>
        {FILTERS.map(st => {
          const on = stage === st;
          return (
            <button key={st} type="button" onClick={() => setStage(st)} style={{ height: 38, padding: '0 13px', borderRadius: 99, border: `1px solid ${on ? '#0a1c24' : '#e2e8eb'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {st === 'all' ? t('cand_all') : t(STAGE_LABEL[st])}
            </button>
          );
        })}
      </RV>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
      ) : list.length === 0 ? (
        <div style={{ padding: '40px 20px', borderRadius: 18, border: '1px dashed #d0dadf', textAlign: 'center', fontSize: 14, color: '#52646d' }}>
          {cands.length ? t('cand_no_match') : t('cand_none')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14 }}>
          {list.map((c, k) => {
            const sc = scoreOf(c);
            const st = stageOf(c, upcoming.get(c.id));
            const src = sourceOf(c);
            const sum = summaryOf(c);
            return (
              <RV key={c.id} as="button" variant="up" delay={Math.min(k, 12) * 50} type="button" onClick={() => setOpen(c.id)}
                style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 20, border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', transition: 'border-color .2s,box-shadow .2s,transform .2s' }} className="cand-h1">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                  <span style={{ width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(c.full_name), color: '#ffffff', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{initialsOf(c.full_name)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#0a1c24' }}>{c.full_name}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: '#5f7079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.position || '—'}</span>
                  </span>
                  {sc !== null && <ScoreRing score={sc} />}
                </div>
                {sum && <div style={{ fontSize: 13, lineHeight: 1.5, color: '#33474f', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sum}</div>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: '100%', marginTop: sum ? 0 : 'auto' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: STAGE_CHIP[st][0], color: STAGE_CHIP[st][1] }}>{t(STAGE_LABEL[st])}</span>
                  {!adSel && adName(c) && <span title={adName(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: 170, fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: '#e4f2f4', color: '#0b5f72', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Megaphone size={11} />{adName(c)}</span>}
                  {src && <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: '#f3f6f7', color: '#33474f' }}>{src}</span>}
                  <span style={{ marginInlineStart: 'auto', fontFamily: "'Geist Mono',monospace", fontSize: 11.5, color: '#7d8f97' }}>{yearsLabel(c)}</span>
                </div>
              </RV>
            );
          })}
        </div>
      )}

      {cur && (
        <>
          <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(6,20,26,.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
          <RV key={cur.id} as="div" variant="left" role="dialog" aria-modal="true" aria-label={cur.full_name} style={{ position: 'fixed', top: 0, insetInlineEnd: 0, bottom: 0, zIndex: 101, width: 'min(520px,100vw)', display: 'flex', flexDirection: 'column', background: '#ffffff', boxShadow: '-30px 0 80px -30px rgba(6,20,26,.5)', overflowY: 'auto' }}>
            <div style={{ position: 'relative', overflow: 'hidden', padding: 24, background: '#06141a', color: '#e8eff1', isolation: 'isolate' }}>
              <div aria-hidden="true" className="wedy-drift" style={{ position: 'absolute', right: -80, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)', zIndex: -1 }} />
              <button type="button" onClick={() => setOpen(null)} aria-label={t('close')} style={{ position: 'absolute', top: 16, insetInlineEnd: 16, width: 36, height: 36, border: 'none', borderRadius: 10, background: 'rgba(255,255,255,.08)', color: '#e8eff1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={17} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 58, height: 58, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(cur.full_name), color: '#ffffff', fontSize: 19, fontWeight: 700, border: '2px solid rgba(255,255,255,.2)' }}>{initialsOf(cur.full_name)}</span>
                <div>
                  <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 23, letterSpacing: '-.03em' }}>{cur.full_name}</div>
                  <div style={{ fontSize: 13.5, color: '#9fb4bb' }}>{[cur.position, yearsLabel(cur)].filter(Boolean).join(' · ') || '—'}</div>
                </div>
              </div>
              {curScore !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18, padding: 14, borderRadius: 14, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 40, fontWeight: 800, letterSpacing: '-.04em', color: '#5fe3f0' }}>{curScore}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: '#b9cbd0' }}>{tf(t('cand_score_for'), { job: cur.position || '—' })}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 18, fontSize: 13, color: '#b9cbd0' }}>
                  {cur.email && <a href={`mailto:${cur.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b9cbd0' }}><Mail size={14} />{cur.email}</a>}
                  {cur.phone && <a href={`tel:${cur.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b9cbd0' }}><Phone size={14} />{cur.phone}</a>}
                </div>
              )}
            </div>
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: STAGE_CHIP[curStage][0], color: STAGE_CHIP[curStage][1] }}>{t(STAGE_LABEL[curStage])}</span>
                {sourceOf(cur) && <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: '#f3f6f7', color: '#33474f' }}>{sourceOf(cur)}</span>}
                {adName(cur) && <button type="button" onClick={() => { setAdSel(adIdOf(cur, ads)); setOpen(null); }} title={t('cand_see_post_cands')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99, border: 'none', background: '#e4f2f4', color: '#0b5f72', cursor: 'pointer', fontFamily: 'inherit' }}><Megaphone size={11} />{adName(cur)}</button>}
                {curScore !== null && cur.email && <a href={`mailto:${cur.email}`} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#0e6f84' }}><Mail size={13} />{cur.email}</a>}
              </div>
              {summaryOf(cur) && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5444b8' }}><Sparkles size={13} />{t('cand_ai_summary')}</div>
                  <div style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.6, color: '#1d3540', whiteSpace: 'pre-wrap' }}>{summaryOf(cur)}</div>
                </div>
              )}
              {cur.education_summary && <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#33474f' }}><b style={{ color: '#0a1c24' }}>{t('cand_education')} · </b>{cur.education_summary}</div>}
              {(cur.skills?.length || cur.languages?.length) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {[...(cur.skills ?? []), ...(cur.languages ?? [])].map(sk => <span key={sk} style={{ fontSize: 12.5, fontWeight: 600, padding: '5px 11px', borderRadius: 99, background: '#e4f2f4', color: '#0b5f72' }}>{sk}</span>)}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {upcoming.get(cur.id) ? (
                  <Link to={`/app/entretiens/${upcoming.get(cur.id)!.id}`} style={{ flex: 1.4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    <ClipboardCheck size={16} />{t('itv_open_room')}
                  </Link>
                ) : (
                  <button type="button" onClick={() => setSchedFor(cur.id)} style={{ flex: 1.4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <CalendarPlus size={16} />{t('pl_new_interview')}
                  </button>
                )}
                {curStage === 'rejected' ? (
                  <button type="button" onClick={() => setStageMut.mutate({ c: cur, s: 'new' })} style={{ flex: 1, height: 46, borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} className="cand-h3">{t('cand_reconsider')}</button>
                ) : (
                  <button type="button" onClick={() => { setStageMut.mutate({ c: cur, s: 'rejected' }, { onSuccess: () => notify.success(tf(t('cand_rejected_toast'), { name: cur.full_name })) }); }} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: 12, border: '1px solid #f0c9c0', background: '#ffffff', color: '#a33a28', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} className="cand-h2">{t('cand_reject')}</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid #eef2f4' }}>
                <button type="button" disabled={promote.isPending} onClick={() => { if (window.confirm(tf(t('rec_confirm_hire'), { name: cur.full_name }))) promote.mutate({ c: cur, as: 'employee' }); }} className="cand-ghost"><UserPlus size={14} />{t('cand_hire_employee')}</button>
                <button type="button" disabled={promote.isPending} onClick={() => { if (window.confirm(tf(t('cand_confirm_intern'), { name: cur.full_name }))) promote.mutate({ c: cur, as: 'intern' }); }} className="cand-ghost"><GraduationCap size={14} />{t('cand_hire_intern')}</button>
                <button type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(tf(t('cand_confirm_delete'), { name: cur.full_name }))) remove.mutate(cur); }} className="cand-ghost cand-danger" style={{ marginInlineStart: 'auto' }}><Trash2 size={14} />{t('delete')}</button>
              </div>
            </div>
          </RV>
        </>
      )}

      <ScheduleInterviewDrawer open={!!schedFor} onClose={() => setSchedFor(null)} candidates={cands} candidateId={schedFor ?? ''}
        onScheduled={c => { if (c) setStageMut.mutate({ c, s: 'interview' }); }} />
      <AddCandidateDrawer open={addOpen} onClose={() => setAddOpen(false)} onCreated={refresh} ads={ads} defaultAd={adSel !== NO_AD ? adSel : ''} />
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <span style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
      <svg viewBox="0 0 46 46" style={{ display: 'block', width: 46, height: 46, transform: 'rotate(-90deg)' }}>
        <circle cx="23" cy="23" r="19" style={{ fill: 'none', stroke: '#eef2f4', strokeWidth: 4.5 }} />
        <RV as="circle" variant="draw" frac={score / 100} cx="23" cy="23" r="19" style={{ fill: 'none', stroke: scoreColor(score), strokeWidth: 4.5, strokeLinecap: 'round', strokeDasharray: `${(R * score / 100).toFixed(1)}px ${R.toFixed(1)}px` }} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#0a1c24' }}>{score}</span>
    </span>
  );
}

function AddCandidateDrawer({ open, onClose, onCreated, ads, defaultAd }: { open: boolean; onClose: () => void; onCreated: () => void; ads: JobAd[]; defaultAd: string }) {
  const { t } = useLang();
  const notify = useNotify();
  const empty = { full_name: '', email: '', phone: '', position: ads.find(x => x.id === defaultAd)?.poste ?? '', source: '', notes: '', ad_id: defaultAd };
  const [f, setF] = useState(empty);
  const [lastKey, setLastKey] = useState(`${open}|${defaultAd}`);
  if (`${open}|${defaultAd}` !== lastKey) { setLastKey(`${open}|${defaultAd}`); if (open) setF(empty); }
  const pickAd = (id: string) => setF(x => ({ ...x, ad_id: id, position: ads.find(a => a.id === id)?.poste ?? x.position }));
  const set = (k: keyof typeof empty, v: string) => setF(x => ({ ...x, [k]: v }));
  const mut = useMutation({
    mutationFn: async () => {
      const c = await createCandidate({ full_name: f.full_name.trim(), email: f.email.trim() || undefined, phone: f.phone.trim() || undefined, position: f.position.trim() || undefined, notes: f.notes.trim() || undefined });
      if (c?.id) await updateEmployee(c.id, { custom_fields: { ...(c.custom_fields ?? {}), ...(f.source.trim() ? { source: f.source.trim() } : {}), ...(f.ad_id ? { ad_id: f.ad_id } : {}), recruitment_stage: 'new', stage_changed_at: new Date().toISOString() } });
      return c;
    },
    onSuccess: () => { notify.success(t('cand_added')); setF(empty); onCreated(); onClose(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const submit = (e?: FormEvent) => { e?.preventDefault(); if (!f.full_name.trim()) { notify.error(t('cand_name_required')); return; } mut.mutate(); };
  return (
    <Drawer open={open} onClose={onClose} title={t('cand_add')} subtitle={t('cand_add_sub')} icon={<UserPlus size={17} />} width={480}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={() => submit()} disabled={mut.isPending}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Plus size={14} />} {t('cand_add')}</button>
      </>}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={labelStyle}>{t('cand_post')}</label>
          <select value={f.ad_id} onChange={e => pickAd(e.target.value)} style={inputStyle}>
            <option value="">{t('rec_no_ad')}</option>
            {ads.filter(a => a.is_active || a.id === f.ad_id).map(a => <option key={a.id} value={a.id}>{a.poste}{a.description ? ` · ${a.description}` : ''}</option>)}
          </select>
        </div>
        <div><label style={labelStyle}>{t('cand_full_name')} *</label><input value={f.full_name} onChange={e => set('full_name', e.target.value)} style={inputStyle} autoFocus /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Email</label><input type="email" value={f.email} onChange={e => set('email', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('cand_phone')}</label><input value={f.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>{t('cand_position')}</label><input value={f.position} onChange={e => set('position', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('cand_source')}</label><input value={f.source} onChange={e => set('source', e.target.value)} placeholder="LinkedIn, Rekrute…" style={inputStyle} /></div>
        </div>
        <div><label style={labelStyle}>{t('pl_notes')}</label><textarea rows={4} value={f.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }} /></div>
      </form>
    </Drawer>
  );
}
