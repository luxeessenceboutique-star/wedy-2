import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { FileClock, KeyRound, ListChecks, ShieldCheck, Timer, UserCog, type LucideIcon } from 'lucide-react';
import { api, getApiError } from '@/services/api';
import { useAuth } from '@/lib/auth';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { patchAppSettings, useAppSettings, type AppSettings } from '@/lib/appSettings';
import { SecurityView } from './SecurityView';

type Sec = AppSettings['security'];
type UserRow = { id?: string; email: string; full_name?: string; role: string };

export type SecurityVals = {
  score: number; ring: string; level: string; levelText: string;
  recos: { icon: LucideIcon; t: string; pts: number; fix: () => void; delay: string }[]; allDone: boolean;
  authNode: ReactNode; tfaNote: string;
  timeout: number; timeoutOn: boolean; timeoutLabel: string; setTimeout: (e: ChangeEvent<HTMLInputElement>) => void; timeoutExtra: ReactNode;
  toggleIp: () => void; ipTrack: string; ipKnob: string; ipOp: string;
  ips: { ip: string; label: string; remove: () => void }[];
  ipIn: string; onIpIn: (e: ChangeEvent<HTMLInputElement>) => void; addIp: (e: FormEvent) => void; ipHint: ReactNode;
  ssoChip: string; ssoAction: ReactNode;
  privCount: ReactNode; privNote: ReactNode;
  sessions: { id: string; icon: LucideIcon; user: string; device: string; current: boolean; place: string; last: string; canRevoke: boolean; revoke: () => void }[];
  badges: { icon: LucideIcon; t: string; s: string }[];
};

const C = 2 * Math.PI * 58;
const CIDR = /^(\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?|[0-9a-f:]+(\/\d{1,3})?)$/i;

export default function SecurityPage() {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const { user } = useAuth();
  const sQ = useAppSettings();
  const ipQ = useQuery({ queryKey: ['whoami-ip'], queryFn: () => api.get<{ ip: string }>('/settings/whoami-ip').then(r => r.data.ip), staleTime: 300_000 });
  const usersQ = useQuery({ queryKey: ['users'], queryFn: () => api.get<{ data: UserRow[] }>('/users').then(r => r.data.data ?? []) });
  const [ipIn, setIpIn] = useState('');
  const [timeoutDraft, setTimeoutDraft] = useState<number | null>(null);

  const sec: Sec = sQ.data?.security ?? { session_timeout: 0, ip_allow: false, ips: [] };
  const myIp = ipQ.data ?? '';
  const save = useMutation({
    mutationFn: (patch: Partial<Sec>) => patchAppSettings({ security: { ...sec, ...patch } }),
    onSuccess: data => { qc.setQueryData(['app-settings'], data); setTimeoutDraft(null); notify.success(t('sec_saved')); },
    onError: e => {
      const d = axios.isAxiosError(e) ? String(e.response?.data?.detail ?? '') : '';
      if (d.startsWith('ip_not_in_list')) notify.error(tf(t('sec_lockout'), { ip: d.split(':').slice(1).join(':') || myIp }));
      else if (d.startsWith('invalid_ip')) notify.error(t('sec_invalid_ip'));
      else if (axios.isAxiosError(e) && e.response?.status === 503) notify.error(t('set_table_missing'));
      else notify.error(getApiError(e, t('error')));
    },
  });
  const demote = useMutation({
    mutationFn: (u: UserRow) => api.patch('/users/role-by-email', { email: u.email, full_name: u.full_name ?? '', role: 'employee' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); notify.success(t('sec_demoted')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  // ── privileged accounts ─────────────────────────────────────────────────────────
  const priv = (usersQ.data ?? []).filter(u => ['admin', 'hr', 'rh'].includes((u.role || '').toLowerCase()));
  const me = (user?.email ?? '').toLowerCase();

  // ── score: what is actually configured ─────────────────────────────────────────
  const to = timeoutDraft ?? sec.session_timeout;
  const ptsTimeout = !sec.session_timeout ? 0 : sec.session_timeout <= 30 ? 25 : sec.session_timeout <= 60 ? 15 : 8;
  const ptsIp = sec.ip_allow && sec.ips.length ? 25 : 0;
  const ptsPriv = priv.length && priv.length <= 3 ? 15 : priv.length <= 5 ? 8 : 0;
  const score = 35 + ptsTimeout + ptsIp + ptsPriv; // 35: role-based access + audit log, always on
  const recos: { icon: LucideIcon; t: string; pts: number; fix: () => void }[] = [];
  if (ptsTimeout < 25) recos.push({ icon: Timer, t: t('sec_r_timeout'), pts: 25 - ptsTimeout, fix: () => save.mutate({ session_timeout: 30 }) });
  if (!ptsIp) recos.push({
    icon: KeyRound, t: t('sec_r_ip'), pts: 25,
    fix: () => { if (!myIp) return; save.mutate({ ip_allow: true, ips: sec.ips.some(r => r.ip === myIp) ? sec.ips : [...sec.ips, { ip: myIp, label: t('sec_this_network') }] }); },
  });
  if (ptsPriv < 15 && priv.length > 3) recos.push({ icon: UserCog, t: tf(t('sec_r_priv'), { n: priv.length }), pts: 15 - ptsPriv, fix: () => document.getElementById('sec-priv')?.scrollIntoView({ behavior: 'smooth' }) });

  const timeoutText = (m: number) => (!m ? t('sec_off') : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`);
  const link = { padding: 0, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' } as const;

  const v: SecurityVals = {
    score, ring: `${(C * score / 100).toFixed(1)} ${C.toFixed(1)}`,
    level: t(score >= 90 ? 'sec_l_great' : score >= 70 ? 'sec_l_good' : 'sec_l_low'),
    levelText: recos.length ? tf(t(recos.length === 1 ? 'sec_recos_one' : 'sec_recos_n'), { n: recos.length }) : t('sec_recos_none'),
    recos: recos.slice(0, 3).map((r, i) => ({ ...r, delay: String(i * 80) })), allDone: recos.length === 0,
    authNode: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
        {(['sec_a_password', 'sec_a_2fa', 'sec_a_sso'] as TKey[]).map(k => <span key={k} style={{ fontSize: 12.5, fontWeight: 600, padding: '6px 10px', borderRadius: 10, background: '#f3f6f7', color: '#33474f' }}>{t(k)}</span>)}
      </div>
    ),
    tfaNote: t('sec_auth_note'),
    timeout: to || 240, timeoutOn: !!to, timeoutLabel: timeoutText(to),
    setTimeout: e => setTimeoutDraft(Number(e.target.value)),
    timeoutExtra: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
        {sec.session_timeout ? <button type="button" onClick={() => save.mutate({ session_timeout: 0 })} style={{ ...link, color: '#7d8f97' }}>{t('sec_disable')}</button> : <span style={{ fontSize: 12.5, color: '#7d8f97' }}>{t('sec_timeout_off_note')}</span>}
        {timeoutDraft !== null && timeoutDraft !== sec.session_timeout && <button type="button" className="btn btn-primary" style={{ height: 34 }} onClick={() => save.mutate({ session_timeout: timeoutDraft })}>{t('save')}</button>}
      </div>
    ),
    toggleIp: () => {
      if (sec.ip_allow) { save.mutate({ ip_allow: false }); return; }
      if (!sec.ips.length) { notify.error(t('sec_ip_empty')); return; }
      save.mutate({ ip_allow: true });
    },
    ipTrack: sec.ip_allow ? '#16a06b' : '#c3ced3', ipKnob: sec.ip_allow ? '19px' : '3px', ipOp: sec.ip_allow ? '1' : '.45',
    ips: sec.ips.map(r => ({ ip: r.ip, label: r.label || '—', remove: () => save.mutate({ ips: sec.ips.filter(x => x.ip !== r.ip) }) })),
    ipIn, onIpIn: e => setIpIn(e.target.value),
    addIp: e => {
      e.preventDefault();
      const val = ipIn.trim();
      if (!CIDR.test(val)) { notify.error(t('sec_invalid_ip')); return; }
      if (sec.ips.some(r => r.ip === val)) return;
      save.mutate({ ips: [...sec.ips, { ip: val, label: val === myIp ? t('sec_this_network') : t('sec_added_manually') }] }, { onSuccess: () => setIpIn('') });
    },
    ipHint: myIp ? (
      <div style={{ fontSize: 12, color: '#5f7079', margin: '8px 0' }}>
        {tf(t('sec_your_ip'), { ip: myIp })}{' '}
        {!sec.ips.some(r => r.ip === myIp) && <button type="button" onClick={() => save.mutate({ ips: [...sec.ips, { ip: myIp, label: t('sec_this_network') }] })} style={{ ...link, color: '#0e6f84' }}>{t('sec_add_mine')}</button>}
      </div>
    ) : null,
    ssoChip: 'Tybot', ssoAction: null,
    privCount: <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, color: '#5f7079' }}>{tf(t('sec_priv_count'), { n: priv.length })}</span>,
    privNote: usersQ.isLoading ? <div style={{ padding: '18px 20px', borderTop: '1px solid #eef2f4', fontSize: 13, color: '#5f7079' }}>{t('loading')}</div> : null,
    sessions: priv.map(u => {
      const mine = u.email.toLowerCase() === me;
      return {
        id: u.email, icon: (u.role || '').toLowerCase() === 'admin' ? ShieldCheck : UserCog, user: u.full_name || u.email,
        device: t((u.role || '').toLowerCase() === 'admin' ? 'sec_role_admin' : 'sec_role_hr'), current: mine, place: u.email, last: '',
        canRevoke: !mine, revoke: () => { if (window.confirm(tf(t('sec_demote_confirm'), { name: u.full_name || u.email }))) demote.mutate(u); },
      };
    }),
    badges: [
      { icon: ShieldCheck, t: t('sec_b_roles'), s: t('sec_b_roles_s') },
      { icon: FileClock, t: t('sec_b_audit'), s: t('sec_b_audit_s') },
      { icon: Timer, t: t('sec_b_timeout'), s: sec.session_timeout ? tf(t('sec_b_timeout_on'), { v: timeoutText(sec.session_timeout) }) : t('sec_b_timeout_off') },
      { icon: ListChecks, t: t('sec_b_consent'), s: t('sec_b_consent_s') },
    ],
  };
  return <SecurityView v={v} />;
}
