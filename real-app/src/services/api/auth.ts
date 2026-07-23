import { api } from './client';

export interface LoginRes { access_token: string; user: { id: string; email: string } }

export const login = (email: string, password: string) =>
  api.post<LoginRes>('/auth/login', { email, password }).then(r => r.data);

export const signup = (email: string, password: string, full_name: string) =>
  api.post('/auth/signup', { email, password, full_name }).then(r => r.data);

export const getMe = () => api.get('/auth/me').then(r => r.data);
