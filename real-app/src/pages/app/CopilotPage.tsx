import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { sendCopilotMessage, type ChatMessage } from '../../lib/api';
import { toast } from 'sonner';
import { useLang } from '../../lib/lang';

function MsgBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', gap: 10, marginBottom: 16,
      alignItems: 'flex-start',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--bg-muted)' : 'var(--primary)',
        border: isUser ? '1px solid var(--border)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser
          ? <User size={14} style={{ color: 'var(--fg-muted)' }} />
          : <Bot size={14} style={{ color: '#fff' }} />}
      </div>
      <div style={{
        maxWidth: '72%', padding: '11px 15px',
        borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        background: isUser ? 'var(--primary)' : 'var(--bg-elev)',
        color: isUser ? '#fff' : 'var(--fg)',
        border: isUser ? 'none' : '1px solid var(--border)',
        fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Bot size={14} style={{ color: '#fff' }} />
      </div>
      <div style={{ padding: '12px 16px', borderRadius: '4px 12px 12px 12px', background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-muted)',
              animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CopilotPage() {
  const { t } = useLang();

  const SUGGESTIONS = [
    t('copilot_sugg_1'),
    t('copilot_sugg_2'),
    t('copilot_sugg_3'),
    t('copilot_sugg_4'),
    t('copilot_sugg_5'),
    t('copilot_sugg_6'),
  ];

  const INIT: ChatMessage = {
    role: 'assistant',
    content: t('copilot_init_msg'),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([INIT]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const reset = () => setMessages([INIT]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');

    // Auto-resize textarea back
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg: ChatMessage = { role: 'user', content };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      // Only send last 10 messages to keep context manageable
      const contextMsgs = history.slice(-10);
      const res = await sendCopilotMessage(contextMsgs);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      const msg = detail || (err as { message?: string })?.message || 'Impossible de contacter le backend.';
      toast.error(msg);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <div style={{ padding: '0 0 0 0', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 0', borderBottom: '1px solid var(--border)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>{t('ai_copilot')}</h1>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('copilot_subtitle_full')}</p>
          </div>
          <button
            onClick={reset}
            title={t('copilot_new_chat')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)', background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 12px', cursor: 'pointer' }}
          >
            <RefreshCw size={12} /> {t('copilot_new_chat')}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }} className="scroll">
        {messages.map((msg, i) => <MsgBubble key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !loading && (
        <div style={{ padding: '0 28px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
              <Sparkles size={11} style={{ flexShrink: 0 }} /> {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 28px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-elev)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '8px 8px 8px 14px' }}>
          <textarea
            ref={textareaRef}
            className="input"
            style={{ flex: 1, resize: 'none', minHeight: 28, maxHeight: 120, border: 'none', padding: 0, background: 'transparent', boxShadow: 'none', outline: 'none' }}
            placeholder={t('copilot_ph')}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <Button
            onClick={() => send()}
            loading={loading}
            disabled={!input.trim()}
            style={{ height: 36, paddingInline: 14, flexShrink: 0 }}
          >
            <Send size={13} />
          </Button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 6, textAlign: 'center' }}>
          {t('copilot_disclaimer')}
        </p>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100% { transform:scale(0.6); opacity:0.4; } 40% { transform:scale(1); opacity:1; } }`}</style>
    </div>
  );
}
