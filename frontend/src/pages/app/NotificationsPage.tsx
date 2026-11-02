import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CheckCheck, Inbox, FileClock, Sparkles, UserPlus, ShieldAlert, Wallet,
  UserCheck, BookOpen, Check, ArrowRight, BellOff, CircleCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { Spinner } from '../../components/ui';
import { toast } from 'sonner';
import { useLang } from '../../lib/lang';
import { RV } from '@/components/motion';

interface SmartNotif {
  id: string; type: string; icon: string; color: string;
  title: string; body: string; time: string; unread: boolean; priority: number;
  link?: string | null;
}

const fetchNotifs = () =>
  api.get<{ data: SmartNotif[]; unread_count: number; count: number }>('/notifications').then(r => r.data);
const markAllRead = () => api.post('/notifications/mark-all-read').then(r => r.data);

const TYPE_CFG: Record<string, { Icon: React.ElementType; bg: string; color: string }> = {
  leave_pending:      { Icon: Inbox,       bg: 'var(--primary-soft)', color: 'var(--primary)' },
  contract_expiring:  { Icon: FileClock,   bg: 'var(--danger-soft)',  color: 'var(--danger-ink)' },
  cdd_risk:           { Icon: FileClock,   bg: 'var(--danger-soft)',  color: 'var(--danger-ink)' },
  document_generated: { Icon: Sparkles,    bg: 'var(--ai-soft)',      color: 'var(--ai)' },
  document_request:   { Icon: Inbox,       bg: 'var(--primary-soft)', color: 'var(--primary)' },
  new_employee:       { Icon: UserPlus,    bg: 'var(--success-soft)', color: 'var(--success-ink)' },
  employee_request:   { Icon: UserCheck,   bg: 'var(--primary-soft)', color: 'var(--primary)' },
  security:           { Icon: ShieldAlert, bg: 'var(--danger-soft)',  color: 'var(--danger-ink)' },
  payroll:            { Icon: Wallet,      bg: 'var(--warning-soft)', color: 'var(--warning-ink)' },
  training:           { Icon: BookOpen,    bg: 'var(--ai-soft)',      color: 'var(--ai)' },
};

function notifTarget(n: SmartNotif): string | null {
  const link = n.link || '';
  if (link.startsWith('/app/')) return link;
  switch (n.type) {
    case 'leave_pending':      return '/app/requests?kind=leave';
    case 'document_request':   return '/app/requests?kind=document';
    case 'employee_request':   return '/app/requests?kind=other';
    case 'contract_expiring':
    case 'cdd_risk':
    case 'new_employee':       return '/app/employees';
    case 'document_generated': return '/app/history';
  }
  const legacy: Record<string, string> = {
    '/leaves': '/app/requests?kind=leave', '/documents': '/app/requests?kind=document', '/requests': '/app/requests',
  };
  return legacy[link] ?? null;
}

const PREF_ROWS = [
  { key: 'request',  label: 'Demandes',             Icon: Inbox,       color: 'var(--primary)' },
  { key: 'contract', label: 'Contrats et échéances', Icon: FileClock,   color: 'var(--danger-ink)' },
  { key: 'recruit',  label: 'Recrutement',           Icon: UserPlus,    color: 'var(--success-ink)' },
  { key: 'payroll',  label: 'Paie',                  Icon: Wallet,      color: 'var(--warning-ink)' },
  { key: 'security', label: 'Sécurité',              Icon: ShieldAlert, color: 'var(--danger-ink)' },
  { key: 'ai',       label: 'Wedy IA',               Icon: Sparkles,    color: 'var(--ai)' },
];

export default function NotificationsPage() {
  const { t } = useLang() as any;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [resolved, setResolved] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean[]>>(
    Object.fromEntries(PREF_ROWS.map(r => [r.key, [true, true, false]]))
  );
  const [digest, setDigest] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifs,
    refetchInterval: 60_000,
  });

  const markMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Toutes les notifications sont marquées comme lues');
    },
  });

  const openNotif = (n: SmartNotif) => {
    if (n.unread) {
      qc.setQueryData<{ data: SmartNotif[]; unread_count: number; count: number }>(['notifications'], old =>
        old ? { ...old, unread_count: Math.max(0, old.unread_count - 1), data: old.data.map(x => (x.id === n.id ? { ...x, unread: false } : x)) } : old);
      api.patch(`/notifications/${n.id}/read`).catch(() => {}).finally(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
    }
    const target = notifTarget(n);
    if (target) navigate(target);
  };

  const notifs = data?.data ?? [];
  const unread = data?.unread_count ?? 0;

  const needsAction = (n: SmartNotif) => ['leave_pending', 'document_request', 'employee_request'].includes(n.type);

  const filtered = notifs.filter(n =>
    tab === 'all' ? true :
    tab === 'unread' ? n.unread :
    tab === 'action' ? needsAction(n) :
    tab === 'security' ? n.type === 'security' : true
  );

  const TABS = [
    { key: 'all',      label: 'Toutes',    count: notifs.length },
    { key: 'unread',   label: 'Non lues',  count: unread },
    { key: 'action',   label: 'À traiter', count: notifs.filter(needsAction).length },
    { key: 'security', label: 'Sécurité',  count: notifs.filter(n => n.type === 'security').length },
  ];

  return (
    <Page>
      <PageHeader
        title={t('notifications')}
        subtitle={unread > 0 ? `${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''} · tout ce qui demande votre attention.` : 'Vous êtes à jour. Bravo !'}
        action={
          <button
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, opacity: unread > 0 ? 1 : 0.5 }}
            onClick={() => markMut.mutate()}
          >
            <CheckCheck size={15} strokeWidth={1.8} /> Tout marquer comme lu
          </button>
        }
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Main list */}
        <div style={{ flex: '2 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tabs */}
          <RV>
            <div style={{ display: 'flex', gap: 4, padding: 5, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', alignSelf: 'flex-start', flexWrap: 'wrap' }}>
              {TABS.map(tb => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  style={{
                    position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7,
                    height: 36, padding: '0 13px', border: 'none', borderRadius: 10,
                    background: tab === tb.key ? 'var(--ink-950)' : 'transparent',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    color: tab === tb.key ? '#fff' : 'var(--text-2)', transition: 'color .15s',
                  }}
                >
                  {tb.label}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '1px 6px', borderRadius: 99, background: tab === tb.key ? 'rgba(255,255,255,.18)' : 'var(--subtle)' }}>
                    {tb.count}
                  </span>
                </button>
              ))}
            </div>
          </RV>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
          ) : filtered.length === 0 ? (
            <RV>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 20px', borderRadius: 20, background: 'var(--surface)', border: '1px dashed var(--border)', textAlign: 'center' }}>
                <span style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--success-soft)', color: 'var(--success-ink)' }}>
                  <BellOff size={22} strokeWidth={1.8} />
                </span>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Tout est à jour</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Aucune notification dans cette vue.</div>
              </div>
            </RV>
          ) : (
            /* Group by day */
            (['Aujourd\'hui', 'Hier', 'Cette semaine'] as const).map(dayLabel => {
              const day = dayLabel === "Aujourd'hui" ? 0 : dayLabel === 'Hier' ? 1 : 2;
              // If no API data, show all in first group
              const items = data?.data?.length
                ? filtered
                : day === 0 ? filtered : [];
              if (!items.length) return null;
              return (
                <RV key={dayLabel}>
                  <div style={{ borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 18px', background: 'var(--subtle)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--border)' }}>
                      {dayLabel}
                    </div>
                    {items.map((n, i) => {
                      const cfg = TYPE_CFG[n.type] || { Icon: Bell, bg: 'var(--subtle)', color: 'var(--text-muted)' };
                      const isResolved = resolved.includes(n.id);
                      return (
                        <div
                          key={n.id}
                          style={{ position: 'relative', display: 'flex', gap: 13, alignItems: 'flex-start', padding: '15px 18px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', background: n.unread ? 'var(--primary-soft)' : 'var(--surface)', cursor: 'pointer', transition: 'background .15s' }}
                          onClick={() => openNotif(n)}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--subtle)')}
                          onMouseLeave={e => (e.currentTarget.style.background = n.unread ? 'var(--primary-soft)' : 'var(--surface)')}
                        >
                          {n.unread && <span style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: '0 3px 3px 0', background: 'var(--primary)' }} />}
                          <span style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                            <cfg.Icon size={18} strokeWidth={1.8} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: n.unread ? 700 : 600, color: 'var(--text)' }}>{n.title}</span>
                              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{n.time}</span>
                            </div>
                            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-2)', marginTop: 3 }}>{n.body}</div>
                            {notifTarget(n) && !isResolved && (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }} onClick={e => e.stopPropagation()}>
                                {needsAction(n) && (
                                  <button
                                    className="btn btn-sm"
                                    style={{ background: 'linear-gradient(135deg,#0f6f49,#16a06b)', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                    onClick={() => { setResolved(r => [...r, n.id]); toast.success('Approuvé'); }}
                                  >
                                    <Check size={13} strokeWidth={2.4} /> Approuver
                                  </button>
                                )}
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                  onClick={() => openNotif(n)}
                                >
                                  Voir <ArrowRight size={13} strokeWidth={1.8} />
                                </button>
                              </div>
                            )}
                            {isResolved && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12.5, fontWeight: 700, color: 'var(--success-ink)' }}>
                                <CircleCheck size={14} strokeWidth={1.8} /> Traité
                              </span>
                            )}
                          </div>
                          {n.unread && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 6, boxShadow: '0 0 0 4px rgba(22,182,200,.15)' }} />}
                        </div>
                      );
                    })}
                  </div>
                </RV>
              );
            })
          )}
        </div>

        {/* Sidebar: preferences */}
        <RV delay={160} dir="left">
          <div style={{ flex: '1 1 300px', minWidth: 0, position: 'sticky', top: 90, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '18px 20px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Préférences</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Choisissez où recevoir chaque type d'alerte.</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) repeat(3,44px)', gap: 6, alignItems: 'center', marginTop: 14, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                <span />
                {['App', 'Email', 'Slack'].map(ch => <span key={ch} style={{ textAlign: 'center' }}>{ch}</span>)}
              </div>

              {PREF_ROWS.map(row => (
                <div key={row.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) repeat(3,44px)', gap: 6, alignItems: 'center', padding: '9px 0', borderTop: '1px solid var(--border)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', minWidth: 0 }}>
                    <row.Icon size={14} strokeWidth={1.8} style={{ color: row.color, flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</span>
                  </span>
                  {prefs[row.key].map((on, j) => (
                    <button
                      key={j}
                      onClick={() => setPrefs(p => ({ ...p, [row.key]: p[row.key].map((v, m) => m === j ? !v : v) }))}
                      style={{ justifySelf: 'center', position: 'relative', width: 34, height: 20, border: 'none', borderRadius: 99, background: on ? 'var(--primary)' : 'var(--track)', cursor: 'pointer', padding: 0, transition: 'background .2s' }}
                    >
                      <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(10,28,36,.3)', transition: 'left .2s cubic-bezier(.2,.8,.2,1)' }} />
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Daily digest */}
            <button
              onClick={() => { setDigest(v => !v); toast.success(digest ? 'Résumé quotidien désactivé' : 'Résumé quotidien activé · 08:30'); }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', borderRadius: 18, border: `1px solid ${digest ? 'var(--primary-200,#b9dfe5)' : 'var(--border)'}`, background: digest ? 'var(--primary-soft)' : 'var(--surface)', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', transition: 'background .2s,border-color .2s' }}
            >
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={18} strokeWidth={1.8} style={{ color: 'var(--primary)' }} />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Résumé quotidien par Wedy</span>
                <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-muted)', marginTop: 2 }}>Chaque matin à 08:30, l'essentiel de la veille en 5 lignes.</span>
              </span>
              <span style={{ position: 'relative', width: 40, height: 24, borderRadius: 99, background: digest ? 'var(--primary)' : 'var(--track)', flexShrink: 0, transition: 'background .2s' }}>
                <span style={{ position: 'absolute', top: 3, left: digest ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(10,28,36,.3)', transition: 'left .25s cubic-bezier(.2,.8,.2,1)' }} />
              </span>
            </button>
          </div>
        </RV>
      </div>
    </Page>
  );
}
