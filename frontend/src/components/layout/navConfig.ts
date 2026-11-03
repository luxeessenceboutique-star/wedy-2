import {
  Bell, BookOpen, Bot, Briefcase, Calendar, ChartColumn, CircleHelp, ClipboardCheck, ClipboardList, Clock, FileText, GraduationCap,
  History, House, Inbox, LayoutDashboard, Megaphone, Network, Puzzle, Settings, ShieldCheck, Star, Target, TrendingUp,
  User, UserCheck, UserCog, UserPlus, Users, UserX, Video, Wallet, WandSparkles, type LucideIcon,
} from 'lucide-react';
import type { TKey } from '@/lib/lang';

/** `notifications` / `requests` show the live count; `new` / `ai` show a tag. */
export type NavBadge = 'notifications' | 'requests' | 'new' | 'ai';

export interface NavItemDef { labelKey: TKey; icon: LucideIcon; to: string; badge?: NavBadge }
export interface NavSectionDef { headingKey: TKey; items: NavItemDef[] }

// Single source for the sidebar and the topbar breadcrumb (order and icons from design/WedyNav.dc.html).
export const NAV_SECTIONS: NavSectionDef[] = [
  { headingKey: 'nav_overview', items: [
    { labelKey: 'dashboard', icon: LayoutDashboard, to: '/app' },
    { labelKey: 'ai_copilot', icon: Bot, to: '/app/copilot', badge: 'new' },
    { labelKey: 'notifications', icon: Bell, to: '/app/notifications', badge: 'notifications' },
  ] },
  { headingKey: 'nav_people', items: [
    { labelKey: 'employees', icon: Users, to: '/app/employees' },
    { labelKey: 'interns', icon: GraduationCap, to: '/app/interns' },
    { labelKey: 'requests', icon: Inbox, to: '/app/requests', badge: 'requests' },
    { labelKey: 'recruitment', icon: Target, to: '/app/recruitment' },
    { labelKey: 'candidats', icon: UserPlus, to: '/app/candidats' },
    { labelKey: 'entretiens', icon: ClipboardCheck, to: '/app/entretiens' },
    { labelKey: 'annonces', icon: Megaphone, to: '/app/annonces', badge: 'ai' },
    { labelKey: 'planning_rh', icon: Calendar, to: '/app/planning-rh' },
    { labelKey: 'performance', icon: TrendingUp, to: '/app/performance' },
    { labelKey: 'time_off', icon: Clock, to: '/app/timeoff' },
    { labelKey: 'absences', icon: UserX, to: '/app/absences' },
    { labelKey: 'payroll', icon: Wallet, to: '/app/payroll' },
    { labelKey: 'org_chart', icon: Network, to: '/app/orgchart' },
    { labelKey: 'meetings', icon: Video, to: '/app/meetings' },
  ] },
  { headingKey: 'nav_hr_dev', items: [
    { labelKey: 'onboarding', icon: UserCheck, to: '/app/onboarding' },
    { labelKey: 'training', icon: BookOpen, to: '/app/training' },
    { labelKey: 'talents', icon: Star, to: '/app/talents' },
    { labelKey: 'tenders', icon: Briefcase, to: '/app/tenders', badge: 'ai' },
  ] },
  { headingKey: 'nav_documents', items: [
    { labelKey: 'generate', icon: WandSparkles, to: '/app/generate' },
    { labelKey: 'templates', icon: FileText, to: '/app/templates' },
    { labelKey: 'history', icon: History, to: '/app/history' },
  ] },
  { headingKey: 'nav_insights', items: [
    { labelKey: 'analytics', icon: ChartColumn, to: '/app/analytics' },
    { labelKey: 'audit_log', icon: ClipboardList, to: '/app/audit' },
  ] },
  { headingKey: 'nav_workspace', items: [
    { labelKey: 'integrations', icon: Puzzle, to: '/app/integrations' },
    { labelKey: 'users_roles', icon: UserCog, to: '/app/users' },
    { labelKey: 'settings', icon: Settings, to: '/app/settings' },
    { labelKey: 'security', icon: ShieldCheck, to: '/app/security' },
    { labelKey: 'help', icon: CircleHelp, to: '/app/help' },
  ] },
];

/** Employee portal tabs (WedyPortalNav + the two extra routes the app has). */
export const PORTAL_TABS: { labelKey: TKey; icon: LucideIcon; to: string }[] = [
  { labelKey: 'portal_home', icon: House, to: '/employee' },
  { labelKey: 'portal_my_leave', icon: Calendar, to: '/employee/conges' },
  { labelKey: 'portal_my_documents', icon: FileText, to: '/employee/documents' },
  { labelKey: 'training', icon: GraduationCap, to: '/employee/formation' },
  { labelKey: 'org_chart', icon: Network, to: '/employee/orgchart' },
  { labelKey: 'meetings', icon: Video, to: '/employee/meetings' },
  { labelKey: 'myprofile_title', icon: User, to: '/employee/profil' },
];

/** Root routes match exactly, others also match their sub-routes (`/app/employees/:id` keeps Employees active). */
export function isRouteActive(pathname: string, to: string): boolean {
  if (to === '/app' || to === '/employee') return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Section + page title for the topbar breadcrumb. */
export function findNavMatch(pathname: string): { headingKey: TKey; labelKey: TKey } | null {
  let best: { headingKey: TKey; labelKey: TKey; len: number } | null = null;
  for (const s of NAV_SECTIONS) {
    for (const it of s.items) {
      if (isRouteActive(pathname, it.to) && (!best || it.to.length > best.len)) {
        best = { headingKey: s.headingKey, labelKey: it.labelKey, len: it.to.length };
      }
    }
  }
  return best;
}
