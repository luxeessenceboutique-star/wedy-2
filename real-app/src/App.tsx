import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth, isHRRole, isEmployeeRole } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { LangProvider } from './lib/lang';
import { AppShell } from './components/layout/AppShell';
import { AppShellEmployee } from './components/layout/AppShellEmployee';

import LandingPage from './pages/marketing/LandingPage';
import LoginPage from './pages/LoginPage';

// HR pages
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
import EmployeeFolderPage from './pages/app/EmployeeFolderPage';
import EmployeeOnboardingPage from './pages/app/EmployeeOnboardingPage';
import TrainingPage from './pages/app/TrainingPage';
import TalentsPage from './pages/app/TalentsPage';
import OrgChartPage from './pages/app/OrgChartPage';
import MeetingsPage from './pages/app/MeetingsPage';

// Employee portal pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import MyLeavePage from './pages/employee/MyLeavePage';
import MyDocumentsPage from './pages/employee/MyDocumentsPage';
import MyProfilePage from './pages/employee/MyProfilePage';
import MyTrainingPage from './pages/employee/MyTrainingPage';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div style={{ width: 32, height: 32, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

/** HR / Admin access only — redirects employees to their portal */
function RequireHR({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (isEmployeeRole(user.role_name)) return <Navigate to="/employee" replace />;
  return <AppShell>{children}</AppShell>;
}

/** Employee access — redirects HR to the full portal */
function RequireEmployee({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (isHRRole(user.role_name)) return <Navigate to="/app" replace />;
  return <AppShellEmployee>{children}</AppShellEmployee>;
}

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
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* ── HR Portal ── */}
                <Route path="/app" element={<RequireHR><DashboardPage /></RequireHR>} />
                <Route path="/app/copilot" element={<RequireHR><CopilotPage /></RequireHR>} />
                <Route path="/app/employees" element={<RequireHR><EmployeesPage /></RequireHR>} />
                <Route path="/app/employees/:id" element={<RequireHR><EmployeeFolderPage /></RequireHR>} />
                <Route path="/app/generate" element={<RequireHR><GeneratePage /></RequireHR>} />
                <Route path="/app/templates" element={<RequireHR><TemplatesPage /></RequireHR>} />
                <Route path="/app/history" element={<RequireHR><HistoryPage /></RequireHR>} />
                <Route path="/app/analytics" element={<RequireHR><AnalyticsPage /></RequireHR>} />
                <Route path="/app/recruitment" element={<RequireHR><RecruitmentPage /></RequireHR>} />
                <Route path="/app/interns" element={<RequireHR><InternsPage /></RequireHR>} />
                <Route path="/app/timeoff" element={<RequireHR><TimeOffPage /></RequireHR>} />
                <Route path="/app/payroll" element={<RequireHR><PayrollPage /></RequireHR>} />
                <Route path="/app/performance" element={<RequireHR><PerformancePage /></RequireHR>} />
                <Route path="/app/integrations" element={<RequireHR><IntegrationsPage /></RequireHR>} />
                <Route path="/app/notifications" element={<RequireHR><NotificationsPage /></RequireHR>} />
                <Route path="/app/security" element={<RequireHR><SecurityPage /></RequireHR>} />
                <Route path="/app/audit" element={<RequireHR><AuditPage /></RequireHR>} />
                <Route path="/app/users" element={<RequireHR><UsersPage /></RequireHR>} />
                <Route path="/app/settings" element={<RequireHR><SettingsPage /></RequireHR>} />
                <Route path="/app/help" element={<RequireHR><HelpPage /></RequireHR>} />
                <Route path="/app/onboarding" element={<RequireHR><EmployeeOnboardingPage /></RequireHR>} />
                <Route path="/app/training" element={<RequireHR><TrainingPage /></RequireHR>} />
                <Route path="/app/talents" element={<RequireHR><TalentsPage /></RequireHR>} />
                <Route path="/app/orgchart" element={<RequireHR><OrgChartPage /></RequireHR>} />
                <Route path="/app/meetings" element={<RequireHR><MeetingsPage /></RequireHR>} />

                {/* ── Employee Portal ── */}
                <Route path="/employee" element={<RequireEmployee><EmployeeDashboard /></RequireEmployee>} />
                <Route path="/employee/conges" element={<RequireEmployee><MyLeavePage /></RequireEmployee>} />
                <Route path="/employee/documents" element={<RequireEmployee><MyDocumentsPage /></RequireEmployee>} />
                <Route path="/employee/profil" element={<RequireEmployee><MyProfilePage /></RequireEmployee>} />
                <Route path="/employee/formation" element={<RequireEmployee><MyTrainingPage /></RequireEmployee>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}
