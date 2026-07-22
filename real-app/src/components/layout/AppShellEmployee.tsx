import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, FileText, BookOpen, User,
  LogOut, ChevronDown, Network, Video, Moon, Sun, Search,
} from 'lucide-react';
import { WedyLogo } from '../WedyLogo';
import { Avatar } from '../ui';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { useLang, type Lang } from '../../lib/lang';

const LANG_OPTIONS: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية',  flag: '🇲🇦' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
];

export function AppShellEmployee({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { t, lang, setLang, dir } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const fullName = (user as any)?.full_name || user?.email?.split('@')[0] || 'Employé';
  const currentLang = LANG_OPTIONS.find(l => l.code === lang)!;

  const NAV = [
    { label: t('dashboard'),       icon: <LayoutDashboard size={15} />, to: '/employee' },
    { label: t('time_off'),        icon: <Calendar size={15} />,        to: '/employee/conges' },
    { label: t('nav_documents'),   icon: <FileText size={15} />,        to: '/employee/documents' },
    { label: t('training'),        icon: <BookOpen size={15} />,        to: '/employee/formation' },
    { label: t('org_chart'),       icon: <Network size={15} />,         to: '/employee/orgchart' },
    { label: t('meetings'),        icon: <Video size={15} />,           to: '/employee/meetings' },
    { label: t('myprofile_title'), icon: <User size={15} />,            to: '/employee/profil' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 228, flexShrink: 0,
        borderRight: dir === 'rtl' ? 'none' : '1px solid var(--line)',
        borderLeft:  dir === 'rtl' ? '1px solid var(--line)' : 'none',
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-sm)',
      }}>

        {/* Logo row */}
        <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <WedyLogo size={26} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 6, borderRadius: 7, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setLangMenuOpen(o => !o)}
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

        {/* Portal badge */}
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{
            padding: '6px 12px', borderRadius: 8,
            background: 'var(--primary-soft)',
            border: '1px solid var(--primary-line)',
            fontSize: 11, fontWeight: 700, color: 'var(--primary)',
            textAlign: 'center', letterSpacing: '.04em',
          }}>
            {t('role_employee_label')}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface-2)', borderRadius: 9,
            padding: '7px 11px', border: '1px solid var(--line)',
          }}>
            <Search size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{t('search')}</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingBottom: 10, overflowY: 'auto' }} className="scroll">
          {NAV.map(item => {
            const active = item.to === '/employee'
              ? location.pathname === '/employee'
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
                    fontWeight: active ? 600 : 400, fontSize: 13,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <span style={{ flexShrink: 0, color: active ? 'var(--primary)' : 'var(--ink-3)', display: 'flex' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--line)', position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Avatar name={fullName} size={30} />
            <div style={{ flex: 1, minWidth: 0, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fullName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t('role_employee_label')}</div>
            </div>
            <ChevronDown size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          </button>
          {menuOpen && (
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

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }} className="scroll">
        {children}
      </main>
    </div>
  );
}
