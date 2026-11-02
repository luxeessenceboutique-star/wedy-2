import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Activity, Users, ShieldAlert, Download, Search, ChevronDown, ChevronUp,
  LogIn, Trash2, UserPlus, Settings, Eye, Pencil, Sparkles, CircleCheck,
  Pause, UserCog, Inbox,
} from 'lucide-react';
import { listAuditLogs, type AuditLog } from '@/services/api';
import { Badge, Spinner } from '../../components/ui';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { useLang } from '../../lib/lang';
import { RV } from '@/components/motion';

/* ── icon/colour map ─────────────────────────────────────────────────── */
const KIND_ICON: Record<string, { Icon: React.ElementType; bg: string; color: string }> = {
  approve:  { Icon: CircleCheck, bg: 'var(--success-soft)', color: 'var(--success-ink)' },
  generate: { Icon: Sparkles,    bg: 'var(--ai-soft)',      color: 'var(--ai)' },
  update:   { Icon: Pencil,      bg: 'var(--primary-soft)', color: 'var(--primary)' },
  export:   { Icon: Download,    bg: 'var(--warning-soft)', color: 'var(--warning-ink)' },
  fail:     { Icon: ShieldAlert, bg: 'var(--danger-soft)',  color: 'var(--danger-ink)' },
  login:    { Icon: LogIn,       bg: 'var(--subtle)',       color: 'var(--text-2)' },
  role:     { Icon: UserCog,     bg: 'var(--warning-soft)', color: 'var(--warning-ink)' },
  delete:   { Icon: Trash2,      bg: 'var(--danger-soft)',  color: 'var(--danger-ink)' },
  create:   { Icon: UserPlus,    bg: 'var(--success-soft)', color: 'var(--success-ink)' },
  settings: { Icon: Settings,    bg: 'var(--subtle)',       color: 'var(--text-2)' },
  request:  { Icon: Inbox,       bg: 'var(--primary-soft)', color: 'var(--primary)' },
  view:     { Icon: Eye,         bg: 'var(--subtle)',       color: 'var(--text-muted)' },
};
const SEV_DOT: Record<string, string> = {
  info: 'var(--primary)', warn: 'var(--warning)', crit: 'var(--danger)',
};

/* ── demo events (used when API returns nothing) ────────────────────── */
const DEMO_EVENTS = [
  { id: 'e0', time: '09:41:07', user: 'Salma Idrissi',  kind: 'approve',  verb: 'a approuvé la demande de congé de',     target: 'Omar Alaoui',                  module: 'Congés',     sev: 'info', ip: '196.200.131.42',  device: 'Chrome · macOS', diff: [] },
  { id: 'e1', time: '09:38:52', user: 'Wedy IA',         kind: 'generate', verb: 'a généré « Attestation de travail » pour', target: 'Yasmine Benali',             module: 'Documents',  sev: 'info', ip: '—',               device: 'Assistant IA',   diff: [] },
  { id: 'e2', time: '09:31:15', user: 'Sara El Fassi',   kind: 'update',   verb: 'a modifié le dossier de',              target: 'Hind Tazi',                    module: 'Employés',   sev: 'info', ip: '196.200.131.57',  device: 'Edge · Windows', diff: [['Téléphone', '+212 6 61 22 33 44', '+212 6 70 11 22 33']] },
  { id: 'e3', time: '09:12:03', user: 'Nadia Berrada',   kind: 'export',   verb: 'a exporté',                            target: 'les bulletins de paie d\'oct.', module: 'Paie',       sev: 'warn', ip: '196.200.131.61',  device: 'Chrome · Windows', diff: [] },
  { id: 'e4', time: '08:57:40', user: 'Salma Idrissi',  kind: 'update',   verb: 'a modifié le salaire de',              target: 'Yasmine Benali',               module: 'Paie',       sev: 'warn', ip: '196.200.131.42',  device: 'Chrome · macOS', diff: [['Salaire brut', '18 000 MAD', '18 500 MAD']] },
  { id: 'e5', time: '08:44:19', user: 'Inconnu',         kind: 'fail',     verb: 'connexion refusée pour',              target: 'salma@tython.ma',              module: 'Sécurité',   sev: 'crit', ip: '41.250.18.203',   device: 'Firefox · Linux', diff: [['Motif', '—', 'Mot de passe incorrect (3e essai)']] },
  { id: 'e6', time: '08:30:02', user: 'Salma Idrissi',  kind: 'login',    verb: 's\'est connectée avec',               target: 'double authentification',      module: 'Sécurité',   sev: 'info', ip: '196.200.131.42',  device: 'Chrome · macOS', diff: [] },
  { id: 'e7', time: '08:12:45', user: 'Salma Idrissi',  kind: 'role',     verb: 'a attribué le rôle Manager à',        target: 'Youssef Amrani',               module: 'Paramètres', sev: 'warn', ip: '196.200.131.42',  device: 'Chrome · macOS', diff: [['Rôle', 'Employé', 'Manager']] },
  { id: 'e8', time: 'Hier 18:05', user: 'Karim Bennani', kind: 'delete',  verb: 'a supprimé un fichier de',            target: 'son dossier',                  module: 'Documents',  sev: 'info', ip: '105.66.12.9',     device: 'Safari · iOS',   diff: [] },
];

const POOL = [
  { user: 'Mehdi Rami',    kind: 'request',  verb: 'a déposé une demande de congé', target: '22 → 26 déc.', module: 'Congés',    sev: 'info', ip: '105.71.4.22',      device: 'Chrome · Android' },
  { user: 'Hind Tazi',     kind: 'view',     verb: 'a consulté',                   target: 'son bulletin', module: 'Paie',      sev: 'info', ip: '196.200.131.88',   device: 'Safari · iOS' },
  { user: 'Sara El Fassi', kind: 'update',   verb: 'a mis à jour le parrain de',   target: 'Soufiane B.',  module: 'Employés',  sev: 'info', ip: '196.200.131.57',   device: 'Edge · Windows' },
];

const MODS = ['Tous', 'Employés', 'Documents', 'Congés', 'Paie', 'Sécurité', 'Paramètres'];
const SEVS: [string, string, string][] = [['all', 'Toutes', 'var(--text-muted)'], ['info', 'Info', 'var(--primary)'], ['warn', 'Attention', 'var(--warning)'], ['crit', 'Critique', 'var(--danger)']];

type DemoEvent = typeof DEMO_EVENTS[number];

export default function AuditPage() {
  const { t } = useLang() as any;
  const [skip, setSkip] = useState(0);
  const [q, setQ] = useState('');
  const [mod, setMod] = useState('Tous');
  const [sev, setSev] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [events, setEvents] = useState<DemoEvent[]>(DEMO_EVENTS as DemoEvent[]);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<string[]>([]);
  const liveRef = useRef(live);
  liveRef.current = live;
  const LIMIT = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', skip],
    queryFn: () => listAuditLogs({ skip, limit: LIMIT }),
  });

  const apiLogs: DemoEvent[] = (data?.data ?? []).map((l: AuditLog, i: number) => ({
    id: l.id,
    time: format(new Date(l.created_at), 'HH:mm:ss'),
    user: l.profiles?.full_name || l.user_id?.slice(0, 8) || '—',
    kind: l.action.toLowerCase(),
    verb: l.action,
    target: l.entity_id?.slice(0, 12) || l.entity,
    module: l.entity,
    sev: 'info',
    ip: '—', device: '—', diff: [],
  }));

  const baseEvents = apiLogs.length > 0 ? apiLogs : events;
  const total = data?.count ?? baseEvents.length;

  // Live feed ticker
  useEffect(() => {
    if (!live) return;
    let k = 0;
    const id = setInterval(() => {
      const p = POOL[k++ % POOL.length];
      const newId = 'n' + Date.now();
      const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setEvents(ev => [{ ...p, id: newId, time, diff: [] } as DemoEvent, ...ev].slice(0, 40));
      setFreshId(newId);
      setAddedCount(c => c + 1);
      setTimeout(() => setFreshId(null), 1600);
    }, 6500);
    return () => clearInterval(id);
  }, [live]);

  const filtered = baseEvents.filter(e =>
    (mod === 'Tous' || e.module === mod) &&
    (sev === 'all' || e.sev === sev) &&
    (!q || `${e.user} ${e.verb} ${e.target} ${e.ip}`.toLowerCase().includes(q.toLowerCase()))
  );

  const ALERTS = [
    { id: 'a1', icon: <ShieldAlert size={18} strokeWidth={1.8} />, title: '3 connexions refusées sur salma@tython.ma', text: "Depuis 41.250.18.203, hors du réseau autorisé · aujourd'hui à 08:44", bg: 'var(--danger-soft)', border: 'rgba(223,87,64,.3)', color: 'var(--danger-ink)', cta: "Bloquer l'IP", doneLabel: 'IP bloquée' },
    { id: 'a2', icon: <Download size={18} strokeWidth={1.8} />, title: "Export massif : bulletins de paie d'octobre", text: 'Nadia Berrada · 126 fichiers · 09:12', bg: 'var(--warning-soft)', border: 'rgba(230,169,72,.4)', color: 'var(--warning-ink)', cta: 'Marquer vérifié', doneLabel: 'Vérifié' },
  ].filter(a => !dismissedAlerts.includes(a.id));

  return (
    <Page>
      <PageHeader
        title={t('audit_log')}
        subtitle="Chaque action, chaque utilisateur, horodatée et conservée 24 mois."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setLive(v => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {live ? (
                <>
                  <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                    <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--success-ink)' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success-ink)' }} />
                  </span>
                  En direct
                </>
              ) : (
                <><Pause size={14} strokeWidth={1.8} /> En pause</>
              )}
            </button>
            <button className="btn btn-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Download size={15} strokeWidth={1.8} />
              Exporter (CSV)
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { icon: <Activity size={19} strokeWidth={1.8} />, iconBg: 'var(--primary-soft)', iconColor: 'var(--primary)', value: (4812 + addedCount).toLocaleString('fr-FR'), label: 'Événements · 30 jours' },
          { icon: <Users size={19} strokeWidth={1.8} />, iconBg: 'var(--ai-soft)', iconColor: 'var(--ai)', value: '18', label: 'Utilisateurs actifs' },
          { icon: <ShieldAlert size={19} strokeWidth={1.8} />, iconBg: 'var(--danger-soft)', iconColor: 'var(--danger-ink)', value: '3', label: 'Connexions refusées', valueColor: 'var(--danger-ink)' },
          { icon: <Download size={19} strokeWidth={1.8} />, iconBg: 'var(--warning-soft)', iconColor: 'var(--warning-ink)', value: '12', label: 'Exports de données' },
        ].map((card, i) => (
          <RV key={i} delay={i * 50}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: card.iconBg, color: card.iconColor, flexShrink: 0 }}>
                {card.icon}
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.05, color: (card as any).valueColor || 'var(--text)' }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{card.label}</div>
              </div>
            </div>
          </RV>
        ))}
      </div>

      {/* Alert banners */}
      {ALERTS.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: 12, marginBottom: 20 }}>
          {ALERTS.map(alert => (
            <RV key={alert.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 16, background: alert.bg, border: `1px solid ${alert.border}`, flexWrap: 'wrap' }}>
                <span style={{ width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', color: alert.color, flexShrink: 0 }}>
                  {alert.icon}
                </span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: alert.color }}>{alert.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>{alert.text}</div>
                </div>
                {resolvedAlerts.includes(alert.id) ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, fontSize: 12.5, fontWeight: 700, color: 'var(--success-ink)' }}>
                    <CircleCheck size={15} strokeWidth={1.8} /> {alert.doneLabel}
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-dark btn-sm" onClick={() => setResolvedAlerts(r => [...r, alert.id])}>
                      {alert.cta}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setDismissedAlerts(d => [...d, alert.id])}>
                      Ignorer
                    </button>
                  </div>
                )}
              </div>
            </RV>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <RV>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}>
            <Search size={15} strokeWidth={1.8} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input className="input" placeholder="Utilisateur, action, IP…" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          {MODS.map(m => (
            <button
              key={m}
              className={`btn btn-sm ${mod === m ? 'btn-dark' : 'btn-secondary'}`}
              style={{ borderRadius: 99 }}
              onClick={() => setMod(m)}
            >{m}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {SEVS.map(([k, label, dot]) => (
              <button
                key={k}
                className={`btn btn-sm ${sev === k ? 'btn-dark' : 'btn-secondary'}`}
                style={{ borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => setSev(k)}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </RV>

      {/* Events table */}
      <RV>
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '13px 18px', background: 'var(--subtle)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Événements</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} affichés</span>
          </div>

          {isLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
              Aucun événement ne correspond à ces filtres.
            </div>
          ) : (
            filtered.map(e => {
              const ic = KIND_ICON[e.kind] || KIND_ICON.view;
              const isOpen = openId === e.id;
              return (
                <div key={e.id} style={{ borderTop: '1px solid var(--border)', background: e.id === freshId ? 'var(--primary-soft)' : 'var(--surface)', transition: 'background 1.2s' }}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : e.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', border: 'none', background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', flexWrap: 'wrap' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--subtle)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_DOT[e.sev] || 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ width: 76, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{e.time}</span>
                    <span style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ic.bg, color: ic.color, flexShrink: 0 }}>
                      <ic.Icon size={15} strokeWidth={1.8} />
                    </span>
                    <span style={{ flex: '1 1 300px', minWidth: 0, fontSize: 13.5, lineHeight: 1.45, color: 'var(--text-2)' }}>
                      <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{e.user}</strong>{' '}{e.verb}{' '}
                      <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{e.target}</strong>
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: 'var(--subtle)', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{e.module}</span>
                    <span style={{ width: 124, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.ip}</span>
                    {isOpen ? <ChevronUp size={15} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={15} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />}
                  </button>

                  {isOpen && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, padding: '2px 18px 16px' }}>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--subtle)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Modifications</div>
                        {e.diff.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                            {e.diff.map(([k, a, b], di) => (
                              <div key={di} style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr)', gap: 8, fontSize: 12.5, alignItems: 'start' }}>
                                <span style={{ color: 'var(--text-2)' }}>{k}</span>
                                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                                  <span style={{ padding: '2px 7px', borderRadius: 6, background: 'var(--danger-soft)', color: 'var(--danger-ink)', textDecoration: 'line-through', alignSelf: 'flex-start' }}>{a}</span>
                                  <span style={{ padding: '2px 7px', borderRadius: 6, background: 'var(--success-soft)', color: 'var(--success-ink)', alignSelf: 'flex-start' }}>{b}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>Aucune donnée modifiée.</div>
                        )}
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--subtle)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contexte</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: 'var(--text-2)' }}>Appareil</span><span style={{ fontWeight: 500 }}>{e.device}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: 'var(--text-2)' }}>Adresse IP</span><span style={{ fontFamily: 'var(--font-mono)' }}>{e.ip}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: 'var(--text-2)' }}>Module</span><span style={{ fontWeight: 500 }}>{e.module}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </RV>

      {total > LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" disabled={skip === 0} onClick={() => setSkip(s => Math.max(0, s - LIMIT))}>{t('prev_page')}</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>{skip + 1}–{Math.min(skip + LIMIT, total)} / {total}</span>
          <button className="btn btn-ghost btn-sm" disabled={skip + LIMIT >= total} onClick={() => setSkip(s => s + LIMIT)}>{t('next_page')}</button>
        </div>
      )}
    </Page>
  );
}
