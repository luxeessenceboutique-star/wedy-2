import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, CheckCircle, Clock, FileSignature, Search, ChevronRight,
  Plus, X, Star, MessageSquare, Trash2, UserCheck, Zap,
} from 'lucide-react';
import { api } from '@/services/api';
import { Button, Badge, Spinner, Avatar, Input } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { format, isValid, differenceInDays } from 'date-fns';
import { useLang } from '../../lib/lang';

const safeFormat = (d: any, fmt = 'dd/MM/yyyy') => {
  if (!d) return '—'; const dt = new Date(d);
  return isValid(dt) ? format(dt, fmt) : '—';
};

// ── API calls ──────────────────────────────────────────────────────────────────
const getOnboarding   = (id: string) => api.get(`/employee-onboarding/${id}`).then(r => r.data);
const patchOnboarding = (id: string, body: any) => api.patch(`/employee-onboarding/${id}`, body).then(r => r.data);
const signContract    = (id: string) => api.post(`/employee-onboarding/${id}/sign-contract`).then(r => r.data);
const getPulse        = (id: string) => api.get(`/employee-onboarding/${id}/pulse`).then(r => r.data);
const createPulse     = (id: string, body: any) => api.post(`/employee-onboarding/${id}/pulse`, body).then(r => r.data);
const deletePulse     = (id: string, pid: string) => api.delete(`/employee-onboarding/${id}/pulse/${pid}`);
const listEmployees   = () => api.get('/employees?status=active&limit=200').then(r => r.data);

// ── Checklist block ────────────────────────────────────────────────────────────
function ChecklistBlock({
  label, color, items, onChange,
}: { label: string; color: string; items: any[]; onChange: (updated: any[]) => void }) {
  const done = items.filter(i => i.done).length;
  const pct  = items.length ? Math.round(done / items.length * 100) : 0;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
        <span style={{ fontSize: 12, color: pct === 100 ? 'var(--success)' : 'var(--ink-2)', fontWeight: 600 }}>{done}/{items.length}</span>
      </div>
      <div style={{ height: 4, background: 'var(--line)', borderRadius: 4, marginBottom: 10 }}>
        <div style={{ height: 4, width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      {items.map(item => (
        <label key={item.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
          background: item.done ? color + '15' : 'var(--surface)',
          border: `1px solid ${item.done ? color + '44' : 'var(--line)'}`,
          borderRadius: 8, marginBottom: 5, cursor: 'pointer',
        }}>
          <input type="checkbox" checked={item.done}
            onChange={e => onChange(items.map(i => i.id === item.id ? { ...i, done: e.target.checked } : i))}
            style={{ accentColor: color, width: 15, height: 15 }} />
          <span style={{ fontSize: 13, flex: 1, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--ink-2)' : 'var(--fg)' }}>
            {item.label}
          </span>
          {item.done && <CheckCircle size={13} style={{ color }} />}
        </label>
      ))}
    </div>
  );
}

// ── Pulse form ─────────────────────────────────────────────────────────────────
function PulseForm({ employeeId, onDone }: { employeeId: string; onDone: () => void }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [form, setForm] = useState({ week_number: 1, satisfaction_score: 3, integration_score: 3, clarity_score: 3, comment: '' });
  const mut = useMutation({
    mutationFn: () => createPulse(employeeId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pulse', employeeId] }); toast.success(t('save')); onDone(); },
    onError: () => toast.error('Error'),
  });
  const StarIcon = ({ field, val }: { field: string; val: number }) => (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => setForm(f => ({ ...f, [field]: n }))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: n <= val ? 'var(--warn)' : '#d1d5db' }}>★</button>
      ))}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Input label={`${t('week_label')} #`} type="number" value={form.week_number} onChange={e => setForm(f => ({ ...f, week_number: +e.target.value }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[['satisfaction_score', t('pulse_sat')], ['integration_score', t('pulse_int')], ['clarity_score', t('pulse_cla')]].map(([field, lbl]) => (
          <div key={field} style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{lbl}</p>
            <StarIcon field={field} val={(form as any)[field]} />
          </div>
        ))}
      </div>
      <div>
        <label className="label">Commentaire</label>
        <textarea className="input" rows={2} style={{ resize: 'none', padding: '8px 12px' }}
          value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="..." />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onDone}>{t('cancel')}</Button>
        <Button onClick={() => mut.mutate()} loading={mut.isPending}>{t('save')}</Button>
      </div>
    </div>
  );
}

// ── Employee drawer ────────────────────────────────────────────────────────────
function EmployeeOnboardingDrawer({ employee, onClose }: { employee: any; onClose: () => void }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'plan' | 'pulse'>('plan');
  const [showPulseForm, setShowPulseForm] = useState(false);

  const PHASES = [
    { id: 'day30', label: '30 '+t('days_short'), color: 'var(--warn)', bg: 'var(--warn-soft)' },
    { id: 'day60', label: '60 '+t('days_short'), color: 'var(--primary)', bg: 'var(--primary-soft)' },
    { id: 'day90', label: '90 '+t('days_short'), color: 'var(--violet)', bg: 'var(--violet-soft)' },
    { id: 'completed', label: t('status_completed_item'), color: 'var(--success)', bg: 'var(--success-soft)' },
  ];
  const phaseMeta = (p: string) => PHASES.find(x => x.id === p) ?? PHASES[0];
  const phaseIdx  = (p: string) => PHASES.findIndex(x => x.id === p);

  const { data: ob, isLoading } = useQuery({
    queryKey: ['emp-onboarding', employee.id],
    queryFn: () => getOnboarding(employee.id),
    retry: false,
  });
  const { data: pulses = [] } = useQuery({
    queryKey: ['pulse', employee.id],
    queryFn: () => getPulse(employee.id),
    retry: false,
  });

  const patchMut = useMutation({
    mutationFn: (body: any) => patchOnboarding(employee.id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emp-onboarding', employee.id] }),
  });
  const signMut = useMutation({
    mutationFn: () => signContract(employee.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emp-onboarding', employee.id] }); toast.success(t('save')); },
  });
  const delPulseMut = useMutation({
    mutationFn: (pid: string) => deletePulse(employee.id, pid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pulse', employee.id] }),
  });

  const phase = ob?.phase ?? 'day30';
  const pm    = phaseMeta(phase);
  const pi    = phaseIdx(phase);

  const allItems = [...(ob?.plan_30 ?? []), ...(ob?.plan_60 ?? []), ...(ob?.plan_90 ?? [])];
  const globalPct = allItems.length ? Math.round(allItems.filter((i: any) => i.done).length / allItems.length * 100) : 0;

  const daysSinceHire = employee.hire_date
    ? differenceInDays(new Date(), new Date(employee.hire_date))
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ width: 600, background: 'var(--bg)', borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar name={employee.full_name} src={employee.photo_url} size={52} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{employee.full_name}</h2>
            <p style={{ fontSize: 13, color: 'var(--primary)', margin: '2px 0' }}>{employee.position}</p>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--ink-2)' }}>
              {daysSinceHire !== null && <span><Clock size={11} /> J+{daysSinceHire}</span>}
              {ob?.contract_signed && <span style={{ color: 'var(--success)' }}><CheckCircle size={11} /> {t('status_signed')}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}><X size={20} /></button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
        ) : (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Progress */}
            <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#667eea22,#764ba222)', border: '1px solid #667eea44', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{t('global_progress')}</span>
                <span style={{ fontWeight: 800, fontSize: 22, color: '#667eea' }}>{globalPct}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--line)', borderRadius: 8 }}>
                <div style={{ height: 8, width: `${globalPct}%`, background: 'linear-gradient(90deg,#667eea,#764ba2)', borderRadius: 8, transition: 'width 0.4s' }} />
              </div>
            </div>

            {/* Phase stepper */}
            <div style={{ display: 'flex', gap: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              {PHASES.map((p, i) => (
                <button key={p.id} onClick={() => patchMut.mutate({ phase: p.id })}
                  style={{
                    flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: phase === p.id ? 700 : 500,
                    background: phase === p.id ? p.color : i < pi ? p.bg : 'transparent',
                    color: phase === p.id ? '#fff' : i < pi ? p.color : 'var(--ink-2)',
                    borderRight: i < 3 ? '1px solid var(--line)' : 'none', transition: 'all 0.2s',
                  }}>
                  {i < pi && phase !== p.id && <CheckCircle size={11} style={{ display: 'inline', marginRight: 3 }} />}
                  {p.label}
                </button>
              ))}
            </div>

            {/* Contract + buddy */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px 14px', border: `1px solid ${ob?.contract_signed ? '#10b98144' : 'var(--line)'}`, borderRadius: 10, background: ob?.contract_signed ? 'var(--success-soft)' : 'var(--surface)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--ink-2)', textTransform: 'uppercase' }}>{t('file_contract')}</p>
                {ob?.contract_signed ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>
                    <CheckCircle size={14} /> {t('status_signed')} {safeFormat(ob.contract_signed_at)}
                  </div>
                ) : (
                  <Button size="sm" onClick={() => signMut.mutate()} loading={signMut.isPending}>
                    <FileSignature size={12} /> {t('sign_contract_mark')}
                  </Button>
                )}
              </div>
              <div style={{ padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--ink-2)', textTransform: 'uppercase' }}>Buddy</p>
                <Input placeholder="Buddy Name" value={ob?.buddy_name ?? ''}
                  onChange={e => patchMut.mutate({ buddy_name: e.target.value })}
                  style={{ marginBottom: 4 }} />
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', gap: 20 }}>
              {[{ id: 'plan', label: 'Plan 30-60-90' }, { id: 'pulse', label: `Pulse surveys (${pulses.length})` }].map(t_item => (
                <button key={t_item.id} onClick={() => setTab(t_item.id as any)} style={{
                  padding: '8px 0', fontSize: 13, fontWeight: 600,
                  borderBottom: tab === t_item.id ? '2px solid var(--primary)' : '2px solid transparent',
                  color: tab === t_item.id ? 'var(--primary)' : 'var(--ink-2)',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}>{t_item.label}</button>
              ))}
            </div>

            {tab === 'plan' && ob && (
              <div>
                <ChecklistBlock label={`30 ${t('days_short')}`} color="var(--warn)" items={ob.plan_30 ?? []}
                  onChange={items => patchMut.mutate({ plan_30: items })} />
                <ChecklistBlock label={`60 ${t('days_short')}`} color="var(--primary)" items={ob.plan_60 ?? []}
                  onChange={items => patchMut.mutate({ plan_60: items })} />
                <ChecklistBlock label={`90 ${t('days_short')}`} color="var(--violet)" items={ob.plan_90 ?? []}
                  onChange={items => patchMut.mutate({ plan_90: items })} />
              </div>
            )}

            {tab === 'pulse' && (
              <div>
                {showPulseForm ? (
                  <div style={{ padding: '14px 16px', border: '1px solid var(--line)', borderRadius: 10, marginBottom: 16 }}>
                    <PulseForm employeeId={employee.id} onDone={() => setShowPulseForm(false)} />
                  </div>
                ) : (
                  <Button variant="soft" onClick={() => setShowPulseForm(true)} style={{ marginBottom: 16 }}>
                    <Plus size={13} /> {t('pulse_new')}
                  </Button>
                )}
                {pulses.length === 0 ? (
                  <p style={{ color: 'var(--ink-2)', fontSize: 13, textAlign: 'center', padding: 20 }}>{t('no_pulse')}</p>
                ) : (
                  pulses.map((p: any) => {
                    const avg = ((p.satisfaction_score + p.integration_score + p.clarity_score) / 3).toFixed(1);
                    return (
                      <div key={p.id} style={{ padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, marginBottom: 8, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{t('week_label')} {p.week_number}</span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: 'var(--warn)' }}>★ {avg}/5</span>
                            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{safeFormat(p.created_at)}</span>
                            <button onClick={() => delPulseMut.mutate(p.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-2)', marginBottom: p.comment ? 6 : 0 }}>
                          <span>{t('pulse_sat')}: <b>{p.satisfaction_score}/5</b></span>
                          <span>{t('pulse_int')}: <b>{p.integration_score}/5</b></span>
                          <span>{t('pulse_cla')}: <b>{p.clarity_score}/5</b></span>
                        </div>
                        {p.comment && <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--ink-2)', margin: 0 }}>"{p.comment}"</p>}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function EmployeeOnboardingPage() {
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data: empData, isLoading } = useQuery({
    queryKey: ['employees-active'],
    queryFn: listEmployees,
  });

  const employees: any[] = (empData?.data ?? []).filter((e: any) =>
    !search || e.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Only show employees hired in last 120 days or those explicitly added
  const recentHires = employees.filter((e: any) => {
    if (!e.hire_date) return false;
    const days = differenceInDays(new Date(), new Date(e.hire_date));
    return days >= 0 && days <= 120;
  });

  const display = recentHires.length > 0 ? recentHires : employees.slice(0, 20);

  const phaseColor = (days: number | null) => {
    if (days === null) return 'var(--ink-2)';
    if (days <= 30) return 'var(--warn)';
    if (days <= 60) return 'var(--primary)';
    if (days <= 90) return 'var(--violet)';
    return 'var(--success)';
  };
  const phaseLabel = (days: number | null) => {
    if (days === null) return '—';
    if (days <= 30) return 'J+30';
    if (days <= 60) return 'J+60';
    if (days <= 90) return 'J+90';
    return t('status_completed_item');
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title={t('onboarding_title')}
        subtitle={`${display.length} ${t('nav_people')} ${t('in_onboarding')}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge variant="primary">{display.filter(e => differenceInDays(new Date(), new Date(e.hire_date ?? '')) <= 30).length} ≤ 30j</Badge>
            <Badge variant="default">{display.filter(e => { const d = differenceInDays(new Date(), new Date(e.hire_date ?? '')); return d > 30 && d <= 90; }).length} 30-90j</Badge>
          </div>
        }
      />

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }} />
        <input className="input" style={{ paddingLeft: 36 }} placeholder={`${t('search')}...`}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : display.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-2)' }}>
          <UserCheck size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontWeight: 500 }}>{t('no_recent_hires')}</p>
          <p style={{ fontSize: 13 }}>{t('no_recent_hires_desc')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {display.map((emp: any) => {
            const days = emp.hire_date ? differenceInDays(new Date(), new Date(emp.hire_date)) : null;
            const color = phaseColor(days);
            const label = phaseLabel(days);
            return (
              <div key={emp.id} className="card card-pad hover-scale" style={{ cursor: 'pointer' }}
                onClick={() => setSelected(emp)}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <Avatar name={emp.full_name} src={emp.photo_url} size={44} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{emp.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--primary)' }}>{emp.position || '—'}</p>
                  </div>
                  <span style={{ background: color + '22', color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)' }}>
                  <span>{emp.department || '—'}</span>
                  <span>{t('hire_date_label')}: {safeFormat(emp.hire_date)}</span>
                </div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {t('view_plan')} <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <EmployeeOnboardingDrawer employee={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
