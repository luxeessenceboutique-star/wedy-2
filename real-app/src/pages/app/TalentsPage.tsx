import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, TrendingUp, AlertTriangle, Users, Plus, X, Target,
  Zap, Shield, Flame, BookOpen, ChevronRight, Pencil, Trash2,
  LayoutGrid, List, Award, ArrowRight, CheckCircle2, Circle, Clock,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Spinner, Input, Avatar } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';

const safeFormat = (d: any, fmt = 'dd/MM/yyyy') => {
  if (!d) return '—'; const dt = new Date(d); return isValid(dt) ? format(dt, fmt) : '—';
};

// ── API ────────────────────────────────────────────────────────────────────────
const getTalents   = () => api.get('/talents').then(r => r.data);
const patchTalent  = (id: string, body: any) => api.patch(`/talents/${id}`, body).then(r => r.data);
const bulkProfile  = () => api.post('/talents/bulk-profile', {}).then(r => r.data);
const getOKRs      = (id: string) => api.get(`/talents/${id}/okrs`).then(r => r.data);
const createOKR    = (id: string, body: any) => api.post(`/talents/${id}/okrs`, body).then(r => r.data);
const updateOKR    = (eid: string, oid: string, body: any) => api.patch(`/talents/${eid}/okrs/${oid}`, body).then(r => r.data);
const deleteOKR    = (eid: string, oid: string) => api.delete(`/talents/${eid}/okrs/${oid}`);
const getStats     = () => api.get('/talents/stats/summary').then(r => r.data);
const getMobility  = () => api.get('/talents/mobility/candidates').then(r => r.data);
const getPDI       = (id: string) => api.get(`/talents/${id}/pdi`).then(r => r.data);
const createPDI    = (id: string, body: any) => api.post(`/talents/${id}/pdi`, body).then(r => r.data);
const updatePDI    = (eid: string, iid: string, body: any) => api.patch(`/talents/${eid}/pdi/${iid}`, body).then(r => r.data);
const deletePDI    = (eid: string, iid: string) => api.delete(`/talents/${eid}/pdi/${iid}`);

// ── Config ─────────────────────────────────────────────────────────────────────
const TALENT_CATS: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  star:              { label: 'Star',            color: '#f59e0b', bg: '#fffbeb', desc: 'Haut potentiel + haute perf.' },
  solid:             { label: 'Solid Performer', color: '#10b981', bg: '#ecfdf5', desc: 'Fiable, haute perf.' },
  potential:         { label: 'Haut Potentiel',  color: '#8b5cf6', bg: '#f5f3ff', desc: 'Potentiel élevé, perf. en cours' },
  key_player:        { label: 'Joueur Clé',      color: '#3b82f6', bg: '#eff6ff', desc: 'Profil équilibré' },
  needs_improvement: { label: 'À développer',    color: '#ef4444', bg: '#fef2f2', desc: 'Accompagnement requis' },
};
const catMeta = (c: string) => TALENT_CATS[c] ?? TALENT_CATS.key_player;

const RISK_COLORS: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };
const RISK_LABELS: Record<string, string> = { low: 'Faible',  medium: 'Moyen',   high: 'Élevé' };

const MOOVWIN = [
  { key: 'amana_score',   label: 'Amana',   icon: <Shield size={12} />,     desc: 'Confiance' },
  { key: 'itkan_score',   label: 'Itkan',   icon: <Star size={12} />,       desc: 'Excellence' },
  { key: 'iltizam_score', label: 'Iltizam', icon: <Flame size={12} />,      desc: 'Engagement' },
  { key: 'ibdaa_score',   label: 'Ibdaa',   icon: <Zap size={12} />,        desc: 'Innovation' },
  { key: 'nama_score',    label: 'Nama',    icon: <TrendingUp size={12} />, desc: 'Croissance' },
];

const ACTION_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  formation:   { label: 'Formation',   color: '#3b82f6', bg: '#eff6ff' },
  coaching:    { label: 'Coaching',    color: '#8b5cf6', bg: '#f5f3ff' },
  mentorat:    { label: 'Mentorat',    color: '#10b981', bg: '#ecfdf5' },
  projet:      { label: 'Projet',      color: '#f59e0b', bg: '#fffbeb' },
  lecture:     { label: 'Lecture',     color: '#64748b', bg: '#f8fafc' },
  conference:  { label: 'Conférence',  color: '#ec4899', bg: '#fdf2f8' },
};

const PDI_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: 'À faire',  color: '#64748b', icon: <Circle size={13} /> },
  in_progress: { label: 'En cours', color: '#3b82f6', icon: <Clock size={13} /> },
  completed:   { label: 'Terminé',  color: '#10b981', icon: <CheckCircle2 size={13} /> },
};

const READINESS: Record<string, string> = {
  ready_now:    'Prêt maintenant',
  ready_1year:  'Prêt dans 1 an',
  ready_2years: 'Prêt dans 2 ans',
};

// ── 9-box grid ─────────────────────────────────────────────────────────────────
const NINE_BOX = [
  ['needs_improvement', 'key_player', 'potential'],
  ['key_player',        'key_player', 'potential'],
  ['solid',             'solid',      'star'],
];

function NineBoxGrid({ talents }: { talents: any[] }) {
  return (
    <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Matrice 9-box : Performance × Potentiel</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 24, paddingTop: 4 }}>
          {['Haut', 'Moyen', 'Faible'].map(l => (
            <span key={l} style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600 }}>{l}</span>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {NINE_BOX.flatMap((row, ri) => row.map((cat, ci) => {
              const cm = catMeta(cat);
              const perfMin = ci + 1; const perfMax = ci + 2;
              const potMin  = 3 - ri; const potMax  = 4 - ri;
              const here = talents.filter(t => {
                const p = t.performance_score ?? 3; const q = t.potential_score ?? 3;
                return p >= perfMin && p < perfMax && q >= potMin && q < potMax;
              });
              return (
                <div key={`${ri}-${ci}`} style={{
                  minHeight: 90, padding: '10px 12px', borderRadius: 10,
                  background: cm.bg, border: `1px solid ${cm.color}44`,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: cm.color }}>{cm.label}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                    {here.map((t: any) => (
                      <div key={t.id} title={t.employees?.full_name}>
                        <Avatar name={t.employees?.full_name ?? '?'} src={t.employees?.photo_url} size={28} />
                      </div>
                    ))}
                  </div>
                  {here.length > 0 && <span style={{ fontSize: 10, color: cm.color }}>{here.length} pers.</span>}
                </div>
              );
            }))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 6 }}>
            {['Perf. Faible', 'Perf. Moyenne', 'Perf. Élevée'].map(l => (
              <span key={l} style={{ fontSize: 10, color: 'var(--fg-muted)', fontWeight: 600, textAlign: 'center' }}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mobility view ──────────────────────────────────────────────────────────────
function MobilityView({ mobility, onOpenTalent }: { mobility: any[]; onOpenTalent: (t: any) => void }) {
  if (mobility.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
        <ArrowRight size={40} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
        <p style={{ fontWeight: 500, marginBottom: 8 }}>Aucun candidat à la mobilité interne.</p>
        <p style={{ fontSize: 13 }}>Définissez un "Prochain rôle visé" dans le profil talent d'un collaborateur pour qu'il apparaisse ici.</p>
      </div>
    );
  }

  const byCategory = mobility.reduce((acc: any, t: any) => {
    const cat = t.talent_category ?? 'key_player';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Object.entries(byCategory).map(([cat, items]: [string, any]) => {
        const cm = catMeta(cat);
        return (
          <div key={cat}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: cm.color, background: cm.bg, padding: '3px 10px', borderRadius: 20 }}>
                {cm.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{(items as any[]).length} candidat(s)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              {(items as any[]).map((t: any) => {
                const emp = t.employees ?? {};
                const rc = RISK_COLORS[t.flight_risk ?? 'low'];
                return (
                  <div key={t.id} className="card card-pad hover-scale" style={{ cursor: 'pointer' }} onClick={() => onOpenTalent(t)}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                      <Avatar name={emp.full_name} src={emp.photo_url} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>{emp.full_name}</p>
                        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>{emp.department}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: rc, background: rc + '22', padding: '2px 7px', borderRadius: 5 }}>
                        {RISK_LABELS[t.flight_risk ?? 'low']}
                      </span>
                    </div>
                    {/* Career arrow */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: 8, fontSize: 13 }}>
                      <span style={{ color: 'var(--fg-muted)', flex: 1, fontSize: 12 }}>{emp.position ?? '—'}</span>
                      <ArrowRight size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color: 'var(--primary)', flex: 1, textAlign: 'right' }}>{t.next_role}</span>
                    </div>
                    {t.career_path && (
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '8px 0 0' }}>
                        Trajectoire: {t.career_path}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: 'var(--fg-muted)' }}>
                      <span>Perf. <strong style={{ color: '#10b981' }}>{t.performance_score}/5</strong></span>
                      <span>Pot. <strong style={{ color: '#8b5cf6' }}>{t.potential_score}/5</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Talent drawer ──────────────────────────────────────────────────────────────
function TalentDrawer({ talent, onClose }: { talent: any; onClose: () => void }) {
  const qc = useQueryClient();
  const emp = talent.employees ?? {};
  const [tab, setTab] = useState<'profile' | 'okrs' | 'pdi'>('profile');

  // OKR form
  const [showOKRForm, setShowOKRForm] = useState(false);
  const [okrForm, setOKRForm] = useState({ title: '', description: '', quarter: 'Q2 2026', progress: 0 });

  // PDI form
  const [showPDIForm, setShowPDIForm] = useState(false);
  const [pdiForm, setPDIForm] = useState({ title: '', action_type: 'formation', target_date: '', notes: '' });

  // Successor management
  const [newSuccessorName, setNewSuccessorName] = useState('');
  const [newSuccessorReadiness, setNewSuccessorReadiness] = useState('ready_1year');

  const [localScores, setLocalScores] = useState<any>({
    performance_score:    talent.performance_score ?? 3,
    potential_score:      talent.potential_score ?? 3,
    amana_score:          talent.amana_score ?? 0,
    itkan_score:          talent.itkan_score ?? 0,
    iltizam_score:        talent.iltizam_score ?? 0,
    ibdaa_score:          talent.ibdaa_score ?? 0,
    nama_score:           talent.nama_score ?? 0,
    flight_risk:          talent.flight_risk ?? 'low',
    is_critical_position: talent.is_critical_position ?? false,
    career_path:          talent.career_path ?? '',
    next_role:            talent.next_role ?? '',
    notes:                talent.notes ?? '',
    successor_names:      Array.isArray(talent.successor_names) ? talent.successor_names : [],
  });

  const { data: okrs = [] } = useQuery({
    queryKey: ['okrs', emp.id],
    queryFn: () => getOKRs(emp.id),
    enabled: !!emp.id,
    retry: false,
  });

  const { data: pdiItems = [] } = useQuery({
    queryKey: ['pdi', emp.id],
    queryFn: () => getPDI(emp.id),
    enabled: !!emp.id,
    retry: false,
  });

  const patchMut = useMutation({
    mutationFn: (body: any) => patchTalent(emp.id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['talents'] }); qc.invalidateQueries({ queryKey: ['talent-mobility'] }); toast.success('Profil mis à jour'); },
  });
  const createOKRMut = useMutation({
    mutationFn: () => createOKR(emp.id, okrForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['okrs', emp.id] }); setShowOKRForm(false); toast.success('OKR ajouté'); },
  });
  const updateOKRMut = useMutation({
    mutationFn: ({ id, body }: any) => updateOKR(emp.id, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okrs', emp.id] }),
  });
  const deleteOKRMut = useMutation({
    mutationFn: (id: string) => deleteOKR(emp.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okrs', emp.id] }),
  });
  const createPDIMut = useMutation({
    mutationFn: () => createPDI(emp.id, pdiForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pdi', emp.id] }); setShowPDIForm(false); setPDIForm({ title: '', action_type: 'formation', target_date: '', notes: '' }); toast.success('Action ajoutée'); },
  });
  const updatePDIMut = useMutation({
    mutationFn: ({ id, body }: any) => updatePDI(emp.id, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pdi', emp.id] }),
  });
  const deletePDIMut = useMutation({
    mutationFn: (id: string) => deletePDI(emp.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pdi', emp.id] }),
  });

  const set  = (k: string, v: any) => setLocalScores((f: any) => ({ ...f, [k]: v }));
  const save = () => patchMut.mutate(localScores);

  const addSuccessor = () => {
    if (!newSuccessorName.trim()) return;
    const updated = [...localScores.successor_names, { name: newSuccessorName.trim(), readiness: newSuccessorReadiness }];
    setLocalScores((f: any) => ({ ...f, successor_names: updated }));
    setNewSuccessorName('');
  };
  const removeSuccessor = (idx: number) => {
    setLocalScores((f: any) => ({ ...f, successor_names: f.successor_names.filter((_: any, i: number) => i !== idx) }));
  };

  const cat = catMeta(talent.talent_category ?? 'key_player');
  const moovwinAvg = MOOVWIN.reduce((s, m) => s + (localScores[m.key] ?? 0), 0) / 5;

  const completedPDI = pdiItems.filter((p: any) => p.status === 'completed').length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ width: 660, background: 'var(--bg)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'center' }}>
          <Avatar name={emp.full_name} src={emp.photo_url} size={56} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{emp.full_name}</h2>
            <p style={{ fontSize: 13, color: 'var(--primary)', margin: '2px 0' }}>{emp.position}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, background: cat.bg, padding: '2px 8px', borderRadius: 6 }}>{cat.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: RISK_COLORS[localScores.flight_risk], background: RISK_COLORS[localScores.flight_risk] + '22', padding: '2px 8px', borderRadius: 6 }}>
                Risque: {RISK_LABELS[localScores.flight_risk]}
              </span>
              {localScores.is_critical_position && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 6 }}>⚠ Critique</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '0 24px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 20, paddingTop: 4 }}>
            {[
              { id: 'profile', label: 'Profil Talent' },
              { id: 'okrs',    label: `OKRs (${okrs.length})` },
              { id: 'pdi',     label: `PDI (${completedPDI}/${pdiItems.length})` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} style={{
                padding: '10px 0', fontWeight: 600, fontSize: 13,
                borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: tab === t.id ? 'var(--primary)' : 'var(--fg-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto' }}>

          {/* ── PROFIL TAB ── */}
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Performance & Potential */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'performance_score', label: 'Performance', color: '#10b981' },
                  { key: 'potential_score',   label: 'Potentiel',   color: '#8b5cf6' },
                ].map(s => (
                  <div key={s.key} style={{ padding: '14px 16px', border: `1px solid ${s.color}44`, borderRadius: 12, background: s.color + '0a' }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: s.color, marginBottom: 10 }}>{s.label}</p>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => set(s.key, n)}
                          style={{ width: 32, height: 32, borderRadius: 8,
                            border: `2px solid ${n <= localScores[s.key] ? s.color : 'var(--border)'}`,
                            background: n <= localScores[s.key] ? s.color : 'transparent',
                            color: n <= localScores[s.key] ? '#fff' : 'var(--fg-muted)',
                            fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Moovwin */}
              <div style={{ padding: '14px 16px', border: '1px solid #f59e0b44', borderRadius: 12, background: '#fffbeb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b', margin: 0 }}>Scoring Moovwin</p>
                  <span style={{ fontWeight: 800, color: '#f59e0b' }}>★ {moovwinAvg.toFixed(1)}/5</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                  {MOOVWIN.map(m => (
                    <div key={m.key} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, color: '#f59e0b' }}>{m.icon}</div>
                      <p style={{ fontSize: 10, fontWeight: 700, margin: '0 0 6px', color: 'var(--fg-muted)' }}>{m.label}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[5,4,3,2,1].map(n => (
                          <button key={n} onClick={() => set(m.key, n)}
                            style={{ width: '100%', height: 14, borderRadius: 3, cursor: 'pointer', border: 'none',
                              background: n <= localScores[m.key] ? '#f59e0b' : 'var(--border)' }} />
                        ))}
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{localScores[m.key]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk + Critical */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Risque de départ</label>
                  <select className="input" value={localScores.flight_risk} onChange={e => set('flight_risk', e.target.value)}>
                    {Object.entries(RISK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
                  <input type="checkbox" checked={localScores.is_critical_position}
                    onChange={e => set('is_critical_position', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#ef4444' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Poste critique</span>
                </div>
              </div>

              {/* Career path */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Trajectoire de carrière" value={localScores.career_path}
                  onChange={e => set('career_path', e.target.value)} placeholder="Expert technique..." />
                <Input label="Prochain rôle visé" value={localScores.next_role}
                  onChange={e => set('next_role', e.target.value)} placeholder="Lead développeur..." />
              </div>

              {/* Succession planning */}
              <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} /> Successeurs identifiés ({localScores.successor_names.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {localScores.successor_names.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center', padding: '8px 0' }}>Aucun successeur défini.</p>
                  )}
                  {localScores.successor_names.map((s: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-muted)', borderRadius: 8 }}>
                      <span style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{s.name}</span>
                      <span style={{ fontSize: 11, color: '#8b5cf6', background: '#f5f3ff', padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>
                        {READINESS[s.readiness] ?? s.readiness}
                      </span>
                      <button onClick={() => removeSuccessor(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
                  <input className="input" placeholder="Nom du successeur..." value={newSuccessorName}
                    onChange={e => setNewSuccessorName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSuccessor()} />
                  <select className="input" value={newSuccessorReadiness} onChange={e => setNewSuccessorReadiness(e.target.value)} style={{ fontSize: 12 }}>
                    {Object.entries(READINESS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <Button size="sm" variant="soft" onClick={addSuccessor}><Plus size={13} /></Button>
                </div>
              </div>

              <div>
                <label className="label">Notes RH</label>
                <textarea className="input" rows={3} style={{ resize: 'none', padding: '8px 12px' }}
                  value={localScores.notes} onChange={e => set('notes', e.target.value)} placeholder="Observations..." />
              </div>

              <Button onClick={save} loading={patchMut.isPending}>Enregistrer le profil</Button>
            </div>
          )}

          {/* ── OKRs TAB ── */}
          {tab === 'okrs' && (
            <div>
              {showOKRForm ? (
                <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Input label="Objectif *" value={okrForm.title} onChange={e => setOKRForm(f => ({ ...f, title: e.target.value }))} placeholder="Améliorer la couverture de tests à 80%" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label className="label">Trimestre</label>
                        <select className="input" value={okrForm.quarter} onChange={e => setOKRForm(f => ({ ...f, quarter: e.target.value }))}>
                          {['Q1 2026','Q2 2026','Q3 2026','Q4 2026'].map(q => <option key={q}>{q}</option>)}
                        </select>
                      </div>
                      <Input label="Progression (%)" type="number" value={okrForm.progress}
                        onChange={e => setOKRForm(f => ({ ...f, progress: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea className="input" rows={2} style={{ resize: 'none', padding: '8px 12px' }}
                        value={okrForm.description} onChange={e => setOKRForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={() => setShowOKRForm(false)}>Annuler</Button>
                      <Button onClick={() => createOKRMut.mutate()} loading={createOKRMut.isPending}>Ajouter</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button variant="soft" onClick={() => setShowOKRForm(true)} style={{ marginBottom: 16 }}>
                  <Plus size={13} /> Nouvel OKR
                </Button>
              )}

              {okrs.length === 0 ? (
                <p style={{ color: 'var(--fg-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>Aucun OKR défini.</p>
              ) : okrs.map((okr: any) => (
                <div key={okr.id} style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', padding: '1px 6px', borderRadius: 4 }}>{okr.quarter}</span>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{okr.title}</span>
                      </div>
                      {okr.description && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>{okr.description}</p>}
                    </div>
                    <button onClick={() => deleteOKRMut.mutate(okr.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', marginLeft: 8 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 6 }}>
                      <div style={{ height: 6, width: `${okr.progress}%`, background: okr.progress >= 100 ? '#10b981' : '#8b5cf6', borderRadius: 6, transition: 'width 0.3s' }} />
                    </div>
                    <input type="range" min={0} max={100} value={okr.progress}
                      onChange={e => updateOKRMut.mutate({ id: okr.id, body: { progress: +e.target.value } })}
                      style={{ width: 80, accentColor: '#8b5cf6' }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#8b5cf6', minWidth: 36 }}>{okr.progress}%</span>
                    {okr.progress >= 100 && <CheckCircle2 size={16} style={{ color: '#10b981' }} />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── PDI TAB ── */}
          {tab === 'pdi' && (
            <div>
              {/* Progress summary */}
              {pdiItems.length > 0 && (
                <div style={{ padding: '12px 14px', background: 'var(--bg-muted)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 6 }}>
                    <div style={{ height: 6, width: `${Math.round(completedPDI / pdiItems.length * 100)}%`, background: '#10b981', borderRadius: 6, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{completedPDI}/{pdiItems.length} actions</span>
                </div>
              )}

              {showPDIForm ? (
                <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Input label="Action de développement *" value={pdiForm.title}
                      onChange={e => setPDIForm(f => ({ ...f, title: e.target.value }))} placeholder="Maîtriser Python pour l'analyse de données" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label className="label">Type d'action</label>
                        <select className="input" value={pdiForm.action_type} onChange={e => setPDIForm(f => ({ ...f, action_type: e.target.value }))}>
                          {Object.entries(ACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Échéance</label>
                        <input type="date" className="input" value={pdiForm.target_date}
                          onChange={e => setPDIForm(f => ({ ...f, target_date: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Notes</label>
                      <textarea className="input" rows={2} style={{ resize: 'none', padding: '8px 12px' }}
                        value={pdiForm.notes} onChange={e => setPDIForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Objectifs, ressources..." />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button variant="ghost" onClick={() => setShowPDIForm(false)}>Annuler</Button>
                      <Button onClick={() => pdiForm.title && createPDIMut.mutate()} loading={createPDIMut.isPending}>Ajouter</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button variant="soft" onClick={() => setShowPDIForm(true)} style={{ marginBottom: 16 }}>
                  <Plus size={13} /> Ajouter une action de développement
                </Button>
              )}

              {pdiItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--fg-muted)' }}>
                  <BookOpen size={32} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13 }}>Aucune action de développement définie.</p>
                </div>
              ) : pdiItems.map((item: any) => {
                const at = ACTION_TYPES[item.action_type] ?? ACTION_TYPES.formation;
                const st = PDI_STATUS[item.status] ?? PDI_STATUS.pending;
                return (
                  <div key={item.id} style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: at.color, background: at.bg, padding: '1px 7px', borderRadius: 5 }}>
                            {at.label}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--fg-muted)' }}>
                          {item.target_date && <span><Clock size={10} /> {safeFormat(item.target_date)}</span>}
                          {item.notes && <span style={{ fontStyle: 'italic' }}>{item.notes.slice(0, 50)}{item.notes.length > 50 ? '…' : ''}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select value={item.status}
                          onChange={e => updatePDIMut.mutate({ id: item.id, body: { status: e.target.value } })}
                          style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: `1px solid ${st.color}44`,
                            background: st.color + '22', color: st.color, fontWeight: 700, cursor: 'pointer' }}>
                          {Object.entries(PDI_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button onClick={() => deletePDIMut.mutate(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TalentsPage() {
  const qc = useQueryClient();
  const [pageTab, setPageTab] = useState<'profiles' | 'mobility'>('profiles');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedTalent, setSelectedTalent] = useState<any>(null);
  const [catFilter, setCatFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  const { data: talents = [], isLoading } = useQuery({ queryKey: ['talents'], queryFn: getTalents });
  const { data: stats }    = useQuery({ queryKey: ['talent-stats'],    queryFn: getStats });
  const { data: mobility = [] } = useQuery({ queryKey: ['talent-mobility'], queryFn: getMobility });

  const bulkMut = useMutation({
    mutationFn: bulkProfile,
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ['talents'] }); toast.success(`${r.created} profils créés`); },
  });

  const filtered = talents.filter((t: any) =>
    (!catFilter || t.talent_category === catFilter) &&
    (!riskFilter || t.flight_risk === riskFilter)
  );

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Gestion des Talents"
        subtitle={`${talents.length} profil${talents.length !== 1 ? 's' : ''} · ${mobility.length} candidats mobilité`}
        action={
          <Button variant="soft" onClick={() => bulkMut.mutate()} loading={bulkMut.isPending}>
            <Users size={14} /> Initialiser profils
          </Button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Profils totaux',      value: stats?.total ?? 0,              color: '#3b82f6', icon: <Users size={16} /> },
          { label: 'Risque départ élevé', value: stats?.high_flight_risk ?? 0,   color: '#ef4444', icon: <AlertTriangle size={16} /> },
          { label: 'Postes critiques',    value: stats?.critical_positions ?? 0, color: '#f59e0b', icon: <Shield size={16} /> },
          { label: 'Perf. moyenne',       value: `${stats?.avg_performance ?? 0}/5`, color: '#10b981', icon: <TrendingUp size={16} /> },
        ].map(s => (
          <div key={s.label} className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Page tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 24, marginBottom: 20 }}>
        {[
          { id: 'profiles', label: `Profils Talent (${talents.length})` },
          { id: 'mobility', label: `Mobilité Interne (${mobility.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setPageTab(t.id as any)} style={{
            padding: '10px 0', fontWeight: 600, fontSize: 14,
            borderBottom: pageTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            color: pageTab === t.id ? 'var(--primary)' : 'var(--fg-muted)',
            background: 'none', border: 'none', cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── PROFILES TAB ── */}
      {pageTab === 'profiles' && (
        <>
          {viewMode === 'grid' && <NineBoxGrid talents={filtered} />}

          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
              <button onClick={() => setViewMode('list')} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'list' ? 'var(--primary)' : 'transparent', color: viewMode === 'list' ? '#fff' : 'var(--fg-muted)' }}><List size={14} /></button>
              <button onClick={() => setViewMode('grid')} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? 'var(--primary)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--fg-muted)' }}><LayoutGrid size={14} /></button>
            </div>
            <button onClick={() => setCatFilter('')}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: !catFilter ? 'var(--primary)' : 'transparent', color: !catFilter ? '#fff' : 'var(--fg)' }}>
              Tous
            </button>
            {Object.entries(TALENT_CATS).map(([k, v]) => (
              <button key={k} onClick={() => setCatFilter(catFilter === k ? '' : k)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${v.color}44`, background: catFilter === k ? v.color : v.bg, color: catFilter === k ? '#fff' : v.color }}>
                {v.label} {stats?.by_category?.[k] ? `(${stats.by_category[k]})` : ''}
              </button>
            ))}
            <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer' }}>
              <option value="">Risque: Tous</option>
              <option value="low">Faible</option>
              <option value="medium">Moyen</option>
              <option value="high">Élevé</option>
            </select>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
              <Award size={40} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 500 }}>Aucun profil talent.</p>
              <p style={{ fontSize: 13, marginBottom: 16 }}>Cliquez "Initialiser profils" pour créer des profils pour tous les employés actifs.</p>
              <Button onClick={() => bulkMut.mutate()} loading={bulkMut.isPending}><Users size={13} /> Initialiser profils</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((t: any) => {
                const emp = t.employees ?? {};
                const cm  = catMeta(t.talent_category ?? 'key_player');
                const rc  = RISK_COLORS[t.flight_risk ?? 'low'];
                const moovAvg = (MOOVWIN.reduce((s, m) => s + (t[m.key] ?? 0), 0) / 5).toFixed(1);
                const pdiCount = 0;
                return (
                  <div key={t.id} className="card card-pad hover-scale"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                    onClick={() => setSelectedTalent(t)}>
                    <Avatar name={emp.full_name} src={emp.photo_url} size={44} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{emp.full_name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: cm.color, background: cm.bg, padding: '1px 7px', borderRadius: 5 }}>{cm.label}</span>
                        {t.is_critical_position && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>⚠ Critique</span>}
                        {t.next_role && <span style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 3 }}><ArrowRight size={10} />{t.next_role}</span>}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>{emp.position} — {emp.department}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, fontSize: 16, color: '#10b981', margin: 0 }}>{t.performance_score ?? '—'}</p>
                        <p style={{ color: 'var(--fg-muted)', margin: 0 }}>Perf.</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, fontSize: 16, color: '#8b5cf6', margin: 0 }}>{t.potential_score ?? '—'}</p>
                        <p style={{ color: 'var(--fg-muted)', margin: 0 }}>Pot.</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, fontSize: 16, color: '#f59e0b', margin: 0 }}>★{moovAvg}</p>
                        <p style={{ color: 'var(--fg-muted)', margin: 0 }}>Moovwin</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: rc, background: rc + '22', padding: '3px 8px', borderRadius: 6 }}>
                        {RISK_LABELS[t.flight_risk ?? 'low']}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--fg-muted)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── MOBILITY TAB ── */}
      {pageTab === 'mobility' && (
        <MobilityView mobility={mobility} onOpenTalent={setSelectedTalent} />
      )}

      {selectedTalent && <TalentDrawer talent={selectedTalent} onClose={() => setSelectedTalent(null)} />}
    </div>
  );
}
