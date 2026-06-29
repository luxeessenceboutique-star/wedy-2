import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, parseISO, startOfDay, getDaysInMonth, getDay, isWeekend, addMonths, subMonths } from 'date-fns';
import { Plus, Check, X, Calendar, Clock, ChevronLeft, ChevronRight, Users, List, User, TrendingUp } from 'lucide-react';
import { PageHeader } from '../../components/layout/AppShell';
import { Card, Badge, Spinner, Button } from '../../components/ui';
import { listLeaves, reviewLeave, createLeave, listEmployees, getLeaveBalance, getApiError, type LeaveRequest } from '../../lib/api';
import { useLang } from '../../lib/lang';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const WEEK_DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const TYPE_LABELS: Record<string, string> = {
  annual: 'Congé annuel', sick: 'Maladie', personal: 'Personnel',
  maternity: 'Maternité', paternity: 'Paternité', unpaid: 'Sans solde',
};
const TYPE_COLORS: Record<string, string> = {
  annual: '#3B82F6', sick: '#EF4444', personal: '#8B5CF6',
  maternity: '#EC4899', paternity: '#06B6D4', unpaid: '#6B7280',
};
const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  pending: 'warning', approved: 'success', rejected: 'danger',
};

// ── SVG Ring Progress ────────────────────────────────────────────
function RingProgress({ value, max, color, size = 72, label, sublabel }: {
  value: number; max: number; color: string; size?: number; label: string; sublabel: string;
}) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const remaining = max - value;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={5} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>{remaining}</span>
          <span style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 1 }}>restants</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>{label}</div>
        <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{sublabel}</div>
      </div>
    </div>
  );
}

// ── Calendar View ─────────────────────────────────────────────────
function CalendarView({ leaves, calDate, onPrev, onNext }: {
  leaves: LeaveRequest[]; calDate: Date; onPrev: () => void; onNext: () => void;
}) {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const daysInMonth = getDaysInMonth(calDate);
  const firstDay = new Date(year, month, 1);
  const offset = (getDay(firstDay) + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const getLeavesForDay = (day: Date) => {
    const d = startOfDay(day).getTime();
    return leaves.filter(l => {
      try {
        const s = startOfDay(parseISO(l.start_date)).getTime();
        const e = startOfDay(parseISO(l.end_date)).getTime();
        return d >= s && d <= e;
      } catch { return false; }
    }).slice(0, 3);
  };

  const today = startOfDay(new Date()).getTime();

  return (
    <Card pad={false}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onPrev} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontWeight: 600, fontSize: 15, flex: 1, textAlign: 'center' }}>
          {MONTHS_FR[month]} {year}
        </span>
        <button onClick={onNext} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {WEEK_DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} style={{ minHeight: 70 }} />;
            const dayLeaves = getLeavesForDay(day);
            const isToday = day.getTime() === today;
            const isWknd = isWeekend(day);
            return (
              <div key={i} style={{
                minHeight: 70, padding: '4px 3px',
                background: isToday ? 'var(--primary-soft)' : isWknd ? 'var(--bg-muted)' : 'var(--bg-elev)',
                borderRadius: 6,
                border: isToday ? '1.5px solid var(--primary)' : '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--primary)' : isWknd ? 'var(--fg-subtle)' : 'var(--fg)', textAlign: 'right', paddingRight: 2, marginBottom: 2 }}>
                  {day.getDate()}
                </div>
                {dayLeaves.map(l => (
                  <div key={l.id} title={`${l.employees?.full_name} — ${TYPE_LABELS[l.type] || l.type}`}
                    style={{
                      fontSize: 9, padding: '1px 3px', borderRadius: 3, marginBottom: 1,
                      background: TYPE_COLORS[l.type] || '#3B82F6', color: '#fff',
                      fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      opacity: l.status === 'pending' ? 0.55 : 1,
                    }}>
                    {(l.employees?.full_name || '?').split(' ')[0]}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--fg-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS[k] }} />
            {v}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--fg-subtle)' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#3B82F6', opacity: 0.4 }} />
          En attente (opaque)
        </div>
      </div>
    </Card>
  );
}

// ── New Leave Modal ───────────────────────────────────────────────
function NewLeaveModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const qc = useQueryClient();
  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees({ limit: 100 }) });
  const employees = empData?.data ?? [];

  const [form, setForm] = useState({ employee_id: '', type: 'annual', start_date: '', end_date: '', reason: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const days = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    const diff = Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000) + 1;
    return Math.max(diff, 0);
  }, [form.start_date, form.end_date]);

  const { data: balance } = useQuery({
    queryKey: ['leave-balance-modal', form.employee_id],
    queryFn: () => getLeaveBalance(form.employee_id),
    enabled: !!form.employee_id,
  });

  const remaining = useMemo(() => {
    if (!balance) return null;
    const map: Record<string, number> = {
      annual: (balance.annual_total || 0) - (balance.annual_used || 0),
      sick: (balance.sick_total || 0) - (balance.sick_used || 0),
      personal: (balance.personal_total || 0) - (balance.personal_used || 0),
    };
    return map[form.type] ?? null;
  }, [balance, form.type]);

  const hasWarning = remaining !== null && days > remaining;
  const typeColor = TYPE_COLORS[form.type] || 'var(--primary)';

  const mutation = useMutation({
    mutationFn: () => createLeave({ ...form, days }),
    onSuccess: () => { toast.success('Demande créée avec succès'); qc.invalidateQueries({ queryKey: ['leaves'] }); onCreated(); onClose(); },
    onError: (e: any) => {
      toast.error(`Erreur: ${getApiError(e, 'Erreur inconnue')}`);
    },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-elev)', borderRadius: 'var(--radius-lg)', padding: 28, width: 450, boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: typeColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} style={{ color: typeColor }} />
          </div>
          <h3 style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>Nouvelle demande de congé</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Employé</label>
            <select className="select" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
              <option value="">Sélectionner un employé…</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Type de congé</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => set('type', k)} style={{
                  padding: '7px 6px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  border: form.type === k ? `2px solid ${TYPE_COLORS[k]}` : '1px solid var(--border)',
                  background: form.type === k ? TYPE_COLORS[k] + '18' : 'transparent',
                  color: form.type === k ? TYPE_COLORS[k] : 'var(--fg-muted)',
                }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">Date de début</label><input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></div>
            <div><label className="label">Date de fin</label><input className="input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></div>
          </div>

          {days > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', borderRadius: 8, background: hasWarning ? '#FEF2F2' : 'var(--primary-soft)', border: `1px solid ${hasWarning ? '#FCA5A5' : typeColor + '30'}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: hasWarning ? '#EF4444' : typeColor }}>{days} jour{days > 1 ? 's' : ''}</span>
              {remaining !== null && (
                <span style={{ fontSize: 11, color: hasWarning ? '#EF4444' : 'var(--fg-muted)' }}>
                  {hasWarning ? `⚠ Solde insuffisant (${remaining} restants)` : `Solde après : ${remaining - days} jours`}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="label">Motif (optionnel)</label>
            <textarea className="input" rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} style={{ resize: 'none' }} placeholder="Raison de la demande…" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <Button onClick={onClose} style={{ background: 'var(--bg-muted)', color: 'var(--fg)', border: '1px solid var(--border)' }}>Annuler</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!form.employee_id || !form.start_date || !form.end_date || days === 0}>
            Soumettre
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function TimeOffPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calDate, setCalDate] = useState(new Date());
  const [selectedEmpId, setSelectedEmpId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', filter],
    queryFn: () => listLeaves(filter !== 'all' ? { status: filter, limit: 200 } : { limit: 200 }),
  });

  const { data: allData } = useQuery({
    queryKey: ['leaves-all'],
    queryFn: () => listLeaves({ limit: 200 }),
  });

  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees({ limit: 100 }) });
  const employees = empData?.data ?? [];

  const { data: balance, isLoading: balanceLoading, isError: balanceError } = useQuery({
    queryKey: ['leave-balance', selectedEmpId],
    queryFn: () => getLeaveBalance(selectedEmpId),
    enabled: !!selectedEmpId,
    retry: 1,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => reviewLeave(id, status),
    onSuccess: (_, v) => {
      toast.success(v.status === 'approved' ? 'Demande approuvée' : 'Demande rejetée');
      qc.invalidateQueries({ queryKey: ['leaves'] });
      qc.invalidateQueries({ queryKey: ['leaves-all'] });
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const leaves = data?.data ?? [];
  const allLeaves = allData?.data ?? [];

  const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmpId) ?? null, [employees, selectedEmpId]);

  const filteredByEmployee = useMemo(() =>
    allLeaves.filter(l => !selectedEmpId || l.employee_id === selectedEmpId),
    [allLeaves, selectedEmpId],
  );

  const displayLeaves = useMemo(() =>
    leaves.filter(l => !selectedEmpId || l.employee_id === selectedEmpId),
    [leaves, selectedEmpId],
  );

  const pendingCount = filteredByEmployee.filter(l => l.status === 'pending').length;
  const approvedCount = filteredByEmployee.filter(l => l.status === 'approved').length;
  const totalDays = filteredByEmployee.filter(l => l.status === 'approved').reduce((s, l) => s + (l.days || 0), 0);

  const FILTERS = [
    { key: 'all', label: t('all_status'), count: filteredByEmployee.length },
    { key: 'pending', label: t('pending_leaves'), count: pendingCount },
    { key: 'approved', label: t('approved_leaves'), count: approvedCount },
    { key: 'rejected', label: t('rejected_leaves'), count: filteredByEmployee.filter(l => l.status === 'rejected').length },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title={t('time_off')}
        subtitle={t('timeoff_subtitle')}
        action={<Button onClick={() => setShowModal(true)}><Plus size={14} /> {t('request_leave')}</Button>}
      />

      {showModal && <NewLeaveModal onClose={() => setShowModal(false)} onCreated={() => { qc.invalidateQueries({ queryKey: ['leaves'] }); qc.invalidateQueries({ queryKey: ['leaves-all'] }); }} />}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: t('total_leaves'), value: allLeaves.length, color: 'var(--primary)', icon: <Calendar size={16} /> },
          { label: t('pending_leaves'), value: pendingCount, color: '#F59E0B', icon: <Clock size={16} /> },
          { label: t('approved_leaves'), value: approvedCount, color: '#22C55E', icon: <Check size={16} /> },
          { label: t('col_days'), value: totalDays, color: 'var(--fg)', icon: selectedEmpId ? <User size={16} /> : <Users size={16} /> },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: stat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {selectedEmployee && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          padding: '10px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
        }}>
          <User size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#1d4ed8' }}>
            {t('filtered_for')} <strong>{selectedEmployee.full_name}</strong>
          </span>
          <button
            onClick={() => setSelectedEmpId('')}
            title="Afficher tous les employés"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 4 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-muted)', borderRadius: 9, padding: 4 }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  border: 'none', background: filter === f.key ? 'var(--bg-elev)' : 'transparent',
                  color: filter === f.key ? 'var(--fg)' : 'var(--fg-muted)',
                  boxShadow: filter === f.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {f.label}
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 10, background: filter === f.key ? 'var(--primary)' : 'var(--border)', color: filter === f.key ? '#fff' : 'var(--fg-muted)' }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', background: 'var(--bg-muted)', borderRadius: 9, padding: 3 }}>
              {[
                { key: 'list', icon: <List size={13} />, label: t('leave_requests_title') },
                { key: 'calendar', icon: <Calendar size={13} />, label: t('leave_calendar_title') },
              ].map(v => (
                <button key={v.key} onClick={() => setView(v.key as 'list' | 'calendar')} style={{
                  padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  border: 'none', display: 'flex', alignItems: 'center', gap: 5,
                  background: view === v.key ? 'var(--bg-elev)' : 'transparent',
                  color: view === v.key ? 'var(--primary)' : 'var(--fg-muted)',
                  boxShadow: view === v.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          {view === 'calendar' ? (
            <CalendarView
              leaves={filteredByEmployee}
              calDate={calDate}
              onPrev={() => setCalDate(subMonths(calDate, 1))}
              onNext={() => setCalDate(addMonths(calDate, 1))}
            />
          ) : (
            <Card pad={false}>
              {isLoading ? (
                <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
              ) : displayLeaves.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
                  <Calendar size={36} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                  <p style={{ fontSize: 14 }}>{t('no_leaves')}</p>
                </div>
              ) : (
                displayLeaves.map((req: LeaveRequest, i) => {
                  const color = TYPE_COLORS[req.type] || '#6B7280';
                  let startFmt = req.start_date, endFmt = req.end_date;
                  try { startFmt = format(parseISO(req.start_date), 'dd MMM'); } catch { /* keep raw */ }
                  try { endFmt = format(parseISO(req.end_date), 'dd MMM yyyy'); } catch { /* keep raw */ }
                  return (
                    <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < displayLeaves.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: 4, height: 44, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color }}>
                        {(req.employees?.full_name || '?')[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{req.employees?.full_name || '—'}</span>
                          <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: color + '20', color, fontWeight: 500 }}>
                            {TYPE_LABELS[req.type] || req.type}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                          {startFmt} → {endFmt}
                          <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>
                          <strong>{req.days}</strong> jour{req.days > 1 ? 's' : ''}
                        </div>
                        {req.reason && <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2, fontStyle: 'italic' }}>"{req.reason}"</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {req.status === 'pending' ? (
                          <>
                            <button onClick={() => reviewMutation.mutate({ id: req.id, status: 'rejected' })}
                              style={{ border: '1px solid var(--border)', background: 'var(--bg-elev)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                              <X size={12} /> {t('reject')}
                            </button>
                            <button onClick={() => reviewMutation.mutate({ id: req.id, status: 'approved' })}
                              style={{ border: 'none', background: '#22C55E', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff', fontWeight: 500 }}>
                              <Check size={12} /> {t('approve')}
                            </button>
                          </>
                        ) : (
                          <Badge variant={STATUS_VARIANT[req.status] ?? 'default'}>
                            {req.status === 'approved' ? t('approved_leaves') : req.status === 'rejected' ? t('rejected_leaves') : req.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Balance panel */}
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <User size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>{t('leave_balance')}</span>
            </div>
            <select className="select" value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} style={{ marginBottom: 16, fontSize: 12 }}>
              <option value="">Choisir un employé…</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
            {balanceLoading ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}><Spinner /></div>
            ) : balanceError ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#EF4444', fontSize: 12 }}>
                Impossible de charger le solde
              </div>
            ) : balance ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 10 }}>
                  <RingProgress value={balance.annual_used || 0} max={balance.annual_total || 18} color="#3B82F6" label="Annuel" sublabel={`${(balance.annual_total||18)-(balance.annual_used||0)}/${balance.annual_total||18}j`} />
                  <RingProgress value={balance.sick_used || 0} max={balance.sick_total || 12} color="#EF4444" label="Maladie" sublabel={`${(balance.sick_total||12)-(balance.sick_used||0)}/${balance.sick_total||12}j`} />
                  <RingProgress value={balance.personal_used || 0} max={balance.personal_total || 5} color="#8B5CF6" label="Perso" sublabel={`${(balance.personal_total||5)-(balance.personal_used||0)}/${balance.personal_total||5}j`} />
                </div>
                <p style={{ fontSize: 10, color: 'var(--fg-subtle)', textAlign: 'center' }}>Année {balance.year}</p>
              </>
            ) : selectedEmpId ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}><Spinner /></div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--fg-subtle)' }}>
                <TrendingUp size={28} style={{ margin: '0 auto 8px', opacity: 0.2 }} />
                <p style={{ fontSize: 12 }}>Sélectionnez un employé</p>
              </div>
            )}
          </div>

          {/* Type breakdown */}
          <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 16px' }}>
            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Répartition par type</p>
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const count = filteredByEmployee.filter(l => l.type === key).length;
              const total = filteredByEmployee.length || 1;
              return (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
                    <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{count}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, width: `${(count / total) * 100}%`, background: TYPE_COLORS[key], transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
