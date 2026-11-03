import { useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Calendar, Check, Code, Copy, LayoutGrid, MessageSquare, RefreshCw, Webhook, type LucideIcon } from 'lucide-react';
import { api, getApiError } from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { IntegrationsView } from './IntegrationsView';

type Kind = 'json' | 'slack' | 'teams';
type Hook = { id: string; url: string; events: string[]; active: boolean; kind?: Kind | null; last_status?: number | null; last_sent_at?: string | null };
type Cat = 'all' | 'cal' | 'comm' | 'dev';
type AppId = 'ical' | 'slack' | 'teams';

export type IntegrationsVals = {
  nOn: number; nAll: number; nHooks: number;
  kLast: string; kLastColor: string; kIcal: string; icalOn: boolean;
  cats: { label: string; icon: LucideIcon; go: () => void; bg: string; color: string; border: string }[];
  apps: { id: string; name: string; desc: string; mono: string; color: string; on: boolean; busy: boolean; delay: string; catLabel: string; aria: string; track: string; knob: string; border: string; shadow: string; status: string; stColor: string; stDot: string; sync: string; toggle: () => void; extra: ReactNode }[];
  devCard: ReactNode;
  hooksNote: ReactNode;
  hooks: { id: string; url: string; evt: string; kind: string | null; last: string; color: string; dot: string; test: () => void; testing: boolean; remove: () => void }[];
  hookUrl: string; onHookUrl: (e: ChangeEvent<HTMLInputElement>) => void; hookEvt: string; onHookEvt: (e: ChangeEvent<HTMLSelectElement>) => void; addHook: (e: FormEvent) => void;
  drawer: ReactNode;
};

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const EVENTS = ['leave.approved', 'employee.created', 'document.generated', 'candidate.hired'];
const CATS: [Cat, TKey, LucideIcon][] = [['all', 'int_c_all', LayoutGrid], ['cal', 'int_c_cal', Calendar], ['comm', 'int_c_comm', MessageSquare], ['dev', 'int_c_dev', Code]];
const APPS: { id: AppId; key: TKey; desc: TKey; cat: Cat; mono: string; color: string }[] = [
  { id: 'ical', key: 'int_app_ical', desc: 'int_app_ical_desc', cat: 'cal', mono: 'iCal', color: '#4a69d8' },
  { id: 'slack', key: 'int_app_slack', desc: 'int_app_slack_desc', cat: 'comm', mono: 'SL', color: '#5444b8' },
  { id: 'teams', key: 'int_app_teams', desc: 'int_app_teams_desc', cat: 'comm', mono: 'MT', color: '#2f4bb0' },
];
const missing = (e: unknown) => axios.isAxiosError(e) && (e.response?.status === 503 || e.response?.status === 500);
const copyBtn: CSSProperties = { width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 8, background: '#eef3f5', color: '#33474f', cursor: 'pointer', flexShrink: 0 };

export default function IntegrationsPage() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [cat, setCat] = useState<Cat>('all');
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvt, setHookEvt] = useState(EVENTS[0]);
  const [testing, setTesting] = useState<string | null>(null);
  const [connect, setConnect] = useState<AppId | null>(null);
  const [now] = useState(() => Date.now());

  const hooksQ = useQuery({ queryKey: ['webhooks'], queryFn: () => api.get<{ data: Hook[] }>('/webhooks').then(r => r.data.data), retry: false });
  const icalQ = useQuery({ queryKey: ['ical'], queryFn: () => api.get<{ token: string | null }>('/integrations/ical').then(r => r.data.token), retry: false });
  const hooks = hooksQ.data ?? [];
  const token = icalQ.data ?? null;
  const feedUrl = token ? `${window.location.origin}/api/integrations/ical/${token}.ics` : '';
  const fail = (e: unknown) => notify.error(missing(e) ? t('int_table_missing') : getApiError(e, t('error')));

  const ical = useMutation({
    mutationFn: (on: boolean) => (on ? api.post<{ token: string }>('/integrations/ical') : api.delete<{ token: null }>('/integrations/ical')).then(r => r.data.token),
    onSuccess: tok => { qc.setQueryData(['ical'], tok); notify.success(t(tok ? 'int_ical_on' : 'int_ical_off')); },
    onError: fail,
  });
  const addHook = useMutation({
    mutationFn: (body: { url: string; events: string[]; kind: Kind }) => api.post<Hook>('/webhooks', body).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); setHookUrl(''); setConnect(null); notify.success(t('int_hook_added')); },
    onError: fail,
  });
  const delHooks = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => api.delete(`/webhooks/${id}`))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); notify.success(t('int_hook_removed')); },
    onError: fail,
  });
  const test = async (h: Hook) => {
    setTesting(h.id);
    try {
      const { data } = await api.post<{ status: number }>(`/webhooks/${h.id}/test`);
      if (data.status >= 200 && data.status < 300) notify.success(tf(t('int_test_ok'), { status: data.status }));
      else notify.error(data.status ? tf(t('int_test_http'), { status: data.status }) : t('int_test_unreachable'));
      qc.invalidateQueries({ queryKey: ['webhooks'] });
    } catch (e) { fail(e); } finally { setTesting(null); }
  };

  const ago = (iso?: string | null) => {
    if (!iso) return t('int_never');
    const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
    if (m < 60) return tf(t('int_min_ago'), { n: m });
    if (m < 1440) return tf(t('int_h_ago'), { n: Math.round(m / 60) });
    return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' }).format(new Date(iso));
  };
  const statusText = (h: Hook) => (h.last_sent_at ? `${h.last_status || '—'} · ${ago(h.last_sent_at)}` : t('int_never_sent'));
  const ok = (h: Hook) => !!h.last_status && h.last_status >= 200 && h.last_status < 300;
  const byKind = (k: Kind) => hooks.filter(h => (h.kind ?? 'json') === k);
  const isOn = (id: AppId) => (id === 'ical' ? !!token : byKind(id).length > 0);
  const latest = [...hooks].filter(h => h.last_sent_at).sort((a, b) => (b.last_sent_at ?? '').localeCompare(a.last_sent_at ?? ''))[0];

  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => notify.success(t('int_copied')), () => notify.error(t('error')));
  const icalExtra = token ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 10px', borderRadius: 10, background: '#f3f6f7', direction: 'ltr' }}>
        <code style={{ flex: 1, minWidth: 0, fontFamily: "'Geist Mono',monospace", fontSize: 11.5, color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{feedUrl}</code>
        <button type="button" aria-label={t('int_copier')} title={t('int_copier')} onClick={() => copy(feedUrl)} style={copyBtn}><Copy size={14} /></button>
      </div>
      <button type="button" onClick={() => { if (window.confirm(t('int_ical_regen_confirm'))) ical.mutate(true); }} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'none', color: '#b06b0c', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}><RefreshCw size={13} />{t('int_regenerer')}</button>
    </div>
  ) : null;

  const v: IntegrationsVals = {
    nOn: APPS.filter(a => isOn(a.id)).length, nAll: APPS.length, nHooks: hooks.filter(h => h.active).length,
    kLast: latest ? `${latest.last_status || '—'} · ${ago(latest.last_sent_at)}` : t('int_never'), kLastColor: latest ? (ok(latest) ? '#0f6f49' : '#a33a28') : '#7d8f97',
    kIcal: t(token ? 'int_k_ical_on' : 'int_k_ical_off'), icalOn: !!token,
    cats: CATS.map(([k, key, icon]) => ({ label: t(key), icon, go: () => setCat(k), bg: cat === k ? '#0a1c24' : '#ffffff', color: cat === k ? '#ffffff' : '#33474f', border: cat === k ? '#0a1c24' : '#e2e8eb' })),
    apps: APPS.filter(a => cat === 'all' || a.cat === cat).map((a, i) => {
      const on = isOn(a.id), busy = (a.id === 'ical' && ical.isPending) || (connect === a.id && addHook.isPending);
      const name = t(a.key), hs = a.id === 'ical' ? [] : byKind(a.id);
      return {
        id: a.id, name, desc: t(a.desc), mono: a.mono, color: a.color, on, busy, delay: String(i * 45), catLabel: t(CATS.find(c => c[0] === a.cat)![1]),
        aria: tf(t(on ? 'int_disconnect' : 'int_connect'), { name }),
        track: on ? '#16a06b' : busy ? '#9fd6df' : '#c3ced3', knob: on || busy ? '21px' : '3px', border: on ? 'rgba(22,160,107,.35)' : '#e2e8eb', shadow: on ? '0 14px 30px -24px rgba(22,160,107,.6)' : 'none',
        status: t(busy ? 'int_connecting' : on ? 'int_connected' : 'int_not_connected'), stColor: busy ? '#0b5f72' : on ? '#0f6f49' : '#7d8f97', stDot: busy ? '#16b6c8' : on ? '#16a06b' : '#c3ced3',
        sync: a.id === 'ical' ? (on ? t('int_ical_sync') : '—') : on ? statusText([...hs].sort((x, y) => (y.last_sent_at ?? '').localeCompare(x.last_sent_at ?? ''))[0]) : '—',
        toggle: () => {
          if (busy) return;
          if (a.id === 'ical') { if (!on || window.confirm(t('int_ical_off_confirm'))) ical.mutate(!on); return; }
          if (on) { if (window.confirm(tf(t('int_disconnect_confirm'), { name }))) delHooks.mutate(hs.map(h => h.id)); return; }
          setConnect(a.id);
        },
        extra: a.id === 'ical' ? icalExtra : null,
      };
    }),
    devCard: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', color: '#5fe3f0' }}><Webhook size={18} /></span>
          <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('int_dev_title')}</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: '#9fb4bb' }}>{t('int_dev_text')}</div>
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(0,0,0,.25)', fontFamily: "'Geist Mono',monospace", fontSize: 12, lineHeight: 1.7, color: '#9fb4bb', overflowX: 'auto', whiteSpace: 'pre', direction: 'ltr', textAlign: 'left' }}>
          {'POST https://votre-app.ma/webhooks/wedy\nX-Wedy-Event: leave.approved\n\n{ "event": "leave.approved",\n  "sent_at": "2026-11-03T09:41:07Z",\n  "data": { "employee": "…", "start": "…", "end": "…" } }'}
        </div>
      </>
    ),
    hooksNote: hooksQ.isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 18, borderTop: '1px solid #eef2f4' }}><Spinner /></div>
      : hooksQ.isError ? <div style={{ padding: '14px 20px', borderTop: '1px solid #eef2f4', fontSize: 13, color: '#8a5207', background: '#fbefda' }}>{t('int_table_missing')}</div>
      : hooks.length === 0 ? <div style={{ padding: '18px 20px', borderTop: '1px solid #eef2f4', fontSize: 13.5, color: '#5f7079' }}>{t('int_no_hooks')}</div> : null,
    hooks: hooks.map(h => ({
      id: h.id, url: h.url, evt: (h.events ?? []).join(', ') || '—', kind: h.kind && h.kind !== 'json' ? t(h.kind === 'slack' ? 'int_app_slack' : 'int_app_teams') : null,
      last: statusText(h), color: !h.last_sent_at ? '#7d8f97' : ok(h) ? '#0f6f49' : '#a33a28', dot: !h.last_sent_at ? '#c3ced3' : ok(h) ? '#16a06b' : '#df5740',
      test: () => test(h), testing: testing === h.id,
      remove: () => { if (window.confirm(t('int_hook_remove_confirm'))) delHooks.mutate([h.id]); },
    })),
    hookUrl, onHookUrl: e => setHookUrl(e.target.value), hookEvt, onHookEvt: e => setHookEvt(e.target.value),
    addHook: e => { e.preventDefault(); const u = hookUrl.trim(); if (!u.startsWith('https://')) { notify.error(t('int_https_only')); return; } addHook.mutate({ url: u, events: [hookEvt], kind: 'json' }); },
    drawer: <ConnectDrawer app={connect} onClose={() => setConnect(null)} pending={addHook.isPending} onSave={(url, events) => connect && connect !== 'ical' && addHook.mutate({ url, events, kind: connect })} />,
  };
  return <IntegrationsView v={v} />;
}

function ConnectDrawer({ app, onClose, pending, onSave }: { app: AppId | null; onClose: () => void; pending: boolean; onSave: (url: string, events: string[]) => void }) {
  const { t } = useLang();
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(EVENTS);
  const [key, setKey] = useState<AppId | null>(null);
  if (app !== key) { setKey(app); setUrl(''); setEvents(EVENTS); }
  const name = app === 'teams' ? t('int_app_teams') : t('int_app_slack');
  const valid = url.trim().startsWith('https://') && events.length > 0;
  return (
    <Drawer open={!!app} onClose={onClose} title={tf(t('int_connect'), { name })} subtitle={t(app === 'teams' ? 'int_teams_help' : 'int_slack_help')} icon={<MessageSquare size={17} />} width={480}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!valid || pending} onClick={() => onSave(url.trim(), events)}>{pending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('save')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>
          {t('int_incoming_url')}
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder={app === 'teams' ? 'https://….webhook.office.com/…' : 'https://hooks.slack.com/services/…'} dir="ltr"
            style={{ height: 42, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: "'Geist Mono',monospace", fontSize: 12.5, outline: 'none' }} />
        </label>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 8 }}>{t('int_events')}</div>
          {EVENTS.map(ev => (
            <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', fontSize: 13.5, color: '#33474f', cursor: 'pointer' }}>
              <input type="checkbox" checked={events.includes(ev)} onChange={e => setEvents(x => (e.target.checked ? [...x, ev] : x.filter(y => y !== ev)))} style={{ width: 16, height: 16, accentColor: '#0e6f84' }} />
              <code style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12 }}>{ev}</code>
            </label>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
