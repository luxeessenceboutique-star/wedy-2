import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, FileUp, GraduationCap, User, Calendar, Mail, Phone,
  Camera, X, FileText, CheckCircle2, TrendingUp, Eye, Settings, ClipboardList,
  Star, ChevronDown, ChevronUp, Target, UserCheck, Zap, Shield, Flame, BookOpen, Award,
  Upload, Download, LayoutGrid, List, Columns3,
} from 'lucide-react';
import {
  listInterns, createIntern, updateIntern, deleteIntern, uploadDocument, listDocuments, deleteDocument,
  convertIntern, getInternOnboarding, updateInternOnboarding, listInternEvaluations, createInternEvaluation, deleteInternEvaluation,
  sendForSignature, listDepartments, getApiError,
} from '@/services/api';
import type { Intern, InternOnboarding, InternEvaluation, ChecklistItem, Objective } from '@/services/api';
import { CVImportModal } from '@/components/employees/CVImportModal';
import { SmartImportModal } from '@/components/employees/SmartImportModal';
import { ExportModal } from '@/components/employees/ExportModal';
import { DepartmentsModal } from '@/components/employees/DepartmentsModal';
import { Button, Badge, Input, Modal, Spinner, Avatar } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { KanbanBoard } from '../../components/KanbanBoard';
import { toast } from 'sonner';
import { format, isValid, differenceInDays } from 'date-fns';

const INTERN_COLS = [
  { key: 'full_name',        label: 'Nom complet',           required: true },
  { key: 'email',            label: 'Email' },
  { key: 'phone',            label: 'Téléphone' },
  { key: 'position',         label: 'École / Formation' },
  { key: 'department',       label: 'Département' },
  { key: 'manager',          label: 'Superviseur' },
  { key: 'internship_start', label: 'Début du stage' },
  { key: 'internship_end',   label: 'Fin du stage' },
  { key: 'remuneration',     label: 'Rémunération (DH)' },
  { key: 'skills',           label: 'Compétences' },
  { key: 'languages',        label: 'Langues' },
  { key: 'bio',              label: 'Bio' },
];

const safeFormat = (date: any, fmt = 'dd/MM/yyyy') => {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, fmt) : '—';
};

// ── Phase config ───────────────────────────────────────────────────────────────

const PHASES = [
  { id: 'pre',         label: 'Pré-onboarding',  color: 'var(--warn)',    bg: 'var(--warn-soft)' },
  { id: 'integration', label: 'Intégration',      color: 'var(--primary)', bg: 'var(--primary-soft)' },
  { id: 'evaluation',  label: 'Évaluation',       color: 'var(--violet)',  bg: 'var(--violet-soft)' },
  { id: 'completed',   label: 'Terminé',          color: 'var(--success)', bg: 'var(--success-soft)' },
];

// Statut du stage (register "ETAT DES STAGIAIRES")
const STAGE_OPTIONS = ['En cours', 'Embauché', 'Terminé', 'Fin de stage', 'Validé', 'Quitté', 'Désistement', 'Déperdition', 'Arrêté', 'Démissionné', 'Expulsion', 'Annulée', 'En attente', 'En cours de décision', 'Non validé', 'À distance'];
const stageVariant = (st?: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' =>
  !st ? 'default'
    : st === 'En cours' || st === 'À distance' ? 'primary'
    : ['Embauché', 'Terminé', 'Fin de stage', 'Validé'].includes(st) ? 'success'
    : ['Quitté', 'Désistement', 'Déperdition', 'En attente', 'En cours de décision'].includes(st) ? 'warning'
    : 'danger';
const stageColor = (st?: string) =>
  ({ primary: 'var(--primary)', success: 'var(--success)', warning: 'var(--warn)', danger: 'var(--danger)', default: 'var(--ink-3)' })[stageVariant(st)];

// Types de stage
const INTERNSHIP_TYPES = [
  'Stage fonctionnel',
  'Stage d’apprentissage',
  'Stage fonctionnel pré-embauche',
  'Stage PFE (Projet de Fin d’Études)',
  'Stage PFA (Projet de Fin d’Année)',
  'Stage pré-embauche',
  'En cours de décision',
];
const TYPE_COLORS = ['var(--primary)', 'var(--violet)', 'var(--accent)', 'var(--success)', 'var(--warn)', 'var(--danger)', 'var(--ink-3)'];

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
            color: n <= value ? 'var(--warn)' : '#d1d5db', fontSize: 18, lineHeight: 1,
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
          <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{done}/{total}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: pct === 100 ? 'var(--success)' : 'var(--ink-2)' }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--line)', borderRadius: 4, marginBottom: 10 }}>
        <div style={{ height: 4, width: `${pct}%`, background: phase.color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <label key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            background: item.done ? phase.bg : 'var(--surface)', border: `1px solid ${item.done ? phase.color + '44' : 'var(--line)'}`,
            borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <input type="checkbox" checked={item.done} onChange={e => onToggle(item.id, e.target.checked)}
              style={{ width: 16, height: 16, accentColor: phase.color, cursor: 'pointer' }} />
            <span style={{
              fontSize: 13, flex: 1,
              textDecoration: item.done ? 'line-through' : 'none',
              color: item.done ? 'var(--ink-2)' : 'var(--fg)',
            }}>{item.label}</span>
            {item.done && <CheckCircle2 size={14} style={{ color: phase.color, flexShrink: 0 }} />}
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
          <div key={s.key} style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ color: 'var(--warn)' }}>{s.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>— {s.desc}</span>
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
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
          {isMigration
            ? 'Les tables d\'onboarding n\'existent pas encore. Exécutez le SQL ci-dessous dans votre Supabase SQL Editor.'
            : 'Impossible de charger les données d\'onboarding.'}
        </p>
        {isMigration && (
          <div style={{ textAlign: 'left', maxWidth: 560, margin: '0 auto' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: 8 }}>
              SQL à exécuter dans Supabase → SQL Editor :
            </p>
            <pre style={{
              background: 'var(--ink)', color: 'var(--line)', padding: '14px 16px', borderRadius: 10,
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
            <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '2px 0 0' }}>
              {totalDone}/{totalItems} tâches complétées
              {stageDays !== null && ` · Stage de ${stageDays} jours`}
            </p>
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: globalPct === 100 ? 'var(--success)' : '#667eea' }}>{globalPct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--line)', borderRadius: 8 }}>
          <div style={{ height: 8, width: `${globalPct}%`, background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: 8, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* ── Phase stepper ── */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        {PHASES.map((p, i) => {
          const active  = ob.phase === p.id;
          const passed  = i < phaseIdx;
          return (
            <button key={p.id} onClick={() => handlePhase(p.id as any)}
              style={{
                flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: active ? p.color : passed ? p.bg : 'transparent',
                color: active ? '#fff' : passed ? p.color : 'var(--ink-2)',
                fontWeight: active ? 700 : 500, fontSize: 12,
                borderRight: i < PHASES.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
              {passed && !active && <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── Mentor & Checklist side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>

        {/* Mentor card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserCheck size={14} style={{ color: 'var(--primary)' }} /> Mentor assigné
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
          <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={14} style={{ color: 'var(--violet)' }} /> Objectifs du stage
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {objectives.map(obj => (
                <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={obj.done} onChange={e => handleObjToggle(obj.id, e.target.checked)}
                    style={{ accentColor: 'var(--violet)', width: 15, height: 15, cursor: 'pointer' }} />
                  <span style={{ flex: 1, fontSize: 12, textDecoration: obj.done ? 'line-through' : 'none', color: obj.done ? 'var(--ink-2)' : 'var(--fg)' }}>
                    {obj.label}
                  </span>
                  <button onClick={() => handleRemoveObj(obj.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: 0 }}>
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
        <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClipboardList size={14} style={{ color: 'var(--success)' }} /> Checklist d'intégration
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
      <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={14} style={{ color: 'var(--warn)' }} /> Évaluations Moovwin
          </p>
          {!showEvalForm && (
            <Button size="sm" variant="soft" onClick={() => setShowEvalForm(true)}>
              <Plus size={12} /> Nouvelle évaluation
            </Button>
          )}
        </div>

        {showEvalForm && (
          <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, marginBottom: 14 }}>
            <EvaluationForm internId={intern.id} onDone={() => setShowEvalForm(false)} />
          </div>
        )}

        {evals.length === 0 && !showEvalForm ? (
          <p style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'center', padding: '16px 0' }}>
            Aucune évaluation pour le moment.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evals.map(ev => {
              const avg = avgEvalScore(ev);
              const typeLabel = ev.evaluation_type === 'weekly' ? `Semaine ${ev.week_number}` : ev.evaluation_type === 'final' ? 'Évaluation finale' : 'Auto-évaluation';
              const typeColor = ev.evaluation_type === 'final' ? 'var(--success)' : ev.evaluation_type === 'self' ? 'var(--violet)' : 'var(--primary)';
              return (
                <div key={ev.id} style={{
                  padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: typeColor + '22', color: typeColor, borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 8px',
                      }}>{typeLabel}</span>
                      {ev.evaluator_name && <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>par {ev.evaluator_name}</span>}
                      <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{safeFormat(ev.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--warn)' }}>★ {avg}/5</span>
                      <button onClick={() => delEvalMut.mutate(ev.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 2 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {SCORES.map(s => (
                      <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--warn)' }}>{s.icon}</span>
                        <span style={{ color: 'var(--ink-2)' }}>{s.label}:</span>
                        <span style={{ fontWeight: 700 }}>{(ev as any)[s.key]}</span>
                      </div>
                    ))}
                  </div>
                  {ev.comment && (
                    <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '8px 0 0', fontStyle: 'italic' }}>
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
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 12 }}>
        <div style={{ position: 'relative' }}>
          <Avatar name={form.full_name || 'U'} src={form.photo_url} size={70} />
          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={12} />
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Photo de profil</p>
          <p style={{ fontSize: 11, color: 'var(--ink-2)', margin: '0 0 8px' }}>JPG/PNG, max 1MB</p>
          <Button variant="soft" size="sm" type="button" onClick={() => fileRef.current?.click()}>Changer</Button>
          <input ref={fileRef} type="file" style={{ display: 'none' }} accept="image/*" onChange={handlePhoto} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Nom complet *" value={form.full_name ?? ''} onChange={set('full_name')} required placeholder="Amine Alami" />
        <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} placeholder="amine@gmail.com" />
        <Input label="Téléphone" value={form.phone ?? ''} onChange={set('phone')} placeholder="+212 6 00 00 00 00" />
        <Input label="Mission" value={form.position ?? ''} onChange={set('position')} placeholder="DEV FULL STACK" />
        <Input label="École" value={form.school ?? ''} onChange={set('school')} placeholder="ENSA Casablanca" />
        <Input label="Étude / Diplôme" value={form.education_summary ?? ''} onChange={set('education_summary')} placeholder="Licence pro en développement informatique" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="label">Département</label>
          <select className="select" value={form.department ?? ''} onChange={set('department')}>
            <option value="">— Sélectionner —</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <Input label="Superviseur" value={form.manager ?? ''} onChange={set('manager')} placeholder="Sara RH" />
        <Input label="Début du stage" type="date" value={form.internship_start ?? ''} onChange={set('internship_start')} />
        <Input label="Fin du stage" type="date" value={form.internship_end ?? ''} onChange={set('internship_end')} />
        <Input label="Rémunération (DH)" type="number" value={form.remuneration ?? 0} onChange={set('remuneration')} placeholder="2000" />
        <Input label="Période de stage" value={form.internship_period ?? ''} onChange={set('internship_period')} placeholder="3 mois" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="label">Statut du stage</label>
          <select className="select" value={form.internship_status ?? ''} onChange={set('internship_status')}>
            <option value="">— Sélectionner —</option>
            {STAGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="label">Type de stage</label>
          <select className="select" value={form.internship_type ?? ''} onChange={set('internship_type')}>
            <option value="">— Sélectionner —</option>
            {INTERNSHIP_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <Input label="Contact du responsable (école)" value={form.school_contact ?? ''} onChange={set('school_contact')} placeholder="prof@ecole.ma" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Compétences (virgules)" value={form.skills?.join(', ') ?? ''} onChange={setArr('skills')} placeholder="React, TypeScript..." />
        <Input label="Langues (virgules)" value={(form as any).languages?.join(', ') ?? ''} onChange={e => {
          const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
          setForm(f => ({ ...f, languages: val } as any));
        }} placeholder="Français, Anglais..." />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label className="label">Observation</label>
        <textarea className="input" rows={2} style={{ resize: 'none', padding: '10px 12px' }}
          value={form.notes ?? ''} onChange={set('notes')} placeholder="Ex. stage prolongé, a décidé de partir…" />
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

/** Link to a test project / demo: short label, full address on hover. */
function ExtLink({ url }: { url?: string | null }) {
  if (!url) return <span style={{ color: 'var(--ink-3)' }}>—</span>;
  const label = url.includes('github.com') ? 'GitHub' : url.includes('drive.google') ? 'Drive'
    : url.includes('vercel') || url.includes('netlify') || url.includes('render.com') ? 'Démo' : 'Lien';
  if (!url.startsWith('http')) return <span title={url}>{url}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={url} onClick={e => e.stopPropagation()}
      style={{ color: 'var(--primary)', fontWeight: 600 }}>{label} ↗</a>
  );
}

// ── Inline select: change a value straight from the table ──────────────────────

function InlineSelect({ value, options, placeholder, badge, disabled, maxWidth = 230, onChange }: {
  value: string; options: string[]; placeholder: string; badge?: 'primary' | 'success' | 'warning' | 'danger' | 'default';
  disabled?: boolean; maxWidth?: number; onChange: (v: string) => void;
}) {
  const known = !value || options.includes(value);
  const cls = badge ? `badge ${{ primary: 'badge-primary', success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger', default: '' }[badge]}` : '';
  return (
    <select
      className={cls || undefined}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
      title={value || placeholder}
      style={{
        appearance: 'none', WebkitAppearance: 'none', fontFamily: 'inherit', cursor: disabled ? 'wait' : 'pointer',
        maxWidth, paddingRight: 22, opacity: disabled ? 0.6 : 1,
        textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='%23888' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
        ...(badge ? {} : {
          fontSize: 12, padding: '4px 22px 4px 10px', borderRadius: 999, border: `1px ${value ? 'solid' : 'dashed'} var(--line)`,
          background: value ? 'var(--surface-2)' : 'transparent', color: value ? 'var(--ink)' : 'var(--ink-3)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24'%3E%3Cpath fill='%23888' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
        }),
      }}>
      <option value="">{placeholder}</option>
      {!known && <option value={value}>{value}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function InternsPage() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [showCVImport, setShowCVImport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editing, setEditing]       = useState<Intern | null>(null);
  const [prefill, setPrefill]       = useState<Partial<Intern> | null>(null);
  const [viewingIntern, setViewingIntern] = useState<Intern | null>(null);
  const [activeTab, setActiveTab]   = useState<'info' | 'docs' | 'onboarding' | 'actions'>('info');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'kanban'>(() => {
    try {
      const v = localStorage.getItem('interns_view');
      return v === 'table' || v === 'kanban' ? v : 'cards';
    } catch { return 'cards'; }
  });
  const [stageFilter, setStageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [kanbanGroup, setKanbanGroup] = useState<'stage' | 'type' | 'period' | 'department'>(() => {
    try {
      const g = localStorage.getItem('interns_kanban_group');
      return g === 'department' || g === 'period' || g === 'type' ? g : 'stage';
    } catch { return 'stage'; }
  });
  const changeKanbanGroup = (g: 'stage' | 'type' | 'period' | 'department') => {
    setKanbanGroup(g);
    try { localStorage.setItem('interns_kanban_group', g); } catch { /* ignore */ }
  };
  const { data: kanbanDepts = [] } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const changeView = (m: 'cards' | 'table' | 'kanban') => {
    setViewMode(m);
    try { localStorage.setItem('interns_view', m); } catch { /* storage unavailable: keep in memory only */ }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['interns', search, stageFilter, typeFilter],
    queryFn: () => listInterns({ limit: 1000, ...(search && { search }), ...(stageFilter && { stage: stageFilter }), ...(typeFilter && { internship_type: typeFilter }) }),
  });

  const interns = data?.data ?? [];
  const total   = data?.count ?? 0;
  const allSelected = interns.length > 0 && selectedIds.size === interns.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < interns.length;
  const toggleOne = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(interns.map(i => i.id)));

  const { data: docsData, refetch: refetchDocs } = useQuery({
    queryKey: ['intern-docs', viewingIntern?.id],
    queryFn: () => viewingIntern?.id ? listDocuments({ employee_id: viewingIntern.id }) : Promise.resolve({ data: [], count: 0 }),
    enabled: !!viewingIntern?.id,
  });
  const internDocs = docsData?.data ?? [];

  const createMut = useMutation({
    mutationFn: createIntern,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interns'] }); setEditing(null); setPrefill(null); toast.success('Stagiaire ajouté'); },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur')),
  });

  const convertMut = useMutation({
    mutationFn: (id: string) => convertIntern(id),
    onSuccess: e => {
      ['interns', 'employees', 'dashboard-kpis', 'dashboard-metrics'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      setViewingIntern(null);
      toast.success(`${e.full_name} est maintenant employé permanent (CDI)`);
    },
    onError: (e: unknown) => toast.error(getApiError(e, 'La conversion a échoué')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Intern> }) => updateIntern(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interns'] }); setEditing(null); toast.success('Mis à jour'); },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur')),
  });

  const deleteMut = useMutation({
    mutationFn: deleteIntern,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interns'] }); toast.success('Stagiaire supprimé'); setViewingIntern(null); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  // Kanban drag & drop (department view): update instantly, roll back on error
  const moveMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Intern> }) => updateIntern(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['interns'] });
      const snapshots = qc.getQueriesData<{ data: Intern[]; count: number }>({ queryKey: ['interns'] });
      qc.setQueriesData<{ data: Intern[]; count: number }>({ queryKey: ['interns'] }, old =>
        old && Array.isArray(old.data) ? { ...old, data: old.data.map(i => (i.id === id ? { ...i, ...patch } : i)) } : old);
      return { snapshots };
    },
    onError: (e: unknown, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(getApiError(e, 'Impossible de modifier ce stagiaire'));
    },
    onSuccess: () => toast.success('Stagiaire mis à jour'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['interns'] }),
  });

  // Internship period derived from its dates (read-only grouping)
  const todayIso = new Date().toISOString().slice(0, 10);
  const periodOf = (i: Intern) => {
    const s = (i.internship_start || '').slice(0, 10);
    const e = (i.internship_end || '').slice(0, 10);
    if (!s && !e) return 'none';
    if (s && s > todayIso) return 'upcoming';
    if (e && e < todayIso) return 'done';
    return 'ongoing';
  };

  const closeModal = () => { setEditing(null); setPrefill(null); };

  const openDossier = (intern: Intern, tab: typeof activeTab = 'info') => {
    setViewingIntern(intern);
    setActiveTab(tab);
  };

  return (
    <div style={{ padding: '24px 28px', ...(viewMode === 'table' ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}) }}>
      <PageHeader
        title="Stagiaires"
        subtitle={`${total} stagiaire${total !== 1 ? 's' : ''} · ${interns.filter(i => i.internship_status === 'En cours').length} en cours`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="soft" onClick={() => setShowCVImport(true)}>
              <FileUp size={14} /> Importer CV
            </Button>
            <Button variant="soft" onClick={() => setShowImport(true)}>
              <Upload size={14} /> Importer
            </Button>
            <Button variant="soft" onClick={() => setShowExport(true)}>
              <Download size={14} /> Exporter
            </Button>
            <Button onClick={() => setEditing({} as Intern)}>
              <Plus size={14} /> Nouveau stagiaire
            </Button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }} />
          <input className="input" style={{ paddingLeft: 36 }}
            placeholder="Rechercher par nom..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 170, flexShrink: 0 }} value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          title="Filtrer par statut du stage">
          <option value="">Tous les statuts</option>
          {STAGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="select" style={{ width: 190, flexShrink: 0 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          title="Filtrer par type de stage">
          <option value="">Tous les types de stage</option>
          {INTERNSHIP_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div role="group" aria-label="Mode d'affichage"
          style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          {([['cards', 'Cartes', <LayoutGrid size={14} key="g" />], ['table', 'Tableau', <List size={14} key="l" />], ['kanban', 'Kanban', <Columns3 size={14} key="k" />]] as const).map(([m, label, icon]) => (
            <button key={m} onClick={() => changeView(m)} aria-pressed={viewMode === m} title={`Affichage ${label.toLowerCase()}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: viewMode === m ? 'var(--primary-soft)' : 'var(--surface)',
                color: viewMode === m ? 'var(--primary)' : 'var(--ink-2)',
              }}>
              {icon} {label}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowDeptManager(true)}
          style={{ padding: '0 12px', fontSize: 11, color: 'var(--ink-2)', whiteSpace: 'nowrap', border: '1px solid var(--line)', borderRadius: 8 }}>
          ⚙ Gérer les départements
        </button>
      </div>

      {/* Selection bar (cards view always; table view only once something is selected) */}
      {(viewMode === 'cards' || selectedIds.size > 0) && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ink-2)' }}>
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = someSelected; }}
            onChange={toggleAll}
            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
          Sélectionner tout
        </label>
        {selectedIds.size > 0 && (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => {
                if (confirm(`Supprimer ${selectedIds.size} stagiaire(s) ?`)) {
                  selectedIds.forEach(id => deleteMut.mutate(id));
                  setSelectedIds(new Set());
                }
              }}
            >
              <Trash2 size={13} /> Supprimer
            </button>
            <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setSelectedIds(new Set())}>
              <X size={13} /> Désélectionner
            </button>
          </>
        )}
      </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : interns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-2)' }}>
          <GraduationCap size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontWeight: 500, marginBottom: 8 }}>Aucun stagiaire</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Ajoutez un stagiaire manuellement ou importez un CV.</p>
          <Button onClick={() => setEditing({} as Intern)}><Plus size={14} /> Ajouter</Button>
        </div>
      ) : viewMode === 'kanban' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>Grouper par</span>
            <button onClick={() => changeKanbanGroup('stage')} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 8, border: `1px solid ${kanbanGroup === 'stage' ? 'var(--primary)' : 'var(--line)'}`, background: kanbanGroup === 'stage' ? 'var(--primary-soft)' : 'var(--surface)', color: kanbanGroup === 'stage' ? 'var(--primary)' : 'var(--ink-2)' }}>Statut du stage</button>
            <button onClick={() => changeKanbanGroup('type')} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 8, border: `1px solid ${kanbanGroup === 'type' ? 'var(--primary)' : 'var(--line)'}`, background: kanbanGroup === 'type' ? 'var(--primary-soft)' : 'var(--surface)', color: kanbanGroup === 'type' ? 'var(--primary)' : 'var(--ink-2)' }}>Type de stage</button>
            <button onClick={() => changeKanbanGroup('period')} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 8, border: `1px solid ${kanbanGroup === 'period' ? 'var(--primary)' : 'var(--line)'}`, background: kanbanGroup === 'period' ? 'var(--primary-soft)' : 'var(--surface)', color: kanbanGroup === 'period' ? 'var(--primary)' : 'var(--ink-2)' }}>Période de stage</button>
            <button onClick={() => changeKanbanGroup('department')} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 8, border: `1px solid ${kanbanGroup === 'department' ? 'var(--primary)' : 'var(--line)'}`, background: kanbanGroup === 'department' ? 'var(--primary-soft)' : 'var(--surface)', color: kanbanGroup === 'department' ? 'var(--primary)' : 'var(--ink-2)' }}>Département</button>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {kanbanGroup === 'period'
                ? '· Lecture seule : la période découle des dates du stage.'
                : `· Glissez une carte dans une autre colonne pour modifier ${kanbanGroup === 'stage' ? 'son statut' : kanbanGroup === 'type' ? 'son type de stage' : 'son département'}.`}
            </span>
          </div>
          <KanbanBoard
            items={interns}
            getId={i => i.id}
            columns={kanbanGroup === 'type'
              ? [...INTERNSHIP_TYPES.map((o, i) => ({ id: o, label: o, color: TYPE_COLORS[i % TYPE_COLORS.length] })), { id: '', label: 'Non renseigné', color: 'var(--ink-3)' }]
              : kanbanGroup === 'stage'
              ? [...STAGE_OPTIONS.map(o => ({ id: o, label: o, color: stageColor(o) })), { id: '', label: 'Non renseigné', color: 'var(--ink-3)' }]
              : kanbanGroup === 'period'
              ? [
                  { id: 'ongoing', label: 'En cours', color: 'var(--success)' },
                  { id: 'upcoming', label: 'À venir', color: 'var(--primary)' },
                  { id: 'done', label: 'Terminés', color: 'var(--ink-3)' },
                  { id: 'none', label: 'Dates non renseignées', color: 'var(--warn)' },
                ]
              : [...kanbanDepts.map(d => ({ id: d.name, label: d.name })), { id: '', label: 'Sans département', color: 'var(--ink-3)' }]}
            getColumn={i => (kanbanGroup === 'stage' ? (i.internship_status || '') : kanbanGroup === 'type' ? (i.internship_type || '') : kanbanGroup === 'period' ? periodOf(i) : i.department || '')}
            onMove={kanbanGroup === 'period' ? undefined : (intern, col) => moveMut.mutate({
              id: intern.id, patch: kanbanGroup === 'stage' ? { internship_status: col } : kanbanGroup === 'type' ? { internship_type: col } : { department: col },
            })}
            onOpen={intern => openDossier(intern)}
            renderCard={intern => (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar name={intern.full_name} src={intern.photo_url} size={34} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 13 }}>{intern.full_name}</p>
                    <p style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>{intern.position || 'Stagiaire'}</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" title="Modifier" onClick={e => { e.stopPropagation(); setEditing(intern); }}><Pencil size={12} /></button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {kanbanGroup !== 'stage' && intern.internship_status && <Badge variant={stageVariant(intern.internship_status)}>{intern.internship_status}</Badge>}
                  {kanbanGroup !== 'department' && intern.department && <Badge variant="default">{intern.department}</Badge>}
                  {kanbanGroup !== 'type' && intern.internship_type && <Badge variant="violet">{intern.internship_type}</Badge>}
                </div>
                {(intern.internship_start || intern.internship_end) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--ink-2)' }}>
                    <Calendar size={11} /> {safeFormat(intern.internship_start)} → {safeFormat(intern.internship_end)}
                    {intern.internship_period && <span style={{ color: 'var(--ink-3)' }}>· {intern.internship_period}</span>}
                  </div>
                )}
                {intern.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Mail size={11} /> {intern.email}
                  </div>
                )}
              </>
            )}
          />
        </>
      ) : viewMode === 'table' ? (
        <div className="card" style={{ overflow: 'hidden', flex: 1, minHeight: 240, display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', minWidth: 40, width: 40, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, left: 0, zIndex: 3 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      title={allSelected ? 'Désélectionner tout' : 'Sélectionner tout'}
                    />
                  </th>
                  {['Nom et prénom', 'Type de stage', 'Statut stage', 'Mission', 'Département', 'Étude', 'École', 'Email', 'Téléphone', 'Date de début', 'Date de fin', 'Période de stage', 'Contact responsable', 'Observation', 'Code source', 'Demo', 'CV', 'Note RH', 'Note test', ''].map(h => (
                    <th key={h} style={{ ...{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-3)', fontSize: 11, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.06em', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1 }, ...(h === 'Nom et prénom' ? { left: 40, zIndex: 3, minWidth: 190 } : {}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {interns.map(intern => {
                  const rowBg = selectedIds.has(intern.id) ? 'var(--primary-soft)' : 'var(--surface)';
                  const busy = moveMut.isPending && moveMut.variables?.id === intern.id;
                  return (
                  <tr key={intern.id}
                    style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer', background: rowBg }}
                    onClick={() => openDossier(intern)}
                    onMouseEnter={e => { if (!selectedIds.has(intern.id)) e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { if (!selectedIds.has(intern.id)) e.currentTarget.style.background = 'var(--surface)'; }}>
                    <td style={{ padding: '9px 14px', position: 'sticky', left: 0, zIndex: 1, background: 'inherit' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(intern.id)}
                        onChange={() => toggleOne(intern.id)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </td>
                    <td style={{ padding: '9px 14px', whiteSpace: 'nowrap', position: 'sticky', left: 40, zIndex: 1, background: 'inherit', boxShadow: '1px 0 0 var(--line)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Avatar name={intern.full_name} src={intern.photo_url} size={28} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{intern.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <InlineSelect value={intern.internship_type || ''} options={INTERNSHIP_TYPES} placeholder="— Choisir —" disabled={busy}
                        onChange={v => moveMut.mutate({ id: intern.id, patch: { internship_type: (v || null) as unknown as string } })} />
                    </td>
                    <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <InlineSelect value={intern.internship_status || ''} options={STAGE_OPTIONS} placeholder="— Statut —" disabled={busy}
                        badge={intern.internship_status ? stageVariant(intern.internship_status) : undefined} maxWidth={150}
                        onChange={v => moveMut.mutate({ id: intern.id, patch: { internship_status: (v || null) as unknown as string } })} />
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12.5, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--primary)', fontWeight: 500 }} title={intern.position || ''}>{intern.position || '—'}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12.5, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink-2)' }} title={intern.department || ''}>{intern.department || '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 12.5, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={intern.education_summary || ''}>{intern.education_summary || '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 12.5, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={intern.school || ''}>{intern.school || '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 12.5, maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={intern.email || ''}>{intern.email || '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{intern.phone || '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{intern.internship_start ? safeFormat(intern.internship_start) : '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{intern.internship_end ? safeFormat(intern.internship_end) : '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{intern.internship_period || '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 12.5, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={intern.school_contact || ''}>{intern.school_contact || '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--ink-2)', fontSize: 12.5, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={intern.notes || ''}>{intern.notes || '—'}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12.5, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}><ExtLink url={intern.test_code_source} /></td>
                    <td style={{ padding: '9px 14px', fontSize: 12.5, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}><ExtLink url={intern.test_demo_link} /></td>
                    <td style={{ padding: '9px 14px', fontSize: 12.5, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}><ExtLink url={intern.test_cv} /></td>
                    <td style={{ padding: '9px 14px', fontSize: 12.5, color: 'var(--ink-2)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={intern.test_note_rh || ''}>{intern.test_note_rh || '—'}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12.5, color: 'var(--ink-2)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={intern.test_note_test || ''}>{intern.test_note_test || '—'}</td>
                    <td style={{ padding: '9px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" title="Onboarding" onClick={() => openDossier(intern, 'onboarding')}>
                          <ClipboardList size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Dossier" onClick={() => openDossier(intern)}>
                          <Eye size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => setEditing(intern)}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Supprimer" style={{ color: 'var(--danger)' }}
                          onClick={() => { if (confirm('Supprimer ce stagiaire ?')) deleteMut.mutate(intern.id); }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {interns.map(intern => (
            <div key={intern.id} className="card card-pad hover-scale"
              style={{ cursor: 'pointer', transition: 'all 0.2s', outline: selectedIds.has(intern.id) ? '2px solid var(--primary)' : 'none' }}
              onClick={() => openDossier(intern)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(intern.id)}
                    onChange={() => toggleOne(intern.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }}
                  />
                  <Avatar name={intern.full_name} src={intern.photo_url} size={44} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{intern.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>{intern.position || 'Stagiaire'}</p>
                    {intern.department && <span style={{ marginTop: 2 }}><Badge variant="default">{intern.department}</Badge></span>}
                    {intern.internship_status && <span style={{ marginTop: 2, marginLeft: intern.department ? 6 : 0 }}><Badge variant={stageVariant(intern.internship_status)}>{intern.internship_status}</Badge></span>}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, color: 'var(--ink-2)' }}>
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
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: 16, background: 'var(--surface-2)', borderRadius: 12 }}>
              <Avatar name={viewingIntern.full_name} src={viewingIntern.photo_url} size={72} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{viewingIntern.full_name}</h3>
                <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, margin: '2px 0' }}>{viewingIntern.position || 'Stagiaire'}</p>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--ink-2)' }}>
                  {viewingIntern.email && <span><Mail size={11} /> {viewingIntern.email}</span>}
                  {viewingIntern.phone && <span><Phone size={11} /> {viewingIntern.phone}</span>}
                </div>
              </div>
              <Badge variant={viewingIntern.status === 'intern' ? 'primary' : 'success'}>
                {viewingIntern.status === 'intern' ? 'En stage' : 'Embauché'}
              </Badge>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', gap: 20 }}>
              {[
                { id: 'info',       label: 'Profil',      icon: <User size={13} /> },
                { id: 'onboarding', label: 'Onboarding',  icon: <ClipboardList size={13} /> },
                { id: 'docs',       label: 'Documents',   icon: <FileText size={13} /> },
                { id: 'actions',    label: 'Admin',       icon: <Settings size={13} /> },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
                  padding: '10px 4px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                  borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === t.id ? 'var(--primary)' : 'var(--ink-2)',
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
                    <div className="card card-pad" style={{ background: 'var(--surface)' }}>
                      <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Bio</p>
                      <p style={{ fontSize: 14, lineHeight: 1.6 }}>{viewingIntern.bio || 'Non renseigné'}</p>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--surface)' }}>
                      <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Compétences</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {viewingIntern.skills?.length ? viewingIntern.skills.map((s, i) => <Badge key={i} variant="primary">{s}</Badge>) : <span style={{ fontSize: 13 }}>—</span>}
                      </div>
                    </div>
                  </div>
                  <div className="card card-pad" style={{ background: 'var(--surface)' }}>
                    <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Détails Stage</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                      {[
                        ['Statut du stage', viewingIntern.internship_status || '—'],
                        ['Type de stage', viewingIntern.internship_type || '—'],
                        ['Mission', viewingIntern.position || '—'],
                        ['Étude', viewingIntern.education_summary || '—'],
                        ['École', viewingIntern.school || '—'],
                        ['Téléphone', viewingIntern.phone || '—'],
                        ['Début', safeFormat(viewingIntern.internship_start)],
                        ['Fin', safeFormat(viewingIntern.internship_end)],
                        ['Période', viewingIntern.internship_period || '—'],
                        ['Contact responsable', viewingIntern.school_contact || '—'],
                        ['Observation', viewingIntern.notes || '—'],
                        ...(viewingIntern.test_code_source ? [['Code source (test)', viewingIntern.test_code_source]] : []),
                        ...(viewingIntern.test_demo_link ? [['Démo (test)', viewingIntern.test_demo_link]] : []),
                        ...(viewingIntern.test_note_rh ? [['Note RH', viewingIntern.test_note_rh]] : []),
                        ...(viewingIntern.test_note_test ? [['Note test', viewingIntern.test_note_test]] : []),
                        ['Superviseur', viewingIntern.manager || '—'],
                        ['Rémunération', `${(viewingIntern as any).remuneration || 0} DH`],
                        ['Département', viewingIntern.department || '—'],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--ink-2)' }}>{label}</span>
                          <span style={{ fontWeight: 600, maxWidth: '62%', textAlign: 'right', wordBreak: 'break-word' }}>{val}</span>
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
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase' }}>Fichiers enregistrés</p>
                      {internDocs.map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={15} style={{ color: 'var(--primary)' }} />
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600 }}>{d.document_type?.toUpperCase()} — {d.name || 'Document'}</p>
                              <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{safeFormat(d.created_at)}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {(!d.signature_status || d.signature_status === 'pending') && (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--primary)' }}
                                onClick={async () => {
                                  try {
                                    const res = await sendForSignature(d.id);
                                    toast.success("Demande de signature envoyée");
                                    const link = `${window.location.origin}/sign/${res.token}`;
                                    navigator.clipboard.writeText(link);
                                    toast.info(`Lien copié: ${link}`);
                                    refetchDocs();
                                  } catch (e: any) { toast.error(getApiError(e, "Erreur")); }
                                }}
                              >
                                {d.signature_status === 'pending' ? 'Renvoyer' : 'Signer'}
                              </button>
                            )}
                            {d.signature_status === 'signed' && (
                              <Badge variant="success" style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28 }}><CheckCircle2 size={10} /> Signé</Badge>
                            )}
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
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: 10 }}>Scanner un document</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Copie CIN', type: 'cin' },
                        { label: 'Convention de stage', type: 'convention' },
                        { label: 'Charte IT / NDA', type: 'nda' },
                        { label: 'Attestation de stage', type: 'completion' },
                      ].map(doc => (
                        <div key={doc.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10 }}>
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
                  <div style={{ padding: 16, border: '1px solid var(--line)', borderRadius: 12 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Conversion en employé permanent</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 14 }}>
                      Transfert vers la liste des employés actifs avec contrat CDI.
                    </p>
                    <Button variant="primary" loading={convertMut.isPending} disabled={viewingIntern.status === 'active'}
                      onClick={() => { if (confirm(`Convertir ${viewingIntern.full_name} en employé permanent ?`)) convertMut.mutate(viewingIntern.id); }}>
                      <CheckCircle2 size={14} /> Confirmer l'embauche
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

      {/* Smart import modal */}
      <SmartImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        cols={INTERN_COLS}
        entityName="Stagiaires"
        targetType="intern"
        onImported={() => qc.invalidateQueries({ queryKey: ['interns'] })}
      />

      {/* Export modal */}
      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        cols={INTERN_COLS}
        rows={interns as unknown as Record<string, unknown>[]}
        entityName="Stagiaires"
      />

      <DepartmentsModal open={showDeptManager} onClose={() => setShowDeptManager(false)} />
    </div>
  );
}
