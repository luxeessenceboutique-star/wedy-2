import { api } from './client';

export type VisioInfo = {
  room: string; title: string; starts_at: string; ends_at: string; kind: string; hosts: string[]; live: number;
  guest_name?: string; can_invite?: boolean; me?: string;
};
export type IceConfig = { iceServers: RTCIceServer[]; max_peers: number; turn: boolean };

/** Room of a meeting / of an interview without a meeting. */
export const meetingRoom = (meetingId: string) => `m-${meetingId}`;
export const interviewRoom = (interviewId: string) => `i-${interviewId}`;

export const getVisioInfo = (room: string) => api.get<VisioInfo>(`/visio/${room}/info`).then(r => r.data);
export const getVisioGuestInfo = (room: string, k: string) => api.get<VisioInfo>(`/visio/${room}/guest-info`, { params: { k }, skipRelogin: true }).then(r => r.data);
export const getIceConfig = () => api.get<IceConfig>('/visio/ice', { skipRelogin: true }).then(r => r.data);
export const makeGuestLink = (room: string, name: string) =>
  api.post<{ path: string; expires_at: string }>(`/visio/${room}/guest-link`, { name }).then(r => ({ ...r.data, url: `${window.location.origin}${r.data.path}` }));
export const getLiveRooms = () => api.get<{ rooms: Record<string, number> }>('/visio/live').then(r => r.data.rooms);
