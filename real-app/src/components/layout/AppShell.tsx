import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, History, Wand2, Bot,
  BarChart3, Clock, DollarSign, UserPlus, TrendingUp,
  Puzzle, Bell, Settings, HelpCircle, LogOut,
  ChevronDown, ExternalLink, Search, ClipboardList,
  UserCog, Moon, Sun, GraduationCap, UserCheck, BookOpen, Star,
  Network, Video, Briefcase, Calendar,
} from 'lucide-react';
import { WedyLogo } from '../WedyLogo';
import { Avatar } from '../ui';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { useLang, type Lang } from '../../lib/lang';
import { listNotifications } from '../../lib/api';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  badge?: string;
  badgeCount?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { t, lang, setLang, dir } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    refetchInterval: 60000,
  });
  const unreadCount = (notifData?.data ?? []).filter(n => !n.is_read).length;

  React.useEffect(() => {
    document.documentElement.setAttribute('data-direction', 'A');
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const fullName =
    ((user as any)?.full_name as string) ||
    ((user as any)?.profile?.full_name as string) ||
    user?.email?.split('@')[0] || 'User';

  const isAdmin =
    (((user as any)?.role_name as string) === 'admin') ||
    (((user as any)?.roles as string[] | undefined)?.includes('admin'));

  // ── Nav sections (labels pulled from translation context) ────────────────
  const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
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
        { label: t('candidats'),      icon: <UserPlus size={15} />,      to: '/app/candidats' },
        { label: t('annonces'),       icon: <Wand2 size={15} />,         to: '/app/annonces', badge: 'AI' },
        { label: t('calendrier_rh'),  icon: <Calendar size={15} />,      to: '/app/calendrier-rh' },
        { label: t('creneaux_rh'),    icon: <Clock size={15} />,         to: '/app/creneaux-rh' },
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

  const LANG_OPTIONS: { code: Lang; label: string; flag: string }[] = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية',  flag: '🇲🇦' },
    { code: 'en', label: 'English',  flag: '🇬🇧' },
  ];

  const currentLang = LANG_OPTIONS.find(l => l.code === lang)!;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside style={{
        width: 192, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
        ...(dir === 'rtl' ? { borderRight: 'none', borderLeft: '1px solid var(--border)' } : {}),
      }}>

        {/* Logo row */}
        <div style={{
          padding: '12px 14px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <WedyLogo size={24} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

            {/* Language switcher */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangMenuOpen(o => !o)}
                title="Language / Langue / اللغة"
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  cursor: 'pointer', color: 'var(--fg-subtle)',
                  padding: '2px 6px', borderRadius: 4,
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 600,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span>{currentLang.flag}</span>
                <span>{currentLang.code.toUpperCase()}</span>
              </button>

              {langMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%',
                  [dir === 'rtl' ? 'right' : 'left']: 0,
                  marginTop: 4, zIndex: 100,
                  background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 8, boxShadow: 'var(--shadow-lg)',
                  minWidth: 130, overflow: 'hidden',
                }}>
                  {LANG_OPTIONS.map(opt => (
                    <button
                      key={opt.code}
                      onClick={() => { setLang(opt.code); setLangMenuOpen(false); }}
                      style={{
                        width: '100%', padding: '8px 12px', border: 'none',
                        background: lang === opt.code ? 'var(--primary-soft)' : 'none',
                        color: lang === opt.code ? 'var(--primary)' : 'var(--fg)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 13, fontWeight: lang === opt.code ? 600 : 400,
                        textAlign: 'start',
                      }}
                      onMouseEnter={e => { if (lang !== opt.code) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; }}
                      onMouseLeave={e => { if (lang !== opt.code) (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                    >
                      <span style={{ fontSize: 16 }}>{opt.flag}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 10px 10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--bg-muted)', borderRadius: 6,
            padding: '6px 10px', border: '1px solid var(--border)',
            cursor: 'text',
          }}>
            <Search size={12} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--fg-subtle)' }}>{t('search')}</span>
            <span style={{
              fontSize: 10, color: 'var(--fg-subtle)',
              background: 'var(--bg-elev)', border: '1px solid var(--border)',
              borderRadius: 3, padding: '1px 4px', fontFamily: 'monospace',
            }}>⌘K</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }} className="scroll">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading} style={{ marginBottom: 2 }}>
              <div style={{
                padding: '8px 14px 3px',
                fontSize: 10, fontWeight: 600,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}>
                {section.heading}
              </div>

              {section.items.map(item => {
                const active = item.to === '/app'
                  ? location.pathname === '/app'
                  : location.pathname.startsWith(item.to);

                return (
                  <Link key={item.to} to={item.to} style={{ textDecoration: 'none', display: 'block' }}>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 10px', margin: '1px 6px',
                        borderRadius: 6, cursor: 'pointer',
                        background: active ? '#ecfeff' : 'transparent',
                        color: active ? '#0891b2' : '#475569',
                        fontWeight: active ? 500 : 400,
                        fontSize: 13,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-muted)'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <span style={{ flexShrink: 0, color: active ? '#0891b2' : '#94a3b8' }}>
                        {item.icon}
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>

                      {item.badge && (
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: '#0891b2', background: '#ecfeff',
                          border: '1px solid #a5f3fc',
                          borderRadius: 999, padding: '1px 6px',
                        }}>
                          {item.badge}
                        </span>
                      )}

                      {item.badgeCount !== undefined && (
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: '#fff', background: '#0891b2',
                          borderRadius: 999, padding: '1px 6px',
                          minWidth: 18, textAlign: 'center',
                        }}>
                          {item.badgeCount}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── USER FOOTER ───────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--border)', position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 9,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Avatar name={fullName} size={28} />
            <div style={{ flex: 1, minWidth: 0, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fullName}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isAdmin ? t('hr_admin') : t('hr_member')}
              </div>
            </div>
            <ChevronDown size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 10, right: 10,
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 8, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 50,
            }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '9px 14px', border: 'none',
                  background: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, color: '#ef4444',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <LogOut size={13} /> {t('sign_out')}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg-muted)' }} className="scroll">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{
      padding: '24px 28px 0',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 20,
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
