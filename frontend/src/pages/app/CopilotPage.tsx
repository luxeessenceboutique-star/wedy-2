// Wedy Copilot — a multi-agent assistant (LangGraph on the backend): a supervisor sends each request to specialist agents
// (employees, leave, recruitment, documents, performance, analytics, meetings) that act in Wedy with real tools. The page
// streams their progress, shows every change for confirmation before it runs, and keeps the conversation.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUp, BarChart3, Bot, Check, CircleAlert, ClipboardList, Copy, FileText, Info, Loader2, Plus, RotateCcw, Scale, ShieldCheck, Sparkles, Square,
  Target, TrendingUp, UserCheck, Users, Video, X, Zap, CalendarClock, ExternalLink, type LucideIcon,
} from 'lucide-react';
import { RV } from '@/components/motion';
import { Drawer } from '@/components/ui';
import { Markdown } from '@/components/copilot/Markdown';
import { getAgents, runAgent, type AgentEvent } from '@/components/copilot/agentStream';
import { toast } from 'sonner';
import { useLang, type TKey } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { tf } from '@/lib/format';
import './CopilotPage.css';

type Lang = 'fr' | 'ar' | 'en';
type Link_ = { path: string; label: string };
type Block =
  | { k: 'route'; agent: string; label: string }
  | { k: 'tool'; id: string; label: string; write: boolean; status: 'running' | 'ok' | 'error' | 'cancelled'; summary: string }
  | { k: 'text'; id: string; agent: string; label: string; text: string; done: boolean }
  | { k: 'confirm'; callId: string; label: string; summary: string; details: [string, unknown][]; danger: boolean; state: 'pending' | 'approved' | 'declined' }
  | { k: 'error'; code: string; message: string };
type Turn =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; blocks: Block[]; links: Link_[]; status: 'running' | 'awaiting' | 'done' | 'error' };
type Stored = { thread: string; turns: Turn[] };

const STORE = 'wedy_copilot_v2';
const AUTO = 'wedy_copilot_auto';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const AGENT_UI: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  employees: { icon: Users, bg: '#e4f2f4', color: '#0e6f84' }, leave: { icon: CalendarClock, bg: '#fbefda', color: '#b06b0c' },
  recruitment: { icon: Target, bg: '#ece9fb', color: '#6d5ad6' }, documents: { icon: FileText, bg: '#e1f5ec', color: '#16a06b' },
  talent: { icon: TrendingUp, bg: '#fbe9e6', color: '#df5740' }, analytics: { icon: BarChart3, bg: '#e7f4f6', color: '#0e6f84' },
  comms: { icon: Video, bg: '#e4f2f4', color: '#0b5f72' }, general: { icon: Scale, bg: '#eef2f4', color: '#33474f' },
};

const CMDS = (t: (k: TKey) => string) => [
  { cmd: '/doc', label: t('copilot_cmd_doc'), text: t('copilot_cmd_doc_text') },
  { cmd: '/emp', label: t('copilot_cmd_emp'), text: t('copilot_cmd_emp_text') },
  { cmd: '/congé', label: t('copilot_cmd_conge'), text: t('copilot_cmd_conge_text') },
  { cmd: '/aide', label: t('copilot_cmd_aide'), text: t('copilot_cmd_aide_text') },
];

/** A full document written by the model: <document titre="…" langue="…">…</document> is shown as a card. */
function parseReply(text: string) {
  const m = text.match(/<document([^>]*)>([\s\S]*?)<\/document>/i);
  if (!m) return { before: text.trim(), after: '', docTitle: '', docLang: '', docText: '' };
  const attr = (k: string) => { const r = m[1].match(new RegExp(k + '\\s*=\\s*"([^"]*)"', 'i')); return r ? r[1] : ''; };
  const idx = m.index ?? 0;
  return { before: text.slice(0, idx).trim(), after: text.slice(idx + m[0].length).trim(), docTitle: attr('titre') || attr('title') || 'Document', docLang: (attr('langue') || attr('lang') || 'fr').toLowerCase(), docText: m[2].trim() };
}

/** What one stream event does to the assistant turn it belongs to. */
function apply(turn: Turn, ev: AgentEvent): Turn {
  if (turn.role !== 'assistant') return turn;
  const blocks = [...turn.blocks];
  let { links, status } = turn;
  const openText = () => blocks.findIndex(b => b.k === 'text' && !b.done);
  switch (ev.t) {
    case 'route': blocks.push({ k: 'route', agent: ev.agent, label: ev.label }); break;
    case 'token': {
      const i = blocks.findIndex(b => b.k === 'text' && b.id === ev.id);
      if (i >= 0) { const b = blocks[i] as Extract<Block, { k: 'text' }>; blocks[i] = { ...b, text: b.text + ev.text }; }
      else {
        const lastRoute = [...blocks].reverse().find(b => b.k === 'route') as Extract<Block, { k: 'route' }> | undefined;
        blocks.push({ k: 'text', id: ev.id, agent: lastRoute?.agent ?? '', label: lastRoute?.label ?? '', text: ev.text, done: false });
      }
      break;
    }
    case 'tool_call': {
      const i = openText();
      if (i >= 0) blocks.splice(i, 1); // words said before calling a tool are not an answer
      blocks.push({ k: 'tool', id: ev.id, label: ev.label, write: ev.write, status: 'running', summary: '' });
      break;
    }
    case 'tool_result': {
      const i = blocks.findIndex(b => b.k === 'tool' && b.id === ev.id);
      if (i >= 0) blocks[i] = { ...(blocks[i] as Extract<Block, { k: 'tool' }>), status: ev.ok ? 'ok' : ev.summary === 'cancelled' ? 'cancelled' : 'error', summary: ev.summary };
      break;
    }
    case 'link': if (!links.some(l => l.path === ev.path)) links = [...links, { path: ev.path, label: ev.label }]; break;
    case 'confirm': blocks.push({ k: 'confirm', callId: ev.call_id, label: ev.label, summary: ev.summary, details: ev.details ?? [], danger: ev.danger, state: 'pending' }); break;
    case 'message': {
      const i = openText();
      if (i >= 0) blocks[i] = { ...(blocks[i] as Extract<Block, { k: 'text' }>), text: ev.text, done: true };
      else blocks.push({ k: 'text', id: ev.id, agent: ev.agent, label: ev.agent_label, text: ev.text, done: true });
      break;
    }
    case 'error': blocks.push({ k: 'error', code: ev.code, message: ev.message }); status = 'error'; break;
    case 'done': status = ev.status === 'awaiting_confirmation' ? 'awaiting' : ev.status === 'error' ? 'error' : 'done'; break;
    default: break;
  }
  return { ...turn, blocks, links, status };
}

function load(): Stored {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Stored | null;
    if (s?.thread && Array.isArray(s.turns)) {
      return { thread: s.thread, turns: s.turns.map(t => (t.role === 'assistant' && t.status === 'running' ? { ...t, status: 'error' as const } : t)) };
    }
  } catch { /* corrupted or unavailable storage */ }
  return { thread: uid(), turns: [] };
}

export default function CopilotPage() {
  const { t, lang: appLang } = useLang();
  const { user } = useAuth();
  const fullName = user?.full_name || (typeof user?.profile?.full_name === 'string' ? user.profile.full_name : '') || user?.email?.split('@')[0] || '';
  const firstName = fullName.split(/\s+/)[0] || '';
  const [init] = useState(load);
  const [thread, setThread] = useState(init.thread);
  const [turns, setTurns] = useState<Turn[]>(init.turns);
  const [input, setInput] = useState('');
  const [lang, setLang] = useState<Lang>(appLang === 'ar' ? 'ar' : appLang === 'en' ? 'en' : 'fr');
  const [auto, setAuto] = useState(() => { try { return localStorage.getItem(AUTO) === '1'; } catch { return false; } });
  const [capOpen, setCapOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const last = turns[turns.length - 1];
  const running = last?.role === 'assistant' && last.status === 'running';
  const awaiting = last?.role === 'assistant' && last.status === 'awaiting';
  const agentsQ = useQuery({ queryKey: ['copilot-agents', lang], queryFn: () => getAgents(lang), staleTime: 600_000, retry: false });

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify({ thread, turns } satisfies Stored)); } catch { /* storage full */ } }, [thread, turns]);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
  }, [turns]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const setInputAuto = (v: string, focus?: boolean) => {
    setInput(v);
    requestAnimationFrame(() => {
      const ta = inputRef.current; if (!ta) return;
      ta.style.height = 'auto'; ta.style.height = Math.min(180, ta.scrollHeight) + 'px';
      if (focus) { ta.focus(); ta.setSelectionRange(v.length, v.length); }
    });
  };
  const toggleAuto = () => setAuto(a => { const n = !a; try { localStorage.setItem(AUTO, n ? '1' : '0'); } catch { /* ignore */ } return n; });

  const history = useMemo(() => turns.filter(x => x.role === 'user' || x.status !== 'running').map(x => (x.role === 'user'
    ? { role: 'user' as const, content: x.text }
    : { role: 'assistant' as const, content: x.blocks.filter(b => b.k === 'text').map(b => (b as Extract<Block, { k: 'text' }>).text).join('\n') })).filter(m => m.content), [turns]);

  const start = useCallback(async (turnId: string, body: Parameters<typeof runAgent>[0]) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const fail = (code: string, message: string) => setTurns(ts => ts.map(x => (x.id === turnId ? apply(x, { t: 'error', code, message }) : x)));
    try {
      await runAgent(body, ev => setTurns(ts => ts.map(x => (x.id === turnId ? apply(x, ev) : x))), ac.signal);
      setTurns(ts => ts.map(x => (x.id === turnId && x.role === 'assistant' && x.status === 'running' ? { ...x, status: 'done' } : x)));
    } catch (e) {
      if (ac.signal.aborted) { setTurns(ts => ts.map(x => (x.id === turnId && x.role === 'assistant' ? { ...x, status: 'done' } : x))); return; }
      const status = (e as { status?: number }).status;
      fail(status === 403 ? 'forbidden_role' : 'network', e instanceof Error ? e.message : '');
    }
  }, []);

  const ask = (text: string) => {
    const content = text.trim();
    if (!content || running || awaiting) return;
    const tid = uid();
    setTurns(ts => [...ts, { id: uid(), role: 'user', text: content }, { id: tid, role: 'assistant', blocks: [], links: [], status: 'running' }]);
    setInputAuto('');
    void start(tid, { thread_id: thread, message: content, lang, auto_approve: auto, history: history.slice(-12) });
  };

  const answer = (approve: boolean) => {
    if (!last || last.role !== 'assistant') return;
    const tid = last.id;
    setTurns(ts => ts.map(x => (x.id === tid && x.role === 'assistant'
      ? { ...x, status: 'running', blocks: x.blocks.map(b => (b.k === 'confirm' && b.state === 'pending' ? { ...b, state: approve ? 'approved' : 'declined' } : b)) } : x)));
    void start(tid, { thread_id: thread, resume: { approve }, lang, auto_approve: auto });
  };

  const stop = () => abortRef.current?.abort();
  const reset = () => { abortRef.current?.abort(); setThread(uid()); setTurns([]); setInputAuto(''); };

  const slash = input.startsWith('/') && !input.includes(' ');
  const cmdList = slash ? CMDS(t).filter(c => c.cmd.startsWith(input.toLowerCase()) || input === '/') : [];
  const empty = turns.length === 0;
  const busy = running || awaiting;

  const errText = (b: Extract<Block, { k: 'error' }>) => ({
    no_ai_key: t('cop_err_no_key'), ai_unavailable: t('cop_err_unavailable'), forbidden: t('cop_err_forbidden'), forbidden_role: t('cop_err_role'),
  } as Record<string, string>)[b.code] ?? (b.code === 'network' ? t('cop_err_network') : t('copilot_err'));
  const copyDoc = (title: string, text: string) => navigator.clipboard.writeText(`${title}\n\n${text}`).then(() => toast.success(t('copilot_copy_done'))).catch(() => toast.error(t('copilot_copy_fail')));

  const renderText = (b: Extract<Block, { k: 'text' }>) => {
    const p = parseReply(b.text);
    const rtl = lang === 'ar' || /[؀-ۿ]/.test((p.before || b.text).slice(0, 40));
    const docRtl = p.docLang === 'ar' || /[؀-ۿ]/.test((p.docText || '').slice(0, 60));
    const bubble = { padding: '13px 16px', borderRadius: '4px 18px 18px 18px', background: '#ffffff', border: '1px solid #e5ebee', fontSize: 15, lineHeight: 1.6, color: '#1d3540' } as const;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        {b.label && <span className="cop-agent-chip">{b.label}</span>}
        {p.before && <div dir={rtl ? 'rtl' : 'ltr'} style={bubble}><Markdown text={p.before} />{!b.done && <span className="cop-caret" />}</div>}
        {p.docText && (
          <div style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #dfe7ea', boxShadow: '0 20px 44px -26px rgba(10,28,36,.4)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #eef2f4', background: '#f8fafb' }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84', flexShrink: 0 }}><FileText size={15} /></span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: "'Geist Mono',monospace", fontSize: 11.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#0e6f84', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.docTitle}</span>
              <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: '#e4f2f4', color: '#0e6f84' }}>{p.docLang.toUpperCase()}</span>
              <button type="button" onClick={() => copyDoc(p.docTitle, p.docText)} className="cop-btn"><Copy size={13} />{t('copilot_copy')}</button>
            </div>
            <div dir={docRtl ? 'rtl' : 'ltr'} style={{ padding: '22px 26px', fontFamily: "Georgia,'Times New Roman',serif", fontSize: 14.5, lineHeight: 1.75, color: '#1d3540', whiteSpace: 'pre-wrap' }}>{p.docText}</div>
          </div>
        )}
        {p.after && <div dir={rtl ? 'rtl' : 'ltr'} style={{ ...bubble, borderRadius: 18 }}><Markdown text={p.after} /></div>}
      </div>
    );
  };

  const renderConfirm = (b: Extract<Block, { k: 'confirm' }>, live: boolean) => {
    const done = b.state !== 'pending';
    const tone = b.danger ? { c: '#a33a28', bg: '#fbe9e6', br: '#f0c9c0' } : { c: '#0e6f84', bg: '#f2f9fa', br: '#cfe8ec' };
    return (
      <div className="cop-confirm" style={{ borderColor: done ? '#e2e8eb' : tone.br, background: done ? '#fafbfc' : tone.bg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', color: done ? (b.state === 'approved' ? '#16a06b' : '#7d8f97') : tone.c, flexShrink: 0, border: `1px solid ${tone.br}` }}>
            {done ? (b.state === 'approved' ? <Check size={17} /> : <X size={17} />) : b.danger ? <CircleAlert size={17} /> : <ShieldCheck size={17} />}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: done ? '#7d8f97' : tone.c }}>
              {done ? t(b.state === 'approved' ? 'cop_approved' : 'cop_declined') : t(b.danger ? 'cop_confirm_danger' : 'cop_confirm_title')} · {b.label}
            </div>
            <div style={{ marginTop: 3, fontSize: 15, fontWeight: 600, color: '#0a1c24' }}>{b.summary}</div>
          </div>
        </div>
        {b.details.length > 0 && (
          <dl className="cop-details">
            {b.details.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{String(v ?? '—')}</dd></div>)}
          </dl>
        )}
        {!done && live && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => answer(true)} className="cop-btn cop-btn-go" style={b.danger ? { background: '#df5740' } : undefined}><Check size={15} />{t('cop_approve')}</button>
            <button type="button" onClick={() => answer(false)} className="cop-btn"><X size={15} />{t('cop_decline')}</button>
          </div>
        )}
      </div>
    );
  };

  const renderTurn = (turn: Turn, idx: number) => {
    if (turn.role === 'user') return (
      <RV key={turn.id} variant="up" style={{ alignSelf: 'flex-end', maxWidth: '78%', padding: '12px 16px', borderRadius: '18px 18px 4px 18px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap', boxShadow: '0 10px 24px -14px rgba(14,111,132,.7)' }}>{turn.text}</RV>
    );
    const isLast = idx === turns.length - 1;
    // consecutive tool rows are drawn as one steps list
    const out: ReactNode[] = [];
    let steps: Extract<Block, { k: 'tool' }>[] = [];
    const flush = (key: string) => {
      if (!steps.length) return;
      out.push(
        <ul key={key} className="cop-steps">
          {steps.map(s => (
            <li key={s.id} className={s.status}>
              <span className="cop-step-ic">{s.status === 'running' ? (turn.status === 'awaiting' ? <ShieldCheck size={12} /> : <Loader2 size={13} className="cop-spin" />) : s.status === 'ok' ? <Check size={13} /> : s.status === 'cancelled' ? <RotateCcw size={12} /> : <CircleAlert size={13} />}</span>
              <span className="cop-step-l">{s.label}</span>
              {s.write && <span className="cop-step-w">{t('cop_action')}</span>}
              {s.status === 'ok' && /^\d+$/.test(s.summary) && <span className="cop-step-s">{s.summary}</span>}
              {s.status === 'error' && <span className="cop-step-s err" title={s.summary}>{s.summary}</span>}
              {s.status === 'cancelled' && <span className="cop-step-s">{t('cop_declined')}</span>}
            </li>
          ))}
        </ul>,
      );
      steps = [];
    };
    let routed = '';
    turn.blocks.forEach((b, i) => {
      if (b.k === 'tool') { steps.push(b); return; }
      flush(`s${i}`);
      if (b.k === 'route') { routed = b.label; out.push(<span key={i} className="cop-route"><Zap size={11} />{b.label}</span>); }
      else if (b.k === 'text') out.push(<div key={b.id + i}>{renderText(b.label === routed ? { ...b, label: '' } : b)}</div>);
      else if (b.k === 'confirm') out.push(<div key={b.callId}>{renderConfirm(b, isLast && turn.status === 'awaiting')}</div>);
      else out.push(<div key={i} className="cop-error"><CircleAlert size={15} />{errText(b)}</div>);
    });
    flush('end');
    const hasText = turn.blocks.some(b => b.k === 'text');
    return (
      <RV key={turn.id} variant="up" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: '94%' }}>
        <img src="/wedy-avatar.png" alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#e4f2f4', border: '2px solid #ffffff', boxShadow: '0 4px 10px -4px rgba(10,28,36,.3)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, flex: 1 }}>
          {out}
          {turn.status === 'running' && !hasText && (
            <div className="cop-working">
              <span style={{ display: 'flex', gap: 4 }}>{[0, 1, 2].map(k => <span key={k} className="wedy-dot" style={{ ['--delay' as string]: `${k * 0.15}s`, width: 6, height: 6, borderRadius: '50%', background: '#16b6c8' }} />)}</span>
              <span>{t('cop_working')}</span>
            </div>
          )}
          {turn.links.length > 0 && turn.status !== 'running' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {turn.links.map(l => <Link key={l.path} to={l.path} className="cop-link"><ExternalLink size={13} />{l.label}</Link>)}
            </div>
          )}
        </div>
      </RV>
    );
  };

  const agents = agentsQ.data ?? [];
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f6f7', backgroundImage: 'radial-gradient(#dde5e8 1px,transparent 1px)', backgroundSize: '22px 22px' }}>
      {/* ── Header ── */}
      <div className="cop-head" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', background: 'rgba(255,255,255,.86)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8eb', flexWrap: 'wrap' }}>
        <span style={{ position: 'relative', flexShrink: 0 }}>
          <img src="/wedy-avatar.png" alt="" style={{ display: 'block', width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />
          <span style={{ position: 'absolute', right: 0, bottom: 0, width: 11, height: 11, borderRadius: '50%', background: '#16a06b', border: '2px solid #ffffff' }} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{t('copilot_title')}</div>
          <div style={{ fontSize: 12.5, color: '#52646d', whiteSpace: 'nowrap' }}>{agents.length ? tf(t('cop_subtitle'), { n: agents.length - 1 }) : t('cop_subtitle_plain')}</div>
        </div>
        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={toggleAuto} className={`cop-auto${auto ? ' on' : ''}`} title={t('cop_auto_help')} aria-pressed={auto}>
            <span className="cop-switch"><span /></span>{t('cop_auto')}
          </button>
          <button type="button" onClick={() => setCapOpen(true)} className="cop-btn" aria-label={t('cop_capabilities')} title={t('cop_capabilities')}><Info size={14} /><span className="cop-lbl">{t('cop_capabilities')}</span></button>
          {!empty && <button type="button" onClick={reset} className="cop-btn" aria-label={t('copilot_new_chat')} title={t('copilot_new_chat')}><Plus size={14} /><span className="cop-lbl">{t('copilot_new_chat')}</span></button>}
          <div style={{ display: 'flex', padding: 3, borderRadius: 11, background: '#f3f6f7', border: '1px solid #e2e8eb' }}>
            {(['fr', 'ar', 'en'] as Lang[]).map(l => (
              <button key={l} type="button" onClick={() => setLang(l)} aria-label={t('copilot_lang_label')} style={{ position: 'relative', border: 'none', background: 'transparent', padding: '5px 11px', borderRadius: 8, fontFamily: l === 'ar' ? "'Noto Kufi Arabic',sans-serif" : 'inherit', fontSize: 12.5, fontWeight: 600, color: '#52646d', cursor: 'pointer' }}>
                {lang === l && <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: '#ffffff', boxShadow: '0 1px 3px rgba(10,28,36,.12)' }} />}
                <span style={{ position: 'relative' }}>{l === 'fr' ? 'FR' : l === 'ar' ? 'ع' : 'EN'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Conversation ── */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 32px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}>
          {empty && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px 0' }}>
              <RV variant="scale" style={{ position: 'relative', width: 104, height: 104 }}>
                <span className="wedy-spin-slow" style={{ ['--dur' as string]: '8s', position: 'absolute', inset: -14, borderRadius: '50%', background: 'conic-gradient(from 0deg,rgba(22,182,200,0) 0deg,rgba(22,182,200,0) 250deg,rgba(22,182,200,.9) 330deg,rgba(109,90,214,.9) 358deg,rgba(109,90,214,0) 360deg)', WebkitMask: 'radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2px))', mask: 'radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2px))' }} />
                <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(22,182,200,.5)' }} />
                <img src="/wedy-avatar.png" alt={t('copilot_title')} style={{ position: 'relative', display: 'block', width: 104, height: 104, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4', border: '3px solid #ffffff', boxShadow: '0 20px 50px -18px rgba(14,111,132,.6)' }} />
              </RV>
              <RV as="h1" variant="up" delay={120} style={{ margin: '26px 0 0', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(28px,3.4vw,42px)', lineHeight: 1.05, letterSpacing: '-.045em' }}>
                {firstName ? tf(t('copilot_greeting_pre_name'), { name: firstName }) : t('copilot_greeting_pre')}{' '}
                <span className="wedy-shimmer" style={{ background: 'linear-gradient(90deg,#0e6f84,#16b6c8 30%,#6d5ad6 60%,#0e6f84)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }}>{t('copilot_greeting_highlight')}</span>
              </RV>
              <RV as="p" variant="up" delay={200} style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.55, color: '#52646d', maxWidth: 560 }}>{t('copilot_greeting_sub')}</RV>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,255px),1fr))', gap: 12, width: '100%', marginTop: 30, textAlign: 'start' }}>
                {agents.filter(a => a.examples.length).map((a, i) => {
                  const ui = AGENT_UI[a.name] ?? AGENT_UI.general;
                  const Icon = ui.icon;
                  return (
                    <RV key={a.name} as="div" variant="up" delay={260 + i * 50} className="cop-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ui.bg, color: ui.color, flexShrink: 0 }}><Icon size={17} /></span>
                        <span style={{ fontSize: 14.5, fontWeight: 600, color: '#0a1c24' }}>{a.label}</span>
                        <span className="cop-n">{a.tools.length || ''}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                        {a.examples.map(ex => <button key={ex} type="button" onClick={() => ask(ex)} className="cop-ex">{ex}</button>)}
                      </div>
                    </RV>
                  );
                })}
              </div>
            </div>
          )}
          {turns.map(renderTurn)}
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{ padding: '0 24px 18px' }}>
        <div style={{ position: 'relative', maxWidth: 860, margin: '0 auto' }}>
          {cmdList.length > 0 && (
            <RV variant="up" style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', padding: 6, borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 24px 50px -20px rgba(10,28,36,.35)', zIndex: 5 }}>
              {cmdList.map(c => (
                <button key={c.cmd} type="button" onClick={() => c.cmd === '/aide' ? ask(c.text) : setInputAuto(c.text, true)} className="cop-cmd" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: 'none', borderRadius: 11, background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: '#0a1c24', textAlign: 'start', cursor: 'pointer' }}>
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12.5, padding: '2px 8px', borderRadius: 6, background: '#e4f2f4', color: '#0e6f84' }}>{c.cmd}</span>
                  <span style={{ color: '#52646d' }}>{c.label}</span>
                </button>
              ))}
            </RV>
          )}
          {awaiting && <div className="cop-await"><ClipboardList size={14} />{t('cop_await')}</div>}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 10px 10px 16px', borderRadius: 20, background: '#ffffff', border: '1px solid #d6dfe3', boxShadow: '0 20px 44px -26px rgba(10,28,36,.4)', opacity: awaiting ? 0.6 : 1 }}>
            <textarea
              ref={inputRef} rows={1} value={input} disabled={awaiting}
              onChange={e => setInputAuto(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (cmdList.length && slash) setInputAuto(cmdList[0].text, true);
                  else ask(input);
                }
              }}
              placeholder={t('copilot_ph2')}
              style={{ flex: 1, minWidth: 0, resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.5, color: '#0a1c24', padding: '9px 0', maxHeight: 180, overflowY: 'hidden' }}
            />
            {running ? (
              <button type="button" onClick={stop} aria-label={t('cop_stop')} title={t('cop_stop')} style={{ width: 44, height: 44, border: 'none', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1c24', color: '#ffffff', cursor: 'pointer', flexShrink: 0 }}><Square size={15} fill="#fff" /></button>
            ) : (
              <button type="button" onClick={() => ask(input)} disabled={!input.trim() || busy} aria-label={t('copilot_send')} style={{ width: 44, height: 44, border: 'none', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', cursor: input.trim() && !busy ? 'pointer' : 'not-allowed', flexShrink: 0, boxShadow: '0 8px 20px -8px rgba(22,182,200,.8)' }}>
                <ArrowUp size={19} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#5f7079' }}>{auto ? t('cop_auto_on_note') : t('copilot_disclaimer')}</div>
        </div>
      </div>

      {/* ── What Copilot can do ── */}
      <Drawer open={capOpen} onClose={() => setCapOpen(false)} width={560} icon={<Bot size={18} />} title={t('cop_capabilities')} subtitle={t('cop_cap_sub')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#52646d' }}>{t('cop_cap_intro')}</p>
          {agents.map(a => {
            const ui = AGENT_UI[a.name] ?? AGENT_UI.general;
            const Icon = ui.icon;
            return (
              <div key={a.name} style={{ padding: 14, borderRadius: 16, border: '1px solid #e2e8eb', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ui.bg, color: ui.color }}><Icon size={16} /></span>
                  <b style={{ fontSize: 14.5 }}>{a.label}</b>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {a.tools.length === 0 && <span className="cop-tool">{t('cop_cap_knowledge')}</span>}
                  {a.tools.map(tl => <span key={tl.name} className={`cop-tool${tl.write ? ' w' : ''}${tl.danger ? ' d' : ''}`}>{tl.write && <Sparkles size={10} />}{tl.label}</span>)}
                </div>
              </div>
            );
          })}
          <p style={{ margin: 0, fontSize: 12.5, color: '#5f7079', display: 'flex', gap: 8, alignItems: 'flex-start' }}><UserCheck size={14} style={{ flexShrink: 0, marginTop: 2 }} />{t('cop_cap_note')}</p>
        </div>
      </Drawer>
    </div>
  );
}
