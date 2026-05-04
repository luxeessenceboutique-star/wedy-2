import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Spinner, Button, Badge, Avatar, Input, Modal } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { UserPlus, ShieldCheck, Key, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';

// ── API ────────────────────────────────────────────────────────────────────────
const listUsers = () => api.get('/users').then(r => r.data);
const createEmployeeAccount = (body: any) => api.post('/users/create-employee', body).then(r => r.data);
const listEmployees = () => api.get('/employees?status=active&limit=200').then(r => r.data);
const listDocRequests = () => api.get('/users/document-requests').then(r => r.data).catch(() => []);
const updateDocRequest = (id: string, body: any) => api.patch(`/users/document-requests/${id}`, body).then(r => r.data);

const ROLE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  admin:    { label: 'Admin',    color: '#ef4444', bg: '#fef2f2' },
  hr:       { label: 'RH',      color: '#3b82f6', bg: '#eff6ff' },
  rh:       { label: 'RH',      color: '#3b82f6', bg: '#eff6ff' },
  employee: { label: 'Employé', color: '#10b981', bg: '#ecfdf5' },
  manager:  { label: 'Manager', color: '#f59e0b', bg: '#fffbeb' },
};

const DOC_STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'En attente',  color: '#f59e0b' },
  in_progress: { label: 'En cours',    color: '#3b82f6' },
  completed:   { label: 'Complété',    color: '#10b981' },
  rejected:    { label: 'Refusé',      color: '#ef4444' },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  attestation_travail:   'Attestation de travail',
  bulletin_paie:         'Bulletin de paie',
  attestation_conge:     'Attestation de congé',
  certificat_presence:   'Certificat de présence',
  lettre_recommandation: 'Lettre de recommandation',
  autre:                 'Autre',
};

// ── Create Account Modal ────────────────────────────────────────────────────────
function CreateAccountModal({ employees, onClose, onSuccess }: any) {
  const [form, setForm] = useState({ employee_id: '', email: '', full_name: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onSelectEmployee = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const emp = employees.find((em: any) => em.id === e.target.value);
    if (emp) {
      setForm(f => ({ ...f, employee_id: emp.id, email: emp.email ?? '', full_name: emp.full_name ?? '' }));
    } else {
      setForm(f => ({ ...f, employee_id: '', email: '', full_name: '' }));
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#';
    const pwd = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm(f => ({ ...f, password: pwd }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const submitMut = useMutation({
    mutationFn: () => createEmployeeAccount({ email: form.email, password: form.password, full_name: form.full_name }),
    onSuccess: (data) => {
      setCreated({ ...data, password: form.password });
      onSuccess();
      toast.success('Compte employé créé');
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur création compte'),
  });

  if (created) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: '16px 18px', background: '#ecfdf5', borderRadius: 12, border: '1px solid #a7f3d0', display: 'flex', gap: 12 }}>
          <CheckCircle size={24} style={{ color: '#10b981', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#065f46' }}>Compte créé avec succès</p>
            <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>Transmettez ces identifiants à l'employé.</p>
          </div>
        </div>
        <div style={{ padding: '14px 16px', background: 'var(--bg-muted)', borderRadius: 10, fontFamily: 'monospace', fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span><strong>Email :</strong> {created.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>Mot de passe :</strong> {created.password}</span>
            <button onClick={() => copyToClipboard(`Email: ${created.email}\nMot de passe: ${created.password}`)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              {copied ? <><CheckCircle size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
            </button>
          </div>
        </div>
        <Button onClick={onClose}>Fermer</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label className="label">Sélectionner un employé</label>
        <select className="input" value={form.employee_id} onChange={onSelectEmployee}>
          <option value="">Choisir un employé...</option>
          {employees.map((e: any) => (
            <option key={e.id} value={e.id}>{e.full_name} — {e.department}</option>
          ))}
        </select>
      </div>
      <Input label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="prenom.nom@entreprise.com" required />
      <Input label="Nom complet" value={form.full_name} onChange={set('full_name')} placeholder="Prénom Nom" />
      <div>
        <label className="label">Mot de passe *</label>
        <div style={{ position: 'relative' }}>
          <input type={showPwd ? 'text' : 'password'} className="input" value={form.password}
            onChange={set('password')} placeholder="Minimum 6 caractères"
            style={{ paddingRight: 80 }} />
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
      <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e40af' }}>
        L'employé pourra se connecter sur le Portail Employé avec ces identifiants et accéder uniquement à ses propres données.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button
          onClick={() => submitMut.mutate()}
          loading={submitMut.isPending}
          disabled={!form.email || form.password.length < 6}>
          Créer le compte
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'users' | 'doc-requests'>('users');

  const { data, isLoading } = useQuery({ queryKey: ['users-list'], queryFn: listUsers });
  const { data: empData } = useQuery({ queryKey: ['employees-active'], queryFn: listEmployees });
  const { data: docRequests = [], isLoading: docLoading } = useQuery({
    queryKey: ['doc-requests-hr'], queryFn: listDocRequests, enabled: tab === 'doc-requests',
  });

  const employees = empData?.data ?? [];
  const users = data?.data ?? [];

  const updateDocMut = useMutation({
    mutationFn: ({ id, body }: any) => updateDocRequest(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doc-requests-hr'] }); toast.success('Mis à jour'); },
  });

  const pendingDocCount = (docRequests as any[]).filter((r: any) => r.status === 'pending').length;

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Utilisateurs & Permissions"
        subtitle="Gestion des accès plateforme et demandes employés"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <UserPlus size={14} /> Créer un compte employé
          </Button>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 24, marginBottom: 20 }}>
        {[
          { id: 'users', label: `Utilisateurs (${users.length})` },
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
            display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
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
              <p>Aucun utilisateur trouvé.</p>
              <p style={{ fontSize: 13 }}>Créez des comptes employés pour qu'ils accèdent au portail.</p>
            </div>
          ) : (
            users.map((u: any, i: number) => {
              const roleMeta = ROLE_COLORS[u.role?.toLowerCase()] ?? ROLE_COLORS.employee;
              return (
                <div key={u.user_id ?? i} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
                  alignItems: 'center', padding: '14px 20px',
                  borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={u.full_name || 'U'} size={36} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{u.full_name || '—'}</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#0891b2' }}>{u.email || '—'}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: roleMeta.color, background: roleMeta.bg, padding: '3px 10px', borderRadius: 20, width: 'fit-content' }}>
                    {roleMeta.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '3px 10px', borderRadius: 20, width: 'fit-content' }}>
                    Actif
                  </span>
                </div>
              );
            })
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
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select value={r.status}
                        onChange={e => updateDocMut.mutate({ id: r.id, body: { status: e.target.value } })}
                        style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: `1px solid ${sm.color}44`, background: sm.color + '22', color: sm.color, fontWeight: 700, cursor: 'pointer' }}>
                        {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create account modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Créer un compte employé" width={500}>
        <CreateAccountModal
          employees={employees}
          onClose={() => setShowCreate(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['users-list'] })}
        />
      </Modal>
    </div>
  );
}
