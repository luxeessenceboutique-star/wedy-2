import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, parseISO, startOfDay, getDaysInMonth, isWeekend, addMonths, subMonths } from 'date-fns';
import { Plus, Check, X, Calendar, ChevronLeft, ChevronRight, Scale, Inbox } from 'lucide-react';
import { Page, PageHeader } from '../../components/layout/AppShell';
import { Badge, Spinner, Modal } from '../../components/ui';
import { listLeaves, reviewLeave, createLeave, listEmployees, getLeaveBalance, getApiError, type LeaveRequest } from '@/services/api';
import { useLang } from '../../lib/lang';
import { useSearchParams } from 'react-router-dom';

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const TYPE_LABELS: Record<string, string> = {
  annual: 'Annuel', sick: 'Maladie', personal: 'Personnel',
  maternity: 'Maternité', paternity: 'Paternité', unpaid: 'Sans solde', unjustified: 'Absence',
};
const TYPE_COLORS: Record<string, string> = {
  annual: '#16b6c8', sick: '#df5740', personal: '#6d5ad6',
  maternity: '#6d5ad6', paternity: '#4a69d8', unpaid: '#a3b1b7', unjustified: '#df5740',
};
const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  pending: 'warning', approved: 'success', rejected: 'danger',
};

const HOLIDAYS = [
  { day: '06', mon: 'NOV', label: "Anniversaire de la Marche Verte" },
  { day: '18', mon: 'NOV', label: "Fête de l'Indépendance" },
  { day: '01', mon: 'JAN', label: "Nouvel An" },
];

// ── Gantt Timeline ────────────────────────────────────────────────────────────
function GanttView({ leaves, calDate, onPrev, onNext }: {
  leaves: LeaveRequest[]; calDate: Date; onPrev: () => void; onNext: () => void;
}) {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const daysInMonth = getDaysInMonth(calDate);
  const today = new Date();
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;

  // Group leaves by employee
  const byEmp: Map<string, { name: string; bars: LeaveRequest[] }> = new Map();
  leaves.forEach(l => {
    if (l.status !== 'approved') return;
    const id = l.employee_id;
    if (!byEmp.has(id)) byEmp.set(id, { name: l.employees?.full_name || '?', bars: [] });
    // Check if leave overlaps this month
    try {
      const s = parseISO(l.start_date);
      const e = parseISO(l.end_date || l.start_date);
      const mStart = new Date(year, month, 1);
      const mEnd = new Date(year, month, daysInMonth);
      if (e >= mStart && s <= mEnd) byEmp.get(id)!.bars.push(l);
    } catch { /* skip */ }
  });

  const rows = Array.from(byEmp.values());

  const DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dayOfWeek = new Date(year, month, d).getDay();
    const we = dayOfWeek === 0 || dayOfWeek === 6;
    return { n: d, dow: DOW[dayOfWeek], we };
  });

  const AVS = ['linear-gradient(135deg,#0e6f84,#16b6c8)', 'linear-gradient(135deg,#5444b8,#9a8bf0)', 'linear-gradient(135deg,#0f6f49,#2bbd86)', 'linear-gradient(135deg,#a8650a,#e6a948)', 'linear-gradient(135deg,#b8402c,#ef6b54)', 'linear-gradient(135deg,#2f4bb0,#4a69d8)'];

  const barLeft = (l: LeaveRequest) => {
    try {
      const s = Math.max(parseISO(l.start_date).getDate(), 1);
      return ((s - 1) / daysInMonth * 100).toFixed(2);
    } catch { return '0'; }
  };

  const barWidth = (l: LeaveRequest) => {
    try {
      const s = Math.max(parseISO(l.start_date).getDate(), 1);
      const e = Math.min(parseISO(l.end_date || l.start_date).getDate(), daysInMonth);
      return ((e - s + 1) / daysInMonth * 100).toFixed(2);
    } catch { return '0'; }
  };

  const ini = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ borderRadius: 20, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onPrev} style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={15} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>
          {MONTHS_FR[month]} {year}
        </span>
        <button onClick={onNext} style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={15} />
        </button>
        <div style={{ display: 'flex', gap: 14, marginLeft: 'auto', flexWrap: 'wrap', fontSize: 12.5, color: '#33474f' }}>
          {[['#16b6c8', 'Annuel'], ['#6d5ad6', 'Exceptionnel'], ['#df5740', 'Maladie']].map(([c, l]) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} /> {l}
            </span>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ position: 'relative', minWidth: 980, padding: '0 20px 14px' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'end' }}>
            <span />
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInMonth},minmax(0,1fr))`, padding: '12px 0 8px' }}>
              {days.map(d => (
                <span key={d.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: d.we ? '#a3b1b7' : '#52646d' }}>
                  <span>{d.dow}</span>
                  <span style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 600, background: d.n === todayDay ? '#0a1c24' : 'transparent', color: d.n === todayDay ? '#fff' : 'inherit' }}>
                    {d.n}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div style={{ position: 'relative' }}>
            {/* Column backgrounds */}
            <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 170, right: 0, display: 'grid', gridTemplateColumns: `repeat(${daysInMonth},minmax(0,1fr))`, pointerEvents: 'none' }}>
              {days.map(d => <span key={d.n} style={{ background: d.we ? '#f6f8f9' : 'transparent', borderLeft: '1px solid #f1f4f5' }} />)}
            </div>

            {rows.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-2)', gridColumn: '1/-1' }}>
                Aucun congé approuvé ce mois-ci.
              </div>
            ) : (
              rows.map(({ name, bars }, ri) => (
                <div key={name} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '170px 1fr', alignItems: 'center', height: 46, borderTop: '1px solid #f1f4f5' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, paddingRight: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: AVS[ri % AVS.length], color: '#fff', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                      {ini(name)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  </span>
                  <div style={{ position: 'relative', height: '100%' }}>
                    {bars.map((l, bi) => {
                      const color = TYPE_COLORS[l.type] || '#16b6c8';
                      const typeLabel = TYPE_LABELS[l.type] || l.type;
                      return (
                        <span key={bi}
                          title={`${name} — ${typeLabel} du ${l.start_date} au ${l.end_date || l.start_date}`}
                          style={{
                            position: 'absolute', top: 9, bottom: 9,
                            left: `${barLeft(l)}%`, width: `${barWidth(l)}%`,
                            borderRadius: 8, background: color, color: '#fff',
                            fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center',
                            padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden',
                            boxShadow: `0 6px 14px -8px ${color}`,
                          }}>
                          {typeLabel} · {l.days || '?'} j
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Today line */}
          {todayDay && (
            <div aria-hidden="true" style={{
              position: 'absolute', top: 36, bottom: 14,
              left: `calc(170px + 20px + (100% - 190px - 40px) * ${((todayDay - 0.5) / daysInMonth).toFixed(4)})`,
              width: 2, background: '#16b6c8', boxShadow: '0 0 10px rgba(22,182,200,.6)', pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Leave Modal ───────────────────────────────────────────────────────────
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
      sick:   (balance.sick_total || 0)   - (balance.sick_used || 0),
      personal: (balance.personal_total || 0) - (balance.personal_used || 0),
    };
    return map[form.type] ?? null;
  }, [balance, form.type]);

  const hasWarning = remaining !== null && days > remaining;
  const typeColor = TYPE_COLORS[form.type] || 'var(--primary)';

  const mutation = useMutation({
    mutationFn: () => createLeave({ ...form, days }),
    onSuccess: () => { toast.success('Congé enregistré'); qc.invalidateQueries({ queryKey: ['leaves'] }); onCreated(); onClose(); },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur création')),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label className="label" style={{ display: 'block', marginBottom: 6 }}>Employé</label>
        <select className="input" style={{ width: '100%' }} value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
          <option value="">Sélectionner un employé…</option>
          {employees.map((e: any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
      </div>

      <div>
        <label className="label" style={{ display: 'block', marginBottom: 6 }}>Type de congé</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {Object.entries(TYPE_LABELS).slice(0, 6).map(([k, v]) => (
            <button key={k} type="button" onClick={() => set('type', k)} style={{
              padding: '7px 6px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 500,
              border: form.type === k ? `2px solid ${TYPE_COLORS[k]}` : '1px solid var(--border)',
              background: form.type === k ? TYPE_COLORS[k] + '18' : 'transparent',
              color: form.type === k ? TYPE_COLORS[k] : 'var(--text-2)',
            }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Début</label>
          <input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Fin</label>
          <input className="input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={{ width: '100%' }} />
        </div>
      </div>

      {days > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px', borderRadius: 8, background: hasWarning ? '#fef2f2' : 'var(--primary-soft)', border: `1px solid ${hasWarning ? '#fca5a5' : typeColor + '30'}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: hasWarning ? '#ef4444' : typeColor }}>{days} jour{days > 1 ? 's' : ''}</span>
          {remaining !== null && (
            <span style={{ fontSize: 11, color: hasWarning ? '#ef4444' : 'var(--text-2)' }}>
              {hasWarning ? `⚠ Solde insuffisant (${remaining} restants)` : `Solde après : ${remaining - days} j`}
            </span>
          )}
        </div>
      )}

      <div>
        <label className="label" style={{ display: 'block', marginBottom: 6 }}>Motif (optionnel)</label>
        <textarea className="input" rows={2} value={form.reason} onChange={e => set('reason', e.target.value)} style={{ resize: 'none', width: '100%' }} placeholder="Raison de la demande…" />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.employee_id || !form.start_date || !form.end_date || days === 0}>
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TimeOffPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const [showModal, setShowModal] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [params, setParams] = useSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', 'all'],
    queryFn: () => listLeaves({ limit: 200 }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => reviewLeave(id, status),
    onSuccess: (_, v) => {
      toast.success(v.status === 'approved' ? 'Demande approuvée' : 'Demande rejetée');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const allLeaves: LeaveRequest[] = data?.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const onToday = allLeaves.filter(l =>
    l.status === 'approved' && l.start_date <= today && today <= (l.end_date || l.start_date)
  ).length;
  const monthLeaves = allLeaves.filter(l => {
    const y = calDate.getFullYear(), m = String(calDate.getMonth() + 1).padStart(2, '0');
    return l.start_date?.startsWith(`${y}-${m}`) || l.end_date?.startsWith(`${y}-${m}`);
  });
  const pending = allLeaves.filter(l => l.status === 'pending');

  const avgBalance = 11.2; // Would come from API

  // Leave balance list data (aggregate per employee from real data)
  const byEmployee = useMemo(() => {
    const map = new Map<string, { name: string; approved: number; total: number }>();
    allLeaves.filter(l => l.status === 'approved').forEach(l => {
      const id = l.employee_id;
      if (!map.has(id)) map.set(id, { name: l.employees?.full_name || '?', approved: 0, total: 18 });
      map.get(id)!.approved += l.days || 0;
    });
    return Array.from(map.values()).slice(0, 8);
  }, [allLeaves]);

  return (
    <Page>
      <PageHeader
        title="Congés"
        subtitle="Qui est absent, quand, et combien de jours il reste à chacun."
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pending.length > 0 && (
              <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Inbox size={15} />
                {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} strokeWidth={2.2} /> Enregistrer un congé
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <div style={{ padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(135deg,#5444b8,#6d5ad6)', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', opacity: .9 }}>En congé aujourd'hui</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>{onToday}</div>
        </div>
        <div style={{ padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Jours posés ce mois</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>
            {monthLeaves.reduce((s, l) => s + (l.days || 0), 0)}
          </div>
        </div>
        <div style={{ padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Solde moyen</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>{avgBalance} j</div>
        </div>
        <div style={{ padding: '16px 18px', borderRadius: 18, background: '#fff', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>En attente</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, letterSpacing: '-.04em', marginTop: 4 }}>{pending.length}</div>
        </div>
      </div>

      {/* Gantt chart */}
      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
      ) : (
        <GanttView
          leaves={allLeaves}
          calDate={calDate}
          onPrev={() => setCalDate(subMonths(calDate, 1))}
          onNext={() => setCalDate(addMonths(calDate, 1))}
        />
      )}

      {/* Pending requests list */}
      {pending.length > 0 && (
        <div style={{ borderRadius: 20, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
            Demandes en attente
          </div>
          {pending.map((req, i) => {
            const color = TYPE_COLORS[req.type] || 'var(--primary)';
            let startFmt = req.start_date;
            try { startFmt = format(parseISO(req.start_date), 'dd MMM'); } catch { /* keep */ }
            let endFmt = req.end_date;
            try { endFmt = req.end_date ? format(parseISO(req.end_date), 'dd MMM yyyy') : ''; } catch { /* keep */ }
            return (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < pending.length - 1 ? '1px solid #eef2f4' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>
                  {(req.employees?.full_name || '?')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{req.employees?.full_name || '—'}</span>
                    <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: color + '20', color, fontWeight: 500 }}>
                      {TYPE_LABELS[req.type] || req.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    {startFmt} → {endFmt} · <strong>{req.days}</strong> jour{req.days > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => reviewMutation.mutate({ id: req.id, status: 'rejected' })}
                    style={{ height: 34, padding: '0 12px', borderRadius: 9, border: '1px solid var(--border)', background: '#fff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <X size={13} /> Refuser
                  </button>
                  <button onClick={() => reviewMutation.mutate({ id: req.id, status: 'approved' })}
                    style={{ height: 34, padding: '0 12px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#fff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Check size={13} /> Approuver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom: Balances + Policy + Holidays */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Leave balances */}
        <div style={{ flex: '2 1 520px', minWidth: 0, borderRadius: 20, background: '#fff', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Soldes de congés</div>
          {byEmployee.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>Aucune donnée de congés approuvés.</div>
          ) : byEmployee.map(({ name, approved, total }) => {
            const left = Math.max(total - approved, 0);
            const pct = Math.round(left / total * 100);
            const barColor = pct < 35 ? '#df9326' : 'linear-gradient(90deg,#0e6f84,#16b6c8)';
            return (
              <div key={name} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.4fr) minmax(0,2fr) 90px', alignItems: 'center', gap: 14, padding: '11px 20px', borderTop: '1px solid #eef2f4' }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</span>
                <span style={{ height: 8, borderRadius: 99, background: '#eef2f4', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${pct}%`, borderRadius: 99, background: barColor }} />
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, textAlign: 'right' }}>
                  <strong style={{ color: 'var(--text)' }}>{left}</strong> / {total} j
                </span>
              </div>
            );
          })}
        </div>

        {/* Policy + Holidays */}
        <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Policy */}
          <div style={{ padding: 20, borderRadius: 20, background: '#fff', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Scale size={17} style={{ color: 'var(--success-ink)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Politique de congés</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14, fontSize: 13.5, color: '#33474f' }}>
              {[
                ['Acquisition', '1,5 j / mois'],
                ['Ancienneté',  '+1,5 j / 5 ans'],
                ['Plafond',     '30 jours ouvrables'],
                ['Jours fériés','Maroc 2026'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming holidays */}
          <div style={{ padding: 20, borderRadius: 20, background: '#fff', border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Prochains jours fériés</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {HOLIDAYS.map(h => (
                <div key={h.day + h.mon} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 44, textAlign: 'center', padding: '6px 0', borderRadius: 10, background: '#fbefda', color: '#8a5207', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, lineHeight: 1.2, flexShrink: 0 }}>
                    {h.day}<br />{h.mon}
                  </span>
                  <span style={{ fontSize: 13.5 }}>{h.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New leave modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Enregistrer un congé" width={460}>
        <NewLeaveModal onClose={() => setShowModal(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['leaves'] })} />
      </Modal>
    </Page>
  );
}
