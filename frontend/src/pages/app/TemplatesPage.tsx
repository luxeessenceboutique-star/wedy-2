import { useEffect, useRef, useState, type ChangeEvent, type ComponentType, type FormEvent, type MouseEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, FileUp, GraduationCap, Upload, Users, UsersRound } from 'lucide-react';
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
  importTemplateFromPdf, seedDefaultTemplates, listDocuments, getApiError,
} from '@/services/api';
import type { Template } from '@/services/api';
import { Modal, Spinner } from '@/components/ui';
import { useNotify } from '@/lib/notify';
import { useLang, type TKey } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { tf } from '@/lib/format';
import { initialsOf } from '@/lib/visual';
import { TemplatesView } from './TemplatesView';

type Cat = 'attestation' | 'contrat' | 'lettre' | 'avenant' | 'autre';
type Target = 'employee' | 'intern' | 'both';

// [label key, tint, text color] — exact values of the reference
const CAT: Record<Cat, [TKey, string, string]> = {
  attestation: ['tpl_attestation', '#e1f5ec', '#0f6f49'],
  contrat: ['tpl_contrat', '#e4f2f4', '#0b5f72'],
  lettre: ['tpl_lettre', '#fbefda', '#8a5207'],
  avenant: ['tpl_avenant', '#ece9fb', '#5444b8'],
  autre: ['tpl_autre', '#eef2f4', '#33474f'],
};
const catOf = (c?: string): Cat => (c && c in CAT ? (c as Cat) : 'autre');
const TG: Record<Target, [TKey, ComponentType<{ size?: number; style?: React.CSSProperties }>]> = {
  employee: ['tpl_employe', Users], intern: ['tpl_stagiaire', GraduationCap], both: ['tpl_les_deux', UsersRound],
};
const targetOf = (x?: string): Target => (x === 'intern' || x === 'both' ? x : 'employee');

// Variables filled from the employee folder at generation time (same keys as the generator)
const VARS: [string, TKey][] = [
  ['full_name', 'tpl_v_full_name'], ['cin', 'tpl_v_cin'], ['position', 'tpl_v_position'], ['department', 'tpl_v_department'],
  ['hire_date', 'tpl_v_hire_date'], ['contract_start', 'tpl_v_contract_start'], ['contract_end', 'tpl_v_contract_end'],
  ['contract_type', 'tpl_v_contract_type'], ['salary', 'tpl_v_salary'], ['email', 'tpl_v_email'], ['phone', 'tpl_v_phone'],
  ['address', 'tpl_v_address'], ['city', 'tpl_v_city'], ['matricule', 'tpl_v_matricule'], ['manager', 'tpl_v_manager'],
  ['today', 'tpl_v_today'], ['nationality', 'tpl_v_nationality'],
];

// ── stored body ⇄ editor HTML ───────────────────────────────────────────────
const CHIP = "display:inline-block;padding:0 6px;margin:0 1px;border-radius:6px;background:#e4f2f4;color:#0b5f72;font-family:'Geist Mono',monospace;font-size:.82em;font-weight:600;line-height:1.6;white-space:nowrap";
const chip = (v: string) => `<span contenteditable="false" data-var="${v}" style="${CHIP}">{{${v}}}</span>`;
const varsIn = (s: string) => [...new Set((s.match(/\{\{(\w+)\}\}/g) || []).map(m => m.slice(2, -2)))];
const isImageTemplate = (html: string) => html.includes('<img ') && html.includes('data:image');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** PDF-extracted HTML is absolutely positioned: make it normal flow so it can be edited. */
function normalizeForEditing(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll<HTMLElement>('*').forEach(el => {
    if (['absolute', 'relative', 'fixed'].includes(el.style.position)) {
      el.style.position = ''; el.style.top = ''; el.style.left = ''; el.style.right = ''; el.style.bottom = '';
      if (el.tagName !== 'IMG') { el.style.width = ''; el.style.height = ''; }
    }
    if (el.style.whiteSpace === 'pre') el.style.whiteSpace = '';
  });
  return div.innerHTML;
}
function toEditorHTML(body: string): string {
  if (!body.trim()) return '';
  if (isImageTemplate(body)) return body;
  const html = /<[a-z][\s\S]*>/i.test(body)
    ? normalizeForEditing(body)
    : body.split(/\n\s*\n/).map(p => `<p style="margin:0 0 14px">${esc(p)}</p>`).join('');
  return html.replace(/\{\{(\w+)\}\}/g, (_, v) => chip(v));
}
function fromEditorHTML(html: string): string {
  if (isImageTemplate(html)) return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('[data-var]').forEach(el => el.replaceWith(`{{${el.getAttribute('data-var') ?? ''}}}`));
  return div.innerHTML;
}
const langsOf = (tp: Template) => {
  const out = ['FR'];
  if (tp.name_ar && tp.name_ar !== tp.name_fr) out.push('AR');
  if (tp.name_en && tp.name_en !== tp.name_fr) out.push('EN');
  return out.map(l => ({ t: l }));
};
const generateLink = (id: string) => `/app/generate?template_id=${encodeURIComponent(id)}`;

type Run = (e?: MouseEvent) => void;
export type TemplatesVals = {
  q: string; onQ: (e: ChangeEvent<HTMLInputElement>) => void;
  cats: { label: string; n: number; go: () => void; bg: string; color: string; border: string }[];
  targets: { label: string; on: boolean; color: string; go: () => void }[];
  tpls: {
    fr: string; en: string; cat: string; tint: string; color: string; target: string;
    tIcon: ComponentType<{ size?: number; style?: React.CSSProperties }>;
    langs: { t: string }[]; nvars: number; used: number; delay: string; preview: () => void; edit: () => void; generate: string;
  }[];
  loading: boolean; noTpls: boolean; noneAtAll: boolean;
  seed: () => void; seeding: boolean; openImport: () => void; addOpen: boolean; toggleAdd: () => void;
  company: string; companyInitials: string; companyAddress: string;
  previewOpen: boolean; closePreview: () => void;
  pv: { fr: string; upper: string; cat: string; tint: string; color: string; langs: { t: string }[]; nvars: number; edit: () => void; remove: () => void; generate: string };
  editorOpen: boolean; editorTitle: string; closeEditor: () => void; newTpl: () => void;
  eName: string; onEName: (e: ChangeEvent<HTMLInputElement>) => void;
  eNameEn: string; onENameEn: (e: ChangeEvent<HTMLInputElement>) => void;
  eCat: string; onECat: (e: ChangeEvent<HTMLSelectElement>) => void;
  eTarget: string; onETarget: (e: ChangeEvent<HTMLSelectElement>) => void;
  eUpper: string;
  tools: { label: string; title: string; weight: string; italic: string; deco: string; gap: string; font: string; run: Run }[];
  onEdit: () => void; detLabel: string; dirtyDot: string;
  evars: { code: string; label: string; used: boolean; bg: string; insert: Run }[];
  save: () => void; saving: boolean;
};

export default function TemplatesPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const notify = useNotify();
  const { user } = useAuth();

  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | Cat>('all');
  const [target, setTarget] = useState<'all' | 'employee' | 'intern'>('all');
  const [preview, setPreview] = useState<string | null>(null);
  const [editor, setEditor] = useState<string | null>(null); // template id, 'new' or null
  const [edKey, setEdKey] = useState(0);
  const [eName, setEName] = useState('');
  const [eNameEn, setENameEn] = useState('');
  const [eCat, setECat] = useState<Cat>('attestation');
  const [eTarget, setETarget] = useState<Target>('employee');
  const [detected, setDetected] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const edRef = useRef<HTMLDivElement | null>(null);
  const pvRef = useRef<HTMLDivElement | null>(null);
  const detectTimer = useRef<number | undefined>(undefined);

  const { data, isLoading } = useQuery({ queryKey: ['templates'], queryFn: () => listTemplates({ active_only: false }) });
  const all = data?.data ?? [];
  // how many times each template was used = generated documents that point to it
  const { data: docs } = useQuery({ queryKey: ['documents', 'template-usage'], queryFn: () => listDocuments({ limit: 1000 }) });
  const usage = (docs?.data ?? []).reduce<Record<string, number>>((m, d) => { if (d.template_id) m[d.template_id] = (m[d.template_id] ?? 0) + 1; return m; }, {});

  const invalidate = () => qc.invalidateQueries({ queryKey: ['templates'] });
  const createMut = useMutation({ mutationFn: createTemplate });
  const updateMut = useMutation({ mutationFn: ({ id, body }: { id: string; body: Partial<Template> & { variables?: string[] } }) => updateTemplate(id, body) });
  const deleteMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => { invalidate(); notify.success(t('tpl_deleted')); },
    onError: (e: unknown) => notify.error(getApiError(e, t('tpl_delete_error'))),
  });
  const seedMut = useMutation({
    mutationFn: seedDefaultTemplates,
    onSuccess: res => {
      invalidate();
      notify.success(tf(t('tpl_seeded'), { n: res.created.length }), res.skipped.length ? { description: tf(t('tpl_seeded_skipped'), { n: res.skipped.length }) } : undefined);
    },
    onError: (e: unknown) => notify.error(getApiError(e, t('tpl_seed_error'))),
  });

  const editing = editor && editor !== 'new' ? all.find(x => x.id === editor) : undefined;
  const previewing = preview ? all.find(x => x.id === preview) : undefined;

  const detect = () => { const ed = edRef.current; if (ed) setDetected(varsIn(ed.innerText || '')); };

  // fill the editor / the preview imperatively (contentEditable must not be re-rendered by React)
  useEffect(() => {
    const ed = edRef.current;
    if (!ed || !editor) return;
    ed.innerHTML = editing?.body_template ? toEditorHTML(editing.body_template) : `<p style="margin:0 0 14px">${esc(t('tpl_editor_placeholder'))}</p>`;
    detect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edKey]);
  useEffect(() => {
    const pv = pvRef.current;
    if (pv && previewing) pv.innerHTML = previewing.body_template ? toEditorHTML(previewing.body_template) : `<p style="color:#7d8f97;font-style:italic;text-align:center">${esc(t('tpl_no_content'))}</p>`;
  }, [previewing, t]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && preview) setPreview(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const openEditor = (tp?: Template) => {
    setEditor(tp ? tp.id : 'new');
    setEdKey(k => k + 1);
    setPreview(null);
    setEName(tp?.name_fr ?? '');
    setENameEn(tp?.name_en && tp.name_en !== tp.name_fr ? tp.name_en : '');
    setECat(catOf(tp?.category));
    setETarget(targetOf(tp?.target_type));
    setDirty(false);
  };

  const exec = (cmd: string, arg?: string): Run => e => {
    e?.preventDefault();
    const ed = edRef.current;
    if (ed && !ed.contains(document.activeElement)) ed.focus();
    try { document.execCommand(cmd, false, arg); } catch { /* unsupported command */ }
    setDirty(true); detect();
  };
  const insert = (v: string) => {
    const ed = edRef.current; if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    if (sel && (!sel.rangeCount || !ed.contains(sel.anchorNode))) {
      const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
    }
    try { document.execCommand('insertHTML', false, chip(v) + '&nbsp;'); } catch { /* unsupported command */ }
    setDirty(true); detect();
  };

  const save = async () => {
    const ed = edRef.current;
    if (!eName.trim()) { notify.error(t('tpl_name_required')); return; }
    const body = ed ? fromEditorHTML(ed.innerHTML) : '';
    const text = ed?.innerText.trim() ?? '';
    if (!text && !isImageTemplate(body)) { notify.error(t('tpl_content_required')); return; }
    const vars = varsIn(ed ? ed.innerText : '');
    const fr = eName.trim(), en = eNameEn.trim() || fr;
    try {
      if (editor === 'new') {
        const code = fr.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 50);
        await createMut.mutateAsync({ code, name_fr: fr, name_en: en, name_ar: fr, category: eCat, body_template: body, variables: vars, is_active: true, ...({ target_type: eTarget } as object) });
        setCat('all'); setTarget('all'); setQ('');
      } else if (editor) {
        await updateMut.mutateAsync({ id: editor, body: { name_fr: fr, name_en: en, category: eCat, target_type: eTarget, body_template: body, variables: vars } });
      }
      invalidate();
      setEditor(null);
      notify.success(tf(t('tpl_saved'), { name: fr, n: vars.length }));
    } catch (e) {
      notify.error(getApiError(e, t('tpl_save_error')));
    }
  };

  const remove = (tp: Template) => {
    if (!window.confirm(tf(t('tpl_confirm_delete'), { name: tp.name_fr }))) return;
    setPreview(null);
    deleteMut.mutate(tp.id);
  };

  // ── derived values (the reference's renderVals) ──
  const needle = q.trim().toLowerCase();
  const base = all.filter(x => {
    const tg = targetOf(x.target_type);
    return (target === 'all' || tg === target || tg === 'both') && (!needle || `${x.name_fr} ${x.name_en ?? ''}`.toLowerCase().includes(needle));
  });
  const list = base.filter(x => cat === 'all' || catOf(x.category) === cat);
  const company = typeof user?.profile?.company === 'string' && user.profile.company ? user.profile.company : t('tpl_company_fallback');
  const companyAddress = typeof user?.profile?.company_address === 'string' ? user.profile.company_address : '';
  const toolDefs: [string, string, string | undefined, TKey, number, string?, string?, number?][] = [
    ['B', 'bold', undefined, 'tpl_tool_bold', 800], ['I', 'italic', undefined, 'tpl_tool_italic', 600, 'italic'],
    ['U', 'underline', undefined, 'tpl_tool_underline', 600, 'normal', 'underline', 10],
    ['H1', 'formatBlock', 'h2', 'tpl_tool_title', 800], ['H2', 'formatBlock', 'h3', 'tpl_tool_subtitle', 700],
    ['¶', 'formatBlock', 'p', 'tpl_tool_paragraph', 600, 'normal', 'none', 10], ['•', 'insertUnorderedList', undefined, 'tpl_tool_list', 800, 'normal', 'none', 10],
    ['↶', 'undo', undefined, 'tpl_tool_undo', 600], ['↷', 'redo', undefined, 'tpl_tool_redo', 600],
  ];
  const pvCat = previewing ? CAT[catOf(previewing.category)] : CAT.autre;

  const v: TemplatesVals = {
    q, onQ: e => setQ(e.target.value),
    cats: (['all', ...Object.keys(CAT)] as ('all' | Cat)[]).map(k => ({
      label: k === 'all' ? t('tpl_all') : t(CAT[k][0]),
      n: k === 'all' ? base.length : base.filter(x => catOf(x.category) === k).length,
      go: () => setCat(k),
      bg: cat === k ? '#0a1c24' : '#ffffff', color: cat === k ? '#ffffff' : '#33474f', border: cat === k ? '#0a1c24' : '#e2e8eb',
    })),
    targets: ([['all', 'tpl_all'], ['employee', 'tpl_employees'], ['intern', 'tpl_interns']] as const).map(([k, label]) => ({
      label: t(label), on: target === k, color: target === k ? '#ffffff' : '#52646d', go: () => setTarget(k),
    })),
    tpls: list.map((x, i) => {
      const c = CAT[catOf(x.category)], tg = TG[targetOf(x.target_type)];
      return {
        fr: x.name_fr, en: x.name_en && x.name_en !== x.name_fr ? x.name_en : '', cat: t(c[0]), tint: c[1], color: c[2], target: t(tg[0]), tIcon: tg[1],
        langs: langsOf(x), nvars: varsIn(x.body_template ?? '').length, used: usage[x.id] ?? 0, delay: String(Math.min(i, 12) * 45),
        preview: () => setPreview(x.id), edit: () => openEditor(x), generate: generateLink(x.id),
      };
    }),
    loading: isLoading, noTpls: !isLoading && list.length === 0, noneAtAll: all.length === 0,
    seed: () => { setAddOpen(false); seedMut.mutate(); }, seeding: seedMut.isPending, openImport: () => { setAddOpen(false); setImportOpen(true); },
    addOpen, toggleAdd: () => setAddOpen(o => !o),
    company, companyInitials: initialsOf(company), companyAddress,
    previewOpen: !!previewing, closePreview: () => setPreview(null),
    pv: {
      fr: previewing?.name_fr ?? '', upper: (previewing?.name_fr ?? '').toUpperCase(), cat: t(pvCat[0]), tint: pvCat[1], color: pvCat[2],
      langs: previewing ? langsOf(previewing) : [], nvars: varsIn(previewing?.body_template ?? '').length,
      edit: () => previewing && openEditor(previewing), remove: () => previewing && remove(previewing), generate: generateLink(previewing?.id ?? ''),
    },
    editorOpen: !!editor, editorTitle: editor === 'new' ? t('tpl_nouveau_modele') : t('tpl_edit_title'),
    closeEditor: () => { if (!dirty || window.confirm(t('tpl_discard'))) setEditor(null); }, newTpl: () => openEditor(),
    eName, onEName: e => { setEName(e.target.value); setDirty(true); },
    eNameEn, onENameEn: e => { setENameEn(e.target.value); setDirty(true); },
    eCat, onECat: e => { setECat(catOf(e.target.value)); setDirty(true); },
    eTarget, onETarget: e => { setETarget(targetOf(e.target.value)); setDirty(true); },
    eUpper: (eName || t('tpl_nouveau_modele')).toUpperCase(),
    tools: toolDefs.map(([label, cmd, arg, title, weight, italic, deco, gap]) => ({
      label, title: t(title), weight: String(weight), italic: italic || 'normal', deco: deco || 'none', gap: gap ? `${gap}px` : '0',
      font: label.length > 1 ? "'Geist Mono',monospace" : 'inherit', run: exec(cmd, arg),
    })),
    onEdit: () => { if (!dirty) setDirty(true); window.clearTimeout(detectTimer.current); detectTimer.current = window.setTimeout(detect, 120); },
    detLabel: tf(t(detected.length > 1 ? 'tpl_det_many' : 'tpl_det_one'), { n: detected.length, state: t(dirty ? 'tpl_unsaved' : 'tpl_up_to_date') }),
    dirtyDot: dirty ? '#df9326' : '#16a06b',
    evars: VARS.map(([k, label]) => {
      const used = detected.includes(k);
      return { code: `{{${k}}}`, label: t(label), used, bg: used ? '#f3fafb' : 'transparent', insert: (e?: MouseEvent) => { e?.preventDefault(); insert(k); } };
    }),
    save, saving: createMut.isPending || updateMut.isPending,
  };

  return (
    <>
      <TemplatesView v={v} edRef={edRef} pvRef={pvRef} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={invalidate} />
    </>
  );
}

// ── Import a PDF / DOCX as a template ─────────────────────────────────────────
const inputStyle: React.CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };

function ImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Cat>('attestation');
  const [targetType, setTargetType] = useState<Target>('employee');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => { if (loading) return; setFile(null); setName(''); onClose(); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) { notify.error(t('tpl_import_required')); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('name_fr', name.trim()); fd.append('name_en', name.trim());
      fd.append('category', category); fd.append('target_type', targetType);
      await importTemplateFromPdf(fd);
      notify.success(t('tpl_imported'));
      onImported();
      setLoading(false);
      setFile(null); setName(''); onClose();
    } catch (err) {
      notify.error(getApiError(err, t('tpl_import_error')));
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={t('tpl_import_title')} subtitle={t('tpl_import_sub')} icon={<FileUp size={17} />} width={500}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={close}>{t('cancel')}</button>
        <button type="submit" form="tpl-import" className="btn btn-primary" disabled={!file || loading}>
          {loading ? <Spinner size={14} color="#fff" /> : <Upload size={14} />} {t('tpl_import')}
        </button>
      </>}>
      <form id="tpl-import" onSubmit={submit} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
          style={{ border: `1.5px dashed ${file ? '#16b6c8' : '#d0dadf'}`, borderRadius: 14, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: file ? '#f3fafb' : '#f8fafb', transition: 'all .2s' }}
        >
          <span style={{ width: 40, height: 40, borderRadius: 12, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }}><FileText size={19} /></span>
          <div style={{ fontSize: 14, fontWeight: 600, color: file ? '#0b5f72' : '#0a1c24' }}>{file ? file.name : t('tpl_import_drop')}</div>
          <div style={{ fontSize: 12.5, color: '#5f7079', marginTop: 3 }}>{file ? t('tpl_import_change') : t('tpl_import_formats')}</div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
        </div>
        <div>
          <label style={labelStyle}>{t('tpl_import_name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder={t('tpl_import_name_ph')} style={inputStyle} className="tpl-f5" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('tpl_import_cat')}</label>
            <select value={category} onChange={e => setCategory(catOf(e.target.value))} style={inputStyle}>
              {(Object.keys(CAT) as Cat[]).map(c => <option key={c} value={c}>{t(CAT[c][0])}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('tpl_import_for')}</label>
            <select value={targetType} onChange={e => setTargetType(targetOf(e.target.value))} style={inputStyle}>
              {(Object.keys(TG) as Target[]).map(k => <option key={k} value={k}>{t(TG[k][0])}</option>)}
            </select>
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 12, background: '#f3f6f7', fontSize: 12.5, color: '#52646d', lineHeight: 1.55 }}>{t('tpl_import_hint')}</div>
      </form>
    </Modal>
  );
}
