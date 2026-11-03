import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, Calendar, CalendarX, ChevronUp, Cpu, Download, ExternalLink, FileText, Flame, Gauge, Landmark, Paperclip, Play,
  Radar, Search, SearchX, Settings2, Sparkles, Trash2, Wallet, X,
} from 'lucide-react';
import { api, getApiError } from '@/services/api';
import { RV, CountText } from '@/components/motion';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { displayName } from '@/lib/visual';
import './TendersPage.css';

type Analysis = { titre?: string; organisme?: string; type_projet?: string; technologies?: string[]; budget_estime?: string; date_limite?: string; resume?: string; niveau_complexite?: 'low' | 'medium' | 'high' };
type Tender = { id: string; title: string; organization?: string; deadline?: string; status?: string; source_url?: string; downloaded_files?: string[]; analysis_result?: Analysis; is_analyzed?: boolean; file_count?: number; reference?: string; location?: string; city?: string };
type Status = { state: 'idle' | 'running' | 'done' | 'error'; message?: string; started_at?: string | null; finished_at?: string | null; progress?: { time: string; message: string }[]; error?: string | null };
type Settings = { keywords: string[]; nom: string; prenom: string; email: string; company: string; litellm_api_key: string; litellm_model: string };

const getStatus = () => api.get<Status>('/tenders/status').then(r => r.data);
const getResults = () => api.get<{ tenders: Tender[]; count: number; last_run: string | null }>('/tenders/results').then(r => r.data);
const STORE = 'wedy_tenders_settings';
const loadSettings = (fallback: Partial<Settings>): Settings => {
  let s: Partial<Settings> = {};
  try { s = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { /* defaults */ }
  return { keywords: s.keywords ?? [], nom: s.nom ?? fallback.nom ?? '', prenom: s.prenom ?? fallback.prenom ?? '', email: s.email ?? fallback.email ?? '', company: s.company ?? fallback.company ?? '', litellm_api_key: s.litellm_api_key ?? '', litellm_model: s.litellm_model ?? '' };
};
const saveSettings = (s: Settings) => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* memory only */ } };
const CX: Record<string, [TKey, string, string, number]> = { high: ['tdr_cx_high', '#fbe9e6', '#a33a28', 0], medium: ['tdr_cx_medium', '#fbefda', '#8a5207', 1], low: ['tdr_cx_low', '#e1f5ec', '#0f6f49', 2] };
const R = 2 * Math.PI * 23;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const parseDate = (s?: string) => {
  if (!s) return null;
  const m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  const d = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
};
const budgetOf = (t: Tender) => { const n = parseFloat((t.analysis_result?.budget_estime ?? '').replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

async function downloadFile(tenderId: string, filename: string) {
  const res = await api.get(`/tenders/${encodeURIComponent(tenderId)}/files/${encodeURIComponent(filename)}`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a'); a.href = url; a.download = filename.split('/').pop() || filename; a.click(); URL.revokeObjectURL(url);
}

export default function TendersPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const notify = useNotify();
  const qc = useQueryClient();
  const me = displayName(user).split(' ');
  const [settings, setSettings] = useState<Settings>(() => loadSettings({ prenom: me[0] ?? '', nom: me.slice(1).join(' '), email: user?.email ?? '', company: typeof user?.profile?.company === 'string' ? user.profile.company : '' }));
  const [kwIn, setKwIn] = useState('');
  const [q, setQ] = useState('');
  const [cx, setCx] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sort, setSort] = useState<'deadline' | 'match' | 'cx' | 'budget'>('deadline');
  const [open, setOpen] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const update = (s: Partial<Settings>) => setSettings(x => { const n = { ...x, ...s }; saveSettings(n); return n; });

  const { data: status } = useQuery({ queryKey: ['tenders', 'status'], queryFn: getStatus, refetchInterval: q2 => (q2.state.data?.state === 'running' ? 2000 : false) });
  const running = status?.state === 'running';
  const { data: results, isLoading } = useQuery({ queryKey: ['tenders', 'results'], queryFn: getResults });
  useEffect(() => { if (status?.state === 'done' || status?.state === 'error') qc.invalidateQueries({ queryKey: ['tenders', 'results'] }); }, [status?.state, qc]);

  const run = useMutation({
    mutationFn: () => api.post('/tenders/run', { keywords: settings.keywords.join(', '), nom: settings.nom, prenom: settings.prenom, email: settings.email, company: settings.company, litellm_api_key: settings.litellm_api_key || undefined, litellm_model: settings.litellm_model || undefined }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenders', 'status'] }); notify.success(t('tdr_started')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const clear = useMutation({
    mutationFn: () => api.delete('/tenders/results'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenders'] }); notify.success(t('tdr_cleared')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const start = () => {
    if (!settings.keywords.length) { notify.error(t('tdr_need_kw')); return; }
    if (!settings.nom || !settings.prenom || !settings.email || !settings.company) { notify.info(t('tdr_need_contact')); setSettingsOpen(true); return; }
    run.mutate();
  };
  const addKw = (e: FormEvent) => {
    e.preventDefault();
    const v = kwIn.trim().toLowerCase();
    if (v && !settings.keywords.includes(v)) update({ keywords: [...settings.keywords, v] });
    setKwIn('');
  };

  const tenders = useMemo(() => results?.tenders ?? [], [results]);
  const kwN = settings.keywords.map(norm);
  const matchOf = (x: Tender) => {
    if (!kwN.length) return null;
    const hay = norm([x.title, x.analysis_result?.titre, x.analysis_result?.resume, x.analysis_result?.type_projet, ...(x.analysis_result?.technologies ?? [])].filter(Boolean).join(' '));
    return Math.round(kwN.filter(k => hay.includes(k)).length / kwN.length * 100);
  };
  const daysOf = (x: Tender) => { const d = parseDate(x.analysis_result?.date_limite || x.deadline); return d ? Math.ceil((d.getTime() - now) / 864e5) : null; };
  const needle = norm(q.trim());
  const list = tenders
    .filter(x => (cx === 'all' || x.analysis_result?.niveau_complexite === cx) && (!needle || norm(`${x.title} ${x.organization ?? ''} ${x.analysis_result?.organisme ?? ''} ${x.id}`).includes(needle)))
    .sort((a, b) => {
      if (sort === 'match') return (matchOf(b) ?? 0) - (matchOf(a) ?? 0);
      if (sort === 'cx') return (CX[a.analysis_result?.niveau_complexite ?? '']?.[3] ?? 3) - (CX[b.analysis_result?.niveau_complexite ?? '']?.[3] ?? 3);
      if (sort === 'budget') return budgetOf(b) - budgetOf(a);
      const da = daysOf(a), db = daysOf(b);
      return Number((da ?? 1e9) < 0) - Number((db ?? 1e9) < 0) || (da ?? 1e9) - (db ?? 1e9);
    });
  const files = tenders.reduce((s, x) => s + (x.file_count ?? x.downloaded_files?.length ?? 0), 0);
  const analyzed = tenders.filter(x => x.is_analyzed).length;
  const high = tenders.filter(x => x.analysis_result?.niveau_complexite === 'high').length;
  const st: [TKey, string, string] = running ? ['tdr_st_running', 'rgba(95,227,240,.14)', '#5fe3f0'] : status?.state === 'error' ? ['tdr_st_error', 'rgba(239,107,84,.16)', '#ef8b78'] : results?.last_run ? ['tdr_st_done', 'rgba(43,189,134,.16)', '#4fd3a0'] : ['tdr_st_idle', 'rgba(255,255,255,.08)', '#b9cbd0'];
  const lastRun = results?.last_run ? tf(t('tdr_last_run'), { when: new Date(results.last_run + (results.last_run.endsWith('Z') ? '' : 'Z')).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }) : t('tdr_never');
  const logs = status?.progress ?? [];
  const prog = running ? Math.min(95, 8 + logs.length * 12) : logs.length ? 100 : 0;

  const kpi = (Icon: typeof Briefcase, bg: string, color: string, value: number, label: TKey, delay: number) => (
    <RV as="div" variant="up" delay={delay} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8eb' }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color }}><Icon size={18} /></span>
      <div><CountText as="div" text={String(value)} style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1 }} /><div style={{ fontSize: 12.5, color: '#52646d' }}>{t(label)}</div></div>
    </RV>
  );

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div>
        <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('tdr_title')}</RV>
        <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('tdr_subtitle')}</RV>
      </div>

      <RV as="section" variant="up" delay={80} style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, background: '#06141a', color: '#e8eff1', padding: '22px 24px', isolation: 'isolate' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div className="wedy-drift" style={{ position: 'absolute', left: '-8%', top: '-90%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)' }} />
          <div className="wedy-drift" style={{ position: 'absolute', right: '-6%', top: '-70%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.35),transparent)', ['--dur' as string]: '27s', ['--delay' as string]: '-9s' } as CSSProperties} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '36px 36px', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 40%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 40%,transparent)' }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(95,227,240,.25)' }} />
            <span style={{ position: 'absolute', inset: 16, borderRadius: '50%', border: '1px solid rgba(95,227,240,.22)' }} />
            <span style={{ position: 'absolute', inset: 32, borderRadius: '50%', background: 'rgba(95,227,240,.14)' }} />
            {running && <><span className="wedy-spin" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg,rgba(95,227,240,0) 0deg,rgba(95,227,240,0) 270deg,rgba(95,227,240,.55) 360deg)', ['--dur' as string]: '1.8s' } as CSSProperties} /><span className="wedy-ping" style={{ position: 'absolute', left: 62, top: 20, width: 8, height: 8, borderRadius: '50%', background: '#5fe3f0' }} /></>}
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5fe3f0' }}><Radar size={26} /></span>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '-.03em' }}>{t('tdr_agent')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: st[1], color: st[2] }}><span className="wedy-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: st[2] }} />{t(st[0])}</span>
            </div>
            <div style={{ fontSize: 13, color: '#9fb4bb', marginTop: 4 }}>{[settings.company, t('tdr_portal'), lastRun].filter(Boolean).join(' · ')}</div>
            <form onSubmit={addKw} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 14 }}>
              <span style={{ fontSize: 12, color: '#8ea5ad', marginInlineEnd: 2 }}>{t('tdr_keywords')}</span>
              {settings.keywords.map(k => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 5px 0 11px', borderRadius: 99, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', fontSize: 12.5, color: '#e8eff1' }}>
                  {k}<button type="button" onClick={() => update({ keywords: settings.keywords.filter(x => x !== k) })} aria-label={t('tdr_remove')} style={{ width: 20, height: 20, border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,.1)', color: '#cfdde1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={11} /></button>
                </span>
              ))}
              <input value={kwIn} onChange={e => setKwIn(e.target.value)} placeholder={t('tdr_kw_ph')} style={{ width: 120, height: 30, padding: '0 11px', borderRadius: 99, border: '1px dashed rgba(255,255,255,.28)', background: 'transparent', color: '#ffffff', fontFamily: 'inherit', fontSize: 12.5, outline: 'none' }} />
            </form>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
            <button type="button" onClick={start} disabled={running || run.isPending} style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, padding: '0 18px', border: 'none', borderRadius: 13, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, cursor: running ? 'default' : 'pointer', opacity: running ? 0.75 : 1, boxShadow: '0 14px 30px -12px rgba(22,182,200,.8)' }}>
              <span className="wedy-shine" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} />
              {running || run.isPending ? <Spinner size={15} color="#fff" /> : <Play size={15} style={{ position: 'relative' }} />}<span style={{ position: 'relative' }}>{t(running ? 'tdr_running' : 'tdr_run')}</span>
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 32, border: 'none', borderRadius: 10, background: 'rgba(255,255,255,.06)', color: '#b9cbd0', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }} className="tdr-h0"><Settings2 size={13} />{t('tdr_settings')}</button>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#9fb4bb' }}><Sparkles size={13} />{t('tdr_ai_note')}</span>
          </div>
        </div>
        {(running || logs.length > 0) && (
          <RV as="div" variant="up" style={{ marginTop: 16, borderRadius: 14, background: 'rgba(0,0,0,.28)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden' }}>
            <div style={{ height: 3, background: 'rgba(255,255,255,.06)' }}><div style={{ height: '100%', width: `${prog}%`, background: 'linear-gradient(90deg,#16b6c8,#9a8bf0)', transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} /></div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, fontFamily: "'Geist Mono',monospace", fontSize: 12, maxHeight: 180, overflowY: 'auto' }}>
              {logs.slice(-8).map((l, i) => (
                <div key={`${l.time}-${i}`} style={{ display: 'flex', gap: 10, color: /erreur|error|échec/i.test(l.message) ? '#ef8b78' : /termin|done|trouv/i.test(l.message) ? '#4fd3a0' : '#b9cbd0' }}>
                  <span style={{ color: '#5b737b', flexShrink: 0 }}>{new Date(l.time + (l.time.endsWith('Z') ? '' : 'Z')).toLocaleTimeString('fr-FR')}</span><span>{l.message}</span>
                </div>
              ))}
              {status?.state === 'error' && status.error && <div style={{ color: '#ef8b78' }}>{status.error}</div>}
            </div>
          </RV>
        )}
      </RV>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
        {kpi(Briefcase, '#e4f2f4', '#0e6f84', tenders.length, 'tdr_k_found', 80)}
        {kpi(Sparkles, '#ece9fb', '#6d5ad6', analyzed, 'tdr_k_analyzed', 130)}
        {kpi(Paperclip, '#e1f5ec', '#16a06b', files, 'tdr_k_files', 180)}
        {kpi(Gauge, '#fbe9e6', '#df5740', high, 'tdr_k_high', 230)}
      </div>

      <RV as="div" variant="up" delay={120} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200, maxWidth: 340 }}>
          <Search size={15} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', marginTop: -7.5, color: '#7d8f97', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('tdr_search')} style={{ width: '100%', height: 40, paddingInline: '36px 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' }} className="tdr-f1" />
        </div>
        <span style={{ fontSize: 12.5, color: '#52646d', marginInlineStart: 4 }}>{t('tdr_cx')}</span>
        {(['all', 'high', 'medium', 'low'] as const).map(k => {
          const on = cx === k;
          return <button key={k} type="button" onClick={() => setCx(k)} style={{ height: 34, padding: '0 12px', borderRadius: 99, border: `1px solid ${on ? '#0a1c24' : '#e2e8eb'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{k === 'all' ? t('tdr_all') : t(CX[k][0])}</button>;
        })}
        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: '#52646d' }}>{t('tdr_sort')}</span>
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={{ height: 38, padding: '0 30px 0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: '#33474f', cursor: 'pointer', outline: 'none' }}>
            <option value="deadline">{t('tdr_sort_deadline')}</option><option value="match">{t('tdr_sort_match')}</option><option value="cx">{t('tdr_sort_cx')}</option><option value="budget">{t('tdr_sort_budget')}</option>
          </select>
        </div>
      </RV>

      {running && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#33474f' }}><span className="wedy-spin" style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid #d6dfe3', borderTopColor: '#16b6c8' }} />{t('tdr_analyzing')}</div>
          {[1, 2, 3].map(k => (
            <div key={k} style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <span className="wedy-scan" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(22,182,200,.09),transparent)' }} />
              <div style={{ padding: 20, display: 'flex', gap: 16 }}><span style={{ width: 56, height: 56, borderRadius: '50%', background: '#eef2f4', flexShrink: 0 }} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}><span style={{ height: 10, width: '28%', borderRadius: 6, background: '#eef2f4' }} /><span style={{ height: 15, width: '66%', borderRadius: 6, background: '#eef2f4' }} /><span style={{ height: 10, width: '48%', borderRadius: 6, background: '#eef2f4' }} /></div></div>
            </div>
          ))}
        </div>
      )}

      {!running && isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>}
      {!running && !isLoading && list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((x, i) => {
            const a = x.analysis_result ?? {};
            const d = daysOf(x), exp = d !== null && d < 0, urg = d !== null && !exp && d <= 10;
            const dt = parseDate(a.date_limite || x.deadline);
            const dd = dt ? dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';
            const dl: [string, string, string, typeof Calendar] = d === null ? [t('tdr_no_deadline'), '#eef2f4', '#52646d', Calendar] : exp ? [t('tdr_expired'), '#eef2f4', '#52646d', CalendarX] : urg ? [tf(t('tdr_urgent'), { d }), '#fbe9e6', '#a33a28', Flame] : [tf(t('tdr_due'), { date: dd, d }), '#e4f2f4', '#0b5f72', Calendar];
            const DlIcon = dl[3];
            const c = CX[a.niveau_complexite ?? ''];
            const m = matchOf(x);
            const on = open === x.id;
            const nFiles = x.file_count ?? x.downloaded_files?.length ?? 0;
            const attention: string[] = [];
            if (urg) attention.push(tf(t('tdr_att_urgent'), { d: d! }));
            if (a.niveau_complexite === 'high') attention.push(t('tdr_att_high'));
            if (!nFiles) attention.push(t('tdr_att_nofiles'));
            if (m !== null && m < 34) attention.push(t('tdr_att_match'));
            return (
              <RV key={x.id} as="div" variant="up" delay={Math.min(i, 10) * 60} style={{ borderRadius: 20, background: '#ffffff', border: `1px solid ${on ? '#b9dfe5' : '#e2e8eb'}`, overflow: 'hidden', opacity: exp ? 0.72 : 1, transition: 'box-shadow .2s,border-color .2s' }} className="tdr-h1">
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '18px 20px', flexWrap: 'wrap' }}>
                  {m !== null && (
                    <span style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                      <svg viewBox="0 0 56 56" style={{ display: 'block', width: 56, height: 56, transform: 'rotate(-90deg)' }}>
                        <circle cx="28" cy="28" r="23" style={{ fill: 'none', stroke: '#eef2f4', strokeWidth: 5 }} />
                        <RV as="circle" variant="draw" frac={m / 100} cx="28" cy="28" r="23" style={{ fill: 'none', stroke: m >= 67 ? '#16a06b' : m >= 34 ? '#16b6c8' : '#df9326', strokeWidth: 5, strokeLinecap: 'round', strokeDasharray: `${(R * m / 100).toFixed(1)}px ${R.toFixed(1)}px` }} />
                      </svg>
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}><span style={{ fontSize: 15, fontWeight: 800 }}>{m}</span><span style={{ fontSize: 8.5, fontWeight: 600, color: '#5f7079', marginTop: 2, letterSpacing: '.04em' }}>MATCH</span></span>
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11.5, color: '#5f7079' }}>{x.reference || x.id}</span>
                      {c && <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: c[1], color: c[2] }}>{tf(t('tdr_cx_chip'), { level: t(c[0]).toLowerCase() })}</span>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: dl[1], color: dl[2] }}><DlIcon size={12} />{dl[0]}</span>
                    </div>
                    <div style={{ marginTop: 7, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 600, fontSize: 18, letterSpacing: '-.02em', lineHeight: 1.25 }}>{a.titre || x.title}</div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 7, fontSize: 13, color: '#52646d' }}>
                      {(a.organisme || x.organization) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Landmark size={13} />{a.organisme || x.organization}</span>}
                      {a.budget_estime && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#0a1c24' }}><Wallet size={13} style={{ color: '#52646d' }} />{a.budget_estime}</span>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Paperclip size={13} />{tf(t('tdr_files_n'), { n: nFiles })}</span>
                    </div>
                    {a.resume && <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55, color: '#33474f' }}>{a.resume}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 170 }}>
                    <button type="button" onClick={() => setOpen(on ? null : x.id)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 40, padding: '0 14px', border: 'none', borderRadius: 11, background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} className="tdr-h2">
                      {on ? <ChevronUp size={14} /> : <Sparkles size={14} />}{t(on ? 'tdr_hide' : 'tdr_show')}
                    </button>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" disabled={!x.source_url} onClick={() => x.source_url && window.open(x.source_url, '_blank', 'noopener')} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#33474f', cursor: x.source_url ? 'pointer' : 'default', opacity: x.source_url ? 1 : 0.5 }} className="tdr-h3"><ExternalLink size={13} />{t('tdr_source')}</button>
                      <button type="button" disabled={!x.downloaded_files?.length} onClick={async () => { try { for (const f of x.downloaded_files ?? []) await downloadFile(x.id, f); } catch (e) { notify.error(getApiError(e, t('error'))); } }} aria-label={t('tdr_download')} title={t('tdr_download')} style={{ width: 38, height: 38, borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', cursor: x.downloaded_files?.length ? 'pointer' : 'default', opacity: x.downloaded_files?.length ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="tdr-h3"><Download size={15} /></button>
                    </div>
                  </div>
                </div>
                {on && (
                  <RV as="div" variant="up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18, padding: '16px 20px 20px', borderTop: '1px solid #eef2f4', background: '#fbfcfc' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('tdr_techs')}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {(a.technologies ?? []).length ? (a.technologies ?? []).map(tech => <span key={tech} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: '#e4f2f4', color: '#0b5f72' }}><Cpu size={12} />{tech}</span>) : <span style={{ fontSize: 13, color: '#7d8f97' }}>—</span>}
                      </div>
                      {a.type_projet && <div style={{ marginTop: 12, fontSize: 13, color: '#33474f' }}><span style={{ color: '#5f7079' }}>{t('tdr_type')} · </span><b>{a.type_projet}</b></div>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('tdr_dossier')}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {(x.downloaded_files ?? []).length ? (x.downloaded_files ?? []).map(f => (
                          <button key={f} type="button" onClick={() => downloadFile(x.id, f).catch(e => notify.error(getApiError(e, t('error'))))} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'Geist Mono',monospace", fontSize: 11.5, fontWeight: 600, padding: '4px 9px', borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8eb', color: '#33474f', cursor: 'pointer' }} className="tdr-h3"><FileText size={12} style={{ color: '#7d8f97' }} />{f.split('/').pop()}</button>
                        )) : <span style={{ fontSize: 13, color: '#7d8f97' }}>{t('tdr_no_files')}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12, fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: '#5f7079' }}>{t('tdr_deadline')}</span><span style={{ fontWeight: 600 }}>{dt ? dt.toLocaleDateString('fr-FR') : '—'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: '#5f7079' }}>{t('tdr_budget')}</span><span style={{ fontWeight: 600 }}>{a.budget_estime || '—'}</span></div>
                      </div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 14, background: attention.length ? '#fbefda' : '#e1f5ec', border: `1px solid ${attention.length ? 'rgba(230,169,72,.4)' : 'rgba(22,160,107,.3)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: attention.length ? '#8a5207' : '#0f6f49' }}><Sparkles size={17} />{t(attention.length ? 'tdr_att_title' : 'tdr_att_none')}</div>
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, lineHeight: 1.55, color: '#33474f' }}>
                        {attention.length ? attention.map(s => <span key={s}>• {s}</span>) : <span>{t('tdr_att_ok')}</span>}
                      </div>
                    </div>
                  </RV>
                )}
              </RV>
            );
          })}
        </div>
      )}
      {!running && !isLoading && list.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 20px', borderRadius: 20, background: '#ffffff', border: '1px dashed #d0dadf', textAlign: 'center' }}>
          <span style={{ width: 50, height: 50, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f6f7', color: '#7d8f97' }}><SearchX size={22} /></span>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{t(tenders.length ? 'tdr_no_result' : 'tdr_empty')}</div>
          <div style={{ fontSize: 14, color: '#52646d' }}>{t(tenders.length ? 'tdr_no_result_sub' : 'tdr_empty_sub')}</div>
          {tenders.length > 0 && <button type="button" onClick={() => { setQ(''); setCx('all'); }} style={{ marginTop: 6, height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#0a1c24', cursor: 'pointer' }}>{t('tdr_reset')}</button>}
        </div>
      )}

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('tdr_settings')} subtitle={t('tdr_settings_sub')} icon={<Settings2 size={17} />} width={460}
        footer={<button type="button" className="btn btn-primary" onClick={() => setSettingsOpen(false)}>{t('tdr_done')}</button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label={t('tdr_f_prenom')} value={settings.prenom} onChange={v => update({ prenom: v })} />
            <Field label={t('tdr_f_nom')} value={settings.nom} onChange={v => update({ nom: v })} />
          </div>
          <Field label="Email" value={settings.email} onChange={v => update({ email: v })} />
          <Field label={t('tdr_f_company')} value={settings.company} onChange={v => update({ company: v })} />
          <div style={{ fontSize: 12.5, color: '#52646d', lineHeight: 1.5 }}>{t('tdr_contact_hint')}</div>
          <div style={{ paddingTop: 12, borderTop: '1px solid #eef2f4', fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('tdr_ai_cfg')}</div>
          <Field label={t('tdr_f_model')} value={settings.litellm_model} onChange={v => update({ litellm_model: v })} placeholder="gpt-4.1-mini" />
          <Field label={t('tdr_f_key')} value={settings.litellm_api_key} onChange={v => update({ litellm_api_key: v })} type="password" placeholder={t('tdr_f_key_ph')} />
          <button type="button" disabled={clear.isPending || !tenders.length} onClick={() => { if (window.confirm(t('tdr_confirm_clear'))) clear.mutate(); }} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 40, borderRadius: 11, border: '1px solid #f0c9c0', background: '#ffffff', color: '#a33a28', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', opacity: tenders.length ? 1 : 0.5 }}><Trash2 size={14} />{t('tdr_clear')}</button>
        </div>
      </Drawer>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={{ height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 400, color: '#0a1c24', outline: 'none' }} className="tdr-f1" />
    </label>
  );
}
