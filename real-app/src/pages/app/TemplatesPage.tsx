import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Search, Wand2, Plus, Upload, Pencil, Trash2,
  X, Eye, FileUp, Tag, Save, ChevronDown, Sparkles,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from 'lucide-react';
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
  importTemplateFromPdf, seedDefaultTemplates,
} from '../../lib/api';
import type { Template } from '../../lib/api';
import { Spinner, Button } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// ── Category config ────────────────────────────────────────────────────────────

const CAT_META: Record<string, { color: string; bg: string; label: string }> = {
  attestation: { color: '#059669', bg: '#ecfdf5', label: 'Attestation' },
  contrat:     { color: '#0891b2', bg: '#ecfeff', label: 'Contrat' },
  lettre:      { color: '#d97706', bg: '#fffbeb', label: 'Lettre' },
  avenant:     { color: '#7c3aed', bg: '#f5f3ff', label: 'Avenant' },
  autre:       { color: '#64748b', bg: '#f8fafc', label: 'Autre' },
};
const catMeta = (cat: string) => CAT_META[cat] ?? CAT_META.autre;
const CATEGORIES = Object.keys(CAT_META);

// ── Variables ──────────────────────────────────────────────────────────────────

const COMMON_VARS = [
  { key: 'full_name',      label: 'Nom complet' },
  { key: 'cin',            label: 'CIN' },
  { key: 'position',       label: 'Poste' },
  { key: 'department',     label: 'Département' },
  { key: 'hire_date',      label: "Date d'embauche" },
  { key: 'contract_start', label: 'Début contrat' },
  { key: 'contract_end',   label: 'Fin contrat' },
  { key: 'contract_type',  label: 'Type contrat' },
  { key: 'salary',         label: 'Salaire' },
  { key: 'email',          label: 'Email' },
  { key: 'phone',          label: 'Téléphone' },
  { key: 'address',        label: 'Adresse' },
  { key: 'city',           label: 'Ville' },
  { key: 'matricule',      label: 'Matricule' },
  { key: 'manager',        label: 'Manager' },
  { key: 'today',          label: 'Date du jour' },
  { key: 'nationality',    label: 'Nationalité' },
];

// ── HTML ↔ editor conversion ───────────────────────────────────────────────────

function varChipHTML(v: string) {
  return (
    `<span class="tpl-var" contenteditable="false" data-var="${v}" ` +
    `style="display:inline-block;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;` +
    `border-radius:4px;padding:1px 8px;font-size:11px;font-weight:700;font-family:monospace;` +
    `cursor:default;user-select:none;margin:0 2px;vertical-align:middle;">` +
    `{{${v}}}</span>`
  );
}

/**
 * Strip position:absolute / position:relative (and associated top/left/width/height)
 * so that fitz-extracted PDF HTML becomes normal flow text, editable in a contentEditable.
 */
function normalizeForEditing(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll<HTMLElement>('*').forEach(el => {
    const pos = el.style.position;
    if (pos === 'absolute' || pos === 'relative' || pos === 'fixed') {
      el.style.position = '';
      el.style.top = '';
      el.style.left = '';
      el.style.right = '';
      el.style.bottom = '';
      // keep width/height only on images, strip everywhere else
      if (el.tagName !== 'IMG') {
        el.style.width = '';
        el.style.height = '';
      }
    }
    // Remove whitespace:pre which prevents normal editing/wrapping
    if (el.style.whiteSpace === 'pre') {
      el.style.whiteSpace = '';
    }
  });
  return div.innerHTML;
}

function toEditorHTML(html: string): string {
  const clean = normalizeForEditing(html);
  return clean.replace(/\{\{(\w+)\}\}/g, (_, v) => varChipHTML(v));
}

function fromEditorHTML(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('[data-var]').forEach(el => {
    const v = (el as HTMLElement).getAttribute('data-var') ?? '';
    el.replaceWith(`{{${v}}}`);
  });
  return div.innerHTML;
}

// ── Toolbar button ─────────────────────────────────────────────────────────────

function TB({
  title, onClick, children,
}: {
  title?: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        background: 'none', border: '1px solid transparent', borderRadius: 5,
        padding: '3px 7px', cursor: 'pointer', color: 'var(--fg)', fontSize: 12,
        fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
        minWidth: 26, justifyContent: 'center', lineHeight: 1,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}

const Sep = () => (
  <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
);

// ── Rich WYSIWYG Editor ────────────────────────────────────────────────────────

function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showVars, setShowVars] = useState(false);
  const [focused, setFocused] = useState(false);

  // Set HTML once on mount — imperatively so React never resets the contentEditable
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = toEditorHTML(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (editorRef.current) onChange(fromEditorHTML(editorRef.current.innerHTML));
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    // eslint-disable-next-line no-restricted-globals
    document.execCommand(cmd, false, val);
    emit();
  };

  const insertVar = (varKey: string) => {
    editorRef.current?.focus();
    // eslint-disable-next-line no-restricted-globals
    document.execCommand('insertHTML', false, varChipHTML(varKey) + ' ');
    setShowVars(false);
    emit();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
      border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
    }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: '5px 8px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)',
        flexWrap: 'wrap', flexShrink: 0,
      }}>
        {/* Bold / Italic / Underline */}
        <TB title="Gras (Ctrl+B)" onClick={() => exec('bold')}>
          <strong style={{ fontSize: 13 }}>B</strong>
        </TB>
        <TB title="Italique (Ctrl+I)" onClick={() => exec('italic')}>
          <em style={{ fontSize: 13 }}>I</em>
        </TB>
        <TB title="Souligné (Ctrl+U)" onClick={() => exec('underline')}>
          <span style={{ textDecoration: 'underline', fontSize: 13 }}>S</span>
        </TB>

        <Sep />

        {/* Headings */}
        <TB title="Titre 1" onClick={() => exec('formatBlock', 'H1')}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>H1</span>
        </TB>
        <TB title="Titre 2" onClick={() => exec('formatBlock', 'H2')}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>H2</span>
        </TB>
        <TB title="Titre 3" onClick={() => exec('formatBlock', 'H3')}>
          <span style={{ fontSize: 11 }}>H3</span>
        </TB>
        <TB title="Paragraphe" onClick={() => exec('formatBlock', 'P')}>
          <span style={{ fontSize: 11 }}>¶</span>
        </TB>

        <Sep />

        {/* Alignment */}
        <TB title="Gauche" onClick={() => exec('justifyLeft')}><AlignLeft size={12} /></TB>
        <TB title="Centre" onClick={() => exec('justifyCenter')}><AlignCenter size={12} /></TB>
        <TB title="Droite" onClick={() => exec('justifyRight')}><AlignRight size={12} /></TB>
        <TB title="Justifier" onClick={() => exec('justifyFull')}><AlignJustify size={12} /></TB>

        <Sep />

        {/* Font size */}
        <select
          onChange={e => { exec('fontSize', e.target.value); (e.target as HTMLSelectElement).value = ''; }}
          defaultValue=""
          style={{
            fontSize: 11, padding: '3px 5px', borderRadius: 4, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--bg-elev)', color: 'var(--fg)',
          }}
        >
          <option value="" disabled>Taille</option>
          <option value="1">8pt</option>
          <option value="2">10pt</option>
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
          <option value="7">36pt</option>
        </select>

        <Sep />

        {/* Undo / Redo */}
        <TB title="Annuler (Ctrl+Z)" onClick={() => exec('undo')}>
          <span style={{ fontSize: 14 }}>↩</span>
        </TB>
        <TB title="Rétablir (Ctrl+Y)" onClick={() => exec('redo')}>
          <span style={{ fontSize: 14 }}>↪</span>
        </TB>

        <div style={{ flex: 1 }} />

        {/* Insert variable dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowVars(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              background: 'var(--primary-soft)', border: '1px solid var(--primary)',
              borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: 'var(--primary)',
            }}
          >
            <Tag size={11} />
            Insérer variable
            <ChevronDown size={10} />
          </button>

          {showVars && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                onClick={() => setShowVars(false)}
              />
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 99,
                background: 'var(--bg-elev)', border: '1px solid var(--border)',
                borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                padding: 4, minWidth: 220, maxHeight: 290, overflowY: 'auto',
              }}>
                {COMMON_VARS.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); insertVar(v.key); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '5px 8px', background: 'none', border: 'none',
                      cursor: 'pointer', borderRadius: 5, textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{
                      fontFamily: 'monospace', fontSize: 10, color: '#1d4ed8',
                      background: '#eff6ff', padding: '1px 5px', borderRadius: 3,
                      border: '1px solid #bfdbfe', whiteSpace: 'nowrap',
                    }}>
                      {'{{'}{v.key}{'}}'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{v.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Document area ── */}
      <div style={{
        flex: 1, overflowY: 'auto', background: '#d1d5db',
        padding: '28px 20px 28px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', minHeight: 0,
      }}>
        <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 12, textAlign: 'center' }}>
          Cliquez dans le document pour commencer à écrire · Les variables en bleu ne sont pas modifiables directement — utilisez "Insérer variable" pour en ajouter
        </p>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); emit(); }}
          style={{
            background: '#fff',
            boxShadow: focused
              ? '0 0 0 3px #3b82f6, 0 4px 28px rgba(0,0,0,0.18)'
              : '0 4px 28px rgba(0,0,0,0.18)',
            width: '100%',
            maxWidth: 760,
            minHeight: 1050,
            padding: '60px 72px',
            outline: 'none',
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: '13px',
            lineHeight: '1.8',
            color: '#1a1a1a',
            borderRadius: 2,
            caretColor: '#3b82f6',
            cursor: 'text',
            transition: 'box-shadow 0.15s',
          }}
        />
      </div>
    </div>
  );
}

// ── Variable pill (display only) ───────────────────────────────────────────────

function VarPill({ v }: { v: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px',
      background: '#f0f9ff', color: '#0369a1',
      border: '1px solid #bae6fd', borderRadius: 999, fontFamily: 'monospace',
    }}>
      {'{{'}{v}{'}}'}
    </span>
  );
}

// ── Preview modal ──────────────────────────────────────────────────────────────

function PreviewModal({ tpl, onClose }: { tpl: Template; onClose: () => void }) {
  const m = catMeta(tpl.category);
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-elev)', borderRadius: 14, border: '1px solid var(--border)', width: '100%', maxWidth: 760, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={15} style={{ color: m.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{tpl.name_fr}</p>
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{tpl.category} · aperçu</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#f8fafc' }}>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)', padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {tpl.body_template
              ? <div dangerouslySetInnerHTML={{ __html: tpl.body_template }} />
              : <p style={{ color: 'var(--fg-muted)', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>Aucun contenu</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full-screen template editor (Create / Edit) ────────────────────────────────

function TemplateEditorModal({
  initial, onClose, onSave, loading,
}: {
  initial?: Template;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [nameFr, setNameFr] = useState(initial?.name_fr ?? '');
  const [nameEn, setNameEn] = useState(initial?.name_en ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'attestation');
  const [body, setBody] = useState(initial?.body_template ?? '');

  const handleSave = () => {
    if (!nameFr.trim()) { toast.error('Nom requis'); return; }
    if (!body.trim()) { toast.error('Contenu requis'); return; }
    const vars = [...new Set((body.match(/\{\{(\w+)\}\}/g) ?? []).map(m => m.replace(/[{}]/g, '')))];
    const code = nameFr.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 50);
    onSave({ name_fr: nameFr, name_en: nameEn || nameFr, name_ar: nameEn || nameFr, category, body_template: body, code, variables: vars, is_active: true });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding: '8px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        background: 'var(--bg-elev)',
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          title="Fermer"
        >
          <X size={16} />
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg)' }}>
          {initial ? 'Modifier le template' : 'Nouveau template'}
        </span>

        <div style={{ display: 'flex', gap: 8, flex: 1, marginLeft: 8 }}>
          <input
            className="input"
            style={{ fontSize: 13, maxWidth: 280 }}
            value={nameFr}
            onChange={e => setNameFr(e.target.value)}
            placeholder="Nom (FR) *"
          />
          <input
            className="input"
            style={{ fontSize: 13, maxWidth: 220 }}
            value={nameEn}
            onChange={e => setNameEn(e.target.value)}
            placeholder="Nom (EN)"
          />
          <select
            className="select"
            style={{ fontSize: 13, maxWidth: 150 }}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{catMeta(c).label}</option>)}
          </select>
        </div>

        <Button onClick={handleSave} loading={loading}>
          <Save size={13} /> Enregistrer
        </Button>
      </div>

      {/* Editor fills remaining height */}
      <RichEditor value={body} onChange={setBody} />
    </div>
  );
}

// ── Import modal ───────────────────────────────────────────────────────────────

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
      toast.error(err?.response?.data?.detail ?? "Erreur lors de l'import");
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
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Importer un document</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px' }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            style={{
              border: `2px dashed ${file ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 10, padding: '28px 20px', textAlign: 'center',
              cursor: 'pointer', marginBottom: 16,
              background: file ? 'var(--primary-soft)' : 'var(--bg-muted)',
              transition: 'all 0.15s',
            }}
          >
            <FileText size={28} style={{ color: file ? 'var(--primary)' : 'var(--fg-subtle)', margin: '0 auto 10px', display: 'block' }} />
            {file
              ? <><p style={{ fontWeight: 600, color: 'var(--primary)', margin: '0 0 4px' }}>{file.name}</p><p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>Cliquez pour changer</p></>
              : <><p style={{ fontWeight: 600, margin: '0 0 4px' }}>Déposer un PDF ou DOCX ici</p><p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>ou cliquer pour sélectionner</p></>
            }
            <input
              ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
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

          <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '9px 12px', marginBottom: 16, fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
            Les champs <code>[Nom et prénom]</code>, <code>[CIN]</code>, <code>[poste]</code>, <code>[Date]</code>… seront automatiquement convertis en variables <code>{'{{full_name}}'}</code>, etc.
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={onClose}>Annuler</Button>
            <Button type="submit" loading={loading} disabled={!file}>
              <Upload size={13} /> Importer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Template card ──────────────────────────────────────────────────────────────

function TemplateCard({
  tpl, onEdit, onDelete, onPreview,
}: {
  tpl: Template; onEdit: () => void; onDelete: () => void; onPreview: () => void;
}) {
  const m = catMeta(tpl.category);
  const vars = tpl.body_template
    ? [...new Set((tpl.body_template.match(/\{\{(\w+)\}\}/g) ?? []).map(v => v.replace(/[{}]/g, '')))]
    : [];

  return (
    <div
      style={{
        background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
    >
      <div style={{ height: 3, background: m.color }} />
      <div style={{ padding: '14px 16px', flex: 1 }}>
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
        {vars.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            {vars.slice(0, 5).map(v => <VarPill key={v} v={v} />)}
            {vars.length > 5 && <span style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>+{vars.length - 5}</span>}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={onPreview}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Eye size={11} /> Aperçu
        </button>
        <button
          onClick={onEdit}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Pencil size={11} /> Modifier
        </button>
        <div style={{ flex: 1 }} />
        <Link to={`/app/generate?template_id=${tpl.id}`}>
          <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Wand2 size={11} /> Utiliser
          </button>
        </Link>
        <button
          onClick={onDelete}
          title="Supprimer"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '5px 6px', borderRadius: 6, display: 'flex' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

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
    return (
      (!q || t.name_fr.toLowerCase().includes(q) || (t.name_en ?? '').toLowerCase().includes(q)) &&
      (!catFilter || t.category === catFilter)
    );
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

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Templates"
        subtitle={`${allTemplates.length} template${allTemplates.length !== 1 ? 's' : ''} disponibles`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="soft" onClick={async () => {
              try {
                const res = await seedDefaultTemplates();
                qc.invalidateQueries({ queryKey: ['templates'] });
                toast.success(`${res.created.length} modèle(s) officiel(s) chargé(s)${res.skipped.length ? ` (${res.skipped.length} déjà présent(s))` : ''}`);
              } catch (e: any) {
                toast.error(e?.response?.data?.detail ?? 'Erreur lors du chargement des modèles');
              }
            }}>
              <Sparkles size={14} /> Modèles officiels
            </Button>
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
          <input
            className="input" style={{ paddingLeft: 32, fontSize: 13 }}
            placeholder="Rechercher un template…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setCatFilter('')}
            style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !catFilter ? 'var(--primary)' : 'var(--bg-elev)', color: !catFilter ? '#fff' : 'var(--fg)' }}
          >
            Tous
          </button>
          {categories.map(cat => {
            const m = catMeta(cat);
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat === catFilter ? '' : cat)}
                style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${catFilter === cat ? m.color : 'var(--border)'}`, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: catFilter === cat ? m.bg : 'var(--bg-elev)', color: catFilter === cat ? m.color : 'var(--fg)' }}
              >
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
          <p style={{ fontSize: 13, marginBottom: 20 }}>Créez un template ou importez un PDF/DOCX.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Button variant="soft" onClick={() => setShowImport(true)}><FileUp size={13} /> Importer</Button>
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
              onDelete={() => { if (!confirm(`Supprimer "${tpl.name_fr}" ?`)) return; deleteMut.mutate(tpl.id); }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={invalidate} />}

      {showCreate && (
        <TemplateEditorModal
          onClose={() => setShowCreate(false)}
          onSave={d => createMut.mutate(d as any)}
          loading={createMut.isPending}
        />
      )}

      {editing && (
        <TemplateEditorModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={d => updateMut.mutate({ id: editing.id, body: d })}
          loading={updateMut.isPending}
        />
      )}

      {previewing && <PreviewModal tpl={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
