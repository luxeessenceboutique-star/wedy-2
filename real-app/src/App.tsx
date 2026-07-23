import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { LangProvider } from '@/lib/lang';
import { AppRoutes } from '@/app/router';

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
          <AuthProvider>
            <BrowserRouter>
              <Toaster position="top-right" richColors />
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}
