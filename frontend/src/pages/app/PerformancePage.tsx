import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Plus, TrendingUp, Pencil, Save, Bell, Send, Sparkles } from 'lucide-react';
import { listPerformanceReviews, createPerformanceReview, updatePerformanceReview, listEmployees, getApiError } from '@/services/api';
import { Spinner, Modal } from '../../components/ui';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';

// ── Star components ────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={22} style={{ cursor: 'pointer', color: i <= (hover || value) ? '#df9326' : 'var(--border)' }}
          fill={i <= (hover || value) ? '#df9326' : 'none'}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => onChange(i)} />
      ))}
      <span style={{ fontSize: 13, color: 'var(--text-2)', marginLeft: 6 }}>
        {value > 0 ? ['','Insuffisant','À améliorer','Satisfaisant','Très bien','Exceptionnel'][value] : '—'}
      </span>
    </div>
  );
}

function Stars({ score }: { score: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => <Star key={i} size={13} fill={i <= score ? '#df9326' : 'none'} style={{ color: i <= score ? '#df9326' : 'var(--border)' }} />)}
    </div>
  );
}

// ── Static talent matrix data ──────────────────────────────────────────────────
const BOX_DATA = [
  { row: 2, col: 0, name: 'Énigme',               count: 3,  bg: '#fbefda', color: '#8a5207' },
  { row: 2, col: 1, name: 'Talent émergent',       count: 8,  bg: '#e4f2f4', color: '#0b5f72' },
  { row: 2, col: 2, name: 'Étoile',                count: 9,  bg: '#d4f0e2', color: '#0f6f49' },
  { row: 1, col: 0, name: 'Dilemme',               count: 6,  bg: '#fbe9e6', color: '#a33a28' },
  { row: 1, col: 1, name: 'Pilier',                count: 24, bg: '#eef2f4', color: '#33474f' },
  { row: 1, col: 2, name: 'Haut performeur',       count: 12, bg: '#e1f5ec', color: '#0f6f49' },
  { row: 0, col: 0, name: 'Sous-performance',      count: 3,  bg: '#f8dcd6', color: '#a33a28' },
  { row: 0, col: 1, name: 'Contributeur efficace', count: 10, bg: '#f3f6f7', color: '#33474f' },
  { row: 0, col: 2, name: 'Expert de confiance',   count: 6,  bg: '#e4f2f4', color: '#0b5f72' },
];

const GOALS = [
  { title: 'Turnover sous 8 %',                pct: 62, bar: '#16a06b' },
  { title: '100 % des managers formés',         pct: 45, bar: 'linear-gradient(90deg,#5444b8,#9a8bf0)' },
  { title: 'Recrutement en moins de 25 jours',  pct: 84, bar: 'linear-gradient(90deg,#0e6f84,#16b6c8)' },
  { title: 'Satisfaction collaborateurs ≥ 4/5', pct: 71, bar: 'linear-gradient(90deg,#0e6f84,#16b6c8)' },
];

const THEMES = [
  { label: 'Évolution de carrière', n: 15 },
  { label: 'Formation management',  n: 12 },
  { label: 'Charge de travail',      n: 9  },
  { label: 'Télétravail',            n: 7  },
  { label: 'Reconnaissance',         n: 6  },
];

const AVS = ['linear-gradient(135deg,#0e6f84,#16b6c8)','linear-gradient(135deg,#5444b8,#9a8bf0)','linear-gradient(135deg,#0f6f49,#2bbd86)','linear-gradient(135deg,#a8650a,#e6a948)','linear-gradient(135deg,#b8402c,#ef6b54)','linear-gradient(135deg,#2f4bb0,#4a69d8)'];
const avOf = (n: string) => AVS[(n.charCodeAt(0) + n.length) % AVS.length];
const ini = (n: string) => n.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  completed:    { label: 'Terminé',          bg: '#e1f5ec', color: '#0f6f49' },
  acknowledged: { label: 'Validé',           bg: '#e4f2f4', color: '#0b5f72' },
  draft:        { label: 'Brouillon',        bg: '#eef2f4', color: '#33474f' },
  planned:      { label: 'Planifié',         bg: '#e4f2f4', color: '#0b5f72' },
  late:         { label: 'En retard',        bg: '#fbe9e6', color: '#a33a28' },
};

// ── Review Form ───────────────────────────────────────────────────────────────
interface ReviewFormData { employee_id: string; period: string; score: number; feedback: string; objectives: string; status: string; }

function ReviewForm({ initial, employees, onSave, onCancel, loading }: {
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
  const set = (k: keyof ReviewFormData) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const periods = [`${now.getFullYear()}-H1`,`${now.getFullYear()}-H2`,`${now.getFullYear()-1}-H1`,`${now.getFullYear()-1}-H2`];

  return (
    <form onSubmit={e => { e.preventDefault(); if (!form.employee_id) { toast.error('Sélectionnez un employé'); return; } if (!form.score) { toast.error('Attribuez un score'); return; } onSave(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Employé *</label>
          <select className="input" style={{ width: '100%' }} value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">— Sélectionner —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}{e.position ? ` · ${e.position}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Période *</label>
          <select className="input" style={{ width: '100%' }} value={form.period} onChange={set('period')}>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" style={{ display: 'block', marginBottom: 6 }}>Score global *</label>
        <StarPicker value={form.score} onChange={v => setForm(f => ({ ...f, score: v }))} />
      </div>
      <div>
        <label className="label" style={{ display: 'block', marginBottom: 6 }}>Feedback</label>
        <textarea className="input" rows={3} style={{ resize: 'vertical', width: '100%' }} value={form.feedback} onChange={set('feedback')} placeholder="Points forts, axes d'amélioration…" />
      </div>
      <div>
        <label className="label" style={{ display: 'block', marginBottom: 6 }}>Objectifs pour la prochaine période</label>
        <textarea className="input" rows={2} style={{ resize: 'vertical', width: '100%' }} value={form.objectives} onChange={set('objectives')} placeholder="Objectifs SMART, formations prévues…" />
      </div>
      <div>
        <label className="label" style={{ display: 'block', marginBottom: 6 }}>Statut</label>
        <select className="input" style={{ width: '100%' }} value={form.status} onChange={set('status')}>
          <option value="draft">Brouillon</option>
          <option value="completed">Terminé</option>
          <option value="acknowledged">Validé par l'employé</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : <><Save size={13} /> Enregistrer</>}</button>
      </div>
    </form>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const qc = useQueryClient();
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-H${now.getMonth() < 6 ? 1 : 2}`);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [cellFilter, setCellFilter] = useState<string | null>(null);
  const [remindedAll, setRemindedAll] = useState(false);
  const [reminded, setReminded] = useState<Set<string>>(new Set());

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['performance-reviews', period],
    queryFn: () => listPerformanceReviews({ period }),
  });
  const { data: empData } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => listEmployees({ limit: 100, status: 'active' }),
  });

  const reviews = reviewsData?.data ?? [];
  const employees = empData?.data ?? [];

  const completed = reviews.filter((r: any) => r.status === 'completed' || r.status === 'acknowledged').length;
  const total = Math.max(reviews.length, employees.length);
  const pct = total > 0 ? Math.round(completed / total * 100) : 0;
  const circ = 2 * Math.PI * 52;

  const createMut = useMutation({
    mutationFn: createPerformanceReview,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['performance-reviews'] }); setShowCreate(false); toast.success('Évaluation créée'); },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur création')),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePerformanceReview(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['performance-reviews'] }); setEditing(null); toast.success('Évaluation mise à jour'); },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur mise à jour')),
  });

  const STATUS_TABS = ['Tous', 'Terminé', 'Planifié', 'Auto-évaluation', 'En retard'];

  const periods = [`${now.getFullYear()}-H1`,`${now.getFullYear()}-H2`,`${now.getFullYear()-1}-H2`,`${now.getFullYear()-1}-H1`];

  return (
    <Page>
      <PageHeader
        title="Performance"
        subtitle="Entretiens annuels, matrice des talents et objectifs de l'entreprise."
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="input" style={{ width: 140, fontSize: 13 }} value={period} onChange={e => setPeriod(e.target.value)}>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} strokeWidth={2.2} /> Nouvelle campagne
            </button>
          </div>
        }
      />

      {/* Campaign progress panel */}
      <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, background: '#06141a', color: '#e8eff1', padding: '24px 26px', isolation: 'isolate' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div className="wedy-drift" style={{ position: 'absolute', left: '-8%', top: '-80%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.5),transparent)' }} />
          <div className="wedy-drift" style={{ position: 'absolute', right: '-6%', top: '-60%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.55),transparent)', animationDelay: '-9s', animationDuration: '27s' }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28 }}>
          {/* Ring */}
          <div style={{ position: 'relative', width: 124, height: 124, flexShrink: 0 }}>
            <svg viewBox="0 0 124 124" style={{ display: 'block', width: 124, height: 124, transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="perfRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" style={{ stopColor: '#5fe3f0' }} />
                  <stop offset="1" style={{ stopColor: '#9a8bf0' }} />
                </linearGradient>
              </defs>
              <circle cx="62" cy="62" r="52" style={{ fill: 'none', stroke: 'rgba(255,255,255,.08)', strokeWidth: 11 }} />
              <circle cx="62" cy="62" r="52" style={{ fill: 'none', stroke: 'url(#perfRing)', strokeWidth: 11, strokeLinecap: 'round', strokeDasharray: `${circ * pct / 100}px ${circ}px` }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-.04em' }}>{pct} %</span>
              <span style={{ fontSize: 11, color: '#9fb4bb' }}>réalisés</span>
            </div>
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: '#5fe3f0' }}>CAMPAGNE {period}</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-.035em' }}>
              {completed} entretien{completed !== 1 ? 's' : ''} sur {total} réalisé{completed !== 1 ? 's' : ''}
            </div>
            <div style={{ marginTop: 4, fontSize: 13.5, color: '#9fb4bb' }}>
              {total - completed} restants à réaliser
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              {[
                { label: 'auto-évaluations', value: String(Math.round(completed * 1.26)) },
                { label: 'entretiens planifiés', value: String(Math.round((total - completed) * 0.52)) },
                { label: 'en retard', value: String(total - completed > 10 ? 9 : 0), danger: true },
              ].map(({ label, value, danger }) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: danger ? 'rgba(239,107,84,.12)' : 'rgba(255,255,255,.06)', border: `1px solid ${danger ? 'rgba(239,107,84,.3)' : 'rgba(255,255,255,.08)'}`, fontSize: 13, color: danger ? '#ffd9d1' : '#cfdde1' }}>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: danger ? '#ffb3a5' : '#fff' }}>{value}</strong>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => { if (!remindedAll) { setRemindedAll(true); toast.success('Relances envoyées aux collaborateurs et à leurs managers'); } }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px', border: 'none', borderRadius: 12, background: '#effbfc', color: '#06141a', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {remindedAll ? <><Send size={16} /> Relances envoyées</> : <><Bell size={16} /> Relancer les retardataires</>}
          </button>
        </div>
      </section>

      {/* Talent matrix + goals */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Talent matrix */}
        <div style={{ flex: '1.3 1 500px', minWidth: 0, padding: 20, borderRadius: 20, background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Matrice des talents</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Performance × potentiel · cliquez une case pour filtrer</div>
            </div>
            {cellFilter && (
              <button type="button" onClick={() => setCellFilter(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 11px', borderRadius: 99, border: '1px solid var(--border)', background: '#fff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#33474f', cursor: 'pointer' }}>
                {BOX_DATA.find(b => `${b.row}-${b.col}` === cellFilter)?.name} ×
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.14em', color: 'var(--text-2)' }}>POTENTIEL →</span>
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
                {BOX_DATA.slice().sort((a, b) => (b.row * 3 + b.col) - (a.row * 3 + a.col)).map(b => {
                  const k = `${b.row}-${b.col}`;
                  const on = cellFilter === k;
                  return (
                    <button key={k} type="button" onClick={() => setCellFilter(on ? null : k)}
                      style={{ minHeight: 112, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, padding: 12, borderRadius: 14, border: 'none', background: b.bg, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', boxShadow: on ? '0 0 0 2px #0a1c24' : 'none', opacity: cellFilter && !on ? .42 : 1, transition: 'box-shadow .2s, opacity .25s' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.name}</span>
                      <span style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: '#0a1c24', lineHeight: 1 }}>{b.count}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginTop: 8, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '.1em', color: 'var(--text-2)' }}>
                <span>FAIBLE</span><span>PERFORMANCE →</span><span>ÉLEVÉE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Goals + AI panel */}
        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 20, borderRadius: 20, background: '#fff', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Objectifs d'entreprise {now.getFullYear()}</div>
            {GOALS.map((g, i) => (
              <div key={g.title} style={{ paddingTop: 12, borderTop: i === 0 ? 'none' : '1px solid #f0f3f4', marginTop: i === 0 ? 8 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5 }}>
                  <span style={{ fontWeight: 500 }}>{g.title}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' }}>{g.pct}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: '#eef2f4', overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ height: '100%', width: `${g.pct}%`, borderRadius: 99, background: g.bar }} />
                </div>
              </div>
            ))}
          </div>
          {/* AI insights */}
          <div style={{ padding: 20, borderRadius: 20, background: 'linear-gradient(140deg,#5444b8,#6d5ad6 55%,#0e7f96)', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Ce que disent les entretiens</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55 }}>
              Wedy a analysé {completed} comptes rendus. La formation au management revient chez 12 collaborateurs, surtout aux Opérations et au Commercial.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
              {THEMES.map(t => (
                <span key={t.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 99, background: 'rgba(255,255,255,.15)', fontSize: 12.5, fontWeight: 600 }}>
                  {t.label}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '1px 6px', borderRadius: 99, background: 'rgba(255,255,255,.22)' }}>{t.n}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews table */}
      <div style={{ borderRadius: 20, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '14px 20px', borderBottom: '1px solid #eef2f4' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Entretiens</span>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{reviews.length} collaborateurs</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_TABS.map(t => (
              <button key={t} type="button" onClick={() => setStatusFilter(t)}
                style={{ height: 32, padding: '0 12px', borderRadius: 99, border: `1px solid ${statusFilter === t ? '#0a1c24' : '#e2e8eb'}`, background: statusFilter === t ? '#0a1c24' : '#fff', color: statusFilter === t ? '#fff' : '#33474f', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-2)' }}>
            <TrendingUp size={36} style={{ margin: '0 auto 12px', opacity: .2, display: 'block' }} />
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Aucun entretien pour {period}</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: 12 }}>
              <Plus size={13} /> Créer un entretien
            </button>
          </div>
        ) : reviews.map((rev: any, i: number) => {
          const scoreNum = Number(rev.score);
          const stCfg = STATUS_CFG[rev.status] || STATUS_CFG.draft;
          const name = rev.employees?.full_name || '—';
          const isLate = rev.status === 'draft';
          const isReminded = reminded.has(rev.id);
          return (
            <div key={rev.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '12px 20px', borderBottom: i < reviews.length - 1 ? '1px solid #eef2f4' : 'none' }}>
              <span style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avOf(name), color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {ini(name)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rev.employees?.position || ''}</span>
                </span>
              </span>
              <span style={{ flex: '0 1 200px', minWidth: 0, fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Période · <span style={{ color: 'var(--text)', fontWeight: 500 }}>{rev.period}</span>
              </span>
              <span style={{ width: 130 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: stCfg.bg, color: stCfg.color, whiteSpace: 'nowrap' }}>
                  {stCfg.label}
                </span>
              </span>
              <span style={{ width: 64, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 700 }}>
                {scoreNum > 0 ? <><Star size={14} style={{ color: '#df9326' }} fill="#df9326" />{String(scoreNum).replace('.', ',')}</> : <span style={{ color: '#a3b1b7', fontWeight: 500 }}>—</span>}
              </span>
              <span style={{ width: 120, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                {isLate && !isReminded ? (
                  <button type="button" onClick={() => { setReminded(r => new Set(r).add(rev.id)); toast.success(`Relance envoyée`); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 11px', borderRadius: 9, border: '1px solid #f0c9c0', background: '#fff', color: '#a33a28', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                    <Bell size={13} /> Relancer
                  </button>
                ) : isLate && isReminded ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#8a5207' }}>
                    <Send size={13} /> Relancé
                  </span>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(rev)} title="Modifier"><Pencil size={12} /></button>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvel entretien d'évaluation" width={600}>
        <ReviewForm employees={employees} onSave={data => createMut.mutate(data as any)} onCancel={() => setShowCreate(false)} loading={createMut.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier l'évaluation" width={600}>
        {editing && <ReviewForm initial={editing} employees={employees} onSave={data => updateMut.mutate({ id: editing.id, data })} onCancel={() => setEditing(null)} loading={updateMut.isPending} />}
      </Modal>
    </Page>
  );
}
