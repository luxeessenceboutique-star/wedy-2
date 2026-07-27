import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, FileText, ChevronDown, ChevronUp, FileUp, Eye, X, Upload, Download } from 'lucide-react';
import { listEmployees, createEmployee, updateEmployee, deleteEmployee, listDepartments, listContractTypes, getApiError } from '@/services/api';
import type { Employee } from '@/services/api';
import { Button, Badge, Card, Input, Select, Modal, Spinner, Empty, Avatar } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { CVImportModal } from '@/components/employees/CVImportModal';
import { SmartImportModal } from '@/components/employees/SmartImportModal';
import { ExportModal } from '@/components/employees/ExportModal';
import { DepartmentsModal } from '@/components/employees/DepartmentsModal';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/lang';

const EMPLOYEE_COLS = [
  { key: 'full_name',      label: 'Nom complet',       required: true },
  { key: 'cin',            label: 'CIN' },
  { key: 'email',          label: 'Email' },
  { key: 'phone',          label: 'Téléphone' },
  { key: 'position',       label: 'Poste' },
  { key: 'department',     label: 'Département' },
  { key: 'status',         label: 'Statut' },
  { key: 'contract_type',  label: 'Type de contrat' },
  { key: 'hire_date',      label: "Date d'embauche" },
  { key: 'contract_start', label: 'Début contrat' },
  { key: 'contract_end',   label: 'Fin contrat' },
  { key: 'salary',         label: 'Salaire' },
  { key: 'birth_date',     label: 'Date de naissance' },
  { key: 'address',        label: 'Adresse' },
  { key: 'city',           label: 'Ville' },
  { key: 'nationality',    label: 'Nationalité' },
  { key: 'manager',        label: 'Manager' },
  { key: 'matricule',      label: 'Matricule' },
  { key: 'skills',         label: 'Compétences' },
  { key: 'languages',      label: 'Langues' },
  { key: 'notes',          label: 'Notes' },
];

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', inactive: 'danger', 'on-leave': 'warning',
};

// CONTRACT_TYPES is now loaded dynamically via useQuery + listContractTypes
const today = new Date().toISOString().split('T')[0];

type TagField = 'skills' | 'languages' | 'certifications';

function TagInput({ label, values, onChange }: {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4 }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 8, minHeight: 38, background: 'var(--surface)' }}>
        {values.map((v, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: 6, padding: '2px 8px', fontSize: 12, border: '1px solid var(--primary-line)' }}>
            {v}
            <X size={10} style={{ cursor: 'pointer' }} onClick={() => onChange(values.filter((_, j) => j !== i))} />
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          onBlur={add}
          placeholder="Taper + Entrée"
          style={{ border: 'none', outline: 'none', fontSize: 12, minWidth: 100, flex: 1, background: 'transparent' }}
        />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 0' }}>
      {children}
    </p>
  );
}

function EmployeeForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Employee>; onSave: (data: Partial<Employee>) => void; onCancel: () => void; loading: boolean;
}) {
  const isAdd = !initial?.id;
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const { data: contractTypes = [] } = useQuery({ queryKey: ['contract-types'], queryFn: listContractTypes });
  const [form, setForm] = useState<Partial<Employee>>(
    isAdd
      ? { status: 'active', contract_type: '', hire_date: today, contract_start: today, ...initial }
      : { ...initial }
  );
  const [showExtra, setShowExtra] = useState(false);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>(
    Object.entries(initial?.custom_fields ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  );
  const addCustomField = () => setCustomFields(f => [...f, { key: '', value: '' }]);
  const removeCustomField = (i: number) => setCustomFields(f => f.filter((_, j) => j !== i));
  const setCustomField = (i: number, field: 'key' | 'value', val: string) =>
    setCustomFields(f => f.map((item, j) => j === i ? { ...item, [field]: val } : item));

  const set = (k: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const setNum = (k: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value === '' ? undefined : Number(e.target.value) }));
  const setTags = (k: TagField) => (vals: string[]) => setForm(f => ({ ...f, [k]: vals }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const built: Record<string, string> = {};
    customFields.forEach(({ key, value }) => { if (key.trim()) built[key.trim()] = value; });
    // Strip empty strings so optional Pydantic fields receive null instead of an invalid empty value
    const cleaned = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? undefined : v])
    ) as Partial<Employee>;
    onSave({ ...cleaned, custom_fields: Object.keys(built).length ? built : undefined });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Core fields ─────────────────────────────────────────────────── */}
      <SectionLabel>Informations essentielles</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Nom complet *" value={form.full_name ?? ''} onChange={set('full_name')} required placeholder="Mohammed Alami" />
        <Input label="CIN *" value={form.cin ?? ''} onChange={set('cin')} required placeholder="A123456" />
        <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} placeholder="m.alami@company.ma" />
        <Input label="Téléphone" value={form.phone ?? ''} onChange={set('phone')} placeholder="+212 6 00 00 00 00" />
        <Input label="Poste" value={form.position ?? ''} onChange={set('position')} placeholder="Responsable RH" />
        <Select label="Département" value={form.department ?? ''} onChange={set('department')}>
          <option value="">— Sélectionner —</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </Select>
        <Select label="Statut" value={form.status ?? 'active'} onChange={set('status')}>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
          <option value="terminated">Terminé</option>
          <option value="intern">Stagiaire</option>
        </Select>
        <Select label="Type de contrat" value={form.contract_type ?? ''} onChange={set('contract_type')}>
          <option value="">— Sélectionner —</option>
          {contractTypes.map(c => <option key={c.id} value={c.name}>{c.name}{c.description ? ` — ${c.description}` : ''}</option>)}
        </Select>
        <Input label="Date d'embauche" type="date" value={form.hire_date ?? ''} onChange={set('hire_date')} />
        <Input label="Début de contrat" type="date" value={form.contract_start ?? ''} onChange={set('contract_start')} />
      </div>

      {/* ── Extra fields toggle ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowExtra(s => !s)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--line)',
          borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: 'var(--ink-2)', fontSize: 12, fontWeight: 500,
          width: '100%', justifyContent: 'center',
        }}
      >
        {showExtra ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {showExtra ? 'Masquer les champs supplémentaires' : 'Ajouter des informations supplémentaires (optionnel)'}
      </button>

      {showExtra && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)' }}>

          <SectionLabel>Contrat & Rémunération</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Matricule" value={form.matricule ?? ''} onChange={set('matricule')} placeholder="EMP-001" />
            <Input label="Fin de contrat" type="date" value={form.contract_end ?? ''} onChange={set('contract_end')} />
            <Input label="Salaire (MAD)" type="number" value={form.salary ?? ''} onChange={setNum('salary')} placeholder="8000" />
            <Input label="Rémunération stage (MAD)" type="number" value={form.remuneration ?? ''} onChange={setNum('remuneration')} placeholder="3000" />
            <Input label="Début stage" type="date" value={form.internship_start ?? ''} onChange={set('internship_start')} />
            <Input label="Fin stage" type="date" value={form.internship_end ?? ''} onChange={set('internship_end')} />
          </div>

          <SectionLabel>Informations personnelles</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Date de naissance" type="date" value={form.birth_date ?? ''} onChange={set('birth_date')} />
            <Input label="Nationalité" value={form.nationality ?? ''} onChange={set('nationality')} placeholder="Marocain(e)" />
            <Input label="Ville" value={form.city ?? ''} onChange={set('city')} placeholder="Casablanca" />
            <Input label="Manager" value={form.manager ?? ''} onChange={set('manager')} placeholder="Nom du responsable" />
          </div>
          <Input label="Adresse" value={form.address ?? ''} onChange={set('address')} placeholder="123 Rue Hassan II, Casablanca" />

          <SectionLabel>Compétences & Profil</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TagInput label="Compétences" values={form.skills ?? []} onChange={setTags('skills')} />
            <TagInput label="Langues" values={form.languages ?? []} onChange={setTags('languages')} />
            <div style={{ gridColumn: '1 / -1' }}>
              <TagInput label="Certifications" values={form.certifications ?? []} onChange={setTags('certifications')} />
            </div>
          </div>

          <SectionLabel>Notes & Biographie</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              ['bio', 'Bio / Présentation'],
              ['experience_summary', 'Résumé de l\'expérience'],
              ['education_summary', 'Formation'],
              ['notes', 'Notes internes'],
            ] as [keyof Employee, string][]).map(([k, lbl]) => (
              <div key={k}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4 }}>{lbl}</p>
                <textarea
                  rows={2}
                  value={(form[k] as string) ?? ''}
                  onChange={set(k)}
                  placeholder={lbl}
                  style={{ width: '100%', resize: 'vertical', borderRadius: 8, border: '1px solid var(--line)', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>

          <SectionLabel>Champs personnalisés</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {customFields.map((cf, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <input
                  value={cf.key}
                  onChange={e => setCustomField(i, 'key', e.target.value)}
                  placeholder="Nom du champ (ex: CNSS)"
                  style={{ borderRadius: 8, border: '1px solid var(--line)', padding: '8px 10px', fontSize: 13, outline: 'none' }}
                />
                <input
                  value={cf.value}
                  onChange={e => setCustomField(i, 'value', e.target.value)}
                  placeholder="Valeur"
                  style={{ borderRadius: 8, border: '1px solid var(--line)', padding: '8px 10px', fontSize: 13, outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => removeCustomField(i)}
                  style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCustomField}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--line)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: 'var(--ink-2)', fontSize: 12, fontWeight: 500, width: 'fit-content' }}
            >
              <Plus size={13} /> Ajouter un champ
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>{isAdd ? 'Ajouter l\'employé' : 'Enregistrer les modifications'}</Button>
      </div>
    </form>
  );
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCVImport, setShowCVImport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDeptManager, setShowDeptManager] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: deptData } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const departments = deptData ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, dept, status],
    queryFn: () => listEmployees({ ...(search && { search }), ...(dept && { department: dept }), ...(status && { status }), limit: 100 }),
  });

  const createMut = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setShowModal(false); toast.success('Employee added'); },
    onError: (e: unknown) => toast.error(getApiError(e, 'Error adding employee')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => updateEmployee(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setEditing(null); toast.success('Employee updated'); },
    onError: (e: unknown) => toast.error(getApiError(e, 'Error updating')),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setDeleting(null); toast.success('Employee deleted'); },
    onError: () => { toast.error('Failed to delete (admin required)'); setDeleting(null); },
  });

  const employees = data?.data ?? [];
  const allSelected = employees.length > 0 && selectedIds.size === employees.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < employees.length;
  const toggleOne = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(employees.map(e => e.id)));

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title={t('employees')}
        subtitle={t('employees_subtitle')}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="soft" onClick={() => setShowCVImport(true)}>
              <FileUp size={14} /> {t('import_cv')}
            </Button>
            <Button variant="soft" onClick={() => setShowImport(true)}>
              <Upload size={14} /> Importer
            </Button>
            <Button variant="soft" onClick={() => setShowExport(true)}>
              <Download size={14} /> Exporter
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus size={14} /> {t('add_employee')}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder={t('search_employees')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <select className="select" style={{ width: 160 }} value={dept} onChange={e => setDept(e.target.value)}>
            <option value="">{t('col_department')}</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" title="Gérer les départements" onClick={() => setShowDeptManager(true)}
            style={{ padding: '0 8px', fontSize: 11, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
            ⚙ Gérer
          </button>
        </div>
        <select className="select" style={{ width: 140 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">{t('all_status')}</option>
          <option value="active">{t('status_active')}</option>
          <option value="inactive">{t('status_inactive')}</option>
          <option value="on-leave">{t('status_on_leave')}</option>
          <option value="terminated">Terminé</option>
        </select>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', background: 'var(--primary-soft)', border: '1px solid var(--primary-line)', borderRadius: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => {
              if (confirm(`Supprimer ${selectedIds.size} employé(s) ?`)) {
                selectedIds.forEach(id => deleteMut.mutate(id));
                setSelectedIds(new Set());
              }
            }}
          >
            <Trash2 size={13} /> Supprimer la sélection
          </button>
          <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setSelectedIds(new Set())}>
            <X size={13} /> Désélectionner
          </button>
        </div>
      )}

      {/* Table */}
      <Card pad={false}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : employees.length === 0 ? (
          <Empty
            title={t('no_employees')}
            description={t('employees_subtitle')}
            action={<Button onClick={() => setShowModal(true)}><Plus size={14} /> {t('add_employee')}</Button>}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 16px', width: 40, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      title={allSelected ? 'Désélectionner tout' : 'Sélectionner tout'}
                    />
                  </th>
                  {[t('col_employee'), 'CIN', t('col_department'), t('col_contract'), t('col_status'), t('col_hire_date'), ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-3)', fontSize: 11, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.06em', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--line)', background: selectedIds.has(emp.id) ? 'var(--primary-soft)' : '' }}
                    onMouseEnter={e => { if (!selectedIds.has(emp.id)) e.currentTarget.style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { if (!selectedIds.has(emp.id)) e.currentTarget.style.background = ''; }}>
                    <td style={{ padding: '10px 16px', width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(emp.id)}
                        onChange={() => toggleOne(emp.id)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={emp.full_name} size={30} />
                        <div>
                          <p style={{ fontWeight: 500 }}>{emp.full_name}</p>
                          <p style={{ color: 'var(--ink-2)', fontSize: 11 }}>{emp.position || emp.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-2)' }}>{emp.cin}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-2)' }}>{emp.department || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <Badge>{emp.contract_type || '—'}</Badge>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <Badge variant={STATUS_COLORS[emp.status] ?? 'default'}>{emp.status}</Badge>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-2)' }}>
                      {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link to={`/app/employees/${emp.id}`}>
                          <button className="btn btn-ghost btn-sm" title="Voir le dossier"><Eye size={13} /></button>
                        </Link>
                        <Link to={`/app/generate?employee_id=${emp.id}`}>
                          <button className="btn btn-ghost btn-sm" title="Generate document"><FileText size={13} /></button>
                        </Link>
                        <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => setEditing(emp)}><Pencil size={13} /></button>
                        <button className="btn btn-ghost btn-sm" title="Delete"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => { if (confirm(`Delete ${emp.full_name}?`)) deleteMut.mutate(emp.id); }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Ajouter un employé" width={760}>
        <EmployeeForm
          onSave={data => createMut.mutate(data)}
          onCancel={() => setShowModal(false)}
          loading={createMut.isPending}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Modifier l'employé" width={760}>
        {editing && (
          <EmployeeForm
            initial={editing}
            onSave={data => updateMut.mutate({ id: editing.id, data })}
            onCancel={() => setEditing(null)}
            loading={updateMut.isPending}
          />
        )}
      </Modal>

      {/* CV Import modal */}
      {showCVImport && (
        <CVImportModal
          onClose={() => setShowCVImport(false)}
          onImport={data => {
            createMut.mutate({
              full_name:     data.full_name,
              email:         data.email,
              phone:         data.phone,
              address:       data.address,
              nationality:   data.nationality,
              status:        (data as any).status || 'active',
              contract_type: (data as any).contract_type || 'CDI',
            });
            setShowCVImport(false);
          }}
        />
      )}

      {/* Smart import modal */}
      <SmartImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        cols={EMPLOYEE_COLS}
        entityName="Employés"
        targetType="employee"
        onImported={() => qc.invalidateQueries({ queryKey: ['employees'] })}
      />

      {/* Export modal */}
      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        cols={EMPLOYEE_COLS}
        rows={employees as unknown as Record<string, unknown>[]}
        entityName="Employés"
      />

      <DepartmentsModal open={showDeptManager} onClose={() => setShowDeptManager(false)} />
    </div>
  );
}
