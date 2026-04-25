import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, getMe, signup as apiSignup } from './api';

interface User { id: string; email: string; profile?: Record<string, unknown>; roles?: string[] }
interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

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

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem('wedy_token', res.access_token);
    const me = await getMe();
    setUser(me);
  };

  const signup = async (email: string, password: string, name: string) => {
    await apiSignup(email, password, name);
  };

  const logout = () => {
    localStorage.removeItem('wedy_token');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, signup, logout }}>{children}</Ctx.Provider>;
}
