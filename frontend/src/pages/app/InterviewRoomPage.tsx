// Interview room — /app/entretiens/:id. Everything the interviewer needs during the interview, side by side:
// the candidate's CV (and profile / job post), the interview sheet generated from the job post and the CV
// (questions, notes, scores per criterion), and the meeting, the live score, the synthesis and the decision.
// The sheet is saved automatically while typing.
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ArrowLeft, Briefcase, CalendarClock, Check, CheckCircle2, ChevronDown, CircleDot, ClipboardCheck, Clock, Download, ExternalLink,
  FileText, Flag, GraduationCap, Languages, Link2, Mail, MapPin, Phone, Play, Plus, Printer, RefreshCw, Sparkles, Square, SquareCheck,
  ThumbsDown, ThumbsUp, Upload, User, Users, Video, X,
} from 'lucide-react';
import {
  draftSynthesis, finishInterview, generateFiche, getApiError, getInterviewCv, getInterviewCvText, getInterviewRoom, linkInterviewMeeting,
  listCandidates, saveFiche, startInterview, uploadEmployeeFile,
  type Employee, type Interview, type InterviewDecision, type InterviewFull, type InterviewRoom, type Recommendation, type Scorecard,
} from '@/services/api';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { INTERVIEW_KIND } from '@/lib/recruitment';
import { DECISIONS, RECO, RECO_ORDER, durationMin, elapsed, interviewStart, overallScore, scoreTone } from '@/lib/interview';
import { ScheduleInterviewDrawer } from '@/components/recruitment/ScheduleInterviewDrawer';
import './InterviewRoomPage.css';

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const RING = 2 * Math.PI * 46;
const NEXT_TYPE: Record<string, Interview['type']> = { rh: 'technical', technical: 'final', final: 'final' };
const uid = () => Math.random().toString(36).slice(2, 10);
const RATING: TKey[] = ['itv_r1', 'itv_r2', 'itv_r3', 'itv_r4', 'itv_r5'];
const STAGE_KEY: Record<string, TKey> = { new: 'rec_stage_new', screen: 'rec_stage_screen', interview: 'rec_stage_interview', offer: 'rec_stage_offer', hired: 'rec_stage_hired', rejected: 'cand_rejected' };

type CvView = { url: string; type: string } | null;

/** Textarea that grows with its content. */
function Grow({ value, onChange, placeholder, className, minRows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px`; } }, [value]);
  return <textarea ref={ref} rows={minRows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={className} />;
}

/** Editable list of short items (strengths / concerns). */
function ChipList({ items, onChange, placeholder, tone }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; tone: 'ok' | 'warn' }) {
  const [v, setV] = useState('');
  const add = () => { const x = v.trim(); if (x && !items.includes(x)) onChange([...items, x]); setV(''); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
  return (
    <div className="room-chips">
      {items.map(x => (
        <span key={x} className={`room-chipx ${tone}`}>{x}<button type="button" aria-label="×" onClick={() => onChange(items.filter(y => y !== x))}><X size={11} /></button></span>
      ))}
      <input value={v} onChange={e => setV(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={placeholder} />
    </div>
  );
}

export default function InterviewRoomPage() {
  const { id = '' } = useParams();
  const { t, lang } = useLang();
  const notify = useNotify();
  const nav = useNavigate();
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';

  const roomQ = useQuery({ queryKey: ['interview-room', id], queryFn: () => getInterviewRoom(id), enabled: !!id });
  const room = roomQ.data;
  const iv = room?.interview;
  const cand = room?.candidate;

  // ── local, autosaved copy of the sheet ─────────────────────────────────────
  const [sc, setSc] = useState<Scorecard | null>(null);
  const [summary, setSummary] = useState('');
  const [reco, setReco] = useState<Recommendation | null>(null);
  const [loadedFor, setLoadedFor] = useState('');
  const [ver, setVer] = useState(0);
  const [savedVer, setSavedVer] = useState(0);
  const [saveErr, setSaveErr] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  if (iv && loadedFor !== iv.id) {
    setLoadedFor(iv.id);
    setSc(iv.scorecard?.sections?.length ? iv.scorecard : null);
    setSummary(iv.summary ?? ''); setReco(iv.recommendation ?? null); setVer(0); setSavedVer(0);
  }
  const edit = (next: Scorecard) => { setSc(next); setVer(v => v + 1); };
  const editMeta = (fn: () => void) => { fn(); setVer(v => v + 1); };

  const saveMut = useMutation({
    mutationFn: (p: { v: number; body: Parameters<typeof saveFiche>[1] }) => saveFiche(id, p.body),
    onSuccess: (_, p) => { setSavedVer(s => Math.max(s, p.v)); setSaveErr(''); setSavedAt(new Date()); },
    onError: e => setSaveErr(axios.isAxiosError(e) && e.response?.status === 503 ? t('itv_migration') : getApiError(e, t('error'))),
  });
  const body = () => ({ ...(sc ? { scorecard: sc } : {}), summary, ...(reco ? { recommendation: reco } : {}) });
  const bodyRef = useRef(body);
  useEffect(() => { bodyRef.current = body; });
  useEffect(() => {
    if (!ver || ver === savedVer) return;
    const h = window.setTimeout(() => saveMut.mutate({ v: ver, body: bodyRef.current() }), 900);
    return () => window.clearTimeout(h);
  }, [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const unsaved = ver !== savedVer;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (unsaved) { e.preventDefault(); } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  // ── clock ────────────────────────────────────────────────────────────────
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const h = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(h); }, []);

  // ── CV ───────────────────────────────────────────────────────────────────
  const [cvTab, setCvTab] = useState<'cv' | 'profile' | 'job'>('cv');
  const cvMime = room?.cv?.mime ?? '';
  const cvPreviewable = cvMime === 'application/pdf' || cvMime.startsWith('image/') || /\.(pdf|png|jpe?g|webp)$/i.test(room?.cv?.name ?? '');
  const cvQ = useQuery<CvView>({
    queryKey: ['interview-cv', id, room?.cv?.name],
    queryFn: async () => { const b = await getInterviewCv(id); return { url: URL.createObjectURL(b), type: b.type || cvMime }; },
    enabled: !!room?.cv && cvPreviewable, staleTime: Infinity,
  });
  const cvTextQ = useQuery({ queryKey: ['interview-cv-text', id, room?.cv?.name], queryFn: () => getInterviewCvText(id), enabled: !!room?.cv && !cvPreviewable, staleTime: Infinity });
  const cvUrl = cvQ.data?.url;
  useEffect(() => () => { if (cvUrl) URL.revokeObjectURL(cvUrl); }, [cvUrl]);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMut = useMutation({
    mutationFn: (f: File) => uploadEmployeeFile(cand!.id, f, 'cv'),
    onSuccess: () => { notify.success(t('itv_cv_uploaded')); qc.invalidateQueries({ queryKey: ['interview-room', id] }); qc.invalidateQueries({ queryKey: ['interviews-board'] }); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const onCvFile = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadMut.mutate(f); e.target.value = ''; };
  const downloadCv = async () => {
    try {
      const b = await getInterviewCv(id);
      const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = room?.cv?.name || 'cv'; a.click();
      window.setTimeout(() => URL.revokeObjectURL(u), 2000);
    } catch (e) { notify.error(getApiError(e, t('error'))); }
  };

  // ── actions ──────────────────────────────────────────────────────────────
  const [genLang, setGenLang] = useState<string | null>(null);
  const sheetLang = genLang ?? lang;
  const refreshLists = () => { qc.invalidateQueries({ queryKey: ['interviews-board'] }); qc.invalidateQueries({ queryKey: ['interviews'] }); qc.invalidateQueries({ queryKey: ['meetings'] }); };
  const patchRoom = (patch: Partial<InterviewRoom>) => qc.setQueryData<InterviewRoom>(['interview-room', id], old => (old ? { ...old, ...patch } : old));
  const failMig = (e: unknown) => notify.error(axios.isAxiosError(e) && e.response?.status === 503 ? t('itv_migration') : getApiError(e, t('error')));

  const genMut = useMutation({
    mutationFn: (mode: 'ai' | 'template') => generateFiche(id, sheetLang, mode),
    onSuccess: r => {
      patchRoom({ interview: { ...iv!, ...r.interview } });
      setSc(r.interview.scorecard ?? null); setVer(0); setSavedVer(0);
      if (r.fallback) notify.warning(t('itv_fallback'));
      else notify.success(t(r.interview.scorecard?.source === 'ai' ? 'itv_generated_ai' : 'itv_generated_tpl'));
      refreshLists(); qc.invalidateQueries({ queryKey: ['interview-room', id] });
    },
    onError: failMig,
  });
  const regenerate = (mode: 'ai' | 'template') => {
    const hasNotes = !!sc && (sc.sections.some(s => s.questions.some(q => q.note.trim())) || sc.criteria.some(c => c.score > 0) || !!sc.notes.trim());
    if (hasNotes && !window.confirm(t('itv_regen_confirm'))) return;
    genMut.mutate(mode);
  };
  const startMut = useMutation({
    mutationFn: () => startInterview(id),
    onSuccess: r => { patchRoom({ interview: { ...iv!, ...r } }); refreshLists(); },
    onError: failMig,
  });
  const meetMut = useMutation({
    mutationFn: () => linkInterviewMeeting(id, { starts_at: interviewStart(iv!.date, iv!.start_time).toISOString(), duration_min: durationMin(iv!.start_time, iv!.end_time), visio_url: iv!.meet_link || undefined }),
    onSuccess: r => { patchRoom({ interview: { ...iv!, ...r.interview }, meeting: r.meeting }); refreshLists(); notify.success(t('itv_meeting_created')); },
    onError: e => notify.error(axios.isAxiosError(e) && e.response?.status === 503 ? t(String(e.response?.data?.detail).includes('meetings') ? 'set_table_missing' : 'itv_migration') : getApiError(e, t('error'))),
  });
  const synthMut = useMutation({
    mutationFn: async () => { if (unsaved) await saveFiche(id, body()); return draftSynthesis(id, lang); },
    onSuccess: r => { editMeta(() => { setSummary(r.summary); if (r.recommendation) setReco(r.recommendation); }); notify.success(t('itv_synth_done')); },
    onError: e => notify.error(axios.isAxiosError(e) && e.response?.status === 422 ? t('itv_synth_empty') : axios.isAxiosError(e) && e.response?.status === 502 ? t('itv_ai_down') : getApiError(e, t('error'))),
  });

  // ── finish ───────────────────────────────────────────────────────────────
  const [finishOpen, setFinishOpen] = useState(false);
  const [decision, setDecision] = useState<InterviewDecision>('later');
  const [nextRound, setNextRound] = useState(false);
  const candQ = useQuery<Employee[]>({ queryKey: ['candidates'], queryFn: listCandidates, enabled: nextRound });
  const finishMut = useMutation({
    mutationFn: async () => {
      await saveFiche(id, body());
      return finishInterview(id, { summary, ...(reco ? { recommendation: reco } : {}), decision });
    },
    onSuccess: r => {
      setSavedVer(ver); setFinishOpen(false);
      patchRoom({ interview: { ...iv!, ...r.interview } });
      refreshLists(); qc.invalidateQueries({ queryKey: ['candidates'] }); qc.invalidateQueries({ queryKey: ['employees'] });
      const name = cand?.full_name ?? '';
      const msg: Record<InterviewDecision, TKey> = { next: 'itv_done_next', offer: 'itv_done_offer', reject: 'itv_done_reject', hire_employee: 'itv_done_hire', hire_intern: 'itv_done_intern', later: 'itv_done_later' };
      notify.success(tf(t(msg[r.decision]), { name }));
      if (r.decision === 'next') setNextRound(true);
      if (r.decision === 'hire_intern') window.setTimeout(() => nav('/app/interns'), 900);
    },
    onError: failMig,
  });

  if (roomQ.isLoading) return <div className="room-loading"><Spinner /></div>;
  if (roomQ.isError || !room || !iv || !cand) {
    return (
      <div className="room-loading">
        <p>{getApiError(roomQ.error, t('itv_not_found'))}</p>
        <Link to="/app/entretiens" className="room-btn"><ArrowLeft size={14} />{t('itv_back')}</Link>
      </div>
    );
  }

  // ── derived ──────────────────────────────────────────────────────────────
  const kind = INTERVIEW_KIND[iv.type] ?? INTERVIEW_KIND.rh;
  const done = iv.status === 'completed' || iv.status === 'realized';
  const started = !!iv.started_at;
  const score = sc ? overallScore(sc.criteria) : (iv.overall_score ?? null);
  const rated = sc?.criteria.filter(c => c.score > 0).length ?? 0;
  const qTotal = sc?.sections.reduce((n, s) => n + s.questions.length, 0) ?? 0;
  const qAsked = sc?.sections.reduce((n, s) => n + s.questions.filter(q => q.asked).length, 0) ?? 0;
  const custom = (cand.custom_fields ?? {}) as Record<string, string>;
  const dateLabel = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(interviewStart(iv.date, iv.start_time));
  const timeLabel = `${iv.start_time.slice(0, 5)} – ${(iv.end_time || '').slice(0, 5)}`;
  const people = room.meeting?.participants ?? [...(iv.interviewers ?? []), { name: cand.full_name }];
  const visio = room.meeting?.visio_url || iv.meet_link;
  const startsIn = Math.round((interviewStart(iv.date, iv.start_time).getTime() - now) / 60000);

  // sheet editors
  const upSection = (sid: string, fn: (s: Scorecard['sections'][number]) => Scorecard['sections'][number]) => sc && edit({ ...sc, sections: sc.sections.map(s => (s.id === sid ? fn(s) : s)) });
  const upQuestion = (sid: string, qid: string, patch: Partial<Scorecard['sections'][number]['questions'][number]>) =>
    upSection(sid, s => ({ ...s, questions: s.questions.map(q => (q.id === qid ? { ...q, ...patch, asked: patch.note !== undefined && patch.note.trim() ? true : (patch.asked ?? q.asked) } : q)) }));
  const upCrit = (cid: string, patch: Partial<Scorecard['criteria'][number]>) => sc && edit({ ...sc, criteria: sc.criteria.map(c => (c.id === cid ? { ...c, ...patch } : c)) });

  const saveLabel = saveErr ? saveErr : unsaved || saveMut.isPending ? t('itv_saving') : savedAt ? tf(t('itv_saved_at'), { time: savedAt.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) }) : '';

  const statusNode: ReactNode = done ? (
    <span className="room-status done"><CheckCircle2 size={14} />{t('itv_status_done')}</span>
  ) : started ? (
    <span className="room-status live"><span className="room-dot" />{t('itv_in_progress')} · <b>{elapsed(iv.started_at!, now)}</b></span>
  ) : (
    <span className="room-status wait"><Clock size={14} />{startsIn > 0 ? tf(t('itv_starts_in'), { n: startsIn < 60 ? `${startsIn} min` : `${Math.floor(startsIn / 60)} h ${startsIn % 60 ? String(startsIn % 60).padStart(2, '0') : ''}`.trim() }) : t('itv_not_started')}</span>
  );

  return (
    <div className="room">
      {/* ── top bar ── */}
      <header className="room-top">
        <Link to="/app/entretiens" className="room-back" aria-label={t('itv_back')}><ArrowLeft size={17} /></Link>
        <span className="room-av" style={{ background: cand.photo_url ? undefined : avatarGradient(cand.full_name) }}>{cand.photo_url ? <img src={cand.photo_url} alt="" /> : initialsOf(cand.full_name)}</span>
        <div className="room-title">
          <h1>{cand.full_name}</h1>
          <p>{cand.position || room.ad?.poste || t('itv_no_position')} · <span style={{ color: kind[2], background: kind[1] }} className="room-kind">{t(kind[0])}</span> · {dateLabel}, {timeLabel}</p>
        </div>
        <div className="room-top-r">
          {statusNode}
          {saveLabel && <span className={`room-save${saveErr ? ' err' : ''}`}>{saveLabel}</span>}
          {visio && <a href={visio} target="_blank" rel="noreferrer" className="room-btn"><Video size={14} />{t('itv_join')}</a>}
          <button type="button" className="room-btn" onClick={() => window.print()} disabled={!sc}><Printer size={14} />{t('itv_print')}</button>
          {!done && (started
            ? <button type="button" className="room-btn dark" onClick={() => setFinishOpen(true)} disabled={!room.migrated}><Flag size={14} />{t('itv_finish')}</button>
            : <button type="button" className="room-btn primary" onClick={() => startMut.mutate()} disabled={startMut.isPending || !room.migrated}>{startMut.isPending ? <Spinner size={13} color="#fff" /> : <Play size={14} />}{t('itv_start_now')}</button>)}
        </div>
      </header>
      {!room.migrated && <div className="room-banner">{t('itv_migration')}</div>}

      <div className="room-grid">
        {/* ── CV / profile / job post ── */}
        <section className="room-col room-cv">
          <div className="room-col-h">
            <div className="room-seg">
              {([['cv', 'itv_tab_cv', FileText], ['profile', 'itv_tab_profile', User], ['job', 'itv_tab_job', Briefcase]] as const).map(([k, key, Icon]) => (
                <button key={k} type="button" className={cvTab === k ? 'on' : ''} onClick={() => setCvTab(k)}><Icon size={13} />{t(key)}</button>
              ))}
            </div>
            {cvTab === 'cv' && room.cv && <div className="room-icons">
              <button type="button" onClick={downloadCv} title={t('itv_download')}><Download size={15} /></button>
              {cvUrl && <a href={cvUrl} target="_blank" rel="noreferrer" title={t('itv_open_tab')}><ExternalLink size={15} /></a>}
              <button type="button" onClick={() => fileRef.current?.click()} title={t('itv_replace_cv')}><Upload size={15} /></button>
            </div>}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" hidden onChange={onCvFile} />

          {cvTab === 'cv' && (!room.cv ? (
            <div className="room-nocv">
              <span className="room-nocv-ic"><FileText size={24} /></span>
              <b>{t('itv_no_cv')}</b>
              <p>{t('itv_no_cv_s')}</p>
              <button type="button" className="room-btn primary" onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}>{uploadMut.isPending ? <Spinner size={13} color="#fff" /> : <Upload size={14} />}{t('itv_upload_cv')}</button>
            </div>
          ) : cvPreviewable ? (
            cvQ.isLoading ? <div className="room-nocv"><Spinner /></div> : cvQ.isError || !cvQ.data ? <div className="room-nocv"><p>{t('itv_cv_error')}</p></div>
              : cvQ.data.type.startsWith('image/') ? <div className="room-cv-img"><img src={cvQ.data.url} alt={room.cv.name} /></div>
                : <iframe className="room-cv-frame" src={`${cvQ.data.url}#view=FitH`} title={room.cv.name} />
          ) : (
            <div className="room-cv-text">
              <div className="room-cv-note"><FileText size={13} />{tf(t('itv_cv_text_note'), { name: room.cv.name })}</div>
              {cvTextQ.isLoading ? <Spinner /> : <pre>{cvTextQ.data || t('itv_cv_error')}</pre>}
            </div>
          ))}

          {cvTab === 'profile' && (
            <div className="room-scroll room-profile">
              <div className="room-contact">
                {cand.email && <a href={`mailto:${cand.email}`}><Mail size={14} />{cand.email}</a>}
                {cand.phone && <a href={`tel:${cand.phone}`}><Phone size={14} />{cand.phone}</a>}
                {custom.linkedin && <a href={custom.linkedin.startsWith('http') ? custom.linkedin : `https://${custom.linkedin}`} target="_blank" rel="noreferrer"><Link2 size={14} />LinkedIn</a>}
                {cand.city && <span><MapPin size={14} />{cand.city}</span>}
              </div>
              <div className="room-facts">
                {custom.source && <div><small>{t('itv_source')}</small><b>{custom.source}</b></div>}
                {cand.created_at && <div><small>{t('itv_applied')}</small><b>{new Date(cand.created_at).toLocaleDateString(loc)}</b></div>}
                {custom.experience_years && <div><small>{t('itv_years')}</small><b>{custom.experience_years}</b></div>}
              </div>
              {!!cand.skills?.length && <><h4>{t('itv_skills')}</h4><div className="room-tags">{cand.skills.map(s => <span key={s}>{s}</span>)}</div></>}
              {cand.experience_summary && <><h4><Briefcase size={13} />{t('itv_experience')}</h4><p className="room-pre">{cand.experience_summary}</p></>}
              {cand.education_summary && <><h4><GraduationCap size={13} />{t('itv_education')}</h4><p className="room-pre">{cand.education_summary}</p></>}
              {!!cand.languages?.length && <><h4><Languages size={13} />{t('itv_languages')}</h4><div className="room-tags">{cand.languages.map(s => <span key={s}>{s}</span>)}</div></>}
              {(cand.notes || cand.bio) && <><h4>{t('itv_message')}</h4><p className="room-pre quote">{cand.notes || cand.bio}</p></>}
              {!cand.skills?.length && !cand.experience_summary && !cand.education_summary && !cand.notes && !cand.bio && <p className="room-muted">{t('itv_profile_empty')}</p>}
              {room.history.length > 0 && <>
                <h4>{t('itv_history')}</h4>
                {room.history.map(h => (
                  <Link key={h.id} to={`/app/entretiens/${h.id}`} className="room-hist">
                    <span>{new Date(`${h.date}T12:00:00`).toLocaleDateString(loc)} · {t((INTERVIEW_KIND[h.type] ?? INTERVIEW_KIND.rh)[0])}</span>
                    {typeof h.overall_score === 'number' ? <b style={{ color: scoreTone(h.overall_score) }}>{h.overall_score}/100</b> : <small>{t(h.status === 'cancelled' ? 'itv_tab_cancelled' : 'itv_tab_upcoming')}</small>}
                  </Link>
                ))}
              </>}
            </div>
          )}

          {cvTab === 'job' && (
            <div className="room-scroll room-profile">
              {room.ad ? <>
                <h3>{room.ad.poste}</h3>
                {room.ad.description && <p className="room-muted">{room.ad.description}</p>}
                {room.ad.competences && <><h4>{t('itv_job_skills')}</h4><p className="room-pre">{room.ad.competences}</p></>}
                {room.ad.experience && <><h4>{t('itv_job_exp')}</h4><p className="room-pre">{room.ad.experience}</p></>}
                {room.ad.contenu && <><h4>{t('itv_job_post')}</h4><p className="room-pre">{room.ad.contenu}</p></>}
              </> : <p className="room-muted">{t('itv_no_job')}</p>}
            </div>
          )}
        </section>

        {/* ── interview sheet ── */}
        <section className="room-col room-sheet">
          {!sc ? (
            <div className="room-gen">
              <span className="room-gen-ic"><Sparkles size={24} /></span>
              <h2>{t('itv_gen_title')}</h2>
              <p>{tf(t('itv_gen_s'), { name: cand.full_name.split(' ')[0] })}</p>
              <ul>
                <li><Check size={14} />{t(room.ad ? 'itv_gen_from_job' : 'itv_gen_from_pos')}</li>
                <li><Check size={14} />{t(room.cv ? 'itv_gen_from_cv' : 'itv_gen_no_cv')}</li>
                <li><Check size={14} />{tf(t('itv_gen_from_type'), { type: t(kind[0]) })}</li>
              </ul>
              <div className="room-gen-lang">
                <span>{t('itv_sheet_lang')}</span>
                {(['fr', 'en', 'ar'] as const).map(l => <button key={l} type="button" className={sheetLang === l ? 'on' : ''} onClick={() => setGenLang(l)}>{l.toUpperCase()}</button>)}
              </div>
              <div className="room-gen-btns">
                <button type="button" className="room-btn primary room-btn-lg" onClick={() => genMut.mutate('ai')} disabled={genMut.isPending || !room.migrated}>
                  {genMut.isPending && genMut.variables === 'ai' ? <Spinner size={14} color="#fff" /> : <Sparkles size={15} />}{t(genMut.isPending && genMut.variables === 'ai' ? 'itv_generating' : 'itv_gen_ai')}
                </button>
                <button type="button" className="room-btn room-btn-lg" onClick={() => genMut.mutate('template')} disabled={genMut.isPending || !room.migrated}><ClipboardCheck size={15} />{t('itv_gen_tpl')}</button>
              </div>
            </div>
          ) : (
            <div className="room-scroll">
              <div className="room-sheet-h">
                <div>
                  <h2>{t('itv_sheet')}</h2>
                  <p>
                    <span className={`room-src ${sc.source}`}>{sc.source === 'ai' ? <><Sparkles size={11} />{t('itv_src_ai')}</> : <><ClipboardCheck size={11} />{t('itv_src_tpl')}</>}</span>
                    {tf(t('itv_progress'), { a: qAsked, n: qTotal })} · {tf(t('itv_rated'), { n: rated, total: sc.criteria.length })}
                  </p>
                </div>
                {!done && <details className="room-menu">
                  <summary><RefreshCw size={14} />{t('itv_regen')}<ChevronDown size={13} /></summary>
                  <div>
                    <button type="button" onClick={() => regenerate('ai')} disabled={genMut.isPending}><Sparkles size={14} />{t('itv_gen_ai')}</button>
                    <button type="button" onClick={() => regenerate('template')} disabled={genMut.isPending}><ClipboardCheck size={14} />{t('itv_gen_tpl')}</button>
                  </div>
                </details>}
              </div>
              <div className="room-progress"><span style={{ width: `${qTotal ? (qAsked / qTotal) * 100 : 0}%` }} /></div>

              {sc.sections.map((s, si) => (
                <article key={s.id} className={`room-sec${s.done ? ' done' : ''}`}>
                  <header>
                    <span className="room-sec-n">{String(si + 1).padStart(2, '0')}</span>
                    <h3>{s.title}</h3>
                    <button type="button" className={`room-sec-done${s.done ? ' on' : ''}`} onClick={() => upSection(s.id, x => ({ ...x, done: !x.done }))}>
                      {s.done ? <CheckCircle2 size={14} /> : <CircleDot size={14} />}{t(s.done ? 'itv_sec_done' : 'itv_sec_mark')}
                    </button>
                  </header>
                  {s.questions.map(q => (
                    <div key={q.id} className={`room-q${q.asked ? ' asked' : ''}`}>
                      <button type="button" className="room-q-chk" aria-label={t('itv_asked')} onClick={() => upQuestion(s.id, q.id, { asked: !q.asked })}>
                        {q.asked ? <SquareCheck size={17} /> : <Square size={17} />}
                      </button>
                      <div className="room-q-body">
                        <p className="room-q-t">{q.q}</p>
                        {q.hint && <p className="room-q-hint">{q.hint}</p>}
                        <Grow className="room-note" value={q.note} onChange={v => upQuestion(s.id, q.id, { note: v })} placeholder={t('itv_note_ph')} minRows={1} />
                      </div>
                      <button type="button" className="room-q-del" aria-label={t('itv_remove')} onClick={() => upSection(s.id, x => ({ ...x, questions: x.questions.filter(y => y.id !== q.id) }))}><X size={13} /></button>
                    </div>
                  ))}
                  <AddQuestion onAdd={txt => upSection(s.id, x => ({ ...x, questions: [...x.questions, { id: uid(), q: txt, hint: '', note: '', asked: false }] }))} />
                </article>
              ))}

              <article className="room-sec room-crit">
                <header><span className="room-sec-n"><ThumbsUp size={13} /></span><h3>{t('itv_criteria')}</h3><span className="room-muted sm">{t('itv_criteria_s')}</span></header>
                {sc.criteria.map(c => (
                  <div key={c.id} className="room-c">
                    <div className="room-c-l">
                      <b>{c.label} <em title={t('itv_weight')}>×{c.weight}</em></b>
                      {c.desc && <small>{c.desc}</small>}
                    </div>
                    <div className="room-stars" role="radiogroup" aria-label={c.label}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} type="button" role="radio" aria-checked={c.score === n} title={t(RATING[n - 1])} className={c.score >= n ? 'on' : ''}
                          style={c.score >= n ? { background: scoreTone(c.score * 20), borderColor: scoreTone(c.score * 20) } : undefined}
                          onClick={() => upCrit(c.id, { score: c.score === n ? 0 : n })}>{n}</button>
                      ))}
                      <span className="room-stars-l">{c.score ? t(RATING[c.score - 1]) : t('itv_not_rated')}</span>
                    </div>
                    <input className="room-c-note" value={c.note} onChange={e => upCrit(c.id, { note: e.target.value })} placeholder={t('itv_crit_note_ph')} />
                  </div>
                ))}
              </article>

              <div className="room-two">
                <article className="room-sec">
                  <header><span className="room-sec-n ok"><ThumbsUp size={13} /></span><h3>{t('itv_strengths')}</h3></header>
                  <ChipList tone="ok" items={sc.strengths} onChange={v => edit({ ...sc, strengths: v })} placeholder={t('itv_add_item')} />
                </article>
                <article className="room-sec">
                  <header><span className="room-sec-n warn"><ThumbsDown size={13} /></span><h3>{t('itv_concerns')}</h3></header>
                  <ChipList tone="warn" items={sc.concerns} onChange={v => edit({ ...sc, concerns: v })} placeholder={t('itv_add_item')} />
                </article>
              </div>

              <article className="room-sec">
                <header><span className="room-sec-n"><FileText size={13} /></span><h3>{t('itv_free_notes')}</h3></header>
                <Grow className="room-note big" value={sc.notes} onChange={v => edit({ ...sc, notes: v })} placeholder={t('itv_free_notes_ph')} minRows={4} />
              </article>
            </div>
          )}
        </section>

        {/* ── meeting, score, synthesis, decision ── */}
        <aside className="room-col room-side">
          <div className="room-scroll">
            <div className="room-card room-score">
              <svg viewBox="0 0 104 104" width="104" height="104" aria-hidden>
                <circle cx="52" cy="52" r="46" fill="none" stroke="#eef2f4" strokeWidth="8" />
                {score !== null && <circle cx="52" cy="52" r="46" fill="none" stroke={scoreTone(score)} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(RING * score) / 100} ${RING}`} transform="rotate(-90 52 52)" style={{ transition: 'stroke-dasharray .5s ease' }} />}
                <text x="52" y="52" textAnchor="middle" dominantBaseline="central" fontSize={score === null ? 18 : 26} fontWeight="700" fill="#0a1c24" fontFamily="'Bricolage Grotesque',system-ui,sans-serif">{score === null ? '—' : score}</text>
              </svg>
              <div>
                <small>{t('itv_score')}</small>
                <b>{score === null ? t('itv_score_none') : tf(t('itv_score_on'), { n: score })}</b>
                <span>{sc ? tf(t('itv_rated'), { n: rated, total: sc.criteria.length }) : t('itv_sheet_todo')}</span>
              </div>
            </div>

            <div className="room-card">
              <div className="room-card-h"><b>{t('itv_reco')}</b></div>
              <div className="room-reco">
                {RECO_ORDER.map(r => (
                  <button key={r} type="button" disabled={done && !sc} className={reco === r ? 'on' : ''} style={reco === r ? { background: RECO[r][1], color: RECO[r][2], borderColor: RECO[r][2] } : undefined}
                    onClick={() => editMeta(() => setReco(reco === r ? null : r))}>{t(RECO[r][0])}</button>
                ))}
              </div>
              <div className="room-card-h" style={{ marginTop: 14 }}>
                <b>{t('itv_synthesis')}</b>
                <button type="button" className="room-ai" onClick={() => synthMut.mutate()} disabled={synthMut.isPending || !sc}>{synthMut.isPending ? <Spinner size={12} /> : <Sparkles size={13} />}{t('itv_synth_ai')}</button>
              </div>
              <Grow className="room-note" value={summary} onChange={v => editMeta(() => setSummary(v))} placeholder={t('itv_synth_ph')} minRows={4} />
            </div>

            <div className="room-card room-meet">
              <div className="room-card-h"><b><Video size={14} />{t('itv_meeting')}</b>{room.meeting && <Link to="/app/meetings">{t('itv_see_meetings')}</Link>}</div>
              <div className="room-meet-row"><CalendarClock size={14} /><span>{dateLabel}<br /><small>{timeLabel} · {durationMin(iv.start_time, iv.end_time)} min</small></span></div>
              {room.meeting?.place && <div className="room-meet-row"><MapPin size={14} /><span>{room.meeting.place}</span></div>}
              {visio ? <a className="room-meet-row link" href={visio} target="_blank" rel="noreferrer"><Video size={14} /><span>{visio.replace(/^https?:\/\//, '').slice(0, 38)}</span></a>
                : <div className="room-meet-row muted"><Video size={14} /><span>{t('itv_no_visio')}</span></div>}
              <div className="room-people">
                <Users size={14} />
                <div>{people.map(p => <span key={p.name} title={p.name} style={{ background: avatarGradient(p.name) }}>{initialsOf(p.name)}</span>)}</div>
                <small>{people.map(p => p.name.split(' ')[0]).join(', ')}</small>
              </div>
              {sc && <div className="room-agenda">
                <small>{t('itv_agenda')}</small>
                {sc.sections.map(s => <div key={s.id} className={s.done ? 'on' : ''}>{s.done ? <CheckCircle2 size={13} /> : <CircleDot size={13} />}{s.title}</div>)}
              </div>}
              {!room.meeting && !done && <button type="button" className="room-btn full" onClick={() => meetMut.mutate()} disabled={meetMut.isPending || !room.migrated}>{meetMut.isPending ? <Spinner size={13} /> : <Plus size={14} />}{t('itv_create_meeting')}</button>}
            </div>

            {done ? (
              <div className="room-card room-closed">
                <CheckCircle2 size={18} />
                <div><b>{t('itv_closed')}</b><small>{iv.ended_at ? new Date(iv.ended_at).toLocaleString(loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}{STAGE_KEY[custom.recruitment_stage] ? ` · ${t(STAGE_KEY[custom.recruitment_stage])}` : ''}</small></div>
                <Link to={`/app/candidats?c=${cand.id}`}>{t('itv_see_cand')}</Link>
              </div>
            ) : (
              <button type="button" className="room-btn dark full room-btn-lg" onClick={() => setFinishOpen(true)} disabled={!room.migrated}><Flag size={15} />{t('itv_finish')}</button>
            )}
          </div>
        </aside>
      </div>

      {/* ── finish dialog ── */}
      {finishOpen && (
        <div className="room-modal" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) setFinishOpen(false); }}>
          <div className="room-modal-box">
            <header><h2>{t('itv_finish_title')}</h2><button type="button" onClick={() => setFinishOpen(false)} aria-label={t('cancel')}><X size={17} /></button></header>
            <p className="room-muted">{tf(t('itv_finish_s'), { name: cand.full_name })}</p>
            <div className="room-modal-sum">
              <span><b style={{ color: score === null ? '#7d8f97' : scoreTone(score) }}>{score ?? '—'}</b>/100</span>
              <span>{tf(t('itv_rated'), { n: rated, total: sc?.criteria.length ?? 0 })}</span>
              <span>{tf(t('itv_progress'), { a: qAsked, n: qTotal })}</span>
              {reco && <span style={{ background: RECO[reco][1], color: RECO[reco][2] }}>{t(RECO[reco][0])}</span>}
            </div>
            {!summary.trim() && <p className="room-warn">{t('itv_finish_nosum')}</p>}
            <div className="room-dec">
              {DECISIONS.map(([k, key, sub, accent]) => (
                <button key={k} type="button" className={decision === k ? 'on' : ''} style={decision === k ? { borderColor: accent, boxShadow: `0 0 0 3px ${accent}22` } : undefined} onClick={() => setDecision(k)}>
                  <span style={{ background: accent }} />
                  <b>{t(key)}</b><small>{t(sub)}</small>
                </button>
              ))}
            </div>
            <footer>
              <button type="button" className="room-btn" onClick={() => setFinishOpen(false)}>{t('cancel')}</button>
              <button type="button" className="room-btn dark" onClick={() => finishMut.mutate()} disabled={finishMut.isPending}>{finishMut.isPending ? <Spinner size={13} color="#fff" /> : <Check size={14} />}{t('itv_finish_confirm')}</button>
            </footer>
          </div>
        </div>
      )}

      <ScheduleInterviewDrawer open={nextRound} onClose={() => setNextRound(false)} candidates={candQ.data?.length ? candQ.data : [cand]} candidateId={cand.id}
        defaultType={NEXT_TYPE[iv.type] ?? 'final'} onScheduled={(_, n) => { if (n?.id) nav(`/app/entretiens/${n.id}`); }} />

      <PrintSheet iv={iv} room={room} sc={sc} summary={summary} reco={reco} score={score} loc={loc} />
    </div>
  );
}

function AddQuestion({ onAdd }: { onAdd: (q: string) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState('');
  const add = () => { if (v.trim()) onAdd(v.trim()); setV(''); setOpen(false); };
  if (!open) return <button type="button" className="room-addq" onClick={() => setOpen(true)}><Plus size={13} />{t('itv_add_q')}</button>;
  return (
    <div className="room-addq-in">
      <input autoFocus value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') { setV(''); setOpen(false); } }} placeholder={t('itv_add_q_ph')} />
      <button type="button" className="room-btn primary" onClick={add}><Check size={13} /></button>
    </div>
  );
}

/** The printable interview sheet (window.print). */
function PrintSheet({ iv, room, sc, summary, reco, score, loc }: { iv: InterviewFull; room: InterviewRoom; sc: Scorecard | null; summary: string; reco: Recommendation | null; score: number | null; loc: string }) {
  const { t } = useLang();
  if (!sc) return null;
  const c = room.candidate;
  const people = (iv.interviewers ?? []).map(p => p.name).join(', ') || room.meeting?.participants.filter(p => p.name !== c.full_name).map(p => p.name).join(', ') || '—';
  return (
    <div className="room-print">
      <div className="rp-head">
        <div><small>{t('itv_sheet')}</small><h1>{c.full_name}</h1><p>{c.position || room.ad?.poste || ''} · {t((INTERVIEW_KIND[iv.type] ?? INTERVIEW_KIND.rh)[0])}</p></div>
        <div className="rp-score"><b>{score ?? '—'}</b><small>/100</small>{reco && <span>{t(RECO[reco][0])}</span>}</div>
      </div>
      <table className="rp-meta"><tbody>
        <tr><th>{t('pl_date')}</th><td>{interviewStart(iv.date, iv.start_time).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {iv.start_time.slice(0, 5)} – {(iv.end_time || '').slice(0, 5)}</td></tr>
        <tr><th>{t('itv_interviewers')}</th><td>{people}</td></tr>
        {c.email && <tr><th>Email</th><td>{c.email}{c.phone ? ` · ${c.phone}` : ''}</td></tr>}
      </tbody></table>
      {sc.sections.map((s, i) => (
        <section key={s.id}>
          <h2>{i + 1}. {s.title}</h2>
          {s.questions.map(q => <div key={q.id} className="rp-q"><b>{q.asked ? '☑' : '☐'} {q.q}</b><p>{q.note || ' '}</p></div>)}
        </section>
      ))}
      <section>
        <h2>{t('itv_criteria')}</h2>
        <table className="rp-crit"><tbody>
          {sc.criteria.map(cr => <tr key={cr.id}><td>{cr.label} <small>×{cr.weight}</small></td><td className="rp-n">{cr.score ? `${cr.score}/5` : '—'}</td><td>{cr.note}</td></tr>)}
        </tbody></table>
      </section>
      <div className="rp-two">
        <section><h2>{t('itv_strengths')}</h2><ul>{sc.strengths.map(x => <li key={x}>{x}</li>)}</ul></section>
        <section><h2>{t('itv_concerns')}</h2><ul>{sc.concerns.map(x => <li key={x}>{x}</li>)}</ul></section>
      </div>
      {sc.notes && <section><h2>{t('itv_free_notes')}</h2><p className="rp-pre">{sc.notes}</p></section>}
      <section><h2>{t('itv_synthesis')}</h2><p className="rp-pre">{summary || ' '}</p></section>
      <div className="rp-sign"><div>{t('itv_sign')}</div><div>{t('pl_date')}</div></div>
    </div>
  );
}
