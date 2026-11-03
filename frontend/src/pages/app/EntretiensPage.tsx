// Entretiens — every interview of the candidates, and the applications still waiting for one.
// Each interview opens the interview room (/app/entretiens/:id): CV, meeting and interview sheet side by side.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, CalendarPlus, ClipboardCheck, FileText, Play, Search, Sparkles, Timer, Users, Video } from 'lucide-react';
import { interviewsBoard, listCandidates, type BoardInterview, type Employee } from '@/services/api';
import { RV, CountText } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { INTERVIEW_KIND, stageOf, upcomingByCandidate } from '@/lib/recruitment';
import { RECO, interviewStart, scoreTone } from '@/lib/interview';
import { ScheduleInterviewDrawer } from '@/components/recruitment/ScheduleInterviewDrawer';
import './EntretiensPage.css';

type Tab = 'upcoming' | 'review' | 'done' | 'cancelled';
const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const TABS: [Tab, TKey][] = [['upcoming', 'itv_tab_upcoming'], ['review', 'itv_tab_review'], ['done', 'itv_tab_done'], ['cancelled', 'itv_tab_cancelled']];

const isDone = (i: BoardInterview) => i.status === 'completed' || i.status === 'realized';

export default function EntretiensPage() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [tab, setTab] = useState<Tab>('upcoming');
  const [q, setQ] = useState('');
  const [sched, setSched] = useState<{ open: boolean; cand: string }>({ open: false, cand: '' });
  const [now] = useState(() => Date.now());

  const boardQ = useQuery({ queryKey: ['interviews-board'], queryFn: interviewsBoard, refetchInterval: 60_000 });
  const candQ = useQuery<Employee[]>({ queryKey: ['candidates'], queryFn: listCandidates });
  const all = useMemo(() => boardQ.data?.data ?? [], [boardQ.data]);
  const cands = useMemo(() => candQ.data ?? [], [candQ.data]);

  // ── classification ─────────────────────────────────────────────────────────
  const endOf = (i: BoardInterview) => interviewStart(i.date, i.end_time || i.start_time).getTime();
  const tabOf = (i: BoardInterview): Tab => {
    if (i.status === 'cancelled') return 'cancelled';
    if (isDone(i)) return 'done';
    if (i.started_at || endOf(i) < now) return 'review';
    return 'upcoming';
  };
  const needle = q.trim().toLowerCase();
  const match = (i: BoardInterview) => !needle || [i.candidate?.full_name, i.candidate?.position, ...(i.interviewers ?? []).map(p => p.name)].filter(Boolean).join(' ').toLowerCase().includes(needle);
  const counts = TABS.reduce((m, [k]) => ({ ...m, [k]: all.filter(i => tabOf(i) === k).length }), {} as Record<Tab, number>);
  const rows = all.filter(i => tabOf(i) === tab && match(i))
    .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (a.date + a.start_time).localeCompare(b.date + b.start_time));

  const dayKey = (iso: string) => iso;
  const today = new Date(now).toISOString().slice(0, 10);
  const tomorrow = new Date(now + 86400000).toISOString().slice(0, 10);
  const dayLabel = (d: string) => (d === today ? t('itv_today') : d === tomorrow ? t('itv_tomorrow') : new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${d}T12:00:00`)));
  const groups: { day: string; items: BoardInterview[] }[] = [];
  rows.forEach(i => { const k = dayKey(i.date); const g = groups.find(x => x.day === k); if (g) g.items.push(i); else groups.push({ day: k, items: [i] }); });

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const weekEnd = new Date(now + 7 * 86400000).toISOString().slice(0, 10);
  const live = all.filter(i => i.status !== 'cancelled');
  const kToday = live.filter(i => i.date === today).length;
  const kWeek = live.filter(i => !isDone(i) && i.date >= today && i.date <= weekEnd).length;
  const kReview = counts.review;
  const scored = all.filter(i => isDone(i) && typeof i.overall_score === 'number');
  const avg = scored.length ? Math.round(scored.reduce((s, i) => s + (i.overall_score ?? 0), 0) / scored.length) : null;

  // next interview (spotlight)
  const next = all.filter(i => tabOf(i) === 'upcoming').sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))[0];
  const nextIn = next ? Math.round((interviewStart(next.date, next.start_time).getTime() - now) / 60000) : 0;
  const inLabel = (m: number) => (m < 60 ? tf(t('itv_in_min'), { n: Math.max(0, m) }) : m < 1440 ? tf(t('itv_in_h'), { n: Math.round(m / 60) }) : tf(t('itv_in_d'), { n: Math.round(m / 1440) }));

  // applications without an upcoming interview
  const upcoming = useMemo(() => upcomingByCandidate(all), [all]);
  const waiting = cands.filter(c => { const s = stageOf(c, upcoming.get(c.id)); return (s === 'screen' || s === 'interview' || s === 'new') && !upcoming.has(c.id) && !all.some(i => i.candidate_id === c.id && !isDone(i) && i.status !== 'cancelled'); })
    .sort((a, b) => { const r = (c: Employee) => ({ interview: 0, screen: 1, new: 2 } as Record<string, number>)[stageOf(c)] ?? 3; return r(a) - r(b); })
    .slice(0, 8);

  const timeOf = (i: BoardInterview) => (i.start_time || '').slice(0, 5);
  const actionOf = (i: BoardInterview): [TKey, boolean] => {
    const tb = tabOf(i);
    if (tb === 'done') return ['itv_open_sheet', false];
    if (tb === 'cancelled') return ['itv_view', false];
    if (i.started_at) return ['itv_resume', true];
    return ['itv_start', true];
  };

  return (
    <div className="itv-page">
      <div className="itv-head">
        <div>
          <RV as="h1" variant="up" className="itv-h1">{t('itv_title')}</RV>
          <RV as="p" variant="up" delay={60} className="itv-sub">{t('itv_subtitle')}</RV>
        </div>
        <RV as="button" variant="up" delay={100} type="button" className="itv-cta" onClick={() => setSched({ open: true, cand: '' })}>
          <CalendarPlus size={16} />{t('pl_new_interview')}
        </RV>
      </div>

      {boardQ.data && !boardQ.data.migrated && all.length > 0 && (
        <div className="itv-banner">{t('itv_migration')}</div>
      )}

      <div className="itv-kpis">
        {([
          [CalendarClock, 'itv_k_today', kToday, '#0e6f84', '#e4f2f4', null],
          [Users, 'itv_k_week', kWeek, '#6d5ad6', '#ece9fb', null],
          [ClipboardCheck, 'itv_k_review', kReview, '#b06b0c', '#fbefda', kReview ? () => setTab('review') : null],
          [Sparkles, 'itv_k_avg', avg, '#16a06b', '#e1f5ec', null],
        ] as const).map(([Icon, key, n, ink, tint, go], i) => (
          <RV key={key} as="div" variant="up" delay={120 + i * 50} className={`itv-kpi${go ? ' itv-click' : ''}`} onClick={go ?? undefined}>
            <span className="itv-kpi-ic" style={{ background: tint, color: ink }}><Icon size={17} /></span>
            <div>
              <div className="itv-kpi-n">{n === null ? '—' : <><CountText text={n} />{key === 'itv_k_avg' ? <small>/100</small> : null}</>}</div>
              <div className="itv-kpi-l">{t(key)}{key === 'itv_k_avg' && scored.length ? ` · ${tf(t('itv_k_avg_n'), { n: scored.length })}` : ''}</div>
            </div>
          </RV>
        ))}
      </div>

      <div className="itv-grid">
        <RV as="section" variant="up" delay={200} className="itv-card itv-list">
          <div className="itv-toolbar">
            <div className="itv-tabs">
              {TABS.map(([k, key]) => (
                <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                  {tab === k && <RV as="span" variant="pill" className="itv-pill" />}
                  <span>{t(key)}</span><em>{counts[k]}</em>
                </button>
              ))}
            </div>
            <label className="itv-search"><Search size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('itv_search')} /></label>
          </div>

          {boardQ.isLoading ? <div className="itv-empty"><Spinner /></div> : groups.length === 0 ? (
            <div className="itv-empty">
              <span className="itv-empty-ic"><ClipboardCheck size={22} /></span>
              <b>{t(tab === 'upcoming' ? 'itv_empty_upcoming' : tab === 'review' ? 'itv_empty_review' : tab === 'done' ? 'itv_empty_done' : 'itv_empty_cancelled')}</b>
              {tab === 'upcoming' && <button type="button" className="itv-link" onClick={() => setSched({ open: true, cand: '' })}>{t('pl_new_interview')} <ArrowRight size={14} /></button>}
            </div>
          ) : groups.map(g => (
            <div key={g.day}>
              <div className="itv-day">{dayLabel(g.day)} <span>{g.items.length}</span></div>
              {g.items.map((i, n) => {
                const kind = INTERVIEW_KIND[i.type] ?? INTERVIEW_KIND.rh;
                const name = i.candidate?.full_name || t('itv_unknown_cand');
                const [actKey, primary] = actionOf(i);
                const reco = i.recommendation ? RECO[i.recommendation] : null;
                return (
                  <RV key={i.id} as="div" variant="up" delay={Math.min(n, 8) * 40} className="itv-row" onClick={() => nav(`/app/entretiens/${i.id}`)}>
                    <span className="itv-time" style={{ background: kind[1] }}>
                      <b style={{ color: kind[2] }}>{timeOf(i)}</b>
                      <small>{(i.end_time || '').slice(0, 5)}</small>
                    </span>
                    <span className="itv-av" style={{ background: i.candidate?.photo_url ? undefined : avatarGradient(name) }}>
                      {i.candidate?.photo_url ? <img src={i.candidate.photo_url} alt="" /> : initialsOf(name)}
                    </span>
                    <span className="itv-who">
                      <b>{name}</b>
                      <small>{i.candidate?.position || t('itv_no_position')}{(i.interviewers ?? []).length ? ` · ${tf(t('itv_with'), { names: (i.interviewers ?? []).map(p => p.name.split(' ')[0]).join(', ') })}` : ''}</small>
                    </span>
                    <span className="itv-chips">
                      <span className="itv-chip" style={{ background: kind[1], color: kind[2] }}>{t(kind[0])}</span>
                      <span className={`itv-chip ${i.has_cv ? 'ok' : 'off'}`}><FileText size={12} />{t(i.has_cv ? 'itv_cv_yes' : 'itv_cv_no')}</span>
                      {i.has_fiche ? <span className="itv-chip ok">{i.fiche_source === 'ai' ? <Sparkles size={12} /> : <ClipboardCheck size={12} />}{i.criteria ? tf(t('itv_rated'), { n: i.rated, total: i.criteria }) : t('itv_sheet_ready')}</span>
                        : <span className="itv-chip off"><ClipboardCheck size={12} />{t('itv_sheet_todo')}</span>}
                      {i.meeting_id && <span className="itv-chip ok"><Video size={12} />{t('itv_meeting')}</span>}
                      {i.started_at && !isDone(i) && <span className="itv-chip live"><Timer size={12} />{t('itv_in_progress')}</span>}
                    </span>
                    <span className="itv-end">
                      {typeof i.overall_score === 'number' && <span className="itv-score" style={{ color: scoreTone(i.overall_score) }}>{i.overall_score}<small>/100</small></span>}
                      {reco && isDone(i) && <span className="itv-chip" style={{ background: reco[1], color: reco[2] }}>{t(reco[0])}</span>}
                      <Link to={`/app/entretiens/${i.id}`} onClick={e => e.stopPropagation()} className={primary ? 'itv-go' : 'itv-go ghost'}>
                        {primary && <Play size={13} />}{t(actKey)}
                      </Link>
                    </span>
                  </RV>
                );
              })}
            </div>
          ))}
        </RV>

        <div className="itv-side">
          <RV as="section" variant="up" delay={240} className="itv-next">
            <div className="itv-next-k">{t('itv_next')}</div>
            {next ? (
              <>
                <div className="itv-next-who">
                  <span className="itv-av itv-av-lg" style={{ background: avatarGradient(next.candidate?.full_name || '?') }}>{initialsOf(next.candidate?.full_name || '?')}</span>
                  <div><b>{next.candidate?.full_name}</b><small>{next.candidate?.position || t('itv_no_position')}</small></div>
                </div>
                <div className="itv-next-meta">
                  <span><CalendarClock size={14} />{dayLabel(next.date)} · {timeOf(next)}</span>
                  <span className="itv-next-in">{inLabel(nextIn)}</span>
                </div>
                <div className="itv-next-chips">
                  <span>{t((INTERVIEW_KIND[next.type] ?? INTERVIEW_KIND.rh)[0])}</span>
                  <span>{t(next.has_cv ? 'itv_cv_yes' : 'itv_cv_no')}</span>
                  <span>{t(next.has_fiche ? 'itv_sheet_ready' : 'itv_sheet_todo')}</span>
                </div>
                <Link to={`/app/entretiens/${next.id}`} className="itv-next-btn"><Play size={14} />{t(next.has_fiche ? 'itv_open_room' : 'itv_prepare')}</Link>
              </>
            ) : <p className="itv-next-none">{t('itv_next_none')}</p>}
          </RV>

          <RV as="section" variant="up" delay={280} className="itv-card itv-wait">
            <div className="itv-card-h">
              <b>{t('itv_waiting')}</b>
              <Link to="/app/candidats">{t('itv_all_cands')}</Link>
            </div>
            <p className="itv-card-s">{t('itv_waiting_s')}</p>
            {candQ.isLoading ? <div className="itv-empty sm"><Spinner size={16} /></div> : waiting.length === 0 ? <div className="itv-empty sm">{t('itv_waiting_none')}</div> : waiting.map(c => (
              <div key={c.id} className="itv-wait-row">
                <span className="itv-av sm" style={{ background: avatarGradient(c.full_name) }}>{initialsOf(c.full_name)}</span>
                <span className="itv-who"><b>{c.full_name}</b><small>{c.position || t('itv_no_position')}</small></span>
                <button type="button" className="itv-mini" onClick={() => setSched({ open: true, cand: c.id })}><CalendarPlus size={13} />{t('itv_plan')}</button>
              </div>
            ))}
          </RV>
        </div>
      </div>

      <ScheduleInterviewDrawer open={sched.open} onClose={() => setSched({ open: false, cand: '' })} candidates={cands} candidateId={sched.cand} />
    </div>
  );
}
