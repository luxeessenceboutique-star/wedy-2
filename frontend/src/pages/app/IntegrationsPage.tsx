import React, { useState } from 'react';
import { Plus, Trash2, Send, X, Zap, KeyRound, Eye, EyeOff, Copy, RefreshCw, LayoutGrid, Calendar, MessageSquare, Wallet, Code } from 'lucide-react';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { useLang } from '../../lib/lang';
import { RV } from '@/components/motion';

const CATS = [
  { key: 'all',  label: 'Toutes',               Icon: LayoutGrid },
  { key: 'cal',  label: 'Calendrier',            Icon: Calendar },
  { key: 'comm', label: 'Communication',         Icon: MessageSquare },
  { key: 'pay',  label: 'Paie et conformité',    Icon: Wallet },
  { key: 'dev',  label: 'Développeurs',          Icon: Code },
];

const APPS = [
  { id: 'gcal',     name: 'Google Calendar',   cat: 'cal',  desc: 'Congés, entretiens et réunions synchronisés dans les agendas de chacun.', mono: 'GC', color: '#4a69d8', on: true,  sync: 'Synchro il y a 5 min' },
  { id: 'outlook',  name: 'Microsoft Outlook', cat: 'cal',  desc: 'Les événements RH dans le calendrier Outlook de votre équipe.',            mono: 'OL', color: '#0e6f84', on: false, sync: '' },
  { id: 'ical',     name: 'Apple Calendar',    cat: 'cal',  desc: 'Flux iCal des absences de l\'équipe, en lecture seule.',                   mono: 'AC', color: '#33474f', on: false, sync: '' },
  { id: 'slack',    name: 'Slack',             cat: 'comm', desc: 'Notifications et approbations de congés directement dans Slack.',          mono: 'SL', color: '#5444b8', on: true,  sync: 'Synchro il y a 1 min' },
  { id: 'teams',    name: 'Microsoft Teams',   cat: 'comm', desc: 'Alertes RH et validations dans vos canaux Teams.',                         mono: 'MT', color: '#2f4bb0', on: false, sync: '' },
  { id: 'smtp',     name: 'Email (SMTP)',       cat: 'comm', desc: 'Envoyez les documents depuis votre propre nom de domaine.',                mono: '@',  color: '#b06b0c', on: true,  sync: '214 emails ce mois' },
  { id: 'sage',     name: 'Sage Paie',         cat: 'pay',  desc: 'Export automatique des variables de paie chaque mois.',                    mono: 'SP', color: '#16a06b', on: true,  sync: 'Dernier export le 25/10' },
  { id: 'cegid',    name: 'Cegid',             cat: 'pay',  desc: 'Synchronisation des fiches salariés dans les deux sens.',                  mono: 'CG', color: '#0f6f49', on: false, sync: '' },
  { id: 'damancom', name: 'Damancom · CNSS',   cat: 'pay',  desc: 'Fichier de déclaration CNSS prêt à téléverser chaque mois.',               mono: 'CN', color: '#b8402c', on: false, sync: '' },
  { id: 'api',      name: 'API REST',           cat: 'dev',  desc: 'Accès programmatique sécurisé à vos données RH.',                         mono: '{}', color: '#0a1c24', on: true,  sync: 'En continu' },
];

type WebhookRow = { id: string; url: string; evt: string; last: string };
const INIT_HOOKS: WebhookRow[] = [
  { id: '1', url: 'https://erp.tython.ma/hooks/wedy',        evt: 'leave.approved',      last: '200 · il y a 3 min' },
  { id: '2', url: 'https://hooks.zapier.com/…/8f3k2',        evt: 'employee.created',    last: '200 · hier' },
  { id: '3', url: 'https://intranet.tython.ma/api/docs',     evt: 'document.generated',  last: '200 · il y a 1 h' },
];

const EVT_OPTIONS = ['leave.approved', 'employee.created', 'document.generated', 'candidate.hired'];

export default function IntegrationsPage() {
  const { t } = useLang() as any;
  const [cat, setCat] = useState('all');
  const [toggled, setToggled] = useState<Record<string, boolean>>(Object.fromEntries(APPS.map(a => [a.id, a.on])));
  const [hooks, setHooks] = useState<WebhookRow[]>(INIT_HOOKS);
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvt, setHookEvt] = useState('leave.approved');
  const [showKey, setShowKey] = useState(false);
  const [apiKey] = useState('wdy_live_8c41e09b7d2a55f3f9a1c6d0');

  const filtered = APPS.filter(a => cat === 'all' || a.cat === cat);
  const nOn = Object.values(toggled).filter(Boolean).length;

  const addHook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hookUrl.startsWith('http')) { toast.error('URL invalide'); return; }
    setHooks(h => [...h, { id: crypto.randomUUID(), url: hookUrl, evt: hookEvt, last: 'Ajouté' }]);
    setHookUrl('');
    toast.success('Webhook ajouté');
  };

  return (
    <Page>
      <PageHeader title={t('integrations')} subtitle="Connectez Wedy aux outils que votre équipe utilise déjà." />

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 20 }}>
        <RV>
          <div style={{ padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(135deg,var(--primary-700,#0b5f72),var(--primary,#0e7f96))', color: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', opacity: .9 }}>Connectées</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>
              {nOn}<span style={{ fontSize: 17, opacity: .75 }}> / {APPS.length}</span>
            </div>
          </div>
        </RV>
        {[
          { label: 'Webhooks actifs', value: hooks.length },
          { label: 'Appels API · 30 jours', value: '12 480' },
          { label: 'Disponibilité', value: '99,98 %', dot: true },
        ].map((k, i) => (
          <RV key={i} delay={(i + 1) * 50}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{k.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {k.dot && (
                  <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
                    <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--success-ink)' }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success-ink)' }} />
                  </span>
                )}
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em' }}>{k.value}</span>
              </div>
            </div>
          </RV>
        ))}
      </div>

      {/* Category filter */}
      <RV>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {CATS.map(c => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`btn btn-sm ${cat === c.key ? 'btn-dark' : 'btn-secondary'}`}
              style={{ borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 7 }}
            >
              <c.Icon size={14} strokeWidth={1.8} /> {c.label}
            </button>
          ))}
        </div>
      </RV>

      {/* App cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14, marginBottom: 24 }}>
        {filtered.map((a, i) => {
          const on = toggled[a.id];
          return (
            <RV key={a.id} delay={i * 40}>
              <div
                className="card"
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, padding: 18, border: `1px solid ${on ? 'var(--primary-200,#b9dfe5)' : 'var(--border)'}`, boxShadow: on ? '0 4px 20px -8px rgba(14,111,132,.2)' : undefined, transition: 'border-color .3s,box-shadow .3s,transform .2s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = '')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ position: 'relative', width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.color, color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, flexShrink: 0, boxShadow: `0 10px 20px -10px ${a.color}` }}>
                    {a.mono}
                    {on && (
                      <span style={{ position: 'absolute', right: -4, bottom: -4, width: 18, height: 18, borderRadius: '50%', background: 'var(--success-ink)', border: '2.5px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{CATS.find(c => c.key === a.cat)?.label}</div>
                  </div>
                  <button
                    onClick={() => { setToggled(t => ({ ...t, [a.id]: !t[a.id] })); toast.success(`${a.name} ${on ? 'désactivée' : 'activée'}`); }}
                    style={{ position: 'relative', width: 44, height: 26, border: 'none', borderRadius: 99, background: on ? 'var(--primary)' : 'var(--track)', cursor: 'pointer', padding: 0, flexShrink: 0, transition: 'background .25s' }}
                  >
                    <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(10,28,36,.3)', transition: 'left .25s cubic-bezier(.2,.8,.2,1)' }} />
                  </button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)' }}>{a.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: on ? 'var(--success-ink)' : 'var(--text-muted)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? 'var(--success-ink)' : 'var(--track)' }} />
                    {on ? 'Connectée' : 'Non connectée'}
                  </span>
                  {a.sync && <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{a.sync}</span>}
                </div>
              </div>
            </RV>
          );
        })}
      </div>

      {/* Bottom row: API key + Webhooks */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {/* API Key panel */}
        <RV style={{ flex: '1 1 340px', minWidth: 0 }}>
          <div style={{ padding: 20, borderRadius: 20, background: 'var(--ink-950)', color: '#e8eff1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <KeyRound size={18} strokeWidth={1.8} style={{ color: '#5fe3f0' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Clé API</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(43,189,134,.16)', color: '#4fd3a0' }}>live</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
              <code style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#cfe9ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {showKey ? apiKey : apiKey.replace(/./g, (c, i) => i < 8 ? c : '•')}
              </code>
              <button onClick={() => setShowKey(v => !v)} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'rgba(255,255,255,.08)', color: '#cfdde1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {showKey ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(apiKey).catch(() => {}); toast.success('Clé copiée'); }} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'rgba(255,255,255,.08)', color: '#cfdde1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Copy size={15} strokeWidth={1.8} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, fontSize: 12.5, color: '#9fb4bb' }}>
              <span>Créée le 02/03/2026 · utilisée il y a 4 min</span>
              <button onClick={() => toast.info('Clé régénérée (démo)')} style={{ border: 'none', background: 'none', color: '#f0bd6a', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw size={13} strokeWidth={1.8} /> Régénérer
              </button>
            </div>
            <pre style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(0,0,0,.25)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7, color: '#9fb4bb', overflowX: 'auto', whiteSpace: 'pre' }}>{`curl https://api.wedy.ma/v1/employees \\\n  -H "Authorization: Bearer $WEDY_KEY"`}</pre>
          </div>
        </RV>

        {/* Webhooks panel */}
        <RV delay={80} style={{ flex: '1.4 1 420px', minWidth: 0 }}>
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px' }}>
              <Zap size={18} strokeWidth={1.8} style={{ color: 'var(--warning-ink)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Webhooks</span>
            </div>
            {hooks.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <code style={{ flex: '1 1 220px', minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.url}</code>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, padding: '3px 8px', borderRadius: 7, background: 'var(--warning-soft)', color: 'var(--warning-ink)' }}>{h.evt}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--success-ink)', fontWeight: 600 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-ink)' }} />{h.last}
                </span>
                <button
                  onClick={() => { setHooks(hs => hs.filter(x => x.id !== h.id)); toast.success('Webhook supprimé'); }}
                  style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-soft)'; e.currentTarget.style.color = 'var(--danger-ink)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={15} strokeWidth={1.8} />
                </button>
              </div>
            ))}
            <form onSubmit={addHook} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--subtle)' }}>
              <input
                value={hookUrl}
                onChange={e => setHookUrl(e.target.value)}
                placeholder="https://votre-app.ma/webhooks/wedy"
                style={{ flex: '1 1 220px', minWidth: 0, height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text)', outline: 'none' }}
              />
              <select
                value={hookEvt}
                onChange={e => setHookEvt(e.target.value)}
                className="select"
                style={{ height: 40, padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 12 }}
              >
                {EVT_OPTIONS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
              <button type="submit" className="btn btn-dark" style={{ height: 40 }}>Ajouter</button>
            </form>
          </div>
        </RV>
      </div>
    </Page>
  );
}
