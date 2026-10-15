import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Inbox, Calendar, UserX, FileWarning, Percent, CheckCircle2, XCircle, Clock, FileClock, ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { getDashboardKpis } from '@/services/api';
import { Spinner } from '../ui';

const P = ['#0e6f84', '#16b6c8', '#6d5ad6', '#16a06b', '#df9326', '#df5740'];
const PERIODS = [
  { days: 30, label: '30 jours' },
  { days: 90, label: '3 mois' },
  { days: 180, label: '6 mois' },
  { days: 365, label: '12 mois' },
];
// Tile gradients — dark enough end-to-end for white text
const GRAD = {
  teal:   ['#0b5f72', '#0e7f96'],
  green:  ['#0f6f49', '#16915f'],
  amber:  ['#a8650a', '#c9810f'],
  violet: ['#5444b8', '#6d5ad6'],
  red:    ['#b8402c', '#d1503a'],
  cyan:   ['#0b7f90', '#0f98ab'],
} as const;

const TIP: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12,
  color: 'var(--ink)', boxShadow: '0 4px 16px rgba(10,28,36,.12)', padding: '8px 12px',
};
const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow-sm)',
};
const axis = { fontSize: 11, fill: 'var(--ink-3)' as string };

/** Priority KPI: solid gradient tile, big number, faded icon watermark. */
function Tile({ icon, label, value, sub, grad, to, hint }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
  grad: readonly [string, string]; to?: string; hint?: string;
}) {
  const [hov, setHov] = useState(false);
  const body = (
    <div
      title={hint}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', overflow: 'hidden', height: '100%', borderRadius: 16, padding: '15px 16px 14px',
        background: `linear-gradient(135deg, ${grad[0]} 0%, ${grad[1]} 100%)`, color: '#fff',
        boxShadow: hov && to ? `0 10px 24px -8px ${grad[0]}` : '0 4px 14px -6px rgba(10,28,36,.35)',
        transform: hov && to ? 'translateY(-3px)' : 'none', transition: 'box-shadow .18s, transform .18s',
        cursor: to ? 'pointer' : 'default', minHeight: 124,
      }}>
      {/* decorative circles + watermark icon */}
      <span style={{ position: 'absolute', right: -26, top: -26, width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,.10)' }} />
      <span style={{ position: 'absolute', right: 18, bottom: -34, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
      <div style={{ position: 'absolute', right: 12, bottom: 10, opacity: 0.22 }}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 46 }) : icon}
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.88)', margin: 0, lineHeight: 1.3, minHeight: 27 }}>{label}</p>
          {to && <ArrowUpRight size={14} style={{ opacity: hov ? 1 : 0.55, flexShrink: 0, transition: 'opacity .15s' }} />}
        </div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, letterSpacing: '-.04em', margin: '2px 0 4px', lineHeight: 1.05 }}>{value}</p>
        {sub && <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.92)', margin: 0, lineHeight: 1.35 }}>{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} style={{ display: 'block', textDecoration: 'none', color: 'inherit', height: '100%' }}>{body}</Link> : body;
}

/** Secondary KPI: white card with an accent chip; optional visual on the right. */
function Kpi({ icon, label, value, sub, color = 'var(--primary)', to, muted, hint, visual, children }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
  color?: string; to?: string; muted?: boolean; hint?: string; visual?: React.ReactNode; children?: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  const body = (
    <div
      title={hint}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        ...card, padding: '14px 16px', position: 'relative', overflow: 'hidden', height: '100%',
        borderStyle: muted ? 'dashed' : 'solid', cursor: to ? 'pointer' : 'default',
        boxShadow: hov && to ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hov && to ? 'translateY(-2px)' : 'none', transition: 'box-shadow .15s, transform .15s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: muted ? 'var(--surface-2)' : `color-mix(in srgb, ${color} 14%, transparent)`, color: muted ? 'var(--ink-3)' : color,
        }}>{icon}</span>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: 0, lineHeight: 1.25 }}>{label}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-.035em', color: muted ? 'var(--ink-3)' : 'var(--ink)', margin: '0 0 2px', lineHeight: 1.1 }}>{value}</p>
          {sub && <p style={{ fontSize: 11.5, color: 'var(--ink-2)', margin: 0, lineHeight: 1.35 }}>{sub}</p>}
        </div>
        {visual}
      </div>
      {children}
    </div>
  );
  return to ? <Link to={to} style={{ display: 'block', textDecoration: 'none', color: 'inherit', height: '100%' }}>{body}</Link> : body;
}

/** Circular gauge (0–100). */
function Gauge({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: 74, height: 74, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={[{ v: Math.max(0, Math.min(100, value)) }]} innerRadius="72%" outerRadius="100%" barSize={9} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="v" cornerRadius={8} fill={color} background={{ fill: 'var(--surface-2)' }} />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ShareBar({ part, total, color }: { part: number; total: number; color: string }) {
  if (!total) return null;
  return (
    <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-2)', marginTop: 9, overflow: 'hidden' }}>
      <div style={{ width: `${Math.round((part / total) * 100)}%`, height: '100%', background: color, borderRadius: 99 }} />
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ ...card, padding: '18px 20px', minWidth: 0 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', letterSpacing: '-.02em', margin: 0 }}>{title}</p>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '2px 0 14px' }}>{subtitle}</p>}
      {!subtitle && <div style={{ height: 14 }} />}
      {children}
    </div>
  );
}

const Empty = ({ text }: { text: string }) => (
  <div style={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>{text}</div>
);

const SectionTitle = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '4px 0 12px', flexWrap: 'wrap' }}>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)', margin: 0 }}>{children}</h2>
    {right}
  </div>
);

export function HrKpis() {
  const [days, setDays] = useState(30);
  const { data: k, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-kpis', days],
    queryFn: () => getDashboardKpis(days),
    refetchInterval: 60_000,
    retry: 2,
  });
  const periodLabel = PERIODS.find(p => p.days === days)?.label ?? `${days} jours`;

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>;
  if (isError || !k) {
    return (
      <div style={{ ...card, padding: 24, marginBottom: 24, color: 'var(--danger)', fontSize: 13 }}>
        Impossible de charger les indicateurs RH. <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>Réessayer</button>
      </div>
    );
  }

  const { workforce: w, today_status: t, requests: r, documents: d, attendance_rate: a, expiring_contracts: c } = k;
  const docParts = [
    d.pending_requests ? `${d.pending_requests} demande${d.pending_requests > 1 ? 's' : ''}` : '',
    d.incomplete ? `${d.incomplete} incomplet${d.incomplete > 1 ? 's' : ''}` : '',
    d.expired ? `${d.expired} expiré${d.expired > 1 ? 's' : ''}` : '',
    d.to_renew ? `${d.to_renew} à renouveler` : '',
  ].filter(Boolean);
  const reqParts = [`${r.pending_leave} congé${r.pending_leave > 1 ? 's' : ''}`, `${r.pending_document} document${r.pending_document > 1 ? 's' : ''}`, `${r.pending_other} autre${r.pending_other > 1 ? 's' : ''}`];
  const decided = r.accepted + r.refused;
  const todayLabel = new Date(k.today).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ marginBottom: 12 }}>
      {k.warnings && k.warnings.length > 0 && (
        <div style={{ marginBottom: 12, padding: '9px 14px', borderRadius: 10, background: 'var(--warn-soft, #fff7e6)', color: 'var(--warn)', fontSize: 12.5, fontWeight: 600 }}>
          Données partielles : lecture impossible pour {k.warnings.join(', ')}. Les chiffres concernés peuvent être incomplets.
        </div>
      )}

      {/* ── Priority KPIs ── */}
      <SectionTitle right={<span style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'capitalize' }}>Aujourd'hui · {todayLabel}</span>}>
        Indicateurs prioritaires
      </SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Tile icon={<Users />} label="Total employés" value={w.total} grad={GRAD.teal} to="/app/employees"
          sub={`${w.active} actif${w.active > 1 ? 's' : ''} · ${w.inactive} inactif${w.inactive > 1 ? 's' : ''}`} />
        <Tile icon={<UserCheck />} label="Employés présents" value={t.present} grad={GRAD.green} to="/app/employees"
          sub={k.workday ? `sur ${w.active} actifs` : 'Jour non ouvré'}
          hint="Estimé : employés actifs moins ceux en congé ou absents aujourd'hui (d'après les congés approuvés, sans pointage)" />
        <Tile icon={<Inbox />} label="Demandes en attente" value={r.pending} grad={GRAD.amber} to="/app/requests"
          sub={r.pending ? reqParts.join(' · ') : 'Rien à valider'} />
        <Tile icon={<Calendar />} label="Congés en cours" value={t.on_leave} grad={GRAD.violet} to="/app/timeoff"
          sub="en congé aujourd'hui" hint="Employés dont un congé approuvé couvre aujourd'hui (hors maladie / sans solde)" />
        <Tile icon={<UserX />} label="Absences du jour" value={t.absent} grad={GRAD.red} to="/app/timeoff"
          sub="maladie / sans solde" hint="Employés en congé maladie ou sans solde aujourd'hui" />
        <Tile icon={<FileWarning />} label="Documents à traiter" value={d.to_process} grad={GRAD.cyan}
          to={d.pending_requests ? '/app/requests?kind=document' : '/app/employees'}
          sub={docParts.length ? docParts.join(' · ') : 'Tout est à jour'}
          hint="Demandes de documents en attente + dossiers employés incomplets (CIN, contrat ou date d'embauche manquants), contrats expirés ou à renouveler" />
      </div>

      {/* ── Other KPIs ── */}
      <SectionTitle right={
        <div role="group" aria-label="Période" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Période</span>
          {PERIODS.map(p => (
            <button key={p.days} onClick={() => setDays(p.days)} aria-pressed={days === p.days}
              style={{
                padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${days === p.days ? 'var(--primary)' : 'var(--line)'}`,
                background: days === p.days ? 'var(--primary-soft)' : 'var(--surface)',
                color: days === p.days ? 'var(--primary)' : 'var(--ink-2)',
              }}>{p.label}</button>
          ))}
        </div>
      }>Autres indicateurs RH</SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
        <Kpi icon={<Percent size={13} />} label="Taux de présence" color={P[3]}
          value={a.rate === null ? '—' : `${Math.round(a.rate)}%`}
          sub={a.rate === null ? 'Aucune donnée' : `sur ${periodLabel}`}
          hint={`${a.absent_days} jour(s) d'absence sur ${a.capacity_days} jours de présence attendus (jours ouvrés, d'après les congés approuvés)`}
          visual={a.rate === null ? undefined : <Gauge value={a.rate} color={P[3]} />} />
        <Kpi icon={<CheckCircle2 size={13} />} label="Demandes acceptées" value={r.accepted} color={P[3]} to="/app/requests" sub={`sur ${periodLabel}`}>
          <ShareBar part={r.accepted} total={decided} color={P[3]} />
        </Kpi>
        <Kpi icon={<XCircle size={13} />} label="Demandes refusées" value={r.refused} color={P[5]} to="/app/requests" sub={`sur ${periodLabel}`}>
          <ShareBar part={r.refused} total={decided} color={P[5]} />
        </Kpi>
        <Kpi icon={<Clock size={13} />} label="Retards du jour" muted value="—" sub="Pointage non activé"
          hint="Aucune donnée d'heure d'arrivée : il faut activer un suivi de pointage pour calculer les retards" />
        <Kpi icon={<FileClock size={13} />} label="Contrats à échéance" value={c.count} color={P[4]} to="/app/employees"
          sub={`sous 30 jours${c.expired ? ` · ${c.expired} expiré${c.expired > 1 ? 's' : ''}` : ''}`}>
          {c.items.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {c.items.slice(0, 3).map(i => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-2)' }}>
                  <ChevronRight size={10} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</span>
                  <span style={{ color: i.days_left <= 7 ? 'var(--danger)' : 'var(--ink-3)', fontWeight: 600 }}>{i.days_left} j</span>
                </div>
              ))}
            </div>
          )}
        </Kpi>
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Panel title="Effectif par service" subtitle="Répartition des employés actifs">
          {k.by_department.length === 0 ? <Empty text="Aucune donnée" /> : (
            <ResponsiveContainer width="100%" height={Math.max(170, Math.min(k.by_department.length, 8) * 30)}>
              <BarChart data={k.by_department.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis type="number" tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ ...axis, fill: 'var(--ink-2)' as string }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={TIP} cursor={{ fill: 'var(--surface-2)' }} formatter={(v: number) => [`${v} employé${v > 1 ? 's' : ''}`, '']} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={14}>
                  {k.by_department.slice(0, 8).map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Répartition par type de contrat" subtitle="CDI, CDD, stagiaires…">
          {k.by_contract.length === 0 ? <Empty text="Aucune donnée" /> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ width: 150, height: 150, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={k.by_contract} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={2}>
                      {k.by_contract.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TIP} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 120 }}>
                {k.by_contract.map((x, i) => (
                  <div key={x.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: P[i % P.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', flex: 1 }}>{x.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{x.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Évolution de l'effectif" subtitle={`Recrutements et départs · ${k.evolution.length} derniers mois`}>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={k.evolution} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="r" orientation="right" tick={axis} axisLine={false} tickLine={false} allowDecimals={false} domain={['dataMin - 2', 'dataMax + 2']} hide />
              <Tooltip contentStyle={TIP} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="hires" name="Recrutements" fill={P[3]} radius={[4, 4, 0, 0]} barSize={14} />
              <Bar yAxisId="l" dataKey="departures" name="Départs" fill={P[5]} radius={[4, 4, 0, 0]} barSize={14} />
              <Line yAxisId="r" type="monotone" dataKey="headcount" name="Effectif" stroke={P[0]} strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
