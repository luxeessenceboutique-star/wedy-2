// Company settings (/api/settings): profile, preferences, leave rules, document options and images.
// One cached query shared by Settings, Generate (letterhead) and the leave screens (holidays).
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export type CompanyProfile = { name: string; sector: string; ice: string; rc: string; if: string; cnss: string; address: string; city: string; phone: string; email: string };
export type Prefs = { lang: 'fr' | 'ar' | 'en'; tz: string; date: 'dmy' | 'iso'; cur: string; days: number[] };
export type LeaveRules = { monthly: number; bonus: number; cap: number; flow: 'mgr-rh' | 'rh' | 'mgr'; off_holidays: string[] };
export type DocOptions = { prefix: string; lang: 'fr' | 'ar' | 'en'; qr: boolean };
export type Assets = { logo: string | null; signature: string | null; stamp: string | null };
export type SecuritySettings = { session_timeout: number; ip_allow: boolean; ips: { ip: string; label: string }[] };
export type AppSettings = { company: CompanyProfile; prefs: Prefs; leave: LeaveRules; docs: DocOptions; assets: Assets; security: SecuritySettings; stored: boolean };

export const getAppSettings = () => api.get<AppSettings>('/settings').then(r => r.data);
export const patchAppSettings = (body: Partial<Pick<AppSettings, 'company' | 'prefs' | 'leave' | 'docs' | 'security'>>) => api.patch<AppSettings>('/settings', body).then(r => r.data);
export const uploadAsset = (kind: keyof Assets, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post<{ assets: Assets }>(`/settings/assets/${kind}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.assets);
};
export const deleteAsset = (kind: keyof Assets) => api.delete<{ assets: Assets }>(`/settings/assets/${kind}`).then(r => r.data.assets);

export const useAppSettings = () => useQuery({ queryKey: ['app-settings'], queryFn: getAppSettings, staleTime: 5 * 60_000 });

/** Initials of the company for the logo tile when no logo was uploaded. */
export const companyInitials = (name?: string) => {
  const words = (name || 'Wedy').split(/\s+/).filter(w => w && !['SARL', 'SA', 'SAS', 'SARLAU'].includes(w.toUpperCase()));
  const s = words.length > 1 ? words.map(w => w[0]).join('') : (words[0] ?? 'W');
  return s.slice(0, 2).toUpperCase();
};
