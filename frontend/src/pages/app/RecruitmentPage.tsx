import { useMemo, useState, type DragEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Clock, Inbox, Megaphone, Users } from 'lucide-react';
import { listCandidates, listEmployees, listInterviews, listAnnonces, updateEmployee, promoteToEmployee, getApiError } from '@/services/api';
import type { Employee } from '@/services/api';
import { RV, CountText } from '@/components/motion';
import { Drawer, Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { STAGES, stageOf, scoreOf, sourceOf, stageSince, scoreColor, daysSince, upcomingByCandidate, type Stage } from '@/lib/recruitment';
import SpontaneousApplications from '@/components/recruitment/SpontaneousApplications';
import './RecruitmentPage.css';

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const C = 2 * Math.PI * 15;
const statLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' } as const;
const statValue = { fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 } as const;

export default function RecruitmentPage() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [job, setJob] = useState<string>('');
  const [spontOpen, setSpontOpen] = useState(false);
  const [over, setOver] = useState<Stage | null>(null);

  const { data: candidates = [], isLoading } = useQuery<Employee[]>({ queryKey: ['candidates'], queryFn: listCandidates });
  const { data: interviews = [] } = useQuery({ queryKey: ['interviews'], queryFn: listInterviews });
  const { data: ads = [] } = useQuery({ queryKey: ['annonces'], queryFn: listAnnonces });
  // hired from the pipeline: employees whose file still carries recruitment_stage = hired (last 90 days)
  const { data: emps } = useQuery({ queryKey: ['employees', 'recent-hires'], queryFn: () => listEmployees({ status: 'active', limit: 500 }) });

  const upcoming = useMemo(() => upcomingByCandidate(interviews), [interviews]);
  const recentHires = (emps?.data ?? []).filter(e => e.custom_fields?.recruitment_stage === 'hired' && (daysSince(e.hire_date) ?? 999) <= 90);
  const people = [...candidates, ...recentHires];

  const move = useMutation({
    mutationFn: async ({ e, stage }: { e: Employee; stage: Stage }) => {
      const custom_fields = { ...(e.custom_fields ?? {}), recruitment_stage: stage, stage_changed_at: new Date().toISOString() };
      if (stage === 'hired') return promoteToEmployee(e.id, { hire_date: new Date().toISOString().slice(0, 10), custom_fields });
      return updateEmployee(e.id, { custom_fields, ...(e.status !== 'candidate' ? { status: 'candidate' } : {}) });
    },
    onMutate: async ({ e, stage }) => {
      await qc.cancelQueries({ queryKey: ['candidates'] });
      const prev = qc.getQueryData<Employee[]>(['candidates']);
      if (stage !== 'hired') qc.setQueryData<Employee[]>(['candidates'], list => (list ?? []).map(x => x.id === e.id ? { ...x, custom_fields: { ...(x.custom_fields ?? {}), recruitment_stage: stage, stage_changed_at: new Date().toISOString() } } : x));
      return { prev };
    },
    onSuccess: (_, { e, stage }) => {
      const label = t(STAGES.find(s => s[0] === stage)![1]);
      notify.success(stage === 'hired' ? tf(t('rec_hired_toast'), { name: e.full_name }) : `${e.full_name} → ${label}`);
    },
    onError: (err, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['candidates'], ctx.prev); notify.error(getApiError(err, t('error'))); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['candidates'] }); qc.invalidateQueries({ queryKey: ['employees'] }); },
  });

  const drop = (stage: Stage) => (ev: DragEvent) => {
    ev.preventDefault();
    setOver(null);
    let id = '';
    try { id = ev.dataTransfer.getData('text/plain'); } catch { /* ignore */ }
    const e = people.find(p => p.id === id);
    if (!e || stageOf(e, upcoming.get(e.id)) === stage) return;
    if (stage === 'hired' && !window.confirm(tf(t('rec_confirm_hire'), { name: e.full_name }))) return;
    move.mutate({ e, stage });
  };

  const jobsList = [...new Set(people.map(p => (p.position || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const pool = people.filter(p => !job || (p.position || '').trim() === job);
  const active = candidates;
  const hireDelays = recentHires.map(e => (e.hire_date && e.created_at ? (new Date(e.hire_date).getTime() - new Date(e.created_at).getTime()) / 86400000 : NaN)).filter(n => Number.isFinite(n) && n >= 0);
  const avgDelay = hireDelays.length ? Math.round(hireDelays.reduce((a, b) => a + b, 0) / hireDelays.length) : null;
  const openPosts = ads.filter(a => a.is_active).length;
  const nextLabel = (iso: string, time: string) => {
    const d = new Date(`${iso}T00:00:00`);
    const w = d.toLocaleDateString(loc, { weekday: 'short' });
    return `${w.charAt(0).toUpperCase()}${w.slice(1)} ${time.slice(0, 5)}`;
  };
  const ageLabel = (iso?: string) => {
    const n = daysSince(iso);
    if (n === null) return '';
    return n === 0 ? t('rec_today') : tf(t('rec_days'), { n });
  };

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('rec_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('rec_subtitle')}</RV>
        </div>
        <RV as="div" variant="up" delay={100} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setSpontOpen(true)} title={t('rec_spontaneous')} aria-label={t('rec_spontaneous')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, padding: 0, borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', cursor: 'pointer' }} className="rec-h1">
            <Inbox size={16} />
          </button>
          <Link to="/app/candidats" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap' }} className="rec-h1">
            <Users size={15} />{t('rec_all_candidates')}
          </Link>
          <Link to="/app/annonces" style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }} className="rec-h2">
            <span className="wedy-shine" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} />
            <Megaphone size={16} style={{ position: 'relative' }} /><span style={{ position: 'relative' }}>{t('rec_publish')}</span>
          </Link>
        </RV>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <RV as="div" variant="up" delay={80} style={{ padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(135deg,#0b5f72,#0e7f96)', color: '#ffffff' }}>
          <div style={{ ...statLabel, color: undefined, opacity: 0.9 }}>{t('rec_open_posts')}</div>
          <CountText as="div" text={String(openPosts)} style={statValue} />
        </RV>
        <RV as="div" variant="up" delay={130} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={statLabel}>{t('rec_active')}</div><div style={statValue}>{active.length}</div>
        </RV>
        <RV as="div" variant="up" delay={180} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={statLabel}>{t('rec_interviews_planned')}</div><div style={statValue}>{upcoming.size}</div>
        </RV>
        <RV as="div" variant="up" delay={230} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={statLabel}>{t('rec_avg_delay')}</div><div style={statValue}>{avgDelay === null ? '—' : tf(t('rec_days'), { n: avgDelay })}</div>
        </RV>
      </div>

      {jobsList.length > 0 && (
        <RV as="div" variant="up" delay={160} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['', ...jobsList].map(j => {
            const on = job === j;
            const n = candidates.filter(c => !j || (c.position || '').trim() === j).length;
            return (
              <button key={j || 'all'} type="button" onClick={() => setJob(j)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', borderRadius: 99, border: `1px solid ${on ? '#0a1c24' : '#e2e8eb'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {j || t('rec_all_posts')}<span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, opacity: 0.75 }}>{n}</span>
              </button>
            );
          })}
        </RV>
      )}

      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(240px,1fr))', gap: 12, minWidth: 1240, alignItems: 'start' }}>
          {STAGES.map(([key, label, dot, bg], ci) => {
            const cards = pool.filter(p => stageOf(p, upcoming.get(p.id)) === key);
            return (
              <RV key={key} as="div" variant="up" delay={ci * 70}
                onDragOver={(e: DragEvent) => { e.preventDefault(); if (over !== key) setOver(key); }}
                onDragLeave={() => setOver(o => (o === key ? null : o))}
                onDrop={drop(key)}
                style={{ padding: 12, borderRadius: 20, background: bg, border: `1px solid ${over === key ? dot : '#e2e8eb'}`, minHeight: 420, transition: 'border-color .2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 12px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{t(label)}</span>
                  <span style={{ marginInlineStart: 'auto', fontFamily: "'Geist Mono',monospace", fontSize: 12, color: '#52646d', padding: '1px 8px', borderRadius: 99, background: 'rgba(255,255,255,.7)' }}>{cards.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {isLoading && ci === 0 && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>}
                  {cards.map(p => {
                    const sc = scoreOf(p);
                    const next = upcoming.get(p.id);
                    const src = sourceOf(p);
                    return (
                      <RV key={p.id} as="div" variant="up" draggable onDragStart={(e: DragEvent) => { try { e.dataTransfer.setData('text/plain', p.id); } catch { /* ignore */ } }}
                        onClick={() => navigate(p.status === 'candidate' ? `/app/candidats?c=${p.id}` : `/app/employees/${p.id}`)}
                        style={{ padding: 13, borderRadius: 15, background: '#ffffff', border: '1px solid #e2e8eb', cursor: 'grab', boxShadow: '0 2px 8px -5px rgba(10,28,36,.35)', transition: 'box-shadow .2s,transform .2s' }} className="rec-h3">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(p.full_name), color: '#ffffff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initialsOf(p.full_name)}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.full_name}</span>
                            <span style={{ display: 'block', fontSize: 12, color: '#5f7079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.position || '—'}</span>
                          </span>
                          {sc !== null && (
                            <span style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
                              <svg viewBox="0 0 38 38" style={{ display: 'block', width: 38, height: 38, transform: 'rotate(-90deg)' }}>
                                <circle cx="19" cy="19" r="15" style={{ fill: 'none', stroke: '#eef2f4', strokeWidth: 4 }} />
                                <circle cx="19" cy="19" r="15" style={{ fill: 'none', stroke: scoreColor(sc), strokeWidth: 4, strokeLinecap: 'round', strokeDasharray: `${(C * sc / 100).toFixed(1)}px ${C.toFixed(1)}px` }} />
                              </svg>
                              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700 }}>{sc}</span>
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 11, flexWrap: 'wrap' }}>
                          {src && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#f3f6f7', color: '#33474f' }}>{src}</span>}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7d8f97' }}><Clock size={11} />{ageLabel(key === 'hired' ? p.hire_date : stageSince(p))}</span>
                          {next && key !== 'hired' && (
                            <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#6d5ad6' }}><CalendarClock size={11} />{nextLabel(next.date, next.start_time)}</span>
                          )}
                        </div>
                      </RV>
                    );
                  })}
                  {!isLoading && cards.length === 0 && (
                    <div style={{ padding: '18px 10px', borderRadius: 14, border: '1px dashed rgba(10,28,36,.14)', textAlign: 'center', fontSize: 12.5, color: '#7d8f97' }}>{t('rec_drop_here')}</div>
                  )}
                </div>
              </RV>
            );
          })}
        </div>
      </div>

      <Drawer open={spontOpen} onClose={() => setSpontOpen(false)} title={t('rec_spontaneous')} subtitle={t('rec_spontaneous_sub')} icon={<Inbox size={17} />} width={1100}>
        <SpontaneousApplications />
      </Drawer>
    </div>
  );
}
