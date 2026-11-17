import { api } from './client';

export type SocialProvider = 'linkedin' | 'meta';
export type SocialNetwork = 'linkedin' | 'facebook' | 'instagram';
export type SocialAccount = {
  /** the app credentials are set on the server (LINKEDIN_CLIENT_ID… / META_APP_ID…) */
  configured: boolean;
  connected: boolean; expired: boolean;
  account_id: string | null; account_name: string | null; ig_username: string | null;
  choices: { id: string; name: string; ig_username?: string | null }[];
  expires_at: string | null; connected_by: string | null; connected_at: string | null;
};
export type SocialStatus = Record<SocialProvider, SocialAccount>;
export type PublishResult = { ok: boolean; post_id: string | null; url: string | null; error: string | null };

export const getSocialStatus = () => api.get<SocialStatus>('/social/status').then(r => r.data);
/** The network's sign-in page (opened once by an admin of the company page). */
export const connectSocial = (p: SocialProvider) => api.post<{ url: string }>(`/social/${p}/connect`).then(r => r.data.url);
export const chooseSocialAccount = (p: SocialProvider, account_id: string) => api.post<SocialAccount>(`/social/${p}/account`, { account_id }).then(r => r.data);
export const disconnectSocial = (p: SocialProvider) => api.delete(`/social/${p}`);
export const publishAd = (body: { ad_id: string; networks: SocialNetwork[]; texts: Partial<Record<SocialNetwork, string>>; share_url?: string }) =>
  api.post<{ results: Partial<Record<SocialNetwork, PublishResult>> }>('/social/publish', body, { timeout: 120000 }).then(r => r.data.results);

/** Job boards without a publishing API (Moovwin…): the offer is posted there by hand, then recorded with its link. */
export type ManualBoard = 'moovwin' | 'indeed' | 'rekrute' | 'emploi';
export type SocialHistoryItem = { network: string; ok: boolean; post_url: string | null; error: string | null; created_at: string };
export const getSocialHistory = (adId: string) => api.get<SocialHistoryItem[]>(`/social/history/${adId}`).then(r => r.data);
export const markPublished = (body: { ad_id: string; network: ManualBoard; url: string }) =>
  api.post<{ saved: boolean; network: ManualBoard; url: string | null }>('/social/manual', body).then(r => r.data);
/** Public XML feed of the active offers (for job boards that import feeds). */
export const jobsFeedUrl = () => `${window.location.origin}/api/annonces/feed.xml`;
