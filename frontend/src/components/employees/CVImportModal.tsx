import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, ChevronLeft, ChevronRight, X, Check, Trash2,
  User, Briefcase, GraduationCap, Wrench, Globe, Award,
  Camera, Crosshair, AlertTriangle, FileText, UserCheck, Plus,
} from 'lucide-react';
import { api, getApiError } from '@/services/api';
import { toast } from 'sonner';
import { Button, Spinner } from '@/components/ui';

// ── Types ────────────────────────────────────────────────────────────────────

interface Experience { title: string; company: string; dates: string; description: string; }
interface Education  { degree: string; institution: string; dates: string; }
interface Language   { name: string; level: string; }

interface Extraction {
  full_name: string; email: string; phone: string;
  address: string; nationality: string; linkedin: string; github: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  languages: Language[];
  certifications: string[];
  interests: string;
}

interface DrawnZone {
  id: string; fieldKey: string; fieldLabel: string; text: string;
  x: number; y: number; w: number; h: number; page: number; color: string;
}

export interface CVImportModalProps {
  onClose: () => void;
  onImport: (data: Extraction & { photo?: string }) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMPTY_EXT: Extraction = {
  full_name: '', email: '', phone: '', address: '', nationality: '',
  linkedin: '', github: '', summary: '',
  experience: [], education: [], skills: [], languages: [], certifications: [],
  interests: '',
};

const FIELD_OPTIONS = [
  { key: 'full_name',          label: 'Nom complet',    color: 'var(--primary)' },
  { key: 'email',              label: 'Email',          color: '#7c3aed' },
  { key: 'phone',              label: 'Téléphone',      color: 'var(--success)' },
  { key: 'address',            label: 'Adresse',        color: 'var(--warn)' },
  { key: 'nationality',        label: 'Nationalité',    color: 'var(--accent)' },
  { key: 'linkedin',           label: 'LinkedIn',       color: '#0077b5' },
  { key: 'summary',            label: 'Résumé',         color: 'var(--violet)' },
  { key: 'skills_add',         label: '+ Compétences',  color: '#84cc16' },
  { key: 'certifications_add', label: '+ Certification',color: 'var(--danger)' },
];

// ── Error Boundary ────────────────────────────────────────────────────────────

class CVErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { err: string | null }
> {
  constructor(p: any) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e: Error) { return { err: e.message }; }
  componentDidCatch(e: Error) { console.error('[CVImportModal]', e); }
  render() {
    if (this.state.err) return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '40px 48px', maxWidth: 440, textAlign: 'center', border: '1px solid var(--line)' }}>
          <AlertTriangle size={40} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Erreur dans l'importateur CV</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>{this.state.err}</p>
          <Button onClick={this.props.onClose}>Fermer</Button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ── FieldLabel with AUTO badge ────────────────────────────────────────────────

function FL({ label, auto }: { label: string; auto?: boolean }) {
  return (
    <label style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, fontWeight: 500 }}>
      {label}
      {auto && (
        <span style={{ fontSize: 9, background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
          AUTO
        </span>
      )}
    </label>
  );
}

// ── Inner modal ───────────────────────────────────────────────────────────────

function Inner({ onClose, onImport }: CVImportModalProps) {
  const [loading, setLoading]           = useState(false);
  const [pages, setPages]               = useState<string[]>([]);
  const [photo, setPhoto]               = useState<string | null>(null);
  const [tempId, setTempId]             = useState<string | null>(null);
  const [currentPage, setCurrentPage]   = useState(0);
  const [ext, setExt]                   = useState<Extraction>(EMPTY_EXT);
  const [autoFilled, setAutoFilled]     = useState<Set<string>>(new Set());
  const [tab, setTab]                   = useState(0);

  const [zoneMode, setZoneMode]         = useState(false);
  const [zones, setZones]               = useState<DrawnZone[]>([]);
  const [drawing, setDrawing]           = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [startPt, setStartPt]           = useState<{ x: number; y: number } | null>(null);
  const [pending, setPending]           = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [customLabel, setCustomLabel]   = useState('');
  const [ocrLoading, setOcrLoading]     = useState(false);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const photoRef     = useRef<HTMLInputElement>(null);

  const hasPages = pages.length > 0;
  const hasExt   = !!(ext.full_name || ext.email || ext.experience.length || ext.skills.length);
  const showRight = hasPages || hasExt || loading;

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/cv/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const d = res.data;
      const e = d.extraction || {};

      setPages(Array.isArray(d.pages) ? d.pages : []);
      setPhoto(d.photo || null);
      setTempId(d.temp_id || null);
      setCurrentPage(0);

      const newExt: Extraction = {
        full_name:      e.full_name      || '',
        email:          e.email          || '',
        phone:          e.phone          || '',
        address:        e.address        || '',
        nationality:    e.nationality    || '',
        linkedin:       e.linkedin       || '',
        github:         e.github         || '',
        summary:        e.summary        || '',
        experience:     Array.isArray(e.experience)     ? e.experience     : [],
        education:      Array.isArray(e.education)      ? e.education      : [],
        skills:         Array.isArray(e.skills)         ? e.skills         : [],
        languages:      Array.isArray(e.languages)      ? e.languages      : [],
        certifications: Array.isArray(e.certifications) ? e.certifications : [],
        interests:      e.interests || '',
      };
      setExt(newExt);

      const filled = new Set<string>();
      (['full_name','email','phone','address','nationality','linkedin','github','summary'] as const)
        .forEach(k => { if (e[k]) filled.add(k); });
      if (newExt.experience.length)     filled.add('experience');
      if (newExt.education.length)      filled.add('education');
      if (newExt.skills.length)         filled.add('skills');
      if (newExt.languages.length)      filled.add('languages');
      if (newExt.certifications.length) filled.add('certifications');
      setAutoFilled(filled);

      toast.success(`CV analysé — ${filled.size} champ(s) extraits`);
    } catch (e: any) {
      toast.error(getApiError(e, "Erreur lors de l'analyse"));
    } finally {
      setLoading(false);
    }
  };

  // ── Photo upload ─────────────────────────────────────────────────────────────

  const handlePhoto = (file: File) => {
    const r = new FileReader();
    r.onload = ev => {
      const result = ev.target?.result as string;
      if (result) setPhoto(result.includes(',') ? result.split(',')[1] : result);
    };
    r.readAsDataURL(file);
  };

  // ── Canvas ───────────────────────────────────────────────────────────────────

  const getXY = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);

    zones.filter(z => z.page === currentPage).forEach(z => {
      const [cx, cy, cw, ch] = [z.x * c.width, z.y * c.height, z.w * c.width, z.h * c.height];
      ctx.strokeStyle = z.color; ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);
      ctx.fillStyle = z.color + '22';
      ctx.fillRect(cx, cy, cw, ch);
      const lw = Math.min(z.fieldLabel.length * 7 + 14, 200);
      ctx.fillStyle = z.color;
      ctx.fillRect(cx, cy - 20, lw, 18);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px system-ui';
      ctx.fillText(z.fieldLabel, cx + 7, cy - 6);
    });

    if (drawing) {
      ctx.strokeStyle = 'var(--primary)'; ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(drawing.x * c.width, drawing.y * c.height, drawing.w * c.width, drawing.h * c.height);
      ctx.fillStyle = 'rgba(8,145,178,0.08)';
      ctx.fillRect(drawing.x * c.width, drawing.y * c.height, drawing.w * c.width, drawing.h * c.height);
      ctx.setLineDash([]);
    }
  }, [zones, drawing, currentPage]);

  useEffect(() => { redraw(); }, [redraw]);

  const onMD = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!zoneMode || pending) return;
    const pt = getXY(e);
    setStartPt(pt); setDrawing({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };
  const onMM = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!zoneMode || !startPt) return;
    const pt = getXY(e);
    setDrawing({ x: Math.min(startPt.x, pt.x), y: Math.min(startPt.y, pt.y), w: Math.abs(pt.x - startPt.x), h: Math.abs(pt.y - startPt.y) });
  };
  const onMU = () => {
    if (!zoneMode || !startPt || !drawing) return;
    if (drawing.w < 0.02 || drawing.h < 0.01) { setDrawing(null); setStartPt(null); return; }
    setPending({ ...drawing }); setCustomLabel(''); setDrawing(null); setStartPt(null);
  };

  // ── OCR + field assignment ────────────────────────────────────────────────────

  const confirmZone = async (fieldKey: string, fieldLabel: string, color: string) => {
    if (!pending || !tempId) return;
    setOcrLoading(true);
    let text = '';
    try {
      const res = await api.post('/cv/ocr-zone', { temp_id: tempId, page: currentPage, x: pending.x, y: pending.y, w: pending.w, h: pending.h });
      text = (res.data.text || '').trim();
    } catch { text = ''; }
    setOcrLoading(false);

    if (text) {
      if (fieldKey === 'skills_add') {
        const ns = text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
        setExt(ex => ({ ...ex, skills: [...new Set([...ex.skills, ...ns])] }));
      } else if (fieldKey === 'certifications_add') {
        const nc = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
        setExt(ex => ({ ...ex, certifications: [...new Set([...ex.certifications, ...nc])] }));
      } else if (fieldKey in EMPTY_EXT) {
        setExt(ex => ({ ...ex, [fieldKey]: text }));
        setAutoFilled(prev => new Set([...prev, fieldKey]));
      }
      toast.success(`${fieldLabel} → "${text.slice(0, 35)}${text.length > 35 ? '…' : ''}"`);
    } else {
      toast.warning('Zone vide — aucun texte extrait');
    }

    setZones(prev => [...prev, { id: crypto.randomUUID(), fieldKey, fieldLabel, text, page: currentPage, color, ...pending }]);
    setPending(null); setCustomLabel('');
  };

  const sf = (k: keyof Extraction) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setExt(ex => ({ ...ex, [k]: e.target.value }));

  const updExp = (i: number, k: keyof Experience, v: string) =>
    setExt(ex => { const a = [...ex.experience]; a[i] = { ...a[i], [k]: v }; return { ...ex, experience: a }; });
  const updEdu = (i: number, k: keyof Education, v: string) =>
    setExt(ex => { const a = [...ex.education]; a[i] = { ...a[i], [k]: v }; return { ...ex, education: a }; });

  const TABS = [
    { label: 'Profil',       icon: <User size={12} /> },
    { label: 'Expériences',  icon: <Briefcase size={12} />,    count: ext.experience.length },
    { label: 'Formation',    icon: <GraduationCap size={12} />, count: ext.education.length },
    { label: 'Compétences',  icon: <Wrench size={12} />,       count: ext.skills.length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 30px 70px rgba(0,0,0,0.4)', border: '1px solid var(--line)', width: '100%', maxWidth: 1200, height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--primary-border)' }}>
              <FileText size={17} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Importer un CV</p>
              <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0 }}>
                {showRight ? `${autoFilled.size} champ(s) extrait(s) · Sélectionnez des zones pour compléter` : 'PDF · DOCX · JPG · PNG'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: 6, borderRadius: 8 }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* ── LEFT: CV Viewer ── */}
          <div style={{ width: 440, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', background: '#14151f' }}>

            {!hasPages ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
                <div
                  onClick={() => !loading && fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  style={{ width: '100%', maxWidth: 300, border: `2px dashed ${loading ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 14, padding: '44px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, cursor: loading ? 'default' : 'pointer', background: 'rgba(255,255,255,0.025)', transition: 'border-color 0.2s' }}
                >
                  {loading ? <Spinner /> : <Upload size={34} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 5 }}>
                      {loading ? 'Analyse en cours…' : 'Déposer le CV ici'}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>PDF · DOCX · JPG · PNG</p>
                  </div>
                  {!loading && (
                    <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Parcourir
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" style={{ display: 'none' }} accept=".pdf,.docx,.doc,.jpg,.jpeg,.png" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div style={{ padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                  <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}
                    style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: currentPage === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1, textAlign: 'center' }}>
                    Page {currentPage + 1} / {pages.length}
                  </span>
                  <button disabled={currentPage === pages.length - 1} onClick={() => setCurrentPage(p => p + 1)}
                    style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: currentPage === pages.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)' }}>
                    <ChevronRight size={14} />
                  </button>
                  <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
                  <button
                    onClick={() => { setZoneMode(z => !z); setPending(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, background: zoneMode ? 'var(--primary)' : 'rgba(255,255,255,0.07)', color: zoneMode ? '#fff' : 'rgba(255,255,255,0.55)', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <Crosshair size={12} /> {zoneMode ? 'Zone ON' : 'Sélect. zone'}
                  </button>
                  <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '4px 6px' }} title="Autre CV">
                    <Upload size={13} />
                  </button>
                  <input ref={fileRef} type="file" style={{ display: 'none' }} accept=".pdf,.docx,.doc,.jpg,.jpeg,.png" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </div>

                {/* Page image */}
                <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                    <img
                      ref={imgRef}
                      src={`data:image/png;base64,${pages[currentPage] ?? ''}`}
                      alt={`Page ${currentPage + 1}`}
                      style={{ display: 'block', maxWidth: '100%', borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}
                      onLoad={() => {
                        if (canvasRef.current && imgRef.current) {
                          canvasRef.current.width  = imgRef.current.naturalWidth;
                          canvasRef.current.height = imgRef.current.naturalHeight;
                          redraw();
                        }
                      }}
                    />
                    <canvas
                      ref={canvasRef}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: zoneMode ? (pending ? 'default' : 'crosshair') : 'default', borderRadius: 6 }}
                      onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU}
                    />
                  </div>
                </div>

                {/* Zone picker */}
                {pending && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.5)', padding: '11px 14px', flexShrink: 0 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                      {ocrLoading ? 'OCR en cours…' : 'Affecter cette zone à :'}
                    </p>
                    {ocrLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}><Spinner /> Extraction du texte…</div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                          {FIELD_OPTIONS.map(f => (
                            <button key={f.key} onClick={() => confirmZone(f.key, f.label, f.color)}
                              style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', background: f.color + '22', color: f.color, border: `1px solid ${f.color}44`, borderRadius: 6, cursor: 'pointer' }}>
                              {f.label}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#fff', outline: 'none' }}
                            placeholder="Champ personnalisé…"
                            value={customLabel}
                            onChange={e => setCustomLabel(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && customLabel && confirmZone('custom', customLabel, 'var(--ink-3)')}
                          />
                          <button onClick={() => customLabel && confirmZone('custom', customLabel, 'var(--ink-3)')} disabled={!customLabel}
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '5px 10px', cursor: customLabel ? 'pointer' : 'not-allowed', color: customLabel ? '#fff' : 'rgba(255,255,255,0.25)' }}>
                            <Check size={13} />
                          </button>
                          <button onClick={() => setPending(null)}
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.45)' }}>
                            <X size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Zones list */}
                {zones.filter(z => z.page === currentPage).length > 0 && !pending && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', maxHeight: 90, overflowY: 'auto', padding: '7px 12px', flexShrink: 0 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {zones.filter(z => z.page === currentPage).length} zone(s)
                    </p>
                    {zones.filter(z => z.page === currentPage).map(z => (
                      <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 2, background: z.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: z.color, fontWeight: 700, flexShrink: 0, minWidth: 80 }}>{z.fieldLabel}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.text || '(vide)'}</span>
                        <button onClick={() => setZones(p => p.filter(x => x.id !== z.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 2 }}><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT: Form ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {!showRight ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', padding: 40, textAlign: 'center' }}>
                <Upload size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
                <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Importez un CV pour commencer</p>
                <p style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.6 }}>Les données seront extraites automatiquement. Vous pourrez ensuite compléter manuellement.</p>
              </div>
            ) : loading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <Spinner />
                <p style={{ fontWeight: 500, color: 'var(--ink-2)' }}>Analyse du CV en cours…</p>
              </div>
            ) : (
              <>
                {/* Profile header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, background: 'linear-gradient(135deg, var(--primary-soft) 0%, transparent 80%)' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 62, height: 62, borderRadius: '50%', border: '3px solid var(--primary-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-soft)' }}>
                      {photo
                        ? <img src={photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <User size={26} style={{ color: 'var(--primary)', opacity: 0.5 }} />}
                    </div>
                    <button onClick={() => photoRef.current?.click()}
                      style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                      title="Changer la photo">
                      <Camera size={11} />
                    </button>
                    <input ref={photoRef} type="file" style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.webp" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 2px' }}>{ext.full_name || 'Nom non détecté'}</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0 }}>{ext.email || ext.phone || 'Contact non détecté'}</p>
                    {photo && <p style={{ fontSize: 11, color: 'var(--primary)', margin: '3px 0 0', fontWeight: 600 }}>✓ Photo {autoFilled.size > 0 ? 'extraite du CV' : 'importée'}</p>}
                  </div>
                  {autoFilled.size > 0 && (
                    <div style={{ textAlign: 'center', padding: '6px 14px', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', borderRadius: 10 }}>
                      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', margin: 0, lineHeight: 1 }}>{autoFilled.size}</p>
                      <p style={{ fontSize: 10, color: 'var(--primary)', margin: '2px 0 0', fontWeight: 600, opacity: 0.7 }}>EXTRAITS</p>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0, padding: '0 20px' }}>
                  {TABS.map((t, i) => (
                    <button key={i} onClick={() => setTab(i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 13px', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: tab === i ? 'var(--primary)' : 'var(--ink-2)', borderBottom: `2px solid ${tab === i ? 'var(--primary)' : 'transparent'}`, transition: 'all 0.15s' }}>
                      {t.icon} {t.label}
                      {t.count !== undefined && t.count > 0 && (
                        <span style={{ fontSize: 10, background: tab === i ? 'var(--primary-soft)' : 'var(--surface-2)', color: tab === i ? 'var(--primary)' : 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 999, padding: '0 5px', fontWeight: 700 }}>{t.count}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

                  {/* Profil */}
                  {tab === 0 && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginBottom: 14 }}>
                        {([
                          ['full_name','Nom complet','text','Prénom Nom'],
                          ['email','Email','email','email@exemple.com'],
                          ['phone','Téléphone','text','+212 6 00 00 00 00'],
                          ['nationality','Nationalité','text','Marocain(e)'],
                        ] as [keyof Extraction, string, string, string][]).map(([k, label, type, ph]) => (
                          <div key={k}>
                            <FL label={label} auto={autoFilled.has(k)} />
                            <input className="input" type={type} style={{ fontSize: 13, padding: '7px 10px', width: '100%', boxSizing: 'border-box' }}
                              value={(ext[k] as string) || ''} onChange={sf(k)} placeholder={ph} />
                          </div>
                        ))}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <FL label="Adresse" auto={autoFilled.has('address')} />
                          <input className="input" style={{ fontSize: 13, padding: '7px 10px', width: '100%', boxSizing: 'border-box' }}
                            value={ext.address} onChange={sf('address')} placeholder="Casablanca, Maroc" />
                        </div>
                        <div>
                          <FL label="LinkedIn" auto={autoFilled.has('linkedin')} />
                          <input className="input" style={{ fontSize: 13, padding: '7px 10px', width: '100%', boxSizing: 'border-box' }}
                            value={ext.linkedin} onChange={sf('linkedin')} placeholder="linkedin.com/in/..." />
                        </div>
                        <div>
                          <FL label="GitHub" auto={autoFilled.has('github')} />
                          <input className="input" style={{ fontSize: 13, padding: '7px 10px', width: '100%', boxSizing: 'border-box' }}
                            value={ext.github} onChange={sf('github')} placeholder="github.com/..." />
                        </div>
                      </div>
                      <div>
                        <FL label="Profil / Résumé" auto={autoFilled.has('summary')} />
                        <textarea className="input" rows={4} style={{ fontSize: 13, padding: '7px 10px', resize: 'none', width: '100%', boxSizing: 'border-box' }}
                          value={ext.summary} onChange={sf('summary')} placeholder="Résumé du profil professionnel…" />
                      </div>
                    </div>
                  )}

                  {/* Expériences */}
                  {tab === 1 && (
                    <div>
                      {ext.experience.length === 0
                        ? <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--ink-2)' }}><Briefcase size={32} style={{ opacity: 0.15, marginBottom: 12 }} /><p style={{ fontWeight: 500 }}>Aucune expérience extraite</p><p style={{ fontSize: 12, marginTop: 6 }}>Utilisez "Sélect. zone" pour extraire depuis le CV.</p></div>
                        : ext.experience.map((exp, i) => (
                          <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderLeft: '3px solid var(--primary)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 6 }}>
                              {([['title','Titre'],['company','Entreprise']] as [keyof Experience,string][]).map(([k,l]) => (
                                <div key={k}>
                                  <label style={{ fontSize: 10, color: 'var(--ink-2)', display: 'block', marginBottom: 2 }}>{l}</label>
                                  <input className="input" style={{ fontSize: 12, padding: '5px 8px', width: '100%', boxSizing: 'border-box' }} value={exp[k]} onChange={e => updExp(i, k, e.target.value)} />
                                </div>
                              ))}
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: 'var(--ink-2)', display: 'block', marginBottom: 2 }}>Dates</label>
                              <input className="input" style={{ fontSize: 12, padding: '5px 8px', width: '100%', boxSizing: 'border-box', marginBottom: 6 }} value={exp.dates} onChange={e => updExp(i, 'dates', e.target.value)} />
                            </div>
                            {exp.description && <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{exp.description.slice(0, 150)}{exp.description.length > 150 ? '…' : ''}</p>}
                            <button onClick={() => setExt(ex => ({ ...ex, experience: ex.experience.filter((_, j) => j !== i) }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 0', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                              <Trash2 size={10} /> Supprimer
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Formation */}
                  {tab === 2 && (
                    <div>
                      {ext.education.length === 0
                        ? <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--ink-2)' }}><GraduationCap size={32} style={{ opacity: 0.15, marginBottom: 12 }} /><p style={{ fontWeight: 500 }}>Aucune formation extraite</p><p style={{ fontSize: 12, marginTop: 6 }}>Utilisez "Sélect. zone" pour extraire depuis le CV.</p></div>
                        : ext.education.map((edu, i) => (
                          <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderLeft: '3px solid #10b981', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                              {([['degree','Diplôme'],['institution','Établissement'],['dates','Dates']] as [keyof Education,string][]).map(([k,l]) => (
                                <div key={k} style={k === 'dates' ? {} : {}}>
                                  <label style={{ fontSize: 10, color: 'var(--ink-2)', display: 'block', marginBottom: 2 }}>{l}</label>
                                  <input className="input" style={{ fontSize: 12, padding: '5px 8px', width: '100%', boxSizing: 'border-box' }} value={edu[k]} onChange={e => updEdu(i, k, e.target.value)} />
                                </div>
                              ))}
                            </div>
                            <button onClick={() => setExt(ex => ({ ...ex, education: ex.education.filter((_, j) => j !== i) }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 0', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                              <Trash2 size={10} /> Supprimer
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Compétences */}
                  {tab === 3 && (
                    <div>
                      <div style={{ marginBottom: 20 }}>
                        <FL label="Compétences" auto={autoFilled.has('skills')} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 44, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
                          {ext.skills.length === 0
                            ? <span style={{ fontSize: 12, color: 'var(--ink-2)', alignSelf: 'center' }}>Aucune compétence — sélectionnez une zone</span>
                            : ext.skills.map((s, i) => (
                              <span key={i} style={{ fontSize: 12, padding: '3px 10px', background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)', borderRadius: 999, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                                {s}
                                <button onClick={() => setExt(ex => ({ ...ex, skills: ex.skills.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, display: 'flex' }}><X size={10} /></button>
                              </span>
                            ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <FL label="Langues" auto={autoFilled.has('languages')} />
                        {ext.languages.length === 0
                          ? <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Aucune langue détectée</p>
                          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {ext.languages.filter(l => l.name).map((l, i) => (
                              <span key={i} style={{ fontSize: 12, padding: '4px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Globe size={11} style={{ color: 'var(--primary)' }} />
                                <b>{l.name}</b>
                                {l.level !== 'Non précisé' && <span style={{ color: 'var(--ink-2)' }}>— {l.level}</span>}
                              </span>
                            ))}
                          </div>}
                      </div>
                      <div>
                        <FL label="Certifications" auto={autoFilled.has('certifications')} />
                        {ext.certifications.length === 0
                          ? <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Aucune certification détectée</p>
                          : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {ext.certifications.map((c, i) => (
                              <div key={i} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8 }}>
                                <Award size={13} style={{ color: 'var(--warn)', flexShrink: 0 }} /> {c}
                                <button onClick={() => setExt(ex => ({ ...ex, certifications: ex.certifications.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, marginLeft: 'auto', display: 'flex' }}><X size={11} /></button>
                              </div>
                            ))}
                          </div>}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '11px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--surface)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          {(hasPages || hasExt) && (
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="soft" onClick={() => onImport({ ...ext, photo: photo || undefined, status: 'active', contract_type: 'CDI' } as any)}>
                <UserCheck size={14} /> Créer comme employé
              </Button>
              <Button onClick={() => onImport({ ...ext, photo: photo || undefined, status: 'intern', contract_type: 'Stage' } as any)}>
                <GraduationCap size={14} /> Créer le stagiaire
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Export wrapped in Error Boundary ─────────────────────────────────────────

export function CVImportModal(props: CVImportModalProps) {
  return (
    <CVErrorBoundary onClose={props.onClose}>
      <Inner {...props} />
    </CVErrorBoundary>
  );
}
