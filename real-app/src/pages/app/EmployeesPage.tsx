import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, FileText, ChevronDown, FileUp, FolderOpen } from 'lucide-react';
import { listEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../lib/api';
import type { Employee } from '../../lib/api';
import { Button, Badge, Card, Input, Select, Modal, Spinner, Empty, Avatar } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { CVImportModal } from '../../components/cv/CVImportModal';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success', inactive: 'danger', 'on-leave': 'warning',
};

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'ANAPEC', 'Consultant', 'Freelance'];
const DEPARTMENTS = ['RH', 'Finance', 'Tech', 'Marketing', 'Commercial', 'Direction', 'Juridique', 'Logistique'];

function EmployeeForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Employee>; onSave: (data: Partial<Employee>) => void; onCancel: () => void; loading: boolean;
}) {
  const [form, setForm] = useState<Partial<Employee>>(initial ?? { status: 'active', contract_type: 'CDI' });
  const set = (k: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Full name *" value={form.full_name ?? ''} onChange={set('full_name')} required placeholder="Mohammed Alami" />
        <Input label="CIN *" value={form.cin ?? ''} onChange={set('cin')} required placeholder="A123456" />
        <Input label="Matricule" value={form.matricule ?? ''} onChange={set('matricule')} placeholder="EMP-001" />
        <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} placeholder="m.alami@company.ma" />
        <Input label="Phone" value={form.phone ?? ''} onChange={set('phone')} placeholder="+212 6 00 00 00 00" />
        <Input label="Position" value={form.position ?? ''} onChange={set('position')} placeholder="HR Manager" />
        <Select label="Department" value={form.department ?? ''} onChange={set('department')}>
          <option value="">— Select —</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select label="Status" value={form.status ?? 'active'} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on-leave">On leave</option>
        </Select>
        <Select label="Contract type" value={form.contract_type ?? 'CDI'} onChange={set('contract_type')}>
          {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Hire date" type="date" value={form.hire_date ?? ''} onChange={set('hire_date')} />
        <Input label="Contract start" type="date" value={form.contract_start ?? ''} onChange={set('contract_start')} />
        <Input label="Contract end" type="date" value={form.contract_end ?? ''} onChange={set('contract_end')} />
        <Input label="Salary (MAD)" type="number" value={form.salary ?? ''} onChange={set('salary')} placeholder="8000" />
        <Input label="Birth date" type="date" value={form.birth_date ?? ''} onChange={set('birth_date')} />
      </div>
      <Input label="Address" value={form.address ?? ''} onChange={set('address')} placeholder="123 Rue Hassan II" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="City" value={form.city ?? ''} onChange={set('city')} placeholder="Casablanca" />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Save changes' : 'Add employee'}</Button>
      </div>
    </form>
  );
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCVImport, setShowCVImport] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, dept, status],
    queryFn: () => listEmployees({ ...(search && { search }), ...(dept && { department: dept }), ...(status && { status }), limit: 100 }),
  });

  const createMut = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setShowModal(false); toast.success('Employee added'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error adding employee'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => updateEmployee(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setEditing(null); toast.success('Employee updated'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Error updating'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setDeleting(null); toast.success('Employee deleted'); },
    onError: () => { toast.error('Failed to delete (admin required)'); setDeleting(null); },
  });

  const employees = data?.data ?? [];

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} employee${employees.length !== 1 ? 's' : ''} found`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="soft" onClick={() => setShowCVImport(true)}>
              <FileUp size={14} /> Importer CV
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus size={14} /> Add employee
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Search by name, CIN, matricule…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 160 }} value={dept} onChange={e => setDept(e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="select" style={{ width: 140 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on-leave">On leave</option>
        </select>
      </div>

      {/* Table */}
      <Card pad={false}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : employees.length === 0 ? (
          <Empty
            title="No employees found"
            description="Add your first employee to get started."
            action={<Button onClick={() => setShowModal(true)}><Plus size={14} /> Add employee</Button>}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Employee', 'CIN', 'Department', 'Contract', 'Status', 'Hire date', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--fg-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={emp.full_name} size={30} />
                        <div>
                          <p style={{ fontWeight: 500 }}>{emp.full_name}</p>
                          <p style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{emp.position || emp.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--fg-muted)' }}>{emp.cin}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--fg-muted)' }}>{emp.department || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <Badge>{emp.contract_type || '—'}</Badge>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <Badge variant={STATUS_COLORS[emp.status] ?? 'default'}>{emp.status}</Badge>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--fg-muted)' }}>
                      {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link to={`/app/employees/${emp.id}`}>
                          <button className="btn btn-ghost btn-sm" title="Dossier employé"><FolderOpen size={13} /></button>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add employee" width={720}>
        <EmployeeForm
          onSave={data => createMut.mutate(data)}
          onCancel={() => setShowModal(false)}
          loading={createMut.isPending}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit employee" width={720}>
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
    </div>
  );
}
