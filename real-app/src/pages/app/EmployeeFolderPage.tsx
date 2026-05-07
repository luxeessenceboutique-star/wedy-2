import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, Wand2, Upload, Trash2, Download, FileText,
  User, Briefcase, MapPin, AlertTriangle, X, Sparkles,
  CheckCircle2, Circle, ChevronDown, ChevronUp, GraduationCap,
} from 'lucide-react';
import {
  getEmployee, updateEmployee, listEmployeeDocuments, listEmployeeFiles,
  uploadEmployeeFile, deleteEmployeeFile, getEmployeeFileUrl,
  listLeaveRequests, listPayslips, listGoals, listReviews,
  downloadDoc, printDocument, listDepartments,
  analyzeEmployeeFolder, applyAnalysis,
  type Employee, type GeneratedDoc, type EmployeeFile,
  type LeaveRequest, type Payslip, type PerformanceGoal, type PerformanceReview,
  type AnalysisResult,
} from '../../lib/api';
import { Avatar, Badge, Button, Card, Modal, Input, Select, Spinner } from '../../components/ui';
import { toast } from 'sonner';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', inactive: 'danger', 'on-leave': 'warning', terminated: 'danger',
};

const FILE_TYPES = [
  { value: 'cv', label: 'CV', color: '#0891b2', bg: '#ecfeff' },
  { value: 'diplome', label: 'Diplôme', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'certificat', label: 'Certificat', color: '#059669', bg: '#ecfdf5' },
  { value: 'contrat', label: 'Contrat', color: '#d97706', bg: '#fffbeb' },
  { value: 'autre', label: 'Autre', color: '#64748b', bg: '#f8fafc' },
];

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'ANAPEC', 'Consultant', 'Freelance'];

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const LEAVE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'En attente' },
  approved: { bg: '#d1fae5', color: '#065f46', label: 'Approuvé' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejeté' },
};

const GOAL_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: '#f1f5f9', color: '#475569', label: 'À faire' },
  in_progress: { bg: '#eff6ff', color: '#1d4ed8', label: 'En cours' },
  completed: { bg: '#d1fae5', color: '#065f46', label: 'Terminé' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Annulé' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d?: string) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--fg-muted)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontWeight: 450, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '20px 0 8px' }}>
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
  return <p style={{ textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, padding: '32px 0' }}>{text}</p>;
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function EditForm({ employee, departments, onSave, onCancel, loading }: {
  employee: Employee;
  departments: { id: string; name: string }[];
  onSave: (data: Partial<Employee>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<Partial<Employee>>(employee);
  const set = (k: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={ev => { ev.preventDefault(); onSave(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Identité</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Nom complet *" value={form.full_name ?? ''} onChange={set('full_name')} required />
        <Input label="CIN" value={form.cin ?? ''} onChange={set('cin')} />
        <Input label="Matricule" value={form.matricule ?? ''} onChange={set('matricule')} />
        <Input label="Date naissance" type="date" value={form.birth_date ?? ''} onChange={set('birth_date')} />
        <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} />
        <Input label="Téléphone" value={form.phone ?? ''} onChange={set('phone')} />
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Poste & Contrat</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Poste" value={form.position ?? ''} onChange={set('position')} />
        <Select label="Département" value={form.department ?? ''} onChange={set('department')}>
          <option value="">— Sélectionner —</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </Select>
        <Input label="Manager (N+1)" value={form.manager ?? ''} onChange={set('manager')} />
        <Input label="Salaire (MAD)" type="number" value={form.salary ?? ''} onChange={set('salary')} />
        <Select label="Type de contrat" value={form.contract_type ?? ''} onChange={set('contract_type')}>
          {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select label="Statut" value={form.status ?? 'active'} onChange={set('status')}>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
          <option value="on-leave">En congé</option>
          <option value="terminated">Résilié</option>
        </Select>
        <Input label="Date d'embauche" type="date" value={form.hire_date ?? ''} onChange={set('hire_date')} />
        <Input label="Début contrat" type="date" value={form.contract_start ?? ''} onChange={set('contract_start')} />
        <Input label="Fin contrat" type="date" value={form.contract_end ?? ''} onChange={set('contract_end')} />
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Adresse</p>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Input label="Adresse" value={form.address ?? ''} onChange={set('address')} />
        <Input label="Ville" value={form.city ?? ''} onChange={set('city')} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>Enregistrer</Button>
      </div>
    </form>
  );
}

// ── Files tab ─────────────────────────────────────────────────────────────────

function FilesTab({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState('cv');
  const [dragging, setDragging] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['employee-files', employeeId],
    queryFn: () => listEmployeeFiles(employeeId),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadEmployeeFile(employeeId, file, uploadType),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-files', employeeId] }); toast.success('Fichier ajouté'); },
    onError: () => toast.error('Échec du téléversement'),
  });

  const deleteMut = useMutation({
    mutationFn: (fileId: string) => deleteEmployeeFile(employeeId, fileId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-files', employeeId] }); toast.success('Fichier supprimé'); },
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
          border: `2px dashed ${dragging ? 'var(--primary)' : '#cbd5e1'}`,
          borderRadius: 12, padding: '28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          cursor: 'pointer', background: dragging ? 'var(--primary-soft)' : '#f8fafc',
          transition: 'all 0.15s',
        }}
      >
        <Upload size={28} style={{ color: dragging ? 'var(--primary)' : '#94a3b8' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>Déposer des fichiers ici</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>PDF, DOCX, JPG, PNG — cliquez pour sélectionner</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Type :</span>
          <select
            value={uploadType}
            onChange={e => { e.stopPropagation(); setUploadType(e.target.value); }}
            onClick={e => e.stopPropagation()}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer' }}
          >
            {FILE_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
          </select>
        </div>
        {uploadMut.isPending && <Spinner />}
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* File list */}
      {isLoading ? <MiniSpinner /> : files.length === 0 ? (
        <Empty text="Aucun fichier — ajoutez un CV, diplôme ou certificat." />
      ) : (
        grouped.map(group => (
          <div key={group.value}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: group.bg, color: group.color,
              }}>{group.label}</span>
              <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{group.items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.items.map((f: EmployeeFile) => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: '#fff',
                }}>
                  <FileText size={16} style={{ color: group.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-muted)' }}>
                      {fmtSize(f.file_size)} · {fmt(f.created_at)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <a href={getEmployeeFileUrl(f.file_path)} target="_blank" rel="noreferrer">
                      <button style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={12} /> Télécharger
                      </button>
                    </a>
                    <button
                      onClick={() => { if (confirm(`Supprimer "${f.name}" ?`)) deleteMut.mutate(f.id); }}
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

const APPLY_FIELDS: { key: keyof ExtractedData; label: string; emp?: keyof Employee }[] = [
  { key: 'full_name', label: 'Nom complet', emp: 'full_name' },
  { key: 'cin', label: 'CIN', emp: 'cin' },
  { key: 'matricule', label: 'Matricule', emp: 'matricule' },
  { key: 'email', label: 'Email', emp: 'email' },
  { key: 'phone', label: 'Téléphone', emp: 'phone' },
  { key: 'birth_date', label: 'Date naissance', emp: 'birth_date' },
  { key: 'nationality', label: 'Nationalité', emp: 'nationality' },
  { key: 'position', label: 'Poste', emp: 'position' },
  { key: 'department', label: 'Département', emp: 'department' },
  { key: 'salary', label: 'Salaire (MAD)', emp: 'salary' },
  { key: 'hire_date', label: "Date d'embauche", emp: 'hire_date' },
  { key: 'contract_type', label: 'Type contrat', emp: 'contract_type' },
  { key: 'contract_start', label: 'Début contrat', emp: 'contract_start' },
  { key: 'contract_end', label: 'Fin contrat', emp: 'contract_end' },
  { key: 'manager', label: 'Manager', emp: 'manager' },
  { key: 'address', label: 'Adresse', emp: 'address' },
  { key: 'city', label: 'Ville', emp: 'city' },
  { key: 'cnss_number', label: 'N° CNSS' },
  { key: 'bank_account', label: 'RIB' },
  { key: 'notes', label: 'Notes', emp: 'notes' },
];

function AnalysisPanel({ employee, result, onApply, onClose, applying }: {
  employee: Employee;
  result: ExtractedData;
  onApply: (fields: Record<string, unknown>) => void;
  onClose: () => void;
  applying: boolean;
}) {
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
        <p style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: '24px 0' }}>Aucune donnée extractible trouvée dans les fichiers.</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
            {selected.size} champ{selected.size !== 1 ? 's' : ''} sélectionné{selected.size !== 1 ? 's' : ''} — cochez les champs à appliquer au profil.
          </p>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '24px 110px 1fr 1fr', gap: 8, padding: '6px 6px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            <div />
            {['Champ', 'Valeur actuelle', 'Valeur extraite'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
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
                    background: isChecked ? (isNew ? '#f0fdf4' : '#eff6ff') : '#fafafa',
                    border: `1px solid ${isChecked ? (isNew ? '#86efac' : '#bfdbfe') : 'transparent'}`,
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {isChecked
                      ? <CheckCircle2 size={15} style={{ color: isNew ? '#16a34a' : '#2563eb' }} />
                      : <Circle size={15} style={{ color: '#cbd5e1' }} />}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{f.label}</span>
                  <span style={{ fontSize: 12, color: current ? '#475569' : '#94a3b8', fontStyle: current ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {current || '—'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: isDiff ? 600 : 400, color: isNew ? '#15803d' : isDiff ? '#1d4ed8' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        <div style={{ marginTop: 18, padding: '14px 0 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-muted)', marginBottom: 10 }}>
            Informations supplémentaires (lecture seule)
          </p>
          {result.education?.length ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <GraduationCap size={13} style={{ color: '#7c3aed' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Formation</span>
              </div>
              {result.education.map((e, i) => (
                <p key={i} style={{ margin: 0, fontSize: 12, color: '#475569', paddingLeft: 20, lineHeight: 1.7 }}>
                  {[e.degree, e.field, e.school, e.year].filter(Boolean).join(' · ')}
                </p>
              ))}
            </div>
          ) : null}
          {result.certifications?.length ? (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Certifications</p>
              {result.certifications.map((c, i) => (
                <p key={i} style={{ margin: 0, fontSize: 12, color: '#475569', paddingLeft: 20, lineHeight: 1.7 }}>
                  {[c.name, c.issuer, c.year].filter(Boolean).join(' · ')}
                </p>
              ))}
            </div>
          ) : null}
          {result.skills?.length ? (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Compétences</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 20 }}>
                {result.skills.map((s, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', color: '#475569' }}>{s}</span>
                ))}
              </div>
            </div>
          ) : null}
          {result.languages?.length ? (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Langues</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 20 }}>
                {result.languages.map((l, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#eff6ff', color: '#1d4ed8' }}>{l}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <Button variant="ghost" onClick={onClose}>Fermer</Button>
        <Button onClick={handleApply} loading={applying} disabled={selected.size === 0}>
          <CheckCircle2 size={13} /> Appliquer les champs sélectionnés
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

  const { data: docs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['employee-docs', id],
    queryFn: () => listEmployeeDocuments(id!),
    enabled: tab === 'documents' && !!id,
  });

  const { data: leaves = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['employee-leaves', id],
    queryFn: () => listLeaveRequests({ employee_id: id }),
    enabled: tab === 'conges' && !!id,
  });

  const { data: payslips = [], isLoading: payLoading } = useQuery({
    queryKey: ['employee-payslips', id],
    queryFn: () => listPayslips({ employee_id: id }),
    enabled: tab === 'paie' && !!id,
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['employee-goals', id],
    queryFn: () => listGoals({ employee_id: id }),
    enabled: tab === 'performance' && !!id,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['employee-reviews', id],
    queryFn: () => listReviews({ employee_id: id }),
    enabled: tab === 'performance' && !!id,
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<Employee>) => updateEmployee(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      setEditing(false);
      toast.success('Profil mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const analyzeMut = useMutation({
    mutationFn: () => analyzeEmployeeFolder(id!),
    onSuccess: (data) => {
      setAnalysisResult(data.extracted);
      setAnalysisOpen(true);
    },
    onError: (e: Error) => toast.error(`Analyse échouée : ${e.message}`),
  });

  const applyMut = useMutation({
    mutationFn: (fields: Record<string, unknown>) => applyAnalysis(id!, fields),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      setAnalysisOpen(false);
      toast.success('Profil mis à jour avec les données extraites');
    },
    onError: () => toast.error("Erreur lors de l'application des données"),
  });

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>
  );
  if (isError || !employee) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>
      <p>Employé introuvable.</p>
      <Button variant="ghost" onClick={() => navigate('/app/employees')}>← Retour</Button>
    </div>
  );

  const days = daysUntil(employee.contract_end);
  const expiryWarn = days !== null && days <= 30;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profil', label: 'Profil' },
    { key: 'fichiers', label: 'Fichiers' },
    { key: 'documents', label: 'Documents' },
    { key: 'conges', label: 'Congés' },
    { key: 'paie', label: 'Paie' },
    { key: 'performance', label: 'Performance' },
  ];

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Back link */}
      <button
        onClick={() => navigate('/app/employees')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 13, marginBottom: 20, padding: 0 }}
      >
        <ArrowLeft size={14} /> Retour aux employés
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
                  {days! < 0 ? `Contrat expiré` : `Expire dans ${days}j`}
                </Badge>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-muted)' }}>
              {[employee.position, employee.department].filter(Boolean).join(' · ') || '—'}
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              {employee.cin && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}><strong>CIN:</strong> {employee.cin}</span>}
              {employee.matricule && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}><strong>Matricule:</strong> {employee.matricule}</span>}
              {employee.hire_date && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}><strong>Embauche:</strong> {fmt(employee.hire_date)}</span>}
              {employee.contract_type && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}><strong>Contrat:</strong> {employee.contract_type}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Modifier
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => analyzeMut.mutate()}
              loading={analyzeMut.isPending}
              style={{ color: '#7c3aed', borderColor: '#ddd8fe' }}
            >
              <Sparkles size={13} /> Analyser le dossier
            </Button>
            <Link to={`/app/generate?employee_id=${employee.id}`}>
              <Button size="sm"><Wand2 size={13} /> Générer doc</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Contract expiry alert */}
      {expiryWarn && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 10,
          background: days! < 0 ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${days! < 0 ? '#fecaca' : '#fde68a'}`,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          color: days! < 0 ? '#dc2626' : '#92400e',
        }}>
          <AlertTriangle size={15} />
          {days! < 0
            ? `Le contrat de ${employee.full_name} a expiré depuis ${Math.abs(days!)} jours.`
            : `Le contrat de ${employee.full_name} expire dans ${days} jour${days !== 1 ? 's' : ''}.`
          }
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.key ? 600 : 400, whiteSpace: 'nowrap',
            color: tab === t.key ? 'var(--primary)' : 'var(--fg-muted)',
            borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profil tab ─────────────────────────────────────────────────── */}
      {tab === 'profil' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <User size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Identité</span>
            </div>
            <InfoRow label="Nom complet" value={employee.full_name} />
            <InfoRow label="CIN" value={employee.cin} />
            <InfoRow label="Matricule" value={employee.matricule} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Téléphone" value={employee.phone} />
            <InfoRow label="Date naissance" value={fmt(employee.birth_date)} />
            <InfoRow label="Nationalité" value={employee.nationality} />
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Briefcase size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Poste & Contrat</span>
            </div>
            <InfoRow label="Poste" value={employee.position} />
            <InfoRow label="Département" value={employee.department} />
            <InfoRow label="Manager" value={employee.manager} />
            <InfoRow label="Type contrat" value={employee.contract_type} />
            <InfoRow label="Statut" value={employee.status} />
            <InfoRow label="Date embauche" value={fmt(employee.hire_date)} />
            <InfoRow label="Début contrat" value={fmt(employee.contract_start)} />
            <InfoRow label="Fin contrat" value={fmt(employee.contract_end)} />
            <InfoRow label="Salaire" value={employee.salary ? `${Number(employee.salary).toLocaleString('fr-FR')} MAD` : undefined} />
          </Card>

          {(employee.address || employee.city) && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MapPin size={14} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Adresse</span>
              </div>
              <InfoRow label="Adresse" value={employee.address} />
              <InfoRow label="Ville" value={employee.city} />
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
              <span style={{ fontWeight: 600, fontSize: 14 }}>Champs personnalisés</span>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {Object.entries(employee.custom_fields).map(([key, value]) => (
                  <div key={key} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{key}</p>
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
              <Button size="sm"><Wand2 size={13} /> Générer un document</Button>
            </Link>
          </div>
          {docsLoading ? <MiniSpinner /> : docs.length === 0 ? (
            <Empty text="Aucun document généré pour cet employé." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(docs as GeneratedDoc[]).map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 8,
                  border: '1px solid var(--border)', background: '#fff',
                }}>
                  <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.document_type}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-muted)' }}>
                      {new Date(doc.created_at).toLocaleDateString('fr-FR')} · {doc.language.toUpperCase()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => printDocument(doc.id, doc.document_type).catch(e => toast.error(e.message))}
                    >
                      <Download size={11} /> PDF
                    </button>
                    {(!doc.signature_status || doc.signature_status === 'pending') && (
                      <button
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--primary)', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={async () => {
                          try {
                            const { sendForSignature } = await import('../../lib/api');
                            const res = await sendForSignature(doc.id);
                            toast.success("Demande de signature envoyée");

                            // Mocking the copy to clipboard for the demo
                            const link = `${window.location.origin}/sign/${res.token}`;
                            navigator.clipboard.writeText(link);
                            toast.info(`Lien copié: ${link}`);

                            refetchDocs();
                          } catch (e: any) { toast.error(e.response?.data?.detail || "Erreur"); }
                        }}
                      >
                        <FileSignature size={11} /> {doc.signature_status === 'pending' ? 'Renvoyer' : 'Signer'}
                      </button>
                    )}
                    {doc.signature_status === 'signed' && (
                      <Badge variant="success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} /> Signé</Badge>
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
          <Empty text="Aucune demande de congé." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(leaves as LeaveRequest[]).map(l => {
              const s = LEAVE_STYLE[l.status] ?? LEAVE_STYLE.pending;
              return (
                <div key={l.id} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{l.type}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
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
          <Empty text="Aucun bulletin de paie." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(payslips as Payslip[]).map(p => (
              <div key={p.id} style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{MONTHS_FR[p.period_month - 1]} {p.period_year}</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{p.net_salary.toLocaleString('fr-FR')} MAD</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[['Brut', p.gross_salary], ['CNSS', p.cnss_deduction], ['AMO', p.amo_deduction], ['IR', p.ir_deduction]].map(([l, v]) => (
                    <div key={String(l)} style={{ background: 'var(--bg-muted)', borderRadius: 6, padding: '6px 10px', textAlign: 'center' as const }}>
                      <p style={{ margin: 0, fontSize: 10, color: 'var(--fg-subtle)', textTransform: 'uppercase' as const }}>{l}</p>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{Number(v).toLocaleString('fr-FR')}</p>
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
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-muted)', marginBottom: 10 }}>Objectifs</p>
            {goalsLoading ? <MiniSpinner /> : goals.length === 0 ? (
              <Empty text="Aucun objectif assigné." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(goals as PerformanceGoal[]).map(g => {
                  const gs = GOAL_STYLE[g.status] ?? GOAL_STYLE.pending;
                  return (
                    <div key={g.id} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{g.title}</p>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: gs.bg, color: gs.color }}>{gs.label}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: g.progress === 100 ? '#10b981' : 'var(--primary)', width: `${g.progress}%` }} />
                      </div>
                      <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--fg-muted)' }}>{g.progress}%</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--fg-muted)', marginBottom: 10 }}>Évaluations</p>
            {reviewsLoading ? <MiniSpinner /> : reviews.length === 0 ? (
              <Empty text="Aucune évaluation enregistrée." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(reviews as PerformanceReview[]).map(r => (
                  <div key={r.id} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>Cycle {r.cycle}</p>
                      {r.overall_score
                        ? <span style={{ display: 'flex', gap: 2 }}>{[1, 2, 3, 4, 5].map(i => <span key={i} style={{ fontSize: 14, color: i <= r.overall_score! ? '#f59e0b' : '#e2e8f0' }}>★</span>)}</span>
                        : <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic' }}>En attente</span>
                      }
                    </div>
                    {r.comments && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5 }}>{r.comments}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Modifier le profil" width={740}>
        <EditForm
          employee={employee}
          departments={departments}
          onSave={data => updateMut.mutate(data)}
          onCancel={() => setEditing(false)}
          loading={updateMut.isPending}
        />
      </Modal>

      {/* Analysis modal */}
      <Modal open={analysisOpen} onClose={() => setAnalysisOpen(false)} title="Analyse IA du dossier" width={820}>
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
