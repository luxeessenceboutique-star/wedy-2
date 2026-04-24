import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/AppShell';

const TABS = ['Company profile', 'Branding', 'Locales & RTL', 'Notifications', 'Billing', 'Data & privacy', 'API & webhooks', 'Danger zone'];

export default function SettingsPage() {
  const [active, setActive] = useState('Company profile');
  const [form, setForm] = useState({
    legalName: 'Acme Corp SARL',
    tradeName: 'Acme',
    ice: '002739485000082',
    rc: '483921',
    address: '22 Bd Zerktouni, Casablanca 20250',
    language: 'Français',
    currency: 'MAD (Moroccan Dirham)',
  });

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader title="Settings" subtitle="Workspace · Acme Corp" />

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar tabs */}
        <div style={{ width: 180, flexShrink: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', border: 'none', borderRadius: 6,
                fontSize: 13, cursor: 'pointer',
                background: active === tab ? '#ecfeff' : 'transparent',
                color: active === tab ? '#0891b2' : '#475569',
                fontWeight: active === tab ? 500 : 400,
                marginBottom: 2,
              }}
              onMouseEnter={e => { if (active !== tab) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; }}
              onMouseLeave={e => { if (active !== tab) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content panel */}
        {active === 'Company profile' && (
          <div style={{
            flex: 1, background: '#fff', border: '1px solid var(--border)',
            borderRadius: 10, padding: '28px',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Company profile</h2>
            <p style={{ fontSize: 13, color: '#0891b2', marginBottom: 24 }}>This information appears on generated documents.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>Legal name</label>
                <input
                  value={form.legalName}
                  onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                    borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>Trade name</label>
                <input
                  value={form.tradeName}
                  onChange={e => setForm(f => ({ ...f, tradeName: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', border: '2px solid #0891b2',
                    borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>ICE</label>
                <input
                  value={form.ice}
                  onChange={e => setForm(f => ({ ...f, ice: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                    borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>RC</label>
                <input
                  value={form.rc}
                  onChange={e => setForm(f => ({ ...f, rc: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                    borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>Registered address</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                  borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>Primary language</label>
                <select
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                    borderRadius: 7, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box',
                  }}
                >
                  <option>Français</option>
                  <option>English</option>
                  <option>العربية</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475569', display: 'block', marginBottom: 5 }}>Currency</label>
                <select
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                    borderRadius: 7, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box',
                  }}
                >
                  <option>MAD (Moroccan Dirham)</option>
                  <option>EUR (Euro)</option>
                  <option>USD (US Dollar)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button style={{
                border: '1px solid var(--border)', background: '#fff', borderRadius: 7,
                padding: '8px 18px', fontSize: 13, cursor: 'pointer', color: '#475569',
              }}>
                Cancel
              </button>
              <button style={{
                background: '#0891b2', color: '#fff', border: 'none', borderRadius: 7,
                padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
                Save changes
              </button>
            </div>
          </div>
        )}

        {active !== 'Company profile' && (
          <div style={{
            flex: 1, background: '#fff', border: '1px solid var(--border)',
            borderRadius: 10, padding: '40px', textAlign: 'center', color: '#94a3b8',
          }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, color: '#475569' }}>{active}</div>
            <div style={{ fontSize: 13 }}>This section will be available soon.</div>
          </div>
        )}
      </div>
    </div>
  );
}
