import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Building2, Briefcase, Calendar, Phone, MapPin, Lock } from 'lucide-react';
import { api } from '../../lib/api';
import { Avatar, Spinner } from '../../components/ui';
import { format, isValid } from 'date-fns';

const getMyProfile = () => api.get('/portal/me').then(r => r.data);

const safeFormat = (d: any, fmt = 'dd MMMM yyyy') => {
  if (!d) return '—'; const dt = new Date(d);
  return isValid(dt) ? format(dt, fmt, { locale: undefined }) : d;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:     { label: 'Actif',        color: '#10b981', bg: '#ecfdf5' },
  inactive:   { label: 'Inactif',      color: '#ef4444', bg: '#fef2f2' },
  on_leave:   { label: 'En congé',     color: '#f59e0b', bg: '#fffbeb' },
  terminated: { label: 'Terminé',      color: '#64748b', bg: '#f8fafc' },
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: value ? 'var(--fg)' : 'var(--fg-muted)' }}>{value || '—'}</p>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['portal-me'],
    queryFn: getMyProfile,
    retry: false,
  });

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>;
  }

  if (error || !profile) {
    return (
      <div style={{ padding: '60px 28px', textAlign: 'center', color: 'var(--fg-muted)', maxWidth: 600, margin: '0 auto' }}>
        <Lock size={36} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
        <p style={{ fontWeight: 600 }}>Profil non disponible</p>
        <p style={{ fontSize: 13 }}>
          Votre compte n'est pas encore lié à un profil employé. Contactez votre responsable RH.
        </p>
      </div>
    );
  }

  const statusMeta = STATUS_LABELS[profile.status ?? 'active'] ?? STATUS_LABELS.active;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Mon Profil</h1>

      {/* Identity card */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
          <Avatar name={profile.full_name} src={profile.photo_url} size={72} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{profile.full_name}</h2>
            <p style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 500, margin: '0 0 8px' }}>{profile.position ?? '—'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: statusMeta.color, background: statusMeta.bg, padding: '3px 10px', borderRadius: 20 }}>
                {statusMeta.label}
              </span>
              {profile.department && (
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', background: 'var(--bg-muted)', padding: '3px 10px', borderRadius: 20 }}>
                  {profile.department}
                </span>
              )}
            </div>
          </div>
        </div>

        <InfoRow icon={<Mail size={16} />}     label="Email"           value={profile.email} />
        <InfoRow icon={<Building2 size={16} />} label="Département"     value={profile.department} />
        <InfoRow icon={<Briefcase size={16} />} label="Poste"           value={profile.position} />
        <InfoRow icon={<Calendar size={16} />}  label="Date d'embauche" value={safeFormat(profile.hire_date)} />
        {profile.phone && <InfoRow icon={<Phone size={16} />} label="Téléphone" value={profile.phone} />}
        {profile.address && <InfoRow icon={<MapPin size={16} />} label="Adresse" value={profile.address} />}

        {/* Contract info */}
        {(profile.contract_type || profile.contract_end_date) && (
          <>
            {profile.contract_type && (
              <InfoRow icon={<Briefcase size={16} />} label="Type de contrat" value={
                profile.contract_type === 'CDI' ? 'CDI — Contrat à Durée Indéterminée' :
                profile.contract_type === 'CDD' ? 'CDD — Contrat à Durée Déterminée' :
                profile.contract_type
              } />
            )}
            {profile.contract_end_date && (
              <InfoRow icon={<Calendar size={16} />} label="Fin de contrat" value={safeFormat(profile.contract_end_date)} />
            )}
          </>
        )}
      </div>

      <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
        Pour modifier vos informations, contactez votre responsable RH.
      </div>
    </div>
  );
}
