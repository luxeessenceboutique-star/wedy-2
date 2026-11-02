import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiError, listEmployees } from '@/services/api';
import { Spinner, Avatar, Modal } from '../../components/ui';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import {
  UserPlus, ShieldCheck, Eye, EyeOff, Copy, CheckCircle, Shield, User,
  Link, Pencil, Minus, ShieldOff, Users, Briefcase,
  UserMinus,
} from 'lucide-react';

// ── API ────────────────────────────────────────────────────────────────────────
const listUsers        = () => api.get('/users').then(r => r.data);
const createUser       = (body: any) => api.post('/users/create-employee', body).then(r => r.data);
const changeUserRole   = (u: { email: string; full_name?: string }, role: string) =>
  api.patch('/users/role-by-email', { email: u.email, full_name: u.full_name ?? '', role }).then(r => r.data);
const listDocRequests  = () => api.get('/users/document-requests').then(r => r.data).catch(() => []);
const updateDocRequest = (id: string, body: any) => api.patch(`/users/document-requests/${id}`, body).then(r => r.data);

// ── Role config ────────────────────────────────────────────────────────────────
const ROLE_CFG: Record<string, { label: string; icon: React.ElementType; tint: string; color: string; desc: string }> = {
  admin:    { label: 'Administrateur', icon: ShieldCheck, tint: '#fbe9e6', color: '#a33a28', desc: 'Accès complet, y compris paramètres, sécurité et facturation.' },
  hr:       { label: 'RH',             icon: Briefcase,   tint: '#e4f2f4', color: '#0b5f72', desc: 'Gère employés, documents, congés, paie et recrutement.' },
  rh:       { label: 'RH',             icon: Briefcase,   tint: '#e4f2f4', color: '#0b5f72', desc: 'Gère employés, documents, congés, paie et recrutement.' },
  manager:  { label: 'Manager',        icon: Users,       tint: '#ece9fb', color: '#5444b8', desc: 'Voit son équipe, valide les congés et mène les entretiens.' },
  employee: { label: 'Employé',        icon: User,        tint: '#eef2f4', color: '#33474f', desc: 'Accède à son portail : congés, documents et formations.' },
};

function getRoleCfg(role: string) {
  return ROLE_CFG[role?.toLowerCase()] ?? ROLE_CFG.employee;
}

const DOC_STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'En attente', color: 'var(--warning-ink)' },
  in_progress: { label: 'En cours',   color: 'var(--primary)' },
  completed:   { label: 'Complété',   color: 'var(--success-ink)' },
  rejected:    { label: 'Refusé',     color: 'var(--danger-ink)' },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  attestation_travail:   'Attestation de travail',
  bulletin_paie:         'Bulletin de paie',
  attestation_conge:     'Attestation de congé',
  certificat_presence:   'Certificat de présence',
  lettre_recommandation: 'Lettre de recommandation',
  autre:                 'Autre',
};

// ── Permissions matrix (static demo) ─────────────────────────────────────────
const MODULES = ['Employés', 'Documents', 'Congés', 'Paie', 'Recrutement', 'Analytics', 'Paramètres', 'Sécurité'];
const PERM_ROLES = ['admin', 'hr', 'manager', 'employee'];
const PERM_INIT: Record<string, number[]> = {
  admin:    [2, 2, 2, 2, 2, 2, 2, 2],
  hr:       [2, 2, 2, 2, 2, 1, 0, 0],
  manager:  [1, 1, 2, 0, 1, 1, 0, 0],
  employee: [0, 1, 1, 0, 0, 0, 0, 0],
};
const PERM_LV = [
  { Icon: Minus,  bg: '#f3f6f7', color: '#a3b1b7', label: 'Aucun accès' },
  { Icon: Eye,    bg: '#ece9fb', color: '#5444b8', label: 'Lecture' },
  { Icon: Pencil, bg: '#e4f2f4', color: '#0e6f84', label: 'Modifier' },
];

// ── Create User Modal ──────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [role, setRole]               = useState<'employee' | 'hr_admin'>('employee');
  const [email, setEmail]             = useState('');
  const [fullName, setFullName]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [created, setCreated]         = useState<any>(null);
  const [copied, setCopied]           = useState(false);
  const [linkedEmpId, setLinkedEmpId] = useState('');

  const { data: empData } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => listEmployees({ limit: 200, status: 'active' }),
    enabled: role === 'employee',
  });
  const employees: any[] = empData?.data ?? [];

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#';
    setPassword(Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
  };

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Email: ${created.email}\nMot de passe: ${created.password}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const mut = useMutation({
    mutationFn: () => createUser({
      email,
      password,
      full_name: fullName,
      role: role === 'hr_admin' ? 'hr' : 'employee',
      ...(linkedEmpId ? { employee_id: linkedEmpId } : {}),
    }),
    onSuccess: (data) => {
      setCreated({ ...data, password });
      onSuccess();
      toast.success(role === 'hr_admin' ? 'Compte Admin RH créé' : 'Compte Employé créé');
    },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur création compte')),
  });

  if (created) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: '16px 18px', background: 'var(--success-soft)', borderRadius: 12, border: '1px solid #a7f3d0', display: 'flex', gap: 12 }}>
          <CheckCircle size={22} style={{ color: 'var(--success-ink)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#065f46' }}>Compte créé avec succès</p>
            <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>Transmettez ces identifiants à l'utilisateur.</p>
          </div>
        </div>
        <div style={{ padding: '14px 16px', background: 'var(--subtle)', borderRadius: 10, fontFamily: 'monospace', fontSize: 14 }}>
          <div style={{ marginBottom: 8 }}><strong>Email :</strong> {created.email}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>Mot de passe :</strong> {created.password}</span>
            <button onClick={copyCredentials}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              {copied ? <><CheckCircle size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
            </button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={onClose} style={{ alignSelf: 'flex-end' }}>Fermer</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="label" style={{ marginBottom: 8, display: 'block' }}>Type de compte *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([
            { value: 'employee', label: 'Employé',  desc: 'Portail employé uniquement',       icon: User,   color: 'var(--success-ink)', bg: 'var(--success-soft)' },
            { value: 'hr_admin', label: 'Admin RH', desc: 'Accès complet à la plateforme RH', icon: Shield, color: 'var(--primary)',     bg: 'var(--primary-soft)' },
          ] as const).map(opt => {
            const Icon = opt.icon;
            const active = role === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setRole(opt.value)}
                style={{
                  padding: '14px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: active ? `2px solid ${opt.color}` : '2px solid var(--border)',
                  background: active ? opt.bg : 'var(--surface)',
                  transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon size={16} style={{ color: opt.color }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: active ? opt.color : 'var(--text)' }}>{opt.label}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {role === 'employee' && (
        <div>
          <label className="label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link size={12} /> Lier à un employé existant
          </label>
          <select
            className="input"
            value={linkedEmpId}
            onChange={e => {
              const id = e.target.value;
              setLinkedEmpId(id);
              if (id) {
                const emp = employees.find((x: any) => x.id === id);
                if (emp) {
                  if (emp.email) setEmail(emp.email);
                  if (emp.full_name) setFullName(emp.full_name);
                }
              }
            }}
          >
            <option value="">— Sélectionner un employé (optionnel) —</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}{emp.position ? ` · ${emp.position}` : ''}
              </option>
            ))}
          </select>
          {linkedEmpId && (
            <p style={{ fontSize: 11, color: 'var(--success-ink)', marginTop: 4 }}>
              L'email du profil employé sera mis à jour pour permettre la connexion au portail.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="label" style={{ marginBottom: 6, display: 'block' }}>Email *</label>
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom.nom@entreprise.com" style={{ width: '100%' }} />
      </div>
      <div>
        <label className="label" style={{ marginBottom: 6, display: 'block' }}>Nom complet</label>
        <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Prénom Nom" style={{ width: '100%' }} />
      </div>

      <div>
        <label className="label" style={{ marginBottom: 6, display: 'block' }}>Mot de passe *</label>
        <div style={{ position: 'relative' }}>
          <input type={showPwd ? 'text' : 'password'} className="input" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 caractères"
            style={{ width: '100%', paddingRight: 88 }} />
          <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button type="button" onClick={generatePassword}
              style={{ background: 'var(--subtle)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--primary)', padding: '2px 6px', fontSize: 11, fontWeight: 600 }}>
              Générer
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 12px', background: role === 'hr_admin' ? 'var(--primary-soft)' : 'var(--success-soft)', borderRadius: 8, fontSize: 12, color: role === 'hr_admin' ? '#1e40af' : '#065f46' }}>
        {role === 'hr_admin'
          ? "L'Admin RH aura accès complet : employés, documents, congés, recrutement, paie et permissions."
          : "L'employé accède uniquement à son portail personnel (profil, congés, documents, formation)."}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" onClick={() => mut.mutate()}
          disabled={mut.isPending || !email || password.length < 6}>
          {mut.isPending ? 'Création…' : 'Créer le compte'}
        </button>
      </div>
    </div>
  );
}

// ── Role Change Dropdown ───────────────────────────────────────────────────────
function RoleDropdown({ user, currentRole, onChanged }: { user: { email: string; full_name?: string }; currentRole: string; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);
  const cfg = getRoleCfg(currentRole);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    if (newRole === currentRole) return;
    setLoading(true);
    try {
      await changeUserRole(user, newRole);
      toast.success('Rôle mis à jour');
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur mise à jour rôle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={['hr', 'rh'].includes(currentRole) ? 'hr' : currentRole}
      onChange={handleChange}
      disabled={loading}
      style={{
        height: 32, padding: '0 8px', borderRadius: 9,
        border: '1px solid transparent',
        background: cfg.tint, color: cfg.color,
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
        cursor: 'pointer', outline: 'none',
      }}>
      <option value="employee">Employé</option>
      <option value="hr">RH</option>
      <option value="manager">Manager</option>
      <option value="admin">Administrateur</option>
    </select>
  );
}

// ── Permissions Panel ──────────────────────────────────────────────────────────
function PermissionsPanel() {
  const [perms, setPerms] = useState(() => JSON.parse(JSON.stringify(PERM_INIT)));

  const cycle = (role: string, mi: number) => {
    if (role === 'admin') return;
    setPerms((prev: any) => ({
      ...prev,
      [role]: prev[role].map((v: number, j: number) => j === mi ? (v + 1) % 3 : v),
    }));
  };

  return (
    <div style={{ borderRadius: 20, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Permissions</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>Cliquez une case pour changer le niveau d'accès.</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 380, padding: '12px 18px 16px' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,1fr) repeat(4,60px)', gap: 6, alignItems: 'end', paddingBottom: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
            <span />
            {PERM_ROLES.map(r => (
              <span key={r} style={{ textAlign: 'center' }}>{getRoleCfg(r).label.substring(0, 7)}</span>
            ))}
          </div>
          {/* Rows */}
          {MODULES.map((mod, mi) => (
            <div key={mod} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,1fr) repeat(4,60px)', gap: 6, alignItems: 'center', marginTop: 5 }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{mod}</span>
              {PERM_ROLES.map(role => {
                const v = perms[role][mi];
                const lv = PERM_LV[v];
                const locked = role === 'admin';
                const Icon = lv.Icon;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => cycle(role, mi)}
                    disabled={locked}
                    title={`${getRoleCfg(role).label} · ${mod} : ${lv.label}${locked ? ' (verrouillé)' : ''}`}
                    style={{
                      height: 32, border: 'none', borderRadius: 8,
                      background: lv.bg, color: lv.color,
                      cursor: locked ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background .2s',
                    }}>
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14, fontSize: 11.5, color: 'var(--text)' }}>
            {PERM_LV.map(lv => {
              const Icon = lv.Icon;
              return (
                <span key={lv.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon size={12} style={{ color: lv.color }} /> {lv.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'users' | 'doc-requests'>('users');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['users-list'], queryFn: listUsers });
  const { data: docRequests = [], isLoading: docLoading } = useQuery({
    queryKey: ['doc-requests-hr'], queryFn: listDocRequests, enabled: tab === 'doc-requests',
  });

  const allUsers: any[] = data?.data ?? [];
  const normaliseRole = (r: string) => (r === 'rh' ? 'hr' : r?.toLowerCase());

  const filteredUsers = allUsers.filter(u => {
    const nr = normaliseRole(u.role);
    const matchRole = !roleFilter || nr === roleFilter;
    const matchQ = !q.trim() || `${u.full_name} ${u.email}`.toLowerCase().includes(q.trim().toLowerCase());
    return matchRole && matchQ;
  });

  const updateDocMut = useMutation({
    mutationFn: ({ id, body }: any) => updateDocRequest(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doc-requests-hr'] }); toast.success('Mis à jour'); },
  });

  const pendingDocCount = (docRequests as any[]).filter((r: any) => r.status === 'pending').length;
  const refresh = () => qc.invalidateQueries({ queryKey: ['users-list'] });

  // Role cards data
  const roleCounts: Record<string, number> = { admin: 0, hr: 0, manager: 0, employee: 0 };
  allUsers.forEach(u => { const nr = normaliseRole(u.role); if (nr in roleCounts) roleCounts[nr]++; });
  const ROLE_CARDS = [
    { key: 'admin',    ...ROLE_CFG.admin    },
    { key: 'hr',       ...ROLE_CFG.hr       },
    { key: 'manager',  ...ROLE_CFG.manager  },
    { key: 'employee', ...ROLE_CFG.employee },
  ];

  return (
    <Page>
      <PageHeader
        title="Utilisateurs et rôles"
        subtitle="Qui peut voir et faire quoi dans Wedy."
        action={
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={16} strokeWidth={2} /> Inviter un utilisateur
          </button>
        }
      />

      {/* Role cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        {ROLE_CARDS.map(r => {
          const Icon = r.icon;
          const active = roleFilter === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRoleFilter(active ? null : r.key)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                padding: '16px 18px', borderRadius: 18,
                border: `1px solid ${active ? r.color : 'var(--border)'}`,
                background: '#fff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                boxShadow: active ? `0 0 0 3px ${r.tint}` : 'none',
                transition: 'border-color .2s, box-shadow .2s',
              }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: r.tint, color: r.color }}>
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{r.label}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                  {roleCounts[r.key] ?? 0}
                </span>
              </span>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-2)' }}>{r.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 24 }}>
        {[
          { id: 'users',        label: `Utilisateurs (${allUsers.length})` },
          { id: 'doc-requests', label: `Demandes de documents${pendingDocCount > 0 ? ` · ${pendingDocCount} en attente` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: '10px 0', fontWeight: 600, fontSize: 14,
            borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab === t.id ? 'var(--primary)' : 'var(--text-2)',
            background: 'none', border: 'none', borderBottomStyle: 'solid',
            borderBottomWidth: 2, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          {/* Users table */}
          <div style={{ flex: '1.5 1 560px', minWidth: 0, borderRadius: 20, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                Comptes avec accès étendu
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                {filteredUsers.length} compte{filteredUsers.length > 1 ? 's' : ''}{roleFilter ? ` · ${getRoleCfg(roleFilter).label}` : ''}
              </span>
              <div style={{ position: 'relative', marginLeft: 'auto', width: 220 }}>
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Rechercher…"
                  style={{
                    width: '100%', height: 36, padding: '0 10px 0 32px',
                    borderRadius: 10, border: '1px solid var(--border)',
                    fontFamily: 'inherit', fontSize: 13, outline: 'none',
                    background: 'var(--surface)',
                  }}
                />
                <svg style={{ position: 'absolute', left: 11, top: '50%', marginTop: -7, color: 'var(--text-muted)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 760 }}>
                {/* Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'minmax(220px,2fr) 150px 90px 130px 110px 44px',
                  alignItems: 'center', padding: '10px 18px',
                  background: '#f8fafb', borderTop: '1px solid #eef2f4', borderBottom: '1px solid #eef2f4',
                  fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)',
                }}>
                  <span>Utilisateur</span><span>Rôle</span><span>2FA</span><span>Activité</span><span>Statut</span><span />
                </div>

                {isLoading ? (
                  <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>
                    <ShieldCheck size={36} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontWeight: 600, margin: '0 0 4px' }}>Aucun utilisateur trouvé.</p>
                    <p style={{ fontSize: 13, margin: 0 }}>Créez des comptes pour qu'ils accèdent à la plateforme.</p>
                    <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>
                      <UserPlus size={14} /> Créer un compte
                    </button>
                  </div>
                ) : (
                  filteredUsers.map((u: any, i: number) => (
                    <div key={u.email ?? i} style={{
                      display: 'grid', gridTemplateColumns: 'minmax(220px,2fr) 150px 90px 130px 110px 44px',
                      alignItems: 'center', padding: '10px 18px',
                      borderBottom: i < filteredUsers.length - 1 ? '1px solid #eef2f4' : 'none',
                      background: '#fff',
                    }}>
                      {/* User */}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <Avatar name={u.full_name || 'U'} size={36} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.full_name || '—'}
                          </span>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.email}
                          </span>
                        </span>
                      </span>
                      {/* Role */}
                      <span>
                        <RoleDropdown user={u} currentRole={u.role} onChanged={refresh} />
                      </span>
                      {/* 2FA */}
                      <span>
                        {u.tfa_enabled ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#0f6f49' }}>
                            <ShieldCheck size={14} /> Activée
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#8a5207' }}>
                            <ShieldOff size={14} /> Non
                          </span>
                        )}
                      </span>
                      {/* Activity */}
                      <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR') : '—'}
                      </span>
                      {/* Status */}
                      <span>
                        <span style={{
                          fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                          background: u.is_active === false ? '#fbe9e6' : '#e1f5ec',
                          color: u.is_active === false ? '#a33a28' : '#0f6f49',
                          whiteSpace: 'nowrap',
                        }}>
                          {u.is_active === false ? 'Inactif' : 'Actif'}
                        </span>
                      </span>
                      {/* Remove */}
                      <button
                        type="button"
                        title="Retirer l'accès"
                        onClick={() => toast.info(`Retirer l'accès de ${u.full_name || u.email} ?`)}
                        style={{
                          width: 32, height: 32, border: 'none', borderRadius: 8,
                          background: 'transparent', color: 'var(--text-muted)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <UserMinus size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Permissions panel */}
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            <PermissionsPanel />
          </div>
        </div>
      )}

      {/* ── Document requests tab ── */}
      {tab === 'doc-requests' && (
        <>
          {docLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
          ) : (docRequests as any[]).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-2)' }}>
              <ShieldCheck size={36} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
              <p>Aucune demande de document.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(docRequests as any[]).map((r: any) => {
                const sm = DOC_STATUS[r.status] ?? DOC_STATUS.pending;
                const docLabel = DOC_TYPE_LABELS[r.doc_type] ?? r.doc_type;
                const emp = r.employees ?? {};
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
                    <Avatar name={emp.full_name ?? '?'} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{emp.full_name ?? '—'}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{emp.department}</span>
                      </div>
                      <p style={{ fontSize: 13, margin: '0 0 3px' }}>{docLabel}</p>
                      {r.comment && <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{r.comment}</p>}
                    </div>
                    <select value={r.status}
                      onChange={e => updateDocMut.mutate({ id: r.id, body: { status: e.target.value } })}
                      style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: `1px solid ${sm.color}44`, background: sm.color + '22', color: sm.color, fontWeight: 700, cursor: 'pointer' }}>
                      {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create / Invite modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Inviter un utilisateur" width={480}>
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { refresh(); setShowCreate(false); }}
        />
      </Modal>
    </Page>
  );
}
