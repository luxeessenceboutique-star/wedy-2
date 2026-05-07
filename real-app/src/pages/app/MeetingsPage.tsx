import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Video, Copy, ExternalLink, Plus, Users, Zap,
  CheckCircle2, PhoneOff,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { Avatar, Button, Spinner, Modal, Input } from '../../components/ui';
import { getOrgChart, type OrgProject } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useLang } from '../../lib/lang';
import { toast } from 'sonner';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function projectRoom(project: OrgProject) {
  return `wedy-rh-${project.id.split('-')[0]}`;
}

function meetUrl(roomName: string) {
  return `https://meet.jit.si/${roomName}`;
}

// ── Project Meeting Card ──────────────────────────────────────────────────────

function ProjectMeetingCard({
  project,
  isActive,
  onStart,
  onStop,
  onCopy,
}: {
  project: OrgProject;
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
  onCopy: () => void;
}) {
  const room = projectRoom(project);

  return (
    <div style={{
      borderRadius: 14,
      background: '#fff',
      border: isActive ? `2px solid ${project.color}` : '1.5px solid #e2e8f0',
      boxShadow: isActive
        ? `0 0 0 3px ${project.color}22, 0 8px 28px rgba(0,0,0,0.10)`
        : '0 2px 12px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'all 0.2s',
    }}>
      {/* Color strip */}
      <div style={{ height: 4, background: project.color, flexShrink: 0 }} />

      <div style={{ padding: '18px 18px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: `${project.color}18`, border: `2px solid ${project.color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Video size={20} style={{ color: project.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{project.name}</p>
              {isActive && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  background: '#22c55e', borderRadius: 999,
                  padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#fff',
                    animation: 'pulse 1.5s infinite',
                  }} />
                  EN COURS
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
              {project.description || 'Salle dédiée à l\'équipe'}
            </p>
          </div>
        </div>

        {/* Members */}
        {project.members.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              {project.members.slice(0, 6).map((m, i) => (
                <div key={m.employee_id} title={m.employee?.full_name}
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}>
                  <Avatar name={m.employee?.full_name || '?'} size={24} />
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {project.members.length} membre{project.members.length !== 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={13} style={{ color: '#cbd5e1' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Aucun membre assigné</span>
          </div>
        )}

        {/* Room URL */}
        <div style={{
          padding: '7px 10px', borderRadius: 8,
          background: '#f8fafc', border: '1px solid #e2e8f0',
          fontSize: 11, color: '#64748b',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: 'monospace',
        }}>
          meet.jit.si/{room}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          {isActive ? (
            <>
              <button
                onClick={onStart}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px 0', background: project.color,
                  border: 'none', borderRadius: 8, color: 'white',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.88)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >
                <ExternalLink size={14} /> Rejoindre
              </button>
              <button
                onClick={onStop}
                title="Marquer comme terminée"
                style={{
                  width: 40, height: 40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#fee2e2', border: '1px solid #fca5a5',
                  borderRadius: 8, cursor: 'pointer', color: '#ef4444', flexShrink: 0,
                }}
              ><PhoneOff size={14} /></button>
            </>
          ) : (
            <button
              onClick={onStart}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 0', background: project.color,
                border: 'none', borderRadius: 8, color: 'white',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                transition: 'filter 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.88)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
            >
              <Video size={14} /> Démarrer
            </button>
          )}

          <button onClick={onCopy} title="Copier le lien" style={iconBtn}>
            <Copy size={14} />
          </button>

          <a
            href={meetUrl(room)} target="_blank" rel="noopener noreferrer"
            title="Ouvrir dans un nouvel onglet"
            style={{ ...iconBtn, textDecoration: 'none' }}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 40, height: 40,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--bg-muted)', border: '1px solid var(--border)',
  borderRadius: 8, cursor: 'pointer', color: '#64748b', flexShrink: 0,
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [activeRooms, setActiveRooms] = useState<Set<string>>(new Set());
  const [quickModal, setQuickModal] = useState(false);
  const [quickName, setQuickName] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['orgchart'], queryFn: getOrgChart });
  const projects: OrgProject[] = data?.projects ?? [];

  const displayName =
    (user as any)?.full_name
    || (user as any)?.profile?.full_name
    || user?.email?.split('@')[0]
    || 'Utilisateur';

  const launchMeeting = (roomName: string, title: string, color: string) => {
    // Open Jitsi in a new window — WebRTC works perfectly outside an iframe
    const url = `${meetUrl(roomName)}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.startWithAudioMuted=true&config.disableDeepLinking=true`;
    window.open(url, `jitsi-${roomName}`, 'width=1280,height=800,toolbar=no,menubar=no,location=no');
    setActiveRooms(prev => new Set(prev).add(roomName));
    toast.success(`Réunion "${title}" ouverte dans un nouvel onglet`, { icon: '🎥' });
  };

  const stopMeeting = (roomName: string) => {
    setActiveRooms(prev => { const s = new Set(prev); s.delete(roomName); return s; });
    toast.info('Réunion marquée comme terminée');
  };

  const copyLink = (roomName: string) => {
    navigator.clipboard.writeText(meetUrl(roomName));
    toast.success('Lien copié !');
  };

  const startQuickMeeting = () => {
    if (!quickName.trim()) return;
    const roomName = `wedy-rh-${slugify(quickName.trim())}-${Date.now().toString(36)}`;
    launchMeeting(roomName, quickName.trim(), '#6366f1');
    setQuickModal(false);
    setQuickName('');
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      <PageHeader
        title={t('meetings')}
        subtitle={t('meetings_subtitle')}
        action={
          <Button variant="soft" onClick={() => setQuickModal(true)}>
            <Zap size={14} style={{ marginRight: 6 }} /> Réunion rapide
          </Button>
        }
      />

      <div style={{ padding: '0 28px' }}>

        {/* ── Banner ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 18px', borderRadius: 10, marginBottom: 28,
          background: 'linear-gradient(135deg, #ecfeff 0%, #f0f9ff 100%)',
          border: '1px solid #a5f3fc',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Video size={18} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#0c4a6e' }}>
              Chaque équipe projet a une salle de réunion permanente
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#0891b2' }}>
              Cliquez <strong>Démarrer</strong> — la réunion s'ouvre dans un nouvel onglet avec caméra et micro
            </p>
          </div>
          <button
            onClick={() => setQuickModal(true)}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              background: '#0891b2', border: 'none', borderRadius: 8,
              padding: '8px 16px', color: 'white', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.9)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
          >
            <Plus size={13} /> Réunion rapide
          </button>
        </div>

        {/* ── Active meeting alert ── */}
        {activeRooms.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 18px', borderRadius: 10, marginBottom: 20,
            background: '#f0fdf4', border: '1px solid #86efac',
          }}>
            <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#14532d' }}>
              <strong>{activeRooms.size} réunion{activeRooms.size > 1 ? 's' : ''} en cours</strong> — l'onglet Jitsi est ouvert dans votre navigateur.
              Cliquez <strong>Rejoindre</strong> pour y retourner.
            </p>
          </div>
        )}

        {/* ── Project cards ── */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
        ) : projects.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: '#fff', borderRadius: 16, border: '1px dashed #e2e8f0',
          }}>
            <Users size={40} style={{ color: '#cbd5e1', marginBottom: 14 }} />
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Aucune équipe projet</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
              Créez des équipes dans l'<strong>Organigramme</strong> pour leur associer une salle de réunion.
            </p>
            <Button variant="soft" onClick={() => setQuickModal(true)}>
              <Zap size={14} style={{ marginRight: 6 }} /> Réunion rapide quand même
            </Button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {projects.map(project => {
              const room = projectRoom(project);
              return (
                <ProjectMeetingCard
                  key={project.id}
                  project={project}
                  isActive={activeRooms.has(room)}
                  onStart={() => launchMeeting(room, project.name, project.color)}
                  onStop={() => stopMeeting(room)}
                  onCopy={() => copyLink(room)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick Meeting Modal ── */}
      <Modal open={quickModal} onClose={() => setQuickModal(false)} title="Réunion rapide">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0 8px' }}>
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: '#f8fafc', border: '1px solid #e2e8f0',
            fontSize: 12, color: '#64748b', lineHeight: 1.6,
          }}>
            Une salle Jitsi Meet s'ouvrira dans un nouvel onglet. Partagez le lien pour inviter vos collègues.
          </div>
          <Input
            label="Nom de la réunion"
            value={quickName}
            onChange={e => setQuickName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && startQuickMeeting()}
            placeholder="Ex: Sprint Review, Daily Standup..."
            autoFocus
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setQuickModal(false)}>Annuler</Button>
            <Button variant="primary" onClick={startQuickMeeting} disabled={!quickName.trim()}>
              <Video size={14} style={{ marginRight: 6 }} /> Ouvrir la réunion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
