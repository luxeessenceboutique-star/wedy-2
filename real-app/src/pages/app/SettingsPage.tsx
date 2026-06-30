import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Moon, Sun, Palette, User, Bell, Shield, FileText, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { Card, Button } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { api, listContractTypes, createContractType, updateContractType, deleteContractType } from '../../lib/api';
import type { ContractType } from '../../lib/api';
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
    onSuccess: () => toast.success(t('profile_updated')),
    onError: () => toast.error(t('profile_update_err')),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>{t('personal_info_title')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">{t('label_full_name')}</label>
            <input className="input" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('label_email')}</label>
            <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div>
            <label className="label">{t('label_company')}</label>
            <input className="input" value={form.company} onChange={e => set('company', e.target.value)} placeholder={t('ph_company')} />
          </div>
          <div>
            <label className="label">{t('label_phone')}</label>
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
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{t('role_access_title')}</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: 13 }}>
            <span style={{ color: 'var(--ink-2)', marginRight: 8 }}>{t('role_label')}</span>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {((user as any)?.role_name as string) || t('hr_member')}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TabAppearance() {
  const { theme, setTheme } = useTheme();
  const { t } = useLang();

  const THEMES = [
    { key: 'light' as const, label: t('theme_light_label'), icon: <Sun size={20} />, desc: t('theme_light_desc') },
    { key: 'dark'  as const, label: t('theme_dark_label'),  icon: <Moon size={20} />, desc: t('theme_dark_desc') },
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
    toast.success(t('theme_applied'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{t('display_mode_title')}</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          {THEMES.map(th => (
            <button
              key={th.key}
              onClick={() => setTheme(th.key)}
              style={{
                flex: 1, padding: 20, borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'center',
                border: theme === th.key ? '2px solid var(--primary)' : '2px solid var(--line)',
                background: theme === th.key ? 'var(--primary-soft)' : 'var(--surface-2)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ color: theme === th.key ? 'var(--primary)' : 'var(--ink-2)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                {th.icon}
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: theme === th.key ? 'var(--primary)' : 'var(--fg)', marginBottom: 2 }}>{th.label}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{th.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{t('visual_style_title')}</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          {DIRECTIONS.map(d => (
            <button
              key={d.key}
              onClick={() => applyDir(d.key)}
              style={{
                flex: 1, padding: 16, borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'left',
                border: dir === d.key ? '2px solid var(--primary)' : '2px solid var(--line)',
                background: dir === d.key ? 'var(--primary-soft)' : 'var(--surface-2)',
                transition: 'all 0.15s',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: dir === d.key ? 'var(--primary)' : 'var(--fg)', marginBottom: 4 }}>{d.key} · {d.label}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{d.desc}</p>
            </button>
          ))}
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
    { key: 'contracts_expiring' as const, label: t('notif_contracts_label'), desc: t('notif_contracts_desc') },
    { key: 'leave_requests' as const,     label: t('notif_leaves_label'),    desc: t('notif_leaves_desc') },
    { key: 'new_employee' as const,       label: t('notif_new_emp_label'),   desc: t('notif_new_emp_desc') },
    { key: 'payroll_ready' as const,      label: t('notif_payroll_label'),   desc: t('notif_payroll_desc') },
    { key: 'email_notifications' as const,label: t('notif_email_label'),     desc: t('notif_email_desc') },
  ];

  return (
    <Card>
      <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>{t('notif_prefs_title')}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 0',
            borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{item.label}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{item.desc}</p>
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
                position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--surface)',
                transition: 'left 0.2s', left: prefs[item.key] ? 21 : 3,
              }} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Button onClick={() => toast.success(t('prefs_saved'))}>{t('save')}</Button>
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
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>{t('change_pw_title')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
          <div>
            <label className="label">{t('label_current_pw')}</label>
            <input className="input" type="password" value={form.current} onChange={e => set('current', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('label_new_pw')}</label>
            <input className="input" type="password" value={form.next} onChange={e => set('next', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('label_confirm_pw')}</label>
            <input className="input" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <Button
            onClick={() => {
              if (form.next !== form.confirm) { toast.error(t('pw_mismatch')); return; }
              toast.success(t('pw_updated'));
              setForm({ current: '', next: '', confirm: '' });
            }}
          >
            {t('update_btn')}
          </Button>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>{t('active_sessions_title')}</h3>
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>{t('current_session_label')}</p>
            <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('session_now')}</p>
          </div>
          <span style={{ fontSize: 11, background: 'var(--success)', color: '#fff', padding: '2px 8px', borderRadius: 999 }}>{t('active_badge')}</span>
        </div>
      </Card>
    </div>
  );
}

function TabReferentiels() {
  const qc = useQueryClient();
  const { data: types = [], isLoading } = useQuery({ queryKey: ['contract-types'], queryFn: listContractTypes });

  const [newName, setNewName]   = useState('');
  const [newDesc, setNewDesc]   = useState('');
  const [adding, setAdding]     = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const createMut = useMutation({
    mutationFn: () => createContractType({ name: newName.trim(), description: newDesc.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-types'] });
      setNewName(''); setNewDesc(''); setAdding(false);
      toast.success('Type de contrat ajouté');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMut = useMutation({
    mutationFn: (id: string) => updateContractType(id, { name: editName.trim(), description: editDesc.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-types'] });
      setEditId(null);
      toast.success('Type de contrat mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteContractType(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-types'] });
      toast.success('Type de contrat supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const startEdit = (ct: ContractType) => {
    setEditId(ct.id); setEditName(ct.name); setEditDesc(ct.description ?? '');
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Types de contrat</h3>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>
            Gérez les types de contrat disponibles (CDI, CDD, Stage…)
          </p>
        </div>
        <Button size="sm" onClick={() => { setAdding(true); setEditId(null); }}>
          <Plus size={13} /> Ajouter
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{
          background: 'var(--primary-soft)', border: '1px solid var(--primary-border)',
          borderRadius: 10, padding: '14px 16px', marginBottom: 16,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>Nouveau type de contrat</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Nom *</label>
              <input
                className="input"
                placeholder="ex : CDI, CDD, Freelance…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Description (optionnel)</label>
              <input
                className="input"
                placeholder="ex : Contrat à Durée Indéterminée"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewName(''); setNewDesc(''); }}>
              <X size={13} /> Annuler
            </Button>
            <Button size="sm" loading={createMut.isPending} disabled={!newName.trim()} onClick={() => createMut.mutate()}>
              <Check size={13} /> Enregistrer
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'center', padding: '20px 0' }}>Chargement…</p>
      ) : types.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'center', padding: '20px 0' }}>Aucun type de contrat configuré.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {types.map((ct, i) => (
            <div
              key={ct.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px',
                background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                borderRadius: 8,
              }}
            >
              {editId === ct.id ? (
                /* Inline edit mode */
                <>
                  <input
                    className="input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ width: 120, fontSize: 13 }}
                    autoFocus
                  />
                  <input
                    className="input"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="Description…"
                    style={{ flex: 1, fontSize: 13 }}
                  />
                  <button
                    onClick={() => updateMut.mutate(ct.id)}
                    disabled={!editName.trim() || updateMut.isPending}
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                /* View mode */
                <>
                  <span style={{
                    fontWeight: 700, fontSize: 13, color: 'var(--primary)',
                    background: 'var(--primary-soft)', border: '1px solid var(--primary-border)',
                    borderRadius: 6, padding: '2px 10px', flexShrink: 0,
                  }}>
                    {ct.name}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
                    {ct.description || <em style={{ opacity: 0.5 }}>Pas de description</em>}
                  </span>
                  <button
                    onClick={() => startEdit(ct)}
                    title="Modifier"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer le type « ${ct.name} » ?`)) deleteMut.mutate(ct.id);
                    }}
                    title="Supprimer"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-soft)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const { t } = useLang();
  const [tab, setTab] = useState('profile');

  const TABS = [
    { key: 'profile',       label: t('tab_profile'),           icon: <User size={14} /> },
    { key: 'appearance',    label: t('tab_appearance'),        icon: <Palette size={14} /> },
    { key: 'notifications', label: t('tab_notifications_tab'), icon: <Bell size={14} /> },
    { key: 'security',      label: t('tab_security_tab'),      icon: <Shield size={14} /> },
    { key: 'referentiels',  label: 'Référentiels RH',          icon: <FileText size={14} /> },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title={t('settings')} subtitle={t('settings_subtitle')} />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ width: 180, flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TABS.map(tb => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 'var(--radius-md)',
                  border: 'none', cursor: 'pointer', fontSize: 13,
                  background: tab === tb.key ? 'var(--primary-soft)' : 'transparent',
                  color: tab === tb.key ? 'var(--primary)' : 'var(--ink-2)',
                  fontWeight: tab === tb.key ? 500 : 400,
                  textAlign: 'left',
                }}
              >
                <span style={{ color: tab === tb.key ? 'var(--primary)' : 'var(--ink-2)' }}>{tb.icon}</span>
                {tb.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ flex: 1 }}>
          {tab === 'profile'        && <TabProfile />}
          {tab === 'appearance'     && <TabAppearance />}
          {tab === 'notifications'  && <TabNotifications />}
          {tab === 'security'       && <TabSecurity />}
          {tab === 'referentiels'   && <TabReferentiels />}
        </div>
      </div>
    </div>
  );
}
