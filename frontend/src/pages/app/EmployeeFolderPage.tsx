import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeesListUrl } from '../../lib/listMemory';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, FileText, Folder, User, Wallet, TrendingUp, type LucideIcon } from 'lucide-react';
import {
  getEmployee, updateEmployee, listEmployeeDocuments, listEmployeeFiles,
  uploadEmployeeFile, renameEmployeeFile, replaceEmployeeFileContent, deleteEmployeeFile, downloadEmployeeFile,
  listLeaveRequests, listPayslips, listGoals, listReviews, getLeaveBalance,
  printDocument, listDepartments,
  analyzeEmployeeFolder, applyAnalysis,
  getApiError, isFileMissing,
  type Employee, type GeneratedDoc, type EmployeeFile,
  type LeaveRequest, type Payslip, type PerformanceGoal, type PerformanceReview,
  type AnalysisResult,
} from '@/services/api';
import { Button, Input, Modal, Select, Spinner } from '@/components/ui';
import { EmployeeFolderView } from './EmployeeFolderView';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { toast } from 'sonner';
import { useLang } from '@/lib/lang';
import { tf } from '@/lib/format';
import { useProvideAskPrompts } from '@/lib/askContext';

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'ANAPEC', 'Consultant', 'Freelance'];
const FILE_TYPES: { value: EmployeeFile['file_type']; label: string; bg: string; color: string }[] = [
  { value: 'cv', label: 'CV', bg: '#e4f2f4', color: '#0e6f84' },
  { value: 'diplome', label: 'Diplôme', bg: '#ece9fb', color: '#6d5ad6' },
  { value: 'cin', label: 'CIN', bg: '#e1f5ec', color: '#16a06b' },
  { value: 'contrat', label: 'Contrat', bg: '#fbefda', color: '#b06b0c' },
  { value: 'autre', label: 'Autre', bg: '#f3f6f7', color: '#52646d' },
];
/** Files classified « Certificat » before that type became « CIN » keep their label (it can no longer be chosen). */
const LEGACY_FILE_TYPES: typeof FILE_TYPES = [{ value: 'certificat', label: 'Certificat', bg: '#e1f5ec', color: '#16a06b' }];
const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  active: { bg: 'rgba(43,189,134,.16)', color: '#4fd3a0', dot: '#2bbd86' },
  intern: { bg: 'rgba(95,227,240,.16)', color: '#5fe3f0', dot: '#27c0d4' },
  'on-leave': { bg: 'rgba(240,189,106,.16)', color: '#f0bd6a', dot: '#df9326' },
  inactive: { bg: 'rgba(239,139,120,.16)', color: '#ef8b78', dot: '#df5740' },
  terminated: { bg: 'rgba(239,139,120,.16)', color: '#ef8b78', dot: '#df5740' },
};
const LEAVE_STYLE: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fbefda', color: '#8a5207' },
  approved: { bg: '#e1f5ec', color: '#0f6f49' },
  rejected: { bg: '#fbe9e6', color: '#a33a28' },
};

function fmt(d?: string) {
  return d ? new Date(d).toLocaleDateString() : '—';
}
function fmtMAD(n?: number) {
  return n != null ? `${Math.round(n).toLocaleString('fr-FR')} MAD` : '—';
}
function daysUntil(d?: string): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
/** Same value written differently (case, accents, spaces, dashes, phone formatting). */
const plainValue = (v: unknown) =>
  String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const sameValue = (key: string, a: unknown, b: unknown) =>
  key === 'phone'
    ? plainValue(a).replace(/[^0-9]/g, '').slice(-9) === plainValue(b).replace(/[^0-9]/g, '').slice(-9)
    : plainValue(a) === plainValue(b);
type FieldState = 'identical' | 'new' | 'conflict';
const fieldState = (key: string, current: string, extracted: string): FieldState =>
  !current.trim() ? 'new' : sameValue(key, current, extracted) ? 'identical' : 'conflict';

// ── Edit form (unchanged real editing of the employee record) ─────────────────

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

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'profil' | 'fichiers' | 'documents' | 'conges' | 'paie' | 'performance';
type Extracted = NonNullable<AnalysisResult['extracted']>;

export type EmployeeFolderVals = {
  backTo: string;
  name: string; initials: string; avatarGradient: string;
  statusLabel: string; statusBg: string; statusColor: string; statusDot: string;
  positionLine: string; contractType: string; empCode: string; startDateLabel: string; cityLabel: string;
  showExpiryAlert: boolean; expiryTitle: string; expirySub: string; renew: () => void;
  email: string; editToast: () => void;
  tabs: { label: string; icon: LucideIcon; on: boolean; color: string; go: () => void }[];
  tProfil: boolean; tFiles: boolean; tDocs: boolean; tLeaves: boolean; tPay: boolean; tPerf: boolean;
  personal: { label: string; value: string; color: string }[];
  contractInfo: { label: string; value: string; color: string }[];
  completeness: number; ringDash: string;
  hasMissing: boolean; missingLabel: string; goFiles: () => void;
  hasSkillsOrLangs: boolean; skills: string[]; languages: string[];
  fileTypes: { label: string; on: boolean; color: string; pick: () => void }[];
  files: { name: string; type: string; size: string; missing: boolean; bg: string; color: string; download: () => void; reupload: () => void; rename: () => void; remove: () => void }[];
  fileCount: number;
  upload: () => void; drop: (f: File) => void;
  aiIdle: boolean; aiBusy: boolean; aiDone: boolean; aiApplied: boolean;
  analyze: () => void;
  extracted: { key: string; label: string; value: string; empty: boolean; conflict: boolean; current?: string; on: boolean; delay: string; toggle: () => void }[];
  selCount: number; noneSel: boolean;
  apply: () => void;
  docs: { title: string; by: string; lang: string; date: string; dir: 'rtl' | 'ltr'; delay: string; download: () => void }[];
  leaveAvailable: string; leaveTakenLabel: string; leaveTaken: string; leaveSickNote: string; leavePendingCount: string; leavePendingNote: string;
  leaves: { type: string; dates: string; days: string; status: string; bg: string; color: string }[];
  lastPayslip: { month: string; netFmt: string; cnssFmt: string; irFmt: string; grossFmt: string; netPct: number; cnssPct: number; irPct: number } | null;
  slips: { month: string; note: string; net: string; download: () => void }[];
  hasReview: boolean; reviewCycle: string; reviewScore: string; reviewStars: boolean[]; reviewLabel: string; reviewComment: string;
  goals: { title: string; pct: string; status: string; bg: string; color: string; bar: string }[];
  showToast: boolean; toastText: string;
};

/** "CV Hiba.pdf" → { name: "CV Hiba", ext: "pdf" }: the name is what the user edits, the extension is kept. */
const splitName = (n: string) => { const i = n.lastIndexOf('.'); return i > 0 && i < n.length - 1 ? { name: n.slice(0, i), ext: n.slice(i + 1) } : { name: n, ext: '' }; };

export default function EmployeeFolderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('profil');
  const [editing, setEditing] = useState(false);
  const [ftype, setFtype] = useState<EmployeeFile['file_type']>('cv');
  const [ai, setAi] = useState<'idle' | 'busy' | 'done' | 'applied'>('idle');
  const [pick, setPick] = useState<Record<string, boolean>>({});
  const [analysisResult, setAnalysisResult] = useState<Extracted | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);
  const [reuploadId, setReuploadId] = useState('');
  // naming step: a file is named before it is added, and an existing file can be renamed
  const [naming, setNaming] = useState<{ mode: 'upload'; file: File; name: string; ext: string } | { mode: 'rename'; id: string; name: string; ext: string; original: string } | null>(null);

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(id!),
    enabled: !!id,
  });
  // the floating « Ask Wedy » launcher suggests questions about this very employee
  const askName = employee?.full_name;
  useProvideAskPrompts(askName ? [tf(t('ask_emp_1'), { name: askName }), tf(t('ask_emp_2'), { name: askName }), tf(t('ask_emp_3'), { name: askName })] : null);

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });

  const { data: files = [] } = useQuery({
    queryKey: ['employee-files', id],
    queryFn: () => listEmployeeFiles(id!),
    enabled: !!id,
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['employee-docs', id],
    queryFn: () => listEmployeeDocuments(id!),
    enabled: tab === 'documents' && !!id,
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['employee-leaves', id],
    queryFn: () => listLeaveRequests({ employee_id: id! }),
    enabled: tab === 'conges' && !!id,
  });

  const { data: leaveBalance } = useQuery({
    queryKey: ['employee-leave-balance', id],
    queryFn: () => getLeaveBalance(id!),
    enabled: tab === 'conges' && !!id,
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ['employee-payslips', id],
    queryFn: () => listPayslips({ employee_id: id! }),
    enabled: tab === 'paie' && !!id,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['employee-goals', id],
    queryFn: () => listGoals({ employee_id: id! }),
    enabled: tab === 'performance' && !!id,
  });

  const { data: reviews = [] } = useQuery({
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
    onError: (e: unknown) => toast.error(getApiError(e, 'Error')),
  });

  const uploadMut = useMutation({
    mutationFn: ({ file, name }: { file: File; name: string }) => uploadEmployeeFile(id!, file, ftype, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-files', id] }); toast.success(t('save')); setNaming(null); },
    onError: (e: unknown) => toast.error(getApiError(e, 'Error')),
  });

  // a file whose bytes were lost keeps its record: one click puts it back with the same name and type
  const reuploadMut = useMutation({
    mutationFn: ({ fileId, file }: { fileId: string; file: File }) => replaceEmployeeFileContent(id!, fileId, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-files', id] }); toast.success(t('save')); },
    onError: (e: unknown) => toast.error(getApiError(e, 'Error')),
  });

  const renameMut = useMutation({
    mutationFn: ({ fileId, name }: { fileId: string; name: string }) => renameEmployeeFile(id!, fileId, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-files', id] }); toast.success(t('save')); setNaming(null); },
    onError: (e: unknown) => toast.error(getApiError(e, 'Error')),
  });

  const deleteMut = useMutation({
    mutationFn: (fileId: string) => deleteEmployeeFile(id!, fileId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-files', id] }); toast.success(t('delete')); },
    onError: (e: unknown) => toast.error(getApiError(e, 'Error')),
  });

  const analyzeMut = useMutation({
    mutationFn: () => analyzeEmployeeFolder(id!),
    onSuccess: (data) => { setAnalysisResult(data.extracted); setAi('done'); },
    onError: (e: unknown) => { toast.error(getApiError(e, "L'analyse du dossier a échoué")); setAi('idle'); },
  });

  const applyMut = useMutation({
    mutationFn: (fields: Record<string, unknown>) => applyAnalysis(id!, fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      setAi('applied');
      toast.success(t('save'));
    },
    onError: (e: unknown) => toast.error(getApiError(e, "Les données n'ont pas pu être enregistrées")),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>;
  if (isError || !employee) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)' }}>
      <p>{t('employee_not_found')}</p>
      <Button variant="ghost" onClick={() => navigate(employeesListUrl())}>← {t('cancel')}</Button>
    </div>
  );

  const days = daysUntil(employee.contract_end);
  const expiryWarn = days !== null && days <= 30;
  const status = STATUS_STYLE[employee.status] ?? STATUS_STYLE.active;
  const statusLabel = employee.status === 'active' ? t('status_active_item')
    : employee.status === 'intern' ? t('emp_stagiaires')
    : employee.status === 'on-leave' ? t('status_on_leave_item')
    : employee.status === 'terminated' ? t('status_terminated_item')
    : t('status_inactive_item');

  const val = (v?: string | number | null) => (v !== undefined && v !== null && v !== '' ? String(v) : '—');
  const col = (v?: string | number | null) => (v !== undefined && v !== null && v !== '' ? '#0a1c24' : '#a3b1b7');
  const cf = employee.custom_fields ?? {};

  const personal = [
    ['CIN', employee.cin], [t('birth_date_label'), fmt(employee.birth_date)], [t('nationality_label'), employee.nationality],
    [t('phone_label'), employee.phone], ['Email', employee.email], [t('city'), employee.city], [t('address'), employee.address],
  ].map(([label, v]) => ({ label: label as string, value: val(v as string), color: col(v as string) }));

  const contractInfo = [
    [t('contract_type_label'), employee.contract_type], [t('contract_start_label'), fmt(employee.contract_start)],
    [t('contract_end_label'), fmt(employee.contract_end)], [t('salary_label'), employee.salary ? fmtMAD(employee.salary) : undefined],
    [t('manager_label'), employee.manager], ['N° CNSS', cf.cnss_number], ['RIB', cf.bank_account],
  ].map(([label, v], i) => ({
    label: label as string, value: val(v as string),
    color: i === 2 && expiryWarn ? '#b8402c' : col(v as string),
  }));

  const allFields = [...personal, ...contractInfo];
  const filledCount = allFields.filter(f => f.value !== '—').length;
  const completeness = allFields.length ? Math.round((filledCount / allFields.length) * 100) : 0;
  const missing = allFields.filter(f => f.value === '—').map(f => f.label.toLowerCase());
  const C = 2 * Math.PI * 34;

  // ── AI folder analysis: diff extracted vs current, only empty/different fields are shown ──
  const APPLY_FIELDS: { key: keyof Extracted; label: string; emp?: keyof Employee }[] = [
    { key: 'full_name', label: t('full_name_label'), emp: 'full_name' }, { key: 'cin', label: 'CIN', emp: 'cin' },
    { key: 'matricule', label: 'Matricule', emp: 'matricule' }, { key: 'email', label: 'Email', emp: 'email' },
    { key: 'phone', label: t('phone_label'), emp: 'phone' }, { key: 'birth_date', label: t('birth_date_label'), emp: 'birth_date' },
    { key: 'nationality', label: t('nationality_label'), emp: 'nationality' }, { key: 'position', label: t('position_label'), emp: 'position' },
    { key: 'department', label: t('department_label'), emp: 'department' }, { key: 'salary', label: t('salary_label'), emp: 'salary' },
    { key: 'hire_date', label: t('hire_date_label'), emp: 'hire_date' }, { key: 'contract_type', label: t('contract_type_label'), emp: 'contract_type' },
    { key: 'contract_start', label: t('contract_start_label'), emp: 'contract_start' }, { key: 'contract_end', label: t('contract_end_label'), emp: 'contract_end' },
    { key: 'manager', label: t('manager_label'), emp: 'manager' }, { key: 'address', label: t('address'), emp: 'address' },
    { key: 'city', label: t('city'), emp: 'city' }, { key: 'cnss_number', label: 'N° CNSS' }, { key: 'bank_account', label: 'RIB' },
  ];
  const extracted: EmployeeFolderVals['extracted'] = [];
  if (analysisResult) {
    APPLY_FIELDS.forEach((f, i) => {
      const extractedVal = analysisResult[f.key];
      if (extractedVal === undefined || extractedVal === null || extractedVal === '' || Array.isArray(extractedVal)) return;
      const current = f.emp ? String((employee as Record<string, unknown>)[f.emp as string] ?? '') : '';
      const state = fieldState(f.key as string, current, String(extractedVal));
      if (state === 'identical') return;
      const unverified = !!analysisResult._unverified?.includes(f.key as string);
      const isNew = state === 'new';
      extracted.push({
        key: f.key as string, label: f.label, value: String(extractedVal),
        empty: isNew, conflict: state === 'conflict' && !unverified, current: current || undefined,
        on: pick[f.key as string] ?? isNew, delay: String(i * 90),
        toggle: () => setPick(p => ({ ...p, [f.key as string]: !(p[f.key as string] ?? isNew) })),
      });
    });
  }
  const selCount = extracted.filter(x => x.on).length;

  const sortedReviews = [...reviews].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  const lastReview = sortedReviews[0] as PerformanceReview | undefined;
  const reviewScore5 = lastReview?.overall_score ? lastReview.overall_score : 0;
  const reviewLabelOf = (score: number) =>
    score >= 4.5 ? t('emf_depasse_les_attentes') : score >= 3.5 ? t('review_label_meets') : score >= 2.5 ? t('review_label_below') : t('review_label_unsatisfactory');

  const sortedPayslips = [...payslips].sort((a, b) => (b.period_year - a.period_year) || (b.period_month - a.period_month));
  const latest = sortedPayslips[0] as Payslip | undefined;
  const latestTotal = latest ? latest.net_salary + latest.cnss_deduction + latest.amo_deduction + latest.ir_deduction : 0;
  const pct = (n: number) => (latest && latestTotal > 0 ? Math.round((n / latestTotal) * 100) : 0);

  const leaveDaysTotal = leaveBalance ? leaveBalance.annual_total - leaveBalance.annual_used : null;
  const leaveTakenTotal = leaveBalance ? leaveBalance.annual_used + leaveBalance.sick_used + leaveBalance.personal_used : null;
  const pendingLeaves = leaves.filter(l => l.status === 'pending');

  const v: EmployeeFolderVals = {
    backTo: employeesListUrl(),
    name: employee.full_name, initials: initialsOf(employee.full_name), avatarGradient: avatarGradient(employee.full_name),
    statusLabel, statusBg: status.bg, statusColor: status.color, statusDot: status.dot,
    positionLine: [employee.position, employee.department].filter(Boolean).join(' · ') || '—',
    contractType: employee.contract_type ?? '', empCode: employee.matricule ?? '',
    startDateLabel: employee.hire_date ? `${t('emf_depuis_le')} ${fmt(employee.hire_date)}` : '', cityLabel: employee.city ?? '',
    showExpiryAlert: expiryWarn,
    expiryTitle: days !== null && days < 0 ? t('contract_expired') : `${t('expiring_soon')} : ${days}j`,
    expirySub: employee.contract_end ? `${employee.contract_type ?? ''} ${t('emf_jusqu_au')} ${fmt(employee.contract_end)}`.trim() : '',
    renew: () => navigate(`/app/generate?employee_id=${employee.id}`),
    email: employee.email ?? '', editToast: () => setEditing(true),
    tabs: [
      { key: 'profil', label: t('tab_profile'), icon: User },
      { key: 'fichiers', label: t('tab_files'), icon: Folder },
      { key: 'documents', label: t('tab_docs'), icon: FileText },
      { key: 'conges', label: t('tab_leaves'), icon: Calendar },
      { key: 'paie', label: t('tab_payroll'), icon: Wallet },
      { key: 'performance', label: t('tab_performance'), icon: TrendingUp },
    ].map(x => ({ label: x.label, icon: x.icon, on: tab === x.key, color: tab === x.key ? '#ffffff' : '#52646d', go: () => setTab(x.key as Tab) })),
    tProfil: tab === 'profil', tFiles: tab === 'fichiers', tDocs: tab === 'documents', tLeaves: tab === 'conges', tPay: tab === 'paie', tPerf: tab === 'performance',
    personal, contractInfo, completeness, ringDash: `${(C * completeness / 100).toFixed(1)}px ${C.toFixed(1)}px`,
    hasMissing: missing.length > 0, missingLabel: missing.length ? `${t('emf_manquant')} : ${missing.join(', ')}.` : t('emf_toutes_les_informations'),
    goFiles: () => setTab('fichiers'),
    hasSkillsOrLangs: !!(employee.skills?.length || employee.languages?.length), skills: employee.skills ?? [], languages: employee.languages ?? [],
    fileTypes: FILE_TYPES.map(f => ({ label: f.label, on: ftype === f.value, color: ftype === f.value ? '#ffffff' : '#52646d', pick: () => setFtype(f.value) })),
    files: (files as EmployeeFile[]).map(f => {
      const style = [...FILE_TYPES, ...LEGACY_FILE_TYPES].find(x => x.value === f.file_type) ?? FILE_TYPES[4];
      const sizeKb = f.file_size ? (f.file_size < 1024 * 1024 ? `${Math.round(f.file_size / 1024)} Ko` : `${(f.file_size / (1024 * 1024)).toFixed(1)} Mo`) : '';
      return {
        name: f.name, type: style.label, size: sizeKb, missing: f.available === false, bg: style.bg, color: style.color,
        download: () => downloadEmployeeFile(f.file_path, f.name).catch((e: unknown) => toast.error(isFileMissing(e) ? t('emf_file_missing') : getApiError(e, 'Error'))),
        reupload: () => { setReuploadId(f.id); reuploadRef.current?.click(); },
        rename: () => setNaming({ mode: 'rename', id: f.id, original: f.name, ...splitName(f.name) }),
        remove: () => { if (confirm(`${t('delete')} "${f.name}" ?`)) deleteMut.mutate(f.id); },
      };
    }),
    fileCount: files.length,
    upload: () => fileInputRef.current?.click(),
    drop: (f: File) => setNaming({ mode: 'upload', file: f, ...splitName(f.name) }),
    aiIdle: ai === 'idle', aiBusy: ai === 'busy', aiDone: ai === 'done', aiApplied: ai === 'applied',
    analyze: () => { setPick({}); setAi('busy'); analyzeMut.mutate(); },
    extracted, selCount, noneSel: selCount === 0,
    apply: () => {
      const fields: Record<string, unknown> = {};
      extracted.filter(x => x.on).forEach(x => { fields[x.key] = x.value; });
      applyMut.mutate(fields);
    },
    docs: (docs as GeneratedDoc[]).map((d, i) => ({
      title: d.document_type, by: '', lang: d.language.toUpperCase(), date: new Date(d.created_at).toLocaleDateString(),
      dir: d.language === 'ar' ? 'rtl' : 'ltr', delay: String(i * 60),
      download: () => printDocument(d.id, d.document_type).catch((e: unknown) => toast.error(getApiError(e, 'Error'))),
    })),
    leaveAvailable: leaveDaysTotal != null ? `${leaveDaysTotal.toLocaleString('fr-FR')} j` : '—',
    leaveTakenLabel: t('emf_pris_cette_annee'), leaveTaken: leaveTakenTotal != null ? `${leaveTakenTotal.toLocaleString('fr-FR')} j` : '—',
    leaveSickNote: leaveBalance && leaveBalance.sick_used > 0 ? `${t('emf_dont')} ${leaveBalance.sick_used} ${t('emf_j_de_maladie')}` : '',
    leavePendingCount: String(pendingLeaves.length), leavePendingNote: pendingLeaves.length === 0 ? t('emf_aucune_demande') : '',
    leaves: (leaves as LeaveRequest[]).map(l => {
      const s = LEAVE_STYLE[l.status] ?? LEAVE_STYLE.pending;
      const statusLbl = l.status === 'approved' ? t('status_approved_item') : l.status === 'rejected' ? t('status_rejected_item') : t('status_pending_item');
      return { type: l.type, dates: `${fmt(l.start_date)} → ${fmt(l.end_date)}`, days: `${l.days} j`, status: statusLbl, bg: s.bg, color: s.color };
    }),
    lastPayslip: latest ? {
      month: new Date(latest.period_year, latest.period_month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      netFmt: fmtMAD(latest.net_salary), cnssFmt: fmtMAD(latest.cnss_deduction + latest.amo_deduction), irFmt: fmtMAD(latest.ir_deduction), grossFmt: fmtMAD(latest.gross_salary),
      netPct: pct(latest.net_salary), cnssPct: pct(latest.cnss_deduction + latest.amo_deduction), irPct: pct(latest.ir_deduction),
    } : null,
    slips: sortedPayslips.map(p => ({
      month: new Date(p.period_year, p.period_month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      note: fmtMAD(p.gross_salary), net: fmtMAD(p.net_salary),
      download: () => toast.info(t('emf_bulletin_indisponible')),
    })),
    hasReview: !!lastReview, reviewCycle: lastReview?.cycle ?? '', reviewScore: reviewScore5.toLocaleString('fr-FR'),
    reviewStars: [1, 2, 3, 4, 5].map(i => i <= Math.round(reviewScore5)),
    reviewLabel: lastReview ? reviewLabelOf(reviewScore5) : '', reviewComment: lastReview?.comments ?? '',
    goals: (goals as PerformanceGoal[]).map(g => ({
      title: g.title, pct: String(g.progress), status: g.status === 'completed' ? t('status_completed_item') : t('status_active_item'),
      bg: g.status === 'completed' ? '#e1f5ec' : '#e4f2f4', color: g.status === 'completed' ? '#0f6f49' : '#0b5f72',
      bar: g.status === 'completed' ? '#16a06b' : 'linear-gradient(90deg,#0e6f84,#16b6c8)',
    })),
    showToast: false, toastText: '',
  };

  return (
    <>
      <EmployeeFolderView v={v} />
      <input
        ref={fileInputRef} type="file" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) setNaming({ mode: 'upload', file: f, ...splitName(f.name) }); e.target.value = ''; }}
      />
      <input
        ref={reuploadRef} type="file" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f && reuploadId) reuploadMut.mutate({ fileId: reuploadId, file: f }); e.target.value = ''; }}
      />
      <Modal
        open={!!naming} onClose={() => setNaming(null)} width={460}
        title={naming?.mode === 'rename' ? t('emf_fn_rename_title') : t('emf_fn_title')}
        subtitle={naming ? (naming.mode === 'rename' ? naming.original : naming.file.name) : undefined}
        footer={naming && (
          <>
            <Button variant="secondary" onClick={() => setNaming(null)}>{t('cancel')}</Button>
            <Button disabled={!naming.name.trim() || uploadMut.isPending || renameMut.isPending} loading={uploadMut.isPending || renameMut.isPending}
              onClick={() => (naming.mode === 'upload' ? uploadMut.mutate({ file: naming.file, name: naming.name }) : renameMut.mutate({ fileId: naming.id, name: naming.name }))}>
              {naming.mode === 'upload' ? t('emf_fn_add') : t('save')}
            </Button>
          </>
        )}
      >
        {naming && (
          <Input
            autoFocus label={t('emf_fn_label')} value={naming.name} maxLength={140}
            onChange={e => setNaming({ ...naming, name: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter' && naming.name.trim()) { e.preventDefault(); if (naming.mode === 'upload') uploadMut.mutate({ file: naming.file, name: naming.name }); else renameMut.mutate({ fileId: naming.id, name: naming.name }); } }}
            hint={naming.ext ? tf(t('emf_fn_hint'), { ext: naming.ext }) : undefined}
          />
        )}
      </Modal>
      <Modal open={editing} onClose={() => setEditing(false)} title={t('edit_profile')} width={740}>
        <EditForm
          employee={employee}
          departments={departments}
          onSave={data => updateMut.mutate(data)}
          onCancel={() => setEditing(false)}
          loading={updateMut.isPending}
        />
      </Modal>
    </>
  );
}
