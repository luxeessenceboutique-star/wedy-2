import { api } from './client';

export type UserProfile = {
  id: string; user_id: string; full_name?: string; email?: string;
  role: string; user?: { email: string };
};

export const listUsers = () =>
  api.get<{ data: UserProfile[]; count: number }>('/users').then(r => r.data);

export const updateUserRole = (userId: string, role: string) =>
  api.patch(`/users/${userId}/role`, { role }).then(r => r.data);
