import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, FileText, BookOpen, User,
  LogOut, ChevronDown, Network, Video,
} from 'lucide-react';
import { WedyLogo } from '../WedyLogo';
import { Avatar } from '../ui';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Moon, Sun } from 'lucide-react';
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
    { label: t('dashboard'),   icon: <LayoutDashboard size={15} />, to: '/employee' },
    { label: t('time_off'),    icon: <Calendar size={15} />,        to: '/employee/conges' },
    { label: t('nav_documents'), icon: <FileText size={15} />,     to: '/employee/documents' },
    { label: t('training'),    icon: <BookOpen size={15} />,        to: '/employee/formation' },
    { label: t('org_chart'),   icon: <Network size={15} />,         to: '/employee/orgchart' },
    { label: t('meetings'),    icon: <Video size={15} />,           to: '/employee/meetings' },
    { label: t('myprofile_title'), icon: <User size={15} />,        to: '/employee/profil' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 192, flexShrink: 0,
        borderRight: dir === 'rtl' ? 'none' : '1px solid var(--border)',
        borderLeft:  dir === 'rtl' ? '1px solid var(--border)' : 'none',
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo row */}
        <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>

        {/* Portal badge */}
        <div style={{ padding: '0 10px 12px' }}>
          <div style={{
            padding: '6px 10px', borderRadius: 8,
            background: 'linear-gradient(135deg, #ecfeff 0%, #eff6ff 100%)',
            border: '1px solid #a5f3fc',
            fontSize: 11, fontWeight: 700, color: '#0891b2',
            textAlign: 'center', letterSpacing: '0.03em',
          }}>
            {t('role_employee_label')}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingBottom: 8 }}>
          {NAV.map(item => {
            const active = item.to === '/employee'
              ? location.pathname === '/employee'
              : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} style={{ textDecoration: 'none', display: 'block' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', margin: '1px 6px', borderRadius: 6, cursor: 'pointer',
                    background: active ? '#ecfeff' : 'transparent',
                    color: active ? '#0891b2' : '#475569',
                    fontWeight: active ? 500 : 400, fontSize: 13,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-muted)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <span style={{ flexShrink: 0, color: active ? '#0891b2' : '#94a3b8' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--border)', position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
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
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{t('role_employee_label')}</div>
            </div>
            <ChevronDown size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
          </button>

          {menuOpen && (
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

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg-muted)' }} className="scroll">
        {children}
      </main>
    </div>
  );
}
