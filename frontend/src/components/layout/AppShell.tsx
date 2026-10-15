import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, FileText, History, Wand2, Bot,
  BarChart3, Clock, DollarSign, UserPlus, TrendingUp,
  Puzzle, Bell, Settings, HelpCircle,
  ClipboardList,
  UserCog, GraduationCap, UserCheck, BookOpen, Star,
  Network, Video, Briefcase, Calendar, Target, Inbox,
} from 'lucide-react';
import { SidebarShell, type NavSection } from './SidebarShell';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { listNotifications, getInboxCount } from '@/services/api';

export { PageHeader } from './PageHeader';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLang();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    refetchInterval: 20000,
  });
  const unreadCount = notifData?.unread_count ?? (notifData?.data ?? []).filter((n: any) => n.unread || !n.is_read).length;

  // Pending employee requests (leaves, documents, other) → badge on the "Demandes" item
  const { data: pendingRequests = 0 } = useQuery({
    queryKey: ['requests-count'],
    queryFn: getInboxCount,
    refetchInterval: 30000,
    retry: false,
  });

  React.useEffect(() => {
    document.documentElement.removeAttribute('data-direction');
  }, []);

  const isAdmin =
    (((user as any)?.role_name as string) === 'admin') ||
    (((user as any)?.roles as string[] | undefined)?.includes('admin'));

  // ── Nav sections (labels pulled from translation context) ────────────────
  const NAV_SECTIONS: NavSection[] = [
    {
      heading: t('nav_overview'),
      items: [
        { label: t('dashboard'),      icon: <LayoutDashboard size={15} />, to: '/app' },
        { label: t('ai_copilot'),     icon: <Bot size={15} />,             to: '/app/copilot',       badge: 'New' },
        { label: t('notifications'),  icon: <Bell size={15} />,            to: '/app/notifications', badgeCount: unreadCount > 0 ? unreadCount : undefined },
      ],
    },
    {
      heading: t('nav_people'),
      items: [
        { label: t('employees'),      icon: <Users size={15} />,         to: '/app/employees' },
        { label: t('interns'),        icon: <GraduationCap size={15} />, to: '/app/interns' },
        { label: t('requests'),       icon: <Inbox size={15} />,         to: '/app/requests', badgeCount: pendingRequests > 0 ? pendingRequests : undefined },
        { label: t('recruitment'),     icon: <Target size={15} />,        to: '/app/recruitment' },
        { label: t('candidats'),      icon: <UserPlus size={15} />,      to: '/app/candidats' },
        { label: t('annonces'),       icon: <Wand2 size={15} />,         to: '/app/annonces', badge: 'AI' },
        { label: t('planning_rh'),     icon: <Calendar size={15} />,      to: '/app/planning-rh' },
        { label: t('performance'),    icon: <TrendingUp size={15} />,    to: '/app/performance' },
        { label: t('time_off'),       icon: <Clock size={15} />,         to: '/app/timeoff' },
        { label: t('payroll'),        icon: <DollarSign size={15} />,    to: '/app/payroll' },
        { label: t('org_chart'),      icon: <Network size={15} />,       to: '/app/orgchart' },
        { label: t('meetings'),       icon: <Video size={15} />,         to: '/app/meetings' },
      ],
    },
    {
      heading: t('nav_hr_dev'),
      items: [
        { label: t('onboarding'), icon: <UserCheck size={15} />, to: '/app/onboarding' },
        { label: t('training'),   icon: <BookOpen size={15} />,   to: '/app/training' },
        { label: t('talents'),    icon: <Star size={15} />,       to: '/app/talents' },
        { label: t('tenders'),    icon: <Briefcase size={15} />,  to: '/app/tenders', badge: 'AI' },
      ],
    },
    {
      heading: t('nav_documents'),
      items: [
        { label: t('generate'),   icon: <Wand2 size={15} />,    to: '/app/generate' },
        { label: t('templates'),  icon: <FileText size={15} />,  to: '/app/templates' },
        { label: t('history'),    icon: <History size={15} />,   to: '/app/history' },
      ],
    },
    {
      heading: t('nav_insights'),
      items: [
        { label: t('analytics'),  icon: <BarChart3 size={15} />,     to: '/app/analytics' },
        { label: t('audit_log'),  icon: <ClipboardList size={15} />, to: '/app/audit' },
      ],
    },
    {
      heading: t('nav_workspace'),
      items: [
        { label: t('integrations'), icon: <Puzzle size={15} />,   to: '/app/integrations' },
        { label: t('users_roles'),  icon: <UserCog size={15} />,  to: '/app/users' },
        { label: t('settings'),     icon: <Settings size={15} />, to: '/app/settings' },
        { label: t('help'),         icon: <HelpCircle size={15}/>, to: '/app/help' },
      ],
    },
  ];

  return (
    <SidebarShell sections={NAV_SECTIONS} roleLabel={isAdmin ? t('hr_admin') : t('hr_member')}>
      {children}
    </SidebarShell>
  );
}
