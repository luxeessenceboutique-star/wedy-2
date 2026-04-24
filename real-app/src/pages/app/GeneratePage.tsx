import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Wand2, Check, ChevronRight, Download, Sparkles, Loader2 } from 'lucide-react';
import { listEmployees, listTemplates, generateDocument, getPdfUrl, getDocxUrl, aiEnhance } from '../../lib/api';
import { Button, Badge, Card, Select, Spinner } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { Avatar } from '../../components/ui';

const LANG_OPTIONS = [{ value: 'fr', label: 'Français' }, { value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }];

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, flexShrink: 0,
            background: i < step ? 'var(--primary)' : i === step ? 'var(--primary-soft)' : 'var(--bg-muted)',
            color: i < step ? '#fff' : i === step ? 'var(--primary)' : 'var(--fg-muted)',
            border: i === step ? '2px solid var(--primary)' : '2px solid transparent',
          }}>
            {i < step ? <Check size={13} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{ flex: 1, height: 2, background: i < step ? 'var(--primary)' : 'var(--border)', margin: '0 4px' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function GeneratePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [employeeId, setEmployeeId] = useState(params.get('employee_id') ?? '');
  const [templateId, setTemplateId] = useState('');
  const [language, setLanguage] = useState('fr');
  const [useAI, setUseAI] = useState(true);
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ id: string; content: string; type: string } | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState('');

  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees({ limit: 200 }) });
  const { data: tplData } = useQuery({ queryKey: ['templates'], queryFn: () => listTemplates() });

  const employees = empData?.data ?? [];
  const templates = tplData?.data ?? [];
  const selectedEmp = employees.find(e => e.id === employeeId);
  const selectedTpl = templates.find(t => t.id === templateId);

  const genMut = useMutation({
    mutationFn: () => generateDocument({ employee_id: employeeId, template_id: templateId, language, use_ai_enhancement: useAI, extra_variables: extraVars }),
    onSuccess: (data) => {
      setResult({ id: data.document.id, content: data.content, type: data.document.document_type });
      setStep(3);
      toast.success('Document generated!');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Generation failed'),
  });

  const handleEnhance = async () => {
    if (!result) return;
    setEnhancing(true);
    try {
      const res = await aiEnhance({ document_content: result.content, document_type: result.type, language, instructions: 'Improve clarity and professionalism' });
      setEnhancedContent(res.enhanced_content);
      toast.success('AI enhancement applied');
    } catch {
      toast.error('AI enhancement failed');
    } finally {
      setEnhancing(false);
    }
  };

  const displayContent = enhancedContent || result?.content || '';

  const STEPS = ['Employee', 'Template', 'Options', 'Result'];

  return (
    <div style={{ padding: '24px 28px', maxWidth: 860, margin: '0 auto' }}>
      <PageHeader title="Generate Document" subtitle="Create HR documents in seconds with AI assistance." />

      <StepIndicator step={step} total={STEPS.length} />

      {/* Step 0: Select employee */}
      {step === 0 && (
        <Card>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Select an employee</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>Choose the employee for whom this document will be generated.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginBottom: 20 }}>
            {employees.length === 0 ? <Spinner /> : employees.slice(0, 20).map(emp => (
              <div key={emp.id}
                onClick={() => setEmployeeId(emp.id)}
                style={{
                  padding: '12px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: employeeId === emp.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: employeeId === emp.id ? 'var(--primary-soft)' : 'var(--bg-elev)',
                  display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color 0.15s',
                }}>
                <Avatar name={emp.full_name} size={32} />
                <div>
                  <p style={{ fontWeight: 500, fontSize: 13 }}>{emp.full_name}</p>
                  <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{emp.position || emp.department || emp.cin}</p>
                </div>
                {employeeId === emp.id && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button disabled={!employeeId} onClick={() => setStep(1)}>Next <ChevronRight size={14} /></Button>
          </div>
        </Card>
      )}

      {/* Step 1: Select template */}
      {step === 1 && (
        <Card>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Select template</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>Choose the document type to generate.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
            {templates.map(tpl => (
              <div key={tpl.id}
                onClick={() => setTemplateId(tpl.id)}
                style={{
                  padding: '14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: templateId === tpl.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: templateId === tpl.id ? 'var(--primary-soft)' : 'var(--bg-elev)',
                  transition: 'border-color 0.15s',
                }}>
                <p style={{ fontWeight: 500, fontSize: 13 }}>{tpl.name_fr}</p>
                {tpl.name_en && <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{tpl.name_en}</p>}
                <div style={{ marginTop: 8 }}><Badge>{tpl.category}</Badge></div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button disabled={!templateId} onClick={() => setStep(2)}>Next <ChevronRight size={14} /></Button>
          </div>
        </Card>
      )}

      {/* Step 2: Options */}
      {step === 2 && (
        <Card>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Options</h2>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>Configure language and AI options before generating.</p>

          {/* Summary */}
          <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Employee</p>
              <p style={{ fontWeight: 500, fontSize: 13 }}>{selectedEmp?.full_name}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Template</p>
              <p style={{ fontWeight: 500, fontSize: 13 }}>{selectedTpl?.name_fr}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Select label="Language" value={language} onChange={e => setLanguage(e.target.value)}>
              {LANG_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </Select>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)} />
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              Use Claude AI to enhance the document
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button loading={genMut.isPending} onClick={() => genMut.mutate()}>
              <Wand2 size={14} /> Generate document
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Result */}
      {step === 3 && result && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={13} style={{ color: '#fff' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>Document generated</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{result.type} • {LANG_OPTIONS.find(l => l.value === language)?.label}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={handleEnhance} loading={enhancing}>
                <Sparkles size={13} /> AI improve
              </Button>
              <a href={getPdfUrl(result.id)} target="_blank" rel="noopener noreferrer">
                <Button variant="soft" size="sm"><Download size={13} /> PDF</Button>
              </a>
              <a href={getDocxUrl(result.id)} target="_blank" rel="noopener noreferrer">
                <Button variant="soft" size="sm"><Download size={13} /> DOCX</Button>
              </a>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: '16px 20px',
            fontFamily: 'Georgia, serif', lineHeight: 1.8, fontSize: 14, color: 'var(--fg)',
            maxHeight: 480, overflowY: 'auto', whiteSpace: 'pre-wrap', border: '1px solid var(--border)',
          }} className="scroll">
            {displayContent}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="ghost" onClick={() => { setStep(0); setResult(null); setEnhancedContent(''); }}>Generate another</Button>
            <Button onClick={() => navigate('/app/history')}>View history →</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
