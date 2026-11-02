import { useEffect, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { listEmployees, createEmployee, updateEmployee, deleteEmployee, listDepartments, listContractTypes, getApiError } from '@/services/api';
import type { Employee } from '@/services/api';
import { CVImportModal } from '@/components/employees/CVImportModal';
import { SmartImportModal } from '@/components/employees/SmartImportModal';
import { ExportModal } from '@/components/employees/ExportModal';
import { DepartmentsModal } from '@/components/employees/DepartmentsModal';
import { readEmployeeFilters, filtersToQuery, rememberEmployeeList } from '@/lib/listMemory';
import { useLang } from '@/lib/lang';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { EmployeesView } from './EmployeesView';

const EMPLOYEE_COLS = [
  { key: 'full_name', label: 'Nom complet', required: true },
  { key: 'cin', label: 'CIN' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Téléphone' },
  { key: 'position', label: 'Poste' }, { key: 'department', label: 'Département' }, { key: 'status', label: 'Statut' },
  { key: 'contract_type', label: 'Type de contrat' }, { key: 'hire_date', label: "Date d'embauche" },
  { key: 'contract_start', label: 'Début contrat' }, { key: 'contract_end', label: 'Fin contrat' }, { key: 'salary', label: 'Salaire' },
  { key: 'birth_date', label: 'Date de naissance' }, { key: 'address', label: 'Adresse' }, { key: 'city', label: 'Ville' },
  { key: 'nationality', label: 'Nationalité' }, { key: 'manager', label: 'Manager' }, { key: 'matricule', label: 'Matricule' },
  { key: 'skills', label: 'Compétences' }, { key: 'languages', label: 'Langues' }, { key: 'notes', label: 'Notes' },
];

const SERVER_STATUSES = ['active', 'inactive', 'on-leave', 'terminated'];
const DAY = 86400000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const daysLeft = (d?: string) => (d ? Math.round((new Date(d.slice(0, 10)).getTime() - startOfToday()) / DAY) : null);
const fmt = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');
const expiring = (e: Employee) => { const n = daysLeft(e.contract_end); return n !== null && n >= 0 && n <= 30; };
const isStage = (c?: string) => !!c && /stage|intern/i.test(c);

type Field = 'name' | 'cin' | 'email' | 'phone' | 'pos' | 'dept' | 'contract' | 'hire' | 'matricule' | 'end' | 'salary' | 'city' | 'manager';
type Form = Record<Field, string>;
const emptyForm = (): Form => ({
  name: '', cin: '', email: '', phone: '', pos: '', dept: '', contract: '', hire: new Date().toISOString().slice(0, 10),
  matricule: '', end: '', salary: '', city: '', manager: '',
});

type View = 'list' | 'grid' | 'kanban';
const readView = (): View => {
  try { const v = localStorage.getItem('employees_view'); return v === 'grid' || v === 'kanban' ? v : 'list'; } catch { return 'list'; }
};

function useEmployeesModel() {
  const qc = useQueryClient();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  // The filters survive a visit to a profile: they live in the address and are remembered for the session
  const [initial] = useState(() => readEmployeeFilters(location.search));
  const [q, setQ] = useState(initial.q);
  const [dept, setDept] = useState(initial.dept);
  const [status, setStatus] = useState(initial.status);
  const [contract, setContract] = useState('');
  useEffect(() => {
    const f = { q, dept, status };
    rememberEmployeeList(f);
    const wanted = filtersToQuery(f);
    if (wanted !== location.search.replace(/^\?/, '')) navigate({ pathname: location.pathname, search: wanted ? `?${wanted}` : '' }, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, dept, status]);

  const [view, setViewState] = useState<View>(readView);
  const setView = (m: View) => { setViewState(m); try { localStorage.setItem('employees_view', m); } catch { /* keep in memory */ } };
  const [sel, setSel] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [extra, setExtra] = useState(false);
  const [f, setF] = useState<Form>(emptyForm);
  const [formErr, setFormErr] = useState('');
  const [newId, setNewId] = useState<string | null>(null);
  const [showCV, setShowCV] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDepts, setShowDepts] = useState(false);

  const serverStatus = SERVER_STATUSES.includes(status) ? status : '';
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });
  const { data: contractTypes = [] } = useQuery({ queryKey: ['contract-types'], queryFn: listContractTypes });
  const { data, isLoading } = useQuery({
    queryKey: ['employees', q, dept, serverStatus],
    queryFn: () => listEmployees({ ...(q && { search: q }), ...(dept && { department: dept }), ...(serverStatus && { status: serverStatus }), limit: 100 }),
  });
  // the counters above the list always describe everyone (same key as `data` while no filter is set)
  const { data: allData } = useQuery({ queryKey: ['employees', '', '', ''], queryFn: () => listEmployees({ limit: 100 }) });
  const all = allData?.data ?? [];

  const createMut = useMutation({
    mutationFn: createEmployee,
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setDrawer(false); setF(emptyForm()); setFormErr('');
      setNewId(emp.id); setView('list'); setQ(''); setDept(''); setStatus(''); setContract('');
      toast.success(tf(t('emp_toast_added'), { name: emp.full_name }));
    },
    onError: (e: unknown) => { setFormErr(getApiError(e, t('emp_err_create'))); toast.error(getApiError(e, t('emp_err_create'))); },
  });

  // Status change from the table or by dropping a kanban card: instant, rolled back when the server refuses
  const statusMut = useMutation({
    mutationFn: ({ id, status: s }: { id: string; status: string; name: string }) => updateEmployee(id, { status: s }),
    onMutate: async ({ id, status: s }) => {
      await qc.cancelQueries({ queryKey: ['employees'] });
      const snapshots = qc.getQueriesData<{ data: Employee[]; count: number }>({ queryKey: ['employees'] });
      qc.setQueriesData<{ data: Employee[]; count: number }>({ queryKey: ['employees'] }, old =>
        old && Array.isArray(old.data) ? { ...old, data: old.data.map(e => (e.id === id ? { ...e, status: s } : e)) } : old);
      return { snapshots };
    },
    onError: (e: unknown, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap));
      toast.error(getApiError(e, t('emp_err_status')));
    },
    onSuccess: (_d, vars) => toast.success(tf(t('emp_toast_status'), { name: vars.name })),
    onSettled: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  const deleteMut = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) => deleteEmployee(id),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setSel(s => s.filter(x => x !== vars.id));
      toast.success(tf(t('emp_toast_deleted'), { name: vars.name }));
    },
    onError: () => toast.error(t('emp_err_delete')),
  });

  // Esc closes the drawer and the import menu
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDrawer(false); setImportOpen(false); } };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  // ── derived list ───────────────────────────────────────────────────────────
  const qq = q.trim().toLowerCase();
  const list = (data?.data ?? []).filter(e =>
    (!qq || [e.full_name, e.email, e.position, e.department].some(x => (x ?? '').toLowerCase().includes(qq)))
    && (!contract || (e.contract_type ?? '').toLowerCase() === contract.toLowerCase())
    && (status !== 'expiring' || expiring(e)));
  const deptOptions = depts.map(d => d.name);
  const contractOptions = contractTypes.map(c => c.name);
  const stageName = contractOptions.find(isStage) ?? 'Stage';

  const row = (e: Employee, i: number) => {
    const dl = daysLeft(e.contract_end);
    const soon = expiring(e);
    const c = e.contract_type ?? '';
    const known = /^(cdi|cdd)$/i.test(c) || isStage(c) || /free/i.test(c);
    const name = e.full_name;
    return {
      id: e.id, name, email: e.email ?? '—', position: e.position ?? '—', dept: e.department ?? '—', contract: c, status: e.status,
      ini: initialsOf(name), av: avatarGradient(name), delay: String(i * 40), href: `/app/employees/${e.id}`,
      hire: fmt(e.hire_date), endLabel: soon ? `${dl} j` : fmt(e.contract_end), soon, notSoon: !soon,
      cCDI: /^cdi$/i.test(c), cCDD: /^cdd$/i.test(c), cStage: isStage(c), cFree: /free/i.test(c), cOther: !!c && !known,
      sActive: e.status === 'active', sLeave: e.status === 'on-leave', sInactive: e.status === 'inactive' || e.status === 'terminated',
      inactiveLabel: e.status === 'terminated' ? t('emp_termine') : t('emp_inactif'),
      sel: sel.includes(e.id), isNew: e.id === newId,
      toggle: () => setSel(s => (s.includes(e.id) ? s.filter(x => x !== e.id) : [...s, e.id])),
      setStatus: (ev: ChangeEvent<HTMLSelectElement>) => statusMut.mutate({ id: e.id, status: ev.target.value, name }),
      doc: () => navigate(`/app/generate?employee_id=${e.id}`),
      remove: () => { if (window.confirm(tf(t('emp_confirm_delete'), { name }))) deleteMut.mutate({ id: e.id, name }); },
      drag: (ev: DragEvent<HTMLElement>) => { try { ev.dataTransfer.setData('text/plain', e.id); } catch { /* ignore */ } },
    };
  };
  const rows = list.map(row);
  const kanbanRows = view === 'kanban' ? rows : [];
  const drop = (st: string) => (ev: DragEvent<HTMLElement>) => {
    ev.preventDefault();
    let id = '';
    try { id = ev.dataTransfer.getData('text/plain'); } catch { /* ignore */ }
    const emp = all.find(x => x.id === id) ?? list.find(x => x.id === id);
    if (emp && emp.status !== st) statusMut.mutate({ id, status: st, name: emp.full_name });
  };
  const allSel = list.length > 0 && list.every(e => sel.includes(e.id));
  const set = (setter: (v: string) => void, none = false) => (ev: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setter(none && ev.target.value === 'all' ? '' : ev.target.value);
  const setField = (k: Field) => (ev: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const val = ev.target.value; setF(x => ({ ...x, [k]: val })); setFormErr(''); };

  const save = (ev: FormEvent) => {
    ev.preventDefault();
    if (!f.name.trim() || !f.cin.trim()) { setFormErr(t('emp_err_required')); return; }
    const clean = (s: string) => (s.trim() === '' ? undefined : s.trim());
    createMut.mutate({
      full_name: f.name.trim(), cin: f.cin.trim(), email: clean(f.email), phone: clean(f.phone), position: clean(f.pos),
      department: clean(f.dept), contract_type: clean(f.contract), hire_date: clean(f.hire), contract_start: clean(f.hire),
      matricule: clean(f.matricule), contract_end: clean(f.end), salary: f.salary === '' ? undefined : Number(f.salary),
      city: clean(f.city), manager: clean(f.manager), status: 'active',
    });
  };
  const openDrawer = () => { setF({ ...emptyForm(), dept: deptOptions[0] ?? '', contract: contractOptions.find(c => /^cdi$/i.test(c)) ?? contractOptions[0] ?? '' }); setFormErr(''); setExtra(false); setImportOpen(false); setDrawer(true); };

  const selected = list.filter(e => sel.includes(e.id));
  const v = {
    total: all.length, loading: isLoading,
    cActive: all.filter(e => e.status === 'active').length, cLeave: all.filter(e => e.status === 'on-leave').length,
    cExpiring: all.filter(expiring).length, cInterns: all.filter(e => isStage(e.contract_type)).length,
    q, onQ: set(setQ), dept: dept || 'all', onDept: set(setDept, true), status: status || 'all', onStatus: set(setStatus, true),
    contract: contract || 'all', onContract: set(setContract, true), deptOptions, contractOptions,
    isList: view === 'list', notList: view !== 'list', isGrid: view === 'grid', notGrid: view !== 'grid', isKanban: view === 'kanban', notKanban: view !== 'kanban',
    vList: () => setView('list'), vGrid: () => setView('grid'), vKanban: () => setView('kanban'),
    rows: view === 'kanban' ? [] : rows, noRows: !isLoading && list.length === 0,
    showing: tf(t('emp_showing'), { n: list.length, total: all.length }),
    kActive: kanbanRows.filter(r => r.status === 'active'), kLeave: kanbanRows.filter(r => r.status === 'on-leave'),
    kInactive: kanbanRows.filter(r => r.status === 'inactive' || r.status === 'terminated'),
    kActiveN: kanbanRows.filter(r => r.status === 'active').length, kLeaveN: kanbanRows.filter(r => r.status === 'on-leave').length,
    kInactiveN: kanbanRows.filter(r => r.status === 'inactive' || r.status === 'terminated').length,
    allowDrop: (ev: DragEvent<HTMLElement>) => ev.preventDefault(), dropActive: drop('active'), dropLeave: drop('on-leave'), dropInactive: drop('inactive'),
    allSel, toggleAll: () => setSel(allSel ? [] : list.map(e => e.id)),
    hasSel: sel.length > 0, selCount: sel.length, clearSel: () => setSel([]),
    bulkDoc: () => { if (sel.length === 1) navigate(`/app/generate?employee_id=${sel[0]}`); else toast.info(t('emp_bulk_one')); },
    quickAll: () => { setStatus('active'); setDept(''); setContract(''); setQ(''); },
    quickLeave: () => { setStatus('on-leave'); setContract(''); },
    quickExpiring: () => { setStatus('expiring'); setContract(''); },
    quickInterns: () => { setContract(stageName); setStatus(''); },
    resetFilters: () => { setQ(''); setDept(''); setStatus(''); setContract(''); },
    importOpen, toggleImport: () => setImportOpen(o => !o),
    smartImport: () => { setImportOpen(false); setShowImport(true); },
    cvImport: () => { setImportOpen(false); setShowCV(true); },
    exportToast: () => setShowExport(true), deptToast: () => setShowDepts(true),
    drawer, openDrawer, closeDrawer: () => setDrawer(false),
    extra, toggleExtra: () => setExtra(x => !x), extraLabel: t(extra ? 'emp_extra_hide' : 'emp_extra_show'),
    fName: f.name, onFName: setField('name'), fCin: f.cin, onFCin: setField('cin'), fEmail: f.email, onFEmail: setField('email'),
    fPhone: f.phone, onFPhone: setField('phone'), fPos: f.pos, onFPos: setField('pos'), fDept: f.dept, onFDept: setField('dept'),
    fContract: f.contract, onFContract: setField('contract'), fHire: f.hire, onFHire: setField('hire'),
    fMatricule: f.matricule, onFMatricule: setField('matricule'), fEnd: f.end, onFEnd: setField('end'),
    fSalary: f.salary, onFSalary: setField('salary'), fCity: f.city, onFCity: setField('city'), fManager: f.manager, onFManager: setField('manager'),
    hasFormErr: !!formErr, formErr, save,
  };

  const modals = (
    <>
      {showCV && (
        <CVImportModal
          onClose={() => setShowCV(false)}
          onImport={data => {
            createMut.mutate({ full_name: data.full_name, email: data.email, phone: data.phone, address: data.address, nationality: data.nationality, status: 'active', contract_type: 'CDI' });
            setShowCV(false);
          }}
        />
      )}
      <SmartImportModal
        open={showImport} onClose={() => setShowImport(false)} cols={EMPLOYEE_COLS} entityName="Employés" targetType="employee"
        onImported={() => qc.invalidateQueries({ queryKey: ['employees'] })}
      />
      <ExportModal
        open={showExport} onClose={() => setShowExport(false)} cols={EMPLOYEE_COLS} entityName="Employés"
        rows={(selected.length ? selected : list) as unknown as Record<string, unknown>[]}
      />
      <DepartmentsModal open={showDepts} onClose={() => setShowDepts(false)} />
    </>
  );
  return { v, modals };
}

export type EmployeesVals = ReturnType<typeof useEmployeesModel>['v'];

export default function EmployeesPage() {
  const { v, modals } = useEmployeesModel();
  return (
    <>
      <EmployeesView v={v} />
      {modals}
    </>
  );
}
