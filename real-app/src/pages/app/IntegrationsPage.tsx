import React, { useState } from 'react';
import { Plus, Trash2, Send, X, Zap } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { Card, Button, Badge } from '../../components/ui';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLang } from '../../lib/lang';

const CATALOG = [
  { letter: 'S',  name: 'Slack',             desc: 'Notifications & approbations',  color: '#4a154b', coming: false },
  { letter: 'M',  name: 'Microsoft Teams',   desc: 'Notifications & calendrier',    color: '#464eb8', coming: true  },
  { letter: 'G',  name: 'Google Workspace',  desc: 'Calendar, Drive, Meet',         color: '#4285f4', coming: true  },
  { letter: 'Sa', name: 'Sage',              desc: 'Comptabilité & paie',           color: '#00b04f', coming: true  },
  { letter: 'D',  name: 'DocuSign',          desc: 'Signatures numériques',         color: '#ffba08', coming: true  },
  { letter: 'Z',  name: 'Zapier',            desc: '5 000+ automatisations',        color: '#ff4a00', coming: true  },
  { letter: 'O',  name: 'Okta',              desc: 'SSO & SCIM',                    color: '#007dc1', coming: true  },
];

interface Webhook {
  id: string; url: string; events: string[]; active: boolean;
  created_at: string; last_triggered?: string;
}

const EVENT_OPTIONS = [
  'employee.created', 'employee.updated', 'leave.approved', 'leave.rejected',
  'document.generated', 'payroll.generated', 'contract.expiring',
];

const STORAGE_KEY = 'wedy_webhooks';
function loadWebhooks(): Webhook[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveWebhooks(hooks: Webhook[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(hooks)); }

function WebhookForm({ onAdd }: { onAdd: (w: Webhook) => void }) {
  const { t } = useLang();
  const [url, setUrl]       = useState('');
  const [events, setEvents] = useState<string[]>(['employee.created', 'leave.approved']);
  const [testing, setTesting] = useState(false);

  const toggle = (ev: string) =>
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);

  const handleTest = async () => {
    if (!url.startsWith('http')) { toast.error(t('wh_invalid_url')); return; }
    setTesting(true);
    try {
      await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'ping', source: 'wedy-rh', timestamp: new Date().toISOString() }) });
      toast.success('Requête envoyée (vérifiez votre endpoint)');
    } catch { toast.warning('Requête envoyée en mode no-cors'); }
    finally { setTesting(false); }
  };

  const handleAdd = () => {
    if (!url.startsWith('http')) { toast.error(t('wh_invalid_url')); return; }
    if (events.length === 0)     { toast.error(t('wh_no_events')); return; }
    const hook: Webhook = { id: crypto.randomUUID(), url, events, active: true, created_at: new Date().toISOString() };
    onAdd(hook);
    setUrl(''); setEvents(['employee.created']);
    toast.success(t('wh_added'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label className="label">{t('wh_url_label')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" style={{ flex: 1 }} value={url} onChange={e => setUrl(e.target.value)} placeholder={t('wh_url_ph')} />
          <Button variant="ghost" loading={testing} onClick={handleTest} disabled={!url}>
            <Send size={13} /> {t('wh_test')}
          </Button>
        </div>
      </div>
      <div>
        <label className="label">{t('wh_events_label')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {EVENT_OPTIONS.map(ev => (
            <button key={ev} onClick={() => toggle(ev)}
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 999,
                border: `1px solid ${events.includes(ev) ? 'var(--primary)' : 'var(--border)'}`,
                background: events.includes(ev) ? 'var(--primary-soft)' : 'var(--bg-muted)',
                color: events.includes(ev) ? 'var(--primary)' : 'var(--fg-muted)',
                cursor: 'pointer', fontWeight: events.includes(ev) ? 600 : 400,
              }}>{ev}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleAdd}><Plus size={13} /> {t('wh_add_btn')}</Button>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { t } = useLang();
  const [webhooks, setWebhooks] = useState<Webhook[]>(loadWebhooks);
  const [showForm, setShowForm] = useState(false);

  const addWebhook = (w: Webhook) => {
    const updated = [...webhooks, w];
    setWebhooks(updated); saveWebhooks(updated); setShowForm(false);
  };

  const removeWebhook = (id: string) => {
    if (!confirm(t('wh_delete_confirm'))) return;
    const updated = webhooks.filter(w => w.id !== id);
    setWebhooks(updated); saveWebhooks(updated);
    toast.success(t('wh_deleted'));
  };

  const toggleWebhook = (id: string) => {
    const updated = webhooks.map(w => w.id === id ? { ...w, active: !w.active } : w);
    setWebhooks(updated); saveWebhooks(updated);
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title={t('integrations')}
        subtitle={t('integrations_subtitle')}
        action={
          <Button onClick={() => setShowForm(s => !s)}>
            {showForm ? <><X size={13} /> {t('cancel')}</> : <><Plus size={13} /> {t('integrations_new_webhook')}</>}
          </Button>
        }
      />

      {showForm && (
        <div className="card card-pad" style={{ marginBottom: 20, border: '1px solid var(--primary-border)', background: 'var(--primary-soft)' }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Zap size={15} /> {t('integrations_new_webhook')}
          </h3>
          <WebhookForm onAdd={addWebhook} />
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Zap size={15} style={{ color: 'var(--primary)' }} /> {t('webhooks_section')} ({webhooks.length})
        </h2>
        {webhooks.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--fg-muted)', background: 'var(--bg-elev)', border: '1px dashed var(--border)', borderRadius: 10, fontSize: 13 }}>
            <Zap size={28} style={{ margin: '0 auto 10px', opacity: 0.15 }} />
            <p style={{ fontWeight: 600 }}>{t('wh_none_title')}</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>{t('wh_none_desc')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {webhooks.map(w => (
              <div key={w.id} style={{
                background: 'var(--bg-elev)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                opacity: w.active ? 1 : 0.55,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: w.active ? '#10b981' : '#94a3b8' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.url}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {w.events.map(ev => (
                      <span key={ev} style={{ fontSize: 10, padding: '1px 6px', background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: 4, fontWeight: 600 }}>{ev}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleWebhook(w.id)}
                    style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-muted)', color: 'var(--fg-muted)', fontWeight: 600 }}>
                    {w.active ? t('wh_disable') : t('wh_enable')}
                  </button>
                  <button onClick={() => removeWebhook(w.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px', borderRadius: 6, display: 'flex' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--fg)' }}>{t('integrations_catalog')}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {CATALOG.map(item => (
          <div key={item.name} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
              {item.letter}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{item.name}</p>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{item.desc}</p>
            </div>
            {item.coming ? (
              <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-muted)', color: 'var(--fg-muted)', borderRadius: 999, border: '1px solid var(--border)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {t('coming_soon')}
              </span>
            ) : (
              <span style={{ fontSize: 11, padding: '3px 10px', background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 999, fontWeight: 600 }}>
                {t('available_badge')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
