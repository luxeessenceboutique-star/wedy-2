import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, UserX, Thermometer, AlertTriangle, ArrowLeft, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../components/layout/AppShell';
import { Avatar, Badge, Button, Modal, Spinner } from '../../components/ui';
import { listLeaves, createLeave, reviewLeave, updateLeave, deleteLeave, listEmployees, getApiError, type LeaveRequest } from '@/services/api';

// Two kinds of absence: justified by sickness, or unjustified (unpaid leave stays a leave, on the Congés page)
const ABSENCE_TYPES: Record<string, { label: string; variant: 'danger' | 'warning'; icon: React.ReactNode; justified: boolean }> = {
  sick:        { label: 'Maladie',       variant: 'warning', icon: <Thermometer size={15} />,   justified: true },
  unjustified: { label: 'Non justifiée', variant: 'danger',  icon: <AlertTriangle size={15} />, justified: false },
};

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const fmt = (s?: string) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const dayCount = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);

function DeclareModal({ open, date, onClose }: { open: boolean; date: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: emps } = useQuery({ queryKey: ['employees', 'absence-form'], queryFn: () => listEmployees({ limit: 200 }), enabled: open });
  const [form, setForm] = useState({ employee_id: '', type: 'sick', start_date: date, end_date: date, reason: '' });
  React.useEffect(() => { if (open) setForm(f => ({ ...f, start_date: date, end_date: date })); }, [open, date]);

  const mut = useMutation({
    mutationFn: async () => {
      const days = dayCount(form.start_date, form.end_date);
      const leave = await createLeave({ ...form, days });
      return reviewLeave(leave.id, 'approved');            // an absence is recorded, not requested
    },
    onSuccess: () => {
      ['absences-all', 'leaves', 'leaves-all', 'dashboard-kpis', 'requests-inbox', 'requests-count'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
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
        <select className="select" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} required>
          <option value="">— Sélectionner —</option>
          {(emps?.data ?? []).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <label className="label">Type</label>
        <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {Object.entries(ABSENCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label className="label">Du</label><input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
          <div><label className="label">Au</label><input className="input" type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
        </div>
        <label className="label">Motif (facultatif)</label>
        <input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Certificat médical, …" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={mut.isPending} disabled={!valid}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Free-text justification of an absence, saved on Enter / blur / the check button. */
function JustificationCell({ leave }: { leave: LeaveRequest }) {
  const qc = useQueryClient();
  const saved = leave.justification ?? '';
  const [value, setValue] = useState(saved);
  useEffect(() => setValue(saved), [saved]);
  const mut = useMutation({
    mutationFn: (v: string) => updateLeave(leave.id, { justification: v.trim() }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['absences-all'] });
      toast.success(v.trim() ? 'Justification enregistrée' : 'Justification retirée');
    },
    onError: (e: unknown) => toast.error(getApiError(e, "Impossible d'enregistrer la justification")),
  });
  const dirty = value.trim() !== saved.trim();
  const save = () => { if (dirty && !mut.isPending) mut.mutate(value); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input className="input" value={value} placeholder="Ajouter une justification…"
        onChange={e => setValue(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') setValue(saved); }}
        style={{ minWidth: 160, fontSize: 12.5, padding: '5px 9px' }} />
      {dirty
        ? <button className="btn btn-soft btn-sm" title="Enregistrer" disabled={mut.isPending} onMouseDown={e => e.preventDefault()} onClick={save}><Check size={13} /></button>
        : saved ? <Badge variant="success">Justifiée</Badge> : null}
    </div>
  );
}

export default function AbsencesPage() {
  const today = iso(new Date());
  const [date, setDate] = useState(today);
  const [type, setType] = useState<'all' | 'sick' | 'unjustified'>('all');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
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
  const askDelete = (l: LeaveRequest) => {
    if (window.confirm(`Supprimer l'absence de ${l.employees?.full_name || 'cet employé'} (${fmt(l.start_date)} → ${fmt(l.end_date)}) ?`)) delMut.mutate(l.id);
  };

  // Tick the absences to remove, then delete them together
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const setMany = (ids: string[], on: boolean) => setSelected(prev => { const n = new Set(prev); ids.forEach(i => (on ? n.add(i) : n.delete(i))); return n; });
  const bulkDel = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await Promise.allSettled(ids.map(id => deleteLeave(id)));
      return { done: ids.filter((_, i) => res[i].status === 'fulfilled'), failed: res.filter(r => r.status === 'rejected').length };
    },
    onSuccess: ({ done, failed }) => {
      ['absences-all', 'leaves', 'leaves-all', 'dashboard-kpis'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      setSelected(prev => { const n = new Set(prev); done.forEach(i => n.delete(i)); return n; });
      if (failed) toast.error(`${done.length} supprimée(s), ${failed} en échec`);
      else toast.success(`${done.length} absence${done.length > 1 ? 's' : ''} supprimée${done.length > 1 ? 's' : ''}`);
    },
  });

  const absences = useMemo(() =>
    (data?.data ?? []).filter(l => l.status === 'approved' && ABSENCE_TYPES[l.type]), [data]);
  const covers = (l: LeaveRequest, d: string) => l.start_date <= d && d <= (l.end_date || l.start_date);
  const onDay = absences.filter(l => covers(l, date) && (type === 'all' || l.type === type));
  const upcoming = absences.filter(l => l.start_date > date && l.start_date <= addDays(date, 14))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const count = (t: string) => absences.filter(l => covers(l, date) && l.type === t).length;
  const sickToday = onDay.filter(l => l.type === 'sick');
  const absentToday = onDay.filter(l => l.type === 'unjustified');
  const justifiedCount = absentToday.filter(l => l.justification).length;
  const visibleIds = new Set([...onDay, ...upcoming].map(l => l.id));
  const selectedVisible = [...selected].filter(id => visibleIds.has(id));

  const Row = ({ l }: { l: LeaveRequest }) => (
    <tr style={{ borderBottom: '1px solid var(--line)' }}>
      <td style={{ padding: '10px 6px 10px 16px', width: 30 }}>
        <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSel(l.id)} title="Sélectionner pour supprimer"
          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }} />
      </td>
      <td style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar name={l.employees?.full_name || '?'} size={28} />
          <span style={{ fontWeight: 600 }}>{l.employees?.full_name || '—'}</span>
        </div>
      </td>
      <td style={{ padding: '10px 16px', color: 'var(--ink-2)' }}>{l.employees?.department || '—'}</td>
      <td style={{ padding: '10px 16px' }}><Badge variant={ABSENCE_TYPES[l.type].variant}>{ABSENCE_TYPES[l.type].label}</Badge></td>
      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{fmt(l.start_date)}</td>
      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{fmt(l.end_date)}</td>
      <td style={{ padding: '10px 16px' }}>{l.days ?? dayCount(l.start_date, l.end_date)} j</td>
      <td style={{ padding: '10px 16px' }}>
        <Badge variant={ABSENCE_TYPES[l.type].justified || l.justification ? 'success' : 'danger'}>{ABSENCE_TYPES[l.type].justified || l.justification ? 'Oui' : 'Non'}</Badge>
      </td>
      <td style={{ padding: '10px 16px', color: 'var(--ink-2)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason || ''}>{l.reason || '—'}</td>
      <td style={{ padding: '10px 16px' }}>
        <button className="btn btn-ghost btn-sm" title="Supprimer cette absence" style={{ color: 'var(--danger)' }}
          disabled={delMut.isPending && delMut.variables === l.id} onClick={() => askDelete(l)}>
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
  const Head = () => (
    <thead><tr><th style={{ width: 30, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }} />{['Employé', 'Service', 'Type', 'Du', 'Au', 'Durée', 'Justifiée', 'Motif', ''].map((h, i) => (
      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>{h}</th>
    ))}</tr></thead>
  );
  const Cell = ({ l, children }: { l: LeaveRequest; children?: React.ReactNode }) => (
    <>
      <td style={{ padding: '10px 6px 10px 14px', width: 30 }}>
        <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSel(l.id)} title="Sélectionner pour supprimer"
          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }} />
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar name={l.employees?.full_name || '?'} size={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{l.employees?.full_name || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l.employees?.department || '—'}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--ink-2)' }}>{fmt(l.start_date)} → {fmt(l.end_date)}</td>
      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{l.days ?? dayCount(l.start_date, l.end_date)} j</td>
      {children}
      <td style={{ padding: '10px 14px' }}>
        <button className="btn btn-ghost btn-sm" title="Supprimer cette absence" style={{ color: 'var(--danger)' }}
          disabled={delMut.isPending && delMut.variables === l.id} onClick={() => askDelete(l)}>
          <Trash2 size={13} />
        </button>
      </td>
    </>
  );
  const th = { padding: '9px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase' as const, letterSpacing: '.06em', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' };
  const HeadCheck = ({ ids }: { ids: string[] }) => (
    <th style={{ ...th, width: 30, padding: '9px 6px 9px 14px' }}>
      <input type="checkbox" title="Tout sélectionner" checked={ids.length > 0 && ids.every(i => selected.has(i))}
        onChange={e => setMany(ids, e.target.checked)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }} />
    </th>
  );
  const Panel = ({ title, hint, icon, color, count: n, empty, children }: { title: string; hint: string; icon: React.ReactNode; color: string; count: number; empty: string; children: React.ReactNode }) => (
    <div className="card" style={{ overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line)', borderTop: `3px solid ${color}` }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{hint}</div>
        </div>
        <span style={{ fontSize: 22, fontWeight: 800, color }}>{n}</span>
      </div>
      {n === 0
        ? <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>{empty}</div>
        : <div style={{ overflowX: 'auto' }}>{children}</div>}
    </div>
  );
  const Seg = ({ v, label }: { v: typeof type; label: string }) => (
    <button onClick={() => setType(v)} style={{ padding: '6px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', borderRadius: 8,
      border: `1px solid ${type === v ? 'var(--primary)' : 'var(--line)'}`, background: type === v ? 'var(--primary-soft)' : 'var(--surface)',
      color: type === v ? 'var(--primary)' : 'var(--ink-2)' }}>{label}</button>
  );

  return (
    <div>
      <PageHeader
        title="Absences du jour"
        subtitle="Absences justifiées (maladie) et non justifiées, jour par jour."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/app/timeoff"><Button variant="ghost"><ArrowLeft size={14} /> Congés</Button></Link>
            <Button onClick={() => setShowForm(true)}><Plus size={14} /> Déclarer une absence</Button>
          </div>
        }
      />
      <div style={{ padding: '0 30px 30px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setDate(addDays(date, -1))} title="Jour précédent"><ChevronLeft size={15} /></button>
          <input className="input" type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} style={{ width: 160 }} />
          <button className="btn btn-ghost btn-sm" onClick={() => setDate(addDays(date, 1))} title="Jour suivant"><ChevronRight size={15} /></button>
          {date !== today && <button className="btn btn-soft btn-sm" onClick={() => setDate(today)}>Aujourd'hui</button>}
          <span style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 4px' }} />
          <Seg v="all" label="Toutes" /><Seg v="sick" label="Maladie" /><Seg v="unjustified" label="Non justifiées" />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Absents ce jour', value: count('sick') + count('unjustified'), color: 'var(--ink)', icon: <UserX size={16} /> },
            { label: 'Maladie (justifiées)', value: count('sick'), color: 'var(--warn)', icon: ABSENCE_TYPES.sick.icon },
            { label: 'Absences non justifiées', value: count('unjustified'), color: 'var(--danger)', icon: ABSENCE_TYPES.unjustified.icon },
          ].map(s => (
            <div key={s.label} style={{ flex: '1 1 160px', padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: s.color }}>{s.icon}<span style={{ fontSize: 26, fontWeight: 800 }}>{s.value}</span></div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {isLoading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          : isError ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--danger)' }}>Impossible de charger les absences. <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>Réessayer</button></div>
          : (
            <>
              {selectedVisible.length > 0 && (
                <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14,
                  padding: '10px 16px', background: 'var(--primary-soft)', border: '1px solid var(--primary)', borderRadius: 10 }}>
                  <strong style={{ fontSize: 13, color: 'var(--primary)' }}>{selectedVisible.length} absence{selectedVisible.length > 1 ? 's' : ''} sélectionnée{selectedVisible.length > 1 ? 's' : ''}</strong>
                  <button className="btn btn-danger btn-sm" disabled={bulkDel.isPending}
                    onClick={() => { if (window.confirm(`Supprimer ${selectedVisible.length} absence${selectedVisible.length > 1 ? 's' : ''} ? Cette action est définitive.`)) bulkDel.mutate(selectedVisible); }}>
                    <Trash2 size={13} /> {bulkDel.isPending ? 'Suppression…' : 'Supprimer la sélection'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Tout désélectionner</button>
                </div>
              )}

              {/* Two separate columns: the sick on one side, the absent (unjustified) on the other */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${type === 'all' ? 580 : 640}px, 1fr))`, gap: 16, marginBottom: 24, alignItems: 'start' }}>
                {type !== 'unjustified' && (
                  <Panel title="Malades" hint="Absence justifiée par la maladie" icon={ABSENCE_TYPES.sick.icon} color="var(--warn)"
                    count={sickToday.length} empty={`Aucun malade le ${fmt(date)}`}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr><HeadCheck ids={sickToday.map(l => l.id)} />{['Employé', 'Période', 'Durée', 'Motif', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
                      <tbody>{sickToday.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--line)' }}>
                          <Cell l={l}>
                            <td style={{ padding: '10px 14px', color: 'var(--ink-2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason || ''}>{l.reason || '—'}</td>
                          </Cell>
                        </tr>
                      ))}</tbody>
                    </table>
                  </Panel>
                )}
                {type !== 'sick' && (
                  <Panel title="Absents" hint={absentToday.length ? `Absence non justifiée · ${justifiedCount} justifiée${justifiedCount > 1 ? 's' : ''} après coup` : 'Absence non justifiée'}
                    icon={ABSENCE_TYPES.unjustified.icon} color="var(--danger)" count={absentToday.length} empty={`Aucun absent le ${fmt(date)}`}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr><HeadCheck ids={absentToday.map(l => l.id)} />{['Employé', 'Période', 'Durée', 'Justification', ''].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
                      <tbody>{absentToday.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--line)' }}>
                          <Cell l={l}>
                            <td style={{ padding: '8px 14px' }}><JustificationCell leave={l} /></td>
                          </Cell>
                        </tr>
                      ))}</tbody>
                    </table>
                  </Panel>
                )}
              </div>

              {upcoming.length > 0 && (
                <>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, margin: '0 0 10px' }}>À venir (14 jours)</h3>
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><Head /><tbody>{upcoming.map(l => <Row key={l.id} l={l} />)}</tbody></table></div>
                  </div>
                </>
              )}
            </>
          )}
      </div>
      <DeclareModal open={showForm} date={date} onClose={() => setShowForm(false)} />
    </div>
  );
}
