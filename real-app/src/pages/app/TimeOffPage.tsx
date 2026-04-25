import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Check, X, Calendar, Clock } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { Card, Badge, Spinner, Button } from '../../components/ui';
import { listLeaves, reviewLeave, createLeave, listEmployees, getLeaveBalance, type LeaveRequest } from '../../lib/api';
import { format } from 'date-fns';

const TYPE_LABELS: Record<string, string> = {
  annual: 'Congé annuel', sick: 'Maladie', personal: 'Personnel',
  maternity: 'Maternité', paternity: 'Paternité', unpaid: 'Sans solde',
};

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  pending: 'warning', approved: 'success', rejected: 'danger',
};

function BalanceBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 5 }}>
        <span>{label}</span>
        <span>{used} / {total} jours</span>
      </div>
      <div style={{ background: 'var(--border)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: color, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function NewLeaveModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const qc = useQueryClient();
  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees({ limit: 100 }) });
  const employees = empData?.data ?? [];

  const [form, setForm] = useState({ employee_id: '', type: 'annual', start_date: '', end_date: '', reason: '' });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const days = React.useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    const d = Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1;
    return Math.max(d, 0);
  }, [form.start_date, form.end_date]);

  const mutation = useMutation({
    mutationFn: () => createLeave({ ...form, days }),
    onSuccess: () => {
      toast.success('Demande de congé créée');
      qc.invalidateQueries({ queryKey: ['leaves'] });
      onCreated();
      onClose();
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius-lg)', padding: 28, width: 420, boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }}>
        <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>Nouvelle demande de congé</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Employé</label>
            <select className="select" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
              <option value="">Sélectionner…</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Type de congé</label>
            <select className="select" value={form.type} onChange={e => set('type', e.target.value)}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Début</label>
              <input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Fin</label>
              <input className="input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          {days > 0 && <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>{days} jour(s)</p>}
          <div>
            <label className="label">Motif (optionnel)</label>
            <textarea className="input" rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} style={{ resize: 'none' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Button onClick={onClose} style={{ background: 'var(--bg-muted)', color: 'var(--fg)', border: '1px solid var(--border)' }}>Annuler</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!form.employee_id || !form.start_date || !form.end_date || days === 0}
          >Soumettre</Button>
        </div>
      </div>
    </div>
  );
}

export default function TimeOffPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', filter],
    queryFn: () => listLeaves(filter !== 'all' ? { status: filter } : {}),
  });

  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees({ limit: 1 }) });
  const firstEmpId = empData?.data?.[0]?.id;

  const { data: balance } = useQuery({
    queryKey: ['leave-balance', firstEmpId],
    queryFn: () => getLeaveBalance(firstEmpId!),
    enabled: !!firstEmpId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => reviewLeave(id, status),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'approved' ? 'Demande approuvée' : 'Demande rejetée');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const leaves = data?.data ?? [];
  const total = data?.count ?? 0;

  const FILTERS = [
    { key: 'all', label: 'Toutes' },
    { key: 'pending', label: 'En attente' },
    { key: 'approved', label: 'Approuvées' },
    { key: 'rejected', label: 'Rejetées' },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Congés & absences"
        subtitle={`${total} demande(s) · ${leaves.filter(l => l.status === 'pending').length} en attente`}
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={14} /> Nouvelle demande
          </Button>
        }
      />

      {showModal && <NewLeaveModal onClose={() => setShowModal(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['leaves'] })} />}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Main table */}
        <div style={{ flex: 1 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`btn btn-sm ${filter === f.key ? 'btn-soft' : 'btn-ghost'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Card pad={false}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>
              Demandes de congé
            </div>
            {isLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
            ) : leaves.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                <Calendar size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Aucune demande trouvée.</p>
              </div>
            ) : (
              <div>
                {leaves.map((req: LeaveRequest, i) => (
                  <div key={req.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 20px',
                    borderBottom: i < leaves.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--primary-soft)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Clock size={16} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{req.employees?.full_name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                        {TYPE_LABELS[req.type] || req.type} · {format(new Date(req.start_date), 'dd/MM/yyyy')} → {format(new Date(req.end_date), 'dd/MM/yyyy')} · {req.days} jour(s)
                      </div>
                      {req.reason && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>{req.reason}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {req.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => reviewMutation.mutate({ id: req.id, status: 'rejected' })}
                            style={{ border: '1px solid var(--border)', background: 'var(--bg-elev)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}
                          >
                            <X size={12} /> Rejeter
                          </button>
                          <button
                            onClick={() => reviewMutation.mutate({ id: req.id, status: 'approved' })}
                            style={{ border: 'none', background: 'var(--primary)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff', fontWeight: 500 }}
                          >
                            <Check size={12} /> Approuver
                          </button>
                        </>
                      ) : (
                        <Badge variant={STATUS_VARIANT[req.status] ?? 'default'}>{req.status}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar — balance */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <Card>
            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Solde de congés</p>
            {balance ? (
              <>
                <BalanceBar label="Congé annuel" used={balance.annual_used} total={balance.annual_total} color="var(--primary)" />
                <BalanceBar label="Maladie" used={balance.sick_used} total={balance.sick_total} color="var(--success)" />
                <BalanceBar label="Personnel" used={balance.personal_used} total={balance.personal_total} color="var(--warning)" />
                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 8 }}>Année {balance.year}</p>
              </>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Sélectionnez un employé pour voir son solde.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
