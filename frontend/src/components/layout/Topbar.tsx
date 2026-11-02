import { Link, useLocation } from 'react-router-dom';
import { Bell, ChevronRight, Menu, Sparkles } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { findNavMatch } from './navConfig';
import { LangSwitch } from './LangSwitch';

/** Sticky glass bar (design/WedyTopbar.dc.html): breadcrumb from the nav config, ask-Wedy shortcut, bell. */
export function Topbar({ unreadCount, onOpenMenu }: { unreadCount: number; onOpenMenu: () => void }) {
  const { t } = useLang();
  const { pathname } = useLocation();
  const match = findNavMatch(pathname);

  return (
    <header className="wy-topbar">
      <button type="button" className="wy-topbar-menu" onClick={onOpenMenu} aria-label={t('open_menu')}>
        <Menu size={18} />
      </button>

      {match && (
        <div className="wy-crumb">
          <span className="wy-crumb-section">{t(match.headingKey)}</span>
          <span className="wy-crumb-sep" aria-hidden="true"><ChevronRight size={14} /></span>
          <span className="wy-crumb-current" aria-current="page">{t(match.labelKey)}</span>
        </div>
      )}

      <Link to="/app/copilot" className="wy-topbar-ask">
        <span className="wy-topbar-ask-icon"><Sparkles size={15} /></span>
        <span className="wy-topbar-ask-text">{t('ask_wedy')}</span>
      </Link>

      <LangSwitch />

      <Link to="/app/notifications" className="wy-topbar-bell" aria-label={t('notifications')}>
        <Bell size={17} />
        {unreadCount > 0 && <span className="wy-topbar-dot" aria-hidden="true" />}
      </Link>
    </header>
  );
}
