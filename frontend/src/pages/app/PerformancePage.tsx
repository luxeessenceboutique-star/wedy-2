import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { BellRing, Check, CircleCheck, ClipboardList, Star, type LucideIcon } from 'lucide-react';
import { api, createPerformanceReview, getApiError, listEmployees, listPerformanceReviews, updatePerformanceReview, type Employee, type PerformanceReview } from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { PerformanceView } from './PerformanceView';

type Stage = 'done' | 'planned' | 'self' | 'late' | 'none';
type Profile = { employee_id: string; performance_score: number; potential_score: number; employees?: { full_name: string } };
type OkrSummary = { total: number; completed: number; avg_progress: number };
type Row = { emp: Pick<Employee, 'id' | 'full_name' | 'position' | 'department' | 'manager'>; review: PerformanceReview | null; stage: Stage };

export type PerformanceVals = {
  loading: boolean; rtl: boolean;
  newCampaign: () => void;
  ringFrac: number; ringPct: string; periodPicker: ReactNode; headline: string; closing: string;
  selfN: number; plannedN: number; lateN: number;
  remindAll: () => void; remLabel: string; remIcon: LucideIcon;
  box: { name: string; count: number; bg: string; color: string; delay: string; ring: string; op: string; faces: { name: string; ini: string; av: string }[]; pick: () => void }[];
  hasCell: boolean; cellName: string; clearCell: () => void;
  goalsTitle: string;
  goals: { title: string; pct: string; bar: string; delay: string }[];
  themesText: string;
  themes: { label: string; n: number }[];
  tabs: { label: string; go: () => void; bg: string; color: string; border: string }[];
  listLabel: string;
  reviews: { id: string; name: string; role: string; manager: string; status: string; stBg: string; stColor: string; ini: string; av: string; delay: string; hasNote: boolean; noNote: boolean; note: string; action: string; canRemind: boolean; reminded: boolean; isDone: boolean; isPlanned: boolean; isSelf: boolean; remind: () => void; open: () => void }[];
  noReviews: boolean;
  drawer: ReactNode;
};

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const STAFF = new Set(['active', 'on-leave']);
const STAGE: Record<Stage, [TKey, string, string]> = {
  done: ['prf_st_done', '#e1f5ec', '#0f6f49'], planned: ['prf_st_planned', '#e4f2f4', '#0b5f72'], self: ['prf_st_self', '#ece9fb', '#5444b8'],
  late: ['prf_st_late', '#fbe9e6', '#a33a28'], none: ['prf_st_none', '#f3f6f7', '#52646d'],
};
const TABS: [Stage | 'all', TKey][] = [['all', 'prf_tab_all'], ['done', 'prf_tab_done'], ['planned', 'prf_tab_planned'], ['self', 'prf_st_self'], ['late', 'prf_st_late'], ['none', 'prf_st_none']];
// 9-box: [potential row, performance column, label, tint, text]
const BOX: [number, number, TKey, string, string][] = [
  [2, 0, 'prf_box_enigma', '#fbefda', '#8a5207'], [2, 1, 'prf_box_emerging', '#e4f2f4', '#0b5f72'], [2, 2, 'prf_box_star', '#d4f0e2', '#0f6f49'],
  [1, 0, 'prf_box_dilemma', '#fbe9e6', '#a33a28'], [1, 1, 'prf_box_pillar', '#eef2f4', '#33474f'], [1, 2, 'prf_box_high', '#e1f5ec', '#0f6f49'],
  [0, 0, 'prf_box_under', '#f8dcd6', '#a33a28'], [0, 1, 'prf_box_effective', '#f3f6f7', '#33474f'], [0, 2, 'prf_box_expert', '#e4f2f4', '#0b5f72'],
];
const level = (v: number) => (Math.round(v) >= 4 ? 2 : Math.round(v) <= 2 ? 0 : 1);
/** Themes spotted in the review write-ups (feedback + objectives), FR / EN / AR keywords. */
const THEMES: [TKey, RegExp][] = [
  ['prf_th_career', /carri[eè]re|[ée]volution|promotion|career|growth|مسار|ترقية/i],
  ['prf_th_management', /management|manag[eé]r|encadrement|leadership|إدارة|تسيير/i],
  ['prf_th_training', /formation|former|training|upskill|تكوين|تدريب/i],
  ['prf_th_workload', /charge de travail|surcharge|stress|workload|burn|ضغط/i],
  ['prf_th_remote', /t[ée]l[ée]travail|remote|à distance|عن بعد/i],
  ['prf_th_recognition', /reconnaissance|valoris|recognition|appreciat|تقدير/i],
  ['prf_th_pay', /salaire|r[ée]mun[ée]ration|augmentation|prime|salary|raise|bonus|أجر|راتب/i],
  ['prf_th_communication', /communication|feedback|écoute|communicat|تواصل/i],
];

/** End of a review period: "2026" / "2026-H2" / "2026-T4" / "2026-Q4". */
function periodEnd(p: string): Date | null {
  const m = /^(\d{4})(?:-(H|T|Q)(\d))?$/i.exec(p.trim());
  if (!m) return null;
  const y = +m[1];
  if (!m[2]) return new Date(y, 11, 31);
  const n = +m[3];
  return m[2].toUpperCase() === 'H' ? new Date(y, n === 1 ? 6 : 12, 0) : new Date(y, n * 3, 0);
}
const currentHalf = (d: Date) => `${d.getFullYear()}-H${d.getMonth() < 6 ? 1 : 2}`;

export default function PerformancePage() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [now] = useState(() => new Date());
  const [picked, setPicked] = useState<string | null>(null);
  const [cell, setCell] = useState<string | null>(null);
  const [tab, setTab] = useState<Stage | 'all'>('all');
  const [reminded, setReminded] = useState<Set<string>>(() => new Set());
  const [remAll, setRemAll] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);

  const revQ = useQuery({ queryKey: ['performance-reviews', 'all'], queryFn: () => listPerformanceReviews({ limit: '5000' }) });
  const empQ = useQuery({ queryKey: ['employees', 'staff-list'], queryFn: () => listEmployees({ limit: 1000 }) });
  const talQ = useQuery({ queryKey: ['talents'], queryFn: () => api.get<Profile[]>('/talents').then(r => r.data) });
  const okrQ = useQuery({ queryKey: ['talents', 'okr-summary'], queryFn: () => api.get<OkrSummary>('/talents/okrs/summary').then(r => r.data) });

  const all = useMemo(() => revQ.data?.data ?? [], [revQ.data]);
  const staff = useMemo(() => (empQ.data?.data ?? []).filter(e => STAFF.has(e.status ?? 'active')), [empQ.data]);
  const periods = useMemo(() => {
    const set = new Set(all.map(r => r.period).filter(Boolean));
    set.add(currentHalf(now));
    return [...set].sort().reverse();
  }, [all, now]);
  const latest = useMemo(() => [...all].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]?.period, [all]);
  const period = picked ?? latest ?? currentHalf(now);
  const end = periodEnd(period);
  const ended = !!end && end < now;

  // ── one row per active employee (+ anyone else reviewed in the period) ─────────
  const inPeriod = all.filter(r => r.period === period);
  const byEmp = new Map(inPeriod.map(r => [r.employee_id, r]));
  const stageOf = (r: PerformanceReview | null): Stage => {
    if (!r) return 'none';
    if (r.status === 'completed' || r.status === 'acknowledged') return 'done';
    if (r.status === 'late' || ended) return 'late';
    if (r.status === 'self') return 'self';
    return 'planned';
  };
  const rowsAll: Row[] = [
    ...staff.map(e => ({ emp: e, review: byEmp.get(e.id) ?? null, stage: stageOf(byEmp.get(e.id) ?? null) })),
    ...inPeriod.filter(r => !staff.some(e => e.id === r.employee_id)).map(r => ({
      emp: { id: r.employee_id, full_name: r.employees?.full_name ?? '—', position: r.employees?.position, department: r.employees?.department, manager: r.employees?.manager },
      review: r, stage: stageOf(r),
    })),
  ].sort((a, b) => a.emp.full_name.localeCompare(b.emp.full_name));
  const count = (s: Stage) => rowsAll.filter(r => r.stage === s).length;
  const done = count('done'), heads = staff.length;
  const frac = heads ? Math.min(1, done / heads) : 0;

  // ── 9-box from the talent profiles ─────────────────────────────────────────────
  const profiles = talQ.data ?? [];
  const keyOf = (p: Profile) => `${level(p.potential_score)}-${level(p.performance_score)}`;
  const cellBox = cell ? BOX.find(b => `${b[0]}-${b[1]}` === cell) : null;
  const inCell = new Set(cell ? profiles.filter(p => keyOf(p) === cell).map(p => p.employee_id) : []);
  const box = BOX.map(([r, c, key, bg, color], i) => {
    const k = `${r}-${c}`, on = cell === k, members = profiles.filter(p => keyOf(p) === k);
    return {
      name: t(key), count: members.length, bg, color, delay: String(i * 50), ring: on ? '0 0 0 2px #0a1c24' : 'none', op: cell && !on ? '.42' : '1',
      faces: members.slice(0, 3).map(p => { const n = p.employees?.full_name ?? '—'; return { name: n, ini: initialsOf(n), av: avatarGradient(n) }; }),
      pick: () => setCell(on ? null : k),
    };
  });

  // ── indicators ────────────────────────────────────────────────────────────────
  const okr = okrQ.data;
  const pctOf = (n: number, d: number) => (d ? Math.round(n / d * 100) : 0);
  const goals = ([
    ['prf_goal_okr_avg', okr?.avg_progress ?? 0, '#16a06b'],
    ['prf_goal_okr_done', pctOf(okr?.completed ?? 0, okr?.total ?? 0), 'linear-gradient(90deg,#5444b8,#9a8bf0)'],
    ['prf_goal_self', pctOf(count('self') + done, heads), 'linear-gradient(90deg,#0e6f84,#16b6c8)'],
    ['prf_goal_talent', pctOf(profiles.filter(p => staff.some(e => e.id === p.employee_id)).length, heads), 'linear-gradient(90deg,#0e6f84,#16b6c8)'],
  ] as [TKey, number, string][]).map(([key, pct, bar], i) => ({ title: key === 'prf_goal_okr_avg' || key === 'prf_goal_okr_done' ? tf(t(key), { n: okr?.total ?? 0 }) : t(key), pct: String(Math.min(100, pct)), bar, delay: String(i * 90) }));

  // ── what the write-ups talk about ─────────────────────────────────────────────
  const texts = inPeriod.map(r => ({ r, txt: `${r.feedback ?? ''} ${r.objectives ?? ''}`.trim() })).filter(x => x.txt);
  const themes = THEMES.map(([key, re]) => ({ key, hits: texts.filter(x => re.test(x.txt)) })).filter(x => x.hits.length).sort((a, b) => b.hits.length - a.hits.length);
  let themesText = t('prf_themes_none');
  if (themes.length) {
    const top = themes[0];
    const depts = new Map<string, number>();
    top.hits.forEach(h => { const d = h.r.employees?.department; if (d) depts.set(d, (depts.get(d) ?? 0) + 1); });
    const where = [...depts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d]) => d);
    themesText = tf(t('prf_themes_text'), { n: texts.length, theme: t(top.key), k: top.hits.length }) + (where.length ? ' ' + tf(t('prf_themes_where'), { depts: where.join(` ${t('prf_and')} `) }) : '');
  }

  // ── reminders ─────────────────────────────────────────────────────────────────
  const remind = useMutation({
    mutationFn: (id: string) => api.post(`/performance/${id}/remind`),
    onSuccess: (_, id) => setReminded(s => new Set(s).add(id)),
  });
  const remindOne = (row: Row) => {
    if (!row.review) return;
    remind.mutate(row.review.id, {
      onSuccess: () => notify.success(tf(t('prf_reminded'), { name: row.emp.full_name })),
      onError: e => notify.error(axios.isAxiosError(e) && e.response?.status === 409 ? t('prf_no_account') : getApiError(e, t('error'))),
    });
  };
  const remindAll = async () => {
    if (remAll) return;
    const late = rowsAll.filter(r => r.stage === 'late' && r.review && !reminded.has(r.review.id));
    if (!late.length) { notify.info(t('prf_nobody_late')); return; }
    let ok = 0;
    for (const r of late) { try { await remind.mutateAsync(r.review!.id); ok++; } catch { /* no account */ } }
    setRemAll(true);
    if (ok) notify.success(tf(t('prf_reminded_all'), { n: ok })); else notify.error(t('prf_no_account'));
  };

  // ── list ──────────────────────────────────────────────────────────────────────
  const list = rowsAll.filter(r => (!cell || inCell.has(r.emp.id)) && (tab === 'all' || r.stage === tab));
  const dateFmt = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' });
  const daysLeft = end ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : null;

  const v: PerformanceVals = {
    loading: revQ.isLoading || empQ.isLoading, rtl: lang === 'ar',
    newCampaign: () => setCampaignOpen(true),
    ringFrac: Math.max(0.001, frac), ringPct: `${Math.round(frac * 100)} %`,
    periodPicker: (
      <select value={period} onChange={e => { setPicked(e.target.value); setCell(null); }} aria-label={t('prf_period')}
        style={{ appearance: 'none', padding: 0, border: 'none', background: 'transparent', color: 'inherit', font: 'inherit', letterSpacing: 'inherit', cursor: 'pointer', outline: 'none' }}>
        {periods.map(p => <option key={p} value={p} style={{ color: '#0a1c24' }}>{tf(t('prf_campaign_of'), { period: p }).toUpperCase()}</option>)}
      </select>
    ),
    headline: heads ? tf(t('prf_headline'), { done, total: heads }) : t('prf_no_staff'),
    closing: end ? (daysLeft! > 0 ? tf(t('prf_closing'), { date: dateFmt.format(end), n: daysLeft! }) : tf(t('prf_closed'), { date: dateFmt.format(end) })) : '',
    selfN: count('self'), plannedN: count('planned'), lateN: count('late'),
    remindAll, remLabel: remAll ? t('prf_reminders_sent') : t('prf_remind_late'), remIcon: remAll ? CircleCheck : BellRing,
    box, hasCell: !!cellBox, cellName: cellBox ? t(cellBox[2]) : '', clearCell: () => setCell(null),
    goalsTitle: tf(t('prf_goals_title'), { year: period.slice(0, 4) }),
    goals,
    themesText, themes: themes.slice(0, 5).map(x => ({ label: t(x.key), n: x.hits.length })),
    tabs: TABS.filter(([k]) => k !== 'none' || count('none') > 0).map(([k, key]) => ({ label: t(key), go: () => setTab(k), bg: tab === k ? '#0a1c24' : '#ffffff', color: tab === k ? '#ffffff' : '#33474f', border: tab === k ? '#0a1c24' : '#e2e8eb' })),
    listLabel: cellBox ? tf(t('prf_in_cell'), { n: list.length, cell: t(cellBox[2]) }) : tf(t('prf_n_people'), { n: list.length }),
    reviews: list.map((row, i) => {
      const [key, stBg, stColor] = STAGE[row.stage];
      const rid = row.review?.id;
      const wasReminded = !!rid && (reminded.has(rid) || remAll);
      const score = row.review?.score ?? 0;
      return {
        id: row.emp.id, name: row.emp.full_name, role: [row.emp.position, row.emp.department].filter(Boolean).join(' · ') || '—', manager: row.emp.manager ?? '',
        status: t(key), stBg, stColor, ini: initialsOf(row.emp.full_name), av: avatarGradient(row.emp.full_name), delay: String(Math.min(i, 12) * 40),
        hasNote: score > 0, noNote: !(score > 0), note: String(score),
        action: row.stage === 'none' ? t('prf_plan') : t('prf_evaluate'),
        canRemind: row.stage === 'late' && !wasReminded, reminded: row.stage === 'late' && wasReminded,
        isDone: row.stage === 'done', isPlanned: row.stage === 'planned' || row.stage === 'none' || row.stage === 'late', isSelf: row.stage === 'self',
        remind: () => remindOne(row), open: () => setEditing(row),
      };
    }),
    noReviews: !revQ.isLoading && list.length === 0,
    drawer: <>
      <ReviewDrawer row={editing} period={period} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ['performance-reviews'] })} />
      <CampaignDrawer open={campaignOpen} onClose={() => setCampaignOpen(false)} heads={heads} suggestions={periods} now={now}
        onStarted={p => { setPicked(p); qc.invalidateQueries({ queryKey: ['performance-reviews'] }); }} />
    </>,
  };
  return <PerformanceView v={v} />;
}

// ── review editor ────────────────────────────────────────────────────────────────
const inputStyle: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };
const STATUS_OPTS: [string, TKey][] = [['planned', 'prf_st_planned'], ['self', 'prf_st_self'], ['late', 'prf_st_late'], ['completed', 'prf_st_done']];
const SCORE_KEYS: TKey[] = ['prf_score_1', 'prf_score_2', 'prf_score_3', 'prf_score_4', 'prf_score_5'];

function ReviewDrawer({ row, period, onClose, onSaved }: { row: Row | null; period: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const blank = { status: row?.review?.status === 'draft' ? 'planned' : row?.review?.status ?? 'planned', score: row?.review?.score ?? 0, feedback: row?.review?.feedback ?? '', objectives: row?.review?.objectives ?? '' };
  const [f, setF] = useState(blank);
  const [hover, setHover] = useState(0);
  const [key, setKey] = useState<string | null>(null);
  const k = row ? `${row.emp.id}|${row.review?.id ?? ''}` : null;
  if (k !== key) { setKey(k); setF(blank); }
  const mut = useMutation({
    mutationFn: async () => {
      const body = { status: f.status, score: f.score || undefined, feedback: f.feedback || undefined, objectives: f.objectives || undefined };
      if (row!.review) return updatePerformanceReview(row!.review.id, body);
      return createPerformanceReview({ employee_id: row!.emp.id, period, ...body });
    },
    onSuccess: () => { onSaved(); notify.success(t('prf_saved')); onClose(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const needScore = f.status === 'completed' && !f.score;
  return (
    <Drawer open={!!row} onClose={onClose} title={row ? row.emp.full_name : ''} subtitle={tf(t('prf_drawer_sub'), { period })} icon={<ClipboardList size={17} />} width={520}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={mut.isPending || needScore} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('save')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>{t('prf_status')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
            {STATUS_OPTS.map(([s, key]) => {
              const on = f.status === s || (s === 'completed' && f.status === 'acknowledged');
              const [, bg, color] = STAGE[s === 'completed' ? 'done' : (s as Stage)];
              return <button key={s} type="button" onClick={() => setF(x => ({ ...x, status: s }))} style={{ height: 36, borderRadius: 10, border: `1px solid ${on ? color : '#d6dfe3'}`, background: on ? bg : '#ffffff', color: on ? color : '#33474f', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{t(key)}</button>;
            })}
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t('prf_score')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map(i => {
              const lit = i <= (hover || f.score);
              return <button key={i} type="button" aria-label={t(SCORE_KEYS[i - 1])} onMouseEnter={() => setHover(i)} onClick={() => setF(x => ({ ...x, score: x.score === i ? 0 : i }))} style={{ padding: 2, border: 'none', background: 'none', cursor: 'pointer', color: lit ? '#df9326' : '#d6dfe3' }}><Star size={24} fill={lit ? '#df9326' : 'none'} /></button>;
            })}
            <span style={{ marginInlineStart: 8, fontSize: 13, color: '#52646d' }}>{(hover || f.score) ? t(SCORE_KEYS[(hover || f.score) - 1]) : '—'}</span>
          </div>
          {needScore && <div style={{ marginTop: 6, fontSize: 12.5, color: '#a33a28' }}>{t('prf_need_score')}</div>}
        </div>
        <div>
          <label style={labelStyle}>{t('prf_feedback')}</label>
          <textarea rows={4} value={f.feedback} onChange={e => setF(x => ({ ...x, feedback: e.target.value }))} placeholder={t('prf_feedback_ph')} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
        </div>
        <div>
          <label style={labelStyle}>{t('prf_objectives')}</label>
          <textarea rows={3} value={f.objectives} onChange={e => setF(x => ({ ...x, objectives: e.target.value }))} placeholder={t('prf_objectives_ph')} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
        </div>
      </div>
    </Drawer>
  );
}

// ── new campaign ─────────────────────────────────────────────────────────────────
function CampaignDrawer({ open, onClose, heads, suggestions, now, onStarted }: { open: boolean; onClose: () => void; heads: number; suggestions: string[]; now: Date; onStarted: (p: string) => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const y = now.getFullYear();
  const options = [...new Set([String(y), `${y}-H1`, `${y}-H2`, String(y + 1), `${y + 1}-H1`, ...suggestions])];
  const [period, setPeriod] = useState(currentHalf(now));
  const mut = useMutation({
    mutationFn: () => api.post<{ created: number; skipped: number; period: string }>('/performance/campaign', { period, status: 'planned' }).then(r => r.data),
    onSuccess: r => { onStarted(r.period); notify.success(tf(t('prf_campaign_started'), { n: r.created, period: r.period })); onClose(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  return (
    <Drawer open={open} onClose={onClose} title={t('prf_nouvelle_campagne')} subtitle={t('prf_campaign_sub')} icon={<ClipboardList size={17} />} width={460}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={mut.isPending || !period.trim()} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('prf_launch')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t('prf_period')}</label>
          <input list="prf-periods" value={period} onChange={e => setPeriod(e.target.value)} style={inputStyle} />
          <datalist id="prf-periods">{options.map(p => <option key={p} value={p} />)}</datalist>
          <div style={{ marginTop: 6, fontSize: 12, color: '#5f7079' }}>{t('prf_period_hint')}</div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 12, background: '#f3fafb', fontSize: 13.5, lineHeight: 1.55, color: '#33474f' }}>{tf(t('prf_campaign_what'), { n: heads })}</div>
      </div>
    </Drawer>
  );
}
