import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, History, Wand2, Bot,
  BarChart3, Clock, DollarSign, UserPlus, TrendingUp,
  Puzzle, Bell, Settings, HelpCircle, LogOut,
  ChevronDown, Search, ClipboardList,
  UserCog, Moon, Sun, GraduationCap, UserCheck, BookOpen, Star,
  Network, Video, Briefcase, Calendar, Target,
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
    document.documentElement.removeAttribute('data-direction');
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
        width: 228, flexShrink: 0,
        borderRight: dir === 'rtl' ? 'none' : '1px solid var(--line)',
        borderLeft: dir === 'rtl' ? '1px solid var(--line)' : 'none',
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-sm)',
      }}>

        {/* Logo row */}
        <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <WedyLogo size={26} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-3)', padding: 6, borderRadius: 7,
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Language switcher */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangMenuOpen(o => !o)}
                title="Language"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-3)', padding: '4px 7px', borderRadius: 7,
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 700,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span>{currentLang.flag}</span>
                <span style={{ letterSpacing: '.04em' }}>{currentLang.code.toUpperCase()}</span>
              </button>
              {langMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%',
                  [dir === 'rtl' ? 'right' : 'left']: 0,
                  marginTop: 6, zIndex: 100,
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 10, boxShadow: 'var(--shadow-lg)',
                  minWidth: 140, overflow: 'hidden',
                }}>
                  {LANG_OPTIONS.map(opt => (
                    <button
                      key={opt.code}
                      onClick={() => { setLang(opt.code); setLangMenuOpen(false); }}
                      style={{
                        width: '100%', padding: '8px 14px', border: 'none',
                        background: lang === opt.code ? 'var(--primary-soft)' : 'none',
                        color: lang === opt.code ? 'var(--primary)' : 'var(--ink)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9,
                        fontSize: 13, fontWeight: lang === opt.code ? 600 : 400, textAlign: 'start',
                      }}
                      onMouseEnter={e => { if (lang !== opt.code) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { if (lang !== opt.code) (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                    >
                      <span style={{ fontSize: 16 }}>{opt.flag}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface-2)', borderRadius: 9,
            padding: '7px 11px', border: '1px solid var(--line)', cursor: 'text',
          }}>
            <Search size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-3)' }}>{t('search')}</span>
            <span style={{
              fontSize: 10, color: 'var(--ink-3)',
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 5, padding: '1px 5px', fontFamily: 'var(--font-mono)',
            }}>⌘K</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 10 }} className="scroll">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading} style={{ marginBottom: 4 }}>
              <div style={{
                padding: '8px 19px 4px',
                fontSize: 10, fontWeight: 700,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
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
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 11px', margin: '1px 8px',
                        borderRadius: 9, cursor: 'pointer',
                        background: active ? 'var(--primary-soft)' : 'transparent',
                        color: active ? 'var(--primary)' : 'var(--ink-2)',
                        fontWeight: active ? 600 : 400,
                        fontSize: 13,
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <span style={{ flexShrink: 0, color: active ? 'var(--primary)' : 'var(--ink-3)', display: 'flex' }}>
                        {item.icon}
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>

                      {item.badge === 'AI' || item.badge === 'New' ? (
                        <span style={{
                          fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em',
                          color: item.badge === 'AI' ? 'var(--violet)' : 'var(--primary)',
                          background: item.badge === 'AI' ? 'var(--violet-soft)' : 'var(--primary-soft)',
                          border: `1px solid ${item.badge === 'AI' ? 'color-mix(in srgb,var(--violet) 25%,transparent)' : 'var(--primary-line)'}`,
                          borderRadius: 999, padding: '1px 6px',
                        }}>
                          {item.badge}
                        </span>
                      ) : item.badge ? (
                        <span style={{
                          fontSize: 9.5, fontWeight: 700,
                          color: 'var(--primary)', background: 'var(--primary-soft)',
                          border: '1px solid var(--primary-line)',
                          borderRadius: 999, padding: '1px 6px',
                        }}>{item.badge}</span>
                      ) : null}

                      {item.badgeCount !== undefined && item.badgeCount > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: '#fff', background: 'var(--primary)',
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
        <div style={{ borderTop: '1px solid var(--line)', position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '11px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Avatar name={fullName} size={30} />
            <div style={{ flex: 1, minWidth: 0, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fullName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isAdmin ? t('hr_admin') : t('hr_member')}
              </div>
            </div>
            <ChevronDown size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          </button>

          {userMenuOpen && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 8, right: 8,
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 50,
            }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '9px 14px', border: 'none',
                  background: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, color: 'var(--danger)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <LogOut size={13} /> {t('sign_out')}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }} className="scroll">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{
      padding: '26px 30px 0',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 22, gap: 16,
    }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 700,
          letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 3,
        }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>{action}</div>}
    </div>
  );
}
