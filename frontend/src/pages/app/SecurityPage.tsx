import React, { useState } from 'react';
import {
  Smartphone, Timer, GlobeLock, KeyRound, BellRing, Building,
  ShieldCheck, Lock, Database, Scale, Laptop, Monitor, Tablet, X,
} from 'lucide-react';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { useLang } from '../../lib/lang';
import { toast } from 'sonner';

/* ── helpers ─────────────────────────────────────────────────── */
function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch" aria-checked={on} onClick={onChange}
      style={{
        position: 'relative', flexShrink: 0, width: 40, height: 24, padding: 0,
        border: 'none', borderRadius: 99, cursor: 'pointer',
        background: on ? 'var(--success)' : 'var(--control)',
        transition: 'background .2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: on ? 19 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(10,28,36,.3)',
        transition: 'left .2s',
      }} />
    </button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: 20, borderRadius: 'var(--r-card)', background: 'var(--surface)',
      border: '1px solid var(--border)', ...style,
    }}>
      {children}
    </div>
  );
}

function CardIcon({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{
      width: 36, height: 36, borderRadius: 10, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: bg, color, flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

/* ── score ────────────────────────────────────────────────────── */
function computeScore(tfa: string, timeout: number, ip: boolean, pwd: boolean[], alerts: boolean[], sso: boolean) {
  return 14 +
    ({ off: 0, admins: 14, all: 22 } as any)[tfa] +
    (ip ? 14 : 0) +
    (timeout <= 30 ? 10 : timeout <= 60 ? 6 : 2) +
    (pwd[0] ? 8 : 0) + (pwd[1] ? 6 : 0) + (pwd[2] ? 6 : 0) +
    (alerts[0] ? 4 : 0) + (alerts[1] ? 4 : 0) +
    (sso ? 12 : 0);
}

/* ── component ────────────────────────────────────────────────── */
export default function SecurityPage() {
  const { t } = useLang() as any;

  const [tfa, setTfa]       = useState<'off' | 'admins' | 'all'>('admins');
  const [timeout, setTO]    = useState(30);
  const [ip, setIp]         = useState(true);
  const [ips, setIps]       = useState([
    { ip: '196.200.131.0/24', label: 'Siège · Casablanca' },
    { ip: '41.140.22.18',     label: 'VPN · Tanger' },
  ]);
  const [ipIn, setIpIn]     = useState('');
  const [pwd, setPwd]       = useState([true, true, false]);
  const [alerts, setAlerts] = useState([true, true]);
  const [sso, setSso]       = useState(false);
  const [sessions, setSessions] = useState([
    { id: 0, user: 'Salma Idrissi', device: 'Chrome · macOS', icon: 'laptop', place: 'Casablanca', ip: '196.200.131.42', last: 'Active maintenant', current: true },
    { id: 1, user: 'Salma Idrissi', device: 'Safari · iPhone', icon: 'smartphone', place: 'Casablanca', ip: '105.66.12.40', last: 'Il y a 2 h', current: false },
    { id: 2, user: 'Sara El Fassi', device: 'Edge · Windows', icon: 'monitor', place: 'Casablanca', ip: '196.200.131.57', last: 'Il y a 12 min', current: false },
    { id: 3, user: 'Youssef Amrani', device: 'Safari · iPad', icon: 'tablet', place: 'Tanger', ip: '41.140.22.18', last: 'Il y a 3 h', current: false },
  ]);

  const score = computeScore(tfa, timeout, ip, pwd, alerts, sso);
  const C = 2 * Math.PI * 58;
  const ring = `${((C * score) / 100).toFixed(1)} ${C.toFixed(1)}`;

  const level = score >= 90 ? t('sec_level_excellent') : score >= 75 ? t('sec_level_good') : t('sec_level_improve');

  const recos: { icon: React.ReactNode; text: string; pts: number; fix: () => void }[] = [];
  if (tfa !== 'all') recos.push({
    icon: <Smartphone size={16} />,
    text: t('sec_reco_2fa_all'), pts: tfa === 'admins' ? 8 : 22,
    fix: () => { setTfa('all'); toast.success('2FA obligatoire pour tous les utilisateurs'); },
  });
  if (!pwd[2]) recos.push({
    icon: <KeyRound size={16} />,
    text: t('sec_reco_pwd'), pts: 6,
    fix: () => { setPwd(p => [p[0], p[1], true]); toast.success('Expiration des mots de passe activée'); },
  });
  if (!sso) recos.push({
    icon: <Building size={16} />,
    text: t('sec_reco_sso'), pts: 12,
    fix: () => { setSso(true); toast.success('SSO SAML activé · Microsoft Entra ID'); },
  });
  if (!ip) recos.push({
    icon: <GlobeLock size={16} />,
    text: t('sec_reco_ip'), pts: 14,
    fix: () => { setIp(true); toast.success('Restriction IP activée'); },
  });
  if (timeout > 30) recos.push({
    icon: <Timer size={16} />,
    text: t('sec_reco_timeout'), pts: timeout <= 60 ? 4 : 8,
    fix: () => { setTO(30); toast.success('Expiration de session : 30 min'); },
  });

  const timeoutLabel = timeout < 60 ? `${timeout} min` : `${Math.floor(timeout / 60)} h${timeout % 60 ? ' ' + (timeout % 60) : ''}`;

  const tfaNote = tfa === 'all'
    ? t('sec_2fa_note_all')
    : tfa === 'admins' ? t('sec_2fa_note_admins') : t('sec_2fa_note_off');

  function addIp(e: React.FormEvent) {
    e.preventDefault();
    const v = ipIn.trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(v)) { toast.error('Adresse IP ou plage invalide'); return; }
    setIps(prev => [...prev, { ip: v, label: 'Ajoutée manuellement' }]);
    setIpIn('');
    toast.success(`${v} ajoutée à la liste autorisée`);
  }

  function revokeSession(id: number) {
    const s = sessions.find(x => x.id === id);
    setSessions(prev => prev.filter(x => x.id !== id));
    if (s) toast.success(`Session ${s.device} de ${s.user} révoquée`);
  }

  function revokeAll() {
    const n = sessions.filter(x => !x.current).length;
    if (!n) return;
    setSessions(prev => prev.filter(x => x.current));
    toast.success(`${n} session${n > 1 ? 's' : ''} déconnectée${n > 1 ? 's' : ''}`);
  }

  const DeviceIcon = ({ icon }: { icon: string }) => {
    if (icon === 'laptop')     return <Laptop size={17} />;
    if (icon === 'monitor')    return <Monitor size={17} />;
    if (icon === 'tablet')     return <Tablet size={17} />;
    return <Smartphone size={17} />;
  };

  const BADGES = [
    { icon: <Lock size={18} />,     title: 'Chiffrement AES-256',       sub: 'Données chiffrées au repos' },
    { icon: <ShieldCheck size={18} />, title: 'TLS 1.3',                sub: 'Toutes les connexions chiffrées' },
    { icon: <Database size={18} />, title: 'Sauvegardes quotidiennes',   sub: 'Conservées 30 jours' },
    { icon: <Scale size={18} />,    title: 'Loi 09-08',                  sub: 'Protection des données personnelles' },
  ];

  return (
    <Page>
      <PageHeader title={t('security')} subtitle={t('security_subtitle')} />

      {/* ── Hero: security score ──────────────────────────────── */}
      <div className="wy-hero" style={{ padding: '24px 26px', marginBottom: 20 }}>
        {/* drift orbs */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div className="wedy-drift" style={{ position: 'absolute', left: '-8%', top: '-90%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)' }} />
          <div className="wedy-drift" style={{ '--dur': '27s', '--delay': '-9s' } as any} >
            <div style={{ position: 'absolute', right: '-6%', top: '-70%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(43,189,134,.28),transparent)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center' }}>
          {/* ring */}
          <div style={{ position: 'relative', width: 136, height: 136, flexShrink: 0 }}>
            <svg viewBox="0 0 136 136" style={{ display: 'block', width: 136, height: 136, transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="secRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#5fe3f0" />
                  <stop offset="1" stopColor="#2bbd86" />
                </linearGradient>
              </defs>
              <circle cx="68" cy="68" r="58" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12" />
              <circle cx="68" cy="68" r="58" fill="none" stroke="url(#secRing)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={ring} style={{ transition: 'stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, letterSpacing: '-.05em', lineHeight: 1, color: '#fff' }}>{score}</span>
              <span style={{ fontSize: 11.5, color: 'var(--on-dark-muted)', marginTop: 2 }}>{t('sec_score_unit')}</span>
            </div>
          </div>

          {/* label */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--primary-glow)' }}>{t('sec_score_label')}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-.035em', marginTop: 6, color: '#fff' }}>{level}</div>
            <div style={{ fontSize: 13.5, color: 'var(--on-dark-muted)', marginTop: 4 }}>
              {recos.length ? `${recos.length} recommandation${recos.length > 1 ? 's' : ''} pour atteindre 100.` : t('sec_recos_done')}
            </div>
          </div>

          {/* recommendations */}
          <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recos.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, background: 'rgba(43,189,134,.14)', color: '#4fd3a0', fontSize: 13.5, fontWeight: 600 }}>
                <ShieldCheck size={17} /> {t('sec_recos_done')}
              </div>
            ) : recos.slice(0, 3).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                <span style={{ color: 'var(--warning-on-dark)', display: 'flex' }}>{r.icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--on-dark)' }}>{r.text}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4fd3a0' }}>+{r.pts}</span>
                <button onClick={r.fix} style={{ height: 30, padding: '0 11px', border: 'none', borderRadius: 8, background: '#effbfc', color: '#06141a', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t('sec_activate')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Settings grid ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,330px),1fr))', gap: 14, marginBottom: 20 }}>

        {/* 2FA */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <CardIcon bg="var(--primary-soft)" color="var(--primary)"><Smartphone size={17} /></CardIcon>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t('sec_2fa_title')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-label)' }}>{t('sec_2fa_desc')}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {([['off', t('sec_2fa_optional')], ['admins', t('sec_2fa_admins')], ['all', t('sec_2fa_all')]] as const).map(([key, label]) => (
              <button key={key} onClick={() => { setTfa(key); toast.success(`2FA : ${label}`); }}
                style={{ height: 42, borderRadius: 11, border: `1px solid ${tfa === key ? '#0a1c24' : 'var(--border-input)'}`, background: tfa === key ? '#0a1c24' : 'var(--surface)', color: tfa === key ? '#fff' : 'var(--text-2)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10 }}>{tfaNote}</div>
        </Card>

        {/* Session timeout */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CardIcon bg="var(--ai-soft)" color="var(--ai)"><Timer size={17} /></CardIcon>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t('sec_timeout_title')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-label)' }}>{t('sec_timeout_desc')}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>{timeoutLabel}</span>
          </div>
          <input type="range" min={15} max={240} step={15} value={timeout}
            onChange={e => setTO(+e.target.value)}
            style={{ width: '100%', marginTop: 18, accentColor: 'var(--ai)', cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>
            <span>15 min</span><span>2 h</span><span>4 h</span>
          </div>
        </Card>

        {/* IP restriction */}
        <Card>
          <button onClick={() => { setIp(v => !v); toast.success(ip ? 'Restriction IP désactivée' : 'Restriction IP activée'); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 0, border: 'none', background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', marginBottom: 14 }}>
            <CardIcon bg="var(--success-soft)" color="var(--success)"><GlobeLock size={17} /></CardIcon>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t('sec_ip_title')}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-label)' }}>{t('sec_ip_desc')}</span>
            </span>
            <Switch on={ip} onChange={() => { setIp(v => !v); toast.success(ip ? 'Restriction IP désactivée' : 'Restriction IP activée'); }} />
          </button>
          <div style={{ opacity: ip ? 1 : 0.4, transition: 'opacity .2s', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ips.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--subtle)' }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text)', flex: 1 }}>{item.ip}</code>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
                <button onClick={() => setIps(prev => prev.filter((_, k) => k !== i))} aria-label="Retirer"
                  style={{ width: 26, height: 26, border: 'none', borderRadius: 7, background: 'transparent', color: 'var(--text-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} />
                </button>
              </div>
            ))}
            <form onSubmit={addIp} style={{ display: 'flex', gap: 6 }}>
              <input value={ipIn} onChange={e => setIpIn(e.target.value)} placeholder={t('sec_ip_ph')}
                className="input" style={{ flex: 1, minWidth: 0, height: 36, fontFamily: 'var(--font-mono)', fontSize: 12.5 }} />
              <button type="submit" style={{ height: 36, padding: '0 12px', border: 'none', borderRadius: 9, background: '#0a1c24', color: '#fff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                {t('sec_ip_add')}
              </button>
            </form>
          </div>
        </Card>

        {/* Password policy */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <CardIcon bg="var(--warning-soft)" color="var(--warning-strong)"><KeyRound size={17} /></CardIcon>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t('sec_pwd_title')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-label)' }}>{t('sec_pwd_desc')}</div>
            </div>
          </div>
          {['12 caractères minimum', 'Chiffres et caractères spéciaux obligatoires', 'Renouvellement tous les 90 jours'].map((label, i) => (
            <button key={i} onClick={() => { setPwd(p => p.map((v, k) => k === i ? !v : v)); toast.success(pwd[i] ? 'Règle désactivée' : 'Règle activée'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', border: 'none', borderTop: '1px solid var(--track)', background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
              <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-strong)' }}>{label}</span>
              <Switch on={pwd[i]} onChange={() => {}} />
            </button>
          ))}
        </Card>

        {/* Login alerts */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <CardIcon bg="var(--danger-soft)" color="var(--danger)"><BellRing size={17} /></CardIcon>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t('sec_alerts_title')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-label)' }}>{t('sec_alerts_desc')}</div>
            </div>
          </div>
          {["Email à l'utilisateur pour chaque nouvel appareil", 'Alerte aux admins après 3 échecs de connexion'].map((label, i) => (
            <button key={i} onClick={() => { setAlerts(a => a.map((v, k) => k === i ? !v : v)); toast.success(alerts[i] ? 'Alerte désactivée' : 'Alerte activée'); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', border: 'none', borderTop: '1px solid var(--track)', background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
              <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-strong)' }}>{label}</span>
              <Switch on={alerts[i]} onChange={() => {}} />
            </button>
          ))}
        </Card>

        {/* SSO */}
        <Card style={{ background: 'var(--grad-ai-hero)', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CardIcon bg="rgba(255,255,255,.16)" color="#fff"><Building size={17} /></CardIcon>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('sec_sso_title')}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.8)' }}>{t('sec_sso_desc')}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'rgba(255,255,255,.18)', color: '#fff' }}>
              {sso ? t('sec_sso_active') : t('sec_sso_enterprise')}
            </span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 12, color: 'rgba(255,255,255,.9)' }}>{t('sec_sso_body')}</div>
          <button onClick={() => { setSso(v => !v); toast.success(sso ? 'SSO désactivé' : 'SSO SAML activé · Microsoft Entra ID'); }}
            style={{ marginTop: 14, height: 38, padding: '0 14px', border: 'none', borderRadius: 10, background: '#fff', color: 'var(--ai-800)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {sso ? t('sec_sso_disable') : t('sec_sso_configure')}
          </button>
        </Card>
      </div>

      {/* ── Active sessions ───────────────────────────────────── */}
      <div style={{ borderRadius: 'var(--r-card)', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 20px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{t('sec_sessions_title')}</span>
          <button onClick={revokeAll} className="btn btn-sm btn-danger-outline">{t('sec_sessions_revoke_all')}</button>
        </div>
        {sessions.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid var(--track)', flexWrap: 'wrap' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--subtle)', color: 'var(--text-2)', flexShrink: 0 }}>
              <DeviceIcon icon={s.icon} />
            </span>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                {s.user} · {s.device}
                {s.current && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'var(--success-soft)', color: 'var(--success-ink)' }}>{t('sec_sessions_current')}</span>}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-label)' }}>
                {s.place} · <code style={{ fontFamily: 'var(--font-mono)' }}>{s.ip}</code>
              </div>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{s.last}</span>
            {!s.current && (
              <button onClick={() => revokeSession(s.id)} className="btn btn-sm btn-secondary"
                style={{ fontSize: 12.5 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--danger-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger-ink)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = ''; (e.currentTarget as HTMLButtonElement).style.color = ''; }}>
                {t('sec_sessions_revoke')}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Compliance badges ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        {BADGES.map(b => (
          <div key={b.title} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 'var(--r-item)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--primary)' }}>{b.icon}</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-label)' }}>{b.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
