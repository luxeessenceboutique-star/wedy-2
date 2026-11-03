import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, Download, FolderOpen, Mail, Maximize2, Minus, Network, Plus, Search, X } from 'lucide-react';
import { getOrgPeople, type OrgPerson } from '@/services/api';
import { RV } from '@/components/motion';
import { Drawer, Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import ProjectTeamsBoard from '@/components/orgchart/ProjectTeamsBoard';
import './OrgChartPage.css';

// Department colors of the handoff; other departments cycle through the palette
const DEPT_COLORS: Record<string, string> = { 'opérations': '#df9326', operations: '#df9326', commercial: '#16a06b', tech: '#6d5ad6', 'service client': '#0e6f84', marketing: '#df5740', finance: '#4a69d8', rh: '#16b6c8' };
const PALETTE = ['#0e6f84', '#6d5ad6', '#16a06b', '#df9326', '#df5740', '#4a69d8', '#16b6c8', '#b06b0c'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CEO_RE = /(directeur|directrice)\s+g[ée]n[ée]ral|\bceo\b|\bpdg\b|g[ée]rant|managing director|general manager|fondat/i;
const HEAD_RE: [RegExp, number][] = [[/directeur|directrice|director|head of|\bcto\b|\bcfo\b|\bcoo\b|\bcmo\b/i, 3], [/responsable|manager|lead/i, 2], [/chef/i, 1]];
const COL_W = 204, GAP = 16, TEAM_PREVIEW = 3;

type Dept = { name: string; color: string; head?: OrgPerson; members: OrgPerson[]; size: number };

function buildTree(people: OrgPerson[]) {
  const ceo = people.find(p => CEO_RE.test(p.position || ''));
  const byDept = new Map<string, OrgPerson[]>();
  people.filter(p => p.id !== ceo?.id).forEach(p => {
    const d = (p.department || '').trim() || '—';
    byDept.set(d, [...(byDept.get(d) ?? []), p]);
  });
  // how many people name each person as their manager
  const reports = new Map<string, number>();
  people.forEach(p => { const m = norm(p.manager || ''); if (m) reports.set(m, (reports.get(m) ?? 0) + 1); });
  const depts: Dept[] = [...byDept.entries()].map(([name, list], i) => {
    const score = (p: OrgPerson) => (HEAD_RE.find(([re]) => re.test(p.position || ''))?.[1] ?? 0) * 10 + (reports.get(norm(p.full_name)) ?? 0);
    const sorted = [...list].sort((a, b) => score(b) - score(a));
    const head = sorted[0] && score(sorted[0]) > 0 ? sorted[0] : undefined;
    const members = list.filter(p => p.id !== head?.id).sort((a, b) => score(b) - score(a) || a.full_name.localeCompare(b.full_name));
    return { name, color: DEPT_COLORS[norm(name)] ?? PALETTE[i % PALETTE.length], head, members, size: list.length };
  }).sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  return { ceo, depts };
}

type Sel = { person?: OrgPerson; dept: string; color: string; manager: string; team: string };

export default function OrgChartPage({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useLang();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [userZoom, setUserZoom] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const vpRef = useRef<HTMLDivElement>(null);

  const { data: people = [], isLoading } = useQuery({ queryKey: ['org-people'], queryFn: getOrgPeople });
  const { ceo, depts } = useMemo(() => buildTree(people), [people]);
  const company = typeof user?.profile?.company === 'string' && user.profile.company ? user.profile.company : t('tpl_company_fallback');
  const natW = Math.max(depts.length, 1) * (COL_W + GAP) - GAP + 80;

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

  const needle = norm(q.trim());
  const hit = (p?: OrgPerson, extra = '') => !!needle && !!p && norm(`${p.full_name} ${p.position ?? ''} ${p.department ?? ''} ${extra}`).includes(needle);
  const setZ = (z: number) => { setZoom(+Math.max(0.4, Math.min(1.5, z)).toFixed(2)); setUserZoom(true); };
  const allOpen = depts.every(d => !closed.has(d.name));
  const ring = (on: boolean, h: boolean) => (on ? ', 0 0 0 3px #16b6c8' : h ? ', 0 0 0 3px rgba(22,182,200,.5)' : '');
  const pick = (person: OrgPerson | undefined, dept: string, color: string, manager: string, team: string) => setSel({ person, dept, color, manager, team });

  const exportPdf = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = depts.map(d => `<section><h2 style="border-color:${d.color}">${d.name} <small>${d.size}</small></h2>${d.head ? `<p class="head">${d.head.full_name} — ${d.head.position ?? ''}</p>` : ''}<ul>${d.members.map(m => `<li>${m.full_name}<span>${m.position ?? ''}</span></li>`).join('')}</ul></section>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t('org_title')} — ${company}</title><style>@page{size:A3 landscape;margin:1.5cm}body{font-family:system-ui,sans-serif;color:#0a1c24}h1{font-size:22px;margin:0 0 4px}.sub{color:#52646d;margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}section{border:1px solid #e2e8eb;border-radius:12px;padding:12px}h2{font-size:15px;margin:0 0 6px;border-left:4px solid;padding-left:8px}h2 small{color:#5f7079;font-weight:500}.head{font-weight:600;margin:0 0 6px;font-size:13px}ul{margin:0;padding:0;list-style:none;font-size:12px}li{padding:3px 0;border-top:1px solid #eef2f4}li span{display:block;color:#5f7079;font-size:11px}</style></head><body><h1>${company}</h1><p class="sub">${ceo ? `${ceo.full_name} — ${ceo.position ?? ''} · ` : ''}${tf(t('org_sub'), { n: people.length, k: depts.length })}</p><div class="grid">${rows}</div></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  const ceoHit = hit(ceo);
  return (
    <div style={{ padding: '28px 32px 40px', display: 'flex', flexDirection: 'column', gap: 18, width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('org_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{company} · {tf(t('org_sub'), { n: people.length, k: depts.length })}</RV>
        </div>
        <RV as="div" variant="up" delay={100} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 240 }}>
            <Search size={16} style={{ position: 'absolute', insetInlineStart: 13, top: '50%', marginTop: -8, color: '#7d8f97', pointerEvents: 'none' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('org_find')} style={{ width: '100%', height: 42, paddingInline: '38px 12px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 14, color: '#0a1c24', outline: 'none' }} className="org-f1" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: 3, borderRadius: 12, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <button type="button" onClick={() => setZ(zoom - 0.1)} aria-label={t('org_zoom_out')} className="org-zbtn"><Minus size={16} /></button>
            <span style={{ minWidth: 50, textAlign: 'center', fontFamily: "'Geist Mono',monospace", fontSize: 12.5, color: '#33474f' }}>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZ(zoom + 0.1)} aria-label={t('org_zoom_in')} className="org-zbtn"><Plus size={16} /></button>
            <button type="button" onClick={() => fit(true)} aria-label={t('org_fit')} className="org-zbtn"><Maximize2 size={15} /></button>
          </div>
          <button type="button" onClick={() => setClosed(allOpen ? new Set(depts.map(d => d.name)) : new Set())} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} className="org-h1">
            {allOpen ? <ChevronsDownUp size={15} /> : <ChevronsUpDown size={15} />}{t(allOpen ? 'org_collapse' : 'org_expand')}
          </button>
          {!readOnly && (
            <button type="button" onClick={() => setTeamsOpen(true)} title={t('org_teams')} aria-label={t('org_teams')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', cursor: 'pointer' }} className="org-h1"><Network size={16} /></button>
          )}
          <button type="button" onClick={exportPdf} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px', borderRadius: 12, border: 'none', background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} className="org-h2">
            <Download size={15} />{t('org_export')}
          </button>
        </RV>
      </div>

      <div ref={vpRef} style={{ position: 'relative', height: 'calc(100vh - 220px)', minHeight: 520, borderRadius: 22, backgroundColor: '#ffffff', backgroundImage: 'radial-gradient(#e1e8eb 1px,transparent 1px)', backgroundSize: '22px 22px', border: '1px solid #e2e8eb', overflow: 'auto' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spinner /></div>
        ) : !people.length ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 14, color: '#52646d' }}>{t('org_empty')}</div>
        ) : (
          <div style={{ zoom, width: natW, margin: '0 auto', padding: '36px 40px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center' } as CSSProperties}>
            <RV as="button" variant="scale" type="button" onClick={() => pick(ceo, t('org_direction'), 'linear-gradient(135deg,#0e6f84,#16b6c8)', '—', tf(t('org_people'), { n: people.length }))}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 14px 14px', border: 'none', borderRadius: 18, background: 'linear-gradient(135deg,#06141a,#0d2a33)', color: '#e8eff1', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', boxShadow: `0 20px 40px -20px rgba(6,20,26,.7)${ring(!!sel && sel.person?.id === ceo?.id && !!ceo, ceoHit)}`, opacity: needle && !ceoHit ? 0.32 : 1, transition: 'opacity .2s,box-shadow .2s' }}>
              <span style={{ position: 'relative', width: 50, height: 50, flexShrink: 0 }}>
                <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.6)' }} />
                <span style={{ position: 'relative', width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', fontSize: 16, fontWeight: 700, color: '#ffffff' }}>{initialsOf(ceo?.full_name || company)}</span>
              </span>
              <span>
                <span style={{ display: 'block', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-.02em' }}>{ceo?.full_name || company}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: '#9fb4bb' }}>{ceo?.position ? `${ceo.position} · ` : ''}{tf(t('org_people'), { n: people.length })}</span>
              </span>
            </RV>
            <span style={{ width: 2, height: 28, background: '#c9d6db' }} />
            <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
              {depts.map((d, i) => {
                const last = depts.length - 1;
                const memberHit = d.members.some(m => hit(m));
                const headHit = hit(d.head, d.name) || (!d.head && !!needle && norm(d.name).includes(needle));
                const open = !closed.has(d.name) || memberHit;
                const showAll = expanded.has(d.name) || memberHit;
                const team = showAll ? d.members : d.members.slice(0, TEAM_PREVIEW);
                const more = d.members.length - team.length;
                const headName = d.head?.full_name || d.name;
                return (
                  <div key={d.name} style={{ position: 'relative', width: COL_W, paddingTop: 28, display: 'flex', flexDirection: 'column' }}>
                    {depts.length > 1 && <span style={{ position: 'absolute', top: 0, height: 2, left: i === 0 ? 102 : -8, right: i === last ? 102 : -8, background: '#c9d6db' }} />}
                    <span style={{ position: 'absolute', top: 0, left: 101, width: 2, height: 28, background: '#c9d6db' }} />
                    <RV as="div" variant="up" delay={120 + Math.min(i, 10) * 60} style={{ position: 'relative', borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: `0 10px 24px -18px rgba(10,28,36,.5)${ring(!!sel && !!d.head && sel.person?.id === d.head.id, headHit)}`, opacity: needle && !headHit && !memberHit ? 0.32 : 1, overflow: 'hidden', transition: 'opacity .2s,box-shadow .2s' }}>
                      <span style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: d.color }} />
                      <button type="button" onClick={() => pick(d.head, d.name, d.color, ceo?.full_name || '—', tf(t('org_people'), { n: d.size }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '15px 12px 11px', border: 'none', background: 'transparent', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer' }}>
                        <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.color, color: '#ffffff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{initialsOf(headName)}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#0a1c24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{headName}</span>
                          <span style={{ display: 'block', fontSize: 11.5, color: '#5f7079', lineHeight: 1.35 }}>{d.head ? d.head.position || '—' : t('org_no_head')}</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => setClosed(s => { const n = new Set(s); if (n.has(d.name)) n.delete(d.name); else n.add(d.name); return n; })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'none', borderTop: '1px solid #eef2f4', background: '#f8fafb', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#33474f', cursor: 'pointer' }} className="org-h3">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />{d.name}
                        <span style={{ marginInlineStart: 'auto', fontFamily: "'Geist Mono',monospace", fontSize: 11, color: '#5f7079' }}>{d.size}</span>
                        {open ? <ChevronUp size={14} style={{ color: '#7d8f97' }} /> : <ChevronDown size={14} style={{ color: '#7d8f97' }} />}
                      </button>
                    </RV>
                    {open && d.members.length > 0 && (
                      <div style={{ position: 'relative', padding: '12px 0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ position: 'absolute', left: 12, top: 0, bottom: more > 0 || showAll ? 49 : 25, width: 2, background: '#c9d6db' }} />
                        {team.map((m, k) => {
                          const h = hit(m);
                          return (
                            <RV key={m.id} as="button" variant="right" delay={Math.min(k, 8) * 60} type="button" onClick={() => pick(m, d.name, d.color, m.manager || d.head?.full_name || '—', '—')}
                              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 12, border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', boxShadow: `0 6px 16px -14px rgba(10,28,36,.5)${ring(sel?.person?.id === m.id, h)}`, opacity: needle && !h ? 0.32 : 1, transition: 'opacity .2s,box-shadow .2s,transform .2s' }} className="org-h4">
                              <span style={{ position: 'absolute', left: -12, top: '50%', width: 12, height: 2, background: '#c9d6db' }} />
                              <span style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.color, color: '#ffffff', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{initialsOf(m.full_name)}</span>
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#0a1c24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name}</span>
                                <span style={{ display: 'block', fontSize: 11, color: '#5f7079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.position || '—'}</span>
                              </span>
                            </RV>
                          );
                        })}
                        {(more > 0 || (showAll && d.members.length > TEAM_PREVIEW)) && (
                          <button type="button" onClick={() => setExpanded(s => { const n = new Set(s); if (n.has(d.name)) n.delete(d.name); else n.add(d.name); return n; })} style={{ height: 16, padding: '0 0 0 2px', border: 'none', background: 'none', textAlign: 'start', fontFamily: 'inherit', fontSize: 11.5, lineHeight: '16px', color: '#7d8f97', cursor: 'pointer' }}>
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
        <RV as="div" variant="up" style={{ position: 'fixed', insetInlineEnd: 24, bottom: 24, zIndex: 90, width: 320, maxWidth: 'calc(100vw - 48px)', borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 30px 70px -24px rgba(10,28,36,.5)', overflow: 'hidden' }}>
          <div style={{ position: 'relative', padding: 18, background: '#06141a', color: '#e8eff1' }}>
            <button type="button" onClick={() => setSel(null)} aria-label={t('close')} style={{ position: 'absolute', top: 12, insetInlineEnd: 12, width: 32, height: 32, border: 'none', borderRadius: 9, background: 'rgba(255,255,255,.08)', color: '#e8eff1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingInlineEnd: 30 }}>
              <span style={{ width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel.person ? sel.color : avatarGradient(sel.dept), color: '#ffffff', fontSize: 16, fontWeight: 700, border: '2px solid rgba(255,255,255,.2)', flexShrink: 0 }}>{initialsOf(sel.person?.full_name || sel.dept)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-.02em' }}>{sel.person?.full_name || sel.dept}</div>
                <div style={{ fontSize: 12.5, color: '#9fb4bb' }}>{sel.person?.position || (sel.person ? '—' : t('org_no_head'))}</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: '#5f7079' }}>{t('org_dept')}</span><span style={{ fontWeight: 600 }}>{sel.dept}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: '#5f7079' }}>{t('org_manager')}</span><span style={{ fontWeight: 600 }}>{sel.manager}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: '#5f7079' }}>{t('org_team')}</span><span style={{ fontWeight: 600 }}>{sel.team}</span></div>
            {sel.person?.email && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: '#5f7079' }}>Email</span><span style={{ fontWeight: 500, color: '#0e6f84', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sel.person.email}</span></div>}
            {sel.person && (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {!readOnly && (
                  <Link to={`/app/employees/${sel.person.id}`} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: 13, fontWeight: 600 }} className="org-h5"><FolderOpen size={14} />{t('org_open_file')}</Link>
                )}
                {sel.person.email && <a href={`mailto:${sel.person.email}`} aria-label={t('org_send_mail')} style={{ width: readOnly ? 'auto' : 38, flex: readOnly ? 1 : undefined, height: 38, borderRadius: 10, border: '1px solid #d6dfe3', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#33474f', fontSize: 13, fontWeight: 600 }} className="org-h6"><Mail size={15} />{readOnly ? t('org_send_mail') : null}</a>}
              </div>
            )}
          </div>
        </RV>
      )}

      {!readOnly && (
        <Drawer open={teamsOpen} onClose={() => setTeamsOpen(false)} title={t('org_teams')} subtitle={t('org_teams_sub')} icon={<Network size={17} />} width={1180}>
          <ProjectTeamsBoard />
        </Drawer>
      )}
    </div>
  );
}
