import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Database, ChevronRight, RefreshCw, Search, LayoutGrid, Code2,
  X, Eye, ArrowRight, Table2, AlertTriangle, Link2, Hash,
  Type, Calendar, Mail, Globe, ToggleLeft, Paperclip, Key,
  Layers, Filter, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Spinner } from '../../components/ui';
import { toast } from 'sonner';

// ── API ───────────────────────────────────────────────────────────────────────

// API calls proxied through our backend — key never exposed to browser
const BASE_ID = 'prd6w1jt4faaysm';

const dbGet = async (path: string, params?: Record<string, any>) => {
  const token = localStorage.getItem('wedy_token');
  const res = await axios.get(`/api/smartdb${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    params,
  });
  return res.data;
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface DBTable { id: string; title: string; type?: string; }
interface DBColumn {
  id: string; title: string;
  uidt?: string; dt?: string;
  pk?: boolean; rqd?: boolean; ai?: boolean; unique?: boolean;
  colOptions?: { type?: string; fk_related_model_id?: string };
}
interface PageInfo { totalRows?: number }

// ── Column type config ────────────────────────────────────────────────────────

const COL_TYPES: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  SingleLineText:      { label: 'Texte',      color: '#475569', bg: '#f1f5f9', icon: <Type size={11} /> },
  LongText:            { label: 'Long texte', color: '#64748b', bg: '#f8fafc', icon: <Type size={11} /> },
  Email:               { label: 'Email',      color: '#7c3aed', bg: '#f5f3ff', icon: <Mail size={11} /> },
  URL:                 { label: 'URL',        color: '#2563eb', bg: '#eff6ff', icon: <Globe size={11} /> },
  Number:              { label: 'Nombre',     color: '#0891b2', bg: '#ecfeff', icon: <Hash size={11} /> },
  Decimal:             { label: 'Décimal',    color: '#0284c7', bg: '#f0f9ff', icon: <Hash size={11} /> },
  Currency:            { label: 'Devise',     color: '#059669', bg: '#ecfdf5', icon: <Hash size={11} /> },
  Percent:             { label: '%',          color: '#16a34a', bg: '#f0fdf4', icon: <Hash size={11} /> },
  Date:                { label: 'Date',       color: '#d97706', bg: '#fffbeb', icon: <Calendar size={11} /> },
  DateTime:            { label: 'DateHeure',  color: '#b45309', bg: '#fef3c7', icon: <Calendar size={11} /> },
  Time:                { label: 'Heure',      color: '#ca8a04', bg: '#fefce8', icon: <Calendar size={11} /> },
  Checkbox:            { label: 'Booléen',    color: '#dc2626', bg: '#fef2f2', icon: <ToggleLeft size={11} /> },
  MultiSelect:         { label: 'Multi',      color: '#7c3aed', bg: '#faf5ff', icon: <Layers size={11} /> },
  SingleSelect:        { label: 'Liste',      color: '#6d28d9', bg: '#f5f3ff', icon: <ChevronDown size={11} /> },
  Attachment:          { label: 'Fichier',    color: '#9333ea', bg: '#fdf4ff', icon: <Paperclip size={11} /> },
  ID:                  { label: 'ID',         color: '#0f172a', bg: '#f1f5f9', icon: <Key size={11} /> },
  LinkToAnotherRecord: { label: 'Relation',   color: '#0891b2', bg: '#ecfeff', icon: <Link2 size={11} /> },
  Lookup:              { label: 'Lookup',     color: '#0369a1', bg: '#e0f2fe', icon: <Search size={11} /> },
  Formula:             { label: 'Formule',    color: '#0369a1', bg: '#f0f9ff', icon: <Hash size={11} /> },
};
const getCT = (uidt?: string) => COL_TYPES[uidt ?? ''] ?? { label: uidt || '?', color: '#64748b', bg: '#f1f5f9', icon: <Type size={11} /> };

// ── Table palette (consistent color per table) ────────────────────────────────

const PALETTE = [
  '#0891b2','#7c3aed','#10b981','#f59e0b','#ef4444',
  '#ec4899','#06b6d4','#84cc16','#8b5cf6','#f97316',
  '#14b8a6','#a855f7','#22c55e','#eab308','#3b82f6',
];
const tColor = (i: number) => PALETTE[i % PALETTE.length];

// ── Response parsers ──────────────────────────────────────────────────────────

const pickArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  for (const k of ['list','data','columns','fields','records','results','rows','items','tables'])
    if (Array.isArray(data?.[k])) return data[k];
  if (data && typeof data === 'object') {
    const found = Object.values(data).find(v => Array.isArray(v));
    if (found) return found as any[];
  }
  return [];
};

const parseColumns = (raw: any[]): DBColumn[] =>
  raw.map(c => ({
    id:    c.id ?? c._id ?? String(Math.random()),
    title: c.title ?? c.name ?? c.column_name ?? c.field ?? c.label ?? c.key ?? '?',
    uidt:  c.uidt ?? c.type ?? c.dataType ?? c.field_type ?? c.ui_type,
    dt:    c.dt ?? c.db_type ?? c.dbType ?? c.data_type,
    pk:    c.pk ?? c.primary_key ?? c.is_pk ?? false,
    rqd:   c.rqd ?? c.required ?? c.not_null ?? c.is_required ?? false,
    ai:    c.ai ?? c.auto_increment ?? c.is_auto_increment ?? false,
    unique: c.unique ?? c.is_unique ?? false,
    colOptions: c.colOptions ?? c.col_options ?? c.options,
  }));

const parsePageInfo = (data: any): PageInfo => {
  if (Array.isArray(data)) return { totalRows: data.length };
  const pi = data?.pageInfo ?? data?.page_info ?? data?.pagination ?? data?.meta ?? {};
  return { totalRows: pi.totalRows ?? pi.total_rows ?? pi.total ?? pi.count ?? data?.total ?? data?.count };
};

// ── Cell renderer ─────────────────────────────────────────────────────────────

function Cell({ val, col }: { val: any; col: DBColumn }) {
  if (val === null || val === undefined)
    return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 11 }}>—</span>;
  if (col.uidt === 'Checkbox')
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 18, height: 18, borderRadius: 4,
        background: val ? '#dcfce7' : '#f1f5f9',
        color: val ? '#16a34a' : '#94a3b8', fontSize: 11, fontWeight: 800,
      }}>{val ? '✓' : '✗'}</span>
    );
  if (col.uidt === 'Attachment')
    return <span style={{ fontSize: 11, padding: '2px 8px', background: '#fdf4ff', color: '#9333ea', borderRadius: 6, border: '1px solid #e9d5ff' }}>📎 Fichier</span>;
  if (col.uidt === 'MultiSelect') {
    const opts = Array.isArray(val) ? val : String(val).split(',');
    const CHIP_COLORS = ['#ecfeff','#f5f3ff','#ecfdf5','#fffbeb','#fef2f2'];
    const CHIP_TEXT   = ['#0891b2','#7c3aed','#059669','#d97706','#dc2626'];
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {opts.slice(0, 3).map((o: any, i) => (
          <span key={i} style={{ fontSize: 10, padding: '2px 7px', background: CHIP_COLORS[i % 5], color: CHIP_TEXT[i % 5], borderRadius: 999, fontWeight: 600, border: `1px solid ${CHIP_COLORS[i % 5]}` }}>
            {String(o).trim()}
          </span>
        ))}
        {opts.length > 3 && <span style={{ fontSize: 10, color: '#94a3b8', alignSelf: 'center' }}>+{opts.length - 3}</span>}
      </div>
    );
  }
  if (col.uidt === 'SingleSelect') {
    const ct = getCT(col.uidt);
    return <span style={{ fontSize: 11, padding: '2px 9px', background: ct.bg, color: ct.color, borderRadius: 999, fontWeight: 600 }}>{String(val)}</span>;
  }
  if (col.uidt === 'URL' && typeof val === 'string' && val.startsWith('http'))
    return <a href={val} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 12, textDecoration: 'underline' }}>🔗 {val.slice(0, 30)}…</a>;
  if (col.uidt === 'Email')
    return <span style={{ color: '#7c3aed', fontSize: 12 }}>{String(val)}</span>;
  if (col.uidt === 'DateTime' || col.uidt === 'Date') {
    try { return <span style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>{new Date(val).toLocaleDateString('fr-MA')}</span>; }
    catch { return <span style={{ fontSize: 12 }}>{String(val)}</span>; }
  }
  if (col.pk)
    return <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#475569', background: '#f8fafc', padding: '1px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>{String(val)}</span>;
  const s = String(val);
  return <span style={{ fontSize: 13, color: 'var(--fg)' }}>{s.length > 50 ? s.slice(0, 50) + '…' : s}</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RecruitmentPage() {
  const [tables, setTables]       = useState<DBTable[]>([]);
  const [active, setActive]       = useState<DBTable | null>(null);
  const [columns, setColumns]     = useState<DBColumn[]>([]);
  const [records, setRecords]     = useState<any[]>([]);
  const [pageInfo, setPageInfo]   = useState<PageInfo>({});
  const [tab, setTab]             = useState<'data' | 'schema'>('data');
  const [offset, setOffset]       = useState(0);
  const [search, setSearch]       = useState('');
  const [loadTables, setLoadTables] = useState(false);
  const [loadData, setLoadData]   = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [rowDetail, setRowDetail] = useState<any | null>(null);
  const [sideSearch, setSideSearch] = useState('');

  const LIMIT = 50;
  const activeIdx = tables.findIndex(t => t.id === active?.id);

  const fetchTables = async () => {
    setLoadTables(true); setErr(null);
    try {
      const data = await dbGet(`/bases/${BASE_ID}/tables`);
      const list: DBTable[] = Array.isArray(data) ? data : (data.list ?? data.tables ?? []);
      setTables(list);
      if (list.length && !active) setActive(list[0]);
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.message || 'Erreur API';
      setErr(msg); toast.error(msg);
    } finally { setLoadTables(false); }
  };

  const fetchTableData = useCallback(async (tbl: DBTable, off = 0) => {
    setLoadData(true); setErr(null);
    try {
      const [colRes, recRes] = await Promise.all([
        dbGet(`/tables/${tbl.id}/columns`),
        dbGet(`/tables/${tbl.id}/records`, { limit: LIMIT, offset: off }),
      ]);
      console.log('[SmartDB] cols:', JSON.stringify(colRes).slice(0, 300));
      console.log('[SmartDB] recs:', JSON.stringify(recRes).slice(0, 300));
      setColumns(parseColumns(pickArray(colRes)));
      setRecords(pickArray(recRes));
      setPageInfo(parsePageInfo(recRes));
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.message || 'Erreur';
      setErr(msg); toast.error(msg);
    } finally { setLoadData(false); }
  }, []);

  useEffect(() => { fetchTables(); }, []);
  useEffect(() => {
    if (active) { setOffset(0); setSearch(''); fetchTableData(active, 0); }
  }, [active, fetchTableData]);

  const goPage = (o: number) => { setOffset(o); if (active) fetchTableData(active, o); };
  const visCols = columns.filter(c => c.title && c.title !== '?' && c.title !== 'nc_order');
  const filteredRec = search ? records.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))) : records;
  const total    = pageInfo.totalRows ?? filteredRec.length;
  const curPage  = Math.floor(offset / LIMIT) + 1;
  const totPages = Math.max(1, Math.ceil(total / LIMIT));
  const relTable = (col: DBColumn) => col.uidt === 'LinkToAnotherRecord' && col.colOptions?.fk_related_model_id ? tables.find(t => t.id === col.colOptions!.fk_related_model_id) : null;
  const filteredTables = sideSearch ? tables.filter(t => t.title.toLowerCase().includes(sideSearch.toLowerCase())) : tables;

  const pkCols  = visCols.filter(c => c.pk).length;
  const relCols = visCols.filter(c => c.uidt === 'LinkToAnotherRecord').length;
  const rqdCols = visCols.filter(c => c.rqd).length;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════ */}
      <aside style={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-elev)',
      }}>

        {/* DB Header */}
        <div style={{
          padding: '16px 14px 12px',
          background: 'linear-gradient(135deg, #0c0f1d 0%, #0f172a 100%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #0891b2 0%, #7c3aed 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 3px rgba(8,145,178,0.25)',
            }}>
              <Database size={18} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: 0, color: '#f8fafc', letterSpacing: '-0.01em' }}>Recrutement DB</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                {loadTables ? '…' : `${tables.length} tables`}
              </p>
            </div>
            <button onClick={fetchTables} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
              <RefreshCw size={12} style={{ animation: loadTables ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
          {/* Sidebar search */}
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
            <input
              value={sideSearch}
              onChange={e => setSideSearch(e.target.value)}
              placeholder="Filtrer les tables…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 7, padding: '6px 10px 6px 26px',
                fontSize: 12, color: '#f1f5f9', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Table list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {loadTables ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}><Spinner /></div>
          ) : filteredTables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--fg-muted)' }}>
              <p style={{ fontSize: 12 }}>Aucune table trouvée</p>
            </div>
          ) : filteredTables.map((t) => {
            const idx      = tables.findIndex(x => x.id === t.id);
            const isActive = active?.id === t.id;
            const color    = tColor(idx);
            return (
              <button key={t.id} onClick={() => setActive(t)}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 10px', marginBottom: 1, borderRadius: 8, cursor: 'pointer',
                  border: 'none', outline: 'none',
                  background: isActive ? `${color}18` : 'transparent',
                  borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; (e.currentTarget as HTMLButtonElement).style.borderLeft = `3px solid ${color}44`; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderLeft = '3px solid transparent'; } }}
              >
                {/* Color dot */}
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: isActive ? `0 0 0 3px ${color}33` : 'none', transition: 'all 0.15s' }} />
                <span style={{
                  flex: 1, fontSize: 12, fontWeight: isActive ? 600 : 400,
                  color: isActive ? color : 'var(--fg)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t.title}
                </span>
                {isActive && <ChevronRight size={11} style={{ color, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ padding: '10px 12px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <p style={{ fontSize: 9, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7, fontWeight: 700 }}>TYPES</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { color: '#f59e0b', label: 'Clé primaire (PK)' },
              { color: '#0891b2', label: 'Relation FK' },
              { color: '#7c3aed', label: 'Email / URL' },
              { color: '#10b981', label: 'Nombre / Devise' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

        {!active ? (
          /* Empty state */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #ecfeff, #f5f3ff)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Database size={32} style={{ color: '#0891b2', opacity: 0.6 }} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: 'var(--fg)' }}>Sélectionnez une table</p>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', maxWidth: 260 }}>Choisissez une table dans le panneau gauche pour explorer ses données et son schéma.</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div style={{
              padding: '0 20px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
              background: 'var(--bg-elev)',
            }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0 10px' }}>
                {/* Color pill + name */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 12px 5px 8px',
                  background: `${tColor(activeIdx)}12`,
                  border: `1px solid ${tColor(activeIdx)}33`,
                  borderRadius: 20, flexShrink: 0,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: tColor(activeIdx), boxShadow: `0 0 0 3px ${tColor(activeIdx)}33` }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: tColor(activeIdx) }}>{active.title}</span>
                </div>

                {/* Stats chips */}
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                  {[
                    { val: total.toLocaleString(), label: 'lignes', color: '#0f172a', bg: '#f8fafc' },
                    { val: visCols.length, label: 'colonnes', color: '#0891b2', bg: '#ecfeff' },
                    ...(pkCols  ? [{ val: pkCols,  label: 'PK',       color: '#b45309', bg: '#fef3c7' }] : []),
                    ...(relCols ? [{ val: relCols, label: 'relations', color: '#0891b2', bg: '#ecfeff' }] : []),
                    ...(rqdCols ? [{ val: rqdCols, label: 'requis',    color: '#7c3aed', bg: '#f5f3ff' }] : []),
                  ].map((s, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', background: s.bg, color: s.color, borderRadius: 999, border: `1px solid ${s.bg}` }}>
                      {s.val} <span style={{ fontWeight: 400, opacity: 0.7 }}>{s.label}</span>
                    </span>
                  ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
                  <input className="input"
                    style={{ paddingLeft: 28, fontSize: 12, padding: '6px 10px 6px 28px', width: 200 }}
                    placeholder="Rechercher…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {/* Refresh */}
                <button onClick={() => active && fetchTableData(active, offset)}
                  style={{ background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)', padding: '5px 8px', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                  <RefreshCw size={13} />
                </button>
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--border)', marginTop: 0 }}>
                {([
                  { key: 'data',   icon: <LayoutGrid size={13} />, label: 'Données' },
                  { key: 'schema', icon: <Code2 size={13} />,      label: 'Schéma' },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '9px 16px', fontSize: 12, fontWeight: 600,
                      border: 'none', cursor: 'pointer', background: 'none',
                      color: tab === t.key ? tColor(activeIdx) : 'var(--fg-muted)',
                      borderBottom: tab === t.key ? `2px solid ${tColor(activeIdx)}` : '2px solid transparent',
                      transition: 'all 0.15s', marginBottom: -1,
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {err && (
              <div style={{ padding: '9px 20px', background: '#fef2f2', color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderBottom: '1px solid #fecaca' }}>
                <AlertTriangle size={14} /> {err}
                <button onClick={() => setErr(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><X size={13} /></button>
              </div>
            )}

            {loadData ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Spinner />
                <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Chargement de {active.title}…</p>
              </div>

            ) : tab === 'schema' ? (
              /* ════ SCHEMA TAB ════ */
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                {/* Relations banner */}
                {relCols > 0 && (
                  <div style={{
                    marginBottom: 20, padding: '14px 18px',
                    background: 'linear-gradient(135deg, #ecfeff 0%, #f0f9ff 100%)',
                    border: '1px solid #a5f3fc', borderRadius: 12,
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}>
                    <Link2 size={18} style={{ color: '#0891b2', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#0891b2', marginBottom: 8 }}>Relations détectées</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {visCols.filter(c => c.uidt === 'LinkToAnotherRecord').map(col => {
                          const rel = relTable(col);
                          return (
                            <span key={col.id} style={{
                              fontSize: 12, padding: '4px 12px', borderRadius: 8,
                              background: '#fff', border: '1px solid #a5f3fc',
                              display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500,
                            }}>
                              <span style={{ color: '#0f172a' }}>{active.title}</span>
                              <ArrowRight size={11} style={{ color: '#0891b2' }} />
                              <span style={{ color: '#0891b2' }}>{rel ? rel.title : col.title}</span>
                              {col.colOptions?.type && (
                                <span style={{ fontSize: 10, color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
                                  {col.colOptions.type}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Column cards grid */}
                {visCols.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-muted)' }}>
                    <p>Aucune colonne trouvée</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {visCols.map((col, i) => {
                      const ct  = getCT(col.uidt);
                      const rel = relTable(col);
                      return (
                        <div key={col.id} style={{
                          background: 'var(--bg-elev)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          overflow: 'hidden',
                          transition: 'box-shadow 0.15s, transform 0.15s',
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
                        >
                          {/* Card accent bar */}
                          <div style={{ height: 3, background: col.pk ? '#f59e0b' : col.uidt === 'LinkToAnotherRecord' ? '#0891b2' : ct.color }} />

                          <div style={{ padding: '12px 14px' }}>
                            {/* Column name row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ width: 26, height: 26, borderRadius: 6, background: ct.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ct.color }}>
                                  {ct.icon}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{col.title}</span>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>#{i + 1}</span>
                            </div>

                            {/* Type info */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: col.pk ? '#fef3c7' : ct.bg, color: col.pk ? '#b45309' : ct.color, borderRadius: 5 }}>
                                {col.pk ? '🔑 PK' : ct.label}
                              </span>
                              {col.dt && (
                                <span style={{ fontSize: 10, padding: '2px 7px', background: '#f8fafc', color: '#64748b', borderRadius: 5, fontFamily: 'monospace', border: '1px solid #e2e8f0' }}>
                                  {col.dt}
                                </span>
                              )}
                            </div>

                            {/* Property chips */}
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {col.rqd && (
                                <span style={{ fontSize: 10, padding: '1px 6px', background: '#fef2f2', color: '#dc2626', borderRadius: 4, fontWeight: 600 }}>Requis</span>
                              )}
                              {col.ai && (
                                <span style={{ fontSize: 10, padding: '1px 6px', background: '#f0fdf4', color: '#16a34a', borderRadius: 4, fontWeight: 600 }}>Auto</span>
                              )}
                              {col.unique && (
                                <span style={{ fontSize: 10, padding: '1px 6px', background: '#f0f9ff', color: '#0369a1', borderRadius: 4, fontWeight: 600 }}>Unique</span>
                              )}
                              {rel && (
                                <span style={{ fontSize: 10, padding: '1px 6px', background: '#ecfeff', color: '#0891b2', borderRadius: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <ArrowRight size={9} /> {rel.title}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            ) : (
              /* ════ DATA TAB ════ */
              <>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {filteredRec.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--fg-muted)' }}>
                      <Table2 size={40} style={{ opacity: 0.12, marginBottom: 14 }} />
                      <p style={{ fontWeight: 600 }}>Aucun enregistrement{search ? ` pour "${search}"` : ''}</p>
                      {search && <button onClick={() => setSearch('')} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13 }}>Effacer la recherche</button>}
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr style={{ background: 'var(--bg-elev)' }}>
                          {/* Row number col */}
                          <th style={{
                            width: 52, padding: '11px 14px', fontWeight: 600, color: 'var(--fg-muted)',
                            fontSize: 11, borderRight: '1px solid var(--border)',
                            borderBottom: `2px solid ${tColor(activeIdx)}`, textAlign: 'center',
                          }}>#</th>

                          {visCols.map(col => {
                            const ct = getCT(col.uidt);
                            return (
                              <th key={col.id} style={{
                                padding: '0', textAlign: 'left', fontWeight: 600,
                                fontSize: 11, whiteSpace: 'nowrap',
                                borderRight: '1px solid var(--border)',
                                borderBottom: `2px solid ${tColor(activeIdx)}`,
                                minWidth: 130,
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px' }}>
                                  {/* type icon colored */}
                                  <span style={{ color: col.pk ? '#f59e0b' : ct.color, display: 'flex', flexShrink: 0 }}>
                                    {col.pk ? <Key size={11} /> : ct.icon}
                                  </span>
                                  <span style={{ color: 'var(--fg)', letterSpacing: '-0.01em' }}>{col.title}</span>
                                </div>
                              </th>
                            );
                          })}

                          <th style={{ width: 48, borderBottom: `2px solid ${tColor(activeIdx)}`, borderLeft: '1px solid var(--border)' }} />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRec.map((row, ri) => (
                          <tr key={ri}
                            style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: ri % 2 === 0 ? 'transparent' : 'var(--bg-muted)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = `${tColor(activeIdx)}08`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ri % 2 === 0 ? 'transparent' : 'var(--bg-muted)'; }}
                            onClick={() => setRowDetail(row)}
                          >
                            <td style={{ padding: '9px 14px', color: '#cbd5e1', fontSize: 11, borderRight: '1px solid var(--border)', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                              {offset + ri + 1}
                            </td>
                            {visCols.map(col => (
                              <td key={col.id} style={{ padding: '8px 14px', borderRight: '1px solid var(--border)', maxWidth: 260, overflow: 'hidden' }}>
                                <Cell val={row[col.title]} col={col} />
                              </td>
                            ))}
                            <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                              <button
                                onClick={e => { e.stopPropagation(); setRowDetail(row); }}
                                style={{ background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)', padding: '3px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-soft)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)'; }}
                              >
                                <Eye size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {total > LIMIT && (
                  <div style={{
                    padding: '10px 20px', borderTop: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0, background: 'var(--bg-elev)',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                      Affichage <b style={{ color: 'var(--fg)' }}>{offset + 1}–{Math.min(offset + LIMIT, total)}</b> sur <b style={{ color: 'var(--fg)' }}>{total.toLocaleString()}</b> enregistrements
                    </span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[
                        { label: '«', o: 0, disabled: offset === 0 },
                        { label: '‹', o: Math.max(0, offset - LIMIT), disabled: offset === 0 },
                      ].map(b => (
                        <button key={b.label} onClick={() => !b.disabled && goPage(b.o)} disabled={b.disabled}
                          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', cursor: b.disabled ? 'not-allowed' : 'pointer', color: b.disabled ? '#cbd5e1' : 'var(--fg)', fontSize: 13, fontWeight: 700, opacity: b.disabled ? 0.5 : 1 }}>
                          {b.label}
                        </button>
                      ))}
                      <span style={{
                        fontSize: 12, color: 'var(--fg)', padding: '5px 14px',
                        background: `${tColor(activeIdx)}18`, border: `1px solid ${tColor(activeIdx)}44`,
                        borderRadius: 7, fontWeight: 700,
                      }}>
                        {curPage} / {totPages}
                      </span>
                      {[
                        { label: '›', o: offset + LIMIT, disabled: offset + LIMIT >= total },
                        { label: '»', o: (totPages - 1) * LIMIT, disabled: offset + LIMIT >= total },
                      ].map(b => (
                        <button key={b.label} onClick={() => !b.disabled && goPage(b.o)} disabled={b.disabled}
                          style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', cursor: b.disabled ? 'not-allowed' : 'pointer', color: b.disabled ? '#cbd5e1' : 'var(--fg)', fontSize: 13, fontWeight: 700, opacity: b.disabled ? 0.5 : 1 }}>
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ════════════════════════════════════════
          ROW DETAIL MODAL
      ════════════════════════════════════════ */}
      {rowDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setRowDetail(null)}>
          <div style={{
            background: 'var(--bg-elev)', borderRadius: 16,
            boxShadow: '0 32px 80px rgba(0,0,0,0.35)', border: '1px solid var(--border)',
            width: '100%', maxWidth: 580, maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{
              padding: '14px 20px', flexShrink: 0,
              background: `linear-gradient(135deg, ${tColor(activeIdx)}18 0%, transparent 100%)`,
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${tColor(activeIdx)}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={15} style={{ color: tColor(activeIdx) }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: 'var(--fg)' }}>{active?.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{visCols.length} champs</p>
                </div>
              </div>
              <button onClick={() => setRowDetail(null)} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)', padding: 6, borderRadius: 8, display: 'flex' }}><X size={15} /></button>
            </div>

            {/* Modal body — 2-column grid */}
            <div style={{ overflowY: 'auto', padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                {visCols.map(col => {
                  const ct  = getCT(col.uidt);
                  const val = rowDetail[col.title];
                  const isEmpty = val === null || val === undefined || val === '';
                  return (
                    <div key={col.id} style={{
                      background: 'var(--bg-muted)', borderRadius: 10,
                      padding: '10px 12px', border: '1px solid var(--border)',
                      borderLeft: `3px solid ${col.pk ? '#f59e0b' : col.uidt === 'LinkToAnotherRecord' ? '#0891b2' : ct.color}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                        <span style={{ color: col.pk ? '#f59e0b' : ct.color, display: 'flex' }}>{col.pk ? <Key size={10} /> : ct.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col.title}</span>
                      </div>
                      <div style={{ paddingLeft: 2 }}>
                        {isEmpty ? (
                          <span style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>vide</span>
                        ) : (
                          <Cell val={val} col={col} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
