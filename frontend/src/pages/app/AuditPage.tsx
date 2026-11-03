import { useMemo, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheck, ChevronDown, ChevronUp, CircleCheck, CircleX, Download, FileText, Inbox, LogIn, Pencil, Settings, ShieldAlert, Sparkles, Trash2, Upload, UserCog, UserPlus, type LucideIcon,
} from 'lucide-react';
import { api } from '@/services/api';
import { useLang, type TKey } from '@/lib/lang';
import { tf } from '@/lib/format';
import { AuditView } from './AuditView';

type Entry = { id: string; created_at: string; action: string; entity: string | null; entity_id: string | null; user_id: string | null; user_name: string | null; target: string | null; deleted: boolean };
type Sev = 'info' | 'warn' | 'crit';
type Module = 'emp' | 'docs' | 'leave' | 'pay' | 'sec' | 'settings' | 'other';

export type AuditVals = {
  loading: boolean;
  live: boolean; paused: boolean; liveLabel: string; liveBg: string; liveBorder: string; liveColor: string; toggleLive: () => void;
  exportCsv: () => void;
  kEvents: string; kUsers: number; kDeletes: number; kDocs: number;
  alerts: { title: string; text: string; icon: LucideIcon; bg: string; border: string; color: string; cta: string; doneLabel: string; delay: string; open: boolean; closed: boolean; act: () => void; dismiss: () => void }[];
  q: string; onQ: (e: ChangeEvent<HTMLInputElement>) => void;
  mods: { label: string; go: () => void; bg: string; color: string; border: string }[];
  sevs: { label: string; dot: string; go: () => void; bg: string; color: string; border: string }[];
  countLabel: string;
  events: { id: string; time: string; user: string; verb: string; target: string; module: string; ref: string; dot: string; icon: LucideIcon; iconBg: string; iconColor: string; bg: string; chev: LucideIcon; open: boolean; toggle: () => void; what: string; entityLabel: string; stamp: string; eid: string; author: string }[];
  empty: boolean;
};

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const SEV_DOT: Record<Sev, string> = { info: '#16b6c8', warn: '#df9326', crit: '#df5740' };
const MODULE_OF: Record<string, Module> = {
  employee: 'emp', intern: 'emp', employee_onboarding: 'emp', employee_file: 'emp', cv: 'emp', performance_review: 'emp', performance_campaign: 'emp',
  generated_documents: 'docs', document: 'docs', document_request: 'docs', template: 'docs',
  leave_request: 'leave', holiday: 'leave', planning_note: 'leave',
  payroll_record: 'pay', payroll_records: 'pay',
  profile: 'sec', user: 'sec',
  settings: 'settings', contract_type: 'settings',
};
const MOD_KEYS: [Module | 'all', TKey][] = [['all', 'aud_m_all'], ['emp', 'aud_m_emp'], ['docs', 'aud_m_docs'], ['leave', 'aud_m_leave'], ['pay', 'aud_m_pay'], ['sec', 'aud_m_sec'], ['settings', 'aud_m_settings'], ['other', 'aud_m_other']];
const SEV_KEYS: [Sev | 'all', TKey][] = [['all', 'aud_s_all'], ['info', 'aud_s_info'], ['warn', 'aud_s_warn'], ['crit', 'aud_s_crit']];
/** [verb key, icon, tint, ink] per action family. */
const KIND: Record<string, [TKey, LucideIcon, string, string]> = {
  CREATE: ['aud_a_create', UserPlus, '#e1f5ec', '#0f6f49'], UPDATE: ['aud_a_update', Pencil, '#e4f2f4', '#0b5f72'], DELETE: ['aud_a_delete', Trash2, '#fbe9e6', '#a33a28'],
  APPROVED: ['aud_a_approve', CircleCheck, '#e1f5ec', '#0f6f49'], REJECTED: ['aud_a_reject', CircleX, '#fbe9e6', '#a33a28'],
  REMIND: ['aud_a_remind', Inbox, '#fbefda', '#8a5207'], SEND: ['aud_a_send', Inbox, '#e4f2f4', '#0b5f72'],
  GENERATE_DOCUMENT: ['aud_a_generate', Sparkles, '#ece9fb', '#5444b8'], BULK_GENERATE: ['aud_a_bulk', Sparkles, '#ece9fb', '#5444b8'],
  UPLOAD: ['aud_a_upload', Upload, '#eef2f4', '#33474f'], IMPORT: ['aud_a_import', Download, '#fbefda', '#8a5207'],
  CONVERT_TO_EMPLOYEE: ['aud_a_convert', UserCog, '#e1f5ec', '#0f6f49'], ANALYZE: ['aud_a_analyze', Sparkles, '#ece9fb', '#5444b8'],
  LOGIN: ['aud_a_login', LogIn, '#eef2f4', '#33474f'], REQUEST: ['aud_a_request', Inbox, '#e4f2f4', '#0b5f72'],
};
const kindOf = (action: string) => {
  const a = action.toUpperCase();
  if (KIND[a]) return KIND[a];
  if (a.startsWith('UPLOAD')) return KIND.UPLOAD;
  if (a.includes('ANALY')) return KIND.ANALYZE;
  if (a.endsWith('_REQUEST') || a.startsWith('CREATE_REQUEST')) return KIND.REQUEST;
  if (a.includes('APPROVED')) return KIND.APPROVED;
  if (a.includes('REJECTED')) return KIND.REJECTED;
  return null;
};
const NOUN: Record<string, TKey> = {
  employee: 'aud_n_employee', intern: 'aud_n_intern', employee_onboarding: 'aud_n_onboarding', employee_file: 'aud_n_file', cv: 'aud_n_cv',
  leave_request: 'aud_n_leave', performance_review: 'aud_n_review', performance_campaign: 'aud_n_campaign', payroll_record: 'aud_n_payslip', payroll_records: 'aud_n_payslips',
  generated_documents: 'aud_n_document', document: 'aud_n_document', document_request: 'aud_n_doc_request', meeting: 'aud_n_meeting', meeting_report: 'aud_n_minutes',
  holiday: 'aud_n_holiday', planning_note: 'aud_n_note', settings: 'aud_n_settings', profile: 'aud_n_account', hr_request: 'aud_n_request',
};
const sevOf = (e: Entry): Sev => {
  const a = e.action.toUpperCase();
  if (a === 'DELETE' && (e.entity === 'employee' || e.entity === 'profile')) return 'crit';
  if (a === 'DELETE' || e.entity === 'profile' || e.entity === 'settings' || (e.entity?.startsWith('payroll') && a !== 'CREATE') || a === 'IMPORT') return 'warn';
  return 'info';
};

export default function AuditPage() {
  const { t, lang } = useLang();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [live, setLive] = useState(true);
  const [q, setQ] = useState('');
  const [mod, setMod] = useState<Module | 'all'>('all');
  const [sev, setSev] = useState<Sev | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<Record<string, 'done' | 'hidden'>>({});
  const [seen, setSeen] = useState<Set<string> | null>(null);

  const feedQ = useQuery({
    queryKey: ['audit-feed'],
    queryFn: () => api.get<{ data: Entry[]; total: number }>('/audit-logs/feed', { params: { days: 30, limit: 1000 } }).then(r => r.data),
    refetchInterval: live ? 15_000 : false,
  });
  const entries = useMemo(() => feedQ.data?.data ?? [], [feedQ.data]);
  // Entries that arrived since the page was opened get the reference's "fresh" highlight.
  if (seen === null && feedQ.data) setSeen(new Set(entries.map(e => e.id)));

  const [{ now, dayStart }] = useState(() => { const d = new Date(); const start = new Date(d); start.setHours(0, 0, 0, 0); return { now: d.getTime(), dayStart: start }; });
  const timeFmt = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const shortFmt = new Intl.DateTimeFormat(loc, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const fullFmt = new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'medium' });
  const whenOf = (iso: string) => {
    const d = new Date(iso);
    if (d >= dayStart) return timeFmt.format(d);
    if (d.getTime() >= dayStart.getTime() - 86400000) return `${t('aud_yesterday')} ${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`;
    return shortFmt.format(d);
  };
  const userOf = (e: Entry) => e.user_name || (e.user_id ? `#${e.user_id.slice(0, 8)}` : t('aud_system'));
  const moduleOf = (e: Entry): Module => MODULE_OF[e.entity ?? ''] ?? 'other';
  const sentence = (e: Entry) => {
    const k = kindOf(e.action);
    const verb = k ? t(k[0]) : e.action.toLowerCase().replace(/_/g, ' ');
    const noun = NOUN[e.entity ?? ''] ? t(NOUN[e.entity ?? '']) : (e.entity ?? '').replace(/_/g, ' ');
    return { verb: `${verb} ${noun}`.trim(), target: e.target ?? (e.deleted ? t('aud_deleted_target') : '') };
  };

  // ── KPIs and alerts (last 30 days / last 24 hours) ─────────────────────────────
  const users = new Set(entries.map(e => e.user_id).filter(Boolean)).size;
  const deletes = entries.filter(e => e.action.toUpperCase() === 'DELETE');
  const docs = entries.filter(e => /GENERATE/.test(e.action.toUpperCase())).length;
  const day = entries.filter(e => now - new Date(e.created_at).getTime() < 86400000);
  const delBy = new Map<string, Entry[]>();
  day.filter(e => e.action.toUpperCase() === 'DELETE').forEach(e => { const k = e.user_id ?? '?'; delBy.set(k, [...(delBy.get(k) ?? []), e]); });
  const accounts = entries.filter(e => e.entity === 'profile' && now - new Date(e.created_at).getTime() < 7 * 86400000);
  const rawAlerts: { id: string; title: string; text: string; icon: LucideIcon; tone: 'crit' | 'warn'; cta: string; doneLabel: string; filter: () => void }[] = [];
  [...delBy.entries()].filter(([, list]) => list.length >= 5).forEach(([uid, list]) => rawAlerts.push({
    id: `del-${uid}`, icon: ShieldAlert, tone: 'crit', title: tf(t('aud_al_del_title'), { n: list.length, user: userOf(list[0]) }),
    text: tf(t('aud_al_del_text'), { time: whenOf(list[list.length - 1].created_at) }), cta: t('aud_al_review'), doneLabel: t('aud_al_checked'),
    filter: () => { setQ(userOf(list[0])); setMod('all'); setSev('all'); },
  }));
  if (accounts.length) rawAlerts.push({
    id: 'accounts', icon: UserCog, tone: 'warn', title: tf(t(accounts.length === 1 ? 'aud_al_acc_title_one' : 'aud_al_acc_title'), { n: accounts.length }),
    text: tf(t('aud_al_acc_text'), { users: [...new Set(accounts.map(userOf))].slice(0, 3).join(', ') }), cta: t('aud_al_review'), doneLabel: t('aud_al_checked'),
    filter: () => { setMod('sec'); setSev('all'); setQ(''); },
  });
  const alerts = rawAlerts.filter(a => alertState[a.id] !== 'hidden').map((a, i) => ({
    title: a.title, text: a.text, icon: a.icon, cta: a.cta, doneLabel: a.doneLabel, delay: String(i * 80),
    bg: a.tone === 'crit' ? '#fbe9e6' : '#fbefda', border: a.tone === 'crit' ? 'rgba(223,87,64,.3)' : 'rgba(230,169,72,.4)', color: a.tone === 'crit' ? '#a33a28' : '#8a5207',
    open: !alertState[a.id], closed: alertState[a.id] === 'done',
    act: () => { a.filter(); setAlertState(s => ({ ...s, [a.id]: 'done' })); },
    dismiss: () => setAlertState(s => ({ ...s, [a.id]: 'hidden' })),
  }));

  // ── list ──────────────────────────────────────────────────────────────────────
  const needle = q.trim().toLowerCase();
  const list = entries.filter(e => {
    if (mod !== 'all' && moduleOf(e) !== mod) return false;
    if (sev !== 'all' && sevOf(e) !== sev) return false;
    if (!needle) return true;
    const s = sentence(e);
    return `${userOf(e)} ${s.verb} ${s.target} ${e.entity ?? ''} ${e.entity_id ?? ''}`.toLowerCase().includes(needle);
  });
  const shown = list.slice(0, 200);
  const modLabel = (m: Module) => t(MOD_KEYS.find(([k]) => k === m)![1]);

  const exportCsv = () => {
    const esc = (x: string) => `"${x.replace(/"/g, '""')}"`;
    const rows = [['date', 'user', 'action', 'entity', 'target', 'entity_id', 'module', 'severity'], ...list.map(e => [e.created_at, userOf(e), e.action, e.entity ?? '', e.target ?? '', e.entity_id ?? '', modLabel(moduleOf(e)), sevOf(e)])];
    const url = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(c => esc(String(c))).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const v: AuditVals = {
    loading: feedQ.isLoading,
    live, paused: !live, liveLabel: t(live ? 'aud_live' : 'aud_paused'), liveBg: live ? '#e1f5ec' : '#ffffff', liveBorder: live ? 'rgba(22,160,107,.3)' : '#d6dfe3', liveColor: live ? '#0f6f49' : '#33474f',
    toggleLive: () => setLive(x => !x),
    exportCsv,
    kEvents: entries.length.toLocaleString(loc), kUsers: users, kDeletes: deletes.length, kDocs: docs,
    alerts,
    q, onQ: e => setQ(e.target.value),
    mods: MOD_KEYS.filter(([k]) => k !== 'other' || entries.some(e => moduleOf(e) === 'other')).map(([k, key]) => ({ label: t(key), go: () => setMod(k), bg: mod === k ? '#0a1c24' : '#ffffff', color: mod === k ? '#ffffff' : '#33474f', border: mod === k ? '#0a1c24' : '#e2e8eb' })),
    sevs: SEV_KEYS.map(([k, key]) => ({ label: t(key), dot: k === 'all' ? '#a3b1b7' : SEV_DOT[k], go: () => setSev(k), bg: sev === k ? '#0a1c24' : '#ffffff', color: sev === k ? '#ffffff' : '#33474f', border: sev === k ? '#0a1c24' : '#e2e8eb' })),
    countLabel: list.length > shown.length ? tf(t('aud_count_more'), { n: shown.length, total: list.length }) : tf(t('aud_count'), { n: list.length }),
    events: shown.map(e => {
      const k = kindOf(e.action), s = sentence(e), isOpen = open === e.id, fresh = !!seen && !seen.has(e.id);
      return {
        id: e.id, time: whenOf(e.created_at), user: userOf(e), verb: s.verb, target: s.target, module: modLabel(moduleOf(e)),
        ref: e.entity_id ? `#${String(e.entity_id).slice(0, 8)}` : '—', dot: SEV_DOT[sevOf(e)],
        icon: k?.[1] ?? (e.entity === 'settings' ? Settings : e.entity === 'holiday' ? CalendarCheck : FileText), iconBg: k?.[2] ?? '#eef2f4', iconColor: k?.[3] ?? '#33474f',
        bg: fresh ? '#f3fafb' : isOpen ? '#fbfcfc' : '#ffffff', chev: isOpen ? ChevronUp : ChevronDown, open: isOpen, toggle: () => setOpen(isOpen ? null : e.id),
        what: `${userOf(e)} ${s.verb}${s.target ? ` ${s.target}` : ''}.`, entityLabel: (e.entity ?? '—').replace(/_/g, ' '), stamp: fullFmt.format(new Date(e.created_at)),
        eid: e.entity_id ?? '—', author: e.user_id ?? '—',
      };
    }),
    empty: !feedQ.isLoading && list.length === 0,
  };
  return <AuditView v={v} />;
}
