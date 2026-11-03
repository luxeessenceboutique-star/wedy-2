// Stagiaires — the Employees layout (design handoff: « Wedy Employees, contract = Stage »): header actions, quick-filter
// stats, filters, list / grid / kanban views, plus the full register table (« ETAT DES STAGIAIRES »). Interns are rows of
// `employees` with status = intern; the register columns, the onboarding (checklist, mentor, objectives, evaluations) and the
// documents are kept. A row opens the intern's file (side drawer).
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight, Building2, Calendar, CalendarClock, Check, ChevronDown, ClipboardList, Clock, Columns3, Download, Eye, FileSpreadsheet, FileUp,
  GraduationCap, LayoutGrid, List, Mail, Pencil, Plus, Search, SearchX, Sheet, Trash2, Upload, UserCheck, X,
} from 'lucide-react';
import { convertIntern, createIntern, deleteIntern, getApiError, listDepartments, listInterns, updateIntern, type Intern } from '@/services/api';
import { CVImportModal } from '@/components/employees/CVImportModal';
import { SmartImportModal } from '@/components/employees/SmartImportModal';
import { ExportModal } from '@/components/employees/ExportModal';
import { DepartmentsModal } from '@/components/employees/DepartmentsModal';
import { InternFormDrawer } from '@/components/interns/InternFormDrawer';
import { InternDossier, type DossierTab } from '@/components/interns/InternDossier';
import {
  INTERN_COLS, INTERNSHIP_TYPES, STAGE_KEY, STAGE_OPTIONS, TYPE_KEY, daysLeft, fmtDate, linkLabel, periodOf, stageTone, typeTone,
} from '@/components/interns/internMeta';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import './EmployeesView.css';
import './InternsPage.css';

type View = 'list' | 'grid' | 'kanban' | 'register';
type Group = 'stage' | 'type' | 'period' | 'department';
type Quick = '' | 'ongoing' | 'ending' | 'upcoming' | 'hired';
const readLS = <T extends string>(k: string, ok: readonly T[], d: T): T => { try { const v = localStorage.getItem(k) as T; return ok.includes(v) ? v : d; } catch { return d; } };
const writeLS = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* memory only */ } };
const ENDING = 15;
const photo = (src?: string) => (src ? (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/') ? src : `data:image/jpeg;base64,${src}`) : '');

function Av({ i, size }: { i: Intern; size: number }) {
  const s: CSSProperties = { width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: Math.round(size * 0.34), fontWeight: 700, flexShrink: 0, background: i.photo_url ? `center/cover url(${photo(i.photo_url)})` : avatarGradient(i.full_name) };
  return <span style={s}>{!i.photo_url && initialsOf(i.full_name)}</span>;
}

function Check20({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={e => { e.stopPropagation(); onClick(); }} aria-label={label} className="stg-chk">{on && <span><Check size={13} strokeWidth={3} /></span>}</button>;
}

export default function InternsPage() {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [stage, setStage] = useState('');
  const [type, setType] = useState('');
  const [quick, setQuick] = useState<Quick>('');
  const [view, setViewS] = useState<View>(() => readLS('interns_view', ['list', 'grid', 'kanban', 'register'] as const, 'list'));
  const setView = (v: View) => { setViewS(v); writeLS('interns_view', v); };
  const [group, setGroupS] = useState<Group>(() => readLS('interns_kanban_group', ['stage', 'type', 'period', 'department'] as const, 'stage'));
  const setGroup = (g: Group) => { setGroupS(g); writeLS('interns_kanban_group', g); };
  const [sel, setSel] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [showCV, setShowCV] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDepts, setShowDepts] = useState(false);
  const [form, setForm] = useState<Partial<Intern> | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [tab, setTab] = useState<DossierTab>('info');
  const [showEmpty, setShowEmpty] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['interns'], queryFn: () => listInterns({ limit: 1000 }) });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const all = useMemo(() => data?.data ?? [], [data]);
  const openId = params.get('i');
  const cur = all.find(i => i.id === openId) ?? null;
  const openFile = (i: Intern, tb: DossierTab = 'info') => { setTab(tb); setParams(p => { const n = new URLSearchParams(p); n.set('i', i.id); return n; }, { replace: true }); };
  const closeFile = () => setParams(p => { const n = new URLSearchParams(p); n.delete('i'); return n; }, { replace: true });

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setImportOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  // ── mutations ────────────────────────────────────────────────────────────────
  const refresh = () => ['interns', 'employees', 'dashboard-kpis', 'dashboard-metrics'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  const fail = (e: unknown) => notify.error(getApiError(e, t('error')));
  const createMut = useMutation({
    mutationFn: createIntern,
    onSuccess: i => { refresh(); setForm(null); setNewId(i.id); setQ(''); setDept(''); setStage(''); setType(''); setQuick(''); notify.success(tf(t('stg_added'), { name: i.full_name })); },
    onError: fail,
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Intern> }) => updateIntern(id, body),
    onSuccess: i => { refresh(); setForm(null); notify.success(tf(t('stg_updated'), { name: i.full_name })); },
    onError: fail,
  });
  // inline / drag-and-drop changes: instant, rolled back on error
  const patchMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Intern> }) => updateIntern(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['interns'] });
      const snap = qc.getQueryData<{ data: Intern[]; count: number }>(['interns']);
      qc.setQueryData<{ data: Intern[]; count: number }>(['interns'], old => (old ? { ...old, data: old.data.map(i => (i.id === id ? { ...i, ...patch } : i)) } : old));
      return { snap };
    },
    onError: (e, _v, ctx) => { if (ctx?.snap) qc.setQueryData(['interns'], ctx.snap); fail(e); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['interns'] }),
  });
  const deleteMut = useMutation({
    mutationFn: (i: Intern) => deleteIntern(i.id),
    onSuccess: (_d, i) => { refresh(); setSel(s => s.filter(x => x !== i.id)); if (openId === i.id) closeFile(); notify.success(tf(t('stg_deleted'), { name: i.full_name })); },
    onError: fail,
  });
  const convertMut = useMutation({
    mutationFn: (i: Intern) => convertIntern(i.id),
    onSuccess: e => { refresh(); closeFile(); notify.success(tf(t('stg_converted'), { name: e.full_name })); },
    onError: fail,
  });
  const askDelete = (i: Intern) => { if (window.confirm(tf(t('stg_confirm_delete'), { name: i.full_name }))) deleteMut.mutate(i); };
  const askConvert = (i: Intern) => { if (window.confirm(tf(t('stg_confirm_convert'), { name: i.full_name }))) convertMut.mutate(i); };

  // ── filtering ────────────────────────────────────────────────────────────────
  const ending = (i: Intern) => { const d = daysLeft(i.internship_end); return d !== null && d >= 0 && d <= ENDING && i.internship_status !== 'Embauché'; };
  const isOngoing = (i: Intern) => i.internship_status === 'En cours' || i.internship_status === 'À distance' || (!i.internship_status && periodOf(i.internship_start, i.internship_end) === 'ongoing');
  const qq = q.trim().toLowerCase();
  const list = all.filter(i =>
    (!qq || [i.full_name, i.email, i.position, i.department, i.school, i.manager, i.education_summary].some(x => (x ?? '').toLowerCase().includes(qq)))
    && (!dept || (i.department ?? '') === dept) && (!stage || (i.internship_status ?? '') === stage) && (!type || (i.internship_type ?? '') === type)
    && (quick !== 'ongoing' || isOngoing(i)) && (quick !== 'ending' || ending(i))
    && (quick !== 'upcoming' || periodOf(i.internship_start, i.internship_end) === 'upcoming') && (quick !== 'hired' || i.internship_status === 'Embauché'));
  const counts = { ongoing: all.filter(isOngoing).length, ending: all.filter(ending).length, upcoming: all.filter(i => periodOf(i.internship_start, i.internship_end) === 'upcoming').length, hired: all.filter(i => i.internship_status === 'Embauché').length };
  const resetFilters = () => { setQ(''); setDept(''); setStage(''); setType(''); setQuick(''); };
  const deptOptions = Array.from(new Set([...depts.map(d => d.name), ...all.map(i => i.department).filter(Boolean) as string[]]));
  const allSel = list.length > 0 && list.every(i => sel.includes(i.id));
  const toggle = (id: string) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const selected = list.filter(i => sel.includes(i.id));

  // ── kanban ───────────────────────────────────────────────────────────────────
  const columns: { id: string; label: string; dot: string }[] = group === 'stage'
    ? [...STAGE_OPTIONS.map(o => ({ id: o, label: t(STAGE_KEY[o]), dot: stageTone(o)[2] })), { id: '', label: t('stg_unset'), dot: '#c3ced3' }]
    : group === 'type' ? [...INTERNSHIP_TYPES.map(o => ({ id: o, label: t(TYPE_KEY[o]), dot: typeTone(o)[1] })), { id: '', label: t('stg_unset'), dot: '#c3ced3' }]
      : group === 'period' ? [{ id: 'ongoing', label: t('stg_p_ongoing'), dot: '#16a06b' }, { id: 'upcoming', label: t('stg_p_upcoming'), dot: '#0e6f84' }, { id: 'done', label: t('stg_p_done'), dot: '#7d8f97' }, { id: 'none', label: t('stg_p_none'), dot: '#df9326' }]
        : [...deptOptions.map(d => ({ id: d, label: d, dot: '#16b6c8' })), { id: '', label: t('stg_no_dept'), dot: '#c3ced3' }];
  const colOf = (i: Intern) => (group === 'stage' ? i.internship_status ?? '' : group === 'type' ? i.internship_type ?? '' : group === 'period' ? periodOf(i.internship_start, i.internship_end) : i.department ?? '');
  const hidden = (group === 'stage' || group === 'type') && !showEmpty ? columns.filter(c => c.id && !list.some(i => colOf(i) === c.id)).length : 0;
  const shownCols = hidden ? columns.filter(c => !c.id || list.some(i => colOf(i) === c.id)) : columns;
  const drag = (i: Intern) => (ev: DragEvent<HTMLElement>) => { try { ev.dataTransfer.setData('text/plain', i.id); } catch { /* ignore */ } };
  const drop = (col: string) => (ev: DragEvent<HTMLElement>) => {
    ev.preventDefault();
    if (group === 'period') return;
    let id = ''; try { id = ev.dataTransfer.getData('text/plain'); } catch { /* ignore */ }
    const i = all.find(x => x.id === id);
    if (!i || colOf(i) === col) return;
    const v = col || null;
    patchMut.mutate({ id, patch: (group === 'stage' ? { internship_status: v } : group === 'type' ? { internship_type: v } : { department: v }) as Partial<Intern> },
      { onSuccess: () => notify.success(tf(t('stg_moved'), { name: i.full_name })) });
  };

  const setInline = (i: Intern, k: 'internship_status' | 'internship_type') => (e: ChangeEvent<HTMLSelectElement>) =>
    patchMut.mutate({ id: i.id, patch: { [k]: e.target.value || null } as Partial<Intern> }, { onSuccess: () => notify.success(tf(t('stg_updated'), { name: i.full_name })) });

  const stageChip = (i: Intern, withSelect: boolean) => {
    const [bg, ink, dot] = stageTone(i.internship_status);
    return (
      <span style={{ position: 'relative', display: 'inline-flex', justifySelf: 'start', maxWidth: '100%' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '4px 9px 4px 8px', borderRadius: 99, background: bg, color: ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
          {i.internship_status ? t(STAGE_KEY[i.internship_status] ?? 'stg_none') || i.internship_status : t('stg_set_status')}
          {withSelect && <ChevronDown size={12} style={{ flexShrink: 0 }} />}
        </span>
        {withSelect && (
          <select value={i.internship_status ?? ''} onChange={setInline(i, 'internship_status')} onClick={e => e.stopPropagation()} title={t('stg_change_status')} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>
            <option value="">{t('stg_unset')}</option>
            {i.internship_status && !STAGE_OPTIONS.includes(i.internship_status) && <option value={i.internship_status}>{i.internship_status}</option>}
            {STAGE_OPTIONS.map(o => <option key={o} value={o}>{t(STAGE_KEY[o])}</option>)}
          </select>
        )}
      </span>
    );
  };
  const typeChip = (i: Intern) => {
    if (!i.internship_type) return <span style={{ fontSize: 12.5, color: '#9fb4bb' }}>—</span>;
    const [bg, ink] = typeTone(i.internship_type);
    return <span title={i.internship_type} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: bg, color: ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'inline-block' }}>{TYPE_KEY[i.internship_type] ? t(TYPE_KEY[i.internship_type]) : i.internship_type}</span>;
  };
  const endCell = (i: Intern) => {
    const d = daysLeft(i.internship_end);
    if (ending(i)) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: '#fbe9e6', color: '#a33a28' }}><Clock size={12} />{tf(t('stg_d_left_short'), { n: d ?? 0 })}</span>;
    return <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12.5, color: '#52646d' }}>{fmtDate(i.internship_end)}</span>;
  };
  const ext = (url?: string | null) => (!url ? <span style={{ color: '#c3ced3' }}>—</span> : /^https?:\/\//.test(url) ? <a href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title={url} style={{ color: '#0e6f84', fontWeight: 600 }}>{linkLabel(url)} ↗</a> : <span title={url}>{url}</span>);

  const QUICK: [Quick, TKey, number, typeof Calendar, string, string][] = [
    ['ongoing', 'stg_q_ongoing', counts.ongoing, GraduationCap, '#e4f2f4', '#0e6f84'],
    ['ending', 'stg_q_ending', counts.ending, Clock, '#fbe9e6', '#df5740'],
    ['upcoming', 'stg_q_upcoming', counts.upcoming, CalendarClock, '#ece9fb', '#6d5ad6'],
    ['hired', 'stg_q_hired', counts.hired, UserCheck, '#e1f5ec', '#16a06b'],
  ];
  const VIEWS: [View, TKey, typeof List][] = [['list', 'emp_liste', List], ['grid', 'emp_grille', LayoutGrid], ['kanban', 'emp_kanban', Columns3], ['register', 'stg_register', Sheet]];
  const GROUPS: [Group, TKey][] = [['stage', 'stg_g_stage'], ['type', 'stg_g_type'], ['period', 'stg_g_period'], ['department', 'stg_g_dept']];
  const REG_COLS: TKey[] = ['stg_f_type', 'stg_f_status', 'stg_f_mission', 'stg_f_dept', 'stg_f_study', 'stg_f_school', 'stg_f_email', 'stg_f_phone', 'stg_f_start', 'stg_f_end', 'stg_f_period', 'stg_f_school_contact', 'stg_f_obs', 'stg_f_code', 'stg_f_demo', 'stg_f_cv_link', 'stg_f_note_rh', 'stg_f_note_test'];

  const actions = (i: Intern) => (
    <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
      <button type="button" onClick={e => { e.stopPropagation(); openFile(i, 'onboarding'); }} aria-label={t('stg_t_onboarding')} title={t('stg_t_onboarding')} className="stg-act emp-h9"><ClipboardList size={16} /></button>
      <button type="button" onClick={e => { e.stopPropagation(); openFile(i); }} aria-label={t('stg_open_file')} title={t('stg_open_file')} className="stg-act emp-h8"><Eye size={16} /></button>
      <button type="button" onClick={e => { e.stopPropagation(); setForm(i); }} aria-label={t('stg_edit')} title={t('stg_edit')} className="stg-act emp-h9"><Pencil size={15} /></button>
      <button type="button" onClick={e => { e.stopPropagation(); askDelete(i); }} aria-label={t('stg_delete')} title={t('stg_delete')} className="stg-act emp-h10"><Trash2 size={16} /></button>
    </span>
  );

  return (
    <>
      <div className="stg-page">
        <div className="stg-head">
          <div>
            <RV as="div" variant="up" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="stg-h1">{t('interns')}</h1>
              <span className="stg-count">{all.length}</span>
            </RV>
            <RV as="p" variant="up" delay={60} className="stg-sub">{t('stg_subtitle')}</RV>
          </div>
          <RV as="div" variant="up" delay={100} style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setShowDepts(true)} className="stg-btn emp-h1"><Building2 size={15} />{t('emp_departements')}</button>
            <button type="button" onClick={() => setImportOpen(o => !o)} className="stg-btn emp-h1"><Upload size={15} />{t('emp_importer')}<ChevronDown size={14} /></button>
            <button type="button" onClick={() => setShowExport(true)} className="stg-btn emp-h1"><Download size={15} />{t('emp_exporter')}</button>
            <button type="button" onClick={() => setForm({})} className="stg-cta"><span className="wedy-shine" /><Plus size={16} strokeWidth={2.2} /><span>{t('stg_add')}</span></button>
            {importOpen && (
              <RV as="div" variant="up" className="stg-menu">
                <button type="button" onClick={() => { setImportOpen(false); setShowImport(true); }} className="emp-h2">
                  <span style={{ background: '#e1f5ec', color: '#16a06b' }}><FileSpreadsheet size={16} /></span>
                  <span><b>{t('emp_import_intelligent')}</b><small>{t('emp_excel_ou_csv_colonnes_detectees')}</small></span>
                </button>
                <button type="button" onClick={() => { setImportOpen(false); setShowCV(true); }} className="emp-h2">
                  <span style={{ background: '#ece9fb', color: '#6d5ad6' }}><FileUp size={16} /></span>
                  <span><b>{t('emp_importer_un_cv')} <em>IA</em></b><small>{t('stg_cv_import_s')}</small></span>
                </button>
              </RV>
            )}
          </RV>
        </div>

        <div className="stg-quick">
          {QUICK.map(([k, key, n, Icon, tint, ink], idx) => (
            <RV key={k} as="button" variant="up" delay={120 + idx * 50} type="button" onClick={() => setQuick(quick === k ? '' : k)} className={`stg-q emp-h3${quick === k ? ' on' : ''}`}>
              <span className="stg-q-ic" style={{ background: tint, color: ink }}><Icon size={18} /></span>
              <span><b>{n}</b><small>{t(key)}</small></span>
            </RV>
          ))}
        </div>

        <RV as="div" variant="up" delay={150} className="stg-filters">
          <div className="stg-search"><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder={t('stg_search')} className="emp-f4" /></div>
          <select value={dept} onChange={e => setDept(e.target.value)} className="stg-sel"><option value="">{t('emp_tous_les_services')}</option>{deptOptions.map(d => <option key={d} value={d}>{d}</option>)}</select>
          <select value={stage} onChange={e => setStage(e.target.value)} className="stg-sel"><option value="">{t('stg_all_status')}</option>{STAGE_OPTIONS.map(o => <option key={o} value={o}>{t(STAGE_KEY[o])}</option>)}</select>
          <select value={type} onChange={e => setType(e.target.value)} className="stg-sel"><option value="">{t('stg_all_types')}</option>{INTERNSHIP_TYPES.map(o => <option key={o} value={o}>{t(TYPE_KEY[o])}</option>)}</select>
          <div className="stg-views">
            {VIEWS.map(([k, key, Icon]) => (
              <button key={k} type="button" onClick={() => setView(k)} aria-label={t(key)} title={t(key)} className={view === k ? 'on' : ''}><Icon size={16} /></button>
            ))}
          </div>
        </RV>

        {sel.length > 0 && (
          <RV as="div" variant="up" className="stg-bulk">
            <span>{tf(t('emp_selcount_selectionne_s'), { selCount: sel.length })}</span>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => setShowExport(true)} className="emp-h5"><Download size={14} />{t('emp_exporter')}</button>
            <button type="button" onClick={() => { if (window.confirm(tf(t('stg_confirm_bulk_delete'), { n: selected.length }))) { selected.forEach(i => deleteMut.mutate(i)); setSel([]); } }} className="emp-h5"><Trash2 size={14} />{t('stg_delete')}</button>
            <button type="button" onClick={() => setSel([])} aria-label={t('emp_effacer_la_selection')} className="stg-bulk-x emp-h6"><X size={16} /></button>
          </RV>
        )}

        {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 0' }}><Spinner size={28} /></div>
          : all.length === 0 ? (
            <RV as="div" variant="up" className="stg-empty">
              <span><GraduationCap size={24} /></span>
              <b>{t('stg_empty')}</b>
              <small>{t('stg_empty_s')}</small>
              <button type="button" onClick={() => setForm({})} className="stg-btn emp-h1"><Plus size={15} />{t('stg_add')}</button>
            </RV>
          ) : list.length === 0 ? (
            <RV as="div" variant="up" className="stg-empty">
              <span><SearchX size={24} /></span>
              <b>{t('stg_no_match')}</b>
              <small>{t('emp_essayez_d_autres_filtres_ou_un')}</small>
              <button type="button" onClick={resetFilters} className="stg-btn emp-h1">{t('emp_reinitialiser_les_filtres')}</button>
            </RV>
          ) : view === 'list' ? (
            <RV as="div" variant="up" delay={200} className="stg-card">
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 1020 }}>
                  <div className="stg-row stg-row-h">
                    <Check20 on={allSel} onClick={() => setSel(allSel ? [] : list.map(i => i.id))} label={t('emp_tout_selectionner')} />
                    <span>{t('stg_c_intern')}</span><span>{t('stg_c_mission')}</span><span>{t('stg_c_tutor')}</span><span>{t('stg_f_type')}</span>
                    <span>{t('stg_f_status')}</span><span>{t('stg_c_period')}</span><span style={{ textAlign: 'end' }}>{t('emp_actions')}</span>
                  </div>
                  {list.map((i, n) => (
                    <RV key={i.id} as="div" variant="up" delay={Math.min(n, 12) * 40} className="stg-row emp-h7" onClick={() => openFile(i)}>
                      {i.id === newId && <RV as="span" variant="fade" className="stg-new-glow" />}
                      <Check20 on={sel.includes(i.id)} onClick={() => toggle(i.id)} label={t('emp_selectionner')} />
                      <span className="stg-who">
                        <Av i={i} size={36} />
                        <span style={{ minWidth: 0 }}>
                          <b>{i.full_name}{i.id === newId && <em>{t('emp_nouveau')}</em>}</b>
                          <small>{i.email || '—'}</small>
                        </span>
                      </span>
                      <span className="stg-two"><b>{i.position || '—'}</b><small>{i.school || i.education_summary || '—'}</small></span>
                      <span className="stg-two"><b>{i.manager || '—'}</b><small>{i.department || '—'}</small></span>
                      <span style={{ minWidth: 0, paddingInlineEnd: 8 }}>{typeChip(i)}</span>
                      <span style={{ minWidth: 0, paddingInlineEnd: 8 }} onClick={e => e.stopPropagation()}>{stageChip(i, true)}</span>
                      <span className="stg-two"><span>{endCell(i)}</span><small>{i.internship_start ? tf(t('stg_since'), { d: fmtDate(i.internship_start) }) : '—'}</small></span>
                      {actions(i)}
                    </RV>
                  ))}
                </div>
              </div>
              <div className="stg-foot">{tf(t('stg_showing'), { n: list.length, total: all.length })}</div>
            </RV>
          ) : view === 'grid' ? (
            <div className="stg-grid">
              {list.map((i, n) => (
                <RV key={i.id} as="div" variant="up" delay={Math.min(n, 12) * 40} className={`stg-gcard emp-h11${sel.includes(i.id) ? ' on' : ''}`} onClick={() => openFile(i)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <Av i={i} size={54} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {stageChip(i, false)}
                      <Check20 on={sel.includes(i.id)} onClick={() => toggle(i.id)} label={t('emp_selectionner')} />
                    </div>
                  </div>
                  <div className="stg-gname">{i.full_name}</div>
                  <div className="stg-gpos">{i.position || t('stg_intern')}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                    {i.department && <span className="stg-pill">{i.department}</span>}
                    {i.internship_type && typeChip(i)}
                    {ending(i) && <span className="stg-pill red">{tf(t('stg_d_left_short'), { n: daysLeft(i.internship_end) ?? 0 })}</span>}
                  </div>
                  <div className="stg-gmeta">
                    {i.school && <span><GraduationCap size={13} />{i.school}</span>}
                    {i.manager && <span><UserCheck size={13} />{i.manager}</span>}
                    {(i.internship_start || i.internship_end) && <span><Calendar size={13} />{fmtDate(i.internship_start)} → {fmtDate(i.internship_end)}</span>}
                  </div>
                  <div className="stg-gfoot">
                    {i.email && <a href={`mailto:${i.email}`} onClick={e => e.stopPropagation()} aria-label="Email" className="emp-h12"><Mail size={15} /></a>}
                    <button type="button" onClick={e => { e.stopPropagation(); openFile(i, 'onboarding'); }} aria-label={t('stg_t_onboarding')} className="emp-h12"><ClipboardList size={15} /></button>
                    <button type="button" onClick={e => { e.stopPropagation(); setForm(i); }} aria-label={t('stg_edit')} className="emp-h12"><Pencil size={14} /></button>
                    <span className="stg-glink emp-h13">{t('emp_dossier')}<ArrowRight size={14} /></span>
                  </div>
                </RV>
              ))}
            </div>
          ) : view === 'kanban' ? (
            <>
              <div className="stg-groups">
                <span>{t('stg_group_by')}</span>
                {GROUPS.map(([g, key]) => <button key={g} type="button" onClick={() => setGroup(g)} className={group === g ? 'on' : ''}>{t(key)}</button>)}
                <small>{t(group === 'period' ? 'stg_kanban_ro' : 'stg_kanban_drag')}</small>
                {(group === 'stage' || group === 'type') && <button type="button" className="stg-ghostlink" onClick={() => setShowEmpty(x => !x)}>{showEmpty ? t('stg_hide_empty') : tf(t('stg_show_empty'), { n: hidden })}</button>}
              </div>
              <div className="stg-kanban">
                {shownCols.map((c, ci) => {
                  const items = list.filter(i => colOf(i) === c.id);
                  return (
                    <RV key={c.id || '_'} as="div" variant="up" delay={Math.min(ci, 6) * 60} className="stg-col" onDragOver={(e: DragEvent) => e.preventDefault()} onDrop={drop(c.id)}>
                      <div className="stg-col-h"><span style={{ background: c.dot }} /><b>{c.label}</b><em>{items.length}</em></div>
                      <div className="stg-col-b">
                        {items.map(i => (
                          <div key={i.id} draggable={group !== 'period'} onDragStart={drag(i)} onClick={() => openFile(i)} className="stg-kcard">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Av i={i} size={34} />
                              <span style={{ minWidth: 0 }}><b>{i.full_name}</b><small>{i.position || i.school || t('stg_intern')}</small></span>
                            </div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                              {group !== 'stage' && i.internship_status && stageChip(i, false)}
                              {group !== 'type' && i.internship_type && typeChip(i)}
                              {group !== 'department' && i.department && <span className="stg-pill">{i.department}</span>}
                            </div>
                            {(i.internship_start || i.internship_end) && <div className="stg-kdate"><Calendar size={11} />{fmtDate(i.internship_start)} → {fmtDate(i.internship_end)}</div>}
                          </div>
                        ))}
                        {!items.length && <div className="stg-col-empty">{t('stg_col_empty')}</div>}
                      </div>
                    </RV>
                  );
                })}
              </div>
            </>
          ) : (
            <RV as="div" variant="up" delay={200} className="stg-card">
              <div className="stg-reg">
                <table>
                  <thead>
                    <tr>
                      <th className="stk0"><Check20 on={allSel} onClick={() => setSel(allSel ? [] : list.map(i => i.id))} label={t('emp_tout_selectionner')} /></th>
                      <th className="stk1">{t('stg_c_name')}</th>
                      {REG_COLS.map(k => <th key={k}>{t(k)}</th>)}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(i => {
                      const busy = patchMut.isPending && patchMut.variables?.id === i.id;
                      return (
                        <tr key={i.id} onClick={() => openFile(i)} className={sel.includes(i.id) ? 'on' : ''}>
                          <td className="stk0"><Check20 on={sel.includes(i.id)} onClick={() => toggle(i.id)} label={t('emp_selectionner')} /></td>
                          <td className="stk1"><span className="stg-who sm"><Av i={i} size={28} /><b>{i.full_name}</b></span></td>
                          <td onClick={e => e.stopPropagation()}>
                            <select value={i.internship_type ?? ''} disabled={busy} onChange={setInline(i, 'internship_type')} className="stg-inline" style={{ background: i.internship_type ? typeTone(i.internship_type)[0] : 'transparent', color: i.internship_type ? typeTone(i.internship_type)[1] : '#7d8f97', borderStyle: i.internship_type ? 'solid' : 'dashed' }}>
                              <option value="">{t('stg_choose')}</option>
                              {i.internship_type && !INTERNSHIP_TYPES.includes(i.internship_type) && <option value={i.internship_type}>{i.internship_type}</option>}
                              {INTERNSHIP_TYPES.map(o => <option key={o} value={o}>{t(TYPE_KEY[o])}</option>)}
                            </select>
                          </td>
                          <td onClick={e => e.stopPropagation()}>{stageChip(i, true)}</td>
                          <td title={i.position ?? ''} style={{ color: '#0e6f84', fontWeight: 600 }}>{i.position || '—'}</td>
                          <td title={i.department ?? ''}>{i.department || '—'}</td>
                          <td title={i.education_summary ?? ''} className="wide">{i.education_summary || '—'}</td>
                          <td title={i.school ?? ''}>{i.school || '—'}</td>
                          <td title={i.email ?? ''}>{i.email || '—'}</td>
                          <td>{i.phone || '—'}</td>
                          <td className="mono">{fmtDate(i.internship_start)}</td>
                          <td>{endCell(i)}</td>
                          <td>{i.internship_period || '—'}</td>
                          <td title={i.school_contact ?? ''}>{i.school_contact || '—'}</td>
                          <td title={i.notes ?? ''} className="wide">{i.notes || '—'}</td>
                          <td>{ext(i.test_code_source)}</td>
                          <td>{ext(i.test_demo_link)}</td>
                          <td>{ext(i.test_cv)}</td>
                          <td title={i.test_note_rh ?? ''} className="wide">{i.test_note_rh || '—'}</td>
                          <td title={i.test_note_test ?? ''} className="wide">{i.test_note_test || '—'}</td>
                          <td>{actions(i)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="stg-foot">{tf(t('stg_showing'), { n: list.length, total: all.length })}</div>
            </RV>
          )}
      </div>

      <InternFormDrawer open={!!form} initial={form} saving={createMut.isPending || updateMut.isPending} onClose={() => setForm(null)}
        onSave={body => (form?.id ? updateMut.mutate({ id: form.id, body }) : createMut.mutate(body))} />
      <InternDossier intern={cur} tab={tab} onTab={setTab} onClose={closeFile} onEdit={i => setForm(i)} onDelete={askDelete} onConvert={askConvert} converting={convertMut.isPending} />

      {showCV && (
        <CVImportModal
          onClose={() => setShowCV(false)}
          onImport={d => {
            const x = d as typeof d & { internship_start?: string; internship_end?: string };
            setShowCV(false);
            setForm({
              full_name: d.full_name, email: d.email, phone: d.phone, address: d.address, nationality: d.nationality, skills: d.skills, bio: d.summary,
              certifications: d.certifications, photo_url: d.photo, internship_start: x.internship_start, internship_end: x.internship_end, internship_status: 'En cours',
            });
          }}
        />
      )}
      <SmartImportModal open={showImport} onClose={() => setShowImport(false)} cols={INTERN_COLS} entityName="Stagiaires" targetType="intern" onImported={() => qc.invalidateQueries({ queryKey: ['interns'] })} />
      <ExportModal open={showExport} onClose={() => setShowExport(false)} cols={INTERN_COLS} entityName="Stagiaires" rows={(selected.length ? selected : list) as unknown as Record<string, unknown>[]} />
      <DepartmentsModal open={showDepts} onClose={() => setShowDepts(false)} />
    </>
  );
}
