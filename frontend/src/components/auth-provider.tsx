import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "rh" | "employee";

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: AppRole | null;
  fullName: string | null;
  profileId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Loads role + profile data in background (does NOT affect loading state)
  const loadProfile = async (uid: string) => {
    try {
      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
        (supabase.from as any)("profiles").select("*").eq("user_id", uid).maybeSingle(),
      ]);

      setRole((roleData?.role as AppRole) ?? "rh");
      setFullName(profileData?.full_name || null);
      setProfileId(profileData?.id ?? null);
    } catch (err) {
      console.error("loadProfile error:", err);
      setRole("rh"); // safe fallback
    }
  };

  useEffect(() => {
    let initialized = false;

    // 1. Get the current session ONCE — this resolves the loading state
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        // Load profile in background, don't block UI
        loadProfile(s.user.id).catch(console.error);
      }

      // Always stop loading after initial session check
      setLoading(false);
      initialized = true;
    }).catch(err => {
      console.error("getSession error:", err);
      setLoading(false);
      initialized = true;
    });

    // Safety timeout: never stay stuck in loading more than 3 seconds
    const timer = setTimeout(() => {
      if (!initialized) {
        console.warn("Auth initialization timed out, forcing loading false");
        setLoading(false);
      }
    }, 3000);

    // 2. Listen to future auth changes (login/logout)
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Skip the first event if getSession already initialized
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        loadProfile(newSession.user.id).catch(console.error);
      } else {
        setRole(null);
        setFullName(null);
        setProfileId(null);
      }

      // Ensure loading is false after any auth event
      if (initialized) {
        setLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn: AuthState["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthState["signUp"] = async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: fullName },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRole = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, role, fullName, profileId, signIn, signUp, signOut, refreshRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
