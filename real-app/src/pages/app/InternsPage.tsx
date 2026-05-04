import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, FileUp, GraduationCap, User, Calendar, Mail, Phone,
  Camera, X, FileText, CheckCircle, TrendingUp, Eye, Settings, ClipboardList,
  Star, ChevronDown, ChevronUp, Target, UserCheck, Zap, Shield, Flame, BookOpen, Award,
} from 'lucide-react';
import {
  listInterns, createIntern, updateIntern, deleteIntern, uploadDocument, listDocuments, deleteDocument,
  getInternOnboarding, updateInternOnboarding, listInternEvaluations, createInternEvaluation, deleteInternEvaluation,
} from '../../lib/api';
import type { Intern, InternOnboarding, InternEvaluation, ChecklistItem, Objective } from '../../lib/api';
import { CVImportModal } from '../../components/cv/CVImportModal';
import { Button, Badge, Input, Modal, Spinner, Avatar } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { format, isValid, differenceInDays } from 'date-fns';

const safeFormat = (date: any, fmt = 'dd/MM/yyyy') => {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, fmt) : '—';
};

// ── Phase config ───────────────────────────────────────────────────────────────

const PHASES = [
  { id: 'pre',         label: 'Pré-onboarding',  color: '#f59e0b', bg: '#fffbeb' },
  { id: 'integration', label: 'Intégration',      color: '#3b82f6', bg: '#eff6ff' },
  { id: 'evaluation',  label: 'Évaluation',       color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'completed',   label: 'Terminé',          color: '#10b981', bg: '#ecfdf5' },
];

const phaseIndex = (p: string) => PHASES.findIndex(x => x.id === p);
const phaseMeta  = (p: string) => PHASES.find(x => x.id === p) ?? PHASES[0];

// ── Moovwin score labels ───────────────────────────────────────────────────────

const SCORES = [
  { key: 'amana_score',   label: 'Amana',   desc: 'Confiance & Fiabilité',   icon: <Shield size={14} /> },
  { key: 'itkan_score',   label: 'Itkan',   desc: "Excellence du travail",    icon: <Star size={14} /> },
  { key: 'iltizam_score', label: 'Iltizam', desc: 'Engagement & Initiative',  icon: <Flame size={14} /> },
  { key: 'ibdaa_score',   label: 'Ibdaa',   desc: 'Innovation & Créativité',  icon: <Zap size={14} /> },
  { key: 'nama_score',    label: 'Nama',    desc: 'Croissance & Adaptabilité',icon: <TrendingUp size={14} /> },
];

// ── Star rating component ──────────────────────────────────────────────────────

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => !readonly && onChange?.(n)}
          style={{
            background: 'none', border: 'none', cursor: readonly ? 'default' : 'pointer', padding: 1,
            color: n <= value ? '#f59e0b' : '#d1d5db', fontSize: 18, lineHeight: 1,
          }}>
          ★
        </button>
      ))}
    </div>
  );
}

// ── Checklist phase section ────────────────────────────────────────────────────

function ChecklistPhaseSection({
  phase, items, onToggle,
}: { phase: typeof PHASES[0]; items: ChecklistItem[]; onToggle: (id: string, done: boolean) => void }) {
  const done  = items.filter(i => i.done).length;
  const total = items.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: phase.color,
          }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)' }}>{phase.label}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{done}/{total}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: pct === 100 ? '#10b981' : 'var(--fg-muted)' }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, marginBottom: 10 }}>
        <div style={{ height: 4, width: `${pct}%`, background: phase.color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <label key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            background: item.done ? phase.bg : 'var(--bg-elev)', border: `1px solid ${item.done ? phase.color + '44' : 'var(--border)'}`,
            borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <input type="checkbox" checked={item.done} onChange={e => onToggle(item.id, e.target.checked)}
              style={{ width: 16, height: 16, accentColor: phase.color, cursor: 'pointer' }} />
            <span style={{
              fontSize: 13, flex: 1,
              textDecoration: item.done ? 'line-through' : 'none',
              color: item.done ? 'var(--fg-muted)' : 'var(--fg)',
            }}>{item.label}</span>
            {item.done && <CheckCircle size={14} style={{ color: phase.color, flexShrink: 0 }} />}
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Evaluation form ────────────────────────────────────────────────────────────

function EvaluationForm({ internId, onDone }: { internId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<InternEvaluation>>({
    evaluation_type: 'weekly', week_number: 1, evaluator_name: '',
    amana_score: 0, itkan_score: 0, iltizam_score: 0, ibdaa_score: 0, nama_score: 0, comment: '',
  });
  const mut = useMutation({
    mutationFn: () => createInternEvaluation(internId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['intern-evals', internId] }); toast.success('Évaluation enregistrée'); onDone(); },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const setScore = (key: string) => (v: number) => setForm(f => ({ ...f, [key]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.evaluation_type} onChange={e => setForm(f => ({ ...f, evaluation_type: e.target.value as any }))}>
            <option value="weekly">Hebdomadaire</option>
            <option value="final">Finale</option>
            <option value="self">Auto-évaluation</option>
          </select>
        </div>
        <Input label="Semaine #" type="number" value={form.week_number ?? ''} onChange={e => setForm(f => ({ ...f, week_number: +e.target.value }))} />
        <Input label="Évaluateur" value={form.evaluator_name ?? ''} onChange={e => setForm(f => ({ ...f, evaluator_name: e.target.value }))} placeholder="Nom du responsable" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {SCORES.map(s => (
          <div key={s.key} style={{ padding: '10px 12px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ color: '#f59e0b' }}>{s.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>— {s.desc}</span>
            </div>
            <StarRating value={(form as any)[s.key] ?? 0} onChange={setScore(s.key)} />
          </div>
        ))}
      </div>

      <div>
        <label className="label">Commentaire</label>
        <textarea className="input" rows={3} style={{ resize: 'none', padding: '10px 12px' }}
          value={form.comment ?? ''} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
          placeholder="Points forts, axes d'amélioration..." />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onDone}>Annuler</Button>
        <Button onClick={() => mut.mutate()} loading={mut.isPending}>Enregistrer</Button>
      </div>
    </div>
  );
}

// ── Onboarding Tab ─────────────────────────────────────────────────────────────

function OnboardingTab({ intern }: { intern: Intern }) {
  const qc = useQueryClient();
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [newObjLabel, setNewObjLabel] = useState('');

  const { data: ob, isLoading, isError, error } = useQuery({
    queryKey: ['intern-onboarding', intern.id],
    queryFn: () => getInternOnboarding(intern.id),
    retry: false,
  });

  const { data: evals = [] } = useQuery({
    queryKey: ['intern-evals', intern.id],
    queryFn: () => listInternEvaluations(intern.id),
    retry: false,
  });

  const updateMut = useMutation({
    mutationFn: (body: Partial<InternOnboarding>) => updateInternOnboarding(intern.id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intern-onboarding', intern.id] }),
  });

  const delEvalMut = useMutation({
    mutationFn: (evalId: string) => deleteInternEvaluation(intern.id, evalId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['intern-evals', intern.id] }); toast.success('Évaluation supprimée'); },
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>;

  if (isError || !ob) {
    const isMigration = (error as any)?.response?.status === 503;
    return (
      <div style={{ padding: '30px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗄️</div>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
          {isMigration ? 'Migration de base de données requise' : 'Erreur de chargement'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
          {isMigration
            ? 'Les tables d\'onboarding n\'existent pas encore. Exécutez le SQL ci-dessous dans votre Supabase SQL Editor.'
            : 'Impossible de charger les données d\'onboarding.'}
        </p>
        {isMigration && (
          <div style={{ textAlign: 'left', maxWidth: 560, margin: '0 auto' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
              SQL à exécuter dans Supabase → SQL Editor :
            </p>
            <pre style={{
              background: '#1e293b', color: '#e2e8f0', padding: '14px 16px', borderRadius: 10,
              fontSize: 11, lineHeight: 1.7, overflow: 'auto', maxHeight: 260,
            }}>{`CREATE TABLE IF NOT EXISTS intern_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id uuid REFERENCES employees(id) ON DELETE CASCADE UNIQUE NOT NULL,
  phase text DEFAULT 'pre',
  mentor_name text, mentor_email text,
  checklist jsonb DEFAULT '[]',
  objectives jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intern_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  evaluation_type text DEFAULT 'weekly',
  week_number int, evaluator_name text,
  amana_score int DEFAULT 0, itkan_score int DEFAULT 0,
  iltizam_score int DEFAULT 0, ibdaa_score int DEFAULT 0,
  nama_score int DEFAULT 0, comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE intern_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE intern_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_intern_onboarding" ON intern_onboarding FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_intern_evaluations" ON intern_evaluations FOR ALL USING (true) WITH CHECK (true);`}</pre>
            <Button variant="soft" style={{ marginTop: 12 }} onClick={() => {
              navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS intern_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id uuid REFERENCES employees(id) ON DELETE CASCADE UNIQUE NOT NULL,
  phase text DEFAULT 'pre', mentor_name text, mentor_email text,
  checklist jsonb DEFAULT '[]', objectives jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS intern_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  evaluation_type text DEFAULT 'weekly', week_number int, evaluator_name text,
  amana_score int DEFAULT 0, itkan_score int DEFAULT 0, iltizam_score int DEFAULT 0,
  ibdaa_score int DEFAULT 0, nama_score int DEFAULT 0, comment text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE intern_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE intern_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_intern_onboarding" ON intern_onboarding FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_intern_evaluations" ON intern_evaluations FOR ALL USING (true) WITH CHECK (true);`);
              toast.success('SQL copié dans le presse-papiers');
            }}>
              Copier le SQL
            </Button>
          </div>
        )}
      </div>
    );
  }

  const checklist: ChecklistItem[] = ob.checklist ?? [];
  const objectives: Objective[] = ob.objectives ?? [];

  const totalDone  = checklist.filter(i => i.done).length;
  const totalItems = checklist.length;
  const globalPct  = totalItems ? Math.round((totalDone / totalItems) * 100) : 0;

  const handleToggle = (id: string, done: boolean) => {
    const updated = checklist.map(i => i.id === id ? { ...i, done, done_at: done ? new Date().toISOString() : null } : i);
    updateMut.mutate({ checklist: updated });
  };

  const handlePhase = (phase: InternOnboarding['phase']) => {
    updateMut.mutate({ phase });
    toast.success(`Phase: ${phaseMeta(phase).label}`);
  };

  const handleObjToggle = (id: string, done: boolean) => {
    const updated = objectives.map(o => o.id === id ? { ...o, done } : o);
    updateMut.mutate({ objectives: updated });
  };

  const handleAddObj = () => {
    if (!newObjLabel.trim()) return;
    const updated = [...objectives, { id: Date.now().toString(), label: newObjLabel.trim(), done: false }];
    updateMut.mutate({ objectives: updated });
    setNewObjLabel('');
  };

  const handleRemoveObj = (id: string) => {
    updateMut.mutate({ objectives: objectives.filter(o => o.id !== id) });
  };

  const avgEvalScore = (ev: InternEvaluation) => {
    const sum = ev.amana_score + ev.itkan_score + ev.iltizam_score + ev.ibdaa_score + ev.nama_score;
    return (sum / 5).toFixed(1);
  };

  const currentPhase = phaseMeta(ob.phase);
  const phaseIdx     = phaseIndex(ob.phase);

  // Compute stage duration
  const stageDays = intern.internship_start && intern.internship_end
    ? differenceInDays(new Date(intern.internship_end), new Date(intern.internship_start))
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Global progress bar ── */}
      <div style={{
        padding: '14px 18px', background: 'linear-gradient(135deg, #667eea22, #764ba222)',
        border: '1px solid #667eea44', borderRadius: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Progression onboarding</p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '2px 0 0' }}>
              {totalDone}/{totalItems} tâches complétées
              {stageDays !== null && ` · Stage de ${stageDays} jours`}
            </p>
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: globalPct === 100 ? '#10b981' : '#667eea' }}>{globalPct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 8 }}>
          <div style={{ height: 8, width: `${globalPct}%`, background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: 8, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* ── Phase stepper ── */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {PHASES.map((p, i) => {
          const active  = ob.phase === p.id;
          const passed  = i < phaseIdx;
          return (
            <button key={p.id} onClick={() => handlePhase(p.id as any)}
              style={{
                flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: active ? p.color : passed ? p.bg : 'transparent',
                color: active ? '#fff' : passed ? p.color : 'var(--fg-muted)',
                fontWeight: active ? 700 : 500, fontSize: 12,
                borderRight: i < PHASES.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
              {passed && !active && <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} />}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── Mentor & Checklist side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>

        {/* Mentor card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '14px 16px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserCheck size={14} style={{ color: '#3b82f6' }} /> Mentor assigné
            </p>
            <Input
              label="Nom du mentor"
              value={ob.mentor_name ?? ''}
              onChange={e => updateMut.mutate({ mentor_name: e.target.value })}
              placeholder="Sara Alami"
            />
            <div style={{ marginTop: 8 }}>
              <Input
                label="Email mentor"
                type="email"
                value={ob.mentor_email ?? ''}
                onChange={e => updateMut.mutate({ mentor_email: e.target.value })}
                placeholder="sara@tython.ma"
              />
            </div>
          </div>

          {/* Objectives */}
          <div style={{ padding: '14px 16px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={14} style={{ color: '#8b5cf6' }} /> Objectifs du stage
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {objectives.map(obj => (
                <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={obj.done} onChange={e => handleObjToggle(obj.id, e.target.checked)}
                    style={{ accentColor: '#8b5cf6', width: 15, height: 15, cursor: 'pointer' }} />
                  <span style={{ flex: 1, fontSize: 12, textDecoration: obj.done ? 'line-through' : 'none', color: obj.done ? 'var(--fg-muted)' : 'var(--fg)' }}>
                    {obj.label}
                  </span>
                  <button onClick={() => handleRemoveObj(obj.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0 }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="input" style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
                placeholder="Nouvel objectif..." value={newObjLabel} onChange={e => setNewObjLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddObj()} />
              <Button size="sm" variant="soft" onClick={handleAddObj}><Plus size={12} /></Button>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div style={{ padding: '14px 16px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClipboardList size={14} style={{ color: '#10b981' }} /> Checklist d'intégration
          </p>
          {(['pre', 'integration', 'evaluation'] as const).map(phaseId => {
            const phaseItems = checklist.filter(i => i.phase === phaseId);
            const meta = phaseMeta(phaseId);
            return (
              <ChecklistPhaseSection
                key={phaseId}
                phase={meta}
                items={phaseItems}
                onToggle={handleToggle}
              />
            );
          })}
        </div>
      </div>

      {/* ── Evaluations ── */}
      <div style={{ padding: '14px 16px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={14} style={{ color: '#f59e0b' }} /> Évaluations Moovwin
          </p>
          {!showEvalForm && (
            <Button size="sm" variant="soft" onClick={() => setShowEvalForm(true)}>
              <Plus size={12} /> Nouvelle évaluation
            </Button>
          )}
        </div>

        {showEvalForm && (
          <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 14 }}>
            <EvaluationForm internId={intern.id} onDone={() => setShowEvalForm(false)} />
          </div>
        )}

        {evals.length === 0 && !showEvalForm ? (
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center', padding: '16px 0' }}>
            Aucune évaluation pour le moment.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evals.map(ev => {
              const avg = avgEvalScore(ev);
              const typeLabel = ev.evaluation_type === 'weekly' ? `Semaine ${ev.week_number}` : ev.evaluation_type === 'final' ? 'Évaluation finale' : 'Auto-évaluation';
              const typeColor = ev.evaluation_type === 'final' ? '#10b981' : ev.evaluation_type === 'self' ? '#8b5cf6' : '#3b82f6';
              return (
                <div key={ev.id} style={{
                  padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: typeColor + '22', color: typeColor, borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 8px',
                      }}>{typeLabel}</span>
                      {ev.evaluator_name && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>par {ev.evaluator_name}</span>}
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{safeFormat(ev.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#f59e0b' }}>★ {avg}/5</span>
                      <button onClick={() => delEvalMut.mutate(ev.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {SCORES.map(s => (
                      <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <span style={{ color: '#f59e0b' }}>{s.icon}</span>
                        <span style={{ color: 'var(--fg-muted)' }}>{s.label}:</span>
                        <span style={{ fontWeight: 700 }}>{(ev as any)[s.key]}</span>
                      </div>
                    ))}
                  </div>
                  {ev.comment && (
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '8px 0 0', fontStyle: 'italic' }}>
                      "{ev.comment}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Intern form ────────────────────────────────────────────────────────────────

function InternForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Intern>; onSave: (data: Partial<Intern>) => void; onCancel: () => void; loading: boolean;
}) {
  const [form, setForm] = useState<Partial<Intern>>(initial ?? {
    full_name: '', email: '', phone: '', position: 'Stagiaire',
    department: '', manager: '', internship_start: '', internship_end: '',
    contract_type: 'Stage', status: 'intern',
    skills: [], certifications: [], bio: '',
  });

  const set = (k: keyof Intern) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const setArr = (k: 'skills' | 'certifications') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setForm(f => ({ ...f, [k]: val }));
  };

  const fileRef = React.useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const result = ev.target?.result as string;
      if (result) setForm(f => ({ ...f, photo_url: result.includes(',') ? result.split(',')[1] : result }));
    };
    r.readAsDataURL(file);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, status: 'intern', contract_type: 'Stage' }); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10, padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 12 }}>
        <div style={{ position: 'relative' }}>
          <Avatar name={form.full_name || 'U'} src={form.photo_url} size={70} />
          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: '2px solid var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={12} />
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Photo de profil</p>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 8px' }}>JPG/PNG, max 1MB</p>
          <Button variant="soft" size="sm" type="button" onClick={() => fileRef.current?.click()}>Changer</Button>
          <input ref={fileRef} type="file" style={{ display: 'none' }} accept="image/*" onChange={handlePhoto} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Nom complet *" value={form.full_name ?? ''} onChange={set('full_name')} required placeholder="Amine Alami" />
        <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} placeholder="amine@gmail.com" />
        <Input label="Téléphone" value={form.phone ?? ''} onChange={set('phone')} placeholder="+212 6 00 00 00 00" />
        <Input label="École / Formation" value={form.position ?? ''} onChange={set('position')} placeholder="ENSA Casablanca" />
        <Input label="Département" value={form.department ?? ''} onChange={set('department')} placeholder="Informatique" />
        <Input label="Superviseur" value={form.manager ?? ''} onChange={set('manager')} placeholder="Sara RH" />
        <Input label="Début du stage" type="date" value={form.internship_start ?? ''} onChange={set('internship_start')} />
        <Input label="Fin du stage" type="date" value={form.internship_end ?? ''} onChange={set('internship_end')} />
        <Input label="Rémunération (DH)" type="number" value={form.remuneration ?? 0} onChange={set('remuneration')} placeholder="2000" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Compétences (virgules)" value={form.skills?.join(', ') ?? ''} onChange={setArr('skills')} placeholder="React, TypeScript..." />
        <Input label="Langues (virgules)" value={(form as any).languages?.join(', ') ?? ''} onChange={e => {
          const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
          setForm(f => ({ ...f, languages: val } as any));
        }} placeholder="Français, Anglais..." />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label className="label">Bio / Résumé</label>
        <textarea className="input" rows={3} style={{ resize: 'none', padding: '10px 12px' }}
          value={form.bio ?? ''} onChange={set('bio')} placeholder="Description courte du stagiaire..." />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Enregistrer' : 'Ajouter le stagiaire'}</Button>
      </div>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InternsPage() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [showCVImport, setShowCVImport] = useState(false);
  const [editing, setEditing]       = useState<Intern | null>(null);
  const [prefill, setPrefill]       = useState<Partial<Intern> | null>(null);
  const [viewingIntern, setViewingIntern] = useState<Intern | null>(null);
  const [activeTab, setActiveTab]   = useState<'info' | 'docs' | 'onboarding' | 'actions'>('info');

  const { data, isLoading } = useQuery({
    queryKey: ['interns', search],
    queryFn: () => listInterns(search ? { search } : {}),
  });

  const interns = data?.data ?? [];
  const total   = data?.count ?? 0;

  const { data: docsData, refetch: refetchDocs } = useQuery({
    queryKey: ['intern-docs', viewingIntern?.id],
    queryFn: () => viewingIntern?.id ? listDocuments({ profile_id: viewingIntern.id }) : Promise.resolve({ data: [], count: 0 }),
    enabled: !!viewingIntern?.id,
  });
  const internDocs = docsData?.data ?? [];

  const createMut = useMutation({
    mutationFn: createIntern,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interns'] }); setEditing(null); setPrefill(null); toast.success('Stagiaire ajouté'); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Erreur'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Intern> }) => updateIntern(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interns'] }); setEditing(null); toast.success('Mis à jour'); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Erreur'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteIntern,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interns'] }); toast.success('Stagiaire supprimé'); setViewingIntern(null); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const closeModal = () => { setEditing(null); setPrefill(null); };

  const openDossier = (intern: Intern, tab: typeof activeTab = 'info') => {
    setViewingIntern(intern);
    setActiveTab(tab);
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Stagiaires"
        subtitle={`${total} stagiaire${total !== 1 ? 's' : ''} actif${total !== 1 ? 's' : ''}`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="soft" onClick={() => setShowCVImport(true)}>
              <FileUp size={14} /> Importer CV
            </Button>
            <Button onClick={() => setEditing({} as Intern)}>
              <Plus size={14} /> Nouveau stagiaire
            </Button>
          </div>
        }
      />

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
        <input className="input" style={{ paddingLeft: 36 }}
          placeholder="Rechercher par nom..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : interns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <GraduationCap size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontWeight: 500, marginBottom: 8 }}>Aucun stagiaire</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Ajoutez un stagiaire manuellement ou importez un CV.</p>
          <Button onClick={() => setEditing({} as Intern)}><Plus size={14} /> Ajouter</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {interns.map(intern => (
            <div key={intern.id} className="card card-pad hover-scale"
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => openDossier(intern)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar name={intern.full_name} src={intern.photo_url} size={44} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{intern.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>{intern.position || 'Stagiaire'}</p>
                    {intern.department && <span style={{ marginTop: 2 }}><Badge variant="default">{intern.department}</Badge></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" title="Onboarding" onClick={() => openDossier(intern, 'onboarding')}>
                    <ClipboardList size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" title="Dossier" onClick={() => openDossier(intern)}>
                    <Eye size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => setEditing(intern)}>
                    <Pencil size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                    onClick={() => { if (confirm('Supprimer ce stagiaire ?')) deleteMut.mutate(intern.id); }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, color: 'var(--fg-muted)' }}>
                {intern.email && <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Mail size={12} /> {intern.email}</div>}
                {intern.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Phone size={12} /> {intern.phone}</div>}
                {intern.manager && <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><User size={12} /> {intern.manager}</div>}
                {(intern as any).remuneration > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--success)', fontWeight: 600 }}>
                    <TrendingUp size={12} /> {(intern as any).remuneration} DH
                  </div>
                )}
                {(intern.internship_start || intern.internship_end) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Calendar size={12} /> {safeFormat(intern.internship_start)} → {safeFormat(intern.internship_end)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Form modal ── */}
      <Modal open={!!editing} onClose={closeModal}
        title={editing?.id ? 'Modifier le stagiaire' : 'Nouveau stagiaire'} width={640}>
        <InternForm
          initial={editing ?? prefill ?? undefined}
          onSave={data => editing?.id ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data)}
          onCancel={closeModal}
          loading={createMut.isPending || updateMut.isPending}
        />
      </Modal>

      {/* ── Dossier modal ── */}
      <Modal open={!!viewingIntern} onClose={() => setViewingIntern(null)}
        title={`Dossier Stagiaire — ${viewingIntern?.full_name || ''}`} width={820}>
        {viewingIntern && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: 16, background: 'var(--bg-muted)', borderRadius: 12 }}>
              <Avatar name={viewingIntern.full_name} src={viewingIntern.photo_url} size={72} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{viewingIntern.full_name}</h3>
                <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, margin: '2px 0' }}>{viewingIntern.position || 'Stagiaire'}</p>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--fg-muted)' }}>
                  {viewingIntern.email && <span><Mail size={11} /> {viewingIntern.email}</span>}
                  {viewingIntern.phone && <span><Phone size={11} /> {viewingIntern.phone}</span>}
                </div>
              </div>
              <Badge variant={viewingIntern.status === 'intern' ? 'primary' : 'success'}>
                {viewingIntern.status === 'intern' ? 'En stage' : 'Embauché'}
              </Badge>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 20 }}>
              {[
                { id: 'info',       label: 'Profil',      icon: <User size={13} /> },
                { id: 'onboarding', label: 'Onboarding',  icon: <ClipboardList size={13} /> },
                { id: 'docs',       label: 'Documents',   icon: <FileText size={13} /> },
                { id: 'actions',    label: 'Admin',       icon: <Settings size={13} /> },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
                  padding: '10px 4px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                  borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === t.id ? 'var(--primary)' : 'var(--fg-muted)',
                  background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none', cursor: 'pointer',
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ minHeight: 300 }}>
              {activeTab === 'info' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="card card-pad" style={{ background: 'var(--bg-elev)' }}>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Bio</p>
                      <p style={{ fontSize: 14, lineHeight: 1.6 }}>{viewingIntern.bio || 'Non renseigné'}</p>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--bg-elev)' }}>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Compétences</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {viewingIntern.skills?.length ? viewingIntern.skills.map((s, i) => <Badge key={i} variant="primary">{s}</Badge>) : <span style={{ fontSize: 13 }}>—</span>}
                      </div>
                    </div>
                  </div>
                  <div className="card card-pad" style={{ background: 'var(--bg-elev)' }}>
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Détails Stage</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                      {[
                        ['Début', safeFormat(viewingIntern.internship_start)],
                        ['Fin', safeFormat(viewingIntern.internship_end)],
                        ['Superviseur', viewingIntern.manager || '—'],
                        ['Rémunération', `${(viewingIntern as any).remuneration || 0} DH`],
                        ['Département', viewingIntern.department || '—'],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
                          <span style={{ fontWeight: 600 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'onboarding' && <OnboardingTab intern={viewingIntern} />}

              {activeTab === 'docs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {internDocs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Fichiers enregistrés</p>
                      {internDocs.map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={15} style={{ color: 'var(--primary)' }} />
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600 }}>{d.document_type?.toUpperCase()} — {d.name || 'Document'}</p>
                              <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{safeFormat(d.created_at)}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <a href={d.content} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Eye size={12} /></a>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                              onClick={() => { if (confirm('Supprimer ?')) deleteDocument(d.id).then(() => refetchDocs()); }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Scanner un document</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Copie CIN', type: 'cin' },
                        { label: 'Convention de stage', type: 'convention' },
                        { label: 'Charte IT / NDA', type: 'nda' },
                        { label: 'Attestation de stage', type: 'completion' },
                      ].map(doc => (
                        <div key={doc.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10 }}>
                          <span style={{ fontSize: 13 }}>{doc.label}</span>
                          <Button size="sm" variant="soft" onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.onchange = async (e: any) => {
                              const file = e.target.files?.[0];
                              if (file && viewingIntern) {
                                try {
                                  await uploadDocument(viewingIntern.id, doc.type, doc.label, file, false);
                                  toast.success(`${doc.label} ajouté`);
                                  refetchDocs();
                                } catch { toast.error("Erreur d'envoi"); }
                              }
                            };
                            input.click();
                          }}><FileUp size={12} /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Conversion en employé permanent</p>
                    <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 14 }}>
                      Transfert vers la liste des employés actifs avec contrat CDI.
                    </p>
                    <Button variant="primary" disabled={viewingIntern.status === 'active'}
                      onClick={() => { if (confirm(`Convertir ${viewingIntern.full_name} en employé permanent ?`)) updateMut.mutate({ id: viewingIntern.id, data: { status: 'active', contract_type: 'CDI' } }); }}>
                      <CheckCircle size={14} /> Confirmer l'embauche
                    </Button>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button variant="soft" style={{ flex: 1 }} onClick={() => { setViewingIntern(null); setEditing(viewingIntern); }}>
                      <Pencil size={14} /> Modifier le profil
                    </Button>
                    <Button variant="danger" style={{ flex: 1 }} onClick={() => { if (confirm('Supprimer définitivement ?')) deleteMut.mutate(viewingIntern.id); }}>
                      <Trash2 size={14} /> Supprimer le dossier
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {showCVImport && (
        <CVImportModal
          onClose={() => setShowCVImport(false)}
          onImport={data => {
            createMut.mutate({
              full_name:        data.full_name,
              email:            data.email,
              phone:            data.phone,
              address:          data.address,
              nationality:      data.nationality,
              status:           'intern',
              contract_type:    'Stage',
              skills:           data.skills,
              bio:              data.summary,
              certifications:   data.certifications,
              photo_url:        data.photo,
              internship_start: (data as any).internship_start,
              internship_end:   (data as any).internship_end,
            });
            setShowCVImport(false);
          }}
        />
      )}
    </div>
  );
}
