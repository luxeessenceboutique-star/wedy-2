import { api } from './client';

export type Asset = {
  id: string; name: string; category?: string; serial_number?: string;
  employee_id?: string; status: string; assigned_at?: string; notes?: string;
  employees?: { full_name: string; department: string };
};

export const listAssets = (params?: Record<string, string>) =>
  api.get<{ data: Asset[]; count: number }>('/assets', { params }).then(r => r.data);

export const createAsset = (body: Partial<Asset>) =>
  api.post<Asset>('/assets', body).then(r => r.data);

export const updateAsset = (id: string, body: Partial<Asset>) =>
  api.patch<Asset>(`/assets/${id}`, body).then(r => r.data);
