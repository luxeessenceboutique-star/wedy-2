import { useState, type MouseEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Bell, BookOpen, FileClock, Inbox, ShieldAlert, Sparkles, UserCheck, UserPlus, Wallet, type LucideIcon } from 'lucide-react';
import { api, getApiError, reviewLeave } from '@/services/api';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { NotificationsView } from './NotificationsView';

type Notif = { id: string; type: string; title: string; body: string; time: string; unread: boolean; link?: string | null };
type Pref = 'request' | 'contract' | 'recruit' | 'payroll' | 'security' | 'ai';
type Action = { label: string; isBtn: boolean; isLink: boolean; href: string; busy: boolean; run: (e: MouseEvent) => void };

export type NotificationsVals = {
  loading: boolean; rtl: boolean;
  subtitle: string; readAll: () => void; readAllOp: string;
  tabs: { label: string; n: number; on: boolean; color: string; badgeBg: string; go: () => void }[];
  groups: { label: string; items: { title: string; body: string; time: string; icon: LucideIcon; tint: string; color: string; unread: boolean; weight: string; bg: string; delay: string; read: () => void; hasActions: boolean; hasDone: boolean; done: string; actions: Action[] }[] }[];
  empty: boolean;
  prefs: { label: string; icon: LucideIcon; color: string; ch: { aria: string; track: string; knob: string; toggle: () => void }[] }[];
};

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
/** [icon, tint, ink, preference category] per notification type. */
const TYPE: Record<string, [LucideIcon, string, string, Pref | null]> = {
  leave_pending: [Inbox, '#e4f2f4', '#0e6f84', 'request'], document_request: [Inbox, '#e4f2f4', '#0e6f84', 'request'], employee_request: [UserCheck, '#e4f2f4', '#0e6f84', 'request'],
  contract_expiring: [FileClock, '#fbe9e6', '#df5740', 'contract'], cdd_risk: [FileClock, '#fbe9e6', '#df5740', 'contract'],
  new_employee: [UserPlus, '#e1f5ec', '#16a06b', 'recruit'], candidate: [UserPlus, '#e1f5ec', '#16a06b', 'recruit'],
  payroll: [Wallet, '#fbefda', '#b06b0c', 'payroll'], security: [ShieldAlert, '#fbe9e6', '#df5740', 'security'],
  document_generated: [Sparkles, '#ece9fb', '#6d5ad6', 'ai'], training: [BookOpen, '#ece9fb', '#6d5ad6', null],
  warning: [Bell, '#fbefda', '#b06b0c', null], success: [Bell, '#e1f5ec', '#16a06b', null], error: [ShieldAlert, '#fbe9e6', '#df5740', null],
};
const typeOf = (t: string) => TYPE[t] ?? [Bell, '#eef2f4', '#33474f', null];
const PREFS: [Pref, TKey, LucideIcon, string][] = [
  ['request', 'ntf_p_request', Inbox, '#0e6f84'], ['contract', 'ntf_p_contract', FileClock, '#df5740'], ['recruit', 'ntf_p_recruit', UserPlus, '#16a06b'],
  ['payroll', 'ntf_p_payroll', Wallet, '#b06b0c'], ['security', 'ntf_p_security', ShieldAlert, '#df5740'], ['ai', 'ntf_p_ai', Sparkles, '#6d5ad6'],
];
const NEEDS_ACTION = new Set(['leave_pending', 'document_request', 'employee_request']);

/** Where a notification leads, and the actions it offers (an approve button when the leave id is known). */
function actionsOf(n: Notif, t: (k: TKey) => string): { label: string; href?: string; approveLeave?: string }[] {
  const link = n.link?.startsWith('/') ? n.link : null;
  const leaveId = link?.includes('kind=leave') ? new URLSearchParams(link.split('?')[1] ?? '').get('id') : null;
  switch (n.type) {
    case 'leave_pending': return [...(leaveId ? [{ label: t('ntf_approve'), approveLeave: leaveId }] : []), { label: t('ntf_see_request'), href: link ?? '/app/requests?kind=leave' }];
    case 'document_request': return [{ label: t('ntf_generate'), href: '/app/generate' }, { label: t('ntf_see_request'), href: link ?? '/app/requests?kind=document' }];
    case 'employee_request': return [{ label: t('ntf_see_request'), href: link ?? '/app/requests' }];
    case 'contract_expiring': case 'cdd_risk': return [{ label: t('ntf_prepare_amendment'), href: '/app/generate' }, ...(link ? [{ label: t('ntf_open'), href: link }] : [])];
    case 'document_generated': return [{ label: t('ntf_see_history'), href: link ?? '/app/history' }];
    case 'new_employee': return [{ label: t('ntf_see_record'), href: link ?? '/app/employees' }];
    default: return link ? [{ label: t('ntf_open'), href: link }] : [];
  }
}

export default function NotificationsPage() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [tab, setTab] = useState<'all' | 'unread' | 'action' | 'security'>('all');
  const [done, setDone] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ data: Notif[]; unread_count: number }>('/notifications').then(r => r.data), refetchInterval: 60_000 });
  const prefsQ = useQuery({ queryKey: ['notification-prefs'], queryFn: () => api.get<{ prefs: Record<Pref, boolean> }>('/notifications/preferences').then(r => r.data.prefs) });
  const items = q.data?.data ?? [];
  const unread = items.filter(n => n.unread).length;

  const markRead = (n: Notif) => {
    if (!n.unread) return;
    qc.setQueryData<{ data: Notif[]; unread_count: number }>(['notifications'], old => (old ? { ...old, unread_count: Math.max(0, old.unread_count - 1), data: old.data.map(x => (x.id === n.id ? { ...x, unread: false } : x)) } : old));
    api.patch(`/notifications/${n.id}/read`).catch(() => {}).finally(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
  };
  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); notify.success(t('ntf_all_read')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const savePrefs = useMutation({
    mutationFn: (prefs: Record<Pref, boolean>) => api.put<{ prefs: Record<Pref, boolean> }>('/notifications/preferences', { prefs }).then(r => r.data.prefs),
    onMutate: prefs => { qc.setQueryData(['notification-prefs'], prefs); },
    onSuccess: prefs => { qc.setQueryData(['notification-prefs'], prefs); qc.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: e => { qc.invalidateQueries({ queryKey: ['notification-prefs'] }); notify.error(axios.isAxiosError(e) && e.response?.status === 503 ? t('set_table_missing') : getApiError(e, t('error'))); },
  });

  // ── grouping by day ───────────────────────────────────────────────────────────
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const dayOf = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 3;
    if (d >= today) return 0;
    if (d.getTime() >= today.getTime() - 86400000) return 1;
    if (d.getTime() >= today.getTime() - 6 * 86400000) return 2;
    return 3;
  };
  const timeOf = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const mins = Math.round((now.getTime() - d.getTime()) / 60000);
    if (mins < 60 && mins >= 0) return tf(t('ntf_min_ago'), { n: Math.max(1, mins) });
    if (dayOf(iso) === 0) return tf(t('ntf_h_ago'), { n: Math.round(mins / 60) });
    if (dayOf(iso) === 1) return tf(t('ntf_yesterday_at'), { time: d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) });
    return new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  };
  const needs = (n: Notif) => NEEDS_ACTION.has(n.type) && !done[n.id];
  const pass = (n: Notif) => tab === 'all' || (tab === 'unread' && n.unread) || (tab === 'action' && needs(n)) || (tab === 'security' && n.type === 'security');
  const DAY_KEYS: TKey[] = ['ntf_d_today', 'ntf_d_yesterday', 'ntf_d_week', 'ntf_d_older'];
  const groups = DAY_KEYS.map((key, d) => ({ key, items: items.filter(n => dayOf(n.time) === d && pass(n)) })).filter(g => g.items.length);

  const approve = async (n: Notif, leaveId: string) => {
    setBusy(n.id);
    try {
      await reviewLeave(leaveId, 'approved');
      markRead(n);
      setDone(d => ({ ...d, [n.id]: t('ntf_leave_approved') }));
      qc.invalidateQueries({ queryKey: ['leaves'] });
      notify.success(t('ntf_leave_approved'));
    } catch (e) { notify.error(getApiError(e, t('error'))); } finally { setBusy(null); }
  };

  const prefs = prefsQ.data;
  const v: NotificationsVals = {
    loading: q.isLoading, rtl: lang === 'ar',
    subtitle: unread ? tf(t(unread === 1 ? 'ntf_sub_one' : 'ntf_sub_n'), { n: unread }) : t('ntf_sub_none'),
    readAll: () => { if (unread) readAll.mutate(); }, readAllOp: unread ? '1' : '.5',
    tabs: ([['all', 'ntf_t_all', items.length], ['unread', 'ntf_t_unread', unread], ['action', 'ntf_t_action', items.filter(needs).length], ['security', 'ntf_t_security', items.filter(n => n.type === 'security').length]] as const)
      .map(([k, key, n]) => ({ label: t(key), n, on: tab === k, color: tab === k ? '#ffffff' : '#52646d', badgeBg: tab === k ? 'rgba(255,255,255,.18)' : '#eef2f4', go: () => setTab(k) })),
    groups: groups.map(g => ({
      label: t(g.key),
      items: g.items.map((n, i) => {
        const [icon, tint, color] = typeOf(n.type);
        const acts = actionsOf(n, t);
        return {
          title: n.title, body: n.body, time: timeOf(n.time), icon, tint, color, unread: n.unread, weight: n.unread ? '700' : '600', bg: n.unread ? '#f5fbfc' : '#ffffff', delay: String(Math.min(i, 10) * 50),
          read: () => markRead(n),
          hasActions: acts.length > 0 && !done[n.id], hasDone: !!done[n.id], done: done[n.id] ?? '',
          actions: acts.map(a => ({
            label: a.label, isBtn: !!a.approveLeave, isLink: !a.approveLeave, href: a.href ?? '#', busy: busy === n.id,
            run: (e: MouseEvent) => { e.stopPropagation(); if (a.approveLeave) approve(n, a.approveLeave); else markRead(n); },
          })),
        };
      }),
    })),
    empty: !q.isLoading && groups.length === 0,
    prefs: PREFS.map(([k, key, icon, color]) => {
      const on = prefs ? prefs[k] !== false : true;
      return { label: t(key), icon, color, ch: [{ aria: `${t(key)} · ${t('ntf_in_app')}`, track: on ? '#0e6f84' : '#c3ced3', knob: on ? '16px' : '2px', toggle: () => prefs && savePrefs.mutate({ ...prefs, [k]: !on }) }] };
    }),
  };
  return <NotificationsView v={v} />;
}
