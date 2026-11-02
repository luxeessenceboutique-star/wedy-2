import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileCheck, Bell, Send, Sparkles, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { Avatar, Badge, Modal, Spinner } from '../../components/ui';
import { listLeaves, createLeave, reviewLeave, updateLeave, deleteLeave, listEmployees, getApiError, type LeaveRequest } from '@/services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmt = (s?: string) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const dayCount = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);

const ABSENCE_TYPES: Record<string, { label: string; tint: string; color: string }> = {
  sick:        { label: 'Maladie',              tint: '#fbe9e6', color: '#a33a28' },
  unjustified: { label: 'Non justifiée',        tint: '#fbefda', color: '#8a5207' },
  accident:    { label: 'Accident du travail',  tint: '#ece9fb', color: '#5444b8' },
};

const DEPT_DATA = [
  { name: 'Opérations',  v: '6,2 %', w: 82, bar: '#df5740' },
  { name: 'Commercial',  v: '4,1 %', w: 54, bar: '#df9326' },
  { name: 'Tech',        v: '3,4 %', w: 45, bar: 'linear-gradient(90deg,#0e6f84,#16b6c8)' },
  { name: 'RH',          v: '2,8 %', w: 37, bar: 'linear-gradient(90deg,#0e6f84,#16b6c8)' },
  { name: 'Finance',     v: '1,5 %', w: 20, bar: 'linear-gradient(90deg,#0e6f84,#16b6c8)' },
];

const AVS = ['linear-gradient(135deg,#0e6f84,#16b6c8)', 'linear-gradient(135deg,#5444b8,#9a8bf0)', 'linear-gradient(135deg,#0f6f49,#2bbd86)', 'linear-gradient(135deg,#a8650a,#e6a948)', 'linear-gradient(135deg,#b8402c,#ef6b54)', 'linear-gradient(135deg,#2f4bb0,#4a69d8)'];
const avOf = (n: string) => AVS[(n.charCodeAt(0) + n.length) % AVS.length];
const ini = (n: string) => n.split(/[\s.@]/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

// ── Declare Modal ─────────────────────────────────────────────────────────────
function DeclareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const today = iso(new Date());
  const { data: emps } = useQuery({ queryKey: ['employees', 'absence-form'], queryFn: () => listEmployees({ limit: 200 }), enabled: open });
  const [form, setForm] = useState({ employee_id: '', type: 'sick', start_date: today, end_date: today, reason: '' });
  React.useEffect(() => { if (open) setForm(f => ({ ...f, start_date: today, end_date: today })); }, [open]);

  const mut = useMutation({
    mutationFn: async () => {
      const days = dayCount(form.start_date, form.end_date);
      const leave = await createLeave({ ...form, days });
      return reviewLeave(leave.id, 'approved');
    },
    onSuccess: () => {
      ['absences-all', 'leaves', 'leaves-all', 'dashboard-kpis'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      toast.success('Absence enregistrée');
      onClose();
    },
    onError: (e: unknown) => toast.error(getApiError(e, "Impossible d'enregistrer l'absence")),
  });

  const valid = form.employee_id && form.start_date && form.end_date >= form.start_date;
  return (
    <Modal open={open} onClose={onClose} title="Déclarer une absence" width={480}>
      <form onSubmit={e => { e.preventDefault(); if (valid) mut.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label className="label">Employé *</label>
        <select className="input" style={{ width: '100%' }} value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} required>
          <option value="">— Sélectionner —</option>
          {(emps?.data ?? []).map((e: any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <label className="label">Type</label>
        <select className="input" style={{ width: '100%' }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {Object.entries(ABSENCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Du</label>
            <input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={{ width: '100%' }} />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Au</label>
            <input className="input" type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={{ width: '100%' }} />
          </div>
        </div>
        <label className="label">Motif (facultatif)</label>
        <input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Certificat médical, …" style={{ width: '100%' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" type="submit" disabled={mut.isPending || !valid}>
            {mut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Justification cell (inline edit) ─────────────────────────────────────────
function JustifCell({ leave }: { leave: LeaveRequest }) {
  const qc = useQueryClient();
  const saved = leave.justification ?? '';
  const [value, setValue] = useState(saved);
  useEffect(() => setValue(saved), [saved]);
  const mut = useMutation({
    mutationFn: (v: string) => updateLeave(leave.id, { justification: v.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['absences-all'] }); toast.success('Justification enregistrée'); },
    onError: (e: unknown) => toast.error(getApiError(e, 'Impossible d\'enregistrer')),
  });
  const dirty = value.trim() !== saved.trim();
  const save = () => { if (dirty && !mut.isPending) mut.mutate(value); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input className="input" value={value} placeholder="Ajouter…" onChange={e => setValue(e.target.value)}
        onBlur={save} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') setValue(saved); }}
        style={{ width: 160, fontSize: 12, padding: '4px 8px' }} />
      {dirty && <button className="btn btn-soft btn-sm" disabled={mut.isPending} onMouseDown={e => e.preventDefault()} onClick={save}><Check size={12} /></button>}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AbsencesPage() {
  const today = iso(new Date());
  const [showForm, setShowForm] = useState(false);
  const [reminded, setReminded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['absences-all'],
    queryFn: () => listLeaves({ limit: 1000 }),
    refetchInterval: 60_000,
  });

  const qc = useQueryClient();
  const delMut = useMutation({
    mutationFn: (id: string) => deleteLeave(id),
    onSuccess: () => {
      ['absences-all', 'leaves', 'leaves-all', 'dashboard-kpis'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      toast.success('Absence supprimée');
    },
    onError: (e: unknown) => toast.error(getApiError(e, 'Suppression impossible')),
  });

  const absences = useMemo(() =>
    (data?.data ?? []).filter((l: LeaveRequest) => l.status === 'approved' && ABSENCE_TYPES[l.type]),
    [data],
  );

  const covers = (l: LeaveRequest, d: string) => l.start_date <= d && d <= (l.end_date || l.start_date);

  const onToday = absences.filter(l => covers(l, today));
  const sickToday = onToday.filter(l => l.type === 'sick');
  const unjustToday = onToday.filter(l => l.type === 'unjustified');
  const missing = unjustToday.filter(l => !l.justification).length;

  // Days lost this month
  const currentMonth = today.slice(0, 7);
  const daysLost = absences.filter(l => l.start_date?.startsWith(currentMonth) || l.end_date?.startsWith(currentMonth))
    .reduce((s, l) => s + (l.days || 0), 0);

  // Recent absences (last 30 days)
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = iso(cutoff);
  const recent = [...absences]
    .filter(l => l.start_date >= cutoffStr || covers(l, today))
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .slice(0, 20);

  return (
    <Page>
      <PageHeader
        title="Absences"
        subtitle="Maladies, absences non justifiées et justificatifs à suivre."
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#b8402c,#df5740)', boxShadow: '0 12px 26px -12px rgba(223,87,64,.8)' }}>
            <Plus size={16} strokeWidth={2.2} /> Déclarer une absence
          </button>
        }
      />

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <div style={{ padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(135deg,#b8402c,#d1503a)', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', opacity: .9 }}>Absences du jour</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>{onToday.length}</div>
        </div>
        <div style={{ padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Taux d'absentéisme · T4</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>3,4 %</div>
        </div>
        <div style={{ padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Justificatifs manquants</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4, color: missing > 0 ? '#b8402c' : 'var(--text)' }}>{missing}</div>
        </div>
        <div style={{ padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Jours perdus ce mois</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>{daysLost}</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Recent absences */}
        <div style={{ flex: '1.4 1 460px', minWidth: 0, borderRadius: 20, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Absences récentes</div>

          {isLoading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : recent.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
              Aucune absence enregistrée.
            </div>
          ) : (
            recent.map((l, i) => {
              const cfg = ABSENCE_TYPES[l.type] || { label: l.type, tint: '#eef2f4', color: '#33474f' };
              const name = l.employees?.full_name || '?';
              const justOk = l.type === 'sick' || !!l.justification;
              const sentReminder = reminded.has(l.id);
              const dateStr = l.start_date === l.end_date
                ? `${fmt(l.start_date)} · 1 jour`
                : `${fmt(l.start_date)} → ${fmt(l.end_date)} · ${l.days || dayCount(l.start_date, l.end_date || l.start_date)} jours`;
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid #eef2f4', flexWrap: 'wrap' }}>
                  <span style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avOf(name), color: '#fff', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                    {ini(name)}
                  </span>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{dateStr}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: cfg.tint, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  {justOk ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#0f6f49' }}>
                      <FileCheck size={14} /> Justificatif reçu
                    </span>
                  ) : sentReminder ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#8a5207' }}>
                      <Send size={13} /> Relance envoyée
                    </span>
                  ) : (
                    <button type="button"
                      onClick={() => { setReminded(r => new Set(r).add(l.id)); toast.success(`Relance envoyée à ${name}`); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 11px', borderRadius: 9, border: '1px solid #f0c9c0', background: '#fff', color: '#a33a28', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                      <Bell size={13} /> Relancer
                    </button>
                  )}
                  <button type="button" title="Supprimer" onClick={() => { if (window.confirm(`Supprimer l'absence de ${name} ?`)) delMut.mutate(l.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Right panel */}
        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Absenteeism by dept */}
          <div style={{ padding: 20, borderRadius: 20, background: '#fff', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Absentéisme par service · T4</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {DEPT_DATA.map(d => (
                <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 44px', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ color: '#33474f' }}>{d.name}</span>
                  <span style={{ height: 9, borderRadius: 99, background: '#eef2f4', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${d.w}%`, borderRadius: 99, background: d.bar }} />
                  </span>
                  <span style={{ fontWeight: 700, textAlign: 'right', color: d.w > 70 ? '#b8402c' : 'var(--text)' }}>{d.v}</span>
                </div>
              ))}
            </div>
            {/* AI insight */}
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 16, padding: 12, borderRadius: 12, background: '#ece9fb', color: '#3d2f99', fontSize: 13, lineHeight: 1.5 }}>
              <Sparkles size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              Opérations est à près de 2× la moyenne (3,4 %), surtout les lundis. Un point avec le manager est conseillé.
            </div>
          </div>

          {/* Today's breakdown */}
          <div style={{ padding: 20, borderRadius: 20, background: '#fff', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Aujourd'hui</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {[
                { label: 'Maladie', count: sickToday.length, tint: '#fbe9e6', color: '#a33a28' },
                { label: 'Non justifiée', count: unjustToday.length, tint: '#fbefda', color: '#8a5207' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: row.tint, color: row.color }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <DeclareModal open={showForm} onClose={() => setShowForm(false)} />
    </Page>
  );
}
