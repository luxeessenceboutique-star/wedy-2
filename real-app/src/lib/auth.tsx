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
    
    const initAuth = async () => {
      try {
        const me = await getMe();
        setUser(me);
      } catch (err) {
        console.warn('Initial /auth/me failed, trying Supabase recovery:', err);
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) {
          let role = 'employee';
          try {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', sbUser.id)
              .maybeSingle();
            if (roleData?.role) {
              role = roleData.role === 'rh' ? 'hr' : roleData.role;
            }
          } catch (dbErr) {
            console.error('Failed to fetch role from Supabase during init:', dbErr);
          }
          
          setUser({
            id: sbUser.id,
            email: sbUser.email!,
            role_name: role,
            full_name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0]
          });
        } else {
          localStorage.removeItem('wedy_token');
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
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
    } catch (err) {
      console.warn('Backend /auth/me unreachable, fetching role from Supabase directly:', err);
      // Fallback: fetch role directly from Supabase user_roles table
      let role = 'employee';
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user!.id)
          .maybeSingle();
        
        if (roleData?.role) {
          role = roleData.role === 'rh' ? 'hr' : roleData.role;
        }
      } catch (dbErr) {
        console.error('Failed to fetch role from Supabase:', dbErr);
      }

      const fallback: User = { 
        id: data.user!.id, 
        email: data.user!.email!, 
        role_name: role,
        full_name: data.user!.user_metadata?.full_name || data.user!.email?.split('@')[0]
      };
      setUser(fallback);
      return { role };
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
