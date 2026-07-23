import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, isHRRole } from '../lib/auth';
import { getApiError } from '@/services/api';
import { Button, Input } from '../components/ui';
import { WedyLogo } from '../components/WedyLogo';
import { Shield, Zap, Globe } from 'lucide-react';

const FEATURES = [
  { icon: <Zap size={15} />,    label: 'Génération de documents IA en secondes' },
  { icon: <Globe size={15} />,  label: 'Trilingue — Français · Arabe · Anglais' },
  { icon: <Shield size={15} />, label: 'Conforme au droit du travail marocain' },
];

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const { role } = await login(email, password);
        navigate(isHRRole(role) ? '/app' : '/employee');
      } else {
        await signup(email, password, name);
        setSignupDone(true);
      }
    } catch (err: unknown) {
      setError(getApiError(err, 'Une erreur est survenue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      fontFamily: 'var(--font-body)',
    }}>
      {/* ── Left brand panel ── */}
      <div style={{
        width: 420, flexShrink: 0,
        background: 'var(--grad)',
        padding: '52px 48px',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }} className="login-brand-panel">
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <div style={{ position: 'absolute', bottom: 120, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <WedyLogo size={32} showText mono />

          <div style={{ marginTop: 'auto', paddingBottom: 8 }}>
            <h1 style={{
              fontSize: 34, fontWeight: 800, color: '#fff',
              fontFamily: 'var(--font-display)', letterSpacing: '-.03em',
              lineHeight: 1.15, marginBottom: 16,
            }}>
              RH moderne,<br />pilotée par l'IA.
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', lineHeight: 1.7, marginBottom: 36 }}>
              Générez, traduisez et classez chaque document RH en quelques secondes — alimenté par Claude AI et vos données d'entreprise.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {FEATURES.map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(255,255,255,.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', flexShrink: 0,
                  }}>{f.icon}</div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,.9)', lineHeight: 1.4 }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 48, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,.15)' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>© 2026 Wedy · Propulsé par Tybotflow</p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32,
      }}>
        <div style={{
          width: '100%', maxWidth: 400,
          animation: 'riseIn .4s cubic-bezier(.2,.8,.2,1) both',
        }}>
          {/* Mobile logo (only shows when left panel is hidden) */}
          <div className="login-mobile-logo" style={{ marginBottom: 32 }}>
            <WedyLogo size={28} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
              color: 'var(--ink)', letterSpacing: '-.03em', marginBottom: 6,
            }}>
              {tab === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>
              {tab === 'login'
                ? 'Connectez-vous à votre espace RH.'
                : 'Rejoignez Wedy pour gérer vos RH.'}
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 0, marginBottom: 28,
            background: 'var(--surface-2)',
            borderRadius: 10, padding: 3,
            border: '1px solid var(--line)',
          }}>
            {(['login', 'signup'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSignupDone(false); }}
                style={{
                  flex: 1, padding: '8px 0',
                  border: 'none', cursor: 'pointer',
                  borderRadius: 7, fontSize: 13, fontWeight: 600,
                  background: tab === t ? 'var(--surface)' : 'transparent',
                  color: tab === t ? 'var(--ink)' : 'var(--ink-2)',
                  boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                  transition: 'background .15s, color .15s',
                }}>
                {t === 'login' ? 'Se connecter' : 'Créer un compte'}
              </button>
            ))}
          </div>

          {signupDone ? (
            <div style={{
              textAlign: 'center', padding: '32px 20px',
              background: 'var(--success-soft)',
              border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>Vérifiez votre email</p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Un lien de confirmation a été envoyé à <strong>{email}</strong>.
              </p>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }}
                onClick={() => { setTab('login'); setSignupDone(false); }}>
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tab === 'signup' && (
                <Input label="Nom complet" placeholder="Mohammed Alami" value={name} onChange={e => setName(e.target.value)} required />
              )}
              <Input label="Email" type="email" placeholder="vous@entreprise.com" value={email} onChange={e => setEmail(e.target.value)} required />
              <Input label="Mot de passe" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />

              {error && <div className="alert-error">{error}</div>}

              <Button type="submit" loading={loading} size="lg" style={{ marginTop: 4 }}>
                {tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </Button>
            </form>
          )}

          <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', marginTop: 24 }}>
            En continuant, vous acceptez les{' '}
            <Link to="/legal" style={{ color: 'var(--primary)' }}>Conditions d'utilisation</Link>
            {' '}&amp;{' '}
            <Link to="/legal" style={{ color: 'var(--primary)' }}>Politique de confidentialité</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
