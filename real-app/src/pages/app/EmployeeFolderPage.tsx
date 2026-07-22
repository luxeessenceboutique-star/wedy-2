import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, Wand2, Upload, Trash2, Download, FileText,
  User, Briefcase, MapPin, AlertTriangle, X, Sparkles,
  CheckCircle2, Circle, ChevronDown, ChevronUp, GraduationCap, FileSignature,
} from 'lucide-react';
import {
  getEmployee, updateEmployee, listEmployeeDocuments, listEmployeeFiles,
  uploadEmployeeFile, deleteEmployeeFile, getEmployeeFileUrl,
  listLeaveRequests, listPayslips, listGoals, listReviews,
  downloadDoc, printDocument, listDepartments,
  analyzeEmployeeFolder, applyAnalysis, sendForSignature,
  getApiError,
  type Employee, type GeneratedDoc, type EmployeeFile,
  type LeaveRequest, type Payslip, type PerformanceGoal, type PerformanceReview,
  type AnalysisResult,
} from '../../lib/api';
import { Avatar, Badge, Button, Card, Modal, Input, Select, Spinner } from '../../components/ui';
import { toast } from 'sonner';
import { useLang } from '../../lib/lang';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', inactive: 'danger', 'on-leave': 'warning', terminated: 'danger',
};

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'ANAPEC', 'Consultant', 'Freelance'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d?: string) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

function fmtSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function daysUntil(d?: string): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
      <span style={{ color: 'var(--ink-2)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontWeight: 450, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '20px 0 8px' }}>
      {children}
    </p>
  );
}

function MiniSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 24, height: 24, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ textAlign: 'center', color: 'var(--ink-2)', fontSize: 13, padding: '32px 0' }}>{text}</p>;
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function EditForm({ employee, departments, onSave, onCancel, loading }: {
  employee: Employee;
  departments: { id: string; name: string }[];
  onSave: (data: Partial<Employee>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<Partial<Employee>>(employee);
  const set = (k: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={ev => { ev.preventDefault(); onSave(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{t('identity')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label={`${t('full_name_label')} *`} value={form.full_name ?? ''} onChange={set('full_name')} required />
        <Input label="CIN" value={form.cin ?? ''} onChange={set('cin')} />
        <Input label="Matricule" value={form.matricule ?? ''} onChange={set('matricule')} />
        <Input label={t('birth_date_label')} type="date" value={form.birth_date ?? ''} onChange={set('birth_date')} />
        <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} />
        <Input label={t('phone_label')} value={form.phone ?? ''} onChange={set('phone')} />
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{t('contract_section')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label={t('position_label')} value={form.position ?? ''} onChange={set('position')} />
        <Select label={t('department_label')} value={form.department ?? ''} onChange={set('department')}>
          <option value="">— {t('select')} —</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </Select>
        <Input label={t('manager_label')} value={form.manager ?? ''} onChange={set('manager')} />
        <Input label={`${t('salary_label')} (MAD)`} type="number" value={form.salary ?? ''} onChange={set('salary')} />
        <Select label={t('contract_type_label')} value={form.contract_type ?? ''} onChange={set('contract_type')}>
          {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select label={t('status_label')} value={form.status ?? 'active'} onChange={set('status')}>
          <option value="active">{t('status_active_item')}</option>
          <option value="inactive">{t('status_inactive_item')}</option>
          <option value="on-leave">{t('status_on_leave_item')}</option>
          <option value="terminated">{t('status_terminated_item')}</option>
        </Select>
        <Input label={t('hire_date_label')} type="date" value={form.hire_date ?? ''} onChange={set('hire_date')} />
        <Input label={t('contract_start_label')} type="date" value={form.contract_start ?? ''} onChange={set('contract_start')} />
        <Input label={t('contract_end_label')} type="date" value={form.contract_end ?? ''} onChange={set('contract_end')} />
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{t('address')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Input label={t('address')} value={form.address ?? ''} onChange={set('address')} />
        <Input label={t('city')} value={form.city ?? ''} onChange={set('city')} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="ghost" type="button" onClick={onCancel}>{t('cancel')}</Button>
        <Button type="submit" loading={loading}>{t('save')}</Button>
      </div>
    </form>
  );
}

// ── Files tab ─────────────────────────────────────────────────────────────────

function FilesTab({ employeeId }: { employeeId: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState('cv');
  const [dragging, setDragging] = useState(false);

  const FILE_TYPES = [
    { value: 'cv', label: 'CV', color: 'var(--primary)', bg: 'var(--primary-soft)' },
    { value: 'diplome', label: t('file_diploma'), color: '#7c3aed', bg: 'var(--violet-soft)' },
    { value: 'certificat', label: t('file_cert'), color: '#059669', bg: 'var(--success-soft)' },
    { value: 'contrat', label: t('file_contract'), color: 'var(--warn)', bg: 'var(--warn-soft)' },
    { value: 'autre', label: t('file_other'), color: 'var(--ink-2)', bg: 'var(--surface-2)' },
  ];

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['employee-files', employeeId],
    queryFn: () => listEmployeeFiles(employeeId),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadEmployeeFile(employeeId, file, uploadType),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-files', employeeId] }); toast.success(t('save')); },
    onError: () => toast.error('Error'),
  });

  const deleteMut = useMutation({
    mutationFn: (fileId: string) => deleteEmployeeFile(employeeId, fileId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-files', employeeId] }); toast.success(t('delete')); },
  });

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    Array.from(fileList).forEach(f => uploadMut.mutate(f));
  };

  const grouped = FILE_TYPES.map(ft => ({
    ...ft,
    items: (files as EmployeeFile[]).filter(f => f.file_type === ft.value),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--line-2)'}`,
          borderRadius: 12, padding: '28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          cursor: 'pointer', background: dragging ? 'var(--primary-soft)' : 'var(--surface-2)',
          transition: 'all 0.15s',
        }}
      >
        <Upload size={28} style={{ color: dragging ? 'var(--primary)' : 'var(--ink-3)' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>{t('file_drop_here')}</p>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: '4px 0 0' }}>PDF, DOCX, JPG, PNG — {t('file_click_select')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Type :</span>
          <select
            value={uploadType}
            onChange={e => { e.stopPropagation(); setUploadType(e.target.value); }}
            onClick={e => e.stopPropagation()}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer' }}
          >
            {FILE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
          </select>
        </div>
        {uploadMut.isPending && <Spinner />}
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* File list */}
      {isLoading ? <MiniSpinner /> : files.length === 0 ? (
        <Empty text={t('file_no_files')} />
      ) : (
        grouped.map(group => (
          <div key={group.value}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: group.bg, color: group.color,
              }}>{group.label}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{group.items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.items.map((f: EmployeeFile) => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--line)', background: 'var(--surface)',
                }}>
                  <FileText size={16} style={{ color: group.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-2)' }}>
                      {fmtSize(f.file_size)} · {fmt(f.created_at)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <a href={getEmployeeFileUrl(f.file_path)} target="_blank" rel="noreferrer">
                      <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={12} /> {t('download')}
                      </button>
                    </a>
                    <button
                      onClick={() => { if (confirm(`${t('delete')} "${f.name}" ?`)) deleteMut.mutate(f.id); }}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: 'none', cursor: 'pointer', color: '#dc2626' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Analysis Panel ────────────────────────────────────────────────────────────

type ExtractedData = AnalysisResult['extracted'];

function AnalysisPanel({ employee, result, onApply, onClose, applying }: {
  employee: Employee;
  result: ExtractedData;
  onApply: (fields: Record<string, unknown>) => void;
  onClose: () => void;
  applying: boolean;
}) {
  const { t } = useLang();
  
  const APPLY_FIELDS: { key: keyof ExtractedData; label: string; emp?: keyof Employee }[] = [
    { key: 'full_name', label: t('full_name_label'), emp: 'full_name' },
    { key: 'cin', label: 'CIN', emp: 'cin' },
    { key: 'matricule', label: 'Matricule', emp: 'matricule' },
    { key: 'email', label: 'Email', emp: 'email' },
    { key: 'phone', label: t('phone_label'), emp: 'phone' },
    { key: 'birth_date', label: t('birth_date_label'), emp: 'birth_date' },
    { key: 'nationality', label: t('nationality_label'), emp: 'nationality' },
    { key: 'position', label: t('position_label'), emp: 'position' },
    { key: 'department', label: t('department_label'), emp: 'department' },
    { key: 'salary', label: t('salary_label'), emp: 'salary' },
    { key: 'hire_date', label: t('hire_date_label'), emp: 'hire_date' },
    { key: 'contract_type', label: t('contract_type_label'), emp: 'contract_type' },
    { key: 'contract_start', label: t('contract_start_label'), emp: 'contract_start' },
    { key: 'contract_end', label: t('contract_end_label'), emp: 'contract_end' },
    { key: 'manager', label: t('manager_label'), emp: 'manager' },
    { key: 'address', label: t('address'), emp: 'address' },
    { key: 'city', label: t('city'), emp: 'city' },
    { key: 'cnss_number', label: 'N° CNSS' },
    { key: 'bank_account', label: 'RIB' },
    { key: 'notes', label: 'Notes', emp: 'notes' },
  ];

  const initialSelected = new Set<string>(
    APPLY_FIELDS.filter(f => {
      const extracted = result[f.key];
      if (extracted === undefined || extracted === null || extracted === '' || Array.isArray(extracted)) return false;
      const current = f.emp ? String((employee as Record<string, unknown>)[f.emp as string] ?? '') : '';
      return String(extracted) !== current;
    }).map(f => f.key)
  );

  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  const toggle = (key: string) =>
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const handleApply = () => {
    const fields: Record<string, unknown> = {};
    for (const key of selected) {
      const val = result[key as keyof ExtractedData];
      if (val !== undefined && val !== null && val !== '') fields[key] = val;
    }
    onApply(fields);
  };

  const applicableFields = APPLY_FIELDS.filter(f => {
    const val = result[f.key];
    return val !== undefined && val !== null && val !== '' && !Array.isArray(val);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {applicableFields.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--ink-2)', padding: '24px 0' }}>{t('no_data_extracted')}</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 10 }}>
            {selected.size} {t('fields_selected')} — {t('fields_apply_desc')}
          </p>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '24px 110px 1fr 1fr', gap: 8, padding: '6px 6px', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
            <div />
            {[t('field'), t('current_value'), t('extracted_value')].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
            {applicableFields.map(f => {
              const extracted = String(result[f.key] ?? '');
              const current = f.emp ? String((employee as Record<string, unknown>)[f.emp as string] ?? '') : '';
              const isNew = !current;
              const isDiff = extracted !== current;
              const isChecked = selected.has(f.key);
              return (
                <div
                  key={f.key}
                  onClick={() => toggle(f.key)}
                  style={{
                    display: 'grid', gridTemplateColumns: '24px 110px 1fr 1fr', gap: 8, alignItems: 'center',
                    padding: '7px 6px', borderRadius: 6, cursor: 'pointer',
                    background: isChecked ? (isNew ? '#f0fdf4' : 'var(--primary-soft)') : '#fafafa',
                    border: `1px solid ${isChecked ? (isNew ? '#86efac' : '#bfdbfe') : 'transparent'}`,
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {isChecked
                      ? <CheckCircle2 size={15} style={{ color: isNew ? '#16a34a' : '#2563eb' }} />
                      : <Circle size={15} style={{ color: 'var(--line-2)' }} />}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{f.label}</span>
                  <span style={{ fontSize: 12, color: current ? 'var(--ink-2)' : 'var(--ink-3)', fontStyle: current ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {current || '—'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: isDiff ? 600 : 400, color: isNew ? '#15803d' : isDiff ? '#1d4ed8' : 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {extracted}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Extra info */}
      {(result.education?.length || result.certifications?.length || result.skills?.length || result.languages?.length) ? (
        <div style={{ marginTop: 18, padding: '14px 0 0', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-2)', marginBottom: 10 }}>
            {t('extra_info')} ({t('read_only')})
          </p>
          {result.education?.length ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <GraduationCap size={13} style={{ color: '#7c3aed' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t('education')}</span>
              </div>
              {result.education.map((e, i) => (
                <p key={i} style={{ margin: 0, fontSize: 12, color: 'var(--ink-2)', paddingLeft: 20, lineHeight: 1.7 }}>
                  {[e.degree, e.field, e.school, e.year].filter(Boolean).join(' · ')}
                </p>
              ))}
            </div>
          ) : null}
          {result.certifications?.length ? (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Certifications</p>
              {result.certifications.map((c, i) => (
                <p key={i} style={{ margin: 0, fontSize: 12, color: 'var(--ink-2)', paddingLeft: 20, lineHeight: 1.7 }}>
                  {[c.name, c.issuer, c.year].filter(Boolean).join(' · ')}
                </p>
              ))}
            </div>
          ) : null}
          {result.skills?.length ? (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t('skills')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 20 }}>
                {result.skills.map((s, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--surface-2)', color: 'var(--ink-2)' }}>{s}</span>
                ))}
              </div>
            </div>
          ) : null}
          {result.languages?.length ? (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t('languages')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 20 }}>
                {result.languages.map((l, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--primary-soft)', color: '#1d4ed8' }}>{l}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={handleApply} loading={applying} disabled={selected.size === 0}>
          <CheckCircle2 size={13} /> {t('apply_selected_fields')}
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'profil' | 'fichiers' | 'documents' | 'conges' | 'paie' | 'performance';

export default function EmployeeFolderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('profil');
  const [editing, setEditing] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ExtractedData | null>(null);

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id!),
    enabled: !!id,
  });

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });

  const { data: docs = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ['employee-docs', id],
    queryFn: () => listEmployeeDocuments(id!),
    enabled: tab === 'documents' && !!id,
  });

  const { data: leaves = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['employee-leaves', id],
    queryFn: () => listLeaveRequests({ employee_id: id! }),
    enabled: tab === 'conges' && !!id,
  });

  const { data: payslips = [], isLoading: payLoading } = useQuery({
    queryKey: ['employee-payslips', id],
    queryFn: () => listPayslips({ employee_id: id! }),
    enabled: tab === 'paie' && !!id,
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['employee-goals', id],
    queryFn: () => listGoals({ employee_id: id! }),
    enabled: tab === 'performance' && !!id,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['employee-reviews', id],
    queryFn: () => listReviews({ employee_id: id! }),
    enabled: tab === 'performance' && !!id,
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<Employee>) => updateEmployee(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      setEditing(false);
      toast.success(t('save'));
    },
    onError: () => toast.error('Error'),
  });

  const analyzeMut = useMutation({
    mutationFn: () => analyzeEmployeeFolder(id!),
    onSuccess: (data) => {
      setAnalysisResult(data.extracted);
      setAnalysisOpen(true);
    },
    onError: (e: Error) => toast.error(`Error : ${e.message}`),
  });

  const applyMut = useMutation({
    mutationFn: (fields: Record<string, unknown>) => applyAnalysis(id!, fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      setAnalysisOpen(false);
      toast.success(t('save'));
    },
    onError: () => toast.error("Error"),
  });

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>
  );
  if (isError || !employee) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)' }}>
      <p>{t('employee_not_found')}</p>
      <Button variant="ghost" onClick={() => navigate('/app/employees')}>← {t('cancel')}</Button>
    </div>
  );

  const days = daysUntil(employee.contract_end);
  const expiryWarn = days !== null && days <= 30;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profil', label: t('tab_profile') },
    { key: 'fichiers', label: t('tab_files') },
    { key: 'documents', label: t('tab_docs') },
    { key: 'conges', label: t('tab_leaves') },
    { key: 'paie', label: t('tab_payroll') },
    { key: 'performance', label: t('tab_performance') },
  ];

  const LEAVE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'var(--warn-soft)', color: '#92400e', label: t('status_pending_item') },
    approved: { bg: '#d1fae5', color: '#065f46', label: t('status_approved_item') },
    rejected: { bg: 'var(--danger-soft)', color: 'var(--danger)', label: t('status_rejected_item') },
  };

  const GOAL_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'var(--surface-2)', color: 'var(--ink-2)', label: t('status_pending_item') },
    in_progress: { bg: 'var(--primary-soft)', color: '#1d4ed8', label: t('status_active_item') },
    completed: { bg: '#d1fae5', color: '#065f46', label: t('status_completed_item') },
    cancelled: { bg: 'var(--danger-soft)', color: 'var(--danger)', label: t('status_rejected_item') },
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Back link */}
      <button
        onClick={() => navigate('/app/employees')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', fontSize: 13, marginBottom: 20, padding: 0 }}
      >
        <ArrowLeft size={14} /> {t('nav_people')}
      </button>

      {/* Header card */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Avatar name={employee.full_name} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{employee.full_name}</h1>
              <Badge variant={STATUS_COLORS[employee.status] ?? 'default'}>{employee.status}</Badge>
              {expiryWarn && (
                <Badge variant={days! < 0 ? 'danger' : 'warning'}>
                  <AlertTriangle size={10} />
                  {days! < 0 ? t('contract_expired') : `${t('expiring_soon')} : ${days}j`}
                </Badge>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>
              {[employee.position, employee.department].filter(Boolean).join(' · ') || '—'}
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              {employee.cin && <span style={{ fontSize: 12, color: 'var(--ink-2)' }}><strong>CIN:</strong> {employee.cin}</span>}
              {employee.matricule && <span style={{ fontSize: 12, color: 'var(--ink-2)' }}><strong>Matricule:</strong> {employee.matricule}</span>}
              {employee.hire_date && <span style={{ fontSize: 12, color: 'var(--ink-2)' }}><strong>{t('hire_date_label')}:</strong> {fmt(employee.hire_date)}</span>}
              {employee.contract_type && <span style={{ fontSize: 12, color: 'var(--ink-2)' }}><strong>Contrat:</strong> {employee.contract_type}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={13} /> {t('edit')}
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => analyzeMut.mutate()}
              loading={analyzeMut.isPending}
              style={{ color: '#7c3aed', borderColor: '#ddd8fe' }}
            >
              <Sparkles size={13} /> {t('analyze_folder')}
            </Button>
            <Link to={`/app/generate?employee_id=${employee.id}`}>
              <Button size="sm"><Wand2 size={13} /> {t('generate_document')}</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Contract expiry alert */}
      {expiryWarn && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 10,
          background: days! < 0 ? '#fef2f2' : 'var(--warn-soft)',
          border: `1px solid ${days! < 0 ? 'color-mix(in srgb,var(--danger) 30%,transparent)' : '#fde68a'}`,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          color: days! < 0 ? '#dc2626' : '#92400e',
        }}>
          <AlertTriangle size={15} />
          {days! < 0
            ? t('contract_expired_desc').replace('{name}', employee.full_name).replace('{days}', Math.abs(days!).toString())
            : t('contract_expiring_desc').replace('{name}', employee.full_name).replace('{days}', days.toString())
          }
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 20, gap: 0, overflowX: 'auto' }}>
        {TABS.map(t_item => (
          <button key={t_item.key} onClick={() => setTab(t_item.key)} style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t_item.key ? 600 : 400, whiteSpace: 'nowrap',
            color: tab === t_item.key ? 'var(--primary)' : 'var(--ink-2)',
            borderBottom: tab === t_item.key ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t_item.label}
          </button>
        ))}
      </div>

      {/* ── Profil tab ─────────────────────────────────────────────────── */}
      {tab === 'profil' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <User size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t('identity')}</span>
            </div>
            <InfoRow label={t('full_name_label')} value={employee.full_name} />
            <InfoRow label="CIN" value={employee.cin} />
            <InfoRow label="Matricule" value={employee.matricule} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label={t('phone_label')} value={employee.phone} />
            <InfoRow label={t('birth_date_label')} value={fmt(employee.birth_date)} />
            <InfoRow label={t('nationality_label')} value={employee.nationality} />
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Briefcase size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t('contract_section')}</span>
            </div>
            <InfoRow label={t('position_label')} value={employee.position} />
            <InfoRow label={t('department_label')} value={employee.department} />
            <InfoRow label={t('manager_label')} value={employee.manager} />
            <InfoRow label={t('contract_type_label')} value={employee.contract_type} />
            <InfoRow label={t('status_label')} value={employee.status} />
            <InfoRow label={t('hire_date_label')} value={fmt(employee.hire_date)} />
            <InfoRow label={t('contract_start_label')} value={fmt(employee.contract_start)} />
            <InfoRow label={t('contract_end_label')} value={fmt(employee.contract_end)} />
            <InfoRow label={t('salary_label')} value={employee.salary ? `${Number(employee.salary).toLocaleString()} MAD` : undefined} />
          </Card>

          {(employee.address || employee.city) && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MapPin size={14} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t('address')}</span>
              </div>
              <InfoRow label={t('address')} value={employee.address} />
              <InfoRow label={t('city')} value={employee.city} />
            </Card>
          )}

          {employee.notes && (
            <Card>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Notes</span>
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--fg)', lineHeight: 1.6 }}>{employee.notes}</p>
            </Card>
          )}

          {employee.custom_fields && Object.keys(employee.custom_fields).length > 0 && (
            <Card>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t('custom_fields')}</span>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {Object.entries(employee.custom_fields).map(([key, value]) => (
                  <div key={key} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{key}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{String(value)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Fichiers tab ───────────────────────────────────────────────── */}
      {tab === 'fichiers' && <FilesTab employeeId={employee.id} />}

      {/* ── Documents tab ──────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Link to={`/app/generate?employee_id=${employee.id}`}>
              <Button size="sm"><Wand2 size={13} /> {t('generate_document')}</Button>
            </Link>
          </div>
          {docsLoading ? <MiniSpinner /> : docs.length === 0 ? (
            <Empty text={t('no_documents')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(docs as GeneratedDoc[]).map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 8,
                  border: '1px solid var(--line)', background: 'var(--surface)',
                }}>
                  <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.document_type}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-2)' }}>
                      {new Date(doc.created_at).toLocaleDateString()} · {doc.language.toUpperCase()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => printDocument(doc.id, doc.document_type).catch(e => toast.error(e.message))}
                    >
                      <Download size={11} /> PDF
                    </button>
                    {(!doc.signature_status || doc.signature_status === 'pending') && (
                      <button
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--primary)', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={async () => {
                          try {
                            const res = await sendForSignature(doc.id);
                            toast.success(t('save'));

                            const link = `${window.location.origin}/sign/${res.token}`;
                            navigator.clipboard.writeText(link);
                            toast.info(`Lien copié: ${link}`);

                            refetchDocs();
                          } catch (e: any) { toast.error(getApiError(e, "Error")); }
                        }}
                      >
                        <FileSignature size={11} /> {doc.signature_status === 'pending' ? t('resend') : t('sign')}
                      </button>
                    )}
                    {doc.signature_status === 'signed' && (
                      <Badge variant="success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={10} /> {t('status_signed')}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Congés tab ─────────────────────────────────────────────────── */}
      {tab === 'conges' && (
        leavesLoading ? <MiniSpinner /> : leaves.length === 0 ? (
          <Empty text={t('no_pending_requests')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(leaves as LeaveRequest[]).map(l => {
              const s = LEAVE_STYLE[l.status] ?? LEAVE_STYLE.pending;
              return (
                <div key={l.id} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{l.type}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>
                      {fmt(l.start_date)} → {fmt(l.end_date)} · {l.days} jour{l.days !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: s.bg, color: s.color }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Paie tab ───────────────────────────────────────────────────── */}
      {tab === 'paie' && (
        payLoading ? <MiniSpinner /> : payslips.length === 0 ? (
          <Empty text={t('no_payslips')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(payslips as Payslip[]).map(p => (
              <div key={p.id} style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Mois {p.period_month} / {p.period_year}</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{p.net_salary.toLocaleString()} MAD</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[['Brut', p.gross_salary], ['CNSS', p.cnss_deduction], ['AMO', p.amo_deduction], ['IR', p.ir_deduction]].map(([l, v]) => (
                    <div key={String(l)} style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '6px 10px', textAlign: 'center' as const }}>
                      <p style={{ margin: 0, fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase' as const }}>{l}</p>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{Number(v).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Performance tab ────────────────────────────────────────────── */}
      {tab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-2)', marginBottom: 10 }}>{t('goals')}</p>
            {goalsLoading ? <MiniSpinner /> : goals.length === 0 ? (
              <Empty text={t('no_goals')} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(goals as PerformanceGoal[]).map(g => {
                  const gs = GOAL_STYLE[g.status] ?? GOAL_STYLE.pending;
                  return (
                    <div key={g.id} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{g.title}</p>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: gs.bg, color: gs.color }}>{gs.label}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: g.progress === 100 ? 'var(--success)' : 'var(--primary)', width: `${g.progress}%` }} />
                      </div>
                      <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--ink-2)' }}>{g.progress}%</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-2)', marginBottom: 10 }}>{t('reviews')}</p>
            {reviewsLoading ? <MiniSpinner /> : reviews.length === 0 ? (
              <Empty text={t('no_reviews')} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(reviews as PerformanceReview[]).map(r => (
                  <div key={r.id} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>Cycle {r.cycle}</p>
                      {r.overall_score
                        ? <span style={{ display: 'flex', gap: 2 }}>{[1, 2, 3, 4, 5].map(i => <span key={i} style={{ fontSize: 14, color: i <= r.overall_score! ? 'var(--warn)' : 'var(--line)' }}>★</span>)}</span>
                        : <span style={{ fontSize: 11, color: 'var(--ink-2)', fontStyle: 'italic' }}>{t('status_pending_item')}</span>
                      }
                    </div>
                    {r.comments && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{r.comments}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title={t('edit_profile')} width={740}>
        <EditForm
          employee={employee}
          departments={departments}
          onSave={data => updateMut.mutate(data)}
          onCancel={() => setEditing(false)}
          loading={updateMut.isPending}
        />
      </Modal>

      {/* Analysis modal */}
      <Modal open={analysisOpen} onClose={() => setAnalysisOpen(false)} title={t('analyze_folder')} width={820}>
        {analysisResult && (
          <AnalysisPanel
            employee={employee}
            result={analysisResult}
            onApply={fields => applyMut.mutate(fields)}
            onClose={() => setAnalysisOpen(false)}
            applying={applyMut.isPending}
          />
        )}
      </Modal>
    </div>
  );
}
