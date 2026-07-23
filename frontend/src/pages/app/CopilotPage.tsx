import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, RefreshCw, BarChart2, FileEdit, CalendarDays, Wand2, Users, TrendingUp } from 'lucide-react';
import { sendCopilotMessage, getApiError, type ChatMessage } from '@/services/api';
import { toast } from 'sonner';
import { useLang } from '../../lib/lang';

// ── Minimal markdown renderer ─────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MdTable({ rows }: { rows: string[][] }) {
  if (rows.length < 2) return null;
  const headers = rows[0];
  const body    = rows.slice(2); // skip separator row
  return (
    <div style={{ overflowX: 'auto', margin: '10px 0', borderRadius: 8, border: '1px solid var(--line)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>
                {h.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: ri < body.length - 1 ? '1px solid var(--line)' : 'none' }}>
              {row.map((cell, ci) => {
                const v = cell.trim();
                const isHighCrit = v === 'Élevée' || v === 'Critique' || v === 'High';
                const isNum = /^\d+/.test(v);
                return (
                  <td key={ci} style={{ padding: '8px 12px', color: isHighCrit ? 'var(--danger)' : isNum ? 'var(--warn)' : 'var(--ink)', fontWeight: isHighCrit ? 600 : 400 }}>
                    {renderInline(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RenderContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect table block
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.map(l => l.replace(/^\||\|$/g, '').split('|'));
      blocks.push(<MdTable key={i} rows={rows} />);
      continue;
    }

    // Empty line = spacer
    if (!line.trim()) {
      if (blocks.length > 0) blocks.push(<div key={`sp-${i}`} style={{ height: 6 }} />);
      i++;
      continue;
    }

    // Regular text
    blocks.push(
      <p key={i} style={{ margin: 0, lineHeight: 1.65 }}>{renderInline(line)}</p>
    );
    i++;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{blocks}</div>;
}

// ── Avatar ─────────────────────────────────────────────────────────
function CopilotAvatar({ size = 34 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(14,111,132,.3)',
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 20 20" fill="none">
        <path d="M3 15 L10 9 L17 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="3"  cy="15" r="1.8" fill="#fff" />
        <circle cx="10" cy="9"  r="2.1" fill="rgba(255,255,255,.8)" />
        <circle cx="17" cy="4"  r="2.7" fill="#fff" />
      </svg>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────
function MsgBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',           // always row — no reversal
      gap: 10,
      marginBottom: 18,
      alignItems: 'flex-start',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'riseIn .25s cubic-bezier(.2,.8,.2,1) both',
    }}>
      {/* AI avatar — left side, only for bot messages */}
      {!isUser && <CopilotAvatar size={32} />}

      <div style={{
        maxWidth: '72%',
        padding: isUser ? '11px 16px' : '14px 18px',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        background: isUser ? 'var(--grad)' : 'var(--surface-2)',
        color: isUser ? '#fff' : 'var(--ink)',
        border: isUser ? 'none' : '1px solid var(--line)',
        fontSize: 13.5,
        lineHeight: 1.65,
        boxShadow: isUser ? '0 4px 16px rgba(14,111,132,.22)' : 'var(--shadow-sm)',
        wordBreak: 'break-word',
      }}>
        <RenderContent content={msg.content} />
      </div>

      {/* User avatar — right side, only for user messages */}
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--primary-soft)', border: '1px solid var(--primary-line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)',
        }}>
          <Users size={14} />
        </div>
      )}
    </div>
  );
}

// ── Typing indicator ───────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-start', animation: 'fadeIn .2s ease' }}>
      <CopilotAvatar size={32} />
      <div style={{ padding: '12px 16px', borderRadius: '4px 18px 18px 18px', background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--primary)',
              opacity: 0.4,
              animation: `pulseDot 1.1s ${i * 0.18}s infinite ease-in-out`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Suggestion chip ────────────────────────────────────────────────
function SuggChip({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 14px', borderRadius: 999,
        background: 'var(--surface)', border: '1px solid var(--line)',
        color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'background .12s, border-color .12s, color .12s',
      }}
      onMouseEnter={e => {
        const b = e.currentTarget;
        b.style.background = 'var(--primary-soft)';
        b.style.borderColor = 'var(--primary-line)';
        b.style.color = 'var(--primary)';
      }}
      onMouseLeave={e => {
        const b = e.currentTarget;
        b.style.background = 'var(--surface)';
        b.style.borderColor = 'var(--line)';
        b.style.color = 'var(--ink-2)';
      }}
    >
      <span style={{ display: 'flex', color: 'var(--primary)' }}>{icon}</span>
      {label}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function CopilotPage() {
  const { t } = useLang();

  const SUGGESTIONS = [
    { label: t('copilot_sugg_1'), icon: <BarChart2 size={13} /> },
    { label: t('copilot_sugg_2'), icon: <FileEdit size={13} /> },
    { label: t('copilot_sugg_3'), icon: <CalendarDays size={13} /> },
    { label: t('copilot_sugg_4'), icon: <TrendingUp size={13} /> },
    { label: t('copilot_sugg_5'), icon: <Wand2 size={13} /> },
    { label: t('copilot_sugg_6'), icon: <Users size={13} /> },
  ];

  const INIT: ChatMessage = { role: 'assistant', content: t('copilot_init_msg') };

  const [messages, setMessages]   = useState<ChatMessage[]>([INIT]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const reset = () => {
    setMessages([{ role: 'assistant', content: t('copilot_init_msg') }]);
    setInput('');
  };

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    const userMsg: ChatMessage = { role: 'user', content };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    try {
      const res = await sendCopilotMessage(history.slice(-10));
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err: unknown) {
      toast.error(getApiError(err, 'Impossible de contacter le backend.'));
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const showSuggestions = messages.length <= 1 && !loading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '14px 28px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CopilotAvatar size={40} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', letterSpacing: '-.02em' }}>
              {t('ai_copilot')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', animation: 'pulseDot 2s infinite' }} />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t('copilot_header_sub')}</span>
            </div>
          </div>
        </div>
        <button
          onClick={reset}
          title={t('copilot_new_chat')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)',
            background: 'var(--surface-2)', border: '1px solid var(--line)',
            borderRadius: 9, padding: '7px 14px', cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        >
          <Plus size={13} /> {t('copilot_new_chat')}
        </button>
      </div>

      {/* ── Messages area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: 'var(--bg)' }} className="scroll">

        {/* Welcome empty state */}
        {messages.length === 1 && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 0 32px' }}>
            <div style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 16, background: 'var(--grad)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 4px 20px rgba(14,111,132,.25)' }}>
              <svg width={26} height={26} viewBox="0 0 20 20" fill="none">
                <path d="M3 15 L10 9 L17 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="3"  cy="15" r="1.8" fill="#fff" />
                <circle cx="10" cy="9"  r="2.1" fill="rgba(255,255,255,.8)" />
                <circle cx="17" cy="4"  r="2.7" fill="#fff" />
              </svg>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.02em', marginBottom: 6 }}>
              {t('ai_copilot')}
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 340, margin: '0 auto' }}>
              {t('copilot_header_sub')}
            </p>
          </div>
        )}

        {messages.map((msg, i) => <MsgBubble key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestion chips ── */}
      {showSuggestions && (
        <div style={{
          padding: '0 32px 16px',
          display: 'flex', gap: 8, flexWrap: 'wrap',
          animation: 'fadeIn .3s ease',
        }}>
          {SUGGESTIONS.map(s => (
            <SuggChip key={s.label} label={s.label} icon={s.icon} onClick={() => send(s.label)} />
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        padding: '12px 28px 20px',
        borderTop: '1px solid var(--line)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '10px 10px 10px 16px',
          transition: 'border-color .15s, box-shadow .15s',
        }}
          onFocusCapture={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px var(--primary-soft)';
          }}
          onBlurCapture={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }}
        >
          <textarea
            ref={textareaRef}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none',
              background: 'transparent', minHeight: 24, maxHeight: 120,
              fontSize: 13.5, fontFamily: 'var(--font-body)',
              color: 'var(--ink)', padding: 0, lineHeight: 1.6,
            }}
            placeholder={t('copilot_ph')}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', flexShrink: 0,
              background: input.trim() && !loading ? 'var(--grad)' : 'var(--line)',
              color: input.trim() && !loading ? '#fff' : 'var(--ink-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'background .15s',
              boxShadow: input.trim() && !loading ? '0 2px 8px rgba(14,111,132,.3)' : 'none',
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 7, textAlign: 'center' }}>
          {t('copilot_disclaimer')}
        </p>
      </div>
    </div>
  );
}
