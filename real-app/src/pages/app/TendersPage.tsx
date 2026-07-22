import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, Play, Square, Trash2, RefreshCw, ExternalLink,
  Clock, Building2, Zap, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Loader2, Filter, SortAsc,
  Briefcase, Download, Link2, Cpu, TrendingUp,
  Key, Settings2, X, Paperclip,
} from 'lucide-react';
import { Modal } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { useAuth } from '../../lib/auth';
import { useLang } from '../../lib/lang';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  titre: string;
  organisme: string;
  type_projet: string;
  technologies: string[];
  budget_estime: string;
  date_limite: string;
  resume: string;
  niveau_complexite: 'low' | 'medium' | 'high';
}

interface TenderResult {
  id: string;
  title: string;
  organization: string;
  deadline: string;
  status: string;
  source_url: string;
  downloaded_files: string[];
  analysis_result?: AnalysisResult;
  is_analyzed: boolean;
  file_count: number;
}

interface AgentStatus {
  state: 'idle' | 'running' | 'done' | 'error';
  message: string;
  started_at?: string;
  finished_at?: string;
  progress?: number;
  error?: string;
}

interface FormData {
  keywords: string;
  nom: string;
  prenom: string;
  email: string;
  company: string;
  litellm_api_key: string;
  litellm_model: string;
}

type SortKey = 'deadline' | 'budget' | 'complexity';
type FilterComplexity = 'all' | 'low' | 'medium' | 'high';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('wedy_token');
}

function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function complexityColor(level?: string): { bg: string; fg: string } {
  switch (level) {
    case 'high':   return { bg: 'var(--danger-soft)', fg: '#dc2626' };
    case 'medium': return { bg: 'var(--warn-soft)', fg: 'var(--warn)' };
    case 'low':    return { bg: 'var(--success-soft)', fg: '#16a34a' };
    default:       return { bg: 'var(--surface-2)', fg: 'var(--ink-2)' };
  }
}

const TECH_COLORS = [
  { bg: '#ede9fe', fg: '#7c3aed' },
  { bg: '#cffafe', fg: 'var(--primary)' },
  { bg: '#fce7f3', fg: '#be185d' },
  { bg: '#d1fae5', fg: '#059669' },
  { bg: '#fef9c3', fg: '#a16207' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 130,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: color + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{
      height: 6, background: 'var(--surface-2)',
      borderRadius: 99, overflow: 'hidden', marginTop: 8,
    }}>
      <div style={{
        height: '100%',
        width: `${Math.max(4, Math.min(100, value))}%`,
        background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
        borderRadius: 99,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

function AgentTimeline({ progress }: { progress?: number }) {
  const { t } = useLang();
  const AGENT_STEPS = [
    { icon: <Search size={13} />, label: t('tender_step1') },
    { icon: <Download size={13} />, label: t('tender_step2') },
    { icon: <Cpu size={13} />, label: t('tender_step3') },
    { icon: <CheckCircle2 size={13} />, label: t('tender_step4') },
  ];
  const pct = progress ?? 0;
  const activeStep = Math.floor((pct / 100) * AGENT_STEPS.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
      {AGENT_STEPS.map((step, i) => {
        const done = i < activeStep;
        const active = i === activeStep;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#7c3aed' : active ? '#ede9fe' : 'var(--surface-2)',
              border: active ? '2px solid #7c3aed' : '2px solid transparent',
              color: done ? '#fff' : active ? '#7c3aed' : 'var(--ink-3)',
              transition: 'all 0.3s ease',
            }}>
              {done ? <CheckCircle2 size={13} /> : step.icon}
            </div>
            <span style={{
              fontSize: 12,
              color: done ? 'var(--fg)' : active ? '#7c3aed' : 'var(--ink-3)',
              fontWeight: active ? 600 : 400,
              transition: 'color 0.3s ease',
            }}>
              {step.label}
            </span>
            {active && (
              <Loader2 size={12} style={{ color: '#7c3aed', marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TechChip({ tech, idx }: { tech: string; idx: number }) {
  const col = TECH_COLORS[idx % TECH_COLORS.length];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99,
      fontSize: 10, fontWeight: 600,
      background: col.bg, color: col.fg,
      lineHeight: 1.8,
    }}>
      {tech}
    </span>
  );
}

function TenderCard({ tender, onShowFiles }: { tender: TenderResult; onShowFiles: (t: TenderResult) => void }) {
  const { t } = useLang();
  const [hovered, setHovered] = useState(false);
  const ar = tender.analysis_result;
  const complexity = complexityColor(ar?.niveau_complexite);
  const complexityLabels: Record<string, string> = {
    high: t('tender_complexity_high'),
    medium: t('tender_complexity_medium'),
    low: t('tender_complexity_low'),
  };
  const complexityLabel = complexityLabels[ar?.niveau_complexite ?? ''] ?? t('tender_not_analyzed');
  const days = daysUntil(ar?.date_limite ?? tender.deadline);
  const urgent = days !== null && days >= 0 && days < 7;
  const overdue = days !== null && days < 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered
          ? '0 12px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)'
          : '0 1px 4px rgba(0,0,0,0.04)',
        cursor: 'default',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        height: 3,
        background: ar?.niveau_complexite === 'high'
          ? 'linear-gradient(90deg, #dc2626, #f87171)'
          : ar?.niveau_complexite === 'medium'
          ? 'linear-gradient(90deg, #d97706, #fbbf24)'
          : 'linear-gradient(90deg, #7c3aed, #2563eb)',
      }} />

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 10px', borderRadius: 99,
            fontSize: 10, fontWeight: 700,
            background: complexity.bg, color: complexity.fg,
            flexShrink: 0,
          }}>
            {complexityLabel}
          </div>
          {tender.is_analyzed && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 99,
              fontSize: 10, fontWeight: 600,
              background: '#ede9fe', color: '#7c3aed',
            }}>
              <Cpu size={10} />
              IA
            </div>
          )}
        </div>

        {/* Organization */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Building2 size={12} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <span style={{
            fontSize: 11, color: 'var(--ink-2)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {ar?.organisme || tender.organization || t('tender_no_org')}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 13, fontWeight: 700, color: 'var(--fg)',
          lineHeight: 1.45, margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {ar?.titre || tender.title}
        </h3>

        {/* Budget */}
        {ar?.budget_estime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={12} style={{ color: '#2563eb', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
              {ar.budget_estime}
            </span>
          </div>
        )}

        {/* Type de projet */}
        {ar?.type_projet && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Briefcase size={11} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{ar.type_projet}</span>
          </div>
        )}

        {/* Resume */}
        {ar?.resume && (
          <p style={{
            fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {ar.resume}
          </p>
        )}

        {/* Technologies */}
        {ar?.technologies && ar.technologies.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ar.technologies.slice(0, 5).map((tech, i) => (
              <TechChip key={i} tech={tech} idx={i} />
            ))}
            {ar.technologies.length > 5 && (
              <span style={{ fontSize: 10, color: 'var(--ink-3)', alignSelf: 'center' }}>
                +{ar.technologies.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Files chip */}
        {tender.file_count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 99,
              fontSize: 10, fontWeight: 600,
              background: '#f0fdf4', color: '#16a34a',
              border: '1px solid #bbf7d0',
            }}>
              <Paperclip size={10} />
              {t('tender_files_available_tpl').replace('{n}', String(tender.file_count))}
            </div>
          </div>
        )}

        {/* Deadline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={11} style={{ color: urgent || overdue ? '#dc2626' : 'var(--ink-3)', flexShrink: 0 }} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: overdue ? '#dc2626' : urgent ? 'var(--warn)' : 'var(--ink-2)',
          }}>
            {ar?.date_limite || tender.deadline
              ? overdue
                ? t('tender_expired_tpl').replace('{date}', ar?.date_limite || tender.deadline)
                : urgent
                ? t('tender_urgent_tpl').replace('{days}', String(days))
                : t('tender_deadline_tpl').replace('{date}', ar?.date_limite || tender.deadline)
              : t('tender_no_deadline')}
          </span>
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        borderTop: '1px solid var(--line)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--surface-2)',
      }}>
        <a
          href={tender.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 600,
            background: 'var(--primary)', color: '#fff',
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <ExternalLink size={11} />
          {t('tender_see_offer')}
        </a>

        {tender.file_count > 0 && (
          <button
            onClick={() => onShowFiles(tender)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              background: 'var(--surface)', color: 'var(--fg)',
              border: '1px solid var(--line)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <Download size={11} />
            DCE
          </button>
        )}

        <a
          href={tender.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 'auto',
            fontSize: 10, color: 'var(--ink-3)',
            textDecoration: 'none',
            maxWidth: 100,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 3,
          }}
          title={tender.source_url}
        >
          <Link2 size={9} />
          {new URL(tender.source_url).hostname}
        </a>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TendersPage() {
  const { user } = useAuth();
  const { t } = useLang();

  const [form, setForm] = useState<FormData>({
    keywords: '',
    nom: '',
    prenom: '',
    email: user?.email ?? '',
    company: '',
    litellm_api_key: '',
    litellm_model: '',
  });

  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ state: 'idle', message: '' });
  const [results, setResults] = useState<TenderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [filesModal, setFilesModal] = useState<TenderResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterComplexity, setFilterComplexity] = useState<FilterComplexity>('all');
  const [sortKey, setSortKey] = useState<SortKey>('deadline');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user) {
      const fullName = (user as any)?.full_name || (user as any)?.profile?.full_name || '';
      const parts = fullName.trim().split(' ');
      setForm(prev => ({
        ...prev,
        email: prev.email || user.email || '',
        prenom: prev.prenom || parts[0] || '',
        nom: prev.nom || parts.slice(1).join(' ') || '',
      }));
    }
  }, [user]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/tenders/status');
      if (!res.ok) return;
      const data: AgentStatus = await res.json();
      setAgentStatus(data);
      return data;
    } catch {
      return undefined;
    }
  }, []);

  const fetchResults = useCallback(async () => {
    try {
      const res = await authFetch('/api/tenders/results');
      if (!res.ok) return;
      const data: { tenders: TenderResult[]; count: number } = await res.json();
      setResults(data.tenders ?? []);
    } catch {
      // noop
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const status = await fetchStatus();
      if (!status) return;
      if (status.state === 'done') {
        stopPolling();
        await fetchResults();
        toast.success(t('tender_found_toast_tpl').replace('{n}', String(results.length || '?')));
      } else if (status.state === 'error') {
        stopPolling();
        toast.error(status.error ?? status.message ?? t('error'));
      }
    }, 3000);
  }, [fetchStatus, fetchResults, stopPolling, results.length, t]);

  useEffect(() => {
    fetchStatus().then(status => {
      if (status?.state === 'running') {
        startPolling();
      } else if (status?.state === 'done') {
        fetchResults();
      }
    });
    return () => stopPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (agentStatus.state === 'done' && results.length === 0) {
      fetchResults();
    }
  }, [agentStatus.state, fetchResults, results.length]);

  const handleLaunch = async () => {
    if (!form.keywords.trim()) { toast.error(t('tender_keywords_required')); return; }
    if (!form.nom.trim() || !form.prenom.trim()) { toast.error(t('tender_name_required')); return; }
    if (!form.email.trim()) { toast.error(t('tender_email_required')); return; }
    if (!form.company.trim()) { toast.error(t('tender_company_required')); return; }

    setLoading(true);
    try {
      const body: Record<string, string> = {
        keywords: form.keywords,
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        company: form.company,
      };
      if (form.litellm_api_key) body.litellm_api_key = form.litellm_api_key;
      if (form.litellm_model) body.litellm_model = form.litellm_model;

      const res = await authFetch('/api/tenders/run', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `Erreur ${res.status}`);
      }

      toast.success(t('tender_agent_launched'));
      setAgentStatus({ state: 'running', message: t('tender_running_title'), progress: 0 });
      setResults([]);
      startPolling();
    } catch (e: any) {
      toast.error(e.message ?? t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    stopPolling();
    setAgentStatus(prev => ({ ...prev, state: 'idle', message: t('tender_stopped') }));
    toast.info(t('tender_agent_stopped'));
  };

  const handleClear = async () => {
    try {
      await authFetch('/api/tenders/results', { method: 'DELETE' });
      setResults([]);
      setAgentStatus({ state: 'idle', message: '' });
      toast.success(t('tender_results_cleared'));
    } catch {
      toast.error(t('tender_clear_error'));
    }
  };

  // ─── Filtering & sorting ────────────────────────────────────────────────────

  const filteredResults = results
    .filter(r => {
      const ar = r.analysis_result;
      if (filterComplexity !== 'all' && ar?.niveau_complexite !== filterComplexity) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const title = (ar?.titre || r.title || '').toLowerCase();
        const org = (ar?.organisme || r.organization || '').toLowerCase();
        if (!title.includes(q) && !org.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'complexity') {
        const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (rank[a.analysis_result?.niveau_complexite ?? ''] ?? 3) -
               (rank[b.analysis_result?.niveau_complexite ?? ''] ?? 3);
      }
      if (sortKey === 'deadline') {
        const da = daysUntil(a.analysis_result?.date_limite ?? a.deadline) ?? 9999;
        const db = daysUntil(b.analysis_result?.date_limite ?? b.deadline) ?? 9999;
        return da - db;
      }
      if (sortKey === 'budget') {
        const num = (s?: string) => {
          if (!s) return 0;
          const m = s.replace(/\s/g, '').match(/[\d.,]+/);
          return m ? parseFloat(m[0].replace(',', '.')) : 0;
        };
        return num(b.analysis_result?.budget_estime) - num(a.analysis_result?.budget_estime);
      }
      return 0;
    });

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const totalAnalyzed = results.filter(r => r.is_analyzed).length;
  const highComplexity = results.filter(r => r.analysis_result?.niveau_complexite === 'high').length;
  const totalFiles = results.reduce((acc, r) => acc + (r.file_count ?? 0), 0);

  const isRunning = agentStatus.state === 'running';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '0 0 40px', minHeight: '100%' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); } 70% { box-shadow: 0 0 0 10px rgba(124,58,237,0); } 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); } }
        .tender-launch-btn { transition: opacity 0.15s, transform 0.15s; }
        .tender-launch-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .tender-launch-btn:active { transform: translateY(0); }
      `}</style>

      <PageHeader
        title={t('tender_title')}
        subtitle={t('tender_subtitle')}
        action={
          results.length > 0 ? (
            <button
              onClick={handleClear}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: 'var(--surface)', color: 'var(--ink-2)',
                border: '1px solid var(--line)', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-soft)'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--ink-2)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
            >
              <Trash2 size={12} />
              {t('tender_clear_results')}
            </button>
          ) : undefined
        }
      />

      {/* ── Two-column layout ───────────────────────────────────────────────── */}
      <div style={{
        padding: '0 28px',
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
      }}>

        {/* ── LEFT PANEL ────────────────────────────────────────────────────── */}
        <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Config card */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            {/* Card header */}
            <div style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Search size={16} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{t('tender_config_title')}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{t('tender_config_subtitle')}</div>
              </div>
            </div>

            <div style={{ padding: '18px' }}>
              {/* Keywords */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('tender_keywords_label')}
                </label>
                <textarea
                  value={form.keywords}
                  onChange={e => setForm(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder={t('tender_keywords_ph')}
                  disabled={isRunning}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: 'var(--surface-2)',
                    color: 'var(--fg)',
                    fontSize: 13,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    boxSizing: 'border-box',
                    opacity: isRunning ? 0.6 : 1,
                  }}
                  onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                  onBlur={e => (e.target.style.borderColor = 'var(--line)')}
                />
              </div>

              {/* Name / Email / Company grid */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('tender_contact_label')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    { key: 'prenom', label: t('tender_prenom'), placeholder: 'Mohamed' },
                    { key: 'nom', label: t('tender_nom'), placeholder: 'Alaoui' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <input
                        value={form[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        disabled={isRunning}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 7,
                          border: '1px solid var(--line)',
                          background: 'var(--surface-2)',
                          color: 'var(--fg)',
                          fontSize: 12,
                          outline: 'none',
                          boxSizing: 'border-box',
                          opacity: isRunning ? 0.6 : 1,
                        }}
                        onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                        onBlur={e => (e.target.style.borderColor = 'var(--line)')}
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>{t('tender_email_label')}</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@société.ma"
                      disabled={isRunning}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 7,
                        border: '1px solid var(--line)',
                        background: 'var(--surface-2)',
                        color: 'var(--fg)',
                        fontSize: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        opacity: isRunning ? 0.6 : 1,
                      }}
                      onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                      onBlur={e => (e.target.style.borderColor = 'var(--line)')}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>{t('tender_company_label')}</label>
                    <input
                      value={form.company}
                      onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Ma Société SARL"
                      disabled={isRunning}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 7,
                        border: '1px solid var(--line)',
                        background: 'var(--surface-2)',
                        color: 'var(--fg)',
                        fontSize: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        opacity: isRunning ? 0.6 : 1,
                      }}
                      onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                      onBlur={e => (e.target.style.borderColor = 'var(--line)')}
                    />
                  </div>
                </div>
              </div>

              {/* AI Config collapsible */}
              <div style={{ marginBottom: 18 }}>
                <button
                  onClick={() => setShowAiConfig(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none',
                    color: 'var(--ink-2)', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    padding: '4px 0',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}
                >
                  <Settings2 size={12} />
                  {t('tender_ai_config')}
                  {showAiConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showAiConfig && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>
                        <Key size={10} style={{ display: 'inline', marginRight: 4 }} />
                        LiteLLM API Key
                      </label>
                      <input
                        type="password"
                        value={form.litellm_api_key}
                        onChange={e => setForm(prev => ({ ...prev, litellm_api_key: e.target.value }))}
                        placeholder="sk-..."
                        disabled={isRunning}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 7,
                          border: '1px solid var(--line)',
                          background: 'var(--surface-2)',
                          color: 'var(--fg)',
                          fontSize: 12,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                        onBlur={e => (e.target.style.borderColor = 'var(--line)')}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>
                        Modèle LiteLLM
                      </label>
                      <input
                        value={form.litellm_model}
                        onChange={e => setForm(prev => ({ ...prev, litellm_model: e.target.value }))}
                        placeholder="gpt-4o, claude-3-5-sonnet..."
                        disabled={isRunning}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 7,
                          border: '1px solid var(--line)',
                          background: 'var(--surface-2)',
                          color: 'var(--fg)',
                          fontSize: 12,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                        onBlur={e => (e.target.style.borderColor = 'var(--line)')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Launch / Stop button */}
              {!isRunning ? (
                <button
                  className="tender-launch-btn"
                  onClick={handleLaunch}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                    color: '#fff',
                    fontSize: 14, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      {t('tender_launching')}
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      🚀 {t('tender_launch')}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: 10,
                    border: '2px solid #dc2626',
                    background: '#fff1f1',
                    color: '#dc2626',
                    fontSize: 14, fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    animation: 'pulse-ring 2s ease-out infinite',
                  }}
                >
                  <Square size={15} />
                  {t('tender_stop')}
                </button>
              )}
            </div>
          </div>

          {/* Status card (left panel) */}
          {(agentStatus.state !== 'idle' || isRunning) && (
            <div style={{
              background: 'var(--surface)',
              border: `1px solid ${isRunning ? '#c4b5fd' : agentStatus.state === 'done' ? '#a7f3d0' : agentStatus.state === 'error' ? '#fca5a5' : 'var(--line)'}`,
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {isRunning && <Loader2 size={14} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                {agentStatus.state === 'done' && <CheckCircle2 size={14} style={{ color: '#059669', flexShrink: 0 }} />}
                {agentStatus.state === 'error' && <AlertCircle size={14} style={{ color: '#dc2626', flexShrink: 0 }} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: isRunning ? '#7c3aed' : agentStatus.state === 'done' ? '#059669' : '#dc2626' }}>
                  {isRunning ? t('tender_agent_running') : agentStatus.state === 'done' ? t('tender_search_done') : t('error')}
                </span>
              </div>
              {agentStatus.message && (
                <p style={{ fontSize: 11, color: 'var(--ink-2)', margin: '0 0 8px' }}>{agentStatus.message}</p>
              )}
              {isRunning && (
                <>
                  <ProgressBar value={agentStatus.progress ?? 20} />
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4, textAlign: 'right' }}>
                    {agentStatus.progress ?? 0}%
                  </div>
                  <AgentTimeline progress={agentStatus.progress} />
                </>
              )}
              {agentStatus.state === 'error' && agentStatus.error && (
                <p style={{ fontSize: 11, color: '#dc2626', margin: '6px 0 0', background: 'var(--danger-soft)', padding: '6px 10px', borderRadius: 6 }}>
                  {agentStatus.error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT AREA ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stats bar */}
          {results.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <StatCard icon={<Briefcase size={16} />} label={t('tender_stat_total')} value={results.length} color="#7c3aed" />
              <StatCard icon={<Cpu size={16} />} label={t('tender_stat_analyzed')} value={totalAnalyzed} color="#2563eb" />
              <StatCard icon={<TrendingUp size={16} />} label={t('tender_stat_high_complexity')} value={highComplexity} color="#dc2626" />
              <StatCard icon={<Paperclip size={16} />} label={t('tender_stat_files')} value={totalFiles} color="#059669" />
            </div>
          )}

          {/* Status banner (main area) */}
          {agentStatus.state === 'done' && results.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
              border: '1px solid #a7f3d0',
              borderRadius: 12,
              padding: '12px 18px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>
                  {t('tender_results_tpl').replace('{n}', String(results.length))}
                </span>
                <span style={{ fontSize: 12, color: '#047857', marginLeft: 8 }}>
                  • {t('tender_analyzed_tpl').replace('{n}', String(totalAnalyzed))}
                </span>
              </div>
              <button
                onClick={fetchResults}
                style={{
                  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 7,
                  fontSize: 11, fontWeight: 600,
                  background: 'rgba(5,150,105,0.1)', color: '#059669',
                  border: '1px solid rgba(5,150,105,0.2)',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={11} />
                {t('tender_refresh')}
              </button>
            </div>
          )}

          {agentStatus.state === 'error' && (
            <div style={{
              background: 'var(--danger-soft)', border: '1px solid #fca5a5',
              borderRadius: 12, padding: '12px 18px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>{t('tender_agent_error_title')}</div>
                {agentStatus.error && <div style={{ fontSize: 12, color: '#b91c1c' }}>{agentStatus.error}</div>}
              </div>
            </div>
          )}

          {/* Search, filter, sort bar */}
          {results.length > 0 && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              {/* Search input */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--surface-2)', borderRadius: 8,
                padding: '7px 12px',
                border: '1px solid var(--line)',
                flex: 1, minWidth: 180,
              }}>
                <Search size={13} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('tender_search_ph')}
                  style={{
                    border: 'none', background: 'transparent',
                    color: 'var(--fg)', fontSize: 13, outline: 'none', flex: 1,
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: 0 }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Complexity filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={12} style={{ color: 'var(--ink-3)' }} />
                <select
                  value={filterComplexity}
                  onChange={e => setFilterComplexity(e.target.value as FilterComplexity)}
                  style={{
                    padding: '6px 10px', borderRadius: 7,
                    border: '1px solid var(--line)',
                    background: 'var(--surface-2)', color: 'var(--fg)',
                    fontSize: 12, outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="all">{t('tender_filter_all')}</option>
                  <option value="low">{t('tender_filter_low')}</option>
                  <option value="medium">{t('tender_filter_medium')}</option>
                  <option value="high">{t('tender_filter_high')}</option>
                </select>
              </div>

              {/* Sort */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SortAsc size={12} style={{ color: 'var(--ink-3)' }} />
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  style={{
                    padding: '6px 10px', borderRadius: 7,
                    border: '1px solid var(--line)',
                    background: 'var(--surface-2)', color: 'var(--fg)',
                    fontSize: 12, outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="deadline">{t('tender_sort_deadline')}</option>
                  <option value="budget">{t('tender_sort_budget')}</option>
                  <option value="complexity">{t('tender_sort_complexity')}</option>
                </select>
              </div>

              <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto' }}>
                {t('tender_count_tpl').replace('{n}', String(filteredResults.length)).replace('{total}', String(results.length))}
              </span>
            </div>
          )}

          {/* Results grid */}
          {filteredResults.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}>
              {filteredResults.map(tender => (
                <TenderCard
                  key={tender.id}
                  tender={tender}
                  onShowFiles={r => setFilesModal(r)}
                />
              ))}
            </div>
          )}

          {/* Empty states */}
          {agentStatus.state === 'idle' && results.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '80px 40px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              textAlign: 'center',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Search size={30} style={{ color: '#7c3aed' }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>
                {t('tender_empty_title')}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 340, lineHeight: 1.6, marginBottom: 0 }}>
                {t('tender_empty_text')}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['Informatique', 'ERP', 'Développement web', 'Logiciel RH', 'Infrastructure'].map(kw => (
                  <button
                    key={kw}
                    onClick={() => setForm(prev => ({ ...prev, keywords: prev.keywords ? prev.keywords + ', ' + kw : kw }))}
                    style={{
                      padding: '5px 12px', borderRadius: 99,
                      fontSize: 11, fontWeight: 600,
                      background: '#ede9fe', color: '#7c3aed',
                      border: '1px solid #c4b5fd',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.color = '#7c3aed'; }}
                  >
                    + {kw}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isRunning && results.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '60px 40px',
              background: 'var(--surface)',
              border: '1px solid #c4b5fd',
              borderRadius: 16,
              textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 18,
                animation: 'pulse-ring 2s ease-out infinite',
              }}>
                <Zap size={26} style={{ color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>
                {t('tender_running_title')}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--ink-2)', maxWidth: 300 }}>
                {t('tender_running_text')}
              </p>
            </div>
          )}

          {agentStatus.state === 'done' && filteredResults.length === 0 && results.length > 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
            }}>
              <Filter size={28} style={{ color: 'var(--ink-3)', marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>{t('tender_no_filter_title')}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t('tender_no_filter_text')}</p>
              <button
                onClick={() => { setSearchQuery(''); setFilterComplexity('all'); }}
                style={{
                  marginTop: 12, padding: '7px 16px', borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)', color: 'var(--fg)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t('tender_reset_filters')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Files Modal ──────────────────────────────────────────────────────── */}
      <Modal
        open={filesModal !== null}
        onClose={() => setFilesModal(null)}
        title={`DCE — ${filesModal?.analysis_result?.titre ?? filesModal?.title ?? ''}`}
        width={560}
      >
        {filesModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 8 }}>
              {t('tender_files_downloaded_tpl').replace('{n}', String(filesModal.file_count))}
            </p>
            {filesModal.downloaded_files.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-2)', fontSize: 12 }}>
                {t('tender_no_files_listed')}
              </div>
            ) : (
              filesModal.downloaded_files.map((file, i) => {
                const name = file.split('/').pop() ?? file;
                const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                      background: '#ede9fe', color: '#7c3aed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800,
                    }}>
                      {ext}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file}
                      </div>
                    </div>
                    <a
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 6,
                        fontSize: 11, fontWeight: 600,
                        background: '#7c3aed', color: '#fff',
                        textDecoration: 'none', flexShrink: 0,
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <Download size={11} />
                      {t('tender_download')}
                    </a>
                  </div>
                );
              })
            )}
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <a
                href={filesModal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--primary)',
                  textDecoration: 'none', fontWeight: 500,
                }}
              >
                <ExternalLink size={12} />
                {t('tender_see_source')}
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
