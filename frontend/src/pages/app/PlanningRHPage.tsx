import { useMemo, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, addWeeks, format, getISOWeek, isSameDay, startOfWeek } from 'date-fns';
import { CalendarClock, Check, ChevronLeft, ChevronRight, Clock, Flag, MapPin, Plus, Trash2, Users, Video } from 'lucide-react';
import {
  listInterviews, listCandidates, listSlots, scheduleInterview, updateInterviewStatus,
  listPlanningNotes, createPlanningNote, deletePlanningNote, getApiError,
} from '@/services/api';
import type { Employee, Interview } from '@/services/api';
import { RV } from '@/components/motion';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { holidayOn } from '@/lib/holidays';
import CreneauxRHPage from './CreneauxRHPage';
import './PlanningRHPage.css';

const H = 52;            // px per hour
const FIRST_HOUR = 8;    // grid starts at 08:00
const HOURS = 10;        // 08:00 → 17:00 rows

// [label key, tint, text, accent] per interview type — the reference's palette
const KIND: Record<string, [TKey, string, string, string]> = {
  rh: ['pl_kind_rh', '#ece9fb', '#3d2f99', '#6d5ad6'],
  technical: ['pl_kind_technical', '#e4f2f4', '#0b5f72', '#16b6c8'],
  final: ['pl_kind_final', '#fbefda', '#7a4706', '#df9326'],
  realized: ['pl_kind_done', '#e1f5ec', '#0f5a3c', '#16a06b'],
};
const kindOf = (iv: Interview) => (iv.status === 'realized' || iv.status === 'completed' ? 'realized' : (KIND[(iv.type || '').toLowerCase()] ? (iv.type || '').toLowerCase() : 'rh'));
const toHours = (t?: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return (h || 0) + (m || 0) / 60; };
const hhmm = (t?: string) => (t || '').slice(0, 5);
const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const inputStyle: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };

export default function PlanningRHPage() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [evtOpen, setEvtOpen] = useState(false);

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[4];
  const today = new Date();
  const noteDay = days.find(d => isSameDay(d, today)) ?? days[0];

  const { data: interviews = [], isLoading } = useQuery({ queryKey: ['interviews'], queryFn: listInterviews });
  const { data: candidates = [] } = useQuery<Employee[]>({ queryKey: ['candidates'], queryFn: listCandidates });
  const { data: slots = [] } = useQuery({ queryKey: ['hr-slots'], queryFn: () => listSlots() });
  const { data: notes = [] } = useQuery({
    queryKey: ['planning-notes', iso(noteDay), iso(noteDay)],
    queryFn: () => listPlanningNotes(iso(noteDay), iso(noteDay)),
  });

  const candName = useMemo(() => new Map(candidates.map(c => [c.id, c.full_name])), [candidates]);
  const nameOf = (iv: Interview) => iv.candidate_name || iv.candidate?.full_name || candName.get(iv.candidate_id) || t('pl_candidate');

  const weekEvents = interviews
    .filter(iv => iv.status !== 'cancelled' && iv.date >= iso(weekStart) && iv.date <= iso(weekEnd))
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  const sel = weekEvents.find(e => e.id === selId) ?? weekEvents[0];

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateInterviewStatus(id, status),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['interviews'] }); notify.success(t(v.status === 'realized' ? 'pl_marked_done' : 'pl_marked_planned')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const addNote = useMutation({
    mutationFn: (content: string) => createPlanningNote({ note_date: iso(noteDay), content }),
    onSuccess: () => { setDraft(''); qc.invalidateQueries({ queryKey: ['planning-notes'] }); notify.success(t('pl_note_added')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const delNote = useMutation({
    mutationFn: (id: string) => deletePlanningNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planning-notes'] }),
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  const weekLabel = (() => {
    const a = days[0], b = weekEnd;
    const sameMonth = a.getMonth() === b.getMonth();
    const left = a.toLocaleDateString(loc, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'long' });
    return `${left} – ${b.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  })();
  const weekSlots = slots
    .filter(s => s.status === 'free' && s.date >= iso(weekStart) && s.date <= iso(addDays(weekStart, 6)))
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  const slotLabel = (date: string, time: string) => {
    const d = new Date(`${date}T00:00:00`);
    const dow = d.toLocaleDateString(loc, { weekday: 'short' }).replace('.', '');
    return `${dow.charAt(0).toUpperCase()}${dow.slice(1)} ${hhmm(time)}`;
  };

  const submitNote = () => { const v = draft.trim(); if (v && !addNote.isPending) addNote.mutate(v); };
  const selKind = sel ? KIND[kindOf(sel)] : null;
  const isDone = sel ? kindOf(sel) === 'realized' : false;
  const when = sel ? `${cap(new Date(`${sel.date}T00:00:00`).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'short' }))} · ${hhmm(sel.start_time)} – ${hhmm(sel.end_time)}` : '';

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('planning_rh')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('pl_subtitle')}</RV>
        </div>
        <RV as="div" variant="up" delay={100} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setSlotsOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} className="pl-h1">
            <CalendarClock size={15} /> {t('pl_manage_slots')}
          </button>
          <button type="button" onClick={() => setEvtOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
            <Plus size={16} strokeWidth={2.2} /> {t('pl_new_interview')}
          </button>
        </RV>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <RV as="div" variant="up" delay={120} style={{ flex: '3 1 620px', minWidth: 0, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #eef2f4' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 17 }}>{weekLabel}</span>
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <button type="button" aria-label={t('pl_prev_week')} onClick={() => setWeekStart(w => addWeeks(w, -1))} className="pl-nav"><ChevronLeft size={15} className="wy-flip" /></button>
              <button type="button" aria-label={t('pl_next_week')} onClick={() => setWeekStart(w => addWeeks(w, 1))} className="pl-nav"><ChevronRight size={15} className="wy-flip" /></button>
            </span>
            {!days.some(d => isSameDay(d, today)) && (
              <button type="button" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} style={{ height: 28, padding: '0 10px', borderRadius: 8, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#33474f', cursor: 'pointer' }}>{t('pl_this_week')}</button>
            )}
            <span style={{ marginInlineStart: 'auto', fontFamily: "'Geist Mono',monospace", fontSize: 12, color: '#5f7079' }}>{tf(t('pl_week_n'), { n: getISOWeek(weekStart) })}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 680 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(5,minmax(0,1fr))', borderBottom: '1px solid #eef2f4' }}>
                <span />
                {days.map(d => (
                  <div key={iso(d)} style={{ padding: '10px 12px', borderInlineStart: '1px solid #eef2f4', background: isSameDay(d, today) ? '#f3fafb' : 'transparent' }}>
                    <div style={{ fontSize: 12, color: '#5f7079' }}>{cap(d.toLocaleDateString(loc, { weekday: 'long' }))}</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 20, fontWeight: 700 }}>{d.getDate()}</div>
                  </div>
                ))}
              </div>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '56px repeat(5,minmax(0,1fr))', height: H * HOURS }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {Array.from({ length: HOURS }, (_, i) => (
                    <span key={i} style={{ height: H, padding: '4px 8px 0 0', textAlign: 'end', fontFamily: "'Geist Mono',monospace", fontSize: 11, color: '#7d8f97' }}>{`${String(FIRST_HOUR + i).padStart(2, '0')}:00`}</span>
                  ))}
                </div>
                {days.map(d => {
                  const hol = holidayOn(iso(d));
                  const evts = weekEvents.filter(e => e.date === iso(d));
                  return (
                    <div key={iso(d)} style={{ position: 'relative', borderInlineStart: '1px solid #eef2f4', background: hol ? '#fcfaf6' : '#ffffff', backgroundImage: 'repeating-linear-gradient(to bottom,transparent 0 51px,#f1f4f5 51px 52px)' }}>
                      {hol && (
                        <div style={{ position: 'absolute', inset: 8, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'repeating-linear-gradient(45deg,#f5e3c3 0 6px,#fbf3e4 6px 12px)', color: '#8a5207', textAlign: 'center', fontSize: 12.5, fontWeight: 600, padding: 10 }}>
                          <Flag size={18} />{tf(t('pl_holiday'), { name: t(hol.key) })}
                        </div>
                      )}
                      {evts.map((e, i) => {
                        const k = KIND[kindOf(e)];
                        const start = Math.max(FIRST_HOUR, Math.min(FIRST_HOUR + HOURS - 0.5, toHours(e.start_time)));
                        const end = Math.max(start + 0.5, Math.min(FIRST_HOUR + HOURS, toHours(e.end_time) || start + 1));
                        const on = sel?.id === e.id;
                        return (
                          <RV key={e.id} as="button" variant="scale" delay={i * 60} type="button" onClick={() => setSelId(e.id)}
                            style={{ position: 'absolute', left: 5, right: 5, top: (start - FIRST_HOUR) * H + 2, height: (end - start) * H - 4, padding: '7px 9px', border: 'none', borderRadius: 10, background: k[1], color: k[2], fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', overflow: 'hidden', boxShadow: `inset 3px 0 0 ${k[3]}${on ? `, 0 0 0 2px ${k[3]}` : ''}` }}>
                            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>{tf(t('pl_interview_with'), { name: nameOf(e) })}</span>
                            <span style={{ display: 'block', fontFamily: "'Geist Mono',monospace", fontSize: 10.5, opacity: 0.8, marginTop: 2 }}>{`${hhmm(e.start_time)} – ${hhmm(e.end_time)}`}</span>
                          </RV>
                        );
                      })}
                    </div>
                  );
                })}
                {isLoading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.6)' }}><Spinner /></div>}
                {!isLoading && weekEvents.length === 0 && (
                  <div style={{ position: 'absolute', left: 56, right: 0, top: '42%', textAlign: 'center', pointerEvents: 'none' }}>
                    <span style={{ display: 'inline-block', padding: '8px 14px', borderRadius: 99, background: 'rgba(255,255,255,.92)', border: '1px solid #e2e8eb', fontSize: 13, color: '#52646d' }}>{t('pl_empty_week')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </RV>

        <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sel && selKind && (
            <RV key={sel.id} as="div" variant="left" style={{ padding: 20, borderRadius: 20, background: '#06141a', color: '#e8eff1' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'rgba(255,255,255,.08)', color: '#b9cbd0' }}>{t(selKind[0])}</div>
              <div style={{ marginTop: 10, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '-.02em' }}>{tf(t('pl_interview_with'), { name: nameOf(sel) })}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, fontSize: 13.5, color: '#b9cbd0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={15} />{when}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={15} />{sel.meet_link ? t('pl_video_call') : t('pl_on_site')}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={15} />{[nameOf(sel), sel.recruiter_name].filter(Boolean).join(', ')}{sel.job_title ? ` · ${sel.job_title}` : ''}</span>
              </div>
              {sel.meet_link ? (
                <a href={sel.meet_link} target="_blank" rel="noreferrer" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 11, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: 13.5, fontWeight: 600 }} className="pl-h2">
                  <Video size={15} /> {t('pl_join')}
                </a>
              ) : null}
              <button type="button" disabled={statusMut.isPending} onClick={() => statusMut.mutate({ id: sel.id, status: isDone ? 'confirmed' : 'realized' })}
                style={{ marginTop: sel.meet_link ? 8 : 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 11, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.06)', color: '#e8eff1', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                <Check size={15} /> {t(isDone ? 'pl_mark_planned' : 'pl_mark_done')}
              </button>
            </RV>
          )}
          <RV as="div" variant="up" delay={160} style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pl_free_slots')}</div>
            <div style={{ fontSize: 13, color: '#52646d', marginTop: 4 }}>{t('pl_free_slots_sub')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
              {weekSlots.length ? weekSlots.map(s => (
                <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 11px', borderRadius: 10, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: "'Geist Mono',monospace", fontSize: 12, fontWeight: 500 }}>{slotLabel(s.date, s.start_time)}</span>
              )) : <span style={{ fontSize: 13, color: '#7d8f97' }}>{t('pl_no_slots')}</span>}
            </div>
            <button type="button" onClick={() => setSlotsOpen(true)} style={{ marginTop: 12, padding: 0, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#0e6f84', cursor: 'pointer' }}>{t('pl_manage_slots')} →</button>
          </RV>
          <RV as="div" variant="up" delay={220} style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pl_note_today')}</div>
              <span style={{ marginInlineStart: 'auto', fontSize: 12, color: '#7d8f97' }}>{cap(noteDay.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' }))}</span>
            </div>
            {notes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {notes.map(n => (
                  <div key={n.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: '#f8fafb', fontSize: 13, color: '#1d3540', lineHeight: 1.45 }}>
                    <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{n.content}{n.created_by_name ? <span style={{ display: 'block', fontSize: 11.5, color: '#7d8f97', marginTop: 2 }}>{n.created_by_name}</span> : null}</span>
                    <button type="button" aria-label={t('delete')} onClick={() => { if (window.confirm(t('pl_note_confirm_delete'))) delNote.mutate(n.id); }} style={{ border: 'none', background: 'none', color: '#a3b1b7', cursor: 'pointer', padding: 2 }} className="pl-h3"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            <textarea rows={3} value={draft} onChange={e => setDraft(e.target.value)} placeholder={t('pl_note_ph')}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitNote(); } }}
              style={{ marginTop: 10, width: '100%', resize: 'vertical', padding: '10px 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 13.5, outline: 'none' }} className="pl-f1" />
            {draft.trim() && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={submitNote} disabled={addNote.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', border: 'none', borderRadius: 10, background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                  {addNote.isPending ? <Spinner size={13} color="#fff" /> : <Check size={13} />} {t('pl_note_add')}
                </button>
              </div>
            )}
          </RV>
        </div>
      </div>

      <Drawer open={slotsOpen} onClose={() => setSlotsOpen(false)} title={t('pl_manage_slots')} subtitle={t('pl_free_slots_sub')} icon={<CalendarClock size={17} />} width={980}>
        <div onClickCapture={() => setTimeout(() => qc.invalidateQueries({ queryKey: ['hr-slots'] }), 600)}>
          <CreneauxRHPage />
        </div>
      </Drawer>
      <NewInterviewModal open={evtOpen} onClose={() => setEvtOpen(false)} candidates={candidates} defaultDate={iso(noteDay)} />
    </div>
  );
}

function NewInterviewModal({ open, onClose, candidates, defaultDate }: { open: boolean; onClose: () => void; candidates: Employee[]; defaultDate: string }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const empty = { candidate_id: '', date: defaultDate, start_time: '10:00', end_time: '11:00', type: 'rh', recruiter_name: '', meet_link: '', notes: '' };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty, v: string) => setF(x => ({ ...x, [k]: v }));
  const mut = useMutation({
    mutationFn: () => {
      const c = candidates.find(x => x.id === f.candidate_id);
      return scheduleInterview({ ...f, type: f.type as Interview['type'], candidate_name: c?.full_name, job_title: c?.position || undefined, meet_link: f.meet_link || undefined, notes: f.notes || undefined });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interviews'] }); notify.success(t('pl_interview_planned')); setF(empty); onClose(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const submit = () => {
    if (!f.candidate_id) { notify.error(t('pl_pick_candidate')); return; }
    if (f.end_time <= f.start_time) { notify.error(t('pl_end_after_start')); return; }
    mut.mutate();
  };
  return (
    <Drawer open={open} onClose={onClose} title={t('pl_new_interview')} subtitle={t('pl_new_interview_sub')} icon={<CalendarClock size={17} />} width={480}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={mut.isPending}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('pl_schedule')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t('pl_candidate')} *</label>
          <select value={f.candidate_id} onChange={e => set('candidate_id', e.target.value)} style={inputStyle}>
            <option value="">{t('pl_pick_candidate')}</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.position ? ` · ${c.position}` : ''}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle}>{t('pl_date')}</label><input type="date" value={f.date} onChange={e => set('date', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('pl_start')}</label><input type="time" value={f.start_time} onChange={e => set('start_time', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('pl_end')}</label><input type="time" value={f.end_time} onChange={e => set('end_time', e.target.value)} style={inputStyle} /></div>
        </div>
        <div>
          <label style={labelStyle}>{t('pl_type')}</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['rh', 'technical', 'final'] as const).map(k => (
              <button key={k} type="button" onClick={() => set('type', k)} style={{ flex: 1, height: 38, borderRadius: 10, border: `1px solid ${f.type === k ? KIND[k][3] : '#d6dfe3'}`, background: f.type === k ? KIND[k][1] : '#ffffff', color: f.type === k ? KIND[k][2] : '#33474f', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t(KIND[k][0])}</button>
            ))}
          </div>
        </div>
        <div><label style={labelStyle}>{t('pl_interviewer')}</label><input value={f.recruiter_name} onChange={e => set('recruiter_name', e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>{t('pl_meet_link')}</label><input value={f.meet_link} onChange={e => set('meet_link', e.target.value)} placeholder="https://meet.google.com/…" style={inputStyle} /></div>
        <div><label style={labelStyle}>{t('pl_notes')}</label><textarea rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }} /></div>
      </div>
    </Drawer>
  );
}
