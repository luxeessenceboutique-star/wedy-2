// Événements: CVs scanned at a job fair / forum, kept in a pool and converted to candidates later.
import { api } from './client';

export type CvEvent = {
  id: string; name: string; event_date?: string | null; location?: string | null; notes?: string | null; created_at: string;
  total: number; shortlisted: number; converted: number;
};
export type ProspectStatus = 'new' | 'shortlisted' | 'rejected' | 'converted';
export type CvProfile = {
  summary?: string; address?: string; nationality?: string; linkedin?: string; github?: string; portfolio?: string; interests?: string;
  experience?: { title: string; company: string; dates: string; description: string }[];
  education?: { degree: string; institution: string; dates: string }[];
  languages?: { name: string; level: string }[]; certifications?: string[];
};
export type Prospect = {
  id: string; event_id: string; full_name?: string | null; email?: string | null; phone?: string | null; city?: string | null; headline?: string | null;
  years_experience?: number | null; skills: string[]; profile: CvProfile;
  file_name?: string | null; file_path?: string | null; file_size?: number | null; mime_type?: string | null;
  status: ProspectStatus; rating?: number | null; notes?: string | null;
  /** ok = read by the AI · partial = text rules only (to be checked) · failed = nothing readable (the identity must be typed) */
  extraction: 'ok' | 'partial' | 'failed'; extraction_error?: string | null;
  duplicate_of?: string | null; duplicate_name?: string | null; candidate_id?: string | null; created_at: string;
};
export type EventInput = { name: string; event_date?: string | null; location?: string | null; notes?: string | null };
export type ProspectPatch = Partial<Pick<Prospect, 'full_name' | 'email' | 'phone' | 'city' | 'headline' | 'years_experience' | 'skills' | 'notes' | 'rating'>> & { status?: Exclude<ProspectStatus, 'converted'> };
export type ConvertResult = { id: string; ok: boolean; error?: string; candidate_id?: string | null; known_as?: string };

export const listCvEvents = () => api.get<CvEvent[]>('/cv-events').then(r => r.data);
export const createCvEvent = (b: EventInput) => api.post<CvEvent>('/cv-events', b).then(r => r.data);
export const updateCvEvent = (id: string, b: EventInput) => api.patch<CvEvent>(`/cv-events/${id}`, b).then(r => r.data);
export const deleteCvEvent = (id: string) => api.delete(`/cv-events/${id}`);
export const listProspects = (eventId: string) => api.get<Prospect[]>(`/cv-events/${eventId}/prospects`).then(r => r.data);
/** One CV file: stored, fully extracted by the AI (20–60 s for a scanned document) and added to the pool. */
export const scanCv = (eventId: string, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post<Prospect>(`/cv-events/${eventId}/scan`, fd, { timeout: 240000 }).then(r => r.data);
};
export const updateProspect = (id: string, patch: ProspectPatch) => api.patch<Prospect>(`/cv-prospects/${id}`, patch).then(r => r.data);
export const deleteProspect = (id: string) => api.delete(`/cv-prospects/${id}`);
export const convertProspects = (body: { ids: string[]; ad_id?: string; position?: string }) =>
  api.post<{ results: ConvertResult[]; converted: number }>('/cv-prospects/convert', body, { timeout: 120000 }).then(r => r.data);
