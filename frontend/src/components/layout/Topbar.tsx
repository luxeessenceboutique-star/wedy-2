import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Menu, Sparkles } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { findNavMatch } from './navConfig';
import { LangSwitch } from './LangSwitch';
import { copilotUrl } from '@/lib/copilotAsk';

/** Sticky glass bar (design/WedyTopbar.dc.html): breadcrumb from the nav config, ask-Wedy shortcut, bell. */
export function Topbar({ unreadCount, onOpenMenu }: { unreadCount: number; onOpenMenu: () => void }) {
  const { t } = useLang();
  const { pathname } = useLocation();
  const match = findNavMatch(pathname);
  const navigate = useNavigate();
  const [ask, setAsk] = useState('');

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

      <form className="wy-topbar-ask" role="search" onSubmit={e => { e.preventDefault(); navigate(copilotUrl(ask)); setAsk(''); }}>
        <span className="wy-topbar-ask-icon"><Sparkles size={15} /></span>
        <input className="wy-topbar-ask-input" value={ask} onChange={e => setAsk(e.target.value)} placeholder={t('ask_wedy')} aria-label={t('ask_wedy_short')} enterKeyHint="send" />
      </form>

      <LangSwitch />

      <Link to="/app/notifications" className="wy-topbar-bell" aria-label={t('notifications')}>
        <Bell size={17} />
        {unreadCount > 0 && <span className="wy-topbar-dot" aria-hidden="true" />}
      </Link>
    </header>
  );
}
