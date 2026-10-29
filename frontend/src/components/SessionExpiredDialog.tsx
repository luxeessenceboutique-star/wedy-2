import React, { useState } from 'react';
import { Lock, LogOut } from 'lucide-react';
import { getApiError } from '@/services/api';

/**
 * Shown on top of the current page when the session expired: the page (and everything typed in it) stays as it is.
 * After signing in again, the request that failed is replayed automatically.
 */
export function SessionExpiredDialog({ email, onLogin, onSignOut }: {
  email: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignOut: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true); setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(getApiError(err, 'Connexion impossible'));
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Session expirée"
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(8,20,28,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit}
        style={{ width: 400, maxWidth: '100%', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={16} /></span>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17 }}>Votre session a expiré</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Reconnectez-vous pour continuer : <strong>ce que vous avez saisi est conservé</strong> et sera enregistré après la connexion.
        </p>
        <label className="label">Email</label>
        <input className="input" value={email} readOnly style={{ marginBottom: 10, opacity: 0.8 }} />
        <label className="label">Mot de passe</label>
        <input className="input" type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        {error && <p style={{ color: 'var(--danger)', fontSize: 12.5, margin: '8px 0 0' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSignOut} style={{ color: 'var(--ink-2)' }}>
            <LogOut size={13} /> Se déconnecter
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !password}>{busy ? 'Connexion…' : 'Se reconnecter'}</button>
        </div>
      </form>
    </div>
  );
}
