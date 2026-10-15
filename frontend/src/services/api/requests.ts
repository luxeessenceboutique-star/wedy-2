import { api } from './client';

export type HRRequest = {
  id: string; employee_id: string; type: string; status: string;
  created_at: string; profiles?: { full_name: string };
};

export const listRequests = (params?: Record<string, string | number>) =>
  api.get<{ data: HRRequest[]; count: number }>('/requests', { params }).then(r => r.data);

// ── HR inbox: every request submitted by employees (leaves, documents, other) ──
export type InboxKind = 'leave' | 'document' | 'other';

export type InboxItem = {
  kind: InboxKind; id: string; employee_id: string | null;
  employee_name: string; department: string | null;
  title: string; details: string;
  status: string; state: 'pending' | 'done' | 'rejected';
  note: string | null; created_at: string | null;
};

export type InboxCounts = {
  total: number; pending: number;
  leave: number; document: number; other: number;
};

export const listInbox = () =>
  api.get<{ data: InboxItem[]; counts: InboxCounts; warnings?: string[] }>('/requests/inbox').then(r => r.data);

export const getInboxCount = () =>
  api.get<{ pending: number }>('/requests/inbox/count').then(r => r.data.pending);

export const decideRequest = (kind: InboxKind, id: string, status: string, note?: string) =>
  api.patch(`/requests/inbox/${kind}/${id}`, { status, note }).then(r => r.data);
