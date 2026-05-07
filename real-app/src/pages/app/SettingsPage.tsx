import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Moon, Sun, Monitor, Palette, User, Bell, Shield, Database } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { Card, Button, Badge } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useLang } from '../../lib/lang';

function TabProfile() {
  const { user } = useAuth();
  const { t } = useLang();
  const [form, setForm] = useState({
    full_name: ((user as any)?.full_name as string) || ((user as any)?.profile?.full_name as string) || '',
    company: ((user as any)?.profile?.company as string) || '',
    phone: ((user as any)?.profile?.phone as string) || '',
  });

  const mutation = useMutation({
    mutationFn: () => api.patch('/profiles/me', form).then(r => r.data),
    onSuccess: () => toast.success(t('save')),
    onError: () => toast.error('Error'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>{t('personal_info')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">{t('full_name_label')}</label>
            <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div>
            <label className="label">{t('company_label')}</label>
            <input className="input" value={form.company} onChange={e => set('company', e.target.value)} placeholder={t('company_label')} />
          </div>
          <div>
            <label className="label">{t('phone_label')}</label>
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+212 6 00 00 00 00" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {t('save')}
          </Button>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{t('role_access')}</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: 13 }}>
            <span style={{ color: 'var(--fg-muted)', marginRight: 8 }}>{t('role_access')} :</span>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {user?.role_name === 'hr' ? t('hr_admin') : t('hr_member')}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TabAppearance() {
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useLang();

  const THEMES = [
    { key: 'light' as const, label: t('light_mode'), icon: <Sun size={20} />, desc: t('light_desc') },
    { key: 'dark'  as const, label: t('dark_mode'), icon: <Moon size={20} />, desc: t('dark_desc') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{t('display_mode')}</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          {THEMES.map(t_item => (
            <button
              key={t_item.key}
              onClick={() => setTheme(t_item.key)}
              style={{
                flex: 1, padding: 20, borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'center',
                border: theme === t_item.key ? '2px solid var(--primary)' : '2px solid var(--border)',
                background: theme === t_item.key ? 'var(--primary-soft)' : 'var(--bg-muted)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ color: theme === t_item.key ? 'var(--primary)' : 'var(--fg-muted)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                {t_item.icon}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: theme === t_item.key ? 'var(--primary)' : 'var(--fg)', marginBottom: 2 }}>{t_item.label}</p>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t_item.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Language (Langue)</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['fr', 'ar', 'en'] as const).map(l => (
            <button key={l}
              onClick={() => setLang(l)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: lang === l ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: lang === l ? 'var(--primary-soft)' : 'var(--bg-elev)',
                color: lang === l ? 'var(--primary)' : 'var(--fg)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase'
              }}>
              {l}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{t('visual_style')}</h3>
        <div style={{ display: 'flex', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked readOnly /> Animations
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked readOnly /> Glassmorphism
          </label>
        </div>
      </Card>
    </div>
  );
}

function TabNotifications() {
  const { t } = useLang();
  const [prefs, setPrefs] = useState({
    contracts_expiring: true, leave_requests: true,
    new_employee: true, payroll_ready: false,
    email_notifications: true,
  });

  const toggle = (k: keyof typeof prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }));

  const items = [
    { key: 'contracts_expiring' as const, label: t('cat_contracts'), desc: t('notif_contracts_desc') },
    { key: 'leave_requests' as const, label: t('cat_leaves'), desc: t('notif_leaves_desc') },
    { key: 'new_employee' as const, label: t('nav_people'), desc: t('notif_new_emp_desc') },
    { key: 'payroll_ready' as const, label: t('payroll'), desc: t('notif_payroll_desc') },
    { key: 'email_notifications' as const, label: t('email_notifs'), desc: t('email_notifs_desc') },
  ];

  return (
    <Card>
      <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>{t('notif_prefs')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 0',
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{item.label}</p>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              style={{
                width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: prefs[item.key] ? 'var(--primary)' : 'var(--border-strong)',
                transition: 'background 0.2s', position: 'relative', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
                left: prefs[item.key] ? 21 : 3,
              }} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Button onClick={() => toast.success(t('save'))}>{t('save')}</Button>
      </div>
    </Card>
  );
}

function TabSecurity() {
  const { t } = useLang();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>{t('change_password')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
          <div>
            <label className="label">{t('current_pass')}</label>
            <input className="input" type="password" value={form.current} onChange={e => set('current', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('new_pass')}</label>
            <input className="input" type="password" value={form.next} onChange={e => set('next', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('confirm_pass')}</label>
            <input className="input" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Button
            onClick={() => {
              if (form.next !== form.confirm) { toast.error(t('confirm_pass')); return; }
              toast.success(t('save'));
              setForm({ current: '', next: '', confirm: '' });
            }}
          >
            {t('save')}
          </Button>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>{t('active_sessions')}</h3>
        <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>{t('current_session')}</p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('browser_web')} · Maintenant</p>
          </div>
          <span style={{ fontSize: 11, background: 'var(--success)', color: '#fff', padding: '2px 8px', borderRadius: 999 }}>{t('status_active_item')}</span>
        </div>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useLang();
  const [tab, setTab] = useState('profile');

  const TABS = [
    { key: 'profile', label: t('tab_profile'), icon: <User size={14} /> },
    { key: 'appearance', label: t('tab_appearance'), icon: <Palette size={14} /> },
    { key: 'notifications', label: t('tab_notifications'), icon: <Bell size={14} /> },
    { key: 'security', label: t('tab_security'), icon: <Shield size={14} /> },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title={t('settings')} subtitle={t('settings_subtitle')} />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TABS.map(t_item => (
              <button
                key={t_item.key}
                onClick={() => setTab(t_item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 'var(--radius-md)',
                  border: 'none', cursor: 'pointer', fontSize: 13,
                  background: tab === t_item.key ? 'var(--primary-soft)' : 'transparent',
                  color: tab === t_item.key ? 'var(--primary)' : 'var(--fg-muted)',
                  fontWeight: tab === t_item.key ? 500 : 400,
                  textAlign: 'left',
                }}
              >
                <span style={{ color: tab === t_item.key ? 'var(--primary)' : 'var(--fg-muted)' }}>{t_item.icon}</span>
                {t_item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {tab === 'profile'       && <TabProfile />}
          {tab === 'appearance'    && <TabAppearance />}
          {tab === 'notifications' && <TabNotifications />}
          {tab === 'security'      && <TabSecurity />}
        </div>
      </div>
    </div>
  );
}
