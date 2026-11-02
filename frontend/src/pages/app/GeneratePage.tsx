// Redesigned from design_handoff_wedy/design/Wedy Generate.dc.html.
// Reuses the existing real wiring (listEmployees/listInterns/listTemplates/generateDocument/downloadDoc)
// from the pre-redesign page; only the UI layer changed to the new 4-step wizard + styled paper result.
import { useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, CircleCheck, Download, FileText, GraduationCap,
  History, Pencil, Plus, Search, Send, Sparkles, Users, WandSparkles,
} from 'lucide-react';
import { RV } from '@/components/motion';
import {
  listEmployees, listInterns, listTemplates, generateDocument, downloadDoc, sendForSignature,
  getApiError, type Employee, type Template,
} from '@/services/api';
import { Spinner } from '@/components/ui';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { toast } from 'sonner';
import { useLang, type TKey } from '@/lib/lang';
import { tf } from '@/lib/format';
import './GeneratePage.css';

const CAT_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  attestation: { label: 'Attestation', bg: '#e1f5ec', color: '#0f6f49' },
  contrat: { label: 'Contrat', bg: '#e4f2f4', color: '#0b5f72' },
  lettre: { label: 'Lettre', bg: '#fbefda', color: '#8a5207' },
  avenant: { label: 'Avenant', bg: '#ece9fb', color: '#5444b8' },
  autre: { label: 'Autre', bg: '#f3f6f7', color: '#52646d' },
};
const VAR_LABEL_KEYS: Record<string, TKey> = {
  full_name: 'full_name_label', cin: 'gen_cin', email: 'gen_email', phone: 'phone_label',
  address: 'address', city: 'city', nationality: 'nationality_label', position: 'position_label',
  department: 'department_label', manager: 'manager_label', matricule: 'emp_matricule',
  contract_type: 'contract_type_label', hire_date: 'hire_date_label', contract_start: 'contract_start_label',
  contract_end: 'contract_end_label', internship_start: 'intern_start', internship_end: 'intern_end',
  salary: 'salary_label', today: 'gen_today_label', company: 'company',
};
const LANGS = [
  { k: 'fr', label: 'Français' }, { k: 'ar', label: 'العربية' }, { k: 'en', label: 'English' },
];
const isInternTemplate = (tpl: Template) => {
  if (tpl.target_type === 'intern') return true;
  if (tpl.target_type === 'both' || tpl.target_type === 'employee') return false;
  return ['stage', 'stagiaire', 'convention'].some(kw => tpl.name_fr.toLowerCase().includes(kw) || (tpl.name_en ?? '').toLowerCase().includes(kw));
};
const isEmployeeTemplate = (tpl: Template) => tpl.target_type === 'both' || !isInternTemplate(tpl);
const extractVars = (body = ''): string[] => [...new Set((body.match(/\{\{(\w+)\}\}/g) ?? []).map(m => m.replace(/[{}]/g, '')))];
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '');
const resolveVar = (name: string, emp: Employee): string => {
  const MAP: Record<string, () => string> = {
    full_name: () => emp.full_name || '', cin: () => emp.cin || '', email: () => emp.email || '', phone: () => emp.phone || '',
    address: () => emp.address || '', city: () => emp.city || '', nationality: () => emp.nationality || '',
    position: () => emp.position || '', department: () => emp.department || '', manager: () => emp.manager || '',
    matricule: () => emp.matricule || '', contract_type: () => emp.contract_type || '', hire_date: () => fmt(emp.hire_date),
    contract_start: () => fmt(emp.contract_start || emp.hire_date), contract_end: () => (emp.contract_end ? fmt(emp.contract_end) : ''),
    internship_start: () => fmt(emp.internship_start), internship_end: () => (emp.internship_end ? fmt(emp.internship_end) : ''),
    salary: () => (emp.salary ? `${Number(emp.salary).toLocaleString()} MAD` : ''), today: () => new Date().toLocaleDateString(), company: () => 'Tython SARL',
  };
  return MAP[name]?.() ?? '';
};

type Step = 0 | 1 | 2 | 3;

export default function GeneratePage() {
  const { t } = useLang();
  const [params] = useSearchParams();

  const [step, setStep] = useState<Step>(0);
  const [personType, setPersonType] = useState<'employee' | 'intern'>('employee');
  const [q, setQ] = useState('');
  const [employeeId, setEmployeeId] = useState(params.get('employee_id') ?? '');
  const [templateId, setTemplateId] = useState(params.get('template_id') ?? '');
  const [tplCategory, setTplCategory] = useState('');
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState('fr');
  const [useAI, setUseAI] = useState(true);
  const [result, setResult] = useState<{ id: string; content: string; document_type: string; byAi: boolean; lang: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState('');
  const [modified, setModified] = useState(false);

  const editorStartRef = useRef('');

  const { data: empData } = useQuery({ queryKey: ['employees', 'active'], queryFn: () => listEmployees({ limit: 500, status: 'active' }) });
  const { data: internData } = useQuery({ queryKey: ['interns'], queryFn: () => listInterns({ limit: 500 }) });
  const { data: tplData } = useQuery({ queryKey: ['templates'], queryFn: () => listTemplates() });

  const employees = empData?.data ?? [];
  const interns = internData?.data ?? [];
  const templates = tplData?.data ?? [];
  const persons = personType === 'intern' ? interns : employees;
  const person = [...employees, ...interns].find(e => e.id === employeeId);
  const tpl = templates.find(x => x.id === templateId);

  const genMut = useMutation({
    mutationFn: () => generateDocument({ employee_id: employeeId, template_id: templateId, language, use_ai_enhancement: useAI, extra_variables: extraVars }),
    onSuccess: data => {
      setResult({ id: data.document.id, content: data.content, document_type: data.document.document_type, byAi: data.ai_enhanced, lang: language });
      setBody(data.content);
      editorStartRef.current = data.content;
      setEditing(false); setModified(false); setStep(3);
      toast.success(tf(t('gen_toast_done'), { tpl: data.document.document_type, name: person?.full_name ?? '' }));
    },
    onError: (e: unknown) => toast.error(getApiError(e, t('gen_err'))),
  });

  const templateVars = tpl ? extractVars(tpl.body_template) : [];
  const vars = templateVars.map(v => {
    const auto = person ? resolveVar(v, person) : '';
    const value = extraVars[v] ?? auto;
    return { name: v, value, missing: !value.trim(), auto: !!auto && value === auto };
  });
  const missingCount = vars.filter(v => v.missing).length;

  const availableTemplates = templates
    .filter(x => x.is_active !== false)
    .filter(x => !tplCategory || x.category === tplCategory)
    .filter(x => (person ? person.status === 'intern' : personType === 'intern') ? isInternTemplate(x) : isEmployeeTemplate(x));

  const filteredPersons = persons.filter(p => !q.trim() || `${p.full_name} ${p.position ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  const steps: { label: string }[] = [
    { label: t('gen_step_person') }, { label: t('gen_step_template') }, { label: t('gen_step_vars') }, { label: t('gen_step_result') },
  ];
  const stepReachable = (i: number) => i === 0 || (i === 1 && person) || (i === 2 && person && tpl) || (i === 3 && !!result);

  const restart = () => { setStep(0); setTemplateId(''); setResult(null); setExtraVars({}); setBody(''); setEditing(false); setModified(false); };

  const docTitle = (tpl?.[`name_${language}` as 'name_fr'] || tpl?.name_fr || '').toUpperCase();
  // Real templates imported from a scanned PDF are pre-styled HTML (absolutely-positioned text over a
  // background image) — rendering those as plain paragraphs would destroy them. Only templates authored as
  // plain Jinja text (no markup at all) get the letterhead/paragraph treatment below.
  const isRichHtml = /<img|position:\s*absolute/.test(result?.content ?? '');
  const paras = isRichHtml ? [] : (result?.content ?? '').replace(/<[^>]+>/g, m => (m === '<br>' || m === '<br/>' ? '\n' : '')).split(/\n{2,}|\r\n\r\n/).map(p => p.trim()).filter(Boolean);
  const rtl = (result?.lang ?? language) === 'ar';
  const verifCode = result ? result.id.slice(0, 8).toUpperCase() : '';

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1180, width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" className="wy-ph-title">{t('gen_title')}</RV>
          <RV as="p" variant="up" delay={60} className="wy-ph-sub">{t('gen_subtitle')}</RV>
        </div>
        <RV as={Link} variant="up" delay={100} to="/app/history" className="gen-btn-sec" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
          <History size={15} />{t('gen_history')}
        </RV>
      </div>

      {/* ── Stepper ── */}
      <RV variant="up" delay={100} style={{ position: 'relative', padding: '18px 22px', borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
        <div style={{ position: 'absolute', left: 'calc(22px + 12.5% - 11px)', right: 'calc(22px + 12.5% - 11px)', top: 36, height: 3, borderRadius: 3, background: '#eef2f4' }} />
        <div style={{ position: 'absolute', left: 'calc(22px + 12.5% - 11px)', top: 36, height: 3, borderRadius: 3, width: `calc((100% - 44px - 25% + 22px) * ${step / 3})`, background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', transition: 'width .7s cubic-bezier(.2,.8,.2,1)' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
          {steps.map((s, i) => {
            const reach = stepReachable(i);
            return (
              <button key={i} type="button" disabled={!reach} onClick={() => reach && setStep(i as Step)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, border: 'none', background: 'transparent', fontFamily: 'inherit', cursor: reach ? 'pointer' : 'default', padding: 0 }}>
                {i < step ? (
                  <span style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', boxShadow: '0 0 0 5px #ffffff' }}><Check size={17} strokeWidth={2.6} /></span>
                ) : i === step ? (
                  <span style={{ position: 'relative', width: 38, height: 38, boxShadow: '0 0 0 5px #ffffff', borderRadius: '50%' }}>
                    <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #16b6c8' }} />
                    <span style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1c24', color: '#ffffff', fontFamily: "'Geist Mono',monospace", fontSize: 13, fontWeight: 600 }}>{i + 1}</span>
                  </span>
                ) : (
                  <span style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f6f7', border: '1px solid #e2e8eb', color: '#7d8f97', fontFamily: "'Geist Mono',monospace", fontSize: 13, boxShadow: '0 0 0 5px #ffffff' }}>{i + 1}</span>
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: i <= step ? '#0a1c24' : '#7d8f97' }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </RV>

      {/* ── Step 0: person ── */}
      {step === 0 && (
        <RV variant="up" style={{ padding: 22, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: '-.02em' }}>{t('gen_who_title')}</div>
              <div style={{ fontSize: 13.5, color: '#52646d', marginTop: 3 }}>{t('gen_who_sub')}</div>
            </div>
            <div style={{ display: 'flex', padding: 4, borderRadius: 12, background: '#f3f6f7' }}>
              {(['employee', 'intern'] as const).map(k => (
                <button key={k} type="button" onClick={() => { setPersonType(k); setEmployeeId(''); setTemplateId(''); }} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px', border: 'none', borderRadius: 9, background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: personType === k ? '#0a1c24' : '#52646d' }}>
                  {personType === k && <span style={{ position: 'absolute', inset: 0, borderRadius: 9, background: '#ffffff', boxShadow: '0 1px 3px rgba(10,28,36,.14)' }} />}
                  <span style={{ position: 'relative', display: 'inline-flex' }}>{k === 'employee' ? <Users size={15} /> : <GraduationCap size={15} />}</span>
                  <span style={{ position: 'relative' }}>{k === 'employee' ? t('gen_kind_employee') : t('gen_kind_intern')}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', marginTop: -7.5, color: '#7d8f97', pointerEvents: 'none' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('gen_search_ph')} className="gen-input" style={{ width: '100%', height: 42, padding: '0 12px 0 36px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 14, color: '#0a1c24', outline: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 10 }}>
            {filteredPersons.map((p, i) => {
              const on = p.id === employeeId;
              return (
                <RV key={p.id} as="button" variant="up" delay={i * 40} type="button" onClick={() => setEmployeeId(p.id)} className="gen-person" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: 12, borderRadius: 14, border: `1px solid ${on ? '#16b6c8' : '#e2e8eb'}`, background: on ? '#f3fafb' : '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', boxShadow: on ? '0 0 0 3px rgba(22,182,200,.16)' : 'none' }}>
                  <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(p.full_name), color: '#ffffff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{initialsOf(p.full_name)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0a1c24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.full_name}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: '#5f7079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[p.position, p.contract_type].filter(Boolean).join(' · ')}</span>
                  </span>
                  {on && <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e6f84', color: '#ffffff', flexShrink: 0 }}><Check size={13} strokeWidth={3} /></span>}
                </RV>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" disabled={!person} onClick={() => person && setStep(1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: person ? 'pointer' : 'default', opacity: person ? 1 : 0.45, transition: 'opacity .2s' }}>
              {t('gen_choose_template')}<ArrowRight size={16} />
            </button>
          </div>
        </RV>
      )}

      {/* ── Step 1: template ── */}
      {step === 1 && (
        <RV variant="up" style={{ padding: 22, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: '-.02em' }}>{t('gen_which_title')}</div>
              <div style={{ fontSize: 13.5, color: '#52646d', marginTop: 3 }}>{tf(t('gen_which_sub'), { count: availableTemplates.length, name: person?.full_name.split(' ')[0] ?? '' })}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[['', t('all')], ...Object.entries(CAT_STYLE).map(([k, v]) => [k, v.label])].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setTplCategory(k)} style={{ height: 34, padding: '0 12px', borderRadius: 99, border: `1px solid ${tplCategory === k ? '#0a1c24' : '#e2e8eb'}`, background: tplCategory === k ? '#0a1c24' : '#ffffff', color: tplCategory === k ? '#ffffff' : '#33474f', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
            {availableTemplates.map((x, i) => {
              const on = x.id === templateId;
              const cat = CAT_STYLE[x.category] ?? CAT_STYLE.autre;
              const nvars = extractVars(x.body_template).length;
              return (
                <RV key={x.id} as="button" variant="up" delay={i * 50} type="button" onClick={() => setTemplateId(x.id)} className="gen-tpl" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 16, border: `1px solid ${on ? '#16b6c8' : '#e2e8eb'}`, background: on ? '#f3fafb' : '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', boxShadow: on ? '0 0 0 3px rgba(22,182,200,.16)' : 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ width: 40, height: 40, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.bg, color: cat.color }}><FileText size={19} /></span>
                    {on && <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e6f84', color: '#ffffff' }}><Check size={13} strokeWidth={3} /></span>}
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#0a1c24', lineHeight: 1.3 }}>{x.name_fr}</span>
                    {x.name_en && <span style={{ display: 'block', fontSize: 12.5, color: '#5f7079', marginTop: 2 }}>{x.name_en}</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', width: '100%' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cat.bg, color: cat.color }}>{cat.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#7d8f97' }}>{tf(t('gen_nvars'), { n: nvars })}</span>
                  </span>
                </RV>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button type="button" onClick={() => setStep(0)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, padding: '0 16px', borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#33474f', cursor: 'pointer' }}><ArrowLeft size={16} />{t('gen_back')}</button>
            <button type="button" disabled={!tpl} onClick={() => { if (tpl) { setExtraVars({}); setStep(2); } }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: tpl ? 'pointer' : 'default', opacity: tpl ? 1 : 0.45 }}>{t('gen_check_vars')}<ArrowRight size={16} /></button>
          </div>
        </RV>
      )}

      {/* ── Step 2: variables ── */}
      {step === 2 && tpl && person && (
        <RV variant="up" style={{ position: 'relative', overflow: 'hidden', padding: 22, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 14, background: '#f3f6f7' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52646d' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(person.full_name), color: '#ffffff', fontSize: 10.5, fontWeight: 700 }}>{initialsOf(person.full_name)}</span>
              <strong style={{ color: '#0a1c24' }}>{person.full_name}</strong>
            </span>
            <span style={{ color: '#a3b1b7' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#52646d' }}><FileText size={14} color="#0e6f84" /><strong style={{ color: '#0a1c24' }}>{tpl.name_fr}</strong></span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ flex: '1.4 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{tf(t('gen_vars_count'), { n: vars.length })}</span>
                <span style={{ fontSize: 12.5, color: missingCount ? '#8a5207' : '#0f6f49', fontWeight: 600 }}>{missingCount ? tf(t('gen_vars_missing'), { n: missingCount }) : t('gen_vars_complete')}</span>
              </div>
              {vars.map((v, i) => (
                <RV key={v.name} variant="up" delay={i * 40} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, border: `1px solid ${v.missing ? 'rgba(230,169,72,.45)' : '#eef2f4'}`, background: v.missing ? '#fffaf1' : '#ffffff', flexWrap: 'wrap' }}>
                  <code style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11.5, fontWeight: 600, padding: '3px 7px', borderRadius: 7, background: '#e4f2f4', color: '#0b5f72', whiteSpace: 'nowrap' }}>{`{{${v.name}}}`}</code>
                  <span style={{ width: 150, fontSize: 12.5, color: '#52646d' }}>{t(VAR_LABEL_KEYS[v.name] ?? 'gen_var_other')}</span>
                  <input value={v.value} onChange={e => setExtraVars(s => ({ ...s, [v.name]: e.target.value }))} placeholder={t('gen_to_fill')} className="gen-input" style={{ flex: 1, minWidth: 160, height: 36, padding: '0 10px', borderRadius: 9, border: `1px solid ${v.missing ? 'rgba(230,169,72,.7)' : '#d6dfe3'}`, background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' }} />
                  {v.auto ? <CircleCheck size={16} color="#16a06b" /> : v.missing ? <CircleAlert size={16} color="#df9326" /> : null}
                </RV>
              ))}
            </div>
            <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 16, borderRadius: 16, border: '1px solid #e2e8eb' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#33474f' }}>{t('gen_lang_title')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6, marginTop: 10 }}>
                  {LANGS.map(l => {
                    const ok = l.k === 'fr' || useAI;
                    const on = language === l.k;
                    return (
                      <button key={l.k} type="button" disabled={!ok} onClick={() => ok && setLanguage(l.k)} title={ok ? '' : t('gen_lang_locked')} style={{ height: 44, borderRadius: 11, border: `1px solid ${on ? '#0a1c24' : '#d6dfe3'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: l.k === 'ar' ? "'Noto Kufi Arabic',sans-serif" : 'inherit', fontSize: 13.5, fontWeight: 600, cursor: ok ? 'pointer' : 'not-allowed', opacity: ok ? 1 : 0.4 }}>{l.label}</button>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={() => setUseAI(s => !s)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 16, border: `1px solid ${useAI ? 'rgba(109,90,214,.35)' : '#e2e8eb'}`, background: useAI ? '#f4f2fd' : '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ position: 'relative', width: 40, height: 24, borderRadius: 99, background: useAI ? '#6d5ad6' : '#c3ced3', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ position: 'absolute', top: 3, left: useAI ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(10,28,36,.3)', transition: 'left .25s cubic-bezier(.2,.8,.2,1)' }} />
                </span>
                <span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#0a1c24' }}><Sparkles size={14} color="#6d5ad6" />{t('gen_ai_title')}</span>
                  <span style={{ display: 'block', marginTop: 3, fontSize: 12.5, lineHeight: 1.45, color: '#52646d' }}>{t('gen_ai_desc')}</span>
                </span>
              </button>
              <button type="button" disabled={genMut.isPending} onClick={() => genMut.mutate()} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, border: 'none', borderRadius: 14, background: 'linear-gradient(135deg,#5444b8,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 16px 34px -14px rgba(109,90,214,.8)' }}>
                <span className="wedy-shine" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)' }} />
                <WandSparkles size={17} style={{ position: 'relative' }} /><span style={{ position: 'relative' }}>{t('gen_generate')}</span>
              </button>
              <button type="button" onClick={() => setStep(1)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 40, borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#33474f', cursor: 'pointer' }}><ArrowLeft size={15} />{t('gen_change_template')}</button>
            </div>
          </div>
          {genMut.isPending && (
            <RV variant="fade" style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(6px)' }}>
              <span style={{ position: 'relative', width: 76, height: 76 }}>
                <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(22,182,200,.6)' }} />
                <span className="wedy-spin" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg,rgba(109,90,214,0),rgba(109,90,214,.7),rgba(22,182,200,.9),rgba(22,182,200,0))' }} />
                <img src="/wedy-avatar.png" alt="" style={{ position: 'absolute', inset: 5, width: 66, height: 66, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4', border: '3px solid #ffffff' }} />
              </span>
              <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18 }}>{t('gen_busy')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: 260 }}>
                <span className="wedy-scan" style={{ display: 'block', height: 7, width: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#eef2f4,#d9eef1,#eef2f4)' }} />
                <span style={{ display: 'block', height: 7, width: '82%', borderRadius: 4, background: '#eef2f4' }} />
                <span style={{ display: 'block', height: 7, width: '64%', borderRadius: 4, background: '#eef2f4' }} />
              </div>
            </RV>
          )}
        </RV>
      )}

      {/* ── Step 3: result ── */}
      {step === 3 && result && tpl && person && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RV variant="up" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 18px', borderRadius: 18, background: '#e1f5ec', border: '1px solid rgba(22,160,107,.25)' }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#16a06b', color: '#ffffff', flexShrink: 0 }}><Check size={18} strokeWidth={2.6} /></span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0a1c24' }}>{t('gen_ready')}</div>
              <div style={{ fontSize: 13, color: '#33474f' }}>{`${result.document_type} · ${person.full_name} · ${LANGS.find(l => l.k === result.lang)?.label ?? result.lang}`}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => downloadDoc(result.id, 'pdf', `${result.document_type}.pdf`).catch((e: unknown) => toast.error(getApiError(e, t('gen_err'))))} className="gen-btn-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 14px', border: 'none', borderRadius: 11, background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}><Download size={15} />PDF</button>
              <button type="button" onClick={() => downloadDoc(result.id, 'docx', `${result.document_type}.docx`).catch((e: unknown) => toast.error(getApiError(e, t('gen_err'))))} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 14px', borderRadius: 11, border: '1px solid #c9dcd3', background: '#ffffff', color: '#0a1c24', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}><FileText size={15} />DOCX</button>
              <button type="button" onClick={async () => {
                try {
                  const res = await sendForSignature(result.id);
                  const link = `${window.location.origin}/sign/${res.token}`;
                  await navigator.clipboard.writeText(link);
                  toast.success(tf(t('gen_sent'), { name: person.full_name.split(' ')[0] }));
                } catch (e: unknown) { toast.error(getApiError(e, t('gen_err'))); }
              }} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 14px', borderRadius: 11, border: '1px solid #c9dcd3', background: '#ffffff', color: '#0a1c24', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}><Send size={15} />{tf(t('gen_send_to'), { name: person.full_name.split(' ')[0] })}</button>
            </div>
          </RV>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            {/* ── Paper ── */}
            <RV variant="up" delay={80} style={{ flex: '2 1 520px', minWidth: 0, padding: 22, borderRadius: 22, background: '#e9eef0' }}>
              {isRichHtml ? (
                // Pre-styled template (e.g. imported from a scanned PDF): render the backend's HTML as-is,
                // in a scrollable frame, instead of forcing it into the plain-text letterhead below.
                <div style={{ maxWidth: 760, margin: '0 auto', overflow: 'auto', borderRadius: 6, boxShadow: '0 30px 60px -30px rgba(10,28,36,.4), 0 0 0 1px #e2e8eb' }}>
                  {editing ? (
                    <div
                      contentEditable suppressContentEditableWarning dir={rtl ? 'rtl' : 'ltr'}
                      onBlur={e => { setBody(e.currentTarget.innerHTML); setModified(true); }}
                      dangerouslySetInnerHTML={{ __html: body }}
                      style={{ outline: '2px dashed #9fd6df', outlineOffset: -2 }}
                    />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: result.content }} />
                  )}
                </div>
              ) : (
                <div dir={rtl ? 'rtl' : 'ltr'} style={{ position: 'relative', maxWidth: 700, margin: '0 auto', background: '#ffffff', borderRadius: 6, boxShadow: '0 30px 60px -30px rgba(10,28,36,.4), 0 0 0 1px #e2e8eb', padding: '44px 48px 30px', minHeight: 640, display: 'flex', flexDirection: 'column', color: '#1d2a30', fontFamily: rtl ? "'Noto Kufi Arabic',sans-serif" : "Georgia,'Times New Roman',serif" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#06141a,#0e6f84)', color: '#ffffff', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: '-.02em', flexShrink: 0 }}>TY</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16, color: '#0a1c24' }}>Tython SARL</div>
                      <div style={{ fontFamily: "'Geist',system-ui,sans-serif", fontSize: 11.5, color: '#5f7079' }}>112 boulevard d'Anfa, 20040 Casablanca · +212 5 22 00 00 00</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, color: '#7d8f97', marginTop: 10, direction: 'ltr', textAlign: rtl ? 'right' : 'left' }}>RC 345 678 · ICE 001 234 567 000 089 · CNSS 1 234 567</div>
                  <div style={{ height: 2, background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', marginTop: 14 }} />
                  <div style={{ margin: '34px 0 26px', textAlign: 'center', fontFamily: rtl ? "'Noto Kufi Arabic',sans-serif" : "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: rtl ? '0' : '.12em', color: '#0a1c24' }}>{docTitle}</div>
                  {!editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {paras.map((p, i) => <p key={i} style={{ margin: 0, fontSize: 14.5, lineHeight: 1.85, textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{p}</p>)}
                    </div>
                  ) : (
                    <textarea value={body.replace(/<[^>]+>/g, '')} onChange={e => { setBody(e.target.value); setModified(true); }} dir={rtl ? 'rtl' : 'ltr'} style={{ width: '100%', minHeight: 300, resize: 'vertical', padding: 12, borderRadius: 8, border: '1.5px dashed #9fd6df', background: '#f8fdfd', fontFamily: 'inherit', fontSize: 14.5, lineHeight: 1.8, color: '#1d2a30', outline: 'none' }} />
                  )}
                  <div style={{ marginTop: 28, fontSize: 14, textAlign: rtl ? 'left' : 'right' }}>{tf(t('gen_place_date'), { date: new Date().toLocaleDateString() })}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 220 }}>
                      <span style={{ fontFamily: "'Geist',system-ui,sans-serif", fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>{t('gen_signature_dept')}</span>
                      <span style={{ fontFamily: "'Brush Script MT','Segoe Script',cursive", fontSize: 26, color: '#0b3f52', transform: 'rotate(-4deg)' }}>{initialsOf(person.manager || 'Wedy RH').slice(0, 1)}. {(person.manager || 'Wedy RH').split(' ').slice(-1)[0]}</span>
                      <span style={{ position: 'absolute', right: -6, top: 6, width: 88, height: 88, borderRadius: '50%', border: '2.5px solid rgba(14,111,132,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(14,111,132,.75)', fontFamily: "'Geist Mono',monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: '.08em', lineHeight: 1.35, transform: 'rotate(-14deg)', direction: 'ltr' }}>
                        <span>TYTHON</span><span style={{ fontSize: 7 }}>SARL</span><span>CASABLANCA</span>
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ marginTop: 34, paddingTop: 12, borderTop: '1px solid #eef2f4', display: 'flex', justifyContent: 'space-between', gap: 10, fontFamily: "'Geist Mono',monospace", fontSize: 9.5, color: '#8a9ba3', direction: 'ltr' }}>
                    <span>{`Généré par Wedy · ${verifCode}`}</span><span>{`Vérification : wedy.ma/v/${verifCode}`}</span>
                  </div>
                </div>
              )}
            </RV>

            {/* ── Side panel ── */}
            <RV variant="left" delay={120} style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 18, borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: '#5f7079' }}>{t('gen_summary_person')}</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{person.full_name}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: '#5f7079' }}>{t('gen_summary_template')}</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{tpl.name_fr}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span style={{ color: '#5f7079' }}>{t('gen_summary_lang')}</span><span style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{result.lang.toUpperCase()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: '#5f7079' }}>{t('gen_summary_by')}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: result.byAi ? '#ece9fb' : '#eef2f4', color: result.byAi ? '#5444b8' : '#33474f' }}>{result.byAi ? t('gen_by_ai') : t('gen_by_template')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 10, borderTop: '1px solid #eef2f4', fontSize: 12.5, color: '#0f6f49' }}><History size={14} />{t('gen_added_history')}</div>
              </div>
              <button type="button" onClick={() => { if (editing) { setModified(body !== editorStartRef.current); } setEditing(s => !s); }} className="gen-btn-edit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 12, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#0a1c24', cursor: 'pointer' }}>
                {editing ? <Check size={15} /> : <Pencil size={15} />}{editing ? t('gen_edit_done') : t('gen_edit_text')}
              </button>
              {modified && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#8a5207' }}><Pencil size={13} />{t('gen_modified')}</span>}
              <button type="button" onClick={restart} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={15} strokeWidth={2.2} />{t('gen_new_doc_btn')}
              </button>
            </RV>
          </div>
        </div>
      )}

      {(empData === undefined || tplData === undefined) && step === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      )}
    </div>
  );
}
