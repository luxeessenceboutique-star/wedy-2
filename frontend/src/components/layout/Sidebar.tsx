import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { cx, displayName, initialsOf } from '@/lib/visual';
import { NAV_SECTIONS, isRouteActive } from './navConfig';

/** HR sidebar (design/WedyNav.dc.html): 252px, dark, one source of truth for the whole app. */
export function Sidebar({ unreadCount, pendingRequests, roleLabel, onNavigate }: {
  unreadCount: number; pendingRequests: number; roleLabel: string;
  /** called when a link is followed (closes the mobile drawer) */
  onNavigate?: () => void;
}) {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fullName = displayName(user);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="wy-side" aria-label={t('main_navigation')}>
      <div className="wy-side-glow" aria-hidden="true" />

      <Link to="/app" className="wy-side-logo" onClick={onNavigate}>
        <img src="/wedy-avatar.png" alt="Wedy" />
        <span className="wy-side-brand">Wedy</span>
        <span className="wy-side-chip">RH</span>
      </Link>

      <Link to="/app/copilot" className="wy-side-ask" onClick={onNavigate}>
        <span className="wy-side-ask-icon"><Sparkles size={14} /></span>
        <span className="wy-side-ask-text">{t('ask_wedy')}</span>
        <span className="wy-side-kbd">⌘K</span>
      </Link>

      <nav className="wy-side-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.headingKey}>
            <div className="wy-side-heading">{t(section.headingKey)}</div>
            {section.items.map(item => {
              const active = isRouteActive(pathname, item.to);
              const count = item.badge === 'notifications' ? unreadCount : item.badge === 'requests' ? pendingRequests : 0;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to} to={item.to} onClick={onNavigate}
                  className={cx('wy-side-item', active && 'is-active')}
                  aria-current={active ? 'page' : undefined}
                >
                  {active && <span className="wy-side-bar" aria-hidden="true" />}
                  <span className="wy-side-icon"><Icon size={16} /></span>
                  <span className="wy-side-label">{t(item.labelKey)}</span>
                  {count > 0 && <span className="wy-side-count">{count > 99 ? '99+' : count}</span>}
                  {item.badge === 'new' && <span className="wy-side-tag wy-side-tag--new">{t('badge_new')}</span>}
                  {item.badge === 'ai' && <span className="wy-side-tag wy-side-tag--ai">{t('badge_ai')}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="wy-side-foot">
        <span className="wy-side-user-av">{initialsOf(fullName)}</span>
        <div className="wy-side-user">
          <div className="wy-side-user-name">{fullName}</div>
          <div className="wy-side-user-role">{roleLabel}</div>
        </div>
        <button type="button" className="wy-side-logout" onClick={handleLogout} aria-label={t('sign_out')} title={t('sign_out')}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
