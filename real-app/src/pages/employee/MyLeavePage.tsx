import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Clock, CheckCircle, AlertCircle, X } from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Input, Spinner, Modal } from '../../components/ui';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';

const getMyLeaves = () => api.get('/portal/me/leaves').then(r => r.data).catch(() => []);
const submitLeave = (body: any) => api.post('/portal/me/leaves', body).then(r => r.data);

const LEAVE_TYPES = [
  { value: 'annual',    label: 'Congé annuel' },
  { value: 'sick',      label: 'Congé maladie' },
  { value: 'personal',  label: 'Congé personnel' },
  { value: 'maternity', label: 'Congé maternité' },
  { value: 'paternity', label: 'Congé paternité' },
  { value: 'unpaid',    label: 'Congé sans solde' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:  { label: 'En attente',  color: '#f59e0b', bg: '#fffbeb', icon: <Clock size={13} /> },
  approved: { label: 'Approuvé',    color: '#10b981', bg: '#ecfdf5', icon: <CheckCircle size={13} /> },
  rejected: { label: 'Refusé',      color: '#ef4444', bg: '#fef2f2', icon: <AlertCircle size={13} /> },
};

const safeFormat = (d: any) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isValid(dt) ? format(dt, 'dd/MM/yyyy') : d;
};

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start); const e = new Date(end);
  if (!isValid(s) || !isValid(e) || e < s) return 0;
  return Math.ceil((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

export default function MyLeavePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'annual', start_date: '', end_date: '', reason: '' });
  const [filter, setFilter] = useState('all');

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['portal-leaves'], queryFn: getMyLeaves, retry: false,
  });

  const submitMut = useMutation({
    mutationFn: () => submitLeave({
      ...form,
      days: calcDays(form.start_date, form.end_date),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-leaves'] });
      qc.invalidateQueries({ queryKey: ['portal-stats'] });
      setShowForm(false);
      setForm({ type: 'annual', start_date: '', end_date: '', reason: '' });
      toast.success('Demande envoyée — votre RH a été notifié');
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur lors de la soumission'),
  });

  const filtered = filter === 'all' ? (leaves as any[]) : (leaves as any[]).filter((l: any) => l.status === filter);
  const days = calcDays(form.start_date, form.end_date);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 780, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Mes Congés</h1>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>Soumettez et suivez vos demandes de congé</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={14} /> Demander un congé
        </Button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'all',      label: `Tout (${(leaves as any[]).length})` },
          { id: 'pending',  label: `En attente (${(leaves as any[]).filter((l: any) => l.status === 'pending').length})` },
          { id: 'approved', label: `Approuvés` },
          { id: 'rejected', label: `Refusés` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: filter === f.id ? 'var(--primary)' : 'transparent',
              color: filter === f.id ? '#fff' : 'var(--fg)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <Calendar size={40} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 500 }}>Aucune demande.</p>
          <Button onClick={() => setShowForm(true)} style={{ marginTop: 8 }}>
            <Plus size={13} /> Faire une demande
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((l: any) => {
            const sm = STATUS_META[l.status] ?? STATUS_META.pending;
            const typeLabel = LEAVE_TYPES.find(t => t.value === l.type)?.label ?? l.type;
            return (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', border: '1px solid var(--border)',
                borderLeft: `4px solid ${sm.color}`,
                borderRadius: 12, background: 'var(--bg-elev)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{typeLabel}</span>
                    {l.reason && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>· {l.reason}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', gap: 16 }}>
                    <span><Calendar size={11} /> {safeFormat(l.start_date)} → {safeFormat(l.end_date)}</span>
                    <span><strong>{l.days}</strong> jour(s)</span>
                    <span>Soumis le {safeFormat(l.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                  borderRadius: 20, background: sm.bg, color: sm.color, fontWeight: 700, fontSize: 12 }}>
                  {sm.icon}
                  <span>{sm.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Demande de congé" width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Type de congé</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Date de début *</label>
              <input type="date" className="input" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Date de fin *</label>
              <input type="date" className="input" value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
            </div>
          </div>
          {days > 0 && (
            <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>
              Durée : {days} jour(s) ouvrable(s)
            </div>
          )}
          <div>
            <label className="label">Motif (optionnel)</label>
            <textarea className="input" rows={2} style={{ resize: 'none', padding: '8px 12px' }}
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Vacances, rendez-vous médical..." />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button
              onClick={() => submitMut.mutate()}
              loading={submitMut.isPending}
              disabled={!form.start_date || !form.end_date || days <= 0}>
              Envoyer la demande
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
