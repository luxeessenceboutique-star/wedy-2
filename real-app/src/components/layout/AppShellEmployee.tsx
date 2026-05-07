import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, FileText, BookOpen, User,
  LogOut, ChevronDown, Bell,
} from 'lucide-react';
import { WedyLogo } from '../WedyLogo';
import { Avatar } from '../ui';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Moon, Sun } from 'lucide-react';

const NAV = [
  { label: 'Tableau de bord', icon: <LayoutDashboard size={15} />, to: '/employee' },
  { label: 'Mes Congés', icon: <Calendar size={15} />, to: '/employee/conges' },
  { label: 'Mes Documents', icon: <FileText size={15} />, to: '/employee/documents' },
  { label: 'Ma Formation', icon: <BookOpen size={15} />, to: '/employee/formation' },
  { label: 'Mon Profil', icon: <User size={15} />, to: '/employee/profil' },
];

export function AppShellEmployee({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const fullName = (user as any)?.full_name || user?.email?.split('@')[0] || 'Employé';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 192, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo row */}
        <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <WedyLogo size={24} />
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
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
            Portail Employé
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
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Employé</div>
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
                <LogOut size={13} /> Se déconnecter
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
