import { api } from './client';

export const listWebhooks = () => api.get<{ data: any[] }>('/webhooks').then(r => r.data);
export const createWebhook = (body: any) => api.post('/webhooks', body).then(r => r.data);
export const deleteWebhook = (id: string) => api.delete(`/webhooks/${id}`);
