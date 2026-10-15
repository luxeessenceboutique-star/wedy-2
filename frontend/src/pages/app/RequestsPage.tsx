import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, FileText, MessageSquare, Check, X, Loader2, Search, Inbox, Wand2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/layout/AppShell';
import { Badge, Button, Spinner, Avatar } from '../../components/ui';
import { listInbox, decideRequest, getApiError, type InboxItem, type InboxKind } from '@/services/api';

type StateFilter = 'pending' | 'handled' | 'all';
type KindFilter = 'all' | InboxKind;

const KIND_META: Record<InboxKind, { label: string; plural: string; icon: React.ReactNode; color: string; bg: string }> = {
  leave:    { label: 'Congé',    plural: 'Congés',    icon: <Calendar size={16} />,      color: 'var(--primary)', bg: 'var(--primary-soft)' },
  document: { label: 'Document', plural: 'Documents', icon: <FileText size={16} />,      color: 'var(--violet)',  bg: '#eef2ff' },
  other:    { label: 'Autre',    plural: 'Autres',    icon: <MessageSquare size={16} />, color: 'var(--accent)',  bg: 'var(--surface-2)' },
};

const STATUS_META: Record<string, { label: string; variant: 'warning' | 'primary' | 'success' | 'danger' | 'default' }> = {
  pending:     { label: 'En attente', variant: 'warning' },
  in_progress: { label: 'En cours de traitement', variant: 'primary' },
  approved:    { label: 'Approuvée',  variant: 'success' },
  completed:   { label: 'Approuvée',  variant: 'success' },
  rejected:    { label: 'Refusée',    variant: 'danger'  },
};

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function RequestsPage() {
  const qc = useQueryClient();
  // Deep link from a notification: /app/requests?kind=leave&id=<request id>
  const [params] = useSearchParams();
  const kindParam = params.get('kind');
  const focusId = params.get('id');
  const [stateFilter, setStateFilter] = useState<StateFilter>(kindParam || focusId ? 'all' : 'pending');
  const [kindFilter, setKindFilter] = useState<KindFilter>(
    kindParam === 'leave' || kindParam === 'document' || kindParam === 'other' ? kindParam : 'all');
  const [flashId, setFlashId] = useState<string | null>(focusId);
  const [q, setQ] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['requests-inbox'],
    queryFn: listInbox,
    refetchInterval: 30000,
  });

  // Scroll to the request the notification is about, highlight it for a few seconds
  useEffect(() => {
    if (!focusId || !data) return;
    const el = document.querySelector(`[data-req-id="${CSS.escape(focusId)}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setFlashId(null), 5000);
    return () => clearTimeout(t);
  }, [focusId, data]);

  const decideMut = useMutation({
    mutationFn: (v: { item: InboxItem; status: string; note?: string }) =>
      decideRequest(v.item.kind, v.item.id, v.status, v.note),
    onSuccess: (_d, v) => {
      toast.success(`${STATUS_META[v.status]?.label ?? v.status} — ${v.item.employee_name}`);
      qc.invalidateQueries({ queryKey: ['requests-inbox'] });
      qc.invalidateQueries({ queryKey: ['requests-count'] });
      if (v.item.kind === 'leave') qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (e: unknown) => toast.error(getApiError(e, 'Action impossible')),
  });

  const act = (item: InboxItem, status: string) => {
    let note: string | undefined;
    if (status === 'rejected') {
      const answer = window.prompt(`Motif du refus pour ${item.employee_name} (facultatif)`, '');
      if (answer === null) return; // cancelled
      note = answer.trim() || undefined;
    }
    decideMut.mutate({ item, status, note });
  };

  const all = data?.data ?? [];
  const counts = data?.counts;
  const needle = q.trim().toLowerCase();
  const items = all.filter(i =>
    (stateFilter === 'all' || (stateFilter === 'pending' ? i.state === 'pending' : i.state !== 'pending')) &&
    (kindFilter === 'all' || i.kind === kindFilter) &&
    (!needle || `${i.employee_name} ${i.title} ${i.details}`.toLowerCase().includes(needle)));

  const busyId = decideMut.isPending ? decideMut.variables?.item.id : undefined;

  const Seg = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} style={{
      padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8,
      border: `1px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
      background: active ? 'var(--primary-soft)' : 'var(--surface)',
      color: active ? 'var(--primary)' : 'var(--ink-2)',
    }}>{children}</button>
  );

  return (
    <div>
      <PageHeader
        title="Demandes des employés"
        subtitle="Congés, documents et autres demandes soumis par vos équipes."
        action={<Button variant="ghost" onClick={() => refetch()}>Actualiser</Button>}
      />

      <div style={{ padding: '0 30px 30px' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'En attente', value: counts?.pending ?? 0, color: 'var(--warn)', bg: 'var(--surface)', hot: (counts?.pending ?? 0) > 0 },
            ...(['leave', 'document', 'other'] as InboxKind[]).map(k => ({
              label: KIND_META[k].plural, value: counts?.[k] ?? 0, color: KIND_META[k].color, bg: 'var(--surface)', hot: false,
            })),
          ].map(s => (
            <div key={s.label} style={{
              flex: '1 1 140px', padding: '14px 18px', background: s.bg, borderRadius: 12,
              border: `1px solid ${s.hot ? s.color : 'var(--line)'}`,
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <Seg active={stateFilter === 'pending'} onClick={() => setStateFilter('pending')}>En attente{counts ? ` (${counts.pending})` : ''}</Seg>
          <Seg active={stateFilter === 'handled'} onClick={() => setStateFilter('handled')}>Traitées</Seg>
          <Seg active={stateFilter === 'all'} onClick={() => setStateFilter('all')}>Toutes</Seg>
          <span style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
          <Seg active={kindFilter === 'all'} onClick={() => setKindFilter('all')}>Tous types</Seg>
          {(['leave', 'document', 'other'] as InboxKind[]).map(k => (
            <Seg key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>{KIND_META[k].plural}</Seg>
          ))}
          <div style={{ position: 'relative', marginLeft: 'auto', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-3)' }} />
            <input className="input" placeholder="Rechercher un employé…" value={q}
              onChange={e => setQ(e.target.value)} style={{ paddingLeft: 30, width: '100%' }} />
          </div>
        </div>

        {data?.warnings?.length ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: 'var(--danger)', fontSize: 13 }}>
            Certaines demandes n'ont pas pu être chargées ({data.warnings.join(' ; ')}).
          </div>
        ) : null}

        {/* List */}
        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><Spinner /></div>
        ) : isError ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--danger)' }}>
            Impossible de charger les demandes. <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>Réessayer</button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <Inbox size={36} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600 }}>{stateFilter === 'pending' ? 'Aucune demande en attente' : 'Aucune demande'}</p>
            <p style={{ fontSize: 13 }}>Les demandes soumises par les employés apparaîtront ici.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => {
              const km = KIND_META[item.kind];
              const sm = STATUS_META[item.status] ?? { label: item.status, variant: 'default' as const };
              const pending = item.state === 'pending';
              const busy = busyId === item.id;
              return (
                <div key={`${item.kind}:${item.id}`} data-req-id={item.id} style={{
                  display: 'flex', gap: 14, alignItems: 'center', padding: '14px 18px', flexWrap: 'wrap',
                  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
                  borderLeft: `3px solid ${pending ? 'var(--warn)' : 'var(--line)'}`,
                  boxShadow: flashId === item.id ? '0 0 0 2px var(--primary)' : undefined, transition: 'box-shadow .3s',
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: km.bg, color: km.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title={km.label}>
                    {km.icon}
                  </div>

                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Avatar name={item.employee_name} size={22} />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{item.employee_name}</span>
                      {item.department && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>· {item.department}</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{item.title}</div>
                    {item.details && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{item.details}</div>}
                    {item.note && !pending && (
                      <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, fontStyle: 'italic' }}>Note RH : {item.note}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {fmtDate(item.created_at)}
                      </span>
                      <Badge variant={sm.variant}>{sm.label}</Badge>
                    </div>

                    {pending && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {busy && <Loader2 size={15} className="animate-spin" style={{ alignSelf: 'center' }} />}
                        {item.kind === 'document' ? (
                          <>
                            {item.employee_id && (
                              <Link to={`/app/generate?employee_id=${item.employee_id}`}>
                                <button className="btn btn-ghost btn-sm" title="Générer le document"><Wand2 size={13} /> Générer</button>
                              </Link>
                            )}
                            {item.status === 'pending' && (
                              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(item, 'in_progress')}>En cours de traitement</button>
                            )}
                            <button className="btn btn-soft btn-sm" disabled={busy} onClick={() => act(item, 'completed')}>
                              <Check size={13} /> Approuvé
                            </button>
                          </>
                        ) : (
                          <button className="btn btn-soft btn-sm" disabled={busy} onClick={() => act(item, 'approved')}>
                            <Check size={13} /> Approuver
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" disabled={busy} style={{ color: 'var(--danger)' }}
                          onClick={() => act(item, 'rejected')}>
                          <X size={13} /> Refuser
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
