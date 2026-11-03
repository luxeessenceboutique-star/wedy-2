// The intern's file — side drawer with 4 tabs: profile, onboarding (phase, mentor, objectives, checklist,
// Moovwin evaluations), documents (scans + generated documents, e-signature) and admin (hire, edit, delete).
import { useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Award, Briefcase, Calendar, CheckCircle2, ClipboardList, FileText, FileUp, GraduationCap, Link2, Mail, Pencil, Phone, Plus,
  Settings, Target, Trash2, User, UserCheck, WandSparkles, X,
} from 'lucide-react';
import {
  createInternEvaluation, deleteDocument, deleteInternEvaluation, getApiError, getInternOnboarding, listDocuments, listInternEvaluations,
  sendForSignature, updateInternOnboarding, uploadDocument,
  type ChecklistItem, type Intern, type InternEvaluation, type InternOnboarding,
} from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { PHASES, SCORES, STAGE_KEY, TYPE_KEY, daysLeft, fmtDate, linkLabel, stageTone, typeTone, type PhaseId } from './internMeta';

export type DossierTab = 'info' | 'onboarding' | 'docs' | 'admin';
const card: CSSProperties = { padding: '14px 16px', borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8eb' };
const kicker: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Geist Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5f7079', marginBottom: 10 };
const inp: CSSProperties = { height: 38, padding: '0 11px', borderRadius: 10, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none', width: '100%', boxSizing: 'border-box' };
const ghost: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#0a1c24', cursor: 'pointer', whiteSpace: 'nowrap' };
const photo = (src?: string) => (src ? (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/') ? src : `data:image/jpeg;base64,${src}`) : '');

export function InternDossier({ intern, tab, onTab, onClose, onEdit, onDelete, onConvert, converting }: {
  intern: Intern | null; tab: DossierTab; onTab: (t: DossierTab) => void; onClose: () => void;
  onEdit: (i: Intern) => void; onDelete: (i: Intern) => void; onConvert: (i: Intern) => void; converting: boolean;
}) {
  const { t } = useLang();
  if (!intern) return null;
  const [sBg, sInk, sDot] = stageTone(intern.internship_status);
  const left = daysLeft(intern.internship_end);
  const TABS: [DossierTab, TKey, ReactNode][] = [['info', 'stg_t_profile', <User size={14} key="u" />], ['onboarding', 'stg_t_onboarding', <ClipboardList size={14} key="c" />], ['docs', 'stg_t_docs', <FileText size={14} key="f" />], ['admin', 'stg_t_admin', <Settings size={14} key="s" />]];
  return (
    <Drawer open onClose={onClose} width={760} title={intern.full_name} subtitle={intern.position || t('stg_intern')} icon={<GraduationCap size={19} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, background: 'linear-gradient(135deg,#f2f9fa,#f6f4fd)', border: '1px solid #e2eef0', flexWrap: 'wrap' }}>
          <span style={{ width: 60, height: 60, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 19, background: intern.photo_url ? `center/cover url(${photo(intern.photo_url)})` : avatarGradient(intern.full_name) }}>{!intern.photo_url && initialsOf(intern.full_name)}</span>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: sBg, color: sInk }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: sDot }} />{intern.internship_status ? t(STAGE_KEY[intern.internship_status] ?? 'stg_none') : t('stg_no_status')}</span>
              {intern.internship_type && <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: typeTone(intern.internship_type)[0], color: typeTone(intern.internship_type)[1] }}>{t(TYPE_KEY[intern.internship_type] ?? 'stg_none')}</span>}
              {intern.status !== 'intern' && <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#e1f5ec', color: '#0f6f49' }}>{t('stg_hired')}</span>}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8, fontSize: 12.5, color: '#52646d' }}>
              {intern.email && <a href={`mailto:${intern.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'inherit', textDecoration: 'none' }}><Mail size={13} />{intern.email}</a>}
              {intern.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={13} />{intern.phone}</span>}
              {(intern.internship_start || intern.internship_end) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Calendar size={13} />{fmtDate(intern.internship_start)} → {fmtDate(intern.internship_end)}{left !== null && left >= 0 && left <= 30 ? ` · ${tf(t('stg_days_left'), { n: left })}` : ''}</span>}
            </div>
          </div>
          <button type="button" style={ghost} onClick={() => onEdit(intern)}><Pencil size={13} />{t('stg_edit')}</button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 13, background: '#f3f6f7', flexWrap: 'wrap' }}>
          {TABS.map(([k, key, icon]) => (
            <button key={k} type="button" onClick={() => onTab(k)} style={{ flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 36, padding: '0 12px', border: 'none', borderRadius: 10, background: tab === k ? '#ffffff' : 'transparent', boxShadow: tab === k ? '0 1px 3px rgba(10,28,36,.14)' : 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: tab === k ? '#0a1c24' : '#52646d', cursor: 'pointer' }}>{icon}{t(key)}</button>
          ))}
        </div>

        {tab === 'info' && <ProfileTab intern={intern} />}
        {tab === 'onboarding' && <OnboardingTab intern={intern} />}
        {tab === 'docs' && <DocsTab intern={intern} />}
        {tab === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={card}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: 0 }}><Briefcase size={18} /></span>
                <div style={{ flex: '1 1 260px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0a1c24' }}>{t('stg_convert_title')}</div>
                  <div style={{ fontSize: 13, color: '#52646d', marginTop: 2 }}>{t('stg_convert_s')}</div>
                </div>
                <button type="button" className="btn btn-primary" disabled={converting || intern.status === 'active'} onClick={() => onConvert(intern)}>
                  {converting ? <Spinner size={13} color="#fff" /> : <CheckCircle2 size={14} />}{t(intern.status === 'active' ? 'stg_hired' : 'stg_convert')}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={{ ...ghost, height: 42, flex: 1 }} onClick={() => onEdit(intern)}><Pencil size={14} />{t('stg_edit_profile')}</button>
              <GenerateBtn id={intern.id} />
              <button type="button" style={{ ...ghost, height: 42, flex: 1, color: '#a33a28', borderColor: '#f0c9c0' }} onClick={() => onDelete(intern)}><Trash2 size={14} />{t('stg_delete_file')}</button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function GenerateBtn({ id }: { id: string }) {
  const { t } = useLang();
  const nav = useNavigate();
  return <button type="button" style={{ ...ghost, height: 42, flex: 1 }} onClick={() => nav(`/app/generate?employee_id=${id}`)}><WandSparkles size={14} />{t('stg_generate')}</button>;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: '1px solid #f0f3f5', fontSize: 13 }}>
      <span style={{ color: '#5f7079' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#0a1c24', textAlign: 'end', maxWidth: '62%', wordBreak: 'break-word' }}>{value || '—'}</span>
    </div>
  );
}

function Ext({ url }: { url?: string | null }) {
  if (!url) return <>—</>;
  if (!/^https?:\/\//.test(url)) return <>{url}</>;
  return <a href={url} target="_blank" rel="noreferrer" style={{ color: '#0e6f84', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Link2 size={12} />{linkLabel(url)}</a>;
}

function ProfileTab({ intern }: { intern: Intern }) {
  const { t } = useLang();
  const pay = Number(intern.remuneration ?? 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={card}>
          <div style={kicker}>{t('stg_bio')}</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#22343c', whiteSpace: 'pre-wrap' }}>{intern.bio || <span style={{ color: '#7d8f97' }}>{t('stg_not_set')}</span>}</p>
        </div>
        <div style={card}>
          <div style={kicker}>{t('stg_f_skills')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[...(intern.skills ?? []), ...(intern.languages ?? [])].length
              ? [...(intern.skills ?? []).map(s => [s, false] as const), ...(intern.languages ?? []).map(s => [s, true] as const)].map(([s, lang]) => <span key={s} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: lang ? '#ece9fb' : '#e4f2f4', color: lang ? '#5444b8' : '#0b5f72' }}>{s}</span>)
              : <span style={{ color: '#7d8f97', fontSize: 13 }}>—</span>}
          </div>
        </div>
        {(intern.test_code_source || intern.test_demo_link || intern.test_cv || intern.test_note_rh || intern.test_note_test) && (
          <div style={card}>
            <div style={kicker}>{t('stg_k_test')}</div>
            <Row label={t('stg_f_code')} value={<Ext url={intern.test_code_source} />} />
            <Row label={t('stg_f_demo')} value={<Ext url={intern.test_demo_link} />} />
            <Row label={t('stg_f_cv_link')} value={<Ext url={intern.test_cv} />} />
            <Row label={t('stg_f_note_rh')} value={intern.test_note_rh} />
            <Row label={t('stg_f_note_test')} value={intern.test_note_test} />
          </div>
        )}
      </div>
      <div style={card}>
        <div style={kicker}>{t('stg_details')}</div>
        <Row label={t('stg_f_status')} value={intern.internship_status ? t(STAGE_KEY[intern.internship_status] ?? 'stg_none') : ''} />
        <Row label={t('stg_f_type')} value={intern.internship_type ? t(TYPE_KEY[intern.internship_type] ?? 'stg_none') : ''} />
        <Row label={t('stg_f_mission')} value={intern.position} />
        <Row label={t('stg_f_dept')} value={intern.department} />
        <Row label={t('stg_f_tutor')} value={intern.manager} />
        <Row label={t('stg_f_school')} value={intern.school} />
        <Row label={t('stg_f_study')} value={intern.education_summary} />
        <Row label={t('stg_f_school_contact')} value={intern.school_contact} />
        <Row label={t('stg_f_start')} value={fmtDate(intern.internship_start)} />
        <Row label={t('stg_f_end')} value={fmtDate(intern.internship_end)} />
        <Row label={t('stg_f_period')} value={intern.internship_period} />
        <Row label={t('stg_f_pay')} value={pay > 0 ? `${pay.toLocaleString('fr-FR')} DH` : ''} />
        <Row label={t('stg_f_obs')} value={intern.notes} />
      </div>
    </div>
  );
}

// ── Onboarding ──────────────────────────────────────────────────────────────────

function OnboardingTab({ intern }: { intern: Intern }) {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [evalOpen, setEvalOpen] = useState(false);
  const [newObj, setNewObj] = useState('');
  const [mentor, setMentor] = useState<{ name: string; email: string } | null>(null);
  const obQ = useQuery({ queryKey: ['intern-onboarding', intern.id], queryFn: () => getInternOnboarding(intern.id), retry: false });
  const evQ = useQuery({ queryKey: ['intern-evals', intern.id], queryFn: () => listInternEvaluations(intern.id), retry: false });
  const upd = useMutation({
    mutationFn: (body: Partial<InternOnboarding>) => updateInternOnboarding(intern.id, body),
    onMutate: body => { qc.setQueryData<InternOnboarding>(['intern-onboarding', intern.id], old => (old ? { ...old, ...body } : old)); },
    onSuccess: data => { qc.setQueryData(['intern-onboarding', intern.id], data); qc.invalidateQueries({ queryKey: ['interns-onboarding'] }); },
    onError: e => { qc.invalidateQueries({ queryKey: ['intern-onboarding', intern.id] }); notify.error(getApiError(e, t('error'))); },
  });
  const delEval = useMutation({
    mutationFn: (id: string) => deleteInternEvaluation(intern.id, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['intern-evals', intern.id] }); notify.success(t('stg_eval_deleted')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  if (obQ.isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>;
  if (obQ.isError || !obQ.data) {
    const mig = axios.isAxiosError(obQ.error) && obQ.error.response?.status === 503;
    return (
      <div style={{ ...card, textAlign: 'center', padding: 28 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0a1c24' }}>{t(mig ? 'stg_ob_migration' : 'stg_ob_error')}</div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#52646d' }}>{t(mig ? 'stg_ob_migration_s' : 'stg_ob_error_s')}</p>
      </div>
    );
  }
  const ob = obQ.data;
  const checklist: ChecklistItem[] = ob.checklist ?? [];
  const objectives = ob.objectives ?? [];
  const done = checklist.filter(i => i.done).length;
  const pct = checklist.length ? Math.round((done / checklist.length) * 100) : 0;
  const phaseIdx = PHASES.findIndex(p => p[0] === ob.phase);
  const stageDays = intern.internship_start && intern.internship_end ? Math.round((new Date(intern.internship_end).getTime() - new Date(intern.internship_start).getTime()) / 86400000) : null;
  const m = mentor ?? { name: ob.mentor_name ?? '', email: ob.mentor_email ?? '' };
  const saveMentor = () => { if (mentor && (mentor.name !== (ob.mentor_name ?? '') || mentor.email !== (ob.mentor_email ?? ''))) upd.mutate({ mentor_name: mentor.name, mentor_email: mentor.email }); setMentor(null); };
  const evals = evQ.data ?? [];
  const loc = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...card, background: 'linear-gradient(135deg,#f2f9fa,#f6f4fd)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0a1c24' }}>{t('stg_ob_progress')}</div>
            <div style={{ fontSize: 12.5, color: '#52646d', marginTop: 2 }}>{tf(t('stg_ob_tasks'), { done, n: checklist.length })}{stageDays !== null ? ` · ${tf(t('stg_ob_days'), { n: stageDays })}` : ''}</div>
          </div>
          <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', color: pct === 100 ? '#16a06b' : '#0e6f84' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 8, background: '#e2eaed', marginTop: 10, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, borderRadius: 8, background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', transition: 'width .4s' }} /></div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 13, background: '#ffffff', border: '1px solid #e2e8eb', flexWrap: 'wrap' }}>
        {PHASES.map(([id, key, accent, tint], i) => {
          const on = ob.phase === id, passed = i < phaseIdx;
          return (
            <button key={id} type="button" onClick={() => { if (!on) { upd.mutate({ phase: id as PhaseId }); notify.success(tf(t('stg_phase_set'), { phase: t(key) })); } }}
              style={{ flex: '1 1 120px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, border: 'none', borderRadius: 10, background: on ? accent : passed ? tint : 'transparent', color: on ? '#fff' : passed ? accent : '#52646d', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              {passed && <CheckCircle2 size={13} />}{t(key)}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={card}>
            <div style={kicker}><UserCheck size={13} />{t('stg_mentor')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={m.name} onChange={e => setMentor({ ...m, name: e.target.value })} onBlur={saveMentor} placeholder={t('stg_mentor_name')} style={inp} />
              <input type="email" value={m.email} onChange={e => setMentor({ ...m, email: e.target.value })} onBlur={saveMentor} placeholder={t('stg_mentor_email')} style={inp} />
            </div>
          </div>
          <div style={card}>
            <div style={kicker}><Target size={13} />{t('stg_objectives')}</div>
            {objectives.map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                <input type="checkbox" checked={o.done} onChange={e => upd.mutate({ objectives: objectives.map(x => (x.id === o.id ? { ...x, done: e.target.checked } : x)) })} style={{ width: 16, height: 16, accentColor: '#6d5ad6' }} />
                <span style={{ flex: 1, fontSize: 13, color: o.done ? '#7d8f97' : '#22343c', textDecoration: o.done ? 'line-through' : 'none' }}>{o.label}</span>
                <button type="button" aria-label={t('itv_remove')} onClick={() => upd.mutate({ objectives: objectives.filter(x => x.id !== o.id) })} style={{ border: 'none', background: 'none', color: '#9fb4bb', cursor: 'pointer', padding: 2 }}><X size={13} /></button>
              </div>
            ))}
            <form style={{ display: 'flex', gap: 6, marginTop: 6 }} onSubmit={e => { e.preventDefault(); if (newObj.trim()) { upd.mutate({ objectives: [...objectives, { id: `o${Date.now()}`, label: newObj.trim(), done: false }] }); setNewObj(''); } }}>
              <input value={newObj} onChange={e => setNewObj(e.target.value)} placeholder={t('stg_obj_ph')} style={inp} />
              <button type="submit" style={{ ...ghost, height: 38, padding: '0 11px' }} aria-label={t('stg_obj_add')}><Plus size={14} /></button>
            </form>
          </div>
        </div>
        <div style={card}>
          <div style={kicker}><ClipboardList size={13} />{t('stg_checklist')}</div>
          {PHASES.slice(0, 3).map(([id, key, accent, tint]) => {
            const items = checklist.filter(i => i.phase === id);
            if (!items.length) return null;
            const d = items.filter(i => i.done).length;
            return (
              <div key={id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
                  <b style={{ fontSize: 13, color: '#0a1c24' }}>{t(key)}</b>
                  <span style={{ marginInlineStart: 'auto', fontFamily: "'Geist Mono',monospace", fontSize: 11.5, color: '#5f7079' }}>{d}/{items.length}</span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: '#eef2f4', marginBottom: 8 }}><div style={{ height: 4, width: `${(d / items.length) * 100}%`, borderRadius: 4, background: accent, transition: 'width .3s' }} /></div>
                {items.map(item => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 5, borderRadius: 10, cursor: 'pointer', background: item.done ? tint : '#ffffff', border: `1px solid ${item.done ? 'transparent' : '#eef2f4'}` }}>
                    <input type="checkbox" checked={item.done} onChange={e => upd.mutate({ checklist: checklist.map(x => (x.id === item.id ? { ...x, done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null } : x)) })} style={{ width: 16, height: 16, accentColor: accent }} />
                    <span style={{ flex: 1, fontSize: 13, color: item.done ? '#52646d' : '#22343c', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                    {item.done && item.done_at && <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10.5, color: '#7d8f97' }}>{new Date(item.done_at).toLocaleDateString(loc)}</span>}
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div style={{ ...kicker, marginBottom: 0 }}><Award size={13} />{t('stg_evals')}</div>
          {!evalOpen && <button type="button" style={ghost} onClick={() => setEvalOpen(true)}><Plus size={13} />{t('stg_eval_new')}</button>}
        </div>
        {evalOpen && <EvaluationForm internId={intern.id} onDone={() => setEvalOpen(false)} />}
        {!evals.length && !evalOpen ? <p style={{ margin: 0, padding: '12px 0', textAlign: 'center', fontSize: 13, color: '#7d8f97' }}>{t('stg_evals_none')}</p> : evals.map(ev => {
          const avg = (SCORES.reduce((s, [k]) => s + Number(ev[k] ?? 0), 0) / 5).toFixed(1);
          const [lbl, bg, ink] = ev.evaluation_type === 'final' ? [t('stg_eval_final'), '#e1f5ec', '#0f6f49'] : ev.evaluation_type === 'self' ? [t('stg_eval_self'), '#ece9fb', '#5444b8'] : [tf(t('stg_eval_week_n'), { n: ev.week_number ?? '—' }), '#e4f2f4', '#0b5f72'];
          return (
            <div key={ev.id} style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #eef2f4', background: '#f9fbfb', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 7, background: bg, color: ink }}>{lbl}</span>
                {ev.evaluator_name && <span style={{ fontSize: 12.5, color: '#52646d' }}>{tf(t('stg_eval_by'), { name: ev.evaluator_name })}</span>}
                <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, color: '#7d8f97' }}>{fmtDate(ev.created_at)}</span>
                <span style={{ marginInlineStart: 'auto', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 800, fontSize: 17, color: '#b06b0c' }}>★ {avg}<small style={{ fontSize: 11, color: '#7d8f97' }}>/5</small></span>
                <button type="button" aria-label={t('stg_delete')} onClick={() => { if (window.confirm(t('stg_eval_confirm_del'))) delEval.mutate(ev.id); }} style={{ border: 'none', background: 'none', color: '#c3ced3', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                {SCORES.map(([k, label, , Icon]) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#52646d' }}><Icon size={12} color="#df9326" />{label} <b style={{ color: '#0a1c24' }}>{ev[k]}</b></span>)}
              </div>
              {ev.comment && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#33474f', fontStyle: 'italic' }}>« {ev.comment} »</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvaluationForm({ internId, onDone }: { internId: string; onDone: () => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [f, setF] = useState<Partial<InternEvaluation>>({ evaluation_type: 'weekly', week_number: 1, evaluator_name: '', amana_score: 0, itkan_score: 0, iltizam_score: 0, ibdaa_score: 0, nama_score: 0, comment: '' });
  const mut = useMutation({
    mutationFn: () => createInternEvaluation(internId, f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['intern-evals', internId] }); notify.success(t('stg_eval_saved')); onDone(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const rated = SCORES.every(([k]) => Number(f[k] ?? 0) > 0);
  return (
    <div style={{ padding: 14, borderRadius: 14, background: '#f8fafb', border: '1px solid #eef2f4', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33474f', display: 'flex', flexDirection: 'column', gap: 5 }}>{t('stg_eval_type')}
          <select value={f.evaluation_type} onChange={e => setF(x => ({ ...x, evaluation_type: e.target.value as InternEvaluation['evaluation_type'] }))} style={inp}>
            <option value="weekly">{t('stg_eval_weekly')}</option><option value="final">{t('stg_eval_final')}</option><option value="self">{t('stg_eval_self')}</option>
          </select>
        </label>
        {f.evaluation_type === 'weekly' && <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33474f', display: 'flex', flexDirection: 'column', gap: 5 }}>{t('stg_eval_week')}<input type="number" min={1} value={f.week_number ?? 1} onChange={e => setF(x => ({ ...x, week_number: Number(e.target.value) }))} style={inp} /></label>}
        <label style={{ fontSize: 12.5, fontWeight: 600, color: '#33474f', display: 'flex', flexDirection: 'column', gap: 5 }}>{t('stg_eval_evaluator')}<input value={f.evaluator_name ?? ''} onChange={e => setF(x => ({ ...x, evaluator_name: e.target.value }))} style={inp} /></label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
        {SCORES.map(([k, label, desc, Icon]) => (
          <div key={k} style={{ padding: '10px 12px', borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><Icon size={14} color="#df9326" /><b>{label}</b><span style={{ fontSize: 11.5, color: '#7d8f97' }}>· {t(desc)}</span></div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={`${label} ${n}/5`} onClick={() => setF(x => ({ ...x, [k]: n }))} style={{ width: 30, height: 28, borderRadius: 8, border: `1px solid ${Number(f[k]) >= n ? '#df9326' : '#d6dfe3'}`, background: Number(f[k]) >= n ? '#fbefda' : '#ffffff', color: Number(f[k]) >= n ? '#8a5207' : '#9fb4bb', cursor: 'pointer', fontSize: 14 }}>★</button>)}
            </div>
          </div>
        ))}
      </div>
      <textarea rows={2} value={f.comment ?? ''} onChange={e => setF(x => ({ ...x, comment: e.target.value }))} placeholder={t('stg_eval_comment_ph')} style={{ ...inp, height: 'auto', padding: '9px 11px', resize: 'vertical' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!rated && <span style={{ fontSize: 12, color: '#8a5207', marginInlineEnd: 'auto' }}>{t('stg_eval_rate_all')}</span>}
        <button type="button" className="btn btn-secondary" onClick={onDone}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!rated || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={13} color="#fff" /> : <CheckCircle2 size={14} />}{t('stg_save')}</button>
      </div>
    </div>
  );
}

// ── Documents ─────────────────────────────────────────────────────────────────

const SCANS: [type: string, key: TKey][] = [['cin', 'stg_doc_cin'], ['convention', 'stg_doc_convention'], ['nda', 'stg_doc_nda'], ['completion', 'stg_doc_completion']];

function DocsTab({ intern }: { intern: Intern }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const docsQ = useQuery({ queryKey: ['intern-docs', intern.id], queryFn: () => listDocuments({ employee_id: intern.id }) });
  const docs = docsQ.data?.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ['intern-docs', intern.id] });
  const [busy, setBusy] = useState('');
  const upload = (type: string, label: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(type);
      try { await uploadDocument(intern.id, type, label, file, true); notify.success(tf(t('stg_doc_added'), { name: label })); refresh(); }
      catch (e) { notify.error(getApiError(e, t('error'))); } finally { setBusy(''); }
    };
    input.click();
  };
  const sign = async (id: string) => {
    try {
      const res = await sendForSignature(id);
      const link = `${window.location.origin}/sign/${res.token}`;
      try { await navigator.clipboard.writeText(link); } catch { /* clipboard refused */ }
      notify.success(t('stg_sign_sent'));
      refresh();
    } catch (e) { notify.error(getApiError(e, t('error'))); }
  };
  const remove = async (id: string) => {
    if (!window.confirm(t('stg_doc_confirm_del'))) return;
    try { await deleteDocument(id); refresh(); } catch (e) { notify.error(getApiError(e, t('error'))); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={card}>
        <div style={kicker}><FileText size={13} />{t('stg_docs_saved')}</div>
        {docsQ.isLoading ? <Spinner /> : !docs.length ? <p style={{ margin: 0, fontSize: 13, color: '#7d8f97' }}>{t('stg_docs_none')}</p> : docs.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid #f0f3f5', flexWrap: 'wrap' }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84', flexShrink: 0 }}><FileText size={15} /></span>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0a1c24' }}>{d.name || d.document_type}</div>
              <div style={{ fontSize: 11.5, color: '#7d8f97' }}><span style={{ textTransform: 'uppercase' }}>{d.document_type}</span> · {fmtDate(d.created_at)}</div>
            </div>
            {SCANS.some(([ty]) => ty === d.document_type) ? null : d.signature_status === 'signed'
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#e1f5ec', color: '#0f6f49' }}><CheckCircle2 size={12} />{t('stg_signed')}</span>
              : <button type="button" style={ghost} onClick={() => sign(d.id)}>{t(d.signature_status === 'pending' ? 'stg_resend' : 'stg_sign')}</button>}
            <button type="button" aria-label={t('stg_delete')} onClick={() => remove(d.id)} style={{ width: 32, height: 32, border: 'none', borderRadius: 9, background: 'transparent', color: '#9fb4bb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={kicker}><FileUp size={13} />{t('stg_scan')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
          {SCANS.map(([type, key]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderRadius: 12, border: '1px solid #e2e8eb' }}>
              <span style={{ fontSize: 13, color: '#22343c' }}>{t(key)}</span>
              <button type="button" style={ghost} disabled={!!busy} onClick={() => upload(type, t(key))}>{busy === type ? <Spinner size={12} /> : <FileUp size={13} />}{t('stg_upload')}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
