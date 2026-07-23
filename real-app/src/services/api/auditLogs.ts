import { api } from './client';

export type AuditLog = {
  id: string; user_id: string; action: string; entity: string;
  entity_id?: string; details?: Record<string, unknown>;
  created_at: string; profiles?: { full_name: string };
};

export const listAuditLogs = (params?: Record<string, string | number>) =>
  api.get<{ data: AuditLog[]; count: number }>('/audit-logs', { params }).then(r => r.data);
