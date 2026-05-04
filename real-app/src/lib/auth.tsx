import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getMe } from './api';

interface User {
  id: string;
  email: string;
  role_name?: string;
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

export const isHRRole     = (role?: string) => ['hr', 'admin', 'rh'].includes(role ?? '');
export const isEmployeeRole = (role?: string) => role === 'employee';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wedy_token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(me => setUser(me))
      .catch(() => localStorage.removeItem('wedy_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<{ role: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { message: error.message };
    const token = data.session!.access_token;
    localStorage.setItem('wedy_token', token);
    try {
      const me = await getMe();
      setUser(me);
      return { role: me.role_name ?? 'employee' };
    } catch {
      const fallback: User = { id: data.user!.id, email: data.user!.email!, role_name: 'employee' };
      setUser(fallback);
      return { role: 'employee' };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw { message: error.message };
  };

  const logout = () => {
    localStorage.removeItem('wedy_token');
    supabase.auth.signOut();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, signup, logout }}>{children}</Ctx.Provider>;
}
