import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Plus, Pencil, Trash2, Search, X, CheckCircle,
  Clock, DollarSign, Users, TrendingUp, Award, Brain,
} from 'lucide-react';
import { api } from '@/services/api';
import { Button, Badge, Spinner, Input, Modal, Avatar } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { useLang } from '../../lib/lang';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';

const safeFormat = (d: any, fmt = 'dd/MM/yyyy') => {
  if (!d) return '—'; const dt = new Date(d); return isValid(dt) ? format(dt, fmt) : '—';
};

// ── API ────────────────────────────────────────────────────────────────────────
const getCatalog       = (cat = '') => api.get(`/training/catalog${cat ? `?category=${cat}` : ''}`).then(r => r.data);
const createTraining   = (body: any) => api.post('/training/catalog', body).then(r => r.data);
const updateTraining   = (id: string, body: any) => api.patch(`/training/catalog/${id}`, body).then(r => r.data);
const deleteTraining   = (id: string) => api.delete(`/training/catalog/${id}`);
const getAssignments   = () => api.get('/training/assignments').then(r => r.data);
const assignTraining   = (body: any) => api.post('/training/assignments', body).then(r => r.data);
const updateAssign     = (id: string, body: any) => api.patch(`/training/assignments/${id}`, body).then(r => r.data);
const deleteAssign     = (id: string) => api.delete(`/training/assignments/${id}`);
const getStats         = () => api.get('/training/stats').then(r => r.data);
const listEmployees    = () => api.get('/employees?status=active&limit=200').then(r => r.data);
const getSkills        = (cat = '') => api.get(`/training/skills${cat ? `?category=${cat}` : ''}`).then(r => r.data);
const createSkill      = (body: any) => api.post('/training/skills', body).then(r => r.data);
const updateSkill      = (id: string, body: any) => api.patch(`/training/skills/${id}`, body).then(r => r.data);
const deleteSkill      = (id: string) => api.delete(`/training/skills/${id}`);
const getEmpSkills     = (empId: string) => api.get(`/training/employee-skills?employee_id=${empId}`).then(r => r.data);
const upsertEmpSkill   = (body: any) => api.post('/training/employee-skills', body).then(r => r.data);
const removeEmpSkill   = (id: string) => api.delete(`/training/employee-skills/${id}`);

// ── Config ─────────────────────────────────────────────────────────────────────
const CATS: Record<string, { label: string; color: string; bg: string }> = {
  technique:   { label: 'Technique',   color: 'var(--primary)', bg: 'var(--primary-soft)' },
  soft_skills: { label: 'Soft Skills', color: 'var(--violet)', bg: 'var(--violet-soft)' },
  compliance:  { label: 'Conformité',  color: 'var(--danger)', bg: '#fef2f2' },
  management:  { label: 'Management',  color: 'var(--warn)', bg: 'var(--warn-soft)' },
  langue:      { label: 'Langue',      color: 'var(--success)', bg: 'var(--success-soft)' },
  securite:    { label: 'Sécurité',    color: 'var(--ink-2)', bg: 'var(--surface-2)' },
  leadership:  { label: 'Leadership',  color: 'var(--violet)', bg: '#fdf2f8' },
  digital:     { label: 'Digital',     color: 'var(--accent)', bg: 'var(--primary-soft)' },
  metier:      { label: 'Métier',      color: '#84cc16', bg: '#f7fee7' },
};
const catMeta = (c: string) => CATS[c] ?? CATS.technique;

const STATUS_COLORS: Record<string, string> = {
  planned: 'var(--warn)', in_progress: 'var(--primary)', completed: 'var(--success)', cancelled: 'var(--danger)',
};
const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié', in_progress: 'En cours', completed: 'Terminé', cancelled: 'Annulé',
};

const LEVELS: Record<string, { label: string; color: string; bg: string }> = {
  beginner:     { label: 'Débutant',      color: 'var(--ink-2)', bg: 'var(--surface-2)' },
  intermediate: { label: 'Intermédiaire', color: 'var(--primary)', bg: 'var(--primary-soft)' },
  expert:       { label: 'Expert',        color: 'var(--warn)', bg: 'var(--warn-soft)' },
};

// ── Training form ──────────────────────────────────────────────────────────────
function TrainingForm({ initial, onSave, onCancel, loading }: any) {
  const [form, setForm] = useState(initial ?? {
    title: '', category: 'technique', provider: '', duration_hours: 8, cost_dh: 0, description: '',
  });
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Input label="Titre *" value={form.title} onChange={set('title')} required placeholder="Formation React avancé" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Catégorie</label>
          <select className="input" value={form.category} onChange={set('category')}>
            {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <Input label="Organisme / Prestataire" value={form.provider ?? ''} onChange={set('provider')} placeholder="OpenClassrooms" />
        <Input label="Durée (heures)" type="number" value={form.duration_hours} onChange={set('duration_hours')} />
        <Input label="Coût (DH)" type="number" value={form.cost_dh} onChange={set('cost_dh')} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={2} style={{ resize: 'none', padding: '8px 12px' }}
          value={form.description ?? ''} onChange={set('description')} placeholder="Objectifs, contenu..." />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
}

// ── Skill form ─────────────────────────────────────────────────────────────────
function SkillForm({ initial, onSave, onCancel, loading }: any) {
  const [form, setForm] = useState(initial ?? { name: '', category: 'technique', description: '' });
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target.value }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Input label="Nom de la compétence *" value={form.name} onChange={set('name')} required placeholder="JavaScript ES6+" />
      <div>
        <label className="label">Catégorie</label>
        <select className="input" value={form.category} onChange={set('category')}>
          {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={2} style={{ resize: 'none', padding: '8px 12px' }}
          value={form.description ?? ''} onChange={set('description')} placeholder="Description courte..." />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
}

// ── Assign form ────────────────────────────────────────────────────────────────
function AssignForm({ trainingId, employees, onSave, onCancel, loading }: any) {
  const [employeeId, setEmployeeId] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label className="label">Collaborateur *</label>
        <select className="input" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
          <option value="">Sélectionner...</option>
          {employees.map((e: any) => <option key={e.id} value={e.id}>{e.full_name} — {e.department}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button onClick={() => employeeId && onSave({ employee_id: employeeId, training_id: trainingId, status: 'planned' })} loading={loading}>
          Assigner
        </Button>
      </div>
    </div>
  );
}

// ── Skill detail modal (employee skill levels) ─────────────────────────────────
function SkillDetailModal({ skill, employees, onClose }: any) {
  const qc = useQueryClient();
  const { data: empSkills = [], isLoading } = useQuery({
    queryKey: ['skill-employees', skill.id],
    queryFn: () => api.get(`/training/employee-skills?skill_id=${skill.id}`).then(r => r.data).catch(() => []),
    retry: false,
  });

  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('beginner');

  const addMut = useMutation({
    mutationFn: () => upsertEmpSkill({ employee_id: selectedEmp, skill_id: skill.id, level: selectedLevel }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skill-employees', skill.id] }); setSelectedEmp(''); toast.success('Compétence assignée'); },
    onError: () => toast.error('Erreur'),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => removeEmpSkill(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skill-employees', skill.id] }),
  });

  const cm = catMeta(skill.category);
  const assignedIds = new Set(empSkills.map((s: any) => s.employee_id));

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: cm.color, background: cm.bg, padding: '2px 8px', borderRadius: 6 }}>{cm.label}</span>
        <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{skill.name}</p>
      </div>
      {skill.description && <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>{skill.description}</p>}

      {/* Assign */}
      <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Ajouter un collaborateur</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end' }}>
          <div>
            <select className="input" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
              <option value="">Sélectionner...</option>
              {employees.filter((e: any) => !assignedIds.has(e.id)).map((e: any) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <select className="input" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}>
              {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <Button onClick={() => selectedEmp && addMut.mutate()} loading={addMut.isPending} size="sm">
            <Plus size={13} />
          </Button>
        </div>
      </div>

      {/* Employee list */}
      {isLoading ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {empSkills.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'center', padding: 16 }}>Aucun collaborateur assigné.</p>}
          {empSkills.map((es: any) => {
            const lm = LEVELS[es.level] ?? LEVELS.beginner;
            const emp = employees.find((e: any) => e.id === es.employee_id) ?? {};
            return (
              <div key={es.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8 }}>
                <Avatar name={emp.full_name ?? '?'} size={30} />
                <span style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{emp.full_name ?? es.employee_id}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: lm.color, background: lm.bg, padding: '2px 8px', borderRadius: 5 }}>{lm.label}</span>
                <button onClick={() => removeMut.mutate(es.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><X size={13} /></button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button variant="ghost" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TrainingPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'catalog' | 'assignments' | 'skills'>('catalog');
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [showCreateSkill, setShowCreateSkill] = useState(false);
  const [detailSkill, setDetailSkill] = useState<any>(null);

  const { data: catalog = [], isLoading: catLoading } = useQuery({
    queryKey: ['training-catalog', catFilter],
    queryFn: () => getCatalog(catFilter),
  });
  const { data: assignments = [], isLoading: assignLoading } = useQuery({
    queryKey: ['training-assignments'],
    queryFn: getAssignments,
  });
  const { data: stats } = useQuery({ queryKey: ['training-stats'], queryFn: getStats });
  const { data: empData } = useQuery({ queryKey: ['employees-active'], queryFn: listEmployees });
  const employees = empData?.data ?? [];
  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills', catFilter],
    queryFn: () => getSkills(catFilter),
    enabled: view === 'skills',
  });

  const createMut = useMutation({
    mutationFn: createTraining,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-catalog'] }); setShowCreate(false); toast.success('Formation créée'); },
    onError: () => toast.error('Erreur'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateTraining(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-catalog'] }); setEditingTraining(null); toast.success('Mis à jour'); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteTraining,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-catalog'] }); toast.success('Supprimé'); },
  });
  const assignMut = useMutation({
    mutationFn: assignTraining,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-assignments'] }); setAssigningTo(null); toast.success('Formation assignée'); },
  });
  const updateAssignMut = useMutation({
    mutationFn: ({ id, data }: any) => updateAssign(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-assignments'] }),
  });
  const deleteAssignMut = useMutation({
    mutationFn: deleteAssign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training-assignments'] }); toast.success('Supprimé'); },
  });
  const createSkillMut = useMutation({
    mutationFn: createSkill,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); setShowCreateSkill(false); toast.success('Compétence créée'); },
    onError: () => toast.error('Erreur'),
  });
  const updateSkillMut = useMutation({
    mutationFn: ({ id, data }: any) => updateSkill(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); setEditingSkill(null); toast.success('Mis à jour'); },
  });
  const deleteSkillMut = useMutation({
    mutationFn: deleteSkill,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); toast.success('Supprimée'); },
  });

  const filteredCatalog = catalog.filter((t: any) =>
    !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.provider?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredSkills = skills.filter((s: any) =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group skills by category
  const skillsByCategory = filteredSkills.reduce((acc: any, s: any) => {
    const cat = s.category || 'technique';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title={t('training_title')}
        subtitle={t('training_subtitle')}
        action={
          <Button onClick={() => view === 'skills' ? setShowCreateSkill(true) : setShowCreate(true)}>
            <Plus size={14} /> {view === 'skills' ? 'Nouvelle compétence' : 'Nouvelle formation'}
          </Button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total assignations', value: stats?.total ?? 0,                         icon: <Users size={16} />,    color: 'var(--primary)' },
          { label: 'Taux de complétion', value: `${stats?.completion_rate ?? 0}%`,          icon: <TrendingUp size={16} />, color: 'var(--success)' },
          { label: 'Budget total (DH)',  value: `${(stats?.total_budget_dh ?? 0).toLocaleString()}`, icon: <DollarSign size={16} />, color: 'var(--warn)' },
          { label: 'Heures complétées', value: `${stats?.total_hours_completed ?? 0}h`,    icon: <Clock size={16} />,    color: 'var(--violet)' },
        ].map(s => (
          <div key={s.label} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-2)', margin: 0 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'catalog',     label: `Catalogue (${catalog.length})` },
          { id: 'assignments', label: `Assignations (${assignments.length})` },
          { id: 'skills',      label: `Compétences (${skills.length})` },
        ].map(v => (
          <button key={v.id} onClick={() => { setView(v.id as any); setSearch(''); setCatFilter(''); }}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: view === v.id ? 'var(--primary)' : 'transparent', color: view === v.id ? '#fff' : 'var(--fg)' }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── CATALOG ── */}
      {view === 'catalog' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }} />
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setCatFilter('')}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--line)',
                  background: !catFilter ? 'var(--primary)' : 'transparent', color: !catFilter ? '#fff' : 'var(--fg)' }}>
                Tout
              </button>
              {Object.entries(CATS).slice(0, 6).map(([k, v]) => (
                <button key={k} onClick={() => setCatFilter(catFilter === k ? '' : k)}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${v.color}44`, background: catFilter === k ? v.color : v.bg, color: catFilter === k ? '#fff' : v.color }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {catLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {filteredCatalog.map((t: any) => {
                const cm = catMeta(t.category);
                return (
                  <div key={t.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: cm.color, background: cm.bg, padding: '2px 8px', borderRadius: 6 }}>{cm.label}</span>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: '6px 0 2px' }}>{t.title}</p>
                        {t.provider && <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0 }}>{t.provider}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingTraining(t)}><Pencil size={12} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                          onClick={() => { if (confirm('Supprimer ?')) deleteMut.mutate(t.id); }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {t.description && <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>{t.description}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                      <span><Clock size={11} /> {t.duration_hours}h</span>
                      <span><DollarSign size={11} /> {Number(t.cost_dh).toLocaleString()} DH</span>
                      <Button size="sm" variant="soft" onClick={() => setAssigningTo(t.id)}>
                        <Users size={11} /> Assigner
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filteredCatalog.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)' }}>
                  <BookOpen size={36} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                  <p>Aucune formation dans le catalogue.</p>
                  <Button onClick={() => setShowCreate(true)}><Plus size={13} /> Créer une formation</Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── ASSIGNMENTS ── */}
      {view === 'assignments' && (
        <>
          {assignLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {assignments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)' }}>
                  <Award size={36} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                  <p>Aucune formation assignée.</p>
                </div>
              )}
              {assignments.map((a: any) => {
                const statusColor = STATUS_COLORS[a.status] ?? 'var(--ink-2)';
                const cat = catMeta(a.training_catalog?.category ?? '');
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, background: cat.bg, padding: '1px 6px', borderRadius: 4 }}>{cat.label}</span>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{a.training_catalog?.title ?? '—'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', gap: 12 }}>
                        <span><Users size={11} /> {a.employees?.full_name ?? '—'}</span>
                        <span>{a.employees?.department ?? ''}</span>
                        <span>Assigné {safeFormat(a.assigned_at)}</span>
                        {a.training_catalog?.duration_hours && <span><Clock size={11} /> {a.training_catalog.duration_hours}h</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select value={a.status}
                        onChange={e => updateAssignMut.mutate({ id: a.id, data: { status: e.target.value, ...(e.target.value === 'completed' ? { completed_at: new Date().toISOString() } : {}) } })}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${statusColor}44`, background: statusColor + '22', color: statusColor, fontWeight: 700, cursor: 'pointer' }}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      {a.status === 'completed' && <CheckCircle size={16} style={{ color: 'var(--success)' }} />}
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                        onClick={() => { if (confirm('Supprimer cette assignation ?')) deleteAssignMut.mutate(a.id); }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── COMPÉTENCES ── */}
      {view === 'skills' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }} />
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Rechercher une compétence..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {skillsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
          ) : skills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-2)' }}>
              <Brain size={40} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 500 }}>Aucune compétence dans le référentiel.</p>
              <Button onClick={() => setShowCreateSkill(true)} style={{ marginTop: 8 }}><Plus size={13} /> Créer une compétence</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {Object.entries(skillsByCategory).map(([cat, catSkills]: [string, any]) => {
                const cm = catMeta(cat);
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cm.color, background: cm.bg, padding: '3px 10px', borderRadius: 20, border: `1px solid ${cm.color}44` }}>
                        {cm.label}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{(catSkills as any[]).length} compétences</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                      {(catSkills as any[]).map((skill: any) => (
                        <div key={skill.id} className="card card-pad"
                          style={{ cursor: 'pointer', borderLeft: `3px solid ${cm.color}`, transition: 'box-shadow 0.15s' }}
                          onClick={() => setDetailSkill(skill)}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{skill.name}</p>
                              {skill.description && (
                                <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.4 }}>
                                  {skill.description.length > 60 ? skill.description.slice(0, 60) + '…' : skill.description}
                                </p>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 4, marginLeft: 8 }} onClick={e => e.stopPropagation()}>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditingSkill(skill)}><Pencil size={11} /></button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                                onClick={() => { if (confirm('Supprimer cette compétence ?')) deleteSkillMut.mutate(skill.id); }}>
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle formation" width={560}>
        <TrainingForm onSave={createMut.mutate} onCancel={() => setShowCreate(false)} loading={createMut.isPending} />
      </Modal>
      <Modal open={!!editingTraining} onClose={() => setEditingTraining(null)} title="Modifier la formation" width={560}>
        <TrainingForm initial={editingTraining} loading={updateMut.isPending}
          onSave={(data: any) => updateMut.mutate({ id: editingTraining.id, data })}
          onCancel={() => setEditingTraining(null)} />
      </Modal>
      <Modal open={!!assigningTo} onClose={() => setAssigningTo(null)} title="Assigner la formation" width={420}>
        <AssignForm trainingId={assigningTo} employees={employees}
          onSave={assignMut.mutate} onCancel={() => setAssigningTo(null)} loading={assignMut.isPending} />
      </Modal>
      <Modal open={showCreateSkill} onClose={() => setShowCreateSkill(false)} title="Nouvelle compétence" width={460}>
        <SkillForm onSave={createSkillMut.mutate} onCancel={() => setShowCreateSkill(false)} loading={createSkillMut.isPending} />
      </Modal>
      <Modal open={!!editingSkill} onClose={() => setEditingSkill(null)} title="Modifier la compétence" width={460}>
        <SkillForm initial={editingSkill} loading={updateSkillMut.isPending}
          onSave={(data: any) => updateSkillMut.mutate({ id: editingSkill.id, data })}
          onCancel={() => setEditingSkill(null)} />
      </Modal>
      <Modal open={!!detailSkill} onClose={() => setDetailSkill(null)} title="Détail de la compétence" width={540}>
        {detailSkill && <SkillDetailModal skill={detailSkill} employees={employees} onClose={() => setDetailSkill(null)} />}
      </Modal>
    </div>
  );
}
