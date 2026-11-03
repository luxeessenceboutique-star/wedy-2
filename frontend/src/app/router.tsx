import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, isHRRole } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';
import { AppShellEmployee } from '@/components/layout/AppShellEmployee';

import LandingPage from '@/pages/marketing/LandingPage';
import LoginPage from '@/pages/LoginPage';

// HR pages
import DashboardPage from '@/pages/app/DashboardPage';
import EmployeesPage from '@/pages/app/EmployeesPage';
import GeneratePage from '@/pages/app/GeneratePage';
import TemplatesPage from '@/pages/app/TemplatesPage';
import HistoryPage from '@/pages/app/HistoryPage';
import CopilotPage from '@/pages/app/CopilotPage';
import NotificationsPage from '@/pages/app/NotificationsPage';
import RecruitmentPage from '@/pages/app/RecruitmentPage';
import PerformancePage from '@/pages/app/PerformancePage';
import TimeOffPage from '@/pages/app/TimeOffPage';
import PayrollPage from '@/pages/app/PayrollPage';
import AnalyticsPage from '@/pages/app/AnalyticsPage';
import AuditPage from '@/pages/app/AuditPage';
import IntegrationsPage from '@/pages/app/IntegrationsPage';
import UsersPage from '@/pages/app/UsersPage';
import RequestsPage from '@/pages/app/RequestsPage';
import AbsencesPage from '@/pages/app/AbsencesPage';
import SettingsPage from '@/pages/app/SettingsPage';
import HelpPage from '@/pages/app/HelpPage';
import SecurityPage from '@/pages/app/SecurityPage';
import InternsPage from '@/pages/app/InternsPage';
import EmployeeFolderPage from '@/pages/app/EmployeeFolderPage';
import EmployeeOnboardingPage from '@/pages/app/EmployeeOnboardingPage';
import TrainingPage from '@/pages/app/TrainingPage';
import TalentsPage from '@/pages/app/TalentsPage';
import OrgChartPage from '@/pages/app/OrgChartPage';
import MeetingsPage from '@/pages/app/MeetingsPage';
import TendersPage from '@/pages/app/TendersPage';
import AnnoncesPage from '@/pages/app/AnnoncesPage';
import PlanningRHPage from '@/pages/app/PlanningRHPage';
import CandidatsPage from '@/pages/app/CandidatsPage';
import EntretiensPage from '@/pages/app/EntretiensPage';
import InterviewRoomPage from '@/pages/app/InterviewRoomPage';
import PostulerPage from '@/pages/public/PostulerPage';

// Employee portal pages
import EmployeeDashboard from '@/pages/employee/EmployeeDashboard';
import MyLeavePage from '@/pages/employee/MyLeavePage';
import MyDocumentsPage from '@/pages/employee/MyDocumentsPage';
import MyProfilePage from '@/pages/employee/MyProfilePage';
import MyTrainingPage from '@/pages/employee/MyTrainingPage';

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div style={{ width: 32, height: 32, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

/** HR / Admin access only — redirects employees (and unresolved roles) to their portal */
function RequireHR({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  // Resolve the role from either field; treat missing/unrecognised roles as employee
  const role = user.role_name ?? user.role;
  if (!isHRRole(role)) return <Navigate to="/employee" replace />;
  return <AppShell>{children}</AppShell>;
}

/** Employee access — redirects HR/Admin to the management portal */
function RequireEmployee({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  // Resolve the role from either field
  const role = user.role_name ?? user.role;
  if (isHRRole(role)) return <Navigate to="/app" replace />;
  return <AppShellEmployee>{children}</AppShellEmployee>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/postuler/:id" element={<PostulerPage />} />

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
      <Route path="/app/absences" element={<RequireHR><AbsencesPage /></RequireHR>} />
      <Route path="/app/requests" element={<RequireHR><RequestsPage /></RequireHR>} />
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
      <Route path="/app/tenders" element={<RequireHR><TendersPage /></RequireHR>} />
      <Route path="/app/annonces" element={<RequireHR><AnnoncesPage /></RequireHR>} />
      <Route path="/app/planning-rh" element={<RequireHR><PlanningRHPage /></RequireHR>} />
      <Route path="/app/calendrier-rh" element={<Navigate to="/app/planning-rh" replace />} />
      <Route path="/app/creneaux-rh"   element={<Navigate to="/app/planning-rh" replace />} />
      <Route path="/app/candidats" element={<RequireHR><CandidatsPage /></RequireHR>} />
      <Route path="/app/entretiens" element={<RequireHR><EntretiensPage /></RequireHR>} />
      <Route path="/app/entretiens/:id" element={<RequireHR><InterviewRoomPage /></RequireHR>} />

      {/* ── Employee Portal ── */}
      <Route path="/employee" element={<RequireEmployee><EmployeeDashboard /></RequireEmployee>} />
      <Route path="/employee/conges" element={<RequireEmployee><MyLeavePage /></RequireEmployee>} />
      <Route path="/employee/documents" element={<RequireEmployee><MyDocumentsPage /></RequireEmployee>} />
      <Route path="/employee/profil" element={<RequireEmployee><MyProfilePage /></RequireEmployee>} />
      <Route path="/employee/formation" element={<RequireEmployee><MyTrainingPage /></RequireEmployee>} />
      <Route path="/employee/orgchart" element={<RequireEmployee><OrgChartPage readOnly /></RequireEmployee>} />
      <Route path="/employee/meetings" element={<RequireEmployee><MeetingsPage /></RequireEmployee>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
