import axios from 'axios';

export const BASE = '/api';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not offer the in-place re-login on 401 (used while restoring the session at start-up). */
    skipRelogin?: boolean;
    _retried?: boolean;
  }
}

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

export const TOKEN_KEY = 'wedy_token';
export const REFRESH_KEY = 'wedy_refresh';

export const api = axios.create({ baseURL: BASE, timeout: 15000 });

// ── Session renewal ───────────────────────────────────────────────────────────
// The Tybot access token is short-lived. Instead of throwing the user out (and losing what they were typing):
//   1. renew it silently with the refresh token when we have one (also shortly BEFORE it expires);
//   2. otherwise ask for the password again in a dialog on top of the current page, then replay the request.

let reloginHandler: (() => Promise<void>) | null = null;
/** Registered by the AuthProvider: opens the "session expired" dialog and resolves once the user is signed in again. */
export const setReloginHandler = (fn: (() => Promise<void>) | null) => { reloginHandler = fn; };

let refreshing: Promise<string | null> | null = null;

function tokenExpiresAt(token: string): number | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(part)).exp;
    return exp ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Renew the access token with the stored refresh token. Returns the new token, or null when not possible. */
export function refreshAccessToken(): Promise<string | null> {
  const rt = localStorage.getItem(REFRESH_KEY);
  if (!rt) return Promise.resolve(null);
  if (!refreshing) {
    refreshing = axios.post(`${BASE}/auth/refresh`, { refresh_token: rt }, { timeout: 15000 })
      .then(r => {
        localStorage.setItem(TOKEN_KEY, r.data.access_token);
        if (r.data.refresh_token) localStorage.setItem(REFRESH_KEY, r.data.refresh_token);
        return r.data.access_token as string;
      })
      .catch(err => {
        // refresh token refused: it is dead. A network blip must not destroy it.
        if (err?.response?.status === 401) localStorage.removeItem(REFRESH_KEY);
        return null;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

const isAuthCall = (url?: string) => !!url && (url.includes('/auth/login') || url.includes('/auth/refresh'));

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem(TOKEN_KEY);
  if (token && !isAuthCall(config.url)) {
    const exp = tokenExpiresAt(token);
    if (exp && exp - Date.now() < 60_000 && localStorage.getItem(REFRESH_KEY)) {
      token = (await refreshAccessToken()) ?? token;       // renew before it expires: no failed request at all
    }
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let reloginPromise: Promise<void> | null = null;

api.interceptors.response.use(
  r => r,
  async err => {
    const cfg = err?.config;
    const is401 = err?.response?.status === 401;
    if (!is401 || !cfg || isAuthCall(cfg.url) || cfg.skipRelogin) return Promise.reject(err);

    if (!cfg._retried) {
      cfg._retried = true;
      // 1) silent renewal
      if (await refreshAccessToken()) return api(cfg);
      // 2) ask for the password on top of the current page, then replay the request
      if (reloginHandler) {
        try {
          if (!reloginPromise) reloginPromise = reloginHandler().finally(() => { reloginPromise = null; });
          await reloginPromise;
          return api(cfg);
        } catch {
          return Promise.reject(err);                       // the user chose to sign out
        }
      }
    }

    // Nothing else possible (no dialog available, or the replayed request was refused again): sign out
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    window.location.href = '/login';
    return Promise.reject(err);
  }
);
