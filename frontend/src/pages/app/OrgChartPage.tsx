// Organigramme: the company as it really is, and HR shapes it here.
// - Top: the person who leads the company (chosen by HR; until then guessed from the job title and marked so).
// - Columns: the departments (the `departments` table + the department on each file; « DATA IA » and « Data IA »
//   are one), each with its head (chosen by HR) and its people nested by their direct manager (N+1).
// - Interns are hidden by default (« + 13 stagiaires » per department, and the « Stagiaires » switch).
// - HR edits by clicking a card (position, department, N+1, head of department; rename / merge / delete a
//   department; who leads) or by dragging a card onto a department (moves it) or onto a person (puts it under them).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, Download, FolderOpen, GraduationCap, Mail, Maximize2, Minus, Move, Network, PencilLine, Plus, Search, Trash2, X } from 'lucide-react';
import {
  createOrgDept, deleteOrgDept, getApiError, getOrgPeople, getOrgStructure, setOrgHead, updateOrgDept, updateOrgPerson,
  type OrgDeptRow, type OrgPerson, type OrgStructure,
} from '@/services/api';
import { RV } from '@/components/motion';
import { Drawer, Modal, Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import ProjectTeamsBoard from '@/components/orgchart/ProjectTeamsBoard';
import './OrgChartPage.css';

const DEPT_COLORS: Record<string, string> = { operations: '#df9326', commercial: '#16a06b', tech: '#6d5ad6', 'service client': '#0e6f84', marketing: '#df5740', finance: '#4a69d8', rh: '#16b6c8', 'ressources humaines': '#16b6c8' };
const PALETTE = ['#0e6f84', '#6d5ad6', '#16a06b', '#df9326', '#df5740', '#4a69d8', '#16b6c8', '#b06b0c'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const keyOf = (s?: string | null) => norm(s ?? '').replace(/[^a-z0-9]+/g, ' ').trim();
const CEO_RE = /(directeur|directrice)\s+g[ée]n[ée]ral|\bceo\b|\bpdg\b|g[ée]rant|managing director|general manager|fondat/i;
const COL_W = 224, GAP = 16, TEAM_PREVIEW = 4;

type Node = { p: OrgPerson; kids: Node[] };
type Dept = { key: string; name: string; color: string; row?: OrgDeptRow; head?: OrgPerson; roots: Node[]; shown: number; all: number; interns: number; hiddenInterns: number };
type Sel = { kind: 'person'; id: string } | { kind: 'dept'; key: string } | { kind: 'top' };

function build(people: OrgPerson[], st: OrgStructure | undefined, showInterns: boolean) {
  const byId = new Map(people.map(p => [p.id, p]));
  const set = st?.ceo_id ? byId.get(st.ceo_id) : undefined;
  const ceo = set ?? people.find(p => p.status !== 'intern' && CEO_RE.test(p.position || ''));
  const rows = st?.departments ?? [];
  const groups = new Map<string, { spell: Map<string, number>; list: OrgPerson[] }>();
  const group = (k: string) => { if (!groups.has(k)) groups.set(k, { spell: new Map(), list: [] }); return groups.get(k)!; };
  rows.forEach(r => group(keyOf(r.name)));
  people.forEach(p => {
    if (p.id === ceo?.id) return;
    const g = group(keyOf(p.department));
    const d = (p.department || '').trim();
    if (d) g.spell.set(d, (g.spell.get(d) ?? 0) + 1);
    g.list.push(p);
  });
  const reports = new Map<string, number>();
  people.forEach(p => { if (p.manager_id) reports.set(p.manager_id, (reports.get(p.manager_id) ?? 0) + 1); });
  const order = (a: OrgPerson, b: OrgPerson) => Number(a.status === 'intern') - Number(b.status === 'intern') || (reports.get(b.id) ?? 0) - (reports.get(a.id) ?? 0) || a.full_name.localeCompare(b.full_name);
  const depts: Dept[] = [];
  [...groups.entries()].forEach(([k, g]) => {
    const row = rows.find(r => keyOf(r.name) === k);
    const name = row?.name ?? ([...g.spell.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '');
    const head = row?.manager_id && row.manager_id !== ceo?.id ? byId.get(row.manager_id) : undefined;
    const visible = g.list.filter(p => (showInterns || p.status !== 'intern') && p.id !== head?.id);
    const ids = new Set(visible.map(p => p.id));
    const kids = new Map<string, OrgPerson[]>();
    const top: OrgPerson[] = [];
    visible.forEach(p => { if (p.manager_id && p.manager_id !== p.id && ids.has(p.manager_id)) kids.set(p.manager_id, [...(kids.get(p.manager_id) ?? []), p]); else top.push(p); });
    const seen = new Set<string>();
    const mk = (p: OrgPerson): Node => { seen.add(p.id); return { p, kids: (kids.get(p.id) ?? []).filter(x => !seen.has(x.id)).sort(order).map(mk) }; };
    const roots = top.sort(order).map(mk);
    visible.filter(p => !seen.has(p.id)).forEach(p => roots.push(mk(p)));   // a loop in old data: shown at the top level
    const interns = g.list.filter(p => p.status === 'intern').length;
    if (!visible.length && !head && !row) return;   // only hidden interns: counted on the « Stagiaires » switch
    depts.push({ key: k, name, color: DEPT_COLORS[k] ?? '', row, head, roots, shown: visible.length + (head ? 1 : 0), all: g.list.length, interns, hiddenInterns: showInterns ? 0 : interns });
  });
  depts.sort((a, b) => Number(!a.key) - Number(!b.key) || b.shown - a.shown || a.name.localeCompare(b.name));
  depts.forEach((d, i) => { if (!d.color) d.color = PALETTE[i % PALETTE.length]; });
  return { ceo, ceoGuessed: !set && !!ceo, depts, byId, reports };
}

const btn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
const field: CSSProperties = { width: '100%', boxSizing: 'border-box', height: 38, padding: '0 10px', borderRadius: 10, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13, color: '#0a1c24', outline: 'none' };
const lab: CSSProperties = { display: 'block', fontSize: 11.5, fontWeight: 600, color: '#5f7079', margin: '0 0 4px' };

export default function OrgChartPage({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useLang();
  const { user } = useAuth();
  const notify = useNotify();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [userZoom, setUserZoom] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [showInterns, setShowInterns] = useState(false);
  const [newDept, setNewDept] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);   // « d:<key> » or « p:<id> »
  const vpRef = useRef<HTMLDivElement>(null);

  const { data: people = [], isLoading } = useQuery({ queryKey: ['org-people'], queryFn: getOrgPeople });
  const stQ = useQuery({ queryKey: ['org-structure'], queryFn: getOrgStructure });
  const canEdit = !readOnly && !!stQ.data?.can_edit;
  const { ceo, ceoGuessed, depts, byId, reports } = useMemo(() => build(people, stQ.data, showInterns), [people, stQ.data, showInterns]);
  const internTotal = people.filter(p => p.status === 'intern').length;
  const staff = useMemo(() => people.filter(p => p.status !== 'intern').sort((a, b) => a.full_name.localeCompare(b.full_name)), [people]);
  const headOf = (k: string) => depts.find(d => d.key === k)?.head;
  const company = typeof user?.profile?.company === 'string' && user.profile.company ? user.profile.company : t('tpl_company_fallback');
  const natW = Math.max(depts.length, 1) * (COL_W + GAP) - GAP + 80;
  const shownCount = (ceo ? 1 : 0) + depts.reduce((n, d) => n + d.shown, 0);

  const fit = (force = false) => {
    const vp = vpRef.current;
    if (!vp || !vp.clientWidth || (userZoom && !force)) return;
    setZoom(+Math.max(0.45, Math.min(1, (vp.clientWidth - 8) / natW)).toFixed(3));
    if (force) setUserZoom(false);
  };
  useLayoutEffect(() => { fit(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natW]);
  useEffect(() => {
    const vp = vpRef.current; if (!vp) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(vp);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natW, userZoom]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['org-people'] }); qc.invalidateQueries({ queryKey: ['org-structure'] }); qc.invalidateQueries({ queryKey: ['employees'] }); };
  const fail = (e: unknown) => notify.error(getApiError(e, t('error')));
  const movePerson = useMutation({
    mutationFn: (v: { id: string; body: { position?: string; department?: string; manager_id?: string | null }; msg?: string }) => updateOrgPerson(v.id, v.body),
    onSuccess: (_, v) => { refresh(); notify.success(v.msg ?? t('org_saved')); },
    onError: fail,
  });

  // ── drag & drop (HR) ──
  const descendants = (id: string) => {
    const out = new Set<string>([id]);
    let grew = true;
    while (grew) { grew = false; people.forEach(p => { if (p.manager_id && out.has(p.manager_id) && !out.has(p.id)) { out.add(p.id); grew = true; } }); }
    return out;
  };
  const dragProps = (p: OrgPerson) => canEdit ? {
    draggable: true,
    onDragStart: (e: DragEvent) => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; setDrag(p.id); },
    onDragEnd: () => { setDrag(null); setOver(null); },
    onDragOver: (e: DragEvent) => { if (drag && !descendants(drag).has(p.id)) { e.preventDefault(); e.stopPropagation(); setOver(`p:${p.id}`); } },
    onDrop: (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setOver(null);
      const who = byId.get(drag ?? e.dataTransfer.getData('text/plain')); setDrag(null);
      if (!who || who.id === p.id || who.manager_id === p.id || descendants(who.id).has(p.id)) return;
      const body: { manager_id: string; department?: string } = { manager_id: p.id };
      if (p.department && keyOf(p.department) !== keyOf(who.department)) body.department = p.department;
      movePerson.mutate({ id: who.id, body, msg: tf(t('org_under'), { name: who.full_name, boss: p.full_name }) });
    },
  } : {};
  const deptDrop = (d: Dept) => canEdit && d.key ? {
    onDragOver: (e: DragEvent) => { if (drag) { e.preventDefault(); setOver(`d:${d.key}`); } },
    onDragLeave: (e: DragEvent) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as globalThis.Node)) setOver(o => (o === `d:${d.key}` ? null : o)); },
    onDrop: (e: DragEvent) => {
      e.preventDefault(); setOver(null);
      const who = byId.get(drag ?? e.dataTransfer.getData('text/plain')); setDrag(null);
      if (!who || who.id === d.head?.id) return;
      const boss = who.manager_id ? byId.get(who.manager_id) : undefined;
      const keepBoss = !!boss && (keyOf(boss.department) === d.key || boss.id === d.head?.id);
      if (keyOf(who.department) === d.key && (keepBoss || !who.manager_id)) return;
      movePerson.mutate({ id: who.id, body: { department: d.name, ...(keepBoss ? {} : { manager_id: null }) }, msg: tf(t('org_moved'), { name: who.full_name, dept: d.name }) });
    },
  } : {};

  const needle = norm(q.trim());
  const hit = (p?: OrgPerson, extra = '') => !!needle && !!p && norm(`${p.full_name} ${p.position ?? ''} ${p.department ?? ''} ${extra}`).includes(needle);
  const treeHit = (n: Node): boolean => hit(n.p) || n.kids.some(treeHit);
  const setZ = (z: number) => { setZoom(+Math.max(0.4, Math.min(1.5, z)).toFixed(2)); setUserZoom(true); };
  const allOpen = depts.every(d => !closed.has(d.key));
  const ring = (on: boolean, h: boolean, target = false) => (target ? ', 0 0 0 3px #16a06b' : on ? ', 0 0 0 3px #16b6c8' : h ? ', 0 0 0 3px rgba(22,182,200,.5)' : '');
  const deptName = (d: { key: string; name: string }) => d.key ? d.name : t('org_no_dept');

  const exportPdf = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const esc = (s?: string) => (s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
    const li = (n: Node, depth: number): string => `<li style="padding-left:${depth * 14}px">${esc(n.p.full_name)}<span>${esc(n.p.position)}</span></li>${n.kids.map(k => li(k, depth + 1)).join('')}`;
    const rows = depts.map(d => `<section><h2 style="border-color:${d.color}">${esc(deptName(d))} <small>${d.shown}</small></h2>${d.head ? `<p class="head">${esc(d.head.full_name)} — ${esc(d.head.position)}</p>` : ''}<ul>${d.roots.map(n => li(n, 0)).join('')}</ul></section>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(t('org_title'))} — ${esc(company)}</title><style>@page{size:A3 landscape;margin:1.5cm}body{font-family:system-ui,sans-serif;color:#0a1c24}h1{font-size:22px;margin:0 0 4px}.sub{color:#52646d;margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}section{border:1px solid #e2e8eb;border-radius:12px;padding:12px;break-inside:avoid}h2{font-size:15px;margin:0 0 6px;border-left:4px solid;padding-left:8px}h2 small{color:#5f7079;font-weight:500}.head{font-weight:600;margin:0 0 6px;font-size:13px}ul{margin:0;padding:0;list-style:none;font-size:12px}li{padding:3px 0;border-top:1px solid #eef2f4}li span{display:block;color:#5f7079;font-size:11px}</style></head><body><h1>${esc(company)}</h1><p class="sub">${ceo ? `${esc(ceo.full_name)} — ${esc(ceo.position)} · ` : ''}${esc(tf(t('org_sub'), { n: shownCount, k: depts.filter(d => d.key).length }))}</p><div class="grid">${rows}</div></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  const personCard = (p: OrgPerson, color: string, small = true, extra?: ReactNode) => {
    const h = hit(p);
    const target = over === `p:${p.id}`;
    return (
      <button type="button" {...dragProps(p)} onClick={() => setSel({ kind: 'person', id: p.id })}
        style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: small ? '8px 10px' : '15px 12px 11px', borderRadius: small ? 12 : 0, border: small ? '1px solid #e2e8eb' : 'none', background: small ? (p.status === 'intern' ? '#fbfcfd' : '#ffffff') : 'transparent', fontFamily: 'inherit', textAlign: 'start', cursor: canEdit ? 'grab' : 'pointer', boxShadow: small ? `0 6px 16px -14px rgba(10,28,36,.5)${ring(sel?.kind === 'person' && sel.id === p.id, h, target)}` : undefined, opacity: (needle && !h && small) || drag === p.id ? 0.35 : 1, transition: 'opacity .2s,box-shadow .2s' }} className={small ? 'org-h4' : undefined}>
        <span style={{ width: small ? 30 : 40, height: small ? 30 : 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.status === 'intern' ? '#9fb4bb' : color, color: '#ffffff', fontSize: small ? 10.5 : 13, fontWeight: 700, flexShrink: 0 }}>{initialsOf(p.full_name)}</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', fontSize: small ? 12.5 : 13.5, fontWeight: small ? 600 : 700, color: '#0a1c24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.full_name}</span>
          <span style={{ display: 'block', fontSize: 11, color: '#5f7079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.position || '—'}</span>
        </span>
        {p.status === 'intern' && <GraduationCap size={13} color="#7d8f97" style={{ flexShrink: 0 }} aria-label={t('org_intern')} />}
        {extra}
      </button>
    );
  };
  const tree = (nodes: Node[], d: Dept): ReactNode => nodes.map(n => (
    <div key={n.p.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ position: 'absolute', insetInlineStart: -12, top: 18, width: 12, height: 2, background: '#c9d6db' }} />
      {personCard(n.p, d.color, true, n.kids.length ? <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10.5, color: '#7d8f97' }}>{n.kids.length}</span> : undefined)}
      {n.kids.length > 0 && (
        <div style={{ position: 'relative', paddingInlineStart: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ position: 'absolute', insetInlineStart: 10, top: -8, bottom: 18, width: 2, background: '#dfe7ea' }} />
          {tree(n.kids, d)}
        </div>
      )}
    </div>
  ));

  const ceoHit = hit(ceo);
  const selPerson = sel?.kind === 'person' ? byId.get(sel.id) : undefined;
  const selDept = sel?.kind === 'dept' ? depts.find(d => d.key === sel.key) : undefined;
  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('org_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{company} · {tf(t('org_sub'), { n: shownCount, k: depts.filter(d => d.key).length })}</RV>
        </div>
        <RV as="div" variant="up" delay={100} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={16} style={{ position: 'absolute', insetInlineStart: 13, top: '50%', marginTop: -8, color: '#7d8f97', pointerEvents: 'none' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('org_find')} style={{ width: '100%', height: 42, paddingInline: '38px 12px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 14, color: '#0a1c24', outline: 'none' }} className="org-f1" />
          </div>
          {internTotal > 0 && (
            <button type="button" onClick={() => setShowInterns(v => !v)} aria-pressed={showInterns} style={{ ...btn, ...(showInterns ? { background: '#e4f2f4', borderColor: '#9fd0d9', color: '#0b5f72' } : {}) }} className="org-h1">
              <GraduationCap size={15} />{tf(t('org_interns'), { n: internTotal })}
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', padding: 3, borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <button type="button" onClick={() => setZ(zoom - 0.1)} aria-label={t('org_zoom_out')} className="org-zbtn"><Minus size={16} /></button>
            <span style={{ minWidth: 50, textAlign: 'center', fontFamily: "'Geist Mono',monospace", fontSize: 12.5, color: '#33474f' }}>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZ(zoom + 0.1)} aria-label={t('org_zoom_in')} className="org-zbtn"><Plus size={16} /></button>
            <button type="button" onClick={() => fit(true)} aria-label={t('org_fit')} className="org-zbtn"><Maximize2 size={15} /></button>
          </div>
          <button type="button" onClick={() => setClosed(allOpen ? new Set(depts.map(d => d.key)) : new Set())} style={btn} className="org-h1">
            {allOpen ? <ChevronsDownUp size={15} /> : <ChevronsUpDown size={15} />}{t(allOpen ? 'org_collapse' : 'org_expand')}
          </button>
          {canEdit && <button type="button" onClick={() => setNewDept('')} style={btn} className="org-h1"><Plus size={15} />{t('org_add_dept')}</button>}
          {!readOnly && (
            <button type="button" onClick={() => setTeamsOpen(true)} title={t('org_teams')} aria-label={t('org_teams')} style={{ ...btn, width: 42, padding: 0, justifyContent: 'center' }} className="org-h1"><Network size={16} /></button>
          )}
          <button type="button" onClick={exportPdf} style={{ ...btn, border: 'none', background: '#0a1c24', color: '#ffffff' }} className="org-h2">
            <Download size={15} />{t('org_export')}
          </button>
        </RV>
      </div>
      {canEdit && <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#5f7079' }}><Move size={13} />{t('org_drag_hint')}</p>}

      <div ref={vpRef} style={{ position: 'relative', height: 'calc(100vh - 240px)', minHeight: 520, borderRadius: 22, backgroundColor: '#ffffff', backgroundImage: 'radial-gradient(#e1e8eb 1px,transparent 1px)', backgroundSize: '22px 22px', border: '1px solid #e2e8eb', overflow: 'auto' }}>
        {isLoading || stQ.isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spinner /></div>
        ) : !people.length ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 14, color: '#52646d' }}>{t('org_empty')}</div>
        ) : (
          <div style={{ zoom, width: natW, margin: '0 auto', padding: '36px 40px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center' } as CSSProperties}>
            <RV as="button" variant="scale" type="button" onClick={() => setSel({ kind: 'top' })} {...(ceo ? dragProps(ceo) : {})}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 14px 14px', border: 'none', borderRadius: 18, background: 'linear-gradient(135deg,#06141a,#0d2a33)', color: '#e8eff1', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', boxShadow: `0 20px 40px -20px rgba(6,20,26,.7)${ring(sel?.kind === 'top', ceoHit, !!ceo && over === `p:${ceo.id}`)}`, opacity: needle && !ceoHit ? 0.32 : 1, transition: 'opacity .2s,box-shadow .2s' }}>
              <span style={{ position: 'relative', width: 50, height: 50, flexShrink: 0 }}>
                <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.6)' }} />
                <span style={{ position: 'relative', width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', fontSize: 16, fontWeight: 700, color: '#ffffff' }}>{initialsOf(ceo?.full_name || company)}</span>
              </span>
              <span>
                <span style={{ display: 'block', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-.02em' }}>{ceo?.full_name || company}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: '#9fb4bb' }}>{ceo?.position ? `${ceo.position} · ` : ''}{tf(t('org_people'), { n: shownCount })}</span>
                {canEdit && (!ceo || ceoGuessed) && <span style={{ display: 'block', marginTop: 3, fontSize: 11.5, color: '#f2c46b' }}>{t(ceo ? 'org_top_guess' : 'org_top_pick')}</span>}
              </span>
            </RV>
            <span style={{ width: 2, height: 28, background: '#c9d6db' }} />
            <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
              {depts.map((d, i) => {
                const last = depts.length - 1;
                const memberHit = d.roots.some(treeHit);
                const headHit = hit(d.head, d.name) || (!!needle && norm(d.name).includes(needle));
                const open = !closed.has(d.key) || memberHit;
                const showAll = expanded.has(d.key) || memberHit;
                const team = showAll ? d.roots : d.roots.slice(0, TEAM_PREVIEW);
                const more = d.roots.length - team.length;
                const target = over === `d:${d.key}`;
                const mid = COL_W / 2 - 1;
                return (
                  <div key={d.key || '—'} {...deptDrop(d)} style={{ position: 'relative', width: COL_W, paddingTop: 28, display: 'flex', flexDirection: 'column', borderRadius: 18, outline: target ? '2px dashed #16a06b' : 'none', outlineOffset: 4, background: target ? 'rgba(22,160,107,.05)' : 'transparent' }}>
                    {depts.length > 1 && <span style={{ position: 'absolute', top: 0, height: 2, left: i === 0 ? mid + 1 : -8, right: i === last ? mid + 1 : -8, background: '#c9d6db' }} />}
                    <span style={{ position: 'absolute', top: 0, left: mid, width: 2, height: 28, background: '#c9d6db' }} />
                    <RV as="div" variant="up" delay={120 + Math.min(i, 10) * 60} style={{ position: 'relative', borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: `0 10px 24px -18px rgba(10,28,36,.5)${ring(sel?.kind === 'dept' && sel.key === d.key, headHit, !!d.head && over === `p:${d.head.id}`)}`, opacity: needle && !headHit && !memberHit ? 0.32 : 1, overflow: 'hidden', transition: 'opacity .2s,box-shadow .2s' }}>
                      <span style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: d.color }} />
                      {d.head ? (
                        <div onClickCapture={e => { e.stopPropagation(); setSel({ kind: 'dept', key: d.key }); }}>{personCard(d.head, d.color, false)}</div>
                      ) : (
                        <button type="button" onClick={() => setSel({ kind: 'dept', key: d.key })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '15px 12px 11px', border: 'none', background: 'transparent', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer' }}>
                          <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${d.color}`, color: d.color, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>?</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0a1c24' }}>{t('org_no_head')}</span>
                            <span style={{ display: 'block', fontSize: 11.5, color: canEdit && d.key ? '#0e6f84' : '#5f7079' }}>{canEdit && d.key ? t('org_pick_head') : deptName(d)}</span>
                          </span>
                        </button>
                      )}
                      <button type="button" onClick={() => setClosed(s => { const n = new Set(s); if (n.has(d.key)) n.delete(d.key); else n.add(d.key); return n; })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'none', borderTop: '1px solid #eef2f4', background: '#f8fafb', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#33474f', cursor: 'pointer' }} className="org-h3">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deptName(d)}</span>
                        <span style={{ marginInlineStart: 'auto', fontFamily: "'Geist Mono',monospace", fontSize: 11, color: '#5f7079' }}>{d.shown}</span>
                        {open ? <ChevronUp size={14} style={{ color: '#7d8f97', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: '#7d8f97', flexShrink: 0 }} />}
                      </button>
                    </RV>
                    {d.hiddenInterns > 0 && (
                      <button type="button" onClick={() => setShowInterns(true)} style={{ alignSelf: 'flex-start', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, border: '1px solid #e2e8eb', background: '#f8fafb', fontFamily: 'inherit', fontSize: 11.5, color: '#5f7079', cursor: 'pointer' }}>
                        <GraduationCap size={12} />{tf(t(d.hiddenInterns > 1 ? 'org_interns_hidden' : 'org_interns_hidden_one'), { n: d.hiddenInterns })}
                      </button>
                    )}
                    {open && d.roots.length > 0 && (
                      <div style={{ position: 'relative', padding: '12px 0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ position: 'absolute', left: 12, top: 0, bottom: more > 0 || showAll ? 46 : 19, width: 2, background: '#c9d6db' }} />
                        {tree(team, d)}
                        {(more > 0 || (showAll && d.roots.length > TEAM_PREVIEW)) && (
                          <button type="button" onClick={() => setExpanded(s => { const n = new Set(s); if (n.has(d.key)) n.delete(d.key); else n.add(d.key); return n; })} style={{ height: 16, padding: '0 0 0 2px', border: 'none', background: 'none', textAlign: 'start', fontFamily: 'inherit', fontSize: 11.5, lineHeight: '16px', color: '#7d8f97', cursor: 'pointer' }}>
                            {more > 0 ? tf(t(more > 1 ? 'org_more_many' : 'org_more_one'), { n: more }) : t('org_less')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {sel && (
        <RV as="div" variant="up" key={sel.kind === 'person' ? sel.id : sel.kind === 'dept' ? `d${sel.key}` : 'top'} style={{ position: 'fixed', insetInlineEnd: 24, bottom: 24, zIndex: 90, width: 340, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 110px)', overflowY: 'auto', borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 30px 70px -24px rgba(10,28,36,.5)' }}>
          {sel.kind === 'person' && selPerson && (
            <PersonPanel p={selPerson} canEdit={canEdit} readOnly={readOnly} onClose={() => setSel(null)} color={depts.find(d => d.key === keyOf(selPerson.department))?.color ?? '#0e6f84'}
              boss={selPerson.manager_id ? byId.get(selPerson.manager_id) : undefined} deptHead={headOf(keyOf(selPerson.department))} reports={reports.get(selPerson.id) ?? 0}
              staff={staff} deptNames={depts.filter(d => d.key).map(d => d.name)} blocked={descendants(selPerson.id)} onSaved={refresh} />
          )}
          {sel.kind === 'dept' && selDept && (
            <DeptPanel d={selDept} canEdit={canEdit} staff={staff} onClose={() => setSel(null)} onSaved={(k) => { refresh(); setSel(k === null ? null : { kind: 'dept', key: k }); }} label={deptName(selDept)} onPerson={id => setSel({ kind: 'person', id })} />
          )}
          {sel.kind === 'top' && (
            <TopPanel ceo={ceo} guessed={ceoGuessed} company={company} canEdit={canEdit} staff={staff} total={shownCount} onClose={() => setSel(null)} onSaved={refresh} onPerson={id => setSel({ kind: 'person', id })} />
          )}
        </RV>
      )}

      <Modal open={newDept !== null} onClose={() => setNewDept(null)} title={t('org_new_dept')} icon={<Plus size={18} />} width={440}>
        <NewDept onClose={() => setNewDept(null)} onCreated={() => { setNewDept(null); refresh(); }} existing={depts.map(d => d.key)} />
      </Modal>

      {!readOnly && (
        <Drawer open={teamsOpen} onClose={() => setTeamsOpen(false)} title={t('org_teams')} subtitle={t('org_teams_sub')} icon={<Network size={17} />} width={1180}>
          <ProjectTeamsBoard />
        </Drawer>
      )}
    </div>
  );
}

// ── side panels ──────────────────────────────────────────────────────────────

function PanelHead({ title, sub, color, onClose }: { title: string; sub: string; color: string; onClose: () => void }) {
  const { t } = useLang();
  return (
    <div style={{ position: 'relative', padding: 18, background: '#06141a', color: '#e8eff1', borderRadius: '20px 20px 0 0' }}>
      <button type="button" onClick={onClose} aria-label={t('close')} style={{ position: 'absolute', top: 12, insetInlineEnd: 12, width: 32, height: 32, border: 'none', borderRadius: 9, background: 'rgba(255,255,255,.08)', color: '#e8eff1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingInlineEnd: 30 }}>
        <span style={{ width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color, color: '#ffffff', fontSize: 16, fontWeight: 700, border: '2px solid rgba(255,255,255,.2)', flexShrink: 0 }}>{initialsOf(title)}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-.02em' }}>{title}</div>
          <div style={{ fontSize: 12.5, color: '#9fb4bb' }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}
const Row = ({ k, v }: { k: string; v: ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: '#5f7079' }}>{k}</span><span style={{ fontWeight: 600, textAlign: 'end', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span></div>
);
const editBtn: CSSProperties = { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10, border: '1px solid #d6dfe3', background: '#ffffff', color: '#0a1c24', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const saveBtn: CSSProperties = { ...editBtn, border: 'none', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff' };

function PersonPanel({ p, color, boss, deptHead, reports, canEdit, readOnly, staff, deptNames, blocked, onClose, onSaved }: {
  p: OrgPerson; color: string; boss?: OrgPerson; deptHead?: OrgPerson; reports: number; canEdit: boolean; readOnly: boolean;
  staff: OrgPerson[]; deptNames: string[]; blocked: Set<string>; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useLang();
  const notify = useNotify();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ position: p.position ?? '', department: p.department ?? '', manager_id: p.manager_id ?? '', head: deptHead?.id === p.id });
  const save = useMutation({
    mutationFn: async () => {
      const body: { position?: string; department?: string; manager_id?: string | null } = {};
      if (f.position.trim() !== (p.position ?? '')) body.position = f.position.trim();
      if (f.department.trim() !== (p.department ?? '')) body.department = f.department.trim();
      if ((f.manager_id || null) !== (p.manager_id ?? null)) body.manager_id = f.manager_id || null;
      if (Object.keys(body).length) await updateOrgPerson(p.id, body);
      const wasHead = deptHead?.id === p.id;
      if (f.department.trim() && (f.head !== wasHead || (f.head && keyOf(f.department) !== keyOf(p.department))))
        await updateOrgDept({ name: f.department.trim(), manager_id: f.head ? p.id : null });
      if (wasHead && keyOf(f.department) !== keyOf(p.department) && p.department) await updateOrgDept({ name: p.department, manager_id: null });
    },
    onSuccess: () => { notify.success(t('org_saved')); setEdit(false); onSaved(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const manager = boss?.full_name ?? (deptHead && deptHead.id !== p.id ? `${deptHead.full_name} ${t('org_implicit')}` : p.manager || '—');
  return (
    <>
      <PanelHead title={p.full_name} sub={p.position || '—'} color={p.status === 'intern' ? '#9fb4bb' : color} onClose={onClose} />
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
        {!edit ? (
          <>
            <Row k={t('org_dept')} v={p.department || t('org_no_dept')} />
            <Row k={t('org_n1')} v={manager} />
            <Row k={t('org_reports')} v={reports ? tf(t('org_people'), { n: reports }) : '—'} />
            {deptHead?.id === p.id && <Row k={t('org_head')} v={p.department} />}
            {p.status === 'intern' && <Row k={t('org_status')} v={t('org_intern')} />}
            {p.email && <Row k="Email" v={<span style={{ fontWeight: 500, color: '#0e6f84' }}>{p.email}</span>} />}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {canEdit && <button type="button" onClick={() => setEdit(true)} style={editBtn}><PencilLine size={14} />{t('org_edit')}</button>}
              {!readOnly && <Link to={p.status === 'intern' ? `/app/interns?i=${p.id}` : `/app/employees/${p.id}`} style={{ ...saveBtn, textDecoration: 'none' }} className="org-h5"><FolderOpen size={14} />{t('org_open_file')}</Link>}
              {p.email && <a href={`mailto:${p.email}`} aria-label={t('org_send_mail')} style={{ width: readOnly ? 'auto' : 38, flex: readOnly ? 1 : undefined, height: 38, borderRadius: 10, border: '1px solid #d6dfe3', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#33474f', fontSize: 13, fontWeight: 600 }} className="org-h6"><Mail size={15} />{readOnly ? t('org_send_mail') : null}</a>}
            </div>
          </>
        ) : (
          <form onSubmit={e => { e.preventDefault(); save.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={lab} htmlFor="org-pos">{t('org_position')}</label><input id="org-pos" value={f.position} onChange={e => setF({ ...f, position: e.target.value })} style={field} /></div>
            <div><label style={lab} htmlFor="org-dept">{t('org_dept')}</label>
              <input id="org-dept" list="org-dept-list" value={f.department} onChange={e => setF({ ...f, department: e.target.value })} placeholder={t('org_no_dept')} style={field} />
              <datalist id="org-dept-list">{deptNames.map(n => <option key={n} value={n} />)}</datalist></div>
            <div><label style={lab} htmlFor="org-n1">{t('org_n1')}</label>
              <select id="org-n1" value={f.manager_id} onChange={e => setF({ ...f, manager_id: e.target.value })} style={field}>
                <option value="">{t('org_n1_none')}</option>
                {staff.filter(s => !blocked.has(s.id)).map(s => <option key={s.id} value={s.id}>{s.full_name}{s.position ? ` · ${s.position}` : ''}</option>)}
              </select></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#33474f', cursor: f.department.trim() ? 'pointer' : 'default', opacity: f.department.trim() ? 1 : 0.5 }}>
              <input type="checkbox" checked={f.head} disabled={!f.department.trim()} onChange={e => setF({ ...f, head: e.target.checked })} style={{ accentColor: '#0e6f84' }} />{t('org_is_head')}
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setEdit(false)} style={editBtn}>{t('cancel')}</button>
              <button type="submit" disabled={save.isPending} style={saveBtn}>{save.isPending ? <Spinner size={13} color="#fff" /> : null}{t('org_save')}</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function DeptPanel({ d, label, canEdit, staff, onClose, onSaved, onPerson }: {
  d: Dept; label: string; canEdit: boolean; staff: OrgPerson[]; onClose: () => void; onSaved: (key: string | null) => void; onPerson: (id: string) => void;
}) {
  const { t } = useLang();
  const notify = useNotify();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(d.name);
  const [head, setHead] = useState(d.head?.id ?? '');
  const inDept = staff.filter(s => keyOf(s.department) === d.key);
  const others = staff.filter(s => keyOf(s.department) !== d.key);
  const save = useMutation({
    mutationFn: () => updateOrgDept({ name: d.name, ...(name.trim() && name.trim() !== d.name ? { new_name: name.trim() } : {}), ...(head !== (d.head?.id ?? '') ? { manager_id: head || null } : {}) }),
    onSuccess: r => { notify.success(t('org_saved')); setEdit(false); onSaved(keyOf(r.name)); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const del = useMutation({
    mutationFn: () => deleteOrgDept(d.name),
    onSuccess: () => { notify.success(t('org_saved')); onSaved(null); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const editable = canEdit && !!d.key;
  return (
    <>
      <PanelHead title={label} sub={d.head ? `${t('org_head')} : ${d.head.full_name}` : t('org_no_head')} color={d.color} onClose={onClose} />
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
        {!edit ? (
          <>
            <Row k={t('org_head')} v={d.head ? <button type="button" onClick={() => onPerson(d.head!.id)} style={{ border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#0e6f84', cursor: 'pointer' }}>{d.head.full_name}</button> : t('org_head_none')} />
            <Row k={t('org_team')} v={tf(t('org_people'), { n: d.all - d.interns })} />
            {d.interns > 0 && <Row k={t('org_interns_label')} v={d.interns} />}
            {editable && (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setEdit(true)} style={saveBtn}><PencilLine size={14} />{t('org_edit')}</button>
                {d.all === 0 && <button type="button" onClick={() => del.mutate()} disabled={del.isPending} style={{ ...editBtn, color: '#a33a28', borderColor: '#f0c9c0' }}><Trash2 size={14} />{t('org_delete_dept')}</button>}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={e => { e.preventDefault(); save.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={lab} htmlFor="org-dname">{t('org_dept_name')}</label><input id="org-dname" value={name} onChange={e => setName(e.target.value)} style={field} />
              <small style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#7d8f97' }}>{t('org_rename_s')}</small></div>
            <div><label style={lab} htmlFor="org-dhead">{t('org_head')}</label>
              <select id="org-dhead" value={head} onChange={e => setHead(e.target.value)} style={field}>
                <option value="">{t('org_head_none')}</option>
                {inDept.length > 0 && <optgroup label={label}>{inDept.map(s => <option key={s.id} value={s.id}>{s.full_name}{s.position ? ` · ${s.position}` : ''}</option>)}</optgroup>}
                <optgroup label={t('org_other_people')}>{others.map(s => <option key={s.id} value={s.id}>{s.full_name}{s.department ? ` · ${s.department}` : ''}</option>)}</optgroup>
              </select></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setEdit(false)} style={editBtn}>{t('cancel')}</button>
              <button type="submit" disabled={save.isPending} style={saveBtn}>{save.isPending ? <Spinner size={13} color="#fff" /> : null}{t('org_save')}</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function TopPanel({ ceo, guessed, company, canEdit, staff, total, onClose, onSaved, onPerson }: {
  ceo?: OrgPerson; guessed: boolean; company: string; canEdit: boolean; staff: OrgPerson[]; total: number; onClose: () => void; onSaved: () => void; onPerson: (id: string) => void;
}) {
  const { t } = useLang();
  const notify = useNotify();
  const [edit, setEdit] = useState(false);
  const [who, setWho] = useState(ceo?.id ?? '');
  const save = useMutation({
    mutationFn: () => setOrgHead(who || null),
    onSuccess: () => { notify.success(t('org_saved')); setEdit(false); onSaved(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  return (
    <>
      <PanelHead title={ceo?.full_name || company} sub={ceo?.position || t('org_direction')} color={avatarGradient(company)} onClose={onClose} />
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
        {!edit ? (
          <>
            <Row k={t('org_direction')} v={ceo ? <button type="button" onClick={() => onPerson(ceo.id)} style={{ border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#0e6f84', cursor: 'pointer' }}>{ceo.full_name}</button> : t('org_head_none')} />
            <Row k={t('org_team')} v={tf(t('org_people'), { n: total })} />
            {guessed && <p style={{ margin: 0, fontSize: 12, color: '#8a5207', background: '#fdf1dc', padding: '8px 10px', borderRadius: 9 }}>{t('org_top_guess')}</p>}
            {canEdit && <button type="button" onClick={() => setEdit(true)} style={{ ...saveBtn, marginTop: 6 }}><PencilLine size={14} />{t(ceo && !guessed ? 'org_edit' : 'org_top_pick')}</button>}
          </>
        ) : (
          <form onSubmit={e => { e.preventDefault(); save.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={lab} htmlFor="org-top">{t('org_top')}</label>
              <select id="org-top" value={who} onChange={e => setWho(e.target.value)} style={field}>
                <option value="">{company}</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}{s.position ? ` · ${s.position}` : ''}</option>)}
              </select></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setEdit(false)} style={editBtn}>{t('cancel')}</button>
              <button type="submit" disabled={save.isPending} style={saveBtn}>{save.isPending ? <Spinner size={13} color="#fff" /> : null}{t('org_save')}</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function NewDept({ existing, onClose, onCreated }: { existing: string[]; onClose: () => void; onCreated: () => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const [name, setName] = useState('');
  const dup = !!name.trim() && existing.includes(keyOf(name));
  const create = useMutation({
    mutationFn: () => createOrgDept(name.trim()),
    onSuccess: () => { notify.success(t('org_saved')); onCreated(); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  return (
    <form onSubmit={e => { e.preventDefault(); if (name.trim() && !dup) create.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div><label style={lab} htmlFor="org-new">{t('org_dept_name')}</label>
        <input id="org-new" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Finance, Support client…" style={{ ...field, height: 40 }} />
        {dup && <small style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: '#a35b12' }}>{t('org_dept_exists')}</small>}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || dup || create.isPending}>{create.isPending ? <Spinner size={14} color="#fff" /> : <Plus size={14} />} {t('org_create')}</button>
      </div>
    </form>
  );
}
