// Redesigned from design_handoff_wedy/design/Wedy Copilot.dc.html.
// The reference's own 280px dark sidebar is a known leftover (per the handoff README: "Dashboard and
// Copilot embed an older inline sidebar — use the shared one"), so this page only renders the chat
// column; the real Sidebar/Topbar come from AppShell. Data grounding is server-side (live DB context
// injected into the system prompt), unlike the reference's client-side mock "tools".
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp, BarChart3, CalendarClock, Copy, FileText, Scale,
} from 'lucide-react';
import { RV } from '@/components/motion';
import { sendCopilotMessage, getApiError, type ChatMessage } from '@/services/api';
import { toast } from 'sonner';
import { useLang, type TKey } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { tf } from '@/lib/format';
import './CopilotPage.css';

type Lang = 'fr' | 'ar' | 'en';
const LANG_INSTRUCTION: Record<Lang, string | undefined> = {
  fr: undefined,
  ar: 'Réponds en arabe (العربية), quelle que soit la langue du message.',
  en: 'Réponds en anglais, quelle que soit la langue du message.',
};

const CMDS = (t: (k: TKey) => string) => [
  { cmd: '/doc', label: t('copilot_cmd_doc'), text: t('copilot_cmd_doc_text') },
  { cmd: '/emp', label: t('copilot_cmd_emp'), text: t('copilot_cmd_emp_text') },
  { cmd: '/congé', label: t('copilot_cmd_conge'), text: t('copilot_cmd_conge_text') },
  { cmd: '/aide', label: t('copilot_cmd_aide'), text: t('copilot_cmd_aide_text') },
];

/** The live backend has no document-tag convention yet, but parse it defensively: if the model
 * ever wraps a document in <document titre="…" langue="…">…</document>, render it as a card. */
function parseReply(text: string) {
  const m = text.match(/<document([^>]*)>([\s\S]*?)<\/document>/i);
  if (!m) return { before: text.trim(), after: '', docTitle: '', docLang: '', docText: '' };
  const attr = (k: string) => { const r = m[1].match(new RegExp(k + '\\s*=\\s*"([^"]*)"', 'i')); return r ? r[1] : ''; };
  const idx = m.index ?? 0;
  return {
    before: text.slice(0, idx).trim(), after: text.slice(idx + m[0].length).trim(),
    docTitle: attr('titre') || attr('title') || 'Document',
    docLang: (attr('langue') || attr('lang') || 'fr').toLowerCase(), docText: m[2].trim(),
  };
}

export default function CopilotPage() {
  const { t, lang: appLang } = useLang();
  const { user } = useAuth();
  const fullName = user?.full_name || (typeof user?.profile?.full_name === 'string' ? user.profile.full_name : '') || user?.email?.split('@')[0] || '';
  const firstName = fullName.split(/\s+/)[0] || '';
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [lang, setLang] = useState<Lang>(appLang === 'ar' ? 'ar' : appLang === 'en' ? 'en' : 'fr');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
  }, [msgs.length, thinking]);

  const setInputAuto = (v: string, focus?: boolean) => {
    setInput(v);
    requestAnimationFrame(() => {
      const ta = inputRef.current; if (!ta) return;
      ta.style.height = 'auto'; ta.style.height = Math.min(180, ta.scrollHeight) + 'px';
      if (focus) { ta.focus(); ta.setSelectionRange(v.length, v.length); }
    });
  };

  const ask = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    const history = [...msgs, { role: 'user' as const, content }];
    setMsgs(history);
    setInputAuto('');
    setThinking(true);
    try {
      const res = await sendCopilotMessage(history.slice(-12), LANG_INSTRUCTION[lang]);
      setMsgs(m => [...m, { role: 'assistant', content: res.reply }]);
    } catch (e: unknown) {
      toast.error(getApiError(e, t('copilot_err')));
      setMsgs(history.slice(0, -1));
    } finally {
      setThinking(false);
    }
  };

  const copyDoc = (title: string, text: string) => {
    navigator.clipboard.writeText(`${title}\n\n${text}`)
      .then(() => toast.success(t('copilot_copy_done')))
      .catch(() => toast.error(t('copilot_copy_fail')));
  };

  const slash = input.startsWith('/') && !input.includes(' ');
  const cmdList = slash ? CMDS(t).filter(c => c.cmd.startsWith(input.toLowerCase()) || input === '/') : [];
  const empty = msgs.length === 0 && !thinking;

  const SUGGESTIONS = [
    { icon: <FileText size={18} />, bg: '#e4f2f4', color: '#0e6f84', title: t('copilot_sug1_title'), sub: t('copilot_sug1_sub') },
    { icon: <Scale size={18} />, bg: '#ece9fb', color: '#6d5ad6', title: t('copilot_sug2_title'), sub: t('copilot_sug2_sub') },
    { icon: <BarChart3 size={18} />, bg: '#e1f5ec', color: '#16a06b', title: t('copilot_sug3_title'), sub: t('copilot_sug3_sub') },
    { icon: <CalendarClock size={18} />, bg: '#fbefda', color: '#b06b0c', title: t('copilot_sug4_title'), sub: t('copilot_sug4_sub') },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#f3f6f7', backgroundImage: 'radial-gradient(#dde5e8 1px,transparent 1px)', backgroundSize: '22px 22px' }}>
      {/* ── Chat header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', background: 'rgba(255,255,255,.86)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8eb' }}>
        <span style={{ position: 'relative', flexShrink: 0 }}>
          <img src="/wedy-avatar.png" alt="" style={{ display: 'block', width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />
          <span style={{ position: 'absolute', right: 0, bottom: 0, width: 11, height: 11, borderRadius: '50%', background: '#16a06b', border: '2px solid #ffffff' }} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{t('copilot_title')}</div>
          <div style={{ fontSize: 12.5, color: '#52646d', whiteSpace: 'nowrap' }}>{t('copilot_subtitle_claude')}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12.5, color: '#5f7079', whiteSpace: 'nowrap' }}>{t('copilot_lang_label')}</span>
          <div style={{ display: 'flex', padding: 3, borderRadius: 11, background: '#f3f6f7', border: '1px solid #e2e8eb' }}>
            {(['fr', 'ar', 'en'] as Lang[]).map(l => (
              <button key={l} type="button" onClick={() => setLang(l)} style={{ position: 'relative', border: 'none', background: 'transparent', padding: '5px 11px', borderRadius: 8, fontFamily: l === 'ar' ? "'Noto Kufi Arabic',sans-serif" : 'inherit', fontSize: 12.5, fontWeight: 600, color: '#52646d', cursor: 'pointer' }}>
                {lang === l && <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: '#ffffff', boxShadow: '0 1px 3px rgba(10,28,36,.12)' }} />}
                <span style={{ position: 'relative' }}>{l === 'fr' ? 'FR' : l === 'ar' ? 'ع' : 'EN'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px 32px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}>
          {empty && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 0' }}>
              <RV variant="scale" style={{ position: 'relative', width: 120, height: 120 }}>
                <span className="wedy-spin-slow" style={{ ['--dur' as string]: '8s', position: 'absolute', inset: -14, borderRadius: '50%', background: 'conic-gradient(from 0deg,rgba(22,182,200,0) 0deg,rgba(22,182,200,0) 250deg,rgba(22,182,200,.9) 330deg,rgba(109,90,214,.9) 358deg,rgba(109,90,214,0) 360deg)', WebkitMask: 'radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2px))', mask: 'radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2px))' }} />
                <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(22,182,200,.5)' }} />
                <img src="/wedy-avatar.png" alt={t('copilot_title')} style={{ position: 'relative', display: 'block', width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4', border: '3px solid #ffffff', boxShadow: '0 20px 50px -18px rgba(14,111,132,.6)' }} />
              </RV>
              <RV as="h1" variant="up" delay={120} style={{ margin: '30px 0 0', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3.6vw,44px)', lineHeight: 1.05, letterSpacing: '-.045em' }}>
                {firstName ? tf(t('copilot_greeting_pre_name'), { name: firstName }) : t('copilot_greeting_pre')}{' '}
                <span className="wedy-shimmer" style={{ background: 'linear-gradient(90deg,#0e6f84,#16b6c8 30%,#6d5ad6 60%,#0e6f84)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }}>{t('copilot_greeting_highlight')}</span>
              </RV>
              <RV as="p" variant="up" delay={200} style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.55, color: '#52646d', maxWidth: 520 }}>{t('copilot_greeting_sub')}</RV>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 12, width: '100%', marginTop: 34, textAlign: 'left' }}>
                {SUGGESTIONS.map((s, i) => (
                  <RV key={i} as="button" variant="up" delay={260 + i * 60} onClick={() => ask(s.sub)} className="cop-sugg" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 16, border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg, color: s.color, flexShrink: 0 }}>{s.icon}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: '#0a1c24' }}>{s.title}</span>
                      <span style={{ fontSize: 13, lineHeight: 1.45, color: '#52646d' }}>{s.sub}</span>
                    </span>
                  </RV>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) => {
            if (m.role === 'user') return (
              <RV key={i} variant="up" style={{ alignSelf: 'flex-end', maxWidth: '78%', padding: '12px 16px', borderRadius: '18px 18px 4px 18px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap', boxShadow: '0 10px 24px -14px rgba(14,111,132,.7)' }}>{m.content}</RV>
            );
            const p = parseReply(m.content);
            const rtl = lang === 'ar' || /[؀-ۿ]/.test((p.before || '').slice(0, 40));
            const docRtl = p.docLang === 'ar' || /[؀-ۿ]/.test((p.docText || '').slice(0, 60));
            return (
              <RV key={i} variant="up" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: '92%' }}>
                <img src="/wedy-avatar.png" alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#e4f2f4', border: '2px solid #ffffff', boxShadow: '0 4px 10px -4px rgba(10,28,36,.3)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, flex: 1 }}>
                  {p.before && <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '13px 16px', borderRadius: '4px 18px 18px 18px', background: '#ffffff', border: '1px solid #e5ebee', fontSize: 15, lineHeight: 1.6, color: '#1d3540', whiteSpace: 'pre-wrap' }}>{p.before}</div>}
                  {p.docText && (
                    <RV variant="scale" style={{ borderRadius: 16, background: '#ffffff', border: '1px solid #dfe7ea', boxShadow: '0 20px 44px -26px rgba(10,28,36,.4)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #eef2f4', background: '#f8fafb' }}>
                        <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84', flexShrink: 0 }}><FileText size={15} /></span>
                        <span style={{ flex: 1, minWidth: 0, fontFamily: "'Geist Mono',monospace", fontSize: 11.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#0e6f84', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.docTitle}</span>
                        <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: '#e4f2f4', color: '#0e6f84' }}>{p.docLang.toUpperCase()}</span>
                        <button type="button" onClick={() => copyDoc(p.docTitle, p.docText)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid #dfe7ea', background: '#ffffff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#33474f', cursor: 'pointer' }}>
                          <Copy size={13} />{t('copilot_copy')}
                        </button>
                      </div>
                      <div dir={docRtl ? 'rtl' : 'ltr'} style={{ padding: '22px 26px', fontFamily: "Georgia,'Times New Roman',serif", fontSize: 14.5, lineHeight: 1.75, color: '#1d3540', whiteSpace: 'pre-wrap' }}>{p.docText}</div>
                    </RV>
                  )}
                  {p.after && <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '13px 16px', borderRadius: 18, background: '#ffffff', border: '1px solid #e5ebee', fontSize: 15, lineHeight: 1.6, color: '#1d3540', whiteSpace: 'pre-wrap' }}>{p.after}</div>}
                </div>
              </RV>
            );
          })}

          {thinking && (
            <RV variant="up" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
                <span className="wedy-spin" style={{ ['--dur' as string]: '1.4s', position: 'absolute', inset: -4, borderRadius: '50%', background: 'conic-gradient(from 0deg,rgba(22,182,200,0),#16b6c8,#6d5ad6,rgba(109,90,214,0))', WebkitMask: 'radial-gradient(farthest-side,transparent calc(100% - 2.5px),#000 calc(100% - 2px))', mask: 'radial-gradient(farthest-side,transparent calc(100% - 2.5px),#000 calc(100% - 2px))' }} />
                <img src="/wedy-avatar.png" alt="" style={{ position: 'relative', display: 'block', width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px', borderRadius: '4px 18px 18px 18px', background: '#ffffff', border: '1px solid #e5ebee' }}>
                <span style={{ display: 'flex', gap: 4 }}>
                  <span className="wedy-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#16b6c8' }} />
                  <span className="wedy-dot" style={{ ['--delay' as string]: '.15s', width: 6, height: 6, borderRadius: '50%', background: '#16b6c8' }} />
                  <span className="wedy-dot" style={{ ['--delay' as string]: '.3s', width: 6, height: 6, borderRadius: '50%', background: '#16b6c8' }} />
                </span>
                <span style={{ fontSize: 13.5, color: '#52646d' }}>{t('copilot_thinking')}</span>
              </div>
            </RV>
          )}
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{ padding: '0 24px 18px' }}>
        <div style={{ position: 'relative', maxWidth: 820, margin: '0 auto' }}>
          {cmdList.length > 0 && (
            <RV variant="up" style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', padding: 6, borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 24px 50px -20px rgba(10,28,36,.35)', zIndex: 5 }}>
              {cmdList.map(c => (
                <button key={c.cmd} type="button" onClick={() => c.cmd === '/aide' ? ask(c.text) : setInputAuto(c.text, true)} className="cop-cmd" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: 'none', borderRadius: 11, background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: '#0a1c24', textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12.5, padding: '2px 8px', borderRadius: 6, background: '#e4f2f4', color: '#0e6f84' }}>{c.cmd}</span>
                  <span style={{ color: '#52646d' }}>{c.label}</span>
                </button>
              ))}
            </RV>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 10px 10px 16px', borderRadius: 20, background: '#ffffff', border: '1px solid #d6dfe3', boxShadow: '0 20px 44px -26px rgba(10,28,36,.4)' }}>
            <textarea
              ref={inputRef} rows={1} value={input}
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
            <button type="button" onClick={() => ask(input)} disabled={!input.trim() || thinking} aria-label={t('copilot_send')} style={{ width: 44, height: 44, border: 'none', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed', flexShrink: 0, boxShadow: '0 8px 20px -8px rgba(22,182,200,.8)' }}>
              <ArrowUp size={19} strokeWidth={2.2} />
            </button>
          </div>
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#5f7079' }}>{t('copilot_disclaimer')}</div>
        </div>
      </div>
    </div>
  );
}
