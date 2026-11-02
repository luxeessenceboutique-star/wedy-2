import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LucideProvider } from 'lucide-react';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { LangProvider } from '@/lib/lang';
import { AppRoutes } from '@/app/router';
import { WedyToaster } from '@/components/ui';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

export default function App() {
  React.useEffect(() => {
    const dir = localStorage.getItem('wedy_direction') || 'A';
    document.documentElement.setAttribute('data-direction', dir);
  }, []);

  return (
    <QueryClientProvider client={qc}>
      <LangProvider>
        <ThemeProvider>
          {/* The designs draw every icon at stroke 1.8 (lucide's default is 2); an explicit strokeWidth prop still wins. */}
          <LucideProvider strokeWidth={1.8}>
            <AuthProvider>
              <BrowserRouter>
                <WedyToaster />
                <AppRoutes />
              </BrowserRouter>
            </AuthProvider>
          </LucideProvider>
        </ThemeProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}
