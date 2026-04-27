import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsers, updateUserRole, type UserProfile } from '../../lib/api';
import { Spinner, Button, Badge, Avatar } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { UserPlus, MoreHorizontal, ShieldCheck } from 'lucide-react';

const ROLE_VARIANTS: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
  admin: 'danger',
  hr: 'primary',
  manager: 'warning',
  employee: 'success',
  intern: 'default',
};


export default function UsersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => listUsers(),
  });

  const users = data?.data ?? [];

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRole(userId, role),
    onSuccess: () => {
      toast.success('Rôle mis à jour');
      qc.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Utilisateurs & Permissions"
        subtitle={`${users.length} membres d'équipe · Gestion des accès plateforme`}
        action={
          <Button onClick={() => toast.info("L'invitation d'utilisateurs nécessite la configuration SMTP")}>
            <UserPlus size={14} /> Inviter un membre
          </Button>
        }
      />

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10 }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 32px',
          padding: '10px 20px', borderBottom: '1px solid var(--border)',
          fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <span>Utilisateur</span><span>Email</span><span>Rôle</span><span>Statut</span><span />
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
        ) : users.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-muted)' }}>Aucun utilisateur trouvé.</div>
        ) : (
          users.map((u: UserProfile, i) => {
            const email = u.email || u.user?.email || '—';
            const initials = u.full_name?.split(' ').map(n => n[0]).join('') || '?';
            return (
              <div key={u.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 32px',
                alignItems: 'center', padding: '14px 20px',
                borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={u.full_name || 'Sans nom'} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{u.full_name || 'Sans nom'}</span>
                </div>
                <span style={{ fontSize: 13, color: '#0891b2' }}>{email}</span>
                <Badge variant={ROLE_VARIANTS[u.role?.toLowerCase()] || 'default'}>{u.role || 'employee'}</Badge>
                <Badge variant="success">Active</Badge>
                <div style={{ cursor: 'pointer' }}>
                  <MoreHorizontal size={16} color="#94a3b8" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
