import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Plus, TrendingUp, Pencil, Trash2, X, Save } from 'lucide-react';
import { listPerformanceReviews, createPerformanceReview, updatePerformanceReview, listEmployees, getApiError } from '../../lib/api';
import { Card, Badge, Spinner, Button, Modal } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { useLang } from '../../lib/lang';
import { toast } from 'sonner';

// ── Star rating ────────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={22}
          style={{ cursor: 'pointer', transition: 'all 0.1s', color: i <= (hover || value) ? 'var(--warn)' : 'var(--line)' }}
          fill={i <= (hover || value) ? 'var(--warn)' : 'none'}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        />
      ))}
      <span style={{ fontSize: 13, color: 'var(--ink-2)', alignSelf: 'center', marginLeft: 6 }}>
        {value > 0 ? ['', 'Insuffisant', 'À améliorer', 'Satisfaisant', 'Très bien', 'Exceptionnel'][value] : '—'}
      </span>
    </div>
  );
}

function Stars({ score }: { score: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={13} fill={i <= score ? 'var(--warn)' : 'none'} style={{ color: i <= score ? 'var(--warn)' : 'var(--line)' }} />
      ))}
    </div>
  );
}

const SCORE_LABEL: Record<number, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  5: { label: 'Exceptionnel', variant: 'success' },
  4: { label: 'Très bien',    variant: 'success' },
  3: { label: 'Satisfaisant', variant: 'default' },
  2: { label: 'À améliorer',  variant: 'warning' },
  1: { label: 'Insuffisant',  variant: 'danger'  },
};

// ── Review form ───────────────────────────────────────────────────────────────

interface ReviewFormData {
  employee_id: string;
  period: string;
  score: number;
  feedback: string;
  objectives: string;
  status: string;
}

function ReviewForm({
  initial, employees, onSave, onCancel, loading,
}: {
  initial?: Partial<ReviewFormData>;
  employees: { id: string; full_name: string; position?: string }[];
  onSave: (d: ReviewFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const now = new Date();
  const [form, setForm] = useState<ReviewFormData>({
    employee_id: initial?.employee_id ?? '',
    period:      initial?.period ?? `${now.getFullYear()}-H${now.getMonth() < 6 ? 1 : 2}`,
    score:       initial?.score ?? 0,
    feedback:    initial?.feedback ?? '',
    objectives:  initial?.objectives ?? '',
    status:      initial?.status ?? 'draft',
  });

  const set = (k: keyof ReviewFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id) { toast.error('Sélectionnez un employé'); return; }
    if (!form.score)        { toast.error('Attribuez un score');      return; }
    onSave(form);
  };

  const periods = [
    `${now.getFullYear()}-H1`, `${now.getFullYear()}-H2`,
    `${now.getFullYear() - 1}-H1`, `${now.getFullYear() - 1}-H2`,
  ];

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Employé *</label>
          <select className="select" value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">— Sélectionner —</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.full_name}{e.position ? ` · ${e.position}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Période *</label>
          <select className="select" value={form.period} onChange={set('period')}>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Score global *</label>
        <StarPicker value={form.score} onChange={v => setForm(f => ({ ...f, score: v }))} />
      </div>

      <div>
        <label className="label">Feedback</label>
        <textarea className="input" rows={3} style={{ resize: 'vertical' }}
          value={form.feedback} onChange={set('feedback')}
          placeholder="Points forts, axes d'amélioration, observations générales…" />
      </div>

      <div>
        <label className="label">Objectifs pour la prochaine période</label>
        <textarea className="input" rows={2} style={{ resize: 'vertical' }}
          value={form.objectives} onChange={set('objectives')}
          placeholder="Objectifs SMART, formations prévues…" />
      </div>

      <div>
        <label className="label">Statut</label>
        <select className="select" value={form.status} onChange={set('status')}>
          <option value="draft">Brouillon</option>
          <option value="completed">Complété</option>
          <option value="acknowledged">Validé par l'employé</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}><Save size={13} /> Enregistrer</Button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const now = new Date();
  const [period, setPeriod]   = useState(`${now.getFullYear()}-H${now.getMonth() < 6 ? 1 : 2}`);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['performance-reviews', period],
    queryFn: () => listPerformanceReviews({ period }),
  });
  const { data: empData } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => listEmployees({ limit: 100, status: 'active' }),
  });

  const reviews   = reviewsData?.data ?? [];
  const employees = empData?.data ?? [];

  const avgScore = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (Number(r.score) || 0), 0) / reviews.length).toFixed(1)
    : '—';

  const createMut = useMutation({
    mutationFn: createPerformanceReview,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['performance-reviews'] });
      setShowCreate(false);
      toast.success('Évaluation créée');
    },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur création')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePerformanceReview(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['performance-reviews'] });
      setEditing(null);
      toast.success('Évaluation mise à jour');
    },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur mise à jour')),
  });

  const periods = [
    `${now.getFullYear()}-H1`, `${now.getFullYear()}-H2`,
    `${now.getFullYear() - 1}-H2`, `${now.getFullYear() - 1}-H1`,
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Performance & Évaluations"
        subtitle={`Période ${period} · ${reviews.length} entretien${reviews.length !== 1 ? 's' : ''}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="select" style={{ width: 140 }} value={period} onChange={e => setPeriod(e.target.value)}>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Nouvel entretien
            </Button>
          </div>
        }
      />

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Score moyen',     value: avgScore + (avgScore !== '—' ? ' / 5' : ''), color: 'var(--success)' },
          { label: 'Entretiens',      value: reviews.length,                               color: 'var(--primary)' },
          { label: 'Effectif évalué', value: `${reviews.length} / ${employees.length}`,    color: 'var(--fg)' },
          { label: 'Top performers',  value: reviews.filter(r => Number(r.score) >= 4).length, color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Reviews table */}
      <Card pad={false}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px 80px', gap: 12, fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Employé</span><span>Département</span><span>Score</span><span>Statut</span><span></span>
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--ink-2)' }}>
            <TrendingUp size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Aucun entretien pour {period}</p>
            <p style={{ fontSize: 13, marginBottom: 16 }}>Créez le premier entretien de la période.</p>
            <Button onClick={() => setShowCreate(true)}><Plus size={13} /> Créer un entretien</Button>
          </div>
        ) : reviews.map((rev, i) => {
          const scoreNum = Number(rev.score);
          const info = SCORE_LABEL[scoreNum] ?? { label: `${scoreNum}/5`, variant: 'default' };
          return (
            <div key={rev.id} style={{
              padding: '13px 20px',
              borderBottom: i < reviews.length - 1 ? '1px solid var(--line)' : 'none',
              display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px 80px',
              gap: 12, alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{rev.employees?.full_name ?? '—'}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0 }}>{rev.employees?.position ?? ''}</p>
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{rev.employees?.department ?? '—'}</span>
              <Stars score={scoreNum} />
              <Badge variant={info.variant as any}>{info.label}</Badge>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(rev)} title="Modifier">
                  <Pencil size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvel entretien d'évaluation" width={600}>
        <ReviewForm
          employees={employees}
          onSave={data => createMut.mutate(data as any)}
          onCancel={() => setShowCreate(false)}
          loading={createMut.isPending}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier l'évaluation" width={600}>
        {editing && (
          <ReviewForm
            initial={editing}
            employees={employees}
            onSave={data => updateMut.mutate({ id: editing.id, data })}
            onCancel={() => setEditing(null)}
            loading={updateMut.isPending}
          />
        )}
      </Modal>
    </div>
  );
}
