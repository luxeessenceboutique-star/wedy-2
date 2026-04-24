import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Input } from '../components/ui';
import { WedyLogo } from '../components/Logo';
import { Sparkles } from 'lucide-react';

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
        await login(email, password);
        navigate('/app');
      } else {
        await signup(email, password, name);
        setSignupDone(true);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data?.detail || (err as { message?: string })?.message || 'An error occurred';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-direction="A" style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      {/* Left brand panel — hidden on small screens */}
      <div style={{
        width: 400, background: 'linear-gradient(135deg, var(--primary) 0%, #0891b2 100%)',
        borderRadius: 'var(--radius-xl)', padding: 48, color: '#fff', marginRight: 40,
        display: 'none',
      }} className="auth-brand-panel">
        <WedyLogo size={36} showText={false} />
        <h2 style={{ fontSize: 32, fontWeight: 700, marginTop: 24, marginBottom: 12, color: '#fff' }}>
          HR operations, automated.
        </h2>
        <p style={{ opacity: 0.85, fontSize: 15, lineHeight: 1.6 }}>
          Generate, translate, and file every HR document in seconds — powered by Claude AI and your company data.
        </p>
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['Moroccan labor law compliance', 'Trilingual FR / EN / AR', 'Claude AI document generation'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.9 }}>
              <Sparkles size={14} />
              <span style={{ fontSize: 13 }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form card */}
      <div style={{
        width: '100%', maxWidth: 400, background: 'var(--bg-elev)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '32px 36px',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ marginBottom: 28 }}>
          <WedyLogo size={30} />
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 8 }}>AI-powered HR platform</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: 3 }}>
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSignupDone(false); }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                fontSize: 13, fontWeight: 500,
                background: tab === t ? 'var(--bg-elev)' : 'transparent',
                color: tab === t ? 'var(--fg)' : 'var(--fg-muted)',
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
              }}>
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {signupDone ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✉️</div>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Check your email</p>
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => { setTab('login'); setSignupDone(false); }}>Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tab === 'signup' && (
              <Input label="Full name" placeholder="Ammar Abeh" value={name} onChange={e => setName(e.target.value)} required />
            )}
            <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} style={{ marginTop: 4 }}>
              {tab === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        )}

        <p style={{ fontSize: 12, color: 'var(--fg-subtle)', textAlign: 'center', marginTop: 20 }}>
          By continuing, you agree to Wedy's{' '}
          <Link to="/legal" style={{ color: 'var(--primary)' }}>Terms</Link> &amp;{' '}
          <Link to="/legal" style={{ color: 'var(--primary)' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
