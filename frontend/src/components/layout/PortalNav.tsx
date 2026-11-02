import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { cx, displayName, initialsOf } from '@/lib/visual';
import { PORTAL_TABS, isRouteActive } from './navConfig';
import { LangSwitch } from './LangSwitch';

const COMPACT_BELOW = 1100;

/**
 * Employee portal header (design/WedyPortalNav.dc.html): logo + "Espace collaborateur", tabs, avatar.
 * Under 1100px of header width the tabs drop to their own scrollable row.
 * `showAsk` adds the dark "Demander à Wedy" button; it is off by default because employees have no copilot route yet.
 */
export function PortalNav({ showAsk = false }: { showAsk?: boolean }) {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const hdrRef = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < COMPACT_BELOW);
  const fullName = displayName(user);

  useEffect(() => {
    const el = hdrRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCompact(el.clientWidth < COMPACT_BELOW));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={hdrRef} className={cx('wy-pnav', compact && 'is-compact')}>
      <div className="wy-pnav-in">
        <Link to="/employee" className="wy-pnav-logo">
          <img src="/wedy-avatar.png" alt="Wedy" />
          <span className="wy-pnav-brand">Wedy</span>
          <span className="wy-pnav-chip">{t('portal_space_label')}</span>
        </Link>

        <nav className="wy-pnav-tabs" aria-label={t('main_navigation')}>
          {PORTAL_TABS.map(tab => {
            const active = isRouteActive(pathname, tab.to);
            const Icon = tab.icon;
            return (
              <Link key={tab.to} to={tab.to} className={cx('wy-pnav-tab', active && 'is-active')} aria-current={active ? 'page' : undefined}>
                <Icon size={15} />
                {t(tab.labelKey)}
              </Link>
            );
          })}
        </nav>

        {showAsk && (
          <Link to="/app/copilot" className="wy-pnav-ask wy-pnav-push" aria-label={t('ask_wedy_short')}>
            <span className="wy-pnav-ask-icon"><Sparkles size={14} /></span>
            {!compact && <span>{t('ask_wedy_short')}</span>}
          </Link>
        )}

        <div className={cx('wy-pnav-lang', !showAsk && 'wy-pnav-push')}>
          <LangSwitch />
        </div>

        <span className="wy-pnav-me" title={fullName}>
          {initialsOf(fullName)}
          <span className="wy-pnav-presence" aria-hidden="true" />
        </span>

        <button type="button" className="wy-pnav-logout" onClick={() => { logout(); navigate('/login'); }} aria-label={t('sign_out')} title={t('sign_out')}>
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
