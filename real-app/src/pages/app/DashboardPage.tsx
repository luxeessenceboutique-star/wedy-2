import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, FileText, Wand2, TrendingUp, Clock, MessageSquare,
  Briefcase, ArrowRight, Bot,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { subMonths, format } from 'date-fns';
import { listEmployees, listDocuments, getDashboardMetrics, listRequests } from '../../lib/api';
import { Badge, Spinner, StatCard } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useLang } from '../../lib/lang';

// Brand-aligned palette (works in SVG context)
const P = ['#0e6f84', '#16b6c8', '#6d5ad6', '#16a06b', '#df9326', '#df5740'];

// ── Tooltip style shared ──────────────────────────────────────────
const TIP_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--ink)',
  boxShadow: '0 4px 16px rgba(10,28,36,.12)',
  padding: '8px 12px',
};

// ── Custom area chart tooltip ────────────────────────────────────
function AreaTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TIP_STYLE}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>{label}</p>
      <p style={{ color: P[0] }}>
        {payload[0]?.value} document{payload[0]?.value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// ── Custom bar tooltip ────────────────────────────────────────────
function BarTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TIP_STYLE}>
      <p style={{ fontWeight: 600, marginBottom: 3 }}>{label}</p>
      <p style={{ color: P[0] }}>{payload[0]?.value}</p>
    </div>
  );
}

// ── Custom donut label ────────────────────────────────────────────
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  if (percent < 0.07) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: getDashboardMetrics,
  });
  const { data: docData, isLoading: docLoading } = useQuery({
    queryKey: ['documents-chart'],
    queryFn: () => listDocuments({ limit: 200 }),
  });
  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => listRequests({ limit: 5 }),
  });
  const { data: empData } = useQuery({
    queryKey: ['employees-expiring'],
    queryFn: () => listEmployees({ limit: 200 }),
  });

  const allDocs     = docData?.data ?? [];
  const recentDocs  = allDocs.slice(0, 10);
  const requests    = reqData?.data ?? [];
  const employees   = empData?.data ?? [];

  const expiring = employees.filter(e => {
    if (!e.contract_end) return false;
    const diff = (new Date(e.contract_end).getTime() - Date.now()) / 86400000;
    return diff > 0 && diff <= 30;
  }).length;

  const firstName = (user?.profile?.full_name as string | undefined)?.split(' ')[0];

  // ── Chart data derivation ────────────────────────────────────────

  // Monthly documents trend — last 6 months
  const monthlyDocs = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      months.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy') });
    }
    const counts: Record<string, number> = {};
    months.forEach(m => { counts[m.key] = 0; });
    allDocs.forEach(doc => {
      const key = format(new Date(doc.created_at), 'yyyy-MM');
      if (counts[key] !== undefined) counts[key]++;
    });
    return months.map(m => ({ month: m.label, docs: counts[m.key] }));
  }, [allDocs]);

  // Document type distribution — top 6
  const docTypes = useMemo(() => {
    const map: Record<string, number> = {};
    allDocs.forEach(d => { const t = d.document_type || 'Autre'; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 17) + '…' : name, count }));
  }, [allDocs]);

  // Department breakdown — top 6
  const deptDist = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach(e => { const d = e.department || 'Autre'; map[d] = (map[d] || 0) + 1; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [employees]);

  // Contract type breakdown
  const contractDist = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach(e => { const c = e.contract_type || 'Autre'; map[c] = (map[c] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const hasDocData  = allDocs.length > 0;
  const hasDeptData = deptDist.length > 0;

  return (
    <div style={{ padding: '0 30px 48px' }}>
      <PageHeader
        title={`${t('good_morning')}${firstName ? `, ${firstName}` : ''} 👋`}
        subtitle={t('dashboard_subtitle')}
      />

      {/* ── Stat cards ── */}
      {metricsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard icon={<Users size={19} />}       label={t('total_employees_label')} value={metrics?.total_employees ?? 0} change={t('active_workforce')} to="/app/employees" />
          <StatCard icon={<Briefcase size={19} />}   label={t('interns')}               value={metrics?.total_interns ?? 0} color="var(--accent)" to="/app/interns" />
          <StatCard icon={<MessageSquare size={19} />} label={t('pending_requests_label')} value={metrics?.pending_requests ?? 0} color="var(--warn)" changePositive={false} to="/app/requests" />
          <StatCard icon={<FileText size={19} />}    label="Documents ce mois"          value={metrics?.docs_this_month ?? 0} color="var(--violet)" to="/app/history" />
        </div>
      )}

      {/* ── Charts row 1: Monthly trend + Dept donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 20 }}>

        {/* Area chart — monthly docs */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', letterSpacing: '-.02em' }}>
                Documents générés
              </p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Évolution sur 6 mois</p>
            </div>
            <Link to="/app/history" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              {t('view_all')} <ArrowRight size={12} />
            </Link>
          </div>
          {docLoading ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlyDocs} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="docGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={P[0]} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={P[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-3)' as string }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' as string }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<AreaTip />} />
                <Area type="monotone" dataKey="docs" stroke={P[0]} strokeWidth={2.5} fill="url(#docGrad)" dot={{ fill: P[0], r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} activeDot={{ r: 6, fill: P[0] }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut — department distribution */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', letterSpacing: '-.02em', marginBottom: 2 }}>
            Départements
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16 }}>Répartition des employés</p>
          {!hasDeptData ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Aucune donnée</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={deptDist} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" labelLine={false} label={DonutLabel}>
                    {deptDist.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={TIP_STYLE as React.CSSProperties} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                {deptDist.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: P[i % P.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Charts row 2: Doc types bar + Contract donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 24 }}>

        {/* Bar chart — document types */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', letterSpacing: '-.02em', marginBottom: 2 }}>
            Types de documents
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 18 }}>Volume par type généré</p>
          {!hasDocData ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Aucun document généré</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={docTypes} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--ink-3)' as string }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-2)' as string }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<BarTip />} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar dataKey="count" fill={P[0]} radius={[0, 5, 5, 0]} barSize={14}>
                  {docTypes.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut — contract types */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', letterSpacing: '-.02em', marginBottom: 2 }}>
            Types de contrat
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16 }}>Répartition des contrats</p>
          {contractDist.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Aucune donnée</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={contractDist} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" labelLine={false} label={DonutLabel}>
                    {contractDist.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={TIP_STYLE as React.CSSProperties} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                {contractDist.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: P[i % P.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: 'var(--ink-2)', flex: 1 }}>{d.name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tables + side panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

        {/* Left: Recent docs + requests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Recent documents */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '15px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{t('recent_documents')}</span>
              <Link to="/app/history" style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                {t('view_all')} <ArrowRight size={12} />
              </Link>
            </div>
            {docLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            ) : recentDocs.length === 0 ? (
              <div style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>
                {t('no_documents')}{' '}
                <Link to="/app/generate" style={{ color: 'var(--primary)' }}>{t('generate_first')}</Link>
              </div>
            ) : (
              recentDocs.map((doc, i) => (
                <div key={doc.id} style={{
                  padding: '11px 22px', borderBottom: i < recentDocs.length - 1 ? '1px solid var(--line)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 12, transition: 'background .1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                    <FileText size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.document_type}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{doc.employees?.full_name || '—'}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <Badge>{doc.language?.toUpperCase()}</Badge>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{format(new Date(doc.created_at), 'dd MMM')}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pending requests */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ padding: '15px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{t('pending_requests_section')}</span>
              <Link to="/app/requests" style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                {t('manage')} <ArrowRight size={12} />
              </Link>
            </div>
            {reqLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
            ) : requests.length === 0 ? (
              <div style={{ padding: '28px 24px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>{t('no_pending_requests')}</div>
            ) : (
              requests.map((req, i) => (
                <div key={req.id} style={{
                  padding: '11px 22px', borderBottom: i < requests.length - 1 ? '1px solid var(--line)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 12, transition: 'background .1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
                    <MessageSquare size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{req.type}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{req.profiles?.full_name || t('anonymous')}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <Badge dot variant={req.status === 'pending' ? 'warning' : 'success'}>{req.status}</Badge>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{format(new Date(req.created_at), 'dd/MM/yy')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Quick actions + expiring + AI promo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quick actions */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 12 }}>{t('quick_actions')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { to: '/app/generate',  icon: <Wand2 size={15} />,     label: t('generate_document'), color: 'var(--primary)' },
                { to: '/app/employees', icon: <Users size={15} />,     label: t('add_employee'),      color: 'var(--accent)' },
                { to: '/app/copilot',   icon: <Bot size={15} />,       label: t('ask_ai_copilot'),    color: 'var(--violet)' },
                { to: '/app/analytics', icon: <TrendingUp size={15} />,label: t('view_analytics'),    color: 'var(--success)' },
              ].map(a => (
                <Link key={a.to} to={a.to} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px',
                    borderRadius: 9, border: '1px solid var(--line)', transition: 'background .1s, border-color .1s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line-2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line)'; }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `color-mix(in oklab, ${a.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0 }}>
                      {a.icon}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', flex: 1 }}>{a.label}</span>
                    <ArrowRight size={12} style={{ color: 'var(--ink-3)' }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Expiring contracts */}
          {expiring > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--warn-soft)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--warn-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warn)' }}>
                  <Clock size={14} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{t('expiring_soon')}</span>
                <Badge variant="warning" dot>{expiring}</Badge>
              </div>
              {employees
                .filter(e => { if (!e.contract_end) return false; const d = (new Date(e.contract_end).getTime() - Date.now()) / 86400000; return d > 0 && d <= 30; })
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.full_name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warn)', background: 'var(--warn-soft)', padding: '2px 7px', borderRadius: 99, flexShrink: 0 }}>
                      {Math.ceil((new Date(e.contract_end!).getTime() - Date.now()) / 86400000)}{t('days_short')}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* AI Copilot promo */}
          <div style={{ background: 'var(--grad)', borderRadius: 14, padding: '22px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 14 }}>
                <Bot size={17} />
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8 }}>{t('ai_power_up')}</p>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.82)', lineHeight: 1.6, marginBottom: 18 }}>{t('ai_power_up_desc')}</p>
              <Link to="/app/copilot" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: '#fff', color: 'var(--primary)', borderRadius: 9, padding: '9px 16px',
                fontWeight: 600, fontSize: 13, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.15)',
              }}>
                {t('try_it_now')} <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
