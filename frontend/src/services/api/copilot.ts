import { api } from './client';
import type { Employee } from './employees';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export const sendCopilotMessage = (messages: ChatMessage[], context?: string) =>
  api.post<{ reply: string; usage: { input_tokens: number; output_tokens: number } }>(
    '/copilot/chat', { messages, context }, { timeout: 60000 }
  ).then(r => r.data);

export const summarizeEmployee = (employeeId: string) =>
  api.post<{ summary: string; employee: Employee }>(`/copilot/summarize-employee`, null, { params: { employee_id: employeeId } }).then(r => r.data);
