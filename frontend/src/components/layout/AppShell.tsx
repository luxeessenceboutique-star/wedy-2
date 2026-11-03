import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { cx } from '@/lib/visual';
import { listNotifications, getInboxCount } from '@/services/api';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useIdleLogout } from '@/lib/useIdleLogout';

export { PageHeader } from './PageHeader';
export { Page } from './Page';

export function AppShell({ children }: { children: React.ReactNode }) {
  useIdleLogout();
  const { user } = useAuth();
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = React.useState(false);

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

  // Escape closes the mobile drawer
  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const isAdmin =
    (((user as any)?.role_name as string) === 'admin') ||
    (((user as any)?.roles as string[] | undefined)?.includes('admin'));

  return (
    <div className="wy-shell">
      <div className={cx('wy-shell-scrim', menuOpen && 'is-open')} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <div className={cx('wy-shell-side', menuOpen && 'is-open')}>
        <Sidebar
          unreadCount={unreadCount}
          pendingRequests={pendingRequests}
          roleLabel={isAdmin ? t('hr_admin') : t('hr_member')}
          onNavigate={() => setMenuOpen(false)}
        />
      </div>
      <div className="wy-shell-main scroll">
        <Topbar unreadCount={unreadCount} onOpenMenu={() => setMenuOpen(true)} />
        {children}
      </div>
    </div>
  );
}
