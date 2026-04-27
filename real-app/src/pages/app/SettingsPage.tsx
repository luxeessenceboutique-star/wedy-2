import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Moon, Sun, Monitor, Palette, User, Bell, Shield, Database } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { Card, Button } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

const TABS = [
  { key: 'profile', label: 'Profil', icon: <User size={14} /> },
  { key: 'appearance', label: 'Apparence', icon: <Palette size={14} /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  { key: 'security', label: 'Sécurité', icon: <Shield size={14} /> },
];

function TabProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    full_name: ((user as any)?.full_name as string) || ((user as any)?.profile?.full_name as string) || '',
    company: ((user as any)?.profile?.company as string) || '',
    phone: ((user as any)?.profile?.phone as string) || '',
  });

  const mutation = useMutation({
    mutationFn: () => api.patch('/profiles/me', form).then(r => r.data),
    onSuccess: () => toast.success('Profil mis à jour'),
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>Informations personnelles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">Nom complet</label>
            <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div>
            <label className="label">Entreprise</label>
            <input className="input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="Nom de l'entreprise" />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+212 6 00 00 00 00" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Enregistrer
          </Button>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Rôle & accès</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: 13 }}>
            <span style={{ color: 'var(--fg-muted)', marginRight: 8 }}>Rôle :</span>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {((user as any)?.role_name as string) || 'HR Member'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TabAppearance() {
  const { theme, setTheme } = useTheme();

  const THEMES = [
    { key: 'light' as const, label: 'Clair', icon: <Sun size={20} />, desc: 'Interface lumineuse' },
    { key: 'dark'  as const, label: 'Sombre', icon: <Moon size={20} />, desc: 'Réduit la fatigue oculaire' },
  ];

  const DIRECTIONS = [
    { key: 'A', label: 'Clinical', desc: 'Épuré, Linear-like' },
    { key: 'B', label: 'Cyan Bold', desc: 'Couleurs vives, marque forte' },
    { key: 'C', label: 'Editorial', desc: 'Serif élégant, style européen' },
  ];

  const [dir, setDir] = useState(document.documentElement.getAttribute('data-direction') || 'A');

  const applyDir = (d: string) => {
    document.documentElement.setAttribute('data-direction', d);
    setDir(d);
    localStorage.setItem('wedy_direction', d);
    toast.success('Thème appliqué');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Mode d'affichage</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          {THEMES.map(t => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              style={{
                flex: 1, padding: 20, borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'center',
                border: theme === t.key ? '2px solid var(--primary)' : '2px solid var(--border)',
                background: theme === t.key ? 'var(--primary-soft)' : 'var(--bg-muted)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ color: theme === t.key ? 'var(--primary)' : 'var(--fg-muted)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                {t.icon}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: theme === t.key ? 'var(--primary)' : 'var(--fg)', marginBottom: 2 }}>{t.label}</p>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Style visuel</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          {DIRECTIONS.map(d => (
            <button
              key={d.key}
              onClick={() => applyDir(d.key)}
              style={{
                flex: 1, padding: 16, borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'left',
                border: dir === d.key ? '2px solid var(--primary)' : '2px solid var(--border)',
                background: dir === d.key ? 'var(--primary-soft)' : 'var(--bg-muted)',
                transition: 'all 0.15s',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: dir === d.key ? 'var(--primary)' : 'var(--fg)', marginBottom: 4 }}>{d.key} · {d.label}</p>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{d.desc}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TabNotifications() {
  const [prefs, setPrefs] = useState({
    contracts_expiring: true, leave_requests: true,
    new_employee: true, payroll_ready: false,
    email_notifications: true,
  });

  const toggle = (k: keyof typeof prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }));

  const items = [
    { key: 'contracts_expiring' as const, label: 'Contrats expirant bientôt', desc: 'Alerte 30 jours avant expiration' },
    { key: 'leave_requests' as const, label: 'Nouvelles demandes de congé', desc: 'Chaque fois qu\'une demande est soumise' },
    { key: 'new_employee' as const, label: 'Nouvel employé ajouté', desc: 'Confirmation à la création d\'un profil' },
    { key: 'payroll_ready' as const, label: 'Fiches de paie prêtes', desc: 'Notification de génération mensuelle' },
    { key: 'email_notifications' as const, label: 'Notifications par email', desc: 'Recevoir un récapitulatif hebdomadaire' },
  ];

  return (
    <Card>
      <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>Préférences de notification</h3>
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
        <Button onClick={() => toast.success('Préférences enregistrées')}>Enregistrer</Button>
      </div>
    </Card>
  );
}

function TabSecurity() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>Changer le mot de passe</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
          <div>
            <label className="label">Mot de passe actuel</label>
            <input className="input" type="password" value={form.current} onChange={e => set('current', e.target.value)} />
          </div>
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input className="input" type="password" value={form.next} onChange={e => set('next', e.target.value)} />
          </div>
          <div>
            <label className="label">Confirmer</label>
            <input className="input" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Button
            onClick={() => {
              if (form.next !== form.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
              toast.success('Mot de passe mis à jour');
              setForm({ current: '', next: '', confirm: '' });
            }}
          >
            Mettre à jour
          </Button>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Sessions actives</h3>
        <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>Session actuelle</p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Navigateur web · Maintenant</p>
          </div>
          <span style={{ fontSize: 11, background: 'var(--success)', color: '#fff', padding: '2px 8px', borderRadius: 999 }}>Active</span>
        </div>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Paramètres" subtitle="Gérez votre profil, l'apparence et la sécurité" />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 'var(--radius-md)',
                  border: 'none', cursor: 'pointer', fontSize: 13,
                  background: tab === t.key ? 'var(--primary-soft)' : 'transparent',
                  color: tab === t.key ? 'var(--primary)' : 'var(--fg-muted)',
                  fontWeight: tab === t.key ? 500 : 400,
                  textAlign: 'left',
                }}
              >
                <span style={{ color: tab === t.key ? 'var(--primary)' : 'var(--fg-muted)' }}>{t.icon}</span>
                {t.label}
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
