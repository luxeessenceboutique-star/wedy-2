import { api } from './client';
import type { Employee } from './employees';
import type { ChatMessage } from './copilot';

export type JobAd = {
  id: string;
  poste: string;
  description?: string;
  competences?: string;
  experience?: string;
  contenu: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const listAnnonces = () => api.get<JobAd[]>('/annonces').then(r => r.data);
export const getAnnonce = (id: string) => api.get<JobAd>(`/annonces/${id}`).then(r => r.data);
export const createAnnonce = (body: Partial<JobAd>) => api.post<JobAd>('/annonces', body).then(r => r.data);
export const deleteAnnonce = (id: string) => api.delete(`/annonces/${id}`);
export const chatGenerateAnnonce = (messages: ChatMessage[], opts?: { mode?: 'direct'; language?: string; company?: string }) =>
  api.post<{ reply: string }>('/annonces/chat-generate', { messages, ...opts }, { timeout: 90000 }).then(r => r.data);
export const updateAnnonce = (ad: JobAd, patch: Partial<JobAd>) =>
  api.patch<JobAd>(`/annonces/${ad.id}`, {
    poste: ad.poste, description: ad.description, competences: ad.competences, experience: ad.experience,
    contenu: ad.contenu, image_url: ad.image_url, is_active: ad.is_active, ...patch,
  }).then(r => r.data);

// Candidates — backed by the employees table (status='candidate')
export const listCandidates = () =>
  api.get('/employees', { params: { status: 'candidate', limit: 200 } })
    .then(r => (Array.isArray(r.data) ? r.data : r.data?.data ?? []));
export const createCandidate = (data: { full_name: string; email?: string; phone?: string; position?: string; notes?: string }) =>
  api.post<Employee>('/employees', { ...data, status: 'candidate' }).then(r => r.data);
export const deleteCandidate = (id: string) => api.delete(`/employees/${id}`);
export const promoteToEmployee = (id: string, data: any) =>
  api.patch(`/employees/${id}`, { status: 'active', ...data }).then(r => r.data);
export const promoteToIntern = (id: string, data: any) =>
  api.patch(`/employees/${id}`, { status: 'intern', ...data }).then(r => r.data);
export const applyCandidate = (data: { full_name: string; email: string; phone?: string; linkedin?: string; message?: string; ad_id: string; cv_url?: string; slot_id?: string; interview_time?: string }) =>
  api.post<{ id: string; interview: { date: string; time: string } | null }>('/candidats/apply', data).then(r => r.data);

export type HRSlot = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'free' | 'reserved';
  ad_id?: string;
  interview_id?: string;
  reserved_times?: string[];
};

export const listSlots = (params?: { ad_id?: string, date?: string }) =>
  api.get<HRSlot[]>('/creneaux', { params }).then(r => r.data);
export const addSlots = (slots: Partial<HRSlot>[]) => api.post<HRSlot[]>('/creneaux', slots).then(r => r.data);
export const deleteSlot = (id: string) => api.delete(`/creneaux/${id}`);

export type Interview = {
  id: string;
  candidate_id: string;
  recruiter_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  type: 'rh' | 'technical' | 'final';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'realized';
  meet_link?: string;
  notes?: string;
  candidate?: Partial<Employee>;
  candidate_name?: string;
  job_title?: string;
  recruiter_name?: string;
};

export const listInterviews = () => api.get<Interview[]>('/entretiens').then(r => r.data);
export const scheduleInterview = (body: Partial<Interview> & { slot_id?: string }) =>
  api.post<Interview>('/entretiens', body).then(r => r.data);
export const updateInterviewStatus = (id: string, status: string) =>
  api.patch<Interview>(`/entretiens/${id}/status`, null, { params: { status } }).then(r => r.data);
