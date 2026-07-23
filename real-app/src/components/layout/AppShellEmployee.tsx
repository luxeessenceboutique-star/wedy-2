import React from 'react';
import {
  LayoutDashboard, Calendar, FileText, BookOpen, User, Network, Video,
} from 'lucide-react';
import { SidebarShell, type NavSection } from './SidebarShell';
import { useLang } from '@/lib/lang';

export function AppShellEmployee({ children }: { children: React.ReactNode }) {
  const { t } = useLang();

  const NAV_SECTIONS: NavSection[] = [
    {
      items: [
        { label: t('dashboard'),       icon: <LayoutDashboard size={15} />, to: '/employee' },
        { label: t('time_off'),        icon: <Calendar size={15} />,        to: '/employee/conges' },
        { label: t('nav_documents'),   icon: <FileText size={15} />,        to: '/employee/documents' },
        { label: t('training'),        icon: <BookOpen size={15} />,        to: '/employee/formation' },
        { label: t('org_chart'),       icon: <Network size={15} />,         to: '/employee/orgchart' },
        { label: t('meetings'),        icon: <Video size={15} />,           to: '/employee/meetings' },
        { label: t('myprofile_title'), icon: <User size={15} />,            to: '/employee/profil' },
      ],
    },
  ];

  const portalBadge = (
    <div style={{
      padding: '6px 12px', borderRadius: 8,
      background: 'var(--primary-soft)',
      border: '1px solid var(--primary-line)',
      fontSize: 11, fontWeight: 700, color: 'var(--primary)',
      textAlign: 'center', letterSpacing: '.04em',
    }}>
      {t('role_employee_label')}
    </div>
  );

  return (
    <SidebarShell sections={NAV_SECTIONS} roleLabel={t('role_employee_label')} topExtra={portalBadge}>
      {children}
    </SidebarShell>
  );
}
