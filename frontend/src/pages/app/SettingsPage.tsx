import { useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { BookOpen, Building2, Calendar, CreditCard, FileText, Mail, Plus, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { api, getApiError, listDocuments, listEmployees, listHolidays, listTemplates } from '@/services/api';
import { Spinner } from '@/components/ui';
import { useLang, type Lang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { FIXED_HOLIDAYS, LUNAR_HOLIDAYS, estimateLunar } from '@/lib/holidays';
import { companyInitials, deleteAsset, patchAppSettings, uploadAsset, useAppSettings, type AppSettings, type Assets } from '@/lib/appSettings';
import { SettingsView } from './SettingsView';

type Section = 'company' | 'prefs' | 'leave' | 'docs';
type Draft = Pick<AppSettings, Section>;
type Tab = 'company' | 'prefs' | 'leave' | 'docs' | 'refs' | 'billing';

export type SettingsVals = {
  rtl: boolean;
  tabs: { label: string; icon: LucideIcon; bg: string; color: string; go: () => void }[];
  tCompany: boolean; tPrefs: boolean; tLeave: boolean; tDocs: boolean; tBilling: boolean; tRefs: boolean;
  c: AppSettings['company'];
  logoTile: ReactNode; logoRemove: ReactNode; changeLogo: () => void;
  companyFields: { label: string; value: string; font: string; set: (e: ChangeEvent<HTMLInputElement>) => void }[];
  p: AppSettings['prefs']; setTz: (e: ChangeEvent<HTMLSelectElement>) => void; setDate: (e: ChangeEvent<HTMLSelectElement>) => void; setCur: (e: ChangeEvent<HTMLSelectElement>) => void;
  langs: { label: string; font: string; go: () => void; bg: string; color: string; border: string }[];
  days: { t: string; bg: string; color: string; border: string; toggle: () => void }[];
  weekNote: string;
  l: { monthly: string; bonus: string; cap: string; flow: string };
  setMonthly: (e: ChangeEvent<HTMLInputElement>) => void; setBonus: (e: ChangeEvent<HTMLInputElement>) => void; setCap: (e: ChangeEvent<HTMLInputElement>) => void; setFlow: (e: ChangeEvent<HTMLSelectElement>) => void;
  holTitle: string; holCount: string;
  hols: { d: string; name: string; op: string; bg: string; dateColor: string; track: string; knob: string; toggle: () => void }[];
  holAdd: ReactNode;
  d: AppSettings['docs']; setDocLang: (e: ChangeEvent<HTMLSelectElement>) => void;
  upSign: () => void; upStamp: () => void; signNode: ReactNode; stampNode: ReactNode; signLabel: string; stampLabel: string;
  planEyebrow: string; planName: string; planSub: string;
  usage: { label: string; value: string; pct: string | null }[];
  contact: () => void;
  invoicesNode: ReactNode;
  dirty: boolean; cancel: () => void; save: () => void;
  extra: ReactNode;
};

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const CF: [keyof AppSettings['company'], TKey][] = [['name', 'set_f_name'], ['sector', 'set_f_sector'], ['ice', 'set_f_ice'], ['rc', 'set_f_rc'], ['if', 'set_f_if'], ['cnss', 'set_f_cnss'], ['address', 'set_f_address'], ['city', 'set_f_city'], ['phone', 'set_f_phone'], ['email', 'set_f_email']];
const MONO = ['ice', 'rc', 'if', 'cnss', 'phone'];
const TABS: [Tab, TKey, LucideIcon][] = [['company', 'set_tab_company', Building2], ['prefs', 'set_tab_prefs', SlidersHorizontal], ['leave', 'set_tab_leave', Calendar], ['docs', 'set_tab_docs', FileText], ['refs', 'set_tab_refs', BookOpen], ['billing', 'set_tab_billing', CreditCard]];
const DAY_KEYS: TKey[] = ['set_d_mon', 'set_d_tue', 'set_d_wed', 'set_d_thu', 'set_d_fri', 'set_d_sat', 'set_d_sun'];
const dm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const tableMissing = (e: unknown) => axios.isAxiosError(e) && e.response?.status === 503;
type StoredHoliday = { id: string; name: string; date: string; is_recurring?: boolean | null };

export default function SettingsPage() {
  const { t, lang, setLang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const [tab, setTab] = useState<Tab>('company');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newHol, setNewHol] = useState({ name: '', date: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [assetKind, setAssetKind] = useState<keyof Assets>('logo');

  const sQ = useAppSettings();
  const holQ = useQuery({ queryKey: ['holidays'], queryFn: listHolidays, staleTime: 3600_000 });
  const empQ = useQuery({ queryKey: ['employees', 'staff-list'], queryFn: () => listEmployees({ limit: 1000 }) });
  const docQ = useQuery({ queryKey: ['documents'], queryFn: () => listDocuments({ limit: 1000 }) });
  const tplQ = useQuery({ queryKey: ['templates'], queryFn: () => listTemplates({ active_only: false }) });

  const server = sQ.data;
  const cur: Draft | null = draft ?? (server ? { company: server.company, prefs: server.prefs, leave: server.leave, docs: server.docs } : null);
  const dirty = !!draft && !!server && JSON.stringify(draft) !== JSON.stringify({ company: server.company, prefs: server.prefs, leave: server.leave, docs: server.docs });
  const set = <S extends Section>(sec: S, patch: Partial<Draft[S]>) => cur && setDraft({ ...cur, [sec]: { ...cur[sec], ...patch } });
  const assets = server?.assets ?? { logo: null, signature: null, stamp: null };

  const save = useMutation({
    mutationFn: () => patchAppSettings(draft!),
    onSuccess: data => {
      qc.setQueryData(['app-settings'], data);
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      setDraft(null);
      if (data.prefs.lang !== lang) setLang(data.prefs.lang as Lang);
      notify.success(t('set_saved'));
    },
    onError: e => notify.error(tableMissing(e) ? t('set_table_missing') : getApiError(e, t('error'))),
  });
  const asset = useMutation({
    mutationFn: ({ kind, file }: { kind: keyof Assets; file: File | null }) => (file ? uploadAsset(kind, file) : deleteAsset(kind)),
    onSuccess: a => { qc.setQueryData<AppSettings>(['app-settings'], s => (s ? { ...s, assets: a } : s)); notify.success(t('set_asset_saved')); },
    onError: e => notify.error(tableMissing(e) ? t('set_table_missing') : getApiError(e, t('error'))),
  });
  const holAdd = useMutation({
    mutationFn: (rows: { name: string; date: string }[]) => Promise.all(rows.map(r => api.post('/leaves/holidays', { ...r, is_recurring: false }))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['holidays'] }); notify.success(t('set_hol_added')); setNewHol({ name: '', date: '' }); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const holDel = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => api.delete(`/leaves/holidays/${id}`))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['holidays'] }); notify.success(t('set_hol_removed')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  if (!cur) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>;
  const { company: c, prefs: p, leave: l, docs: d } = cur;
  const pick = (kind: keyof Assets) => { setAssetKind(kind); fileRef.current?.click(); };

  // ── holidays: fixed civil ones (switch on / off), lunar ones (stored per year), others HR added ──
  const stored = ((holQ.data?.data ?? []) as StoredHoliday[]).filter(h => h.date?.startsWith(String(year)) || h.is_recurring);
  const used = new Set<string>();
  const lunar = LUNAR_HOLIDAYS.map(h => {
    const est = estimateLunar(year, h.month, h.day);
    const rows = est ? stored.filter(s => Math.abs(parse(s.date).getTime() - est.getTime()) <= (h.days + 2) * 86400000 && !used.has(s.id)) : [];
    rows.forEach(r => used.add(r.id));
    return { h, est, rows };
  });
  const toggleRow = (on: boolean, name: string, d: string, dateColor: string, toggle: () => void, md: string) => ({ md, d, name, op: on ? '1' : '.55', bg: on ? '#ffffff' : '#f8fafb', dateColor, track: on ? '#16a06b' : '#c3ced3', knob: on ? '16px' : '2px', toggle });
  const holRows = [
    ...FIXED_HOLIDAYS.map(h => {
      const on = !l.off_holidays.includes(h.md);
      return toggleRow(on, t(h.key), `${h.md.slice(3)}/${h.md.slice(0, 2)}`, '#0b5f72', () => set('leave', { off_holidays: on ? [...l.off_holidays, h.md] : l.off_holidays.filter(x => x !== h.md) }), h.md);
    }),
    ...lunar.filter(x => x.est || x.rows.length).map(({ h, est, rows }) => {
      const on = rows.length > 0, first = on ? parse(rows.map(r => r.date).sort()[0]) : est!;
      const label = h.days > 1 ? tf(t('set_hol_days'), { name: t(h.key), n: h.days }) : t(h.key);
      return toggleRow(on, label, on ? dm(first) : `≈ ${dm(first)}`, '#5444b8', () => {
        if (on) holDel.mutate(rows.map(r => r.id));
        else if (est) holAdd.mutate(Array.from({ length: h.days }, (_, k) => ({ name: t(h.key), date: iso(new Date(est.getFullYear(), est.getMonth(), est.getDate() + k)) })));
      }, `${String(first.getMonth() + 1).padStart(2, '0')}-${String(first.getDate()).padStart(2, '0')}`);
    }),
    ...stored.filter(s => !used.has(s.id) && !FIXED_HOLIDAYS.some(f => f.md === s.date.slice(5, 10))).map(s =>
      toggleRow(true, s.name, dm(parse(s.date)), '#8a5207', () => holDel.mutate([s.id]), s.date.slice(5, 10))),
  ].sort((a, b) => a.md.localeCompare(b.md));
  const activeHols = holRows.filter(h => h.op === '1').length;

  // ── usage (billing tab) ─────────────────────────────────────────────────────────
  const staff = (empQ.data?.data ?? []).filter(e => e.status === 'active' || e.status === 'on-leave');
  const monthKey = iso(now).slice(0, 7);
  const docsMonth = (docQ.data?.data ?? []).filter(x => (x.created_at ?? '').startsWith(monthKey)).length;
  const activeTpl = (tplQ.data?.data ?? []).filter(x => x.is_active !== false).length;

  const nDays = p.days.filter(Boolean).length;
  const imgBox: CSSProperties = { maxWidth: '80%', maxHeight: 64, objectFit: 'contain' };
  const tile: CSSProperties = { width: 72, height: 72, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' };

  const v: SettingsVals = {
    rtl: lang === 'ar',
    tabs: TABS.map(([k, key, icon]) => ({ label: t(key), icon, bg: tab === k ? '#e4f2f4' : 'transparent', color: tab === k ? '#0b5f72' : '#33474f', go: () => setTab(k) })),
    tCompany: tab === 'company', tPrefs: tab === 'prefs', tLeave: tab === 'leave', tDocs: tab === 'docs', tBilling: tab === 'billing', tRefs: tab === 'refs',
    c,
    logoTile: assets.logo
      ? <span style={{ ...tile, background: '#ffffff', border: '1px solid #e2e8eb' }}><img src={assets.logo} alt={c.name} style={{ maxWidth: 60, maxHeight: 60, objectFit: 'contain' }} /></span>
      : <span style={{ ...tile, background: 'linear-gradient(135deg,#06141a,#0e6f84)', color: '#ffffff', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 800, fontSize: 24 }}>{companyInitials(c.name)}</span>,
    logoRemove: assets.logo ? <button type="button" onClick={() => asset.mutate({ kind: 'logo', file: null })} style={{ height: 38, padding: '0 12px', border: 'none', borderRadius: 10, background: 'transparent', color: '#b8402c', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('delete')}</button> : null,
    changeLogo: () => pick('logo'),
    companyFields: CF.map(([k, key]) => ({ label: t(key), value: c[k] ?? '', font: MONO.includes(k) ? "'Geist Mono',monospace" : 'inherit', set: e => set('company', { [k]: e.target.value }) })),
    p, setTz: e => set('prefs', { tz: e.target.value }), setDate: e => set('prefs', { date: e.target.value as 'dmy' | 'iso' }), setCur: e => set('prefs', { cur: e.target.value }),
    langs: ([['fr', 'Français'], ['ar', 'العربية'], ['en', 'English']] as const).map(([k, label]) => ({ label, font: k === 'ar' ? "'Noto Kufi Arabic',sans-serif" : 'inherit', go: () => set('prefs', { lang: k }), bg: p.lang === k ? '#0a1c24' : '#ffffff', color: p.lang === k ? '#ffffff' : '#33474f', border: p.lang === k ? '#0a1c24' : '#d6dfe3' })),
    days: DAY_KEYS.map((key, i) => ({ t: t(key), bg: p.days[i] ? '#0e6f84' : '#ffffff', color: p.days[i] ? '#ffffff' : '#52646d', border: p.days[i] ? '#0e6f84' : '#d6dfe3', toggle: () => set('prefs', { days: p.days.map((x, k) => (k === i ? (x ? 0 : 1) : x)) }) })),
    weekNote: tf(t(nDays === 5 || nDays === 6 ? 'set_week_ok' : 'set_week_check'), { n: nDays }),
    l: { monthly: String(l.monthly), bonus: String(l.bonus), cap: String(l.cap), flow: l.flow },
    setMonthly: e => set('leave', { monthly: Number(e.target.value) }), setBonus: e => set('leave', { bonus: Number(e.target.value) }), setCap: e => set('leave', { cap: Number(e.target.value) }),
    setFlow: e => set('leave', { flow: e.target.value as AppSettings['leave']['flow'] }),
    holTitle: tf(t('set_hol_title'), { year }), holCount: tf(t('set_hol_count'), { n: activeHols }),
    hols: holRows,
    holAdd: (
      <form onSubmit={e => { e.preventDefault(); if (newHol.name.trim() && newHol.date) holAdd.mutate([{ name: newHol.name.trim(), date: newHol.date }]); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <input value={newHol.name} onChange={e => setNewHol(x => ({ ...x, name: e.target.value }))} placeholder={t('set_hol_name_ph')} style={{ flex: '2 1 180px', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 13.5, outline: 'none' }} className="set-f3" />
        <input type="date" value={newHol.date} onChange={e => setNewHol(x => ({ ...x, date: e.target.value }))} style={{ flex: '1 1 140px', height: 40, padding: '0 10px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 13.5, outline: 'none' }} className="set-f3" />
        <button type="submit" disabled={!newHol.name.trim() || !newHol.date || holAdd.isPending} className="btn btn-secondary" style={{ height: 40 }}>{holAdd.isPending ? <Spinner size={13} /> : <Plus size={14} />} {t('set_hol_add')}</button>
      </form>
    ),
    d, setDocLang: e => set('docs', { lang: e.target.value as 'fr' | 'ar' | 'en' }),
    upSign: () => pick('signature'), upStamp: () => pick('stamp'),
    signNode: assets.signature ? <img src={assets.signature} alt="" style={imgBox} /> : <span style={{ fontFamily: "'Brush Script MT','Segoe Script',cursive", fontSize: 22, color: '#7d8f97' }}>{t('set_no_signature')}</span>,
    stampNode: assets.stamp ? <img src={assets.stamp} alt="" style={imgBox} /> : (
      <span style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid rgba(14,111,132,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Geist Mono',monospace", fontSize: 7.5, fontWeight: 700, lineHeight: 1.3, color: '#0b5f72', textAlign: 'center', textTransform: 'uppercase', padding: 4, overflow: 'hidden' }}>{c.name}</span>
    ),
    signLabel: t(assets.signature ? 'set_signature_remplacer' : 'set_signature_add'), stampLabel: t(assets.stamp ? 'set_cachet_remplacer' : 'set_stamp_add'),
    planEyebrow: t('set_plan_eyebrow'), planName: c.name || '—',
    planSub: tf(t('set_plan_sub'), { date: new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric' }).format(now) }),
    usage: [
      { label: t('set_u_staff'), value: String(staff.length), pct: null },
      { label: t('set_u_docs_month'), value: String(docsMonth), pct: null },
      { label: t('set_u_templates'), value: String(activeTpl), pct: null },
    ],
    contact: () => { window.location.href = 'mailto:support@wedy.ma?subject=Wedy%20-%20' + encodeURIComponent(c.name || ''); },
    invoicesNode: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: '1px solid #eef2f4', flexWrap: 'wrap' }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84', flexShrink: 0 }}><Mail size={16} /></span>
        <span style={{ flex: 1, minWidth: 200, fontSize: 13.5, color: '#33474f', lineHeight: 1.5 }}>{t('set_invoices_info')}</span>
        <a href="mailto:support@wedy.ma?subject=Facture%20Wedy" className="btn btn-secondary" style={{ height: 36 }}>{t('set_invoices_ask')}</a>
      </div>
    ),
    dirty, cancel: () => setDraft(null), save: () => save.mutate(),
    extra: (
      <>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) asset.mutate({ kind: assetKind, file: f }); }} />
        {(server && !server.stored) && (
          <div role="status" style={{ position: 'fixed', insetInlineEnd: 24, bottom: 24, zIndex: 100, maxWidth: 380, display: 'flex', gap: 10, padding: 14, borderRadius: 14, background: '#fbefda', color: '#8a5207', fontSize: 13, lineHeight: 1.5, boxShadow: '0 18px 40px -18px rgba(10,28,36,.4)' }}>
            {t('set_table_missing')}
          </div>
        )}
      </>
    ),
  };
  return <SettingsView v={v} />;
}
