import React, { useContext, useEffect, useRef, useState } from 'react';
import { api, getMe } from '@/services/api';
import { REFRESH_KEY, TOKEN_KEY, refreshAccessToken, setReloginHandler } from '@/services/api/client';
import { SessionExpiredDialog } from '@/components/SessionExpiredDialog';
import { AuthContext, type User } from './authContext';

export const useAuth = () => useContext(AuthContext);

export const isHRRole      = (role?: string) => ['hr', 'admin', 'rh'].includes(role ?? '');
export const isEmployeeRole = (role?: string) => role === 'employee';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const waiting = useRef<{ resolve: () => void; reject: (e: Error) => void }[]>([]);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // When the session expires while someone is working, ask for the password on top of the page (nothing is lost)
  // instead of throwing them to the login page. The failed request is replayed once they are signed in again.
  useEffect(() => {
    setReloginHandler(() => new Promise<void>((resolve, reject) => {
      if (!userRef.current) { reject(new Error('not signed in')); return; }
      waiting.current.push({ resolve, reject });
      setExpired(true);
    }));
    return () => setReloginHandler(null);
  }, []);

  // On mount: restore session from stored token via backend /auth/me
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const me = await api.get('/auth/me', { skipRelogin: true }).then(r => r.data);
          if (!cancelled) setUser(me);
          break;
        } catch (e: any) {
          const status = e?.response?.status;
          if (status === 401 || status === 403) {
            // the token is dead: renew it once, otherwise sign out
            if (attempt === 0 && await refreshAccessToken()) continue;
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_KEY);
            break;
          }
          // network blip / server hiccup: try again, and never sign the user out for that
          await sleep(800 * (attempt + 1));
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Login via backend (avoids browser CORS issues with direct Supabase auth)
  const login = async (email: string, password: string): Promise<{ role: string }> => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token, role, role_name, user_id, email: userEmail } = res.data;

    const resolvedRole: string = role ?? role_name ?? 'employee';
    localStorage.setItem(TOKEN_KEY, access_token);
    if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
    else localStorage.removeItem(REFRESH_KEY);

    const me: User = {
      id:        user_id,
      email:     userEmail,
      role:      resolvedRole,
      role_name: resolvedRole,
    };

    // Set user immediately with the role from the login response.
    setUser(me);

    // Enrich with full profile data in background (non-blocking).
    // IMPORTANT: always keep resolvedRole, never let /auth/me overwrite it.
    // get_current_user() re-queries user_roles; if that row is absent or the
    // Supabase query fails, it silently defaults to "employee" — which would
    // downgrade an HR admin after they have already been redirected to /app.
    getMe()
      .then((full: User) => {
        setUser({
          ...full,
          role:      resolvedRole,
          role_name: resolvedRole,
        });
      })
      .catch(() => {
        // /auth/me failed — me (with resolvedRole) already set above, nothing to do
      });

    return { role: resolvedRole };
  };

  const signup = async (email: string, password: string, name: string) => {
    await api.post('/auth/register', { email, password, full_name: name });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  };

  const reloginDone = async (email: string, password: string) => {
    await login(email, password);                          // throws on a wrong password: the dialog shows the message
    setExpired(false);
    waiting.current.splice(0).forEach(w => w.resolve());   // replay the requests that were waiting
  };
  const signOutFromDialog = () => {
    setExpired(false);
    waiting.current.splice(0).forEach(w => w.reject(new Error('signed out')));
    logout();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
      {expired && user && <SessionExpiredDialog email={user.email} onLogin={reloginDone} onSignOut={signOutFromDialog} />}
    </AuthContext.Provider>
  );
}
