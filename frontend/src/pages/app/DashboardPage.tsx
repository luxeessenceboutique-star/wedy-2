import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bot, ChartColumn, Clock, Inbox, Settings, Target, Upload, UserPlus, Users, Wallet, WandSparkles, type LucideIcon } from 'lucide-react';
import { decideRequest, getApiError, getDashboardKpis, listDocuments, listInbox } from '@/services/api';
import type { InboxItem } from '@/services/api';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { tf } from '@/lib/format';
import { copilotUrl } from '@/lib/copilotAsk';
import { DashboardView } from './DashboardView';

const PERIODS = [30, 90, 180, 365] as const;
const PERIOD_KEYS = ['dash_30_jours', 'dash_3_mois', 'dash_6_mois', 'dash_12_mois'] as const;
const DEPT_COLORS = ['#0e6f84', '#16b6c8', '#6d5ad6', '#16a06b', '#df9326', '#df5740'];
const CONTRACT_COLORS = ['#0e6f84', '#16b6c8', '#6d5ad6', '#df9326', '#df5740', '#16a06b'];
const LANG_STYLE: Record<string, { bg: string; fg: string }> = {
  fr: { bg: '#e4f2f4', fg: '#0e6f84' }, ar: { bg: '#ece9fb', fg: '#5444b8' }, en: { bg: '#e1f5ec', fg: '#0f6f49' },
};
const NEUTRAL = { bg: '#eef2f4', fg: '#33474f' };

type PaletteEntry = { group: 'actions' | 'navigation'; labelKey: 'dash_p_generate' | 'dash_p_add_employee' | 'dash_p_copilot' | 'dash_p_import' | 'dash_p_employees' | 'dash_p_requests' | 'dash_p_recruitment' | 'dash_p_leave' | 'dash_p_payroll' | 'dash_p_analytics' | 'dash_p_settings'; icon: LucideIcon; to: string };
const PALETTE: PaletteEntry[] = [
  { group: 'actions', labelKey: 'dash_p_generate', icon: WandSparkles, to: '/app/generate' },
  { group: 'actions', labelKey: 'dash_p_add_employee', icon: UserPlus, to: '/app/employees?add=1' },
  { group: 'actions', labelKey: 'dash_p_copilot', icon: Bot, to: '/app/copilot' },
  { group: 'actions', labelKey: 'dash_p_import', icon: Upload, to: '/app/employees' },
  { group: 'navigation', labelKey: 'dash_p_employees', icon: Users, to: '/app/employees' },
  { group: 'navigation', labelKey: 'dash_p_requests', icon: Inbox, to: '/app/requests' },
  { group: 'navigation', labelKey: 'dash_p_recruitment', icon: Target, to: '/app/recruitment' },
  { group: 'navigation', labelKey: 'dash_p_leave', icon: Clock, to: '/app/timeoff' },
  { group: 'navigation', labelKey: 'dash_p_payroll', icon: Wallet, to: '/app/payroll' },
  { group: 'navigation', labelKey: 'dash_p_analytics', icon: ChartColumn, to: '/app/analytics' },
  { group: 'navigation', labelKey: 'dash_p_settings', icon: Settings, to: '/app/settings' },
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const shortDate = (iso: string | null | undefined, lang: string) =>
  iso ? new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' }) : '';

function useDashboardModel() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pIdx, setPIdx] = useState(0);
  const days = PERIODS[pIdx];
  const [decided, setDecided] = useState<Record<string, 'approved' | 'refused'>>({});
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);

  const { data: kpi } = useQuery({ queryKey: ['dashboard-kpis', days], queryFn: () => getDashboardKpis(days), placeholderData: keepPreviousData });
  const { data: inbox } = useQuery({ queryKey: ['requests-inbox'], queryFn: listInbox, refetchInterval: 30000 });
  const { data: docData } = useQuery({ queryKey: ['documents', 'recent'], queryFn: () => listDocuments({ limit: 5 }) });

  const decideMut = useMutation({
    mutationFn: (v: { item: InboxItem; status: string }) => decideRequest(v.item.kind, v.item.id, v.status),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['requests-inbox'] });
      qc.invalidateQueries({ queryKey: ['requests-count'] });
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      toast.success(tf(t(v.status === 'rejected' ? 'dash_toast_refused' : 'dash_toast_approved'), { name: v.item.employee_name }));
    },
    onError: (e: unknown, v) => {
      setDecided(d => { const n = { ...d }; delete n[`${v.item.kind}-${v.item.id}`]; return n; });
      toast.error(getApiError(e, t('dash_err_decide')));
    },
  });

  // ⌘K / Ctrl+K opens the palette, Esc closes it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); setQuery(''); setSel(0); }
      else if (e.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const k = {
    total: kpi?.workforce.total ?? 0, active: kpi?.workforce.active ?? 0, inactive: kpi?.workforce.inactive ?? 0,
    interns: kpi?.workforce.interns ?? 0, internsInProgress: kpi?.workforce.interns_in_progress ?? 0,
    present: kpi?.today_status.present ?? 0, onLeave: kpi?.today_status.on_leave ?? 0, absent: kpi?.today_status.absent ?? 0,
    toProcess: kpi?.documents.to_process ?? 0, incomplete: kpi?.documents.incomplete ?? 0, toRenew: kpi?.documents.to_renew ?? 0,
    expiring: kpi?.expiring_contracts.count ?? 0, expired: kpi?.expiring_contracts.expired ?? 0,
  };
  const rate = kpi?.attendance_rate.rate ?? null;
  const accepted = kpi?.requests.accepted ?? 0, refused = kpi?.requests.refused ?? 0;
  const decidedTotal = Math.max(1, accepted + refused);
  const pending = kpi?.requests.pending ?? 0;

  // evolution of the headcount: bars for hires / departures, line for the headcount
  const evoRaw = (kpi?.evolution ?? []).slice(-6);
  const maxBar = Math.max(1, ...evoRaw.map(m => Math.max(m.hires, m.departures)));
  const sc = Math.min(12, 120 / maxBar);
  const hcMin = Math.min(...evoRaw.map(m => m.headcount)), hcMax = Math.max(...evoRaw.map(m => m.headcount));
  const evoPts = evoRaw.map((m, i) => ({ x: 50 + 100 * i, y: hcMax === hcMin ? 90 : 142 - ((m.headcount - hcMin) / (hcMax - hcMin)) * 112 }));
  const evoPath = evoPts.map((p, i) => (i === 0 ? `M${p.x} ${p.y.toFixed(0)}` : `C${evoPts[i - 1].x + 33} ${evoPts[i - 1].y.toFixed(0)} ${p.x - 33} ${p.y.toFixed(0)} ${p.x} ${p.y.toFixed(0)}`)).join(' ');
  const evo = evoRaw.map((m, i) => {
    const hh = m.hires * sc, hd = m.departures * sc;
    return { cx: 50 + 100 * i, label: m.label, xh: 50 + 100 * i - 19, yh: 180 - hh, hh, xd: 50 + 100 * i + 3, yd: 180 - hd, hd };
  });
  const evoFirst = evoRaw[0]?.headcount ?? 0, evoEnd = evoRaw[evoRaw.length - 1]?.headcount ?? 0;
  const evoPct = evoFirst > 0 ? Math.round(((evoEnd - evoFirst) / evoFirst) * 100) : 0;

  const depts = (kpi?.by_department ?? []).slice().sort((a, b) => b.value - a.value).slice(0, 6);
  const deptMax = Math.max(1, ...depts.map(d => d.value));
  const contractsRaw = (kpi?.by_contract ?? []).filter(c => c.value > 0);
  const contractTotal = contractsRaw.reduce((n, c) => n + c.value, 0);
  const slices = contractsRaw.map((c, i) => {
    const before = contractsRaw.slice(0, i).reduce((n, x) => n + x.value, 0);
    return { frac: contractTotal ? c.value / contractTotal : 0, rot: -90 + (contractTotal ? before / contractTotal : 0) * 360, color: CONTRACT_COLORS[i % CONTRACT_COLORS.length] };
  });

  const requests = (inbox?.data ?? []).filter(r => r.state === 'pending' || decided[`${r.kind}-${r.id}`]).slice(0, 6).map(item => {
    const key = `${item.kind}-${item.id}`, st = decided[key];
    const decide = (status: string, mark: 'approved' | 'refused') => { setDecided(d => ({ ...d, [key]: mark })); decideMut.mutate({ item, status }); };
    return {
      id: key, isLeave: item.kind === 'leave', isDoc: item.kind !== 'leave', type: item.title, name: item.employee_name, meta: item.details,
      date: shortDate(item.created_at, lang), isPending: !st, isApproved: st === 'approved', isRefused: st === 'refused',
      approve: () => decide(item.kind === 'document' ? 'completed' : 'approved', 'approved'),
      refuse: () => decide('rejected', 'refused'),
    };
  });

  const docs = (docData?.data ?? []).map(d => {
    const code = (d.language || 'fr').toLowerCase().slice(0, 2);
    const st = LANG_STYLE[code] ?? NEUTRAL;
    return { title: d.name || d.document_type, who: d.employees?.full_name ?? '—', lang: code.toUpperCase(), bg: st.bg, fg: st.fg, rtl: code === 'ar', date: shortDate(d.created_at, lang) };
  });

  // command palette
  const all = PALETTE.map(p => ({ ...p, label: t(p.labelKey), groupLabel: t(p.group === 'actions' ? 'dash_p_actions' : 'dash_p_navigation') }));
  const items = useMemo(() => {
    const qq = norm(query.trim());
    return qq ? all.filter(p => norm(p.label).includes(qq)) : all;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lang]);
  const hasQuery = query.trim().length > 0;
  const pick = (to: string) => { setPalette(false); navigate(to); };
  const askWedy = () => { setPalette(false); navigate(copilotUrl(query)); };
  const clampSel = Math.min(sel, items.length - (hasQuery ? 0 : 1));
  useEffect(() => {
    if (!palette) return;
    const onKey = (e: KeyboardEvent) => {
      const max = items.length + (hasQuery ? 1 : 0);
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (s + 1) % Math.max(1, max)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => (s - 1 + Math.max(1, max)) % Math.max(1, max)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (clampSel < items.length) pick(items[clampSel].to); else if (hasQuery) askWedy(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette, items, clampSel, hasQuery]);

  const fullName = user?.full_name || (typeof user?.profile?.full_name === 'string' ? user.profile.full_name : '') || user?.email?.split('@')[0] || '';
  const presenceFrac = rate === null ? 0 : Math.max(0, Math.min(1, rate / 100));
  const now = new Date();
  const v = {
    firstName: fullName.split(/\s+/)[0] || '', k,
    expLead: k.expiring > 0 ? tf(t('dash_n_contracts'), { n: k.expiring }) : '',
    expSentence: k.expiring > 0 ? tf(t('dash_expiring_with'), { name: kpi?.expiring_contracts.items[0]?.name ?? '' }) : t('dash_no_expiring'),
    expItems: (kpi?.expiring_contracts.items ?? []).slice(0, 3).map(x => ({ name: x.name, left: `${x.days_left} j` })),
    briefingMeta: tf(t('dash_updated_at'), { time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` }),
    presenceLabel: rate === null ? '—' : `${rate} %`, presenceFrac, presence: rate === null ? '—' : `${rate}%`,
    overDays: tf(t('dash_over_days'), { n: days }), periodLabel: t(PERIOD_KEYS[pIdx]),
    p0: pIdx === 0, p1: pIdx === 1, p2: pIdx === 2, p3: pIdx === 3,
    setP0: () => setPIdx(0), setP1: () => setPIdx(1), setP2: () => setPIdx(2), setP3: () => setPIdx(3),
    accepted, refused, acceptedPct: Math.round((accepted / decidedTotal) * 100), refusedPct: Math.round((refused / decidedTotal) * 100),
    lateLabel: kpi?.today_status.late_available ? String(kpi.today_status.late ?? 0) : '—',
    lateHint: t(kpi?.today_status.late_available ? 'dash_late_hint' : 'dash_pointage_non_active'),
    pendingCount: pending, hasPending: requests.some(r => r.isPending), noRequests: requests.length === 0,
    pendingSub: tf(t('dash_pending_sub'), { a: kpi?.requests.pending_leave ?? 0, b: kpi?.requests.pending_document ?? 0 }),
    evo, evoPath, evoLast: evoPts[evoPts.length - 1] ?? { x: 550, y: 90 }, evoDelta: `${evoPct >= 0 ? '+' : ''}${evoPct} %`,
    depts: depts.map((d, i) => ({ name: d.name, value: d.value, pct: Math.max(4, Math.round((d.value / deptMax) * 100)), color: DEPT_COLORS[i % DEPT_COLORS.length] })),
    contractTotal, slices,
    contracts: contractsRaw.map((c, i) => ({ name: c.name, value: c.value, color: CONTRACT_COLORS[i % CONTRACT_COLORS.length] })),
    requests, docs,
    goRequests: () => navigate('/app/requests'), draftToast: () => navigate('/app/employees?status=expiring'),
    addEmployee: () => navigate('/app/employees?add=1'), genToast: () => navigate('/app/generate'), openCopilotToast: () => navigate('/app/copilot'),
    showPalette: palette, openPalette: () => { setPalette(true); setQuery(''); setSel(0); }, closePalette: () => setPalette(false),
    stop: (e: MouseEvent) => e.stopPropagation(), query, hasQuery,
    onQuery: (e: ChangeEvent<HTMLInputElement>) => { setQuery(e.target.value); setSel(0); },
    paletteItems: items.map((p, i) => ({ group: p.groupLabel, label: p.label, icon: p.icon, isSel: i === clampSel, onHover: () => setSel(i), onPick: () => pick(p.to) })),
    aiLabel: tf(t('dash_ask_wedy_about'), { q: query.trim() }), aiSel: hasQuery && clampSel === items.length, hoverAi: () => setSel(items.length), pickAi: askWedy,
  };
  return { v };
}

export type DashboardVals = ReturnType<typeof useDashboardModel>['v'];

export default function DashboardPage() {
  const { v } = useDashboardModel();
  return <DashboardView v={v} />;
}
