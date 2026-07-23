import { api } from './client';

export type Notification = {
  id: string; title: string; body: string; message: string; type: string;
  unread: boolean; is_read: boolean; color?: string; time?: string;
  link?: string; created_at?: string;
};

export const listNotifications = () =>
  api.get<{ data: Notification[]; unread_count: number; count: number }>('/notifications').then(r => r.data);

export const markNotifRead = (id: string) => api.patch(`/notifications/${id}/read`);

export const markAllNotifsRead = () => api.patch('/notifications/read-all'); // PATCH alias supported; POST /mark-all-read also works
