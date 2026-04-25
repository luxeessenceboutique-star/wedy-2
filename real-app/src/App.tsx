import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { AppShell } from './components/layout/AppShell';

import LandingPage from './pages/marketing/LandingPage';
import LoginPage from './pages/LoginPage';

import DashboardPage from './pages/app/DashboardPage';
import EmployeesPage from './pages/app/EmployeesPage';
import GeneratePage from './pages/app/GeneratePage';
import TemplatesPage from './pages/app/TemplatesPage';
import HistoryPage from './pages/app/HistoryPage';
import CopilotPage from './pages/app/CopilotPage';
import NotificationsPage from './pages/app/NotificationsPage';
import RecruitmentPage from './pages/app/RecruitmentPage';
import PerformancePage from './pages/app/PerformancePage';
import TimeOffPage from './pages/app/TimeOffPage';
import PayrollPage from './pages/app/PayrollPage';
import AnalyticsPage from './pages/app/AnalyticsPage';
import AuditPage from './pages/app/AuditPage';
import IntegrationsPage from './pages/app/IntegrationsPage';
import UsersPage from './pages/app/UsersPage';
import SettingsPage from './pages/app/SettingsPage';
import HelpPage from './pages/app/HelpPage';
import SecurityPage from './pages/app/SecurityPage';
import InternsPage from './pages/app/InternsPage';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  React.useEffect(() => {
    const dir = localStorage.getItem('wedy_direction') || 'A';
    document.documentElement.setAttribute('data-direction', dir);
  }, []);

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            {/* Marketing */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* App (authenticated) */}
            <Route path="/app" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/app/copilot" element={<RequireAuth><CopilotPage /></RequireAuth>} />
            <Route path="/app/employees" element={<RequireAuth><EmployeesPage /></RequireAuth>} />
            <Route path="/app/generate" element={<RequireAuth><GeneratePage /></RequireAuth>} />
            <Route path="/app/templates" element={<RequireAuth><TemplatesPage /></RequireAuth>} />
            <Route path="/app/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
            <Route path="/app/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
             <Route path="/app/recruitment" element={<RequireAuth><RecruitmentPage /></RequireAuth>} />
            <Route path="/app/interns" element={<RequireAuth><InternsPage /></RequireAuth>} />
            <Route path="/app/timeoff" element={<RequireAuth><TimeOffPage /></RequireAuth>} />
            <Route path="/app/payroll" element={<RequireAuth><PayrollPage /></RequireAuth>} />
            <Route path="/app/performance" element={<RequireAuth><PerformancePage /></RequireAuth>} />
            <Route path="/app/integrations" element={<RequireAuth><IntegrationsPage /></RequireAuth>} />
            <Route path="/app/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
            <Route path="/app/security" element={<RequireAuth><SecurityPage /></RequireAuth>} />
            <Route path="/app/audit" element={<RequireAuth><AuditPage /></RequireAuth>} />
            <Route path="/app/users" element={<RequireAuth><UsersPage /></RequireAuth>} />
            <Route path="/app/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="/app/help" element={<RequireAuth><HelpPage /></RequireAuth>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
