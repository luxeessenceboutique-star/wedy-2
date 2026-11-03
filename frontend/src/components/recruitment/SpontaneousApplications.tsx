import React, { useState, useEffect, useCallback } from 'react';
import { api, getApiError } from '@/services/api';
import {
  RefreshCw, Search, X, Eye, Table2, AlertTriangle,
  Hash, Calendar, Mail, Globe, ToggleLeft, Paperclip, Key,
  Layers, ChevronDown, Type, Link2,
} from 'lucide-react';
import { Spinner } from '../../components/ui';

// ── Proxy helper ──────────────────────────────────────────────────────────────

const BASE_ID = 'prd6w1jt4faaysm';

const dbGet = async (path: string, params?: Record<string, any>) => {
  const res = await api.get(`/smartdb${path}`, { params });
  return res.data;
};

// Tables to hide (internal/system tables only)
const EXCLUDED_IDS = new Set<string>([]);
const isExcluded = (t: DBTable) =>
  EXCLUDED_IDS.has(t.id) ||
  ['faq', 'tech', 'test', 'qa', 'testing', 'new table', 'règles'].some(kw =>
    t.title.toLowerCase().includes(kw)
  );

// ── Types ─────────────────────────────────────────────────────────────────────

interface DBTable { id: string; title: string; type?: string }
interface DBColumn {
  id: string; title: string; uidt?: string; dt?: string;
  pk?: boolean; rqd?: boolean; ai?: boolean;
  colOptions?: { type?: string };
}
interface PageInfo { totalRows?: number }

// ── Column types ──────────────────────────────────────────────────────────────

const COL_TYPES: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  SingleLineText:      { label: 'Texte',      color: 'var(--ink-2)',  bg: 'var(--surface-2)',     icon: <Type size={11} /> },
  LongText:            { label: 'Long texte', color: 'var(--ink-2)',  bg: 'var(--surface-2)',     icon: <Type size={11} /> },
  Email:               { label: 'Email',      color: '#7c3aed',          bg: 'var(--violet-soft)',             icon: <Mail size={11} /> },
  URL:                 { label: 'URL',        color: '#2563eb',          bg: 'var(--primary-soft)',             icon: <Globe size={11} /> },
  Number:              { label: 'Nombre',     color: 'var(--primary)',   bg: 'var(--primary-soft)', icon: <Hash size={11} /> },
  DateTime:            { label: 'DateHeure',  color: 'var(--warn)',          bg: 'var(--warn-soft)',             icon: <Calendar size={11} /> },
  Date:                { label: 'Date',       color: 'var(--warn)',          bg: 'var(--warn-soft)',             icon: <Calendar size={11} /> },
  Checkbox:            { label: 'Booléen',    color: '#dc2626',          bg: '#fef2f2',             icon: <ToggleLeft size={11} /> },
  MultiSelect:         { label: 'Multi',      color: '#7c3aed',          bg: '#faf5ff',             icon: <Layers size={11} /> },
  SingleSelect:        { label: 'Liste',      color: '#6d28d9',          bg: 'var(--violet-soft)',             icon: <ChevronDown size={11} /> },
  Attachment:          { label: 'Fichier',    color: '#9333ea',          bg: '#fdf4ff',             icon: <Paperclip size={11} /> },
  ID:                  { label: 'ID',         color: 'var(--fg)',        bg: 'var(--surface-2)',     icon: <Key size={11} /> },
  LinkToAnotherRecord: { label: 'Relation',   color: 'var(--primary)',   bg: 'var(--primary-soft)', icon: <Link2 size={11} /> },
  Lookup:              { label: 'Lookup',     color: 'var(--primary)',   bg: 'var(--primary-soft)', icon: <Search size={11} /> },
};
const getCT = (uidt?: string) =>
  COL_TYPES[uidt ?? ''] ?? { label: uidt || '?', color: 'var(--ink-2)', bg: 'var(--surface-2)', icon: <Type size={11} /> };

// ── Status badges ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Valide':              { bg: '#f0fdf4', text: '#166534', border: '#86efac', dot: 'var(--success)' },
  'Qualifie':            { bg: 'var(--success-soft)', text: '#065f46', border: '#6ee7b7', dot: 'var(--success)' },
  'En cours traitement': { bg: 'var(--primary-soft)', text: '#1e40af', border: '#93c5fd', dot: 'var(--primary)' },
  'Entretien fait':      { bg: 'var(--violet-soft)', text: '#5b21b6', border: '#c4b5fd', dot: 'var(--violet)' },
  'Non valide':          { bg: '#fff1f2', text: '#9f1239', border: '#fda4af', dot: '#f43f5e' },
  'Non qualifie':        { bg: '#fdf2f8', text: '#86198f', border: '#f0abfc', dot: '#d946ef' },
};
const getCfg = (s?: string) =>
  STATUS_CFG[s ?? ''] ?? { bg: 'var(--surface-2)', text: 'var(--ink-2)', border: 'var(--line)', dot: 'var(--ink-3)' };

// ── Parsers ───────────────────────────────────────────────────────────────────

const pickArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  for (const k of ['list', 'data', 'columns', 'records', 'results', 'rows', 'tables'])
    if (Array.isArray(data?.[k])) return data[k];
  return [];
};
const parseColumns = (raw: any[]): DBColumn[] =>
  raw.map(c => ({
    id: c.id ?? String(Math.random()), title: c.title ?? c.name ?? '?',
    uidt: c.uidt ?? c.type, dt: c.dt,
    pk: c.pk ?? false, rqd: c.rqd ?? false, ai: c.ai ?? false,
    colOptions: c.colOptions,
  }));
const parsePageInfo = (data: any): PageInfo => {
  if (Array.isArray(data)) return { totalRows: data.length };
  const pi = data?.pageInfo ?? data?.page_info ?? {};
  return { totalRows: pi.totalRows ?? pi.total_rows ?? pi.total ?? pi.count ?? data?.total ?? data?.count };
};

// ── Cell renderer ─────────────────────────────────────────────────────────────

function Cell({ val, col }: { val: any; col: DBColumn }) {
  if (val === null || val === undefined)
    return <span style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: 11 }}>—</span>;
  if (col.uidt === 'Checkbox')
    return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: val ? 'var(--success-soft)' : 'var(--surface-2)', color: val ? '#16a34a' : 'var(--ink-3)', fontSize: 12, fontWeight: 800, border: `1px solid ${val ? '#86efac' : 'var(--line)'}` }}>{val ? '✓' : '✗'}</span>;
  if (col.uidt === 'MultiSelect') {
    const opts = Array.isArray(val) ? val : String(val).split(',');
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>{opts.slice(0, 3).map((o: any, i) => <span key={i} style={{ fontSize: 10, padding: '2px 7px', background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: 999, fontWeight: 600 }}>{String(o).trim()}</span>)}{opts.length > 3 && <span style={{ fontSize: 10, color: 'var(--ink-2)' }}>+{opts.length - 3}</span>}</div>;
  }
  if (col.uidt === 'SingleSelect') {
    const cfg = getCfg(String(val));
    return <span style={{ fontSize: 11, padding: '2px 10px', background: cfg.bg, color: cfg.text, borderRadius: 999, fontWeight: 600, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>{String(val)}</span>;
  }
  if (col.uidt === 'URL' && typeof val === 'string' && val.startsWith('http'))
    return <a href={val} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>🔗 Lien</a>;
  if (col.uidt === 'DateTime' || col.uidt === 'Date') {
    try { return <span style={{ fontSize: 12, color: 'var(--warn)', background: 'var(--warn-soft)', padding: '2px 8px', borderRadius: 6, fontWeight: 600, border: '1px solid #fde68a' }}>{new Date(val).toLocaleDateString('fr-MA')}</span>; }
    catch { return <span style={{ fontSize: 12 }}>{String(val)}</span>; }
  }
  if (col.pk)
    return <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 5, border: '1px solid var(--line)' }}>{String(val)}</span>;
  const s = String(val);
  return <span style={{ fontSize: 13, color: 'var(--fg)' }}>{s.length > 50 ? s.slice(0, 50) + '…' : s}</span>;
}

// ── Time filter config ────────────────────────────────────────────────────────

type TimeFilter = '24h' | '7d' | '1m' | 'all';

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: '24h', label: 'Dernières 24h' },
  { key: '7d',  label: '7 derniers jours' },
  { key: '1m',  label: 'Dernier mois' },
  { key: 'all', label: 'Tout' },
];

const getCutoff = (tf: TimeFilter): Date | null => {
  const now = Date.now();
  if (tf === '24h') return new Date(now - 24 * 3600 * 1000);
  if (tf === '7d')  return new Date(now - 7  * 24 * 3600 * 1000);
  if (tf === '1m')  return new Date(now - 30 * 24 * 3600 * 1000);
  return null;
};

// ── Tab accent colors ─────────────────────────────────────────────────────────

const TAB_COLORS = ['var(--success)', 'var(--danger)', 'var(--primary)', 'var(--warn)', 'var(--violet)'];

// ── Page ─────────────────────────────────────────────────────────────────────

const LIMIT = 50;
const HIDDEN_COLS = ['nc_order', 'CreatedAt', 'UpdatedAt', 'CreatedAt1', 'CV_CV'];

export default function SpontaneousApplications() {
  const [allTables,   setAllTables]   = useState<DBTable[]>([]);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [columns,     setColumns]     = useState<DBColumn[]>([]);
  const [records,     setRecords]     = useState<any[]>([]);
  const [pageInfo,    setPageInfo]    = useState<PageInfo>({});
  const [offset,      setOffset]      = useState(0);
  const [search,      setSearch]      = useState('');
  const [loadTables,  setLoadTables]  = useState(false);
  const [loadData,    setLoadData]    = useState(false);
  const [err,         setErr]         = useState<string | null>(null);
  const [rowDetail,   setRowDetail]   = useState<any | null>(null);
  const [timeFilter,  setTimeFilter]  = useState<TimeFilter>('all');
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});

  // Only show the two application tables
  const tables = allTables.filter(t => !isExcluded(t));
  const active  = tables[activeIdx] ?? null;

  // ── Fetch tables list ─────────────────────────────────────────────────────

  const fetchTables = async () => {
    setLoadTables(true); setErr(null);
    try {
      const data = await dbGet(`/bases/${BASE_ID}/tables`);
      setAllTables(pickArray(data));
    } catch (e: any) {
      setErr(getApiError(e, 'Erreur de connexion'));
    } finally { setLoadTables(false); }
  };

  // ── Fetch records (with optional time filter) ─────────────────────────────

  const fetchRecords = useCallback(async (tbl: DBTable, off: number, tf: TimeFilter) => {
    setLoadData(true); setErr(null);
    try {
      const cutoff = getCutoff(tf);

      if (tf !== 'all' && cutoff) {
        // Time-filtered mode: fetch a large batch with standard params only
        // (NocoDB rejects unknown params like sort/where on some endpoints),
        // then filter client-side by CreatedAt.
        const params: Record<string, any> = { limit: 200, offset: 0 };
        const [colRes, recRes] = await Promise.all([
          dbGet(`/tables/${tbl.id}/columns`),
          dbGet(`/tables/${tbl.id}/records`, params),
        ]);
        const raw = pickArray(recRes);
        const filtered = raw.filter((r: any) => {
          const dateStr = r.CreatedAt ?? r.created_at ?? r['Created At'] ?? r.nc_created_at;
          if (!dateStr) return true;
          try { return new Date(dateStr) >= cutoff; } catch { return true; }
        });
        setColumns(parseColumns(pickArray(colRes)));
        setRecords(filtered);
        setPageInfo({ totalRows: filtered.length });
      } else {
        // Normal paginated fetch (no time filter)
        const params: Record<string, any> = { limit: LIMIT, offset: off };
        const [colRes, recRes] = await Promise.all([
          dbGet(`/tables/${tbl.id}/columns`),
          dbGet(`/tables/${tbl.id}/records`, params),
        ]);
        setColumns(parseColumns(pickArray(colRes)));
        setRecords(pickArray(recRes));
        setPageInfo(parsePageInfo(recRes));
      }
    } catch (e: any) {
      setErr(getApiError(e, 'Erreur de chargement'));
    } finally { setLoadData(false); }
  }, []);

  // Pre-fetch totals for all tabs (without time filter, for counts)
  const fetchCounts = useCallback(async (tbls: DBTable[]) => {
    const results: Record<string, number> = {};
    await Promise.allSettled(
      tbls.map(async t => {
        try {
          const r = await dbGet(`/tables/${t.id}/records`, { limit: 1, offset: 0 });
          results[t.id] = parsePageInfo(r).totalRows ?? 0;
        } catch { results[t.id] = 0; }
      })
    );
    setTableCounts(results);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { fetchTables(); }, []);

  // When tables load, fetch counts for the tab badges
  useEffect(() => {
    const displayTables = allTables.filter(t => !isExcluded(t));
    if (displayTables.length > 0) fetchCounts(displayTables);
  }, [allTables, fetchCounts]);

  // Re-fetch when active table or time filter changes
  useEffect(() => {
    if (active) { setOffset(0); setSearch(''); fetchRecords(active, 0, timeFilter); }
  }, [active?.id, timeFilter, fetchRecords]);

  // ── Derived values ────────────────────────────────────────────────────────

  const visCols       = columns.filter(c => c.title && c.title !== '?' && !HIDDEN_COLS.includes(c.title));
  const filteredRec   = search
    ? records.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : records;
  const total    = pageInfo.totalRows ?? filteredRec.length;
  const curPage  = Math.floor(offset / LIMIT) + 1;
  const totPages = Math.max(1, Math.ceil(total / LIMIT));

  const goPage = (o: number) => {
    setOffset(o);
    if (active) fetchRecords(active, o, timeFilter);
  };

  const accentColor = TAB_COLORS[activeIdx % TAB_COLORS.length];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Page header ── */}
      <div style={{ padding: '16px 24px 0', background: 'var(--surface)', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {/* Title */}
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>Candidatures Spontanées</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-2)' }}>
              {loadTables ? 'Chargement…' : `${tables.length} table${tables.length !== 1 ? 's' : ''} · Smart App`}
            </p>
          </div>

          {/* Time filter chips */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {TIME_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setTimeFilter(f.key)}
                style={{
                  padding: '5px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: timeFilter === f.key ? accentColor : 'var(--line)',
                  background: timeFilter === f.key ? accentColor + '18' : 'var(--surface)',
                  color: timeFilter === f.key ? accentColor : 'var(--ink-2)',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => { fetchTables(); if (active) fetchRecords(active, offset, timeFilter); }}
            style={{ background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink-2)', padding: '6px 9px', borderRadius: 8, display: 'flex', transition: 'all 0.15s' }}
            title="Actualiser"
          >
            <RefreshCw size={14} style={{ animation: (loadTables || loadData) ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        {/* Table tabs */}
        {loadTables ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, color: 'var(--ink-2)', fontSize: 12 }}>
            <Spinner size={14} /> Chargement des tables…
          </div>
        ) : tables.length === 0 ? (
          <div style={{ paddingBottom: 14, fontSize: 13, color: 'var(--ink-2)' }}>Aucune table disponible</div>
        ) : (
          <div style={{ display: 'flex', gap: 0 }}>
            {tables.map((t, i) => {
              const color   = TAB_COLORS[i % TAB_COLORS.length];
              const isActive = i === activeIdx;
              const count   = tableCounts[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => { setActiveIdx(i); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', fontSize: 13, fontWeight: isActive ? 700 : 500,
                    border: 'none', borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                    background: 'none', cursor: 'pointer', color: isActive ? color : 'var(--ink-2)',
                    transition: 'all 0.15s', marginBottom: -1,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? color : 'var(--line)', flexShrink: 0 }} />
                  {t.title}
                  {count !== undefined && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                      background: isActive ? color + '18' : 'var(--surface-2)',
                      color: isActive ? color : 'var(--ink-2)',
                      border: `1px solid ${isActive ? color + '44' : 'var(--line)'}`,
                    }}>
                      {count.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Error banner ── */}
      {err && (
        <div style={{ padding: '9px 20px', background: '#fef2f2', color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderBottom: '1px solid #fecaca' }}>
          <AlertTriangle size={14} /> {err}
          <button onClick={() => setErr(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><X size={13} /></button>
        </div>
      )}

      {/* ── Content ── */}
      {!active ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>Aucune table à afficher.</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Search + stats bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--surface)' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
              <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)', pointerEvents: 'none' }} />
              <input
                className="input"
                style={{ paddingLeft: 28, fontSize: 12, padding: '6px 10px 6px 28px' }}
                placeholder="Rechercher dans les résultats…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex' }}>
                <X size={13} />
              </button>
            )}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
              {loadData ? '…' : `${total.toLocaleString()} enregistrement${total !== 1 ? 's' : ''}`}
              {timeFilter !== 'all' && <span style={{ marginLeft: 6, color: accentColor, fontWeight: 600 }}>· {TIME_FILTERS.find(f => f.key === timeFilter)?.label}</span>}
            </span>
          </div>

          {/* Data table */}
          {loadData ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Spinner /><span style={{ color: 'var(--ink-2)', fontSize: 13 }}>Chargement…</span>
            </div>
          ) : filteredRec.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
              <Table2 size={36} style={{ opacity: 0.12, marginBottom: 12 }} />
              <p style={{ fontWeight: 600, margin: '0 0 6px' }}>Aucun enregistrement</p>
              <p style={{ fontSize: 13, margin: 0 }}>
                {timeFilter !== 'all'
                  ? `Aucune candidature reçue pendant la période sélectionnée.`
                  : `Cette table ne contient aucun enregistrement.`}
              </p>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                    <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                      <th style={{ width: 48, padding: '10px 14px', fontWeight: 600, color: 'var(--ink-3)', fontSize: 11, borderRight: '1px solid var(--line)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.06em' }}>#</th>
                      {visCols.map(col => {
                        const ct = getCT(col.uidt);
                        return (
                          <th key={col.id} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-3)', fontSize: 11, whiteSpace: 'nowrap', borderRight: '1px solid var(--line)', minWidth: 110, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ color: col.pk ? 'var(--warn)' : ct.color, display: 'flex' }}>{col.pk ? <Key size={11} /> : ct.icon}</span>
                              {col.title}
                            </div>
                          </th>
                        );
                      })}
                      <th style={{ width: 48, padding: '10px 8px', borderLeft: '1px solid var(--line)' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRec.map((row, ri) => (
                      <tr
                        key={ri}
                        style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-2)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                        onClick={() => setRowDetail(row)}
                      >
                        <td style={{ padding: '9px 14px', color: 'var(--ink-3)', fontSize: 11, borderRight: '1px solid var(--line)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                          {offset + ri + 1}
                        </td>
                        {visCols.map(col => (
                          <td key={col.id} style={{ padding: '9px 14px', borderRight: '1px solid var(--line)', maxWidth: 260, overflow: 'hidden' }}>
                            <Cell val={row[col.title]} col={col} />
                          </td>
                        ))}
                        <td style={{ padding: '7px 10px', borderLeft: '1px solid var(--line)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setRowDetail(row)}
                            style={{ background: 'none', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink-2)', padding: '4px 7px', borderRadius: 6, display: 'flex', transition: 'all 0.1s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                          >
                            <Eye size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination — only in unfiltered mode (time filter loads all at once) */}
              {timeFilter === 'all' && total > LIMIT && (
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--surface)' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                    <b style={{ color: 'var(--fg)' }}>{offset + 1}–{Math.min(offset + LIMIT, total)}</b> sur <b style={{ color: 'var(--fg)' }}>{total.toLocaleString()}</b>
                  </span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[{ l: '«', o: 0, d: offset === 0 }, { l: '‹', o: Math.max(0, offset - LIMIT), d: offset === 0 }].map(b => (
                      <button key={b.l} onClick={() => !b.d && goPage(b.o)} disabled={b.d}
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '5px 11px', cursor: b.d ? 'not-allowed' : 'pointer', color: b.d ? 'var(--ink-3)' : 'var(--fg)', fontSize: 13, fontWeight: 700, opacity: b.d ? 0.4 : 1 }}>{b.l}</button>
                    ))}
                    <span style={{ fontSize: 12, color: accentColor, padding: '5px 14px', background: accentColor + '18', border: `1px solid ${accentColor}44`, borderRadius: 6, fontWeight: 700 }}>
                      {curPage} / {totPages}
                    </span>
                    {[{ l: '›', o: offset + LIMIT, d: offset + LIMIT >= total }, { l: '»', o: (totPages - 1) * LIMIT, d: offset + LIMIT >= total }].map(b => (
                      <button key={b.l} onClick={() => !b.d && goPage(b.o)} disabled={b.d}
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '5px 11px', cursor: b.d ? 'not-allowed' : 'pointer', color: b.d ? 'var(--ink-3)' : 'var(--fg)', fontSize: 13, fontWeight: 700, opacity: b.d ? 0.4 : 1 }}>{b.l}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Row detail modal ── */}
      {rowDetail && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setRowDetail(null)}
        >
          <div
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--line)', width: '100%', maxWidth: 540, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: accentColor, display: 'inline-block' }} />
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{active?.title} — Détail</p>
              </div>
              <button onClick={() => setRowDetail(null)} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink-2)', padding: 7, borderRadius: 8, display: 'flex' }}><X size={14} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: '14px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                {visCols.map(col => {
                  const ct = getCT(col.uidt);
                  return (
                    <div key={col.id} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--line)', borderLeft: `3px solid ${col.pk ? 'var(--warn)' : ct.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                        <span style={{ color: col.pk ? 'var(--warn)' : ct.color, display: 'flex' }}>{col.pk ? <Key size={10} /> : ct.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col.title}</span>
                      </div>
                      <div style={{ paddingLeft: 2 }}>
                        {rowDetail[col.title] !== null && rowDetail[col.title] !== undefined
                          ? <Cell val={rowDetail[col.title]} col={col} />
                          : <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>vide</span>}
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
