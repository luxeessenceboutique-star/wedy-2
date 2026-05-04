import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Wand2, Check, ChevronRight, Download, Sparkles, CheckCircle2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Printer, RotateCcw, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { listEmployees, listTemplates, generateDocument, downloadDoc, aiEnhance } from '../../lib/api';
import type { Employee, Template } from '../../lib/api';
import { Button, Badge, Card, Spinner } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { Avatar } from '../../components/ui';

// ── Constants ────────────────────────────────────────────────────────────────

const LANG_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];

const TODAY = new Date().toLocaleDateString('fr-FR');

// Maps template variable names → employee field values (for auto-fill)
const resolveVar = (varName: string, emp: Employee): string => {
  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const MAP: Record<string, () => string> = {
    full_name:        () => emp.full_name || '',
    cin:              () => emp.cin || '',
    email:            () => emp.email || '',
    phone:            () => emp.phone || '',
    address:          () => emp.address || '',
    city:             () => emp.city || '',
    nationality:      () => emp.nationality || '',
    position:         () => emp.position || '',
    department:       () => emp.department || '',
    manager:          () => emp.manager || '',
    matricule:        () => emp.matricule || '',
    contract_type:    () => emp.contract_type || '',
    hire_date:        () => fmt(emp.hire_date),
    contract_start:   () => fmt(emp.contract_start || emp.hire_date),
    contract_end:     () => emp.contract_end ? fmt(emp.contract_end) : 'à ce jour',
    internship_start: () => fmt(emp.internship_start),
    internship_end:   () => emp.internship_end ? fmt(emp.internship_end) : 'à ce jour',
    salary:           () => emp.salary ? `${Number(emp.salary).toLocaleString('fr-MA')} MAD` : '',
    today:            () => new Date().toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    company:          () => 'TYTHON',
  };
  return MAP[varName]?.() ?? '';
};

// All non-empty employee fields as selectable dropdown options
const empOptions = (emp: Employee) => {
  const entries: { label: string; value: string }[] = [
    { label: `Nom complet — ${emp.full_name}`, value: emp.full_name },
  ];
  const add = (label: string, v: string | number | undefined | null) => {
    if (v != null && v !== '') entries.push({ label: `${label} — ${v}`, value: String(v) });
  };
  add('CIN', emp.cin); add('Matricule', emp.matricule); add('Email', emp.email);
  add('Téléphone', emp.phone); add('Poste', emp.position); add('Département', emp.department);
  add('Date embauche', emp.hire_date); add('Type contrat', emp.contract_type);
  add('Début contrat', emp.contract_start); add('Fin contrat', emp.contract_end);
  add('Salaire', emp.salary); add('Manager', emp.manager);
  add('Date naissance', emp.birth_date); add('Adresse', emp.address);
  add('Ville', emp.city); add('Nationalité', emp.nationality);
  add('Début stage', emp.internship_start); add('Fin stage', emp.internship_end);
  entries.push({ label: `Société — TYTHON`, value: 'TYTHON' });
  entries.push({ label: `Date du jour — ${TODAY}`, value: TODAY });
  return entries;
};

// Extract {{variables}} from a template body
const extractVars = (body = ''): string[] =>
  [...new Set((body.match(/\{\{(\w+)\}\}/g) ?? []).map(m => m.replace(/[{}]/g, '')))];

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {labels.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              background: i < step ? 'var(--primary)' : i === step ? 'var(--primary-soft)' : 'var(--bg-muted)',
              color: i < step ? '#fff' : i === step ? 'var(--primary)' : 'var(--fg-muted)',
              border: i === step ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              {i < step ? <Check size={13} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: i === step ? 'var(--primary)' : 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < step ? 'var(--primary)' : 'var(--border)', margin: '0 4px', marginBottom: 16 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Variable badge ────────────────────────────────────────────────────────────

function VarBadge({ name }: { name: string }) {
  return (
    <code style={{
      fontSize: 11, padding: '2px 7px', borderRadius: 5,
      background: '#f0f9ff', color: '#0369a1',
      border: '1px solid #bae6fd', fontFamily: 'monospace',
    }}>
      {`{{${name}}}`}
    </code>
  );
}

// ── Inline editor toolbar ────────────────────────────────────────────────────

function EditorToolbar({ onEdit, onOriginal, onPrint, modified }: {
  onEdit: (cmd: string, val?: string) => void;
  onOriginal: () => void;
  onPrint: () => void;
  modified: boolean;
}) {
  const btn = (onClick: () => void, icon: React.ReactNode, title: string, active = false) => (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{
        background: active ? 'var(--primary-soft)' : 'none',
        border: '1px solid transparent', borderRadius: 5,
        padding: '4px 7px', cursor: 'pointer',
        color: active ? 'var(--primary)' : 'var(--fg-muted)',
        display: 'flex', alignItems: 'center',
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
    >
      {icon}
    </button>
  );

  const sep = <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      padding: '6px 12px', background: 'var(--bg-elev)',
      border: '1px solid var(--border)', borderRadius: '8px 8px 0 0',
      borderBottom: 'none', flexWrap: 'wrap',
    }}>
      {btn(() => onEdit('bold'),      <Bold size={13} />,        'Gras (Ctrl+B)')}
      {btn(() => onEdit('italic'),    <Italic size={13} />,      'Italique (Ctrl+I)')}
      {btn(() => onEdit('underline'), <Underline size={13} />,   'Souligné (Ctrl+U)')}
      {sep}
      {btn(() => onEdit('justifyLeft'),   <AlignLeft size={13} />,   'Aligner gauche')}
      {btn(() => onEdit('justifyCenter'), <AlignCenter size={13} />, 'Centrer')}
      {btn(() => onEdit('justifyRight'),  <AlignRight size={13} />,  'Aligner droite')}
      {sep}
      {btn(onOriginal, <RotateCcw size={13} />, 'Annuler les modifications')}
      {btn(onPrint,    <Printer size={13} />,    'Imprimer')}
      {sep}
      <span style={{ fontSize: 11, color: modified ? '#d97706' : 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
        {modified ? <><AlertCircle size={11} /> Modifié</> : <><Check size={11} /> Enregistré</>}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();

  const [step, setStep]               = useState(0);
  const [employeeId, setEmployeeId]   = useState(params.get('employee_id') ?? '');
  const [templateId, setTemplateId]   = useState(params.get('template_id') ?? '');
  const [language, setLanguage]       = useState('fr');
  const [useAI, setUseAI]             = useState(false);
  const [extraVars, setExtraVars]     = useState<Record<string, string>>({});
  const [result, setResult]           = useState<{ id: string; content: string; type: string } | null>(null);
  const [originalContent, setOriginalContent] = useState('');
  const [modified, setModified]       = useState(false);
  const [enhancing, setEnhancing]     = useState(false);
  const [editMode, setEditMode]       = useState(true);

  const editorRef = useRef<HTMLDivElement>(null);

  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees({ limit: 200 }) });
  const { data: tplData } = useQuery({ queryKey: ['templates'],  queryFn: () => listTemplates() });

  const employees = empData?.data ?? [];
  const templates = tplData?.data  ?? [];
  const selectedEmp = employees.find(e => e.id === employeeId);
  const selectedTpl = templates.find(t => t.id === templateId);

  // Variables detected in the chosen template
  const templateVars = extractVars(selectedTpl?.body_template);

  // For each variable: auto-resolved from employee or needs manual input
  const autoFilled: Record<string, string> = {};
  const missing: string[] = [];
  if (selectedEmp) {
    templateVars.forEach(v => {
      const val = resolveVar(v, selectedEmp);
      if (val) autoFilled[v] = val;
      else if (!extraVars[v]) missing.push(v);
    });
  }

  // ── Initialize editor when result arrives ──────────────────────────────────
  useEffect(() => {
    if (result?.content && editorRef.current) {
      editorRef.current.innerHTML = result.content;
      setOriginalContent(result.content);
      setModified(false);
    }
  }, [result]);

  // ── Generation ─────────────────────────────────────────────────────────────
  const genMut = useMutation({
    mutationFn: () => generateDocument({
      employee_id: employeeId,
      template_id: templateId,
      language,
      use_ai_enhancement: useAI,
      extra_variables: extraVars,
    }),
    onSuccess: data => {
      setResult({ id: data.document.id, content: data.content, type: data.document.document_type });
      setStep(3);
      toast.success('Document généré !');
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erreur de génération'),
  });

  // ── AI enhance ─────────────────────────────────────────────────────────────
  const handleEnhance = async () => {
    if (!result) return;
    setEnhancing(true);
    try {
      const current = editorRef.current?.innerHTML || result.content;
      const res = await aiEnhance({
        document_content: current,
        document_type: result.type,
        language,
        instructions: 'Améliorer la clarté et le professionnalisme',
      });
      if (editorRef.current) {
        editorRef.current.innerHTML = res.enhanced_content;
        setModified(true);
      }
      toast.success('Document amélioré par IA');
    } catch {
      toast.error('Amélioration IA échouée');
    } finally {
      setEnhancing(false);
    }
  };

  // ── Editor commands ─────────────────────────────────────────────────────────
  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    setModified(true);
  };

  const resetToOriginal = () => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = originalContent;
    setModified(false);
    toast.success('Document restauré');
  };

  const handlePrint = () => {
    const content = editorRef.current?.innerHTML || '';
    const title = result?.document_type ?? 'Document';
    const w = window.open('', '_blank')!;
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>` +
      `<style>` +
      `@page{size:A4;margin:2.5cm 2.8cm;}` +
      `body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.8;margin:0;color:#1a1a1a;}` +
      `img{max-width:100%;height:auto;}` +
      `h1,h2,h3{text-align:center;}p{margin:4px 0;}` +
      `</style></head><body>${content}</body></html>`
    );
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 350);
  };

  const STEPS = ['Employé', 'Template', 'Variables', 'Résultat'];

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960, margin: '0 auto' }}>
      <PageHeader title="Générer un document" subtitle="Créez des documents RH en quelques clics." />

      <StepIndicator step={step} labels={STEPS} />

      {/* ── STEP 0: Select employee ── */}
      {step === 0 && (
        <Card>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Sélectionner un employé</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
            Choisissez l'employé pour lequel le document sera généré.
          </p>
          {employees.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginBottom: 20 }}>
              {employees.slice(0, 24).map(emp => (
                <div key={emp.id} onClick={() => setEmployeeId(emp.id)}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: employeeId === emp.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: employeeId === emp.id ? 'var(--primary-soft)' : 'var(--bg-elev)',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                  }}>
                  <Avatar name={emp.full_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{emp.full_name}</p>
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>{emp.position || emp.department || emp.cin || '—'}</p>
                  </div>
                  {employeeId === emp.id && <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button disabled={!employeeId} onClick={() => setStep(1)}>
              Suivant <ChevronRight size={14} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 1: Select template ── */}
      {step === 1 && (
        <Card>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Sélectionner un template</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>Choisissez le type de document à générer.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 20 }}>
            {templates.map(tpl => {
              const vars = extractVars(tpl.body_template);
              return (
                <div key={tpl.id} onClick={() => setTemplateId(tpl.id)}
                  style={{
                    padding: '14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: templateId === tpl.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: templateId === tpl.id ? 'var(--primary-soft)' : 'var(--bg-elev)',
                    transition: 'all 0.15s',
                  }}>
                  <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{tpl.name_fr}</p>
                  {tpl.name_en && tpl.name_en !== tpl.name_fr && (
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 6 }}>{tpl.name_en}</p>
                  )}
                  <Badge>{tpl.category}</Badge>
                  {vars.length > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>
                      {vars.length} variable{vars.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setStep(0)}>Retour</Button>
            <Button disabled={!templateId} onClick={() => setStep(2)}>
              Suivant <ChevronRight size={14} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Variables + Options ── */}
      {step === 2 && selectedEmp && selectedTpl && (
        <Card>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Variables &amp; Options</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
            Vérifiez les données auto-remplies et complétez les champs manquants.
          </p>

          {/* Summary */}
          <div style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', borderLeft: '3px solid var(--primary)' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 2px' }}>Employé</p>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{selectedEmp.full_name}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 2px' }}>Template</p>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{selectedTpl.name_fr}</p>
            </div>
          </div>

          {/* Variables */}
          {templateVars.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--fg)' }}>
                Variables du template ({templateVars.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templateVars.map(v => {
                  const auto = autoFilled[v];
                  const current = extraVars[v] ?? auto ?? '';
                  const isAuto = !!auto && current === auto;
                  const opts = selectedEmp ? empOptions(selectedEmp) : [];
                  return (
                    <div key={v} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8,
                      background: isAuto ? '#f0fdf4' : current ? '#fffbeb' : 'var(--bg-muted)',
                      border: `1px solid ${isAuto ? '#bbf7d0' : current ? '#fde68a' : 'var(--border)'}`,
                    }}>
                      <VarBadge name={v} />
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isAuto && <CheckCircle2 size={13} style={{ color: '#16a34a', flexShrink: 0 }} />}
                        <select
                          value={current}
                          onChange={e => setExtraVars(ev => ({ ...ev, [v]: e.target.value }))}
                          style={{
                            flex: 1, padding: '5px 10px', fontSize: 13,
                            border: `1px solid ${isAuto ? '#86efac' : current ? '#fdba74' : 'var(--border)'}`,
                            borderRadius: 6,
                            background: isAuto ? '#f0fdf4' : current ? '#fff7ed' : '#fff',
                            color: isAuto ? '#15803d' : current ? '#92400e' : 'var(--fg)',
                            fontWeight: 500, cursor: 'pointer', outline: 'none',
                          }}
                        >
                          {!auto && <option value="">— choisir —</option>}
                          {opts.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
              {missing.length > 0 && (
                <p style={{ fontSize: 12, color: '#b45309', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertCircle size={13} />
                  {missing.length} champ{missing.length > 1 ? 's' : ''} manquant{missing.length > 1 ? 's' : ''} — le document peut être incomplet.
                </p>
              )}
            </div>
          )}

          {/* Language + AI */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}>Langue</label>
              <select className="select" value={language} onChange={e => setLanguage(e.target.value)}>
                {LANG_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)} />
                <Sparkles size={13} style={{ color: '#7c3aed' }} />
                Amélioration IA (Claude)
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
            <Button loading={genMut.isPending} onClick={() => genMut.mutate()}>
              <Wand2 size={14} /> Générer le document
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Result with inline editor ── */}
      {step === 3 && result && (
        <div>
          {/* Status bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, padding: '12px 18px',
            background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={15} style={{ color: '#16a34a' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Document généré</p>
                <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
                  {result.type} · {LANG_OPTIONS.find(l => l.value === language)?.label}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="ghost" size="sm" onClick={handleEnhance} loading={enhancing}>
                <Sparkles size={13} /> IA
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => setEditMode(e => !e)}
              >
                {editMode ? <><EyeOff size={13} /> Lecture</> : <><Eye size={13} /> Éditer</>}
              </Button>
              <Button variant="soft" size="sm" onClick={handlePrint}>
                <Download size={13} /> PDF
              </Button>
              <Button variant="soft" size="sm" onClick={() => downloadDoc(result.id, 'docx', `${result.document_type ?? 'document'}.docx`).catch(e => toast.error(e.message))}>
                <Download size={13} /> DOCX
              </Button>
            </div>
          </div>

          {/* Editor toolbar (only in edit mode) */}
          {editMode && (
            <EditorToolbar
              onEdit={execCmd}
              onOriginal={resetToOriginal}
              onPrint={handlePrint}
              modified={modified}
            />
          )}

          {/* Document preview / editor */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: editMode ? '0 0 10px 10px' : 10,
            background: '#e5e7eb',
            padding: 20,
            maxHeight: 620,
            overflowY: 'auto',
          }} className="scroll">
            <div
              ref={editorRef}
              contentEditable={editMode}
              suppressContentEditableWarning
              onInput={() => setModified(true)}
              style={{
                outline: editMode ? '2px dashed var(--primary)' : 'none',
                minHeight: 400,
                cursor: editMode ? 'text' : 'default',
              }}
              // Initial render (before ref effect kicks in)
              dangerouslySetInnerHTML={result ? undefined : { __html: '' }}
            />
          </div>

          {editMode && (
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6, textAlign: 'center' }}>
              Cliquez dans le document pour modifier · Utilisez la barre d'outils pour la mise en forme
            </p>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 14 }}>
            <Button variant="ghost" onClick={() => { setStep(0); setResult(null); setModified(false); setExtraVars({}); }}>
              ← Nouveau document
            </Button>
            <Button onClick={() => navigate('/app/history')}>
              Voir l'historique →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
