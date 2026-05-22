import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Spinner, Button, Badge, Avatar, Input, Modal } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { UserPlus, ShieldCheck, Eye, EyeOff, Copy, CheckCircle, Shield, User } from 'lucide-react';

// ── API ────────────────────────────────────────────────────────────────────────
const listUsers       = () => api.get('/users').then(r => r.data);
const createUser      = (body: any) => api.post('/users/create-employee', body).then(r => r.data);
const changeUserRole  = (userId: string, role: string) => api.patch(`/users/${userId}/role`, { role }).then(r => r.data);
const listDocRequests = () => api.get('/users/document-requests').then(r => r.data).catch(() => []);
const updateDocRequest = (id: string, body: any) => api.patch(`/users/document-requests/${id}`, body).then(r => r.data);

// ── Role config ────────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'hr',       label: 'Admin RH',  color: '#3b82f6', bg: '#eff6ff',  icon: Shield },
  { value: 'admin',    label: 'Admin',      color: '#ef4444', bg: '#fef2f2',  icon: Shield },
  { value: 'employee', label: 'Employé',    color: '#10b981', bg: '#ecfdf5',  icon: User   },
  { value: 'rh',       label: 'Admin RH',  color: '#3b82f6', bg: '#eff6ff',  icon: Shield },
];

function getRoleMeta(role: string) {
  return ROLES.find(r => r.value === role?.toLowerCase()) ?? ROLES[2];
}

const DOC_STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'En attente', color: '#f59e0b' },
  in_progress: { label: 'En cours',   color: '#3b82f6' },
  completed:   { label: 'Complété',   color: '#10b981' },
  rejected:    { label: 'Refusé',     color: '#ef4444' },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  attestation_travail:   'Attestation de travail',
  bulletin_paie:         'Bulletin de paie',
  attestation_conge:     'Attestation de congé',
  certificat_presence:   'Certificat de présence',
  lettre_recommandation: 'Lettre de recommandation',
  autre:                 'Autre',
};

// ── Create User Modal ──────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [role, setRole]         = useState<'employee' | 'hr_admin'>('employee');
  const [email, setEmail]       = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [created, setCreated]   = useState<any>(null);
  const [copied, setCopied]     = useState(false);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#';
    setPassword(Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
  };

  const copyCredentials = () => {
    navigator.clipboard.writeText(`Email: ${created.email}\nMot de passe: ${created.password}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const mut = useMutation({
    mutationFn: () => createUser({ email, password, full_name: fullName, role: role === 'hr_admin' ? 'hr' : 'employee' }),
    onSuccess: (data) => {
      setCreated({ ...data, password });
      onSuccess();
      toast.success(role === 'hr_admin' ? 'Compte Admin RH créé' : 'Compte Employé créé');
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur création compte'),
  });

  if (created) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: '16px 18px', background: '#ecfdf5', borderRadius: 12, border: '1px solid #a7f3d0', display: 'flex', gap: 12 }}>
          <CheckCircle size={22} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#065f46' }}>Compte créé avec succès</p>
            <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>Transmettez ces identifiants à l'utilisateur.</p>
          </div>
        </div>
        <div style={{ padding: '14px 16px', background: 'var(--bg-muted)', borderRadius: 10, fontFamily: 'monospace', fontSize: 14 }}>
          <div style={{ marginBottom: 8 }}><strong>Email :</strong> {created.email}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>Mot de passe :</strong> {created.password}</span>
            <button onClick={copyCredentials}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              {copied ? <><CheckCircle size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
            </button>
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: role === 'hr_admin' ? '#eff6ff' : '#ecfdf5', borderRadius: 8, fontSize: 12, color: role === 'hr_admin' ? '#1e40af' : '#065f46' }}>
          {role === 'hr_admin'
            ? 'Cet Admin RH peut gérer les employés, documents, congés et toutes les permissions.'
            : "L'employé accède uniquement à son profil, ses documents et ses demandes."}
        </div>
        <Button onClick={onClose}>Fermer</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Role selector */}
      <div>
        <label className="label" style={{ marginBottom: 8, display: 'block' }}>Type de compte *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([
            { value: 'employee', label: 'Employé',   desc: 'Portail employé uniquement',         icon: User,   color: '#10b981', bg: '#ecfdf5' },
            { value: 'hr_admin', label: 'Admin RH',  desc: 'Accès complet à la plateforme RH',   icon: Shield, color: '#3b82f6', bg: '#eff6ff' },
          ] as const).map(opt => {
            const Icon = opt.icon;
            const active = role === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setRole(opt.value)}
                style={{
                  padding: '14px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  border: active ? `2px solid ${opt.color}` : '2px solid var(--border)',
                  background: active ? opt.bg : 'var(--bg-elev)',
                  transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon size={16} style={{ color: opt.color }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: active ? opt.color : 'var(--fg)' }}>{opt.label}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <Input label="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom.nom@entreprise.com" required />
      <Input label="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Prénom Nom" />

      {/* Password */}
      <div>
        <label className="label">Mot de passe *</label>
        <div style={{ position: 'relative' }}>
          <input type={showPwd ? 'text' : 'password'} className="input" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 caractères"
            style={{ paddingRight: 88 }} />
          <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}>
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button type="button" onClick={generatePassword}
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--primary)', padding: '2px 6px', fontSize: 11, fontWeight: 600 }}>
              Générer
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ padding: '10px 12px', background: role === 'hr_admin' ? '#eff6ff' : '#ecfdf5', borderRadius: 8, fontSize: 12, color: role === 'hr_admin' ? '#1e40af' : '#065f46' }}>
        {role === 'hr_admin'
          ? 'L\'Admin RH aura accès complet : employés, documents, congés, recrutement, paie et permissions.'
          : "L'employé accède uniquement à son portail personnel (profil, congés, documents, formation)."}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={() => mut.mutate()} loading={mut.isPending}
          disabled={!email || password.length < 6}>
          Créer le compte
        </Button>
      </div>
    </div>
  );
}

// ── Role Change Dropdown ───────────────────────────────────────────────────────
function RoleDropdown({ userId, currentRole, onChanged }: { userId: string; currentRole: string; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    if (newRole === currentRole) return;
    setLoading(true);
    try {
      await changeUserRole(userId, newRole);
      toast.success('Rôle mis à jour');
      onChanged();
    } catch {
      toast.error('Erreur mise à jour rôle');
    } finally {
      setLoading(false);
    }
  };

  const meta = getRoleMeta(currentRole);
  return (
    <select
      value={currentRole === 'hr' ? 'hr' : currentRole}
      onChange={handleChange}
      disabled={loading}
      style={{
        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
        border: `1px solid ${meta.color}44`,
        background: meta.bg, color: meta.color,
        cursor: 'pointer', appearance: 'none', paddingRight: 24,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='${encodeURIComponent(meta.color)}' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
      }}>
      <option value="employee">Employé</option>
      <option value="hr">Admin RH</option>
      <option value="admin">Admin</option>
    </select>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'users' | 'doc-requests'>('users');

  const { data, isLoading } = useQuery({ queryKey: ['users-list'], queryFn: listUsers });
  const { data: docRequests = [], isLoading: docLoading } = useQuery({
    queryKey: ['doc-requests-hr'], queryFn: listDocRequests, enabled: tab === 'doc-requests',
  });

  const users: any[] = data?.data ?? [];
  const updateDocMut = useMutation({
    mutationFn: ({ id, body }: any) => updateDocRequest(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doc-requests-hr'] }); toast.success('Mis à jour'); },
  });

  const pendingDocCount = (docRequests as any[]).filter((r: any) => r.status === 'pending').length;
  const hrCount  = users.filter(u => ['hr', 'rh', 'admin'].includes(u.role)).length;
  const empCount = users.filter(u => u.role === 'employee').length;

  const refresh = () => qc.invalidateQueries({ queryKey: ['users-list'] });

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Utilisateurs & Permissions"
        subtitle="Gestion des accès et rôles de la plateforme"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <UserPlus size={14} /> Créer un compte
          </Button>
        }
      />

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total utilisateurs', value: users.length, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Admins RH',          value: hrCount,      color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Employés',           value: empCount,     color: '#10b981', bg: '#ecfdf5' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: '14px 18px', background: s.bg, borderRadius: 12, border: `1px solid ${s.color}22` }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 24, marginBottom: 20 }}>
        {[
          { id: 'users',        label: `Utilisateurs (${users.length})` },
          { id: 'doc-requests', label: `Demandes documents${pendingDocCount > 0 ? ` · ${pendingDocCount} en attente` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: '10px 0', fontWeight: 600, fontSize: 14,
            borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab === t.id ? 'var(--primary)' : 'var(--fg-muted)',
            background: 'none', border: 'none', cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.2fr 1fr',
            padding: '10px 20px', borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Utilisateur</span><span>Email</span><span>Rôle</span><span>Statut</span>
          </div>

          {isLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : users.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-muted)' }}>
              <ShieldCheck size={36} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600 }}>Aucun utilisateur trouvé.</p>
              <p style={{ fontSize: 13 }}>Créez des comptes pour qu'ils accèdent à la plateforme.</p>
              <Button style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>
                <UserPlus size={14} /> Créer un compte
              </Button>
            </div>
          ) : (
            users.map((u: any, i: number) => (
              <div key={u.user_id ?? i} style={{
                display: 'grid', gridTemplateColumns: '2fr 2.5fr 1.2fr 1fr',
                alignItems: 'center', padding: '14px 20px',
                borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={u.full_name || 'U'} size={36} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{u.full_name || '—'}</span>
                </div>
                <span style={{ fontSize: 13, color: '#0891b2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email || '—'}
                </span>
                <RoleDropdown userId={u.user_id} currentRole={u.role} onChanged={refresh} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '3px 10px', borderRadius: 20, width: 'fit-content' }}>
                  Actif
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Document requests tab ── */}
      {tab === 'doc-requests' && (
        <>
          {docLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
          ) : (docRequests as any[]).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
              <ShieldCheck size={36} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
              <p>Aucune demande de document.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(docRequests as any[]).map((r: any) => {
                const sm = DOC_STATUS[r.status] ?? DOC_STATUS.pending;
                const docLabel = DOC_TYPE_LABELS[r.doc_type] ?? r.doc_type;
                const emp = r.employees ?? {};
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-elev)' }}>
                    <Avatar name={emp.full_name ?? '?'} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{emp.full_name ?? '—'}</span>
                        <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{emp.department}</span>
                      </div>
                      <p style={{ fontSize: 13, margin: '0 0 3px' }}>{docLabel}</p>
                      {r.comment && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>{r.comment}</p>}
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

      {/* Create account modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Créer un compte" width={480}>
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { refresh(); setShowCreate(false); }}
        />
      </Modal>
    </div>
  );
}
