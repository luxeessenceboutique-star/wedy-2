// Client of the multi-agent Copilot: POST /api/copilot/agent streams Server-Sent Events (progress, tokens, confirmations).
import { api, BASE, TOKEN_KEY } from '@/services/api';

export type AgentEvent =
  | { t: 'run'; thread_id: string }
  | { t: 'route'; agent: string; label: string; instruction?: string }
  | { t: 'token'; id: string; text: string }
  | { t: 'tool_call'; id: string; message_id?: string; agent: string; tool: string; write: boolean; label: string; args?: Record<string, unknown> }
  | { t: 'tool_result'; id: string; tool: string; ok: boolean; summary: string }
  | { t: 'link'; path: string; label: string }
  | { t: 'confirm'; call_id: string; tool: string; agent: string; label: string; summary: string; details: [string, unknown][]; danger: boolean }
  | { t: 'message'; id: string; agent: string; agent_label: string; text: string }
  | { t: 'error'; code: string; message: string }
  | { t: 'done'; status: 'complete' | 'awaiting_confirmation' | 'error' };

export type AgentRequest = {
  thread_id: string; message?: string; resume?: { approve: boolean }; lang: string; auto_approve: boolean;
  history?: { role: 'user' | 'assistant'; content: string }[];
};

const post = (body: AgentRequest, signal: AbortSignal) =>
  fetch(`${BASE}/copilot/agent`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
    body: JSON.stringify(body),
  });

/** Runs one turn and calls `onEvent` for each event. Resolves when the stream ends; rejects on network / HTTP errors. */
export async function runAgent(body: AgentRequest, onEvent: (e: AgentEvent) => void, signal: AbortSignal): Promise<void> {
  let res = await post(body, signal);
  if (res.status === 401) {
    try { await api.get('/auth/me'); } catch { /* the interceptor renews the session or asks to sign in again */ }
    res = await post(body, signal);
  }
  if (!res.ok || !res.body) {
    let detail = '';
    try { detail = (await res.json())?.detail ?? ''; } catch { /* not JSON */ }
    throw Object.assign(new Error(detail || `HTTP ${res.status}`), { status: res.status });
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const line = chunk.split('\n').find(l => l.startsWith('data: '));
      if (!line) continue;
      try { onEvent(JSON.parse(line.slice(6)) as AgentEvent); } catch { /* ignore a malformed event */ }
    }
  }
}

export type AgentInfo = { name: string; label: string; examples: string[]; tools: { name: string; label: string; write: boolean; danger: boolean }[] };
export const getAgents = (lang: string) => api.get<{ agents: AgentInfo[] }>('/copilot/agents', { params: { lang } }).then(r => r.data.agents);
