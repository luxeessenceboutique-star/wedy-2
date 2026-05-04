import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, History, Wand2, Bot,
  BarChart3, Clock, DollarSign, UserPlus, TrendingUp,
  Puzzle, Bell, Settings, HelpCircle, LogOut,
  ChevronDown, ExternalLink, Search, ClipboardList,
  UserCog, Moon, Sun, GraduationCap, UserCheck, BookOpen, Star,
} from 'lucide-react';
import { WedyLogo } from '../WedyLogo';
import { Avatar } from '../ui';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  badge?: string;
  badgeCount?: number;
}

const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard',     icon: <LayoutDashboard size={15} />, to: '/app' },
      { label: 'AI Copilot',    icon: <Bot size={15} />,             to: '/app/copilot',       badge: 'New' },
      { label: 'Notifications', icon: <Bell size={15} />,            to: '/app/notifications', badgeCount: 3 },
    ],
  },
  {
    heading: 'People',
    items: [
      { label: 'Employees',   icon: <Users size={15} />,         to: '/app/employees' },
      { label: 'Interns',     icon: <GraduationCap size={15} />, to: '/app/interns' },
      { label: 'Recruitment', icon: <UserPlus size={15} />,      to: '/app/recruitment' },
      { label: 'Performance', icon: <TrendingUp size={15} />,    to: '/app/performance' },
      { label: 'Time off',    icon: <Clock size={15} />,         to: '/app/timeoff' },
      { label: 'Payroll',     icon: <DollarSign size={15} />,    to: '/app/payroll' },
    ],
  },
  {
    heading: 'Développement RH',
    items: [
      { label: 'Onboarding RH', icon: <UserCheck size={15} />, to: '/app/onboarding' },
      { label: 'Formation',     icon: <BookOpen size={15} />,   to: '/app/training' },
      { label: 'Talents',       icon: <Star size={15} />,       to: '/app/talents' },
    ],
  },
  {
    heading: 'Documents',
    items: [
      { label: 'Generate',  icon: <Wand2 size={15} />,    to: '/app/generate' },
      { label: 'Templates', icon: <FileText size={15} />, to: '/app/templates' },
      { label: 'History',   icon: <History size={15} />,  to: '/app/history' },
    ],
  },
  {
    heading: 'Insights',
    items: [
      { label: 'Analytics',  icon: <BarChart3 size={15} />,     to: '/app/analytics' },
      { label: 'Audit log',  icon: <ClipboardList size={15} />, to: '/app/audit' },
    ],
  },
  {
    heading: 'Workspace',
    items: [
      { label: 'Integrations', icon: <Puzzle size={15} />,   to: '/app/integrations' },
      { label: 'Users & roles',icon: <UserCog size={15} />,  to: '/app/users' },
      { label: 'Settings',     icon: <Settings size={15} />, to: '/app/settings' },
      { label: 'Help',         icon: <HelpCircle size={15}/>, to: '/app/help' },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-direction', 'A');
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const fullName = ((user as any)?.full_name as string) || ((user as any)?.profile?.full_name as string) || user?.email?.split('@')[0] || 'User';
  const initials = fullName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside style={{
        width: 192, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Logo row */}
        <div style={{
          padding: '12px 14px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <WedyLogo size={24} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
            <span style={{ flex: 1, fontSize: 12, color: 'var(--fg-subtle)' }}>Search...</span>
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
              {/* Section heading */}
              <div style={{
                padding: '8px 14px 3px',
                fontSize: 10, fontWeight: 600,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}>
                {section.heading}
              </div>

              {/* Items */}
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

                      {/* "New" text badge */}
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

                      {/* Count badge */}
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
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fullName}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(((user as any)?.role_name as string) === 'admin' || ((user as any)?.roles as string[] | undefined)?.includes('admin')) ? 'HR Admin' : 'HR Member'}
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
                <LogOut size={13} /> Sign out
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
