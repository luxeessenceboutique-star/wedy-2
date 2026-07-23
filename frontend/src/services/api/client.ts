import axios from 'axios';

export const BASE = '/api';

/**
 * Safely extract a human-readable message from any API error.
 * Pydantic v2 returns detail as an array of {type, loc, msg, input} objects.
 * Rendering that array directly in JSX or passing it to toast.error() crashes React.
 */
export function getApiError(err: unknown, fallback = 'Une erreur est survenue'): string {
  const detail = (err as any)?.response?.data?.detail;
  if (detail === undefined || detail === null) {
    return (err as any)?.message ?? fallback;
  }
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d: any) => (typeof d === 'string' ? d : d?.msg ?? JSON.stringify(d))).join(' · ');
  }
  if (typeof detail === 'object' && detail.msg) return String(detail.msg);
  return fallback;
}

export const api = axios.create({ baseURL: BASE, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wedy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    const is401 = err?.response?.status === 401;
    const isSmartDb = err?.config?.url?.includes('/smartdb');
    // Only treat 401 as session expiry for our own API endpoints,
    // not for the SmartDB proxy (whose upstream can independently return 401).
    if (is401 && !isSmartDb) {
      localStorage.removeItem('wedy_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
