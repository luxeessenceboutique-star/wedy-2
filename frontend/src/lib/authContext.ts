import { createContext } from 'react';

export interface User {
  id: string;
  email: string;
  role_name?: string;
  role?: string;
  full_name?: string;
  profile?: Record<string, unknown>;
  roles?: string[];
}

export interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ role: string }>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const missing = () => Promise.reject(new Error('AuthProvider manquant'));

/**
 * The context lives in its own module on purpose: when lib/auth.tsx is hot-reloaded (dev) the context
 * object must stay the same, otherwise the provider and its consumers end up on two different contexts.
 * The default value is safe (never null): a consumer rendered outside the provider shows the loading
 * state instead of crashing with "Cannot destructure property 'user' of useAuth(...) as it is null".
 */
export const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: missing,
  signup: missing,
  logout: () => {},
});
