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
export type SocialPosts = { linkedin: string; facebook: string; instagram: string; indeed: string; source: 'ai' | 'template' };
/** Public link to post on the networks (Open Graph preview with the visual, then the careers page). */
export const adShareUrl = (id: string) => `${window.location.origin}/api/annonces/${id}/share`;
export const uploadAdVisual = (id: string, fmt: 'square' | 'linkedin' | 'story', png: Blob) => {
  const fd = new FormData();
  fd.append('file', png, `${fmt}.png`);
  return api.post<{ url: string }>(`/annonces/${id}/visual`, fd, { params: { fmt }, timeout: 60000 }).then(r => r.data);
};
/** The server's explanation of a failed blob request (its JSON body arrives as a Blob). */
async function explain(e: unknown): Promise<Error> {
  const res = (e as { response?: { data?: unknown; status?: number } })?.response;
  if (res?.data instanceof Blob) {
    let detail = '';
    try { const j = JSON.parse(await res.data.text()); detail = typeof j?.detail === 'string' ? j.detail : ''; } catch { /* not JSON */ }
    if (detail) return Object.assign(new Error(detail), { status: res.status });
  }
  return e instanceof Error ? e : new Error(String(e));
}

export type AdArtRequest = { format: 'square' | 'linkedin' | 'story'; lang: string; company?: string; idea?: string };
/** Paint the background artwork of an ad with the image model (20–60 s). The server keeps it. */
export const generateAdArt = (id: string, body: AdArtRequest) =>
  api.post<Blob>(`/annonces/${id}/ai-art`, body, { responseType: 'blob', timeout: 200000 }).then(r => r.data, async e => { throw await explain(e); });
/** The artwork already generated for this ad and format, or null. */
export const getAdArt = (id: string, fmt: 'square' | 'linkedin' | 'story') =>
  api.get<Blob>(`/annonces/${id}/ai-art/${fmt}.png`, { responseType: 'blob', timeout: 30000 }).then(r => r.data, () => null);
export const getSocialPosts = (id: string, body: { lang: string; company?: string; share_url: string }) =>
  api.post<SocialPosts>(`/annonces/${id}/social`, body, { timeout: 90000 }).then(r => r.data);
export const chatGenerateAnnonce = (messages: ChatMessage[], opts?: { mode?: 'direct'; language?: string; company?: string }) =>
  api.post<{ reply: string }>('/annonces/chat-generate', { messages, ...opts }, { timeout: 90000 }).then(r => r.data);
export type PolishResult = { title: string; city: string; points: string; changed: boolean; source: 'ai' | 'local'; changes: { field: 'title' | 'city' | 'points'; from: string; to: string }[] };
/** Spelling clean-up of the studio form (title, city, key points) before the ad is written. */
export const polishAnnonce = (body: { title: string; city: string; points: string; language: string }) =>
  api.post<PolishResult>('/annonces/polish', body, { timeout: 30000 }).then(r => r.data);
export const updateAnnonce = (ad: JobAd, patch: Partial<JobAd>) =>
  api.patch<JobAd>(`/annonces/${ad.id}`, {
    poste: ad.poste, description: ad.description, competences: ad.competences, experience: ad.experience,
    contenu: ad.contenu, image_url: ad.image_url, is_active: ad.is_active, ...patch,
  }).then(r => r.data);

// Candidates — backed by the employees table (status='candidate')
export const listCandidates = () =>
  api.get('/employees', { params: { status: 'candidate', limit: 1000 } })
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
export type InterviewPerson = { employee_id?: string | null; name: string };
export type MeetingSpec = { starts_at: string; duration_min: number; place?: string; visio_url?: string };
export const scheduleInterview = (body: Partial<Interview> & { slot_id?: string; interviewers?: InterviewPerson[]; meeting?: MeetingSpec }) =>
  api.post<Interview>('/entretiens', body).then(r => r.data);
export const updateInterviewStatus = (id: string, status: string) =>
  api.patch<Interview>(`/entretiens/${id}/status`, null, { params: { status } }).then(r => r.data);

// ── Interview room (Entretiens) ──────────────────────────────────────────────
export type Recommendation = 'strong_yes' | 'yes' | 'maybe' | 'no';
export type ScQuestion = { id: string; q: string; hint: string; note: string; asked: boolean };
export type ScSection = { id: string; title: string; done: boolean; questions: ScQuestion[] };
export type ScCriterion = { id: string; label: string; desc: string; weight: number; score: number; note: string };
export type Scorecard = {
  source: 'ai' | 'template'; lang: string; generated_at?: string | null;
  sections: ScSection[]; criteria: ScCriterion[]; strengths: string[]; concerns: string[]; notes: string;
};
export type InterviewFull = Interview & {
  meeting_id?: string | null; interviewers?: InterviewPerson[]; scorecard?: Scorecard | null; overall_score?: number | null;
  recommendation?: Recommendation | null; summary?: string | null; started_at?: string | null; ended_at?: string | null; created_at?: string;
};
export type BoardInterview = InterviewFull & {
  has_fiche: boolean; fiche_source?: string | null; rated: number; criteria: number; has_cv: boolean; stage?: string | null;
  candidate: { id?: string; full_name?: string; position?: string; photo_url?: string; status?: string; email?: string };
};
export type RoomMeeting = { id: string; title: string; starts_at: string; duration_min: number; place?: string | null; visio_url?: string | null; participants: InterviewPerson[]; agenda: { t: string; done: boolean; ai: boolean }[] };
export type InterviewRoom = {
  interview: InterviewFull; candidate: Employee; ad: JobAd | null; meeting: RoomMeeting | null;
  cv: { name: string; source: 'folder' | 'application'; mime?: string | null } | null;
  history: { id: string; date: string; start_time: string; type: string; status: string; overall_score?: number | null; recommendation?: Recommendation | null; summary?: string | null }[];
  migrated: boolean;
};
export type InterviewDecision = 'next' | 'offer' | 'reject' | 'hire_employee' | 'hire_intern' | 'later';

export const interviewsBoard = () => api.get<{ data: BoardInterview[]; migrated: boolean }>('/entretiens/board').then(r => r.data);
export const getInterviewRoom = (id: string) => api.get<InterviewRoom>(`/entretiens/${id}`).then(r => r.data);
export const getInterviewCv = (id: string) => api.get<Blob>(`/entretiens/${id}/cv`, { responseType: 'blob', timeout: 0 }).then(r => r.data);
export const getInterviewCvText = (id: string) => api.get<string>(`/entretiens/${id}/cv`, { params: { format: 'text' }, responseType: 'text', timeout: 60000 }).then(r => r.data);
export const generateFiche = (id: string, lang: string, mode: 'ai' | 'template' = 'ai') =>
  api.post<{ interview: InterviewFull; fallback: string | null }>(`/entretiens/${id}/fiche`, null, { params: { lang, mode }, timeout: 120000 }).then(r => r.data);
export const saveFiche = (id: string, body: { scorecard?: Scorecard; summary?: string; recommendation?: Recommendation; interviewers?: InterviewPerson[] }) =>
  api.patch<InterviewFull>(`/entretiens/${id}/fiche`, body).then(r => r.data);
export const startInterview = (id: string) => api.post<InterviewFull>(`/entretiens/${id}/start`).then(r => r.data);
export const linkInterviewMeeting = (id: string, spec: MeetingSpec) =>
  api.post<{ interview: InterviewFull; meeting: RoomMeeting }>(`/entretiens/${id}/meeting`, spec).then(r => r.data);
export const draftSynthesis = (id: string, lang: string) =>
  api.post<{ summary: string; recommendation: Recommendation | null }>(`/entretiens/${id}/synthese`, null, { params: { lang }, timeout: 90000 }).then(r => r.data);
export const finishInterview = (id: string, body: { summary?: string; recommendation?: Recommendation; decision: InterviewDecision }) =>
  api.post<{ interview: InterviewFull; decision: InterviewDecision; overall_score: number | null }>(`/entretiens/${id}/finish`, body).then(r => r.data);
