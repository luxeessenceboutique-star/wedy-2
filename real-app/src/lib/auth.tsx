import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getMe } from '@/services/api';

interface User {
  id: string;
  email: string;
  role_name?: string;
  role?: string;
  full_name?: string;
  profile?: Record<string, unknown>;
  roles?: string[];
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ role: string }>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export const isHRRole      = (role?: string) => ['hr', 'admin', 'rh'].includes(role ?? '');
export const isEmployeeRole = (role?: string) => role === 'employee';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from stored token via backend /auth/me
  useEffect(() => {
    const token = localStorage.getItem('wedy_token');
    if (!token) { setLoading(false); return; }

    getMe()
      .then(me => setUser(me))
      .catch(() => {
        // Token is stale / backend unreachable — clear it
        localStorage.removeItem('wedy_token');
      })
      .finally(() => setLoading(false));
  }, []);

  // Login via backend (avoids browser CORS issues with direct Supabase auth)
  const login = async (email: string, password: string): Promise<{ role: string }> => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, role, role_name, user_id, email: userEmail } = res.data;

    const resolvedRole: string = role ?? role_name ?? 'employee';
    localStorage.setItem('wedy_token', access_token);

    const me: User = {
      id:        user_id,
      email:     userEmail,
      role:      resolvedRole,
      role_name: resolvedRole,
    };

    // Enrich with full profile in background (non-blocking)
    getMe().then(full => setUser(full)).catch(() => setUser(me));
    setUser(me);

    return { role: resolvedRole };
  };

  const signup = async (email: string, password: string, name: string) => {
    await api.post('/auth/register', { email, password, full_name: name });
  };

  const logout = () => {
    localStorage.removeItem('wedy_token');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, signup, logout }}>{children}</Ctx.Provider>;
}
