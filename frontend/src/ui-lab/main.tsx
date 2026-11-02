import { createRoot } from 'react-dom/client';
import { LucideProvider } from 'lucide-react';
import '../styles.css';
import { LangProvider } from '@/lib/lang';
import { AuthContext, type AuthCtx } from '@/lib/authContext';
import { WedyToaster } from '@/components/ui';
import UiLab from './UiLab';

// ?lang=ar|en|fr switches the app language before the first render
const params = new URLSearchParams(window.location.search);
const lang = params.get('lang');
if (lang === 'fr' || lang === 'en' || lang === 'ar') localStorage.setItem('wedy_lang', lang);

// Fake signed-in HR admin: no backend needed
const auth: AuthCtx = {
  user: { id: 'lab', email: 'salma@tython.ma', full_name: 'Salma Idrissi', role_name: 'admin' },
  loading: false,
  login: () => Promise.resolve({ role: 'admin' }),
  signup: () => Promise.resolve(),
  logout: () => {},
};

createRoot(document.getElementById('root')!).render(
  <LangProvider>
    <LucideProvider strokeWidth={1.8}>
      <AuthContext.Provider value={auth}>
        <WedyToaster />
        <UiLab view={params.get('view') ?? 'kit'} />
      </AuthContext.Provider>
    </LucideProvider>
  </LangProvider>,
);
