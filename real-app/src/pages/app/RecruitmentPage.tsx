import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Database, ChevronRight, RefreshCw, Search, LayoutGrid, Code2,
  X, Eye, ArrowRight, Table2, AlertTriangle, Link2, Hash, ChevronLeft,
  Type, Calendar, Mail, Globe, ToggleLeft, Paperclip, Key,
  Layers, ChevronDown, UserPlus,
} from 'lucide-react';
import { Spinner, Button } from '../../components/ui';
import { createIntern } from '../../lib/api';
import { toast } from 'sonner';

// ── Proxy API ─────────────────────────────────────────────────────────────────

const BASE_ID = 'prd6w1jt4faaysm';

const dbGet = async (path: string, params?: Record<string, any>) => {
  const token = localStorage.getItem('wedy_token');
  const res = await axios.get(`/api/smartdb${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    params,
  });
  return res.data;
};

const CV_TABLE_ID          = 'mjim075k89bk73f';
const RECRUTEMENT_TABLE_ID = 'm9ia8qdns5nrj5z';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DBTable { id: string; title: string; type?: string; }
interface DBColumn {
  id: string; title: string; uidt?: string; dt?: string;
  pk?: boolean; rqd?: boolean; ai?: boolean; unique?: boolean;
  colOptions?: { type?: string; fk_related_model_id?: string };
}
interface PageInfo { totalRows?: number }

// ── Column type config ────────────────────────────────────────────────────────

const COL_TYPES: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  SingleLineText:      { label: 'Texte',     color: 'var(--fg-muted)',  bg: 'var(--bg-muted)', icon: <Type size={11} /> },
  LongText:            { label: 'Long texte',color: 'var(--fg-muted)',  bg: 'var(--bg-muted)', icon: <Type size={11} /> },
  Email:               { label: 'Email',     color: '#7c3aed',          bg: '#f5f3ff',          icon: <Mail size={11} /> },
  URL:                 { label: 'URL',       color: '#2563eb',          bg: '#eff6ff',          icon: <Globe size={11} /> },
  Number:              { label: 'Nombre',    color: 'var(--primary)',   bg: 'var(--primary-soft)', icon: <Hash size={11} /> },
  DateTime:            { label: 'DateHeure', color: '#d97706',          bg: '#fffbeb',          icon: <Calendar size={11} /> },
  Date:                { label: 'Date',      color: '#d97706',          bg: '#fffbeb',          icon: <Calendar size={11} /> },
  Checkbox:            { label: 'Booléen',   color: '#dc2626',          bg: '#fef2f2',          icon: <ToggleLeft size={11} /> },
  MultiSelect:         { label: 'Multi',     color: '#7c3aed',          bg: '#faf5ff',          icon: <Layers size={11} /> },
  SingleSelect:        { label: 'Liste',     color: '#6d28d9',          bg: '#f5f3ff',          icon: <ChevronDown size={11} /> },
  Attachment:          { label: 'Fichier',   color: '#9333ea',          bg: '#fdf4ff',          icon: <Paperclip size={11} /> },
  ID:                  { label: 'ID',        color: 'var(--fg)',        bg: 'var(--bg-muted)', icon: <Key size={11} /> },
  LinkToAnotherRecord: { label: 'Relation',  color: 'var(--primary)',   bg: 'var(--primary-soft)', icon: <Link2 size={11} /> },
  Lookup:              { label: 'Lookup',    color: 'var(--primary)',   bg: 'var(--primary-soft)', icon: <Search size={11} /> },
};
const getCT = (uidt?: string) => COL_TYPES[uidt ?? ''] ?? { label: uidt || '?', color: 'var(--fg-muted)', bg: 'var(--bg-muted)', icon: <Type size={11} /> };

const PALETTE = ['#0891b2','#7c3aed','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16','#8b5cf6','#f97316','#14b8a6','#a855f7','#22c55e','#eab308','#3b82f6'];
const tColor = (i: number) => PALETTE[i % PALETTE.length];

// ── Parsers ───────────────────────────────────────────────────────────────────

const pickArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  for (const k of ['list','data','columns','fields','records','results','rows','items','tables'])
    if (Array.isArray(data?.[k])) return data[k];
  if (data && typeof data === 'object') { const f = Object.values(data).find(v => Array.isArray(v)); if (f) return f as any[]; }
  return [];
};
const parseColumns = (raw: any[]): DBColumn[] => raw.map(c => ({
  id: c.id ?? String(Math.random()), title: c.title ?? c.name ?? c.column_name ?? '?',
  uidt: c.uidt ?? c.type, dt: c.dt ?? c.db_type,
  pk: c.pk ?? false, rqd: c.rqd ?? false, ai: c.ai ?? false, unique: c.unique ?? false,
  colOptions: c.colOptions ?? c.col_options,
}));
const parsePageInfo = (data: any): PageInfo => {
  if (Array.isArray(data)) return { totalRows: data.length };
  const pi = data?.pageInfo ?? data?.page_info ?? {};
  return { totalRows: pi.totalRows ?? pi.total_rows ?? pi.total ?? pi.count ?? data?.total ?? data?.count };
};

// ── Status config (Recrutement) ───────────────────────────────────────────────

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Valide':              { bg: '#f0fdf4', text: '#166534', border: '#86efac', dot: '#22c55e' },
  'Qualifie':            { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7', dot: '#10b981' },
  'En cours traitement': { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', dot: '#3b82f6' },
  'Entretien fait':      { bg: '#f5f3ff', text: '#5b21b6', border: '#c4b5fd', dot: '#8b5cf6' },
  'Non valide':          { bg: '#fff1f2', text: '#9f1239', border: '#fda4af', dot: '#f43f5e' },
  'Non qualifie':        { bg: '#fdf2f8', text: '#86198f', border: '#f0abfc', dot: '#d946ef' },
};
const getCfg = (s?: string) => STATUS_CFG[s ?? ''] ?? { bg: 'var(--bg-muted)', text: 'var(--fg-muted)', border: 'var(--border)', dot: 'var(--fg-subtle)' };

// ── Cell ──────────────────────────────────────────────────────────────────────

function Cell({ val, col }: { val: any; col: DBColumn }) {
  if (val === null || val === undefined) return <span style={{ color: 'var(--fg-subtle)', fontStyle: 'italic', fontSize: 11 }}>—</span>;
  if (col.uidt === 'Checkbox') return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: val ? '#dcfce7' : 'var(--bg-muted)', color: val ? '#16a34a' : 'var(--fg-subtle)', fontSize: 12, fontWeight: 800, border: `1px solid ${val ? '#86efac' : 'var(--border)'}` }}>{val ? '✓' : '✗'}</span>;
  if (col.uidt === 'MultiSelect') {
    const opts = Array.isArray(val) ? val : String(val).split(',');
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>{opts.slice(0, 3).map((o: any, i) => <span key={i} style={{ fontSize: 10, padding: '2px 7px', background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: 999, fontWeight: 600, border: '1px solid var(--primary-border)' }}>{String(o).trim()}</span>)}{opts.length > 3 && <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>+{opts.length - 3}</span>}</div>;
  }
  if (col.uidt === 'SingleSelect') {
    const cfg = getCfg(String(val));
    return <span style={{ fontSize: 11, padding: '2px 10px', background: cfg.bg, color: cfg.text, borderRadius: 999, fontWeight: 600, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>{String(val)}</span>;
  }
  if (col.uidt === 'URL' && typeof val === 'string' && val.startsWith('http'))
    return <a href={val} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>🔗 Voir le lien</a>;
  if (col.uidt === 'DateTime' || col.uidt === 'Date') {
    try { return <span style={{ fontSize: 12, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 6, fontWeight: 600, border: '1px solid #fde68a' }}>{new Date(val).toLocaleDateString('fr-MA')}</span>; }
    catch { return <span style={{ fontSize: 12 }}>{String(val)}</span>; }
  }
  if (col.pk) return <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', background: 'var(--bg-muted)', padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)' }}>{String(val)}</span>;
  const s = String(val);
  return <span style={{ fontSize: 13, color: 'var(--fg)' }}>{s.length > 45 ? s.slice(0, 45) + '…' : s}</span>;
}

// ── Intern Import Modal ───────────────────────────────────────────────────────

function InternImportModal({ cvRow, onClose }: { cvRow: any; onClose: () => void }) {
  const [form, setForm] = useState({
    full_name:  cvRow['NOM_ET_PRENOM'] || '',
    email:      cvRow['Mail'] || '',
    phone:      cvRow['Numero_de_telephone'] || '',
    address:    cvRow['Adresse'] || '',
    position:   cvRow['PROFIL'] || cvRow['Ecole'] || 'Stagiaire',
    notes:      [cvRow['Outils'] && `Outils: ${cvRow['Outils']}`, cvRow['Langue'] && `Langues: ${cvRow['Langue']}`, cvRow['Annee_d_experience'] && `Exp: ${cvRow['Annee_d_experience']} an(s)`].filter(Boolean).join(' · '),
    status: 'intern', 
    contract_type: 'Stage',
    skills: (cvRow['Outils'] || cvRow['Competences'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    languages: (cvRow['Langue'] || cvRow['Langues'] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    experience_summary: cvRow['Experience'] || cvRow['Experiences'] || (cvRow['Annee_d_experience'] ? `${cvRow['Annee_d_experience']} an(s) d'expérience` : ''),
    education_summary: cvRow['Ecole'] || cvRow['Formation'] || '',
    bio: cvRow['PROFIL'] || '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name) { toast.error('Le nom est requis'); return; }
    setLoading(true);
    try {
      await createIntern(form);
      toast.success(`✓ ${form.full_name} ajouté comme stagiaire`);
      onClose();
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', width: '100%', maxWidth: 520, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserPlus size={18} style={{ color: '#065f46' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Importer comme stagiaire</p>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>Vérifiez et complétez les informations avant de créer</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 6, borderRadius: 'var(--radius-md)' }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px', marginBottom: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom complet *</label>
              <input className="input" style={{ fontSize: 13, width: '100%', boxSizing: 'border-box' }} value={form.full_name} onChange={set('full_name')} placeholder="Prénom Nom" required />
            </div>
            {[{ k: 'email', l: 'Email', ph: 'email@exemple.com' }, { k: 'phone', l: 'Téléphone', ph: '+212 6 00 00 00' }, { k: 'address', l: 'Adresse', ph: 'Casablanca' }, { k: 'position', l: 'Poste / École', ph: 'Stagiaire Dev' }].map(f => (
              <div key={f.k}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.l}</label>
                <input className="input" style={{ fontSize: 13, width: '100%', boxSizing: 'border-box' }} value={(form as any)[f.k]} onChange={set(f.k)} placeholder={f.ph} />
              </div>
            ))}
          </div>
          {form.notes && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--primary)' }}>
              <strong>Données extraites du CV :</strong> {form.notes}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={loading}><UserPlus size={13} /> Créer le stagiaire</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modern Calendar View ──────────────────────────────────────────────────────

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function CalendarView({ tableId }: { tableId: string }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year,  setYear]  = useState(today.getFullYear());
  const [recs,  setRecs]  = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ events: any[]; date: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    dbGet(`/tables/${tableId}/records`, { limit: 200, offset: 0 })
      .then(d => setRecs(pickArray(d)))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false));
  }, [tableId]);

  // Build events map keyed by "YYYY-MM-DD"
  const eventsMap: Record<string, any[]> = {};
  recs.forEach(r => {
    const raw = r['Date_d_entretien'];
    if (!raw) return;
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      eventsMap[key] = [...(eventsMap[key] ?? []), r];
    } catch { /**/ }
  });

  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1);
  const goToday   = () => { setMonth(today.getMonth()); setYear(today.getFullYear()); };

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);

  const thisMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const thisMonthTotal = Object.entries(eventsMap).filter(([k]) => k.startsWith(thisMonthKey)).reduce((s, [, v]) => s + v.length, 0);

  // Status summary
  const statusSummary = recs.reduce((acc: Record<string, number>, r) => {
    const s = r['Status'];
    if (s) acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}><Spinner /><span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>Chargement des entretiens…</span></div>;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

      {/* ── Stats strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', borderTop: `3px solid var(--primary)` }}>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ce mois</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{thisMonthTotal}</p>
        </div>
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', borderTop: '3px solid var(--fg-muted)' }}>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--fg)', margin: 0 }}>{recs.length}</p>
        </div>
        {Object.entries(statusSummary).slice(0, 4).map(([s, n]) => {
          const cfg = getCfg(s);
          return (
            <div key={s} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', borderTop: `3px solid ${cfg.dot}` }}>
              <p style={{ fontSize: 11, color: cfg.text, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.8 }}>{s}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: cfg.text, margin: 0 }}>{n}</p>
            </div>
          );
        })}
      </div>

      {/* ── Calendar card ── */}
      <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>

        {/* Calendar header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={prevMonth}
              style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elev)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elev)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)'; }}>
              <ChevronLeft size={15} />
            </button>
            <button onClick={nextMonth}
              style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elev)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elev)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)'; }}>
              <ChevronDown size={15} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>

          <h2 style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--fg)' }}>
            {MONTHS[month]} <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>{year}</span>
          </h2>

          <button onClick={goToday}
            style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elev)', cursor: 'pointer', color: 'var(--fg-muted)', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-soft)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary-border)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elev)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
            Aujourd'hui
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: i >= 5 ? 'var(--primary)' : 'var(--fg-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${weeks}, 1fr)` }}>
          {Array.from({ length: firstWeekday + daysInMonth }, (_, cellIndex) => {
            const day = cellIndex - firstWeekday + 1;
            const isEmpty = cellIndex < firstWeekday;
            if (isEmpty) return <div key={`e-${cellIndex}`} style={{ minHeight: 100, background: 'var(--bg-muted)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', opacity: 0.4 }} />;

            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = eventsMap[dateKey] ?? [];
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isWeekend = (firstWeekday + day - 1) % 7 >= 5;
            const hasEvents = dayEvents.length > 0;

            return (
              <div key={day}
                onClick={() => hasEvents && setSelected({ events: dayEvents, date: `${day} ${MONTHS[month]} ${year}` })}
                style={{
                  minHeight: 100, padding: '8px', boxSizing: 'border-box',
                  borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                  background: isWeekend && !hasEvents ? 'var(--bg-muted)' : 'var(--bg-elev)',
                  cursor: hasEvents ? 'pointer' : 'default',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (hasEvents) (e.currentTarget as HTMLDivElement).style.background = 'var(--primary-soft)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isWeekend && !hasEvents ? 'var(--bg-muted)' : 'var(--bg-elev)'; }}
              >
                {/* Day number */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: isToday ? 700 : 400,
                    background: isToday ? 'var(--primary)' : 'transparent',
                    color: isToday ? '#fff' : isWeekend ? 'var(--primary)' : 'var(--fg)',
                  }}>{day}</span>
                  {hasEvents && (
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Events */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {dayEvents.slice(0, 3).map((ev, ei) => {
                    const cfg = getCfg(ev['Status']);
                    const name = ev['Nom_prenom'] ?? '?';
                    return (
                      <div key={ei} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '3px 6px', borderRadius: 6,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        overflow: 'hidden',
                      }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: cfg.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                          {getInitials(name)}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {name.length > 14 ? name.slice(0, 14) + '…' : name}
                        </span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: 10, color: 'var(--fg-muted)', paddingLeft: 6, fontWeight: 600 }}>+{dayEvents.length - 3} autres</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setSelected(null)}>
          <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', width: '100%', maxWidth: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={17} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{selected.date}</p>
                  <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>{selected.events.length} entretien{selected.events.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)', padding: 7, borderRadius: 'var(--radius-md)', display: 'flex' }}><X size={14} /></button>
            </div>

            <div style={{ overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selected.events.map((ev, i) => {
                const cfg = getCfg(ev['Status']);
                const name = ev['Nom_prenom'] ?? 'N/A';
                const time = ev['Date_d_entretien'] ? new Date(ev['Date_d_entretien']).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : null;
                return (
                  <div key={i} style={{ borderRadius: 'var(--radius-lg)', border: `1px solid ${cfg.border}`, overflow: 'hidden' }}>
                    {/* Color bar */}
                    <div style={{ height: 3, background: cfg.dot }} />
                    <div style={{ padding: '12px 14px', background: cfg.bg }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        {/* Avatar */}
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: cfg.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                          {getInitials(name)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: cfg.text, margin: 0 }}>{name}</p>
                          {ev['Profil'] && <p style={{ fontSize: 12, color: cfg.text, margin: 0, opacity: 0.75 }}>{ev['Profil']}</p>}
                        </div>
                        <span style={{ fontSize: 10, padding: '3px 9px', background: cfg.dot + '22', border: `1px solid ${cfg.dot}55`, borderRadius: 999, color: cfg.text, fontWeight: 700 }}>{ev['Status']}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 48 }}>
                        {time && <span style={{ fontSize: 12, color: cfg.text, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} /> {time}</span>}
                        {ev['Numero'] && <span style={{ fontSize: 12, color: cfg.text, opacity: 0.8 }}>📞 {ev['Numero']}</span>}
                        {ev['mail'] && <span style={{ fontSize: 12, color: cfg.text, opacity: 0.8 }}>✉ {ev['mail']}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────

function TypeBadge({ uidt, pk }: { uidt?: string; pk?: boolean }) {
  const m = getCT(uidt);
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-sm)', background: pk ? '#fef3c7' : m.bg, color: pk ? '#b45309' : m.color, border: `1px solid ${pk ? '#fde68a' : 'transparent'}` }}>
      {pk ? '🔑 PK' : m.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RecruitmentPage() {
  const [tables, setTables]         = useState<DBTable[]>([]);
  const [active, setActive]         = useState<DBTable | null>(null);
  const [columns, setColumns]       = useState<DBColumn[]>([]);
  const [records, setRecords]       = useState<any[]>([]);
  const [pageInfo, setPageInfo]     = useState<PageInfo>({});
  const [tab, setTab]               = useState<'data' | 'schema' | 'calendar'>('data');
  const [offset, setOffset]         = useState(0);
  const [search, setSearch]         = useState('');
  const [loadTables, setLoadTables] = useState(false);
  const [loadData, setLoadData]     = useState(false);
  const [err, setErr]               = useState<string | null>(null);
  const [rowDetail, setRowDetail]   = useState<any | null>(null);
  const [cvRow, setCvRow]           = useState<any | null>(null);
  const [sideSearch, setSideSearch] = useState('');

  const LIMIT = 50;
  const activeIdx    = tables.findIndex(t => t.id === active?.id);
  const isCV          = active?.id === CV_TABLE_ID;
  const isRecrutement = active?.id === RECRUTEMENT_TABLE_ID;

  const fetchTables = async () => {
    setLoadTables(true); setErr(null);
    try {
      const data = await dbGet(`/bases/${BASE_ID}/tables`);
      const list: DBTable[] = Array.isArray(data) ? data : (data.list ?? data.tables ?? []);
      setTables(list);
      if (list.length && !active) setActive(list[0]);
    } catch (e: any) { const msg = e?.response?.data?.msg || e?.message || 'Erreur'; setErr(msg); }
    finally { setLoadTables(false); }
  };

  const fetchTableData = useCallback(async (tbl: DBTable, off = 0) => {
    setLoadData(true); setErr(null);
    try {
      const [colRes, recRes] = await Promise.all([
        dbGet(`/tables/${tbl.id}/columns`),
        dbGet(`/tables/${tbl.id}/records`, { limit: LIMIT, offset: off }),
      ]);
      setColumns(parseColumns(pickArray(colRes)));
      setRecords(pickArray(recRes));
      setPageInfo(parsePageInfo(recRes));
    } catch (e: any) { setErr(e?.response?.data?.msg || e?.message || 'Erreur'); }
    finally { setLoadData(false); }
  }, []);

  useEffect(() => { fetchTables(); }, []);
  useEffect(() => {
    if (active) {
      setOffset(0); setSearch('');
      setTab(active.id === RECRUTEMENT_TABLE_ID ? 'calendar' : 'data');
      fetchTableData(active, 0);
    }
  }, [active, fetchTableData]);

  const goPage = (o: number) => { setOffset(o); if (active) fetchTableData(active, o); };
  const visCols = columns.filter(c => c.title && c.title !== '?' && !['nc_order','CreatedAt','UpdatedAt','CreatedAt1','CV_CV'].includes(c.title));
  const filteredRec = search ? records.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))) : records;
  const total    = pageInfo.totalRows ?? filteredRec.length;
  const curPage  = Math.floor(offset / LIMIT) + 1;
  const totPages = Math.max(1, Math.ceil(total / LIMIT));
  const filteredTables = sideSearch ? tables.filter(t => t.title.toLowerCase().includes(sideSearch.toLowerCase())) : tables;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-elev)' }}>

        {/* Header */}
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={15} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 12, margin: 0, color: 'var(--fg)' }}>Recrutement DB</p>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{loadTables ? '…' : `${tables.length} tables`}</p>
            </div>
            <button onClick={fetchTables} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex' }}>
              <RefreshCw size={12} style={{ animation: loadTables ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
            <input value={sideSearch} onChange={e => setSideSearch(e.target.value)} placeholder="Filtrer…"
              className="input" style={{ paddingLeft: 26, fontSize: 12, padding: '5px 8px 5px 26px', width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Table list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
          {loadTables ? <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            : filteredTables.map(t => {
              const idx = tables.findIndex(x => x.id === t.id);
              const isActive = active?.id === t.id;
              const color = tColor(idx);
              return (
                <button key={t.id} onClick={() => setActive(t)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', marginBottom: 1, borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: 'none', outline: 'none',
                    background: isActive ? 'var(--primary-soft)' : 'transparent',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'var(--primary)' : color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--primary)' : 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </span>
                  {t.id === CV_TABLE_ID && <span style={{ fontSize: 9, background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>CV</span>}
                  {t.id === RECRUTEMENT_TABLE_ID && <span style={{ fontSize: 9, background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>RDV</span>}
                  {isActive && <ChevronRight size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                </button>
              );
            })}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {!active ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: 40, maxWidth: 340 }}>
              <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-xl)', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Database size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: 'var(--fg)' }}>Sélectionnez une table</p>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                Choisissez <strong>CV</strong> pour importer des stagiaires ou <strong>Recrutement</strong> pour le calendrier des entretiens.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-elev)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0 10px' }}>
                {/* Table name pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: tColor(activeIdx), boxShadow: `0 0 0 3px ${tColor(activeIdx)}22` }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{active.title}</span>
                  {isCV && <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>👤 Import CV</span>}
                  {isRecrutement && <span style={{ fontSize: 10, background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>📅 Entretiens</span>}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ val: total.toLocaleString(), label: 'lignes' }, { val: visCols.length, label: 'col.' }].map((s, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', background: 'var(--bg-muted)', color: 'var(--fg-muted)', borderRadius: 999, border: '1px solid var(--border)' }}>
                      {s.val} {s.label}
                    </span>
                  ))}
                </div>

                <div style={{ flex: 1 }} />

                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
                  <input className="input" style={{ paddingLeft: 28, fontSize: 12, padding: '6px 10px 6px 28px', width: 190 }} placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button onClick={() => active && fetchTableData(active, offset)} style={{ background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)', padding: '5px 8px', borderRadius: 'var(--radius-md)', display: 'flex' }}>
                  <RefreshCw size={13} />
                </button>
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--border)', marginTop: 0 }}>
                {([
                  { key: 'data',     icon: <LayoutGrid size={13} />, label: 'Données' },
                  { key: 'schema',   icon: <Code2 size={13} />,      label: 'Schéma' },
                  ...(isRecrutement ? [{ key: 'calendar', icon: <Calendar size={13} />, label: 'Calendrier' }] : []),
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setTab(t.key as any)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                      fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'none',
                      color: tab === t.key ? 'var(--primary)' : 'var(--fg-muted)',
                      borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                      transition: 'all 0.15s', marginBottom: -1,
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {err && <div style={{ padding: '9px 20px', background: '#fef2f2', color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderBottom: '1px solid #fecaca' }}><AlertTriangle size={14} /> {err}<button onClick={() => setErr(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}><X size={13} /></button></div>}

            {/* ── Calendar ── */}
            {tab === 'calendar' && isRecrutement && <CalendarView tableId={RECRUTEMENT_TABLE_ID} />}

            {/* ── Schema ── */}
            {tab === 'schema' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {visCols.map((col, i) => {
                    const ct = getCT(col.uidt);
                    return (
                      <div key={col.id} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <div style={{ height: 3, background: col.pk ? '#f59e0b' : ct.color }} />
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: ct.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ct.color }}>{ct.icon}</div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>{col.title}</span>
                            <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>#{i + 1}</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            <TypeBadge uidt={col.uidt} pk={col.pk} />
                            {col.dt && <span style={{ fontSize: 10, padding: '2px 7px', background: 'var(--bg-muted)', color: 'var(--fg-muted)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border)' }}>{col.dt}</span>}
                            {col.rqd && <span style={{ fontSize: 10, padding: '1px 6px', background: '#fef2f2', color: '#dc2626', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Requis</span>}
                            {col.ai && <span style={{ fontSize: 10, padding: '1px 6px', background: '#f0fdf4', color: '#16a34a', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Auto</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Data ── */}
            {tab === 'data' && (
              <>
                {loadData ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <Spinner /><span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>Chargement…</span>
                  </div>
                ) : (
                  <>
                    {isCV && (
                      <div style={{ padding: '8px 20px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <UserPlus size={13} style={{ color: '#16a34a' }} />
                        <span style={{ fontSize: 12, color: '#166534' }}>Cliquez sur <strong>"→ Stagiaire"</strong> sur une ligne pour importer le candidat dans Wedy RH</span>
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      {filteredRec.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, color: 'var(--fg-muted)' }}>
                          <Table2 size={36} style={{ opacity: 0.12, marginBottom: 12 }} />
                          <p style={{ fontWeight: 600, margin: 0 }}>Aucun enregistrement</p>
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                          <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                            <tr style={{ background: 'var(--bg-elev)', borderBottom: '2px solid var(--primary)' }}>
                              <th style={{ width: 48, padding: '10px 14px', fontWeight: 600, color: 'var(--fg-muted)', fontSize: 11, borderRight: '1px solid var(--border)', textAlign: 'center' }}>#</th>
                              {visCols.map(col => {
                                const ct = getCT(col.uidt);
                                return (
                                  <th key={col.id} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-muted)', fontSize: 11, whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', minWidth: 110 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <span style={{ color: col.pk ? '#f59e0b' : ct.color, display: 'flex' }}>{col.pk ? <Key size={11} /> : ct.icon}</span>
                                      {col.title}
                                    </div>
                                  </th>
                                );
                              })}
                              <th style={{ width: isCV ? 110 : 48, padding: '10px 8px', borderLeft: '1px solid var(--border)' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRec.map((row, ri) => (
                              <tr key={ri} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-muted)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                                onClick={() => setRowDetail(row)}
                              >
                                <td style={{ padding: '9px 14px', color: 'var(--fg-subtle)', fontSize: 11, borderRight: '1px solid var(--border)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{offset + ri + 1}</td>
                                {visCols.map(col => (
                                  <td key={col.id} style={{ padding: '9px 14px', borderRight: '1px solid var(--border)', maxWidth: 250, overflow: 'hidden' }}>
                                    <Cell val={row[col.title]} col={col} />
                                  </td>
                                ))}
                                <td style={{ padding: '7px 10px', borderLeft: '1px solid var(--border)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                    <button onClick={() => setRowDetail(row)} style={{ background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)', padding: '4px 7px', borderRadius: 'var(--radius-md)', display: 'flex', transition: 'all 0.1s' }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}>
                                      <Eye size={12} />
                                    </button>
                                    {isCV && (
                                      <button onClick={() => setCvRow(row)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#d1fae5', border: '1px solid #6ee7b7', cursor: 'pointer', color: '#065f46', padding: '4px 9px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 700, transition: 'all 0.1s', whiteSpace: 'nowrap' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#a7f3d0'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#d1fae5'; }}>
                                        <UserPlus size={11} /> Stagiaire
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {total > LIMIT && (
                      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--bg-elev)' }}>
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                          <b style={{ color: 'var(--fg)' }}>{offset + 1}–{Math.min(offset + LIMIT, total)}</b> sur <b style={{ color: 'var(--fg)' }}>{total.toLocaleString()}</b>
                        </span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {[{ l: '«', o: 0, d: offset === 0 }, { l: '‹', o: Math.max(0, offset - LIMIT), d: offset === 0 }].map(b => (
                            <button key={b.l} onClick={() => !b.d && goPage(b.o)} disabled={b.d}
                              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '5px 11px', cursor: b.d ? 'not-allowed' : 'pointer', color: b.d ? 'var(--fg-subtle)' : 'var(--fg)', fontSize: 13, fontWeight: 700, opacity: b.d ? 0.4 : 1 }}>{b.l}</button>
                          ))}
                          <span style={{ fontSize: 12, color: 'var(--primary)', padding: '5px 14px', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>{curPage} / {totPages}</span>
                          {[{ l: '›', o: offset + LIMIT, d: offset + LIMIT >= total }, { l: '»', o: (totPages - 1) * LIMIT, d: offset + LIMIT >= total }].map(b => (
                            <button key={b.l} onClick={() => !b.d && goPage(b.o)} disabled={b.d}
                              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '5px 11px', cursor: b.d ? 'not-allowed' : 'pointer', color: b.d ? 'var(--fg-subtle)' : 'var(--fg)', fontSize: 13, fontWeight: 700, opacity: b.d ? 0.4 : 1 }}>{b.l}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Row detail modal ── */}
      {rowDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setRowDetail(null)}>
          <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', width: '100%', maxWidth: 540, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tColor(activeIdx) }} />
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{active?.title} — Détail</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {isCV && <button onClick={() => { setCvRow(rowDetail); setRowDetail(null); }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#d1fae5', border: '1px solid #6ee7b7', cursor: 'pointer', color: '#065f46', padding: '5px 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 700 }}><UserPlus size={12} /> Importer</button>}
                <button onClick={() => setRowDetail(null)} style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--fg-muted)', padding: 7, borderRadius: 'var(--radius-md)', display: 'flex' }}><X size={14} /></button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '14px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                {visCols.map(col => {
                  const ct = getCT(col.uidt);
                  return (
                    <div key={col.id} style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: '10px 12px', border: '1px solid var(--border)', borderLeft: `3px solid ${col.pk ? '#f59e0b' : ct.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                        <span style={{ color: col.pk ? '#f59e0b' : ct.color, display: 'flex' }}>{col.pk ? <Key size={10} /> : ct.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col.title}</span>
                      </div>
                      <div style={{ paddingLeft: 2 }}>
                        {rowDetail[col.title] !== null && rowDetail[col.title] !== undefined
                          ? <Cell val={rowDetail[col.title]} col={col} />
                          : <span style={{ fontSize: 12, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>vide</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {cvRow && <InternImportModal cvRow={cvRow} onClose={() => setCvRow(null)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
