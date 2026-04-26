import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Search, Wand2, Plus, Upload, Pencil, Trash2,
  X, Eye, Check, FileUp, Code2, Tag, Save,
} from 'lucide-react';
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
  importTemplateFromPdf,
} from '../../lib/api';
import type { Template } from '../../lib/api';
import { Card, Badge, Spinner, Button } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// ── Category config ───────────────────────────────────────────────────────────

const CAT_META: Record<string, { color: string; bg: string; label: string }> = {
  attestation: { color: '#059669', bg: '#ecfdf5', label: 'Attestation' },
  contrat:     { color: '#0891b2', bg: '#ecfeff', label: 'Contrat' },
  lettre:      { color: '#d97706', bg: '#fffbeb', label: 'Lettre' },
  avenant:     { color: '#7c3aed', bg: '#f5f3ff', label: 'Avenant' },
  autre:       { color: '#64748b', bg: '#f8fafc', label: 'Autre' },
};
const catMeta = (cat: string) => CAT_META[cat] ?? CAT_META.autre;

const CATEGORIES = Object.keys(CAT_META);

// ── Variable pill ─────────────────────────────────────────────────────────────

function VarPill({ v }: { v: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px',
      background: '#f0f9ff', color: '#0369a1',
      border: '1px solid #bae6fd', borderRadius: 999,
      fontFamily: 'monospace',
    }}>
      {'{{'}{v}{'}}'}
    </span>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({ tpl, onClose }: { tpl: Template; onClose: () => void }) {
  const m = catMeta(tpl.category);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-elev)', borderRadius: 14, border: '1px solid var(--border)', width: '100%', maxWidth: 760, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={15} style={{ color: m.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{tpl.name_fr}</p>
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{tpl.category} · aperçu du modèle</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#f8fafc' }}>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)', padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {tpl.body_template
              ? <div dangerouslySetInnerHTML={{ __html: tpl.body_template }} />
              : <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>Aucun contenu de template</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Template form modal (create / edit) ───────────────────────────────────────

function TemplateFormModal({
  initial, onClose, onSave, loading,
}: {
  initial?: Template; onClose: () => void;
  onSave: (data: any) => void; loading: boolean;
}) {
  const [form, setForm] = useState({
    name_fr:       initial?.name_fr ?? '',
    name_en:       initial?.name_en ?? '',
    category:      initial?.category ?? 'attestation',
    body_template: initial?.body_template ?? '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const vars = [...new Set((form.body_template.match(/\{\{(\w+)\}\}/g) ?? []).map(m => m.replace(/[{}]/g, '')))];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_fr || !form.body_template) { toast.error('Nom et contenu requis'); return; }
    const code = form.name_fr.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 50);
    onSave({ ...form, code, name_ar: form.name_en || form.name_fr, variables: vars, is_active: true });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-elev)', borderRadius: 14, border: '1px solid var(--border)', width: '100%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{initial ? 'Modifier le template' : 'Nouveau template'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 160px', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Nom (FR) *</label>
              <input className="input" style={{ fontSize: 13 }} value={form.name_fr} onChange={set('name_fr')} required placeholder="Attestation de travail" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Nom (EN)</label>
              <input className="input" style={{ fontSize: 13 }} value={form.name_en} onChange={set('name_en')} placeholder="Work certificate" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Catégorie</label>
              <select className="select" style={{ fontSize: 13 }} value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catMeta(c).label}</option>)}
              </select>
            </div>
          </div>

          {/* Variables detected */}
          {vars.length > 0 && (
            <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600 }}>Variables détectées :</span>
              {vars.map(v => <VarPill key={v} v={v} />)}
            </div>
          )}

          {/* Body editor */}
          <div style={{ flex: 1, padding: '12px 18px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Code2 size={13} style={{ color: 'var(--fg-muted)' }} />
              <label style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600 }}>Contenu HTML * — utilisez {'{{'+'variable'+'}}'}  pour les champs dynamiques</label>
            </div>
            <textarea
              className="input"
              style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5, minHeight: 300 }}
              value={form.body_template}
              onChange={set('body_template')}
              required
              placeholder={'<div style="font-family:serif;padding:40px;">\n  <h1>Attestation de travail</h1>\n  <p>M./Mme {{full_name}}, CIN {{cin}}, poste {{position}}...</p>\n  <p>Fait à Casablanca, le {{today}}</p>\n</div>'}
            />
          </div>

          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={loading}><Save size={13} /> {initial ? 'Enregistrer' : 'Créer le template'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PDF Import modal ──────────────────────────────────────────────────────────

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [nameFr, setNameFr] = useState('');
  const [category, setCategory] = useState('attestation');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !nameFr.trim()) { toast.error('Fichier et nom requis'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name_fr', nameFr.trim());
      fd.append('name_en', nameFr.trim());
      fd.append('category', category);
      await importTemplateFromPdf(fd);
      toast.success('Template importé avec succès');
      onImported();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-elev)', borderRadius: 14, border: '1px solid var(--border)', width: '100%', maxWidth: 480 }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileUp size={14} style={{ color: 'var(--primary)' }} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Importer un PDF comme template</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px' }}>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); }}
            style={{
              border: `2px dashed ${file ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 10, padding: '28px 20px', textAlign: 'center',
              cursor: 'pointer', marginBottom: 16, background: file ? 'var(--primary-soft)' : 'var(--bg-muted)',
              transition: 'all 0.15s',
            }}>
            <FileText size={28} style={{ color: file ? 'var(--primary)' : 'var(--fg-subtle)', margin: '0 auto 10px', display: 'block' }} />
            {file
              ? <><p style={{ fontWeight: 600, color: 'var(--primary)', margin: '0 0 4px' }}>{file.name}</p><p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>Cliquez pour changer</p></>
              : <><p style={{ fontWeight: 600, margin: '0 0 4px' }}>Déposer un PDF ici</p><p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>ou cliquer pour sélectionner</p></>}
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Nom du template *</label>
              <input className="input" style={{ fontSize: 13 }} value={nameFr} onChange={e => setNameFr(e.target.value)} required placeholder="ex: Attestation de travail" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Catégorie</label>
              <select className="select" style={{ fontSize: 13 }} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catMeta(c).label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
            Le PDF sera analysé automatiquement. Les espaces réservés comme <code>[Nom et prénom]</code>, <code>[date]</code>, <code>[CIN]</code> seront convertis en variables <code>{'{{full_name}}'}</code>, <code>{'{{today}}'}</code>, <code>{'{{cin}}'}</code>.
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={loading} disabled={!file}>
              <Upload size={13} /> Importer le template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  tpl, onEdit, onDelete, onPreview,
}: {
  tpl: Template;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const m = catMeta(tpl.category);
  const vars = tpl.body_template
    ? [...new Set((tpl.body_template.match(/\{\{(\w+)\}\}/g) ?? []).map(v => v.replace(/[{}]/g, '')))]
    : [];

  return (
    <div style={{
      background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.15s, transform 0.15s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>

      {/* Category accent bar */}
      <div style={{ height: 3, background: m.color }} />

      <div style={{ padding: '14px 16px', flex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={15} style={{ color: m.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 2px', lineHeight: 1.3 }}>{tpl.name_fr}</p>
            {tpl.name_en && tpl.name_en !== tpl.name_fr && (
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{tpl.name_en}</p>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: m.bg, color: m.color, borderRadius: 5, flexShrink: 0 }}>
            {m.label}
          </span>
        </div>

        {/* Variables */}
        {vars.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            {vars.slice(0, 5).map(v => <VarPill key={v} v={v} />)}
            {vars.length > 5 && <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>+{vars.length - 5}</span>}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={onPreview} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)'; }}>
          <Eye size={11} /> Aperçu
        </button>
        <button onClick={onEdit} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)'; }}>
          <Pencil size={11} /> Modifier
        </button>
        <div style={{ flex: 1 }} />
        <Link to={`/app/generate?template_id=${tpl.id}`}>
          <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Wand2 size={11} /> Utiliser
          </button>
        </Link>
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '5px 6px', borderRadius: 6, display: 'flex' }}
          title="Supprimer"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<Template | null>(null);
  const [previewing, setPreviewing] = useState<Template | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => listTemplates({ active_only: false }),
  });

  const allTemplates = data?.data ?? [];
  const templates = allTemplates.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.name_fr.toLowerCase().includes(q) || (t.name_en ?? '').toLowerCase().includes(q))
        && (!catFilter || t.category === catFilter);
  });
  const categories = [...new Set(allTemplates.map(t => t.category))].sort();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['templates'] });

  const createMut = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => { invalidate(); setShowCreate(false); toast.success('Template créé'); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Erreur création'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => updateTemplate(id, body),
    onSuccess: () => { invalidate(); setEditing(null); toast.success('Template mis à jour'); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Erreur mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => { invalidate(); toast.success('Template supprimé'); },
    onError: () => toast.error('Erreur suppression'),
  });

  const handleDelete = (tpl: Template) => {
    if (!confirm(`Supprimer "${tpl.name_fr}" ?`)) return;
    deleteMut.mutate(tpl.id);
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Templates"
        subtitle={`${allTemplates.length} template${allTemplates.length !== 1 ? 's' : ''} disponibles`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="soft" onClick={() => setShowImport(true)}>
              <FileUp size={14} /> Importer PDF
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Nouveau template
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingLeft: 32, fontSize: 13 }}
            placeholder="Rechercher un template…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setCatFilter('')}
            style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !catFilter ? 'var(--primary)' : 'var(--bg-elev)', color: !catFilter ? '#fff' : 'var(--fg)' }}>
            Tous
          </button>
          {categories.map(cat => {
            const m = catMeta(cat);
            return (
              <button key={cat} onClick={() => setCatFilter(cat === catFilter ? '' : cat)}
                style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${catFilter === cat ? m.color : 'var(--border)'}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: catFilter === cat ? m.bg : 'var(--bg-elev)', color: catFilter === cat ? m.color : 'var(--fg)' }}>
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <FileText size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Aucun template trouvé</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Créez un template manuellement ou importez un PDF TYTHON.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Button variant="soft" onClick={() => setShowImport(true)}><FileUp size={13} /> Importer PDF</Button>
            <Button onClick={() => setShowCreate(true)}><Plus size={13} /> Créer</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {templates.map(tpl => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              onPreview={() => setPreviewing(tpl)}
              onEdit={() => setEditing(tpl)}
              onDelete={() => handleDelete(tpl)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={invalidate} />}

      {showCreate && (
        <TemplateFormModal
          onClose={() => setShowCreate(false)}
          onSave={data => createMut.mutate(data)}
          loading={createMut.isPending}
        />
      )}

      {editing && (
        <TemplateFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={data => updateMut.mutate({ id: editing.id, body: data })}
          loading={updateMut.isPending}
        />
      )}

      {previewing && <PreviewModal tpl={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
