import { useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award, BookOpen, Briefcase, Check, CircleCheck, Clock, CodeXml, Grid3x3, Languages, Library, ListChecks, MessagesSquare, Mic,
  Plus, Scale, Search, ShieldCheck, Table2, Trash2, UserPlus, Users, Wallet, X,
} from 'lucide-react';
import { api, listEmployees, getApiError } from '@/services/api';
import type { Employee } from '@/services/api';
import { RV } from '@/components/motion';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import './TrainingPage.css';

type Course = { id: string; title: string; category: string; provider?: string; duration_hours?: number; cost_dh?: number; description?: string };
type Assignment = { id: string; employee_id: string; training_id: string; status: 'planned' | 'in_progress' | 'completed' | 'cancelled'; assigned_at?: string; completed_at?: string; score?: number | null; training_catalog?: Course; employees?: { id: string; full_name: string; department?: string } };
type Skill = { id: string; name: string; category?: string };
type EmpSkill = { id: string; employee_id: string; skill_id: string; level: 'beginner' | 'intermediate' | 'expert' };

const getCatalog = () => api.get<Course[]>('/training/catalog').then(r => r.data);
const createCourse = (b: Partial<Course>) => api.post<Course>('/training/catalog', b).then(r => r.data);
const deleteCourse = (id: string) => api.delete(`/training/catalog/${id}`);
const getAssignments = () => api.get<Assignment[]>('/training/assignments').then(r => r.data);
const assign = (b: { employee_id: string; training_id: string; status?: string }) => api.post('/training/assignments', b).then(r => r.data);
const updateAssign = (id: string, b: Partial<Assignment>) => api.patch(`/training/assignments/${id}`, b).then(r => r.data);
const deleteAssign = (id: string) => api.delete(`/training/assignments/${id}`);
const getSkills = () => api.get<Skill[]>('/training/skills').then(r => r.data);
const createSkill = (b: { name: string; category?: string }) => api.post<Skill>('/training/skills', b).then(r => r.data);
const getEmpSkills = () => api.get<EmpSkill[]>('/training/employee-skills').then(r => r.data);
const upsertEmpSkill = (b: { employee_id: string; skill_id: string; level: string }) => api.post('/training/employee-skills', b).then(r => r.data);
const removeEmpSkill = (id: string) => api.delete(`/training/employee-skills/${id}`);

type Icon = ComponentType<{ size?: number; style?: CSSProperties }>;
// [label key, tint, text color, icon] — the reference's palette
const CAT: Record<string, [TKey, string, string, Icon]> = {
  technique: ['trn_cat_technique', '#e4f2f4', '#0b5f72', CodeXml], soft_skills: ['trn_cat_soft', '#ece9fb', '#5444b8', MessagesSquare],
  compliance: ['trn_cat_compliance', '#fbe9e6', '#a33a28', Scale], management: ['trn_cat_management', '#fbefda', '#8a5207', Users],
  langue: ['trn_cat_langue', '#e1f5ec', '#0f6f49', Languages], securite: ['trn_cat_securite', '#eef2f4', '#33474f', ShieldCheck],
  leadership: ['trn_cat_leadership', '#ece9fb', '#3d2f99', Mic], digital: ['trn_cat_digital', '#e7eefb', '#2f4bb0', Table2],
  metier: ['trn_cat_metier', '#e4f2f4', '#0b5f72', Briefcase],
};
const catOf = (c?: string) => CAT[c || ''] ?? CAT.technique;
const LV: [TKey, string, string][] = [['trn_lv_none', '#f3f6f7', '#8a9ba3'], ['trn_lv_beginner', '#e4f2f4', '#0b5f72'], ['trn_lv_intermediate', '#9fd6df', '#063d4a'], ['trn_lv_expert', '#0e6f84', '#ffffff']];
const LEVEL_KEYS = ['', 'beginner', 'intermediate', 'expert'] as const;
const ST: Record<string, [TKey, string, string, string]> = {
  planned: ['trn_st_planned', '#eef2f4', '#33474f', '#c3ced3'], in_progress: ['trn_st_progress', '#e4f2f4', '#0b5f72', 'linear-gradient(90deg,#0e6f84,#16b6c8)'],
  completed: ['trn_st_done', '#e1f5ec', '#0f6f49', '#16a06b'], cancelled: ['trn_st_cancelled', '#fbe9e6', '#a33a28', '#df5740'],
};
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, '\u00a0');
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const statLabel: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' };
const statValue: CSSProperties = { fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 };

export default function TrainingPage() {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'catalog' | 'assign' | 'skills'>('catalog');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [enrollFor, setEnrollFor] = useState<Course | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: courses = [], isLoading } = useQuery({ queryKey: ['training', 'catalog'], queryFn: getCatalog });
  const { data: assigns = [] } = useQuery({ queryKey: ['training', 'assignments'], queryFn: getAssignments });
  const { data: skills = [] } = useQuery({ queryKey: ['training', 'skills'], queryFn: getSkills });
  const { data: empSkills = [] } = useQuery({ queryKey: ['training', 'emp-skills'], queryFn: getEmpSkills });
  const { data: empData } = useQuery({ queryKey: ['employees', 'training'], queryFn: () => listEmployees({ status: 'active', limit: 1000 }) });
  const employees = useMemo(() => empData?.data ?? [], [empData]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['training'] });
  const fail = (e: unknown) => notify.error(getApiError(e, t('error')));
  const enroll = useMutation({
    mutationFn: async ({ course, ids }: { course: Course; ids: string[] }) => { for (const id of ids) await assign({ employee_id: id, training_id: course.id, status: 'planned' }); },
    onSuccess: (_, { course, ids }) => { refresh(); notify.success(tf(t(ids.length > 1 ? 'trn_enrolled_many' : 'trn_enrolled_one'), { n: ids.length, title: course.title })); },
    onError: e => { refresh(); fail(e); },
  });
  const setStatus = useMutation({
    mutationFn: ({ a, status }: { a: Assignment; status: Assignment['status'] }) => updateAssign(a.id, { status, ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}) }),
    onSuccess: (_, { a, status }) => { refresh(); if (status === 'completed') notify.success(tf(t('trn_completed_toast'), { name: a.employees?.full_name ?? '', title: a.training_catalog?.title ?? '' })); },
    onError: fail,
  });
  const removeAssign = useMutation({ mutationFn: (a: Assignment) => deleteAssign(a.id), onSuccess: () => { refresh(); notify.success(t('trn_unenrolled')); }, onError: fail });
  const removeCourse = useMutation({ mutationFn: (c: Course) => deleteCourse(c.id), onSuccess: () => { refresh(); notify.success(t('trn_course_deleted')); }, onError: fail });
  const setLevel = useMutation({
    mutationFn: async ({ emp, skill, cur }: { emp: string; skill: string; cur?: EmpSkill }) => {
      const next = (LEVEL_KEYS.indexOf(cur?.level ?? '') + 1) % 4;
      if (next === 0) { if (cur) await removeEmpSkill(cur.id); return; }
      await upsertEmpSkill({ employee_id: emp, skill_id: skill, level: LEVEL_KEYS[next] });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'emp-skills'] }),
    onError: fail,
  });
  const addSkill = useMutation({ mutationFn: (name: string) => createSkill({ name }), onSuccess: () => { refresh(); notify.success(t('trn_skill_added')); }, onError: fail });

  // ── KPIs ──
  const live = assigns.filter(a => a.status !== 'cancelled');
  const done = live.filter(a => a.status === 'completed');
  const year = new Date().getFullYear();
  const spent = live.filter(a => (a.assigned_at ?? '').startsWith(String(year))).reduce((s, a) => s + (a.training_catalog?.cost_dh ?? 0), 0);
  const hours = done.reduce((s, a) => s + (a.training_catalog?.duration_hours ?? 0), 0);
  const trained = new Set(done.map(a => a.employee_id)).size;
  const rate = live.length ? Math.round(done.length / live.length * 100) : 0;
  const enrolledBy = (id: string) => live.filter(a => a.training_id === id).length;

  const needle = q.trim().toLowerCase();
  const list = courses.filter(c => (cat === 'all' || (c.category || 'technique') === cat) && (!needle || `${c.title} ${c.provider ?? ''}`.toLowerCase().includes(needle)));
  const usedCats = Object.keys(CAT).filter(k => courses.some(c => (c.category || 'technique') === k));

  // ── skills matrix: the 6 most assessed skills × the people assessed on them ──
  const levelOf = (emp: string, skill: string) => empSkills.find(x => x.employee_id === emp && x.skill_id === skill);
  const topSkills = [...skills].sort((a, b) => empSkills.filter(x => x.skill_id === b.id).length - empSkills.filter(x => x.skill_id === a.id).length).slice(0, 6);
  const assessed = employees.filter(e => empSkills.some(x => x.employee_id === e.id)).slice(0, 12);
  const matrixPeople = assessed.length ? assessed : employees.slice(0, 8);
  const gaps = topSkills.map(sk => {
    const under = matrixPeople.filter(e => LEVEL_KEYS.indexOf(levelOf(e.id, sk.id)?.level ?? '') < 2);
    // a catalog course covers the skill when its title, description or category mentions it (stem match: manag-, angl-…)
    const stem = norm(sk.name).split(/[^a-z0-9]+/).filter(w => w.length > 2).map(w => w.slice(0, Math.max(4, Math.min(6, w.length - 2))));
    const course = courses.find(c => { const hay = norm(`${c.title} ${c.description ?? ''} ${c.category ?? ''}`); return stem.length > 0 && stem.every(w => hay.includes(w)); });
    const todo = course ? under.filter(e => !live.some(a => a.training_id === course.id && a.employee_id === e.id)) : under;
    return { sk, under, course, todo };
  }).filter(g => g.under.length).sort((a, b) => b.under.length - a.under.length).slice(0, 3);

  const tabs: ['catalog' | 'assign' | 'skills', string, Icon][] = [['catalog', t('trn_tab_catalog'), Library], ['assign', tf(t('trn_tab_assign'), { n: live.length }), ListChecks], ['skills', t('trn_tab_skills'), Grid3x3]];

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('trn_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('trn_subtitle')}</RV>
        </div>
        <RV as="button" variant="up" delay={100} type="button" onClick={() => setAddOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
          <Plus size={16} strokeWidth={2.2} />{t('trn_add')}
        </RV>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        <RV as="div" variant="up" delay={60} style={{ padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(135deg,#0b5f72,#0e7f96)', color: '#ffffff' }}>
          <div style={{ ...statLabel, color: undefined, opacity: 0.9 }}>{t('trn_k_enrol')}</div><div style={statValue}>{live.length}</div>
          <div style={{ fontSize: 12.5, opacity: 0.9 }}>{tf(t('trn_k_enrol_sub'), { n: live.filter(a => a.status === 'in_progress').length })}</div>
        </RV>
        <RV as="div" variant="up" delay={110} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={statLabel}>{t('trn_k_rate')}</div><div style={statValue}>{rate}%</div>
          <div style={{ height: 6, borderRadius: 99, background: '#eef2f4', overflow: 'hidden', marginTop: 6 }}><div style={{ height: '100%', width: `${rate}%`, borderRadius: 99, background: 'linear-gradient(90deg,#0f6f49,#2bbd86)', transition: 'width .6s' }} /></div>
        </RV>
        <RV as="div" variant="up" delay={160} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={statLabel}>{tf(t('trn_k_budget'), { year })}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}><span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-.04em' }}>{fmt(spent)}</span><span style={{ fontSize: 13, color: '#52646d' }}>DH</span></div>
          <div style={{ fontSize: 12.5, color: '#52646d', marginTop: 4 }}>{t('trn_k_budget_sub')}</div>
        </RV>
        <RV as="div" variant="up" delay={210} style={{ padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={statLabel}>{t('trn_k_hours')}</div><div style={statValue}>{fmt(hours)} h</div>
          <div style={{ fontSize: 12.5, color: '#52646d' }}>{trained ? tf(t('trn_k_hours_sub'), { n: (hours / trained).toFixed(1).replace('.', ',') }) : t('trn_k_hours_none')}</div>
        </RV>
      </div>

      <RV as="div" variant="up" delay={120} style={{ display: 'flex', gap: 4, padding: 5, borderRadius: 14, background: '#ffffff', border: '1px solid #e2e8eb', alignSelf: 'flex-start' }}>
        {tabs.map(([k, label, Ic]) => {
          const on = tab === k;
          return (
            <button key={k} type="button" onClick={() => setTab(k)} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 15px', border: 'none', borderRadius: 10, background: 'transparent', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: on ? '#ffffff' : '#52646d' }}>
              {on && <RV as="span" variant="pill" style={{ position: 'absolute', inset: 0, borderRadius: 10, background: '#0a1c24' }} />}
              <Ic size={15} style={{ position: 'relative' }} /><span style={{ position: 'relative' }}>{label}</span>
            </button>
          );
        })}
      </RV>

      {tab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <RV as="div" variant="up" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}>
              <Search size={15} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', marginTop: -7.5, color: '#7d8f97', pointerEvents: 'none' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('trn_search')} style={{ width: '100%', height: 40, paddingInline: '36px 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' }} className="trn-f1" />
            </div>
            {['all', ...usedCats].map(k => {
              const on = cat === k;
              return <button key={k} type="button" onClick={() => setCat(k)} style={{ height: 34, padding: '0 12px', borderRadius: 99, border: `1px solid ${on ? '#0a1c24' : '#e2e8eb'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{k === 'all' ? t('trn_all') : t(catOf(k)[0])}</button>;
            })}
          </RV>
          {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
              {list.map((c, i) => {
                const m = catOf(c.category); const Ic = m[3];
                return (
                  <RV key={c.id} as="div" variant="up" delay={Math.min(i, 12) * 50} style={{ display: 'flex', flexDirection: 'column', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden', transition: 'box-shadow .2s,transform .2s,border-color .2s' }} className="trn-h1">
                    <div style={{ position: 'relative', height: 92, padding: 14, background: `linear-gradient(135deg,${m[1]},#ffffff)`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, overflow: 'hidden' }}>
                      <span style={{ position: 'relative', fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#ffffff', color: m[2] }}>{t(m[0])}</span>
                      <button type="button" aria-label={t('delete')} title={t('delete')} onClick={() => { if (window.confirm(tf(t('trn_confirm_delete'), { title: c.title }))) removeCourse.mutate(c); }} className="trn-del"><Trash2 size={13} /></button>
                      <span style={{ position: 'absolute', insetInlineEnd: 14, bottom: -12, display: 'inline-flex', color: m[2], opacity: 0.2 }}><Ic size={58} /></span>
                    </div>
                    <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '-.02em', lineHeight: 1.25 }}>{c.title}</div>
                      <div style={{ fontSize: 12.5, color: '#5f7079' }}>{c.provider || '—'}</div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 10, fontSize: 12.5, color: '#33474f' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={13} style={{ color: '#7d8f97' }} />{c.duration_hours ?? 0} h</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Wallet size={13} style={{ color: '#7d8f97' }} />{fmt(c.cost_dh ?? 0)} DH</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Users size={13} style={{ color: '#7d8f97' }} />{tf(t('trn_enrolled_n'), { n: enrolledBy(c.id) })}</span>
                      </div>
                      <button type="button" onClick={() => setEnrollFor(c)} style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 38, borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#0a1c24', cursor: 'pointer' }} className="trn-h2">
                        <UserPlus size={14} />{t('trn_enroll')}
                      </button>
                    </div>
                  </RV>
                );
              })}
            </div>
          )}
          {!isLoading && !list.length && <div style={{ padding: '40px 20px', borderRadius: 18, border: '1px dashed #d0dadf', textAlign: 'center', fontSize: 14, color: '#52646d' }}>{courses.length ? t('trn_no_match') : t('trn_none')}</div>}
        </div>
      )}

      {tab === 'assign' && (
        <RV as="div" variant="up" style={{ borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 900 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px,1.3fr) minmax(220px,1.8fr) 110px 170px 80px 190px', alignItems: 'center', padding: '11px 20px', background: '#f8fafb', borderBottom: '1px solid #eef2f4', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>
                <span>{t('trn_col_emp')}</span><span>{t('trn_col_course')}</span><span>{t('trn_col_status')}</span><span>{t('trn_col_progress')}</span><span>{t('trn_col_date')}</span><span style={{ textAlign: 'end' }}>{t('trn_col_result')}</span>
              </div>
              {!live.length && <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 14, color: '#52646d' }}>{t('trn_no_enrol')}</div>}
              {live.map((a, i) => {
                const st = ST[a.status] ?? ST.planned;
                const pct = a.status === 'completed' ? 100 : a.status === 'in_progress' ? 50 : 0;
                const name = a.employees?.full_name || '—';
                const date = (a.status === 'completed' ? a.completed_at : a.assigned_at) ?? '';
                return (
                  <RV key={a.id} as="div" variant="up" delay={Math.min(i, 12) * 40} style={{ display: 'grid', gridTemplateColumns: 'minmax(190px,1.3fr) minmax(220px,1.8fr) 110px 170px 80px 190px', alignItems: 'center', padding: '11px 20px', borderBottom: '1px solid #eef2f4', transition: 'background .15s' }} className="trn-h3">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(name), color: '#ffffff', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{initialsOf(name)}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                    </span>
                    <span style={{ fontSize: 13.5, color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingInlineEnd: 12 }}>{a.training_catalog?.title ?? '—'}</span>
                    <span><span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: st[1], color: st[2], whiteSpace: 'nowrap' }}>{t(st[0])}</span></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, paddingInlineEnd: 16 }}>
                      <span style={{ flex: 1, height: 7, borderRadius: 99, background: '#eef2f4', overflow: 'hidden' }}><span className={a.status === 'in_progress' ? 'wedy-shimmer' : undefined} style={{ display: 'block', height: '100%', width: `${pct}%`, borderRadius: 99, background: st[3], transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} /></span>
                      <span style={{ width: 34, fontFamily: "'Geist Mono',monospace", fontSize: 11.5, color: '#52646d', textAlign: 'end' }}>{a.status === 'in_progress' ? '…' : `${pct}%`}</span>
                    </span>
                    <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12.5, color: '#52646d' }}>{date ? date.slice(5, 10).split('-').reverse().join('/') : '—'}</span>
                    <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
                      {a.status === 'planned' && <button type="button" onClick={() => setStatus.mutate({ a, status: 'in_progress' })} className="trn-act">{t('trn_start')}</button>}
                      {a.status !== 'completed' && <button type="button" onClick={() => setStatus.mutate({ a, status: 'completed' })} className="trn-act trn-ok"><Check size={13} />{t('trn_mark_done')}</button>}
                      {a.status === 'completed' && (a.score ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: '#0f6f49' }}><Award size={14} />{a.score}/100</span> : <RV as="span" variant="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#0f6f49' }}><CircleCheck size={14} />{t('trn_done_label')}</RV>)}
                      {a.status !== 'completed' && <button type="button" aria-label={t('trn_unenroll')} title={t('trn_unenroll')} onClick={() => { if (window.confirm(tf(t('trn_confirm_unenroll'), { name }))) removeAssign.mutate(a); }} className="trn-del" style={{ position: 'static' }}><X size={13} /></button>}
                    </span>
                  </RV>
                );
              })}
            </div>
          </div>
        </RV>
      )}

      {tab === 'skills' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          <RV as="div" variant="up" style={{ flex: '2 1 560px', minWidth: 0, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '16px 20px' }}>
              <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('trn_matrix')}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12.5, color: '#52646d' }}>{t('trn_matrix_hint')}</span>
                <button type="button" onClick={() => { const n = window.prompt(t('trn_new_skill')); if (n?.trim()) addSkill.mutate(n.trim()); }} className="trn-act"><Plus size={13} />{t('trn_skill')}</button>
              </span>
            </div>
            {!topSkills.length ? (
              <div style={{ padding: '10px 20px 28px', fontSize: 13.5, color: '#52646d' }}>{t('trn_no_skills')}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 740, padding: '0 20px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${topSkills.length},minmax(86px,1fr))`, gap: 6, alignItems: 'end', paddingBottom: 4 }}>
                    <span />{topSkills.map(k => <span key={k.id} style={{ fontSize: 11.5, fontWeight: 700, color: '#33474f', textAlign: 'center' }}>{k.name}</span>)}
                  </div>
                  {matrixPeople.map((e: Employee, ri) => (
                    <RV key={e.id} as="div" variant="up" delay={Math.min(ri, 12) * 40} style={{ display: 'grid', gridTemplateColumns: `180px repeat(${topSkills.length},minmax(86px,1fr))`, gap: 6, alignItems: 'center', marginTop: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(e.full_name), color: '#ffffff', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{initialsOf(e.full_name)}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.full_name}</span>
                      </span>
                      {topSkills.map(sk => {
                        const cur = levelOf(e.id, sk.id);
                        const lv = LV[LEVEL_KEYS.indexOf(cur?.level ?? '')] ?? LV[0];
                        return (
                          <button key={sk.id} type="button" onClick={() => setLevel.mutate({ emp: e.id, skill: sk.id, cur })} title={`${e.full_name} · ${sk.name} : ${t(lv[0])}`}
                            style={{ height: 38, border: 'none', borderRadius: 9, background: lv[1], color: lv[2], fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'background .25s,color .25s,transform .15s' }} className="trn-h4">
                            {cur ? t(lv[0]) : '—'}
                          </button>
                        );
                      })}
                    </RV>
                  ))}
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 16, fontSize: 12, color: '#33474f' }}>
                    {LV.map(([k, bg], i) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: bg, border: i === 0 ? '1px solid #e2e8eb' : 'none' }} />{t(k)}</span>)}
                  </div>
                </div>
              </div>
            )}
          </RV>
          <RV as="div" variant="up" delay={100} style={{ flex: '1 1 300px', minWidth: 0, padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/wedy-avatar.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />
              <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('trn_gaps')}</span>
            </div>
            {!gaps.length && <div style={{ marginTop: 14, fontSize: 13.5, color: '#52646d' }}>{t('trn_no_gaps')}</div>}
            {gaps.map(({ sk, under, course, todo }, gi) => {
              const pal = [['#fbefda', 'rgba(230,169,72,.4)', '#8a5207'], ['#e4f2f4', 'rgba(22,182,200,.35)', '#0b5f72'], ['#ece9fb', 'rgba(109,90,214,.3)', '#5444b8']][gi];
              return (
                <div key={sk.id} style={{ marginTop: 14, padding: 14, borderRadius: 14, background: pal[0], border: `1px solid ${pal[1]}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: pal[2] }}><BookOpen size={16} />{tf(t('trn_gap_title'), { skill: sk.name, n: under.length })}</div>
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: '#33474f' }}>
                    {under.slice(0, 6).map(e => e.full_name).join(', ')}{under.length > 6 ? '…' : ''}. {course ? tf(t('trn_gap_course'), { title: course.title, h: course.duration_hours ?? 0 }) : t('trn_gap_no_course')}
                  </div>
                  {course && todo.length > 0 && (
                    <button type="button" disabled={enroll.isPending} onClick={() => enroll.mutate({ course, ids: todo.map(e => e.id) })} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', border: 'none', borderRadius: 10, background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }} className="trn-h5">
                      <UserPlus size={14} />{tf(t('trn_enroll_n'), { n: todo.length })}
                    </button>
                  )}
                  {course && !todo.length && <RV as="span" variant="pill" style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#0f6f49' }}><CircleCheck size={14} />{t('trn_gap_sent')}</RV>}
                </div>
              );
            })}
          </RV>
        </div>
      )}

      <EnrollModal course={enrollFor} onClose={() => setEnrollFor(null)} employees={employees} taken={new Set(live.filter(a => a.training_id === enrollFor?.id).map(a => a.employee_id))}
        onConfirm={ids => { if (enrollFor) enroll.mutate({ course: enrollFor, ids }); setEnrollFor(null); }} />
      <AddCourseDrawer open={addOpen} onClose={() => setAddOpen(false)} onCreated={refresh} />
    </div>
  );
}

function EnrollModal({ course, onClose, employees, taken, onConfirm }: { course: Course | null; onClose: () => void; employees: Employee[]; taken: Set<string>; onConfirm: (ids: string[]) => void }) {
  const { t } = useLang();
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [forId, setForId] = useState<string | null>(null);
  if ((course?.id ?? null) !== forId) { setForId(course?.id ?? null); setPick(new Set()); setQ(''); }
  if (!course) return null;
  const needle = q.trim().toLowerCase();
  const list = employees.filter(e => !needle || `${e.full_name} ${e.position ?? ''} ${e.department ?? ''}`.toLowerCase().includes(needle));
  const n = pick.size;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(6,20,26,.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <RV as="div" variant="scale" role="dialog" aria-modal="true" style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, width: 'min(480px,calc(100vw - 32px))', maxHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', borderRadius: 22, background: '#ffffff', boxShadow: '0 40px 100px -30px rgba(6,20,26,.6)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px', borderBottom: '1px solid #eef2f4' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-.02em' }}>{tf(t('trn_enroll_to'), { title: course.title })}</div>
            <div style={{ fontSize: 13, color: '#52646d', marginTop: 2 }}>{[course.provider, `${course.duration_hours ?? 0} h`, tf(t('trn_per_person'), { cost: fmt(course.cost_dh ?? 0) })].filter(Boolean).join(' · ')}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')} style={{ width: 36, height: 36, border: 'none', borderRadius: 10, background: '#f3f6f7', color: '#52646d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={16} /></button>
        </div>
        <div style={{ padding: '10px 14px 0' }}><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('trn_search_people')} style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 10, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 13.5, outline: 'none' }} className="trn-f1" /></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {list.map(e => {
            const already = taken.has(e.id), on = pick.has(e.id);
            return (
              <button key={e.id} type="button" disabled={already} onClick={() => setPick(s => { const x = new Set(s); if (x.has(e.id)) x.delete(e.id); else x.add(e.id); return x; })}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 8px', border: 'none', borderRadius: 11, background: 'transparent', fontFamily: 'inherit', textAlign: 'start', cursor: already ? 'default' : 'pointer', opacity: already ? 0.5 : 1 }} className="trn-h6">
                <span style={{ width: 20, height: 20, borderRadius: 6, border: '1.5px solid #c3ced3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ffffff', background: '#ffffff' }}>
                  {on && <span style={{ width: 20, height: 20, borderRadius: 6, background: '#0e6f84', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} strokeWidth={3} /></span>}
                </span>
                <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(e.full_name), color: '#ffffff', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{initialsOf(e.full_name)}</span>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#0a1c24' }}>{e.full_name}</span><span style={{ display: 'block', fontSize: 12, color: '#5f7079' }}>{e.position || '—'}</span></span>
                {already && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#e1f5ec', color: '#0f6f49' }}>{t('trn_already')}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: '1px solid #eef2f4', background: '#f8fafb', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#52646d' }}>{t('trn_est_cost')} · <strong style={{ color: '#0a1c24' }}>{fmt((course.cost_dh ?? 0) * n)} DH</strong></span>
          <button type="button" disabled={!n} onClick={() => onConfirm([...pick])} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: n ? 'pointer' : 'default', opacity: n ? 1 : 0.5 }}>
            <Check size={15} strokeWidth={2.4} />{n ? tf(t(n > 1 ? 'trn_enroll_many' : 'trn_enroll_one'), { n }) : t('trn_pick_people')}
          </button>
        </div>
      </RV>
    </>
  );
}

function AddCourseDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const empty = { title: '', category: 'technique', provider: '', duration_hours: '8', cost_dh: '0', description: '' };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty, v: string) => setF(x => ({ ...x, [k]: v }));
  const mut = useMutation({
    mutationFn: () => createCourse({ title: f.title.trim(), category: f.category, provider: f.provider.trim() || undefined, duration_hours: parseInt(f.duration_hours) || 0, cost_dh: parseFloat(f.cost_dh) || 0, description: f.description.trim() || undefined }),
    onSuccess: () => { notify.success(t('trn_course_added')); setF(empty); onCreated(); onClose(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const field: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
  const label: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };
  return (
    <Drawer open={open} onClose={onClose} title={t('trn_add')} subtitle={t('trn_add_sub')} icon={<Library size={17} />} width={480}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!f.title.trim() || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Plus size={14} />} {t('trn_add')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={label}>{t('trn_f_title')} *</label><input value={f.title} onChange={e => set('title', e.target.value)} style={field} autoFocus /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={label}>{t('trn_f_cat')}</label><select value={f.category} onChange={e => set('category', e.target.value)} style={field}>{Object.keys(CAT).map(k => <option key={k} value={k}>{t(CAT[k][0])}</option>)}</select></div>
          <div><label style={label}>{t('trn_f_provider')}</label><input value={f.provider} onChange={e => set('provider', e.target.value)} style={field} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={label}>{t('trn_f_hours')}</label><input type="number" min={0} value={f.duration_hours} onChange={e => set('duration_hours', e.target.value)} style={field} /></div>
          <div><label style={label}>{t('trn_f_cost')}</label><input type="number" min={0} value={f.cost_dh} onChange={e => set('cost_dh', e.target.value)} style={field} /></div>
        </div>
        <div><label style={label}>{t('trn_f_desc')}</label><textarea rows={4} value={f.description} onChange={e => set('description', e.target.value)} style={{ ...field, height: 'auto', padding: '10px 12px', resize: 'vertical' }} /></div>
      </div>
    </Drawer>
  );
}
