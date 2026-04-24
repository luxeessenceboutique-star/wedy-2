import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { api } from '../../lib/api';

interface Msg { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = [
  'How many employees have expiring contracts this month?',
  'Generate a work certificate for an employee',
  'What documents do I need for hiring a new employee in Morocco?',
  'Summarize Moroccan labor law for probation periods',
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi! I'm Wedy Copilot, your AI HR assistant powered by Claude. I can help you understand Moroccan labor law, answer HR questions, and assist with document generation. What would you like to know?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content }]);
    setLoading(true);
    try {
      const res = await api.post<{ enhanced_content: string }>('/documents/ai/enhance', {
        document_content: content,
        document_type: 'HR Question',
        language: 'en',
        instructions: 'Answer this HR question as a helpful HR assistant. Respond concisely.',
      });
      setMessages(m => [...m, { role: 'assistant', content: res.data.enhanced_content }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "I'm sorry, I couldn't process that request. Please check that the backend API is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)' }}>
      <PageHeader title="AI Copilot" subtitle="Ask anything about HR, labor law, or your company data." />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 16 }}>
        {/* Chat area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }} className="scroll">
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} style={{ color: '#fff' }} />
                </div>
              )}
              <div style={{
                maxWidth: '75%', padding: '12px 16px', borderRadius: 'var(--radius-lg)',
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-elev)',
                color: msg.role === 'user' ? '#fff' : 'var(--fg)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                  <User size={16} style={{ color: 'var(--fg-muted)' }} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={16} style={{ color: '#fff' }} />
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fg-muted)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => send(s)}>
                <Sparkles size={11} /> {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            className="input"
            style={{ flex: 1, resize: 'none', minHeight: 44, maxHeight: 120 }}
            placeholder="Ask about HR policies, labor law, document help…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
          />
          <Button onClick={() => send()} loading={loading} style={{ height: 44, paddingInline: 16, flexShrink: 0 }}>
            <Send size={14} />
          </Button>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </div>
  );
}
