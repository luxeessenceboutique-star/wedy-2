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

function complexityColor(level?: string): { bg: string; fg: string; label: string } {
  switch (level) {
    case 'high':   return { bg: '#fee2e2', fg: '#dc2626', label: 'Complexité haute' };
    case 'medium': return { bg: '#fef3c7', fg: '#d97706', label: 'Complexité moyenne' };
    case 'low':    return { bg: '#dcfce7', fg: '#16a34a', label: 'Complexité basse' };
    default:       return { bg: 'var(--bg-muted)', fg: 'var(--fg-muted)', label: 'Non analysé' };
  }
}

const TECH_COLORS = [
  { bg: '#ede9fe', fg: '#7c3aed' },
  { bg: '#cffafe', fg: '#0891b2' },
  { bg: '#fce7f3', fg: '#be185d' },
  { bg: '#d1fae5', fg: '#059669' },
  { bg: '#fef9c3', fg: '#a16207' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-elev)',
      border: '1px solid var(--border)',
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
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{
      height: 6, background: 'var(--bg-muted)',
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

const AGENT_STEPS = [
  { icon: <Search size={13} />, label: 'Lancement de la recherche sur les portails publics' },
  { icon: <Download size={13} />, label: 'Téléchargement des dossiers de consultation (DCE)' },
  { icon: <Cpu size={13} />, label: 'Analyse IA des appels d\'offres détectés' },
  { icon: <CheckCircle2 size={13} />, label: 'Structuration et classification des résultats' },
];

function AgentTimeline({ progress }: { progress?: number }) {
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
              background: done ? '#7c3aed' : active ? '#ede9fe' : 'var(--bg-muted)',
              border: active ? '2px solid #7c3aed' : '2px solid transparent',
              color: done ? '#fff' : active ? '#7c3aed' : 'var(--fg-subtle)',
              transition: 'all 0.3s ease',
            }}>
              {done ? <CheckCircle2 size={13} /> : step.icon}
            </div>
            <span style={{
              fontSize: 12,
              color: done ? 'var(--fg)' : active ? '#7c3aed' : 'var(--fg-subtle)',
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
  const [hovered, setHovered] = useState(false);
  const ar = tender.analysis_result;
  const complexity = complexityColor(ar?.niveau_complexite);
  const days = daysUntil(ar?.date_limite ?? tender.deadline);
  const urgent = days !== null && days >= 0 && days < 7;
  const overdue = days !== null && days < 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
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
            {complexity.label}
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
          <Building2 size={12} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
          <span style={{
            fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {ar?.organisme || tender.organization || 'Organisme non précisé'}
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
            <Briefcase size={11} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{ar.type_projet}</span>
          </div>
        )}

        {/* Resume */}
        {ar?.resume && (
          <p style={{
            fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.55, margin: 0,
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
              <span style={{ fontSize: 10, color: 'var(--fg-subtle)', alignSelf: 'center' }}>
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
              {tender.file_count} fichier{tender.file_count > 1 ? 's' : ''} disponible{tender.file_count > 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Deadline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={11} style={{ color: urgent || overdue ? '#dc2626' : 'var(--fg-subtle)', flexShrink: 0 }} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: overdue ? '#dc2626' : urgent ? '#d97706' : 'var(--fg-muted)',
          }}>
            {ar?.date_limite || tender.deadline
              ? overdue
                ? `Expiré (${ar?.date_limite || tender.deadline})`
                : urgent
                ? `Urgent — ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`
                : `Limite : ${ar?.date_limite || tender.deadline}`
              : 'Date limite non précisée'}
          </span>
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--bg-muted)',
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
          Voir offre
        </a>

        {tender.file_count > 0 && (
          <button
            onClick={() => onShowFiles(tender)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              background: 'var(--bg-elev)', color: 'var(--fg)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elev)')}
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
            fontSize: 10, color: 'var(--fg-subtle)',
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

  // Pre-fill name from auth user
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
        toast.success(`Recherche terminée — ${results.length || '?'} offres trouvées`);
      } else if (status.state === 'error') {
        stopPolling();
        toast.error(`Erreur agent : ${status.error ?? status.message}`);
      }
    }, 3000);
  }, [fetchStatus, fetchResults, stopPolling, results.length]);

  // On mount: check if already running or done
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

  // Auto-refresh results when state changes to done
  useEffect(() => {
    if (agentStatus.state === 'done' && results.length === 0) {
      fetchResults();
    }
  }, [agentStatus.state, fetchResults, results.length]);

  const handleLaunch = async () => {
    if (!form.keywords.trim()) { toast.error('Veuillez saisir des mots-clés'); return; }
    if (!form.nom.trim() || !form.prenom.trim()) { toast.error('Nom et prénom requis'); return; }
    if (!form.email.trim()) { toast.error('Email professionnel requis'); return; }
    if (!form.company.trim()) { toast.error('Société requise'); return; }

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

      toast.success('Agent lancé — Recherche en cours...');
      setAgentStatus({ state: 'running', message: 'Recherche en cours', progress: 0 });
      setResults([]);
      startPolling();
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur lors du lancement');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    stopPolling();
    setAgentStatus(prev => ({ ...prev, state: 'idle', message: 'Arrêté' }));
    toast.info('Agent arrêté');
  };

  const handleClear = async () => {
    try {
      await authFetch('/api/tenders/results', { method: 'DELETE' });
      setResults([]);
      setAgentStatus({ state: 'idle', message: '' });
      toast.success('Résultats effacés');
    } catch {
      toast.error('Impossible d\'effacer les résultats');
    }
  };

  // ─── Filtering & sorting ────────────────────────────────────────────────────

  const filteredResults = results
    .filter(t => {
      const ar = t.analysis_result;
      if (filterComplexity !== 'all' && ar?.niveau_complexite !== filterComplexity) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const title = (ar?.titre || t.title || '').toLowerCase();
        const org = (ar?.organisme || t.organization || '').toLowerCase();
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
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .tender-launch-btn { transition: opacity 0.15s, transform 0.15s; }
        .tender-launch-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .tender-launch-btn:active { transform: translateY(0); }
      `}</style>

      <PageHeader
        title="Marchés Publics"
        subtitle="Agent IA de veille et d'analyse des appels d'offres publics"
        action={
          results.length > 0 ? (
            <button
              onClick={handleClear}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                background: 'var(--bg-elev)', color: 'var(--fg-muted)',
                border: '1px solid var(--border)', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elev)'; e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <Trash2 size={12} />
              Effacer les résultats
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
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
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
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Configuration de l'agent</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Paramétrez votre recherche</div>
              </div>
            </div>

            <div style={{ padding: '18px' }}>
              {/* Keywords */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mots-clés de recherche *
                </label>
                <textarea
                  value={form.keywords}
                  onChange={e => setForm(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="informatique, développement, ERP, logiciel..."
                  disabled={isRunning}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-muted)',
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
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Name / Email / Company grid */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Informations du contact *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    { key: 'prenom', label: 'Prénom', placeholder: 'Mohamed' },
                    { key: 'nom', label: 'Nom', placeholder: 'Alaoui' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                      <input
                        value={form[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        disabled={isRunning}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 7,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-muted)',
                          color: 'var(--fg)',
                          fontSize: 12,
                          outline: 'none',
                          boxSizing: 'border-box',
                          opacity: isRunning ? 0.6 : 1,
                        }}
                        onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', display: 'block', marginBottom: 4 }}>Email professionnel</label>
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
                        border: '1px solid var(--border)',
                        background: 'var(--bg-muted)',
                        color: 'var(--fg)',
                        fontSize: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        opacity: isRunning ? 0.6 : 1,
                      }}
                      onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', display: 'block', marginBottom: 4 }}>Société</label>
                    <input
                      value={form.company}
                      onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Ma Société SARL"
                      disabled={isRunning}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 7,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-muted)',
                        color: 'var(--fg)',
                        fontSize: 12,
                        outline: 'none',
                        boxSizing: 'border-box',
                        opacity: isRunning ? 0.6 : 1,
                      }}
                      onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
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
                    color: 'var(--fg-muted)', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    padding: '4px 0',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}
                >
                  <Settings2 size={12} />
                  Configuration IA (optionnel)
                  {showAiConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showAiConfig && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', display: 'block', marginBottom: 4 }}>
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
                          border: '1px solid var(--border)',
                          background: 'var(--bg-muted)',
                          color: 'var(--fg)',
                          fontSize: 12,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', display: 'block', marginBottom: 4 }}>
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
                          border: '1px solid var(--border)',
                          background: 'var(--bg-muted)',
                          color: 'var(--fg)',
                          fontSize: 12,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
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
                      Lancement...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      🚀 Lancer la recherche
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
                  Arrêter l'agent
                </button>
              )}
            </div>
          </div>

          {/* Status card (left panel) */}
          {(agentStatus.state !== 'idle' || isRunning) && (
            <div style={{
              background: 'var(--bg-elev)',
              border: `1px solid ${isRunning ? '#c4b5fd' : agentStatus.state === 'done' ? '#a7f3d0' : agentStatus.state === 'error' ? '#fca5a5' : 'var(--border)'}`,
              borderRadius: 12,
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {isRunning && <Loader2 size={14} style={{ color: '#7c3aed', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                {agentStatus.state === 'done' && <CheckCircle2 size={14} style={{ color: '#059669', flexShrink: 0 }} />}
                {agentStatus.state === 'error' && <AlertCircle size={14} style={{ color: '#dc2626', flexShrink: 0 }} />}
                <span style={{ fontSize: 12, fontWeight: 600, color: isRunning ? '#7c3aed' : agentStatus.state === 'done' ? '#059669' : '#dc2626' }}>
                  {isRunning ? 'Agent en cours d\'exécution' : agentStatus.state === 'done' ? 'Recherche terminée' : 'Erreur'}
                </span>
              </div>
              {agentStatus.message && (
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 8px' }}>{agentStatus.message}</p>
              )}
              {isRunning && (
                <>
                  <ProgressBar value={agentStatus.progress ?? 20} />
                  <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 4, textAlign: 'right' }}>
                    {agentStatus.progress ?? 0}%
                  </div>
                  <AgentTimeline progress={agentStatus.progress} />
                </>
              )}
              {agentStatus.state === 'error' && agentStatus.error && (
                <p style={{ fontSize: 11, color: '#dc2626', margin: '6px 0 0', background: '#fee2e2', padding: '6px 10px', borderRadius: 6 }}>
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
              <StatCard icon={<Briefcase size={16} />} label="Total offres" value={results.length} color="#7c3aed" />
              <StatCard icon={<Cpu size={16} />} label="Analysées IA" value={totalAnalyzed} color="#2563eb" />
              <StatCard icon={<TrendingUp size={16} />} label="Complexité haute" value={highComplexity} color="#dc2626" />
              <StatCard icon={<Paperclip size={16} />} label="Fichiers DCE" value={totalFiles} color="#059669" />
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
                  {results.length} offre{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 12, color: '#047857', marginLeft: 8 }}>
                  • {totalAnalyzed} analysée{totalAnalyzed > 1 ? 's' : ''} par IA
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
                Actualiser
              </button>
            </div>
          )}

          {agentStatus.state === 'error' && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fca5a5',
              borderRadius: 12, padding: '12px 18px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>Erreur de l'agent</div>
                {agentStatus.error && <div style={{ fontSize: 12, color: '#b91c1c' }}>{agentStatus.error}</div>}
              </div>
            </div>
          )}

          {/* Search, filter, sort bar */}
          {results.length > 0 && (
            <div style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              {/* Search input */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--bg-muted)', borderRadius: 8,
                padding: '7px 12px',
                border: '1px solid var(--border)',
                flex: 1, minWidth: 180,
              }}>
                <Search size={13} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une offre..."
                  style={{
                    border: 'none', background: 'transparent',
                    color: 'var(--fg)', fontSize: 13, outline: 'none', flex: 1,
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', display: 'flex', padding: 0 }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Complexity filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={12} style={{ color: 'var(--fg-subtle)' }} />
                <select
                  value={filterComplexity}
                  onChange={e => setFilterComplexity(e.target.value as FilterComplexity)}
                  style={{
                    padding: '6px 10px', borderRadius: 7,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-muted)', color: 'var(--fg)',
                    fontSize: 12, outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="all">Toutes complexités</option>
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>

              {/* Sort */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SortAsc size={12} style={{ color: 'var(--fg-subtle)' }} />
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  style={{
                    padding: '6px 10px', borderRadius: 7,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-muted)', color: 'var(--fg)',
                    fontSize: 12, outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="deadline">Trier par deadline</option>
                  <option value="budget">Trier par budget</option>
                  <option value="complexity">Trier par complexité</option>
                </select>
              </div>

              <span style={{ fontSize: 11, color: 'var(--fg-subtle)', marginLeft: 'auto' }}>
                {filteredResults.length} sur {results.length}
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
                  onShowFiles={t => setFilesModal(t)}
                />
              ))}
            </div>
          )}

          {/* Empty states */}
          {agentStatus.state === 'idle' && results.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '80px 40px',
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
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
                Aucune recherche lancée
              </h3>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', maxWidth: 340, lineHeight: 1.6, marginBottom: 0 }}>
                Configurez vos mots-clés et informations de contact dans le panneau de gauche, puis lancez l'agent pour détecter les appels d'offres correspondants.
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
              background: 'var(--bg-elev)',
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
                Recherche en cours...
              </h3>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', maxWidth: 300 }}>
                L'agent parcourt les portails publics et analyse les appels d'offres. Les résultats apparaîtront ici dès qu'ils seront disponibles.
              </p>
            </div>
          )}

          {agentStatus.state === 'done' && filteredResults.length === 0 && results.length > 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}>
              <Filter size={28} style={{ color: 'var(--fg-subtle)', marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>Aucun résultat avec ce filtre</p>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Essayez de modifier vos critères de recherche ou de filtre.</p>
              <button
                onClick={() => { setSearchQuery(''); setFilterComplexity('all'); }}
                style={{
                  marginTop: 12, padding: '7px 16px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-muted)', color: 'var(--fg)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Files Modal ──────────────────────────────────────────────────────── */}
      <Modal
        open={filesModal !== null}
        onClose={() => setFilesModal(null)}
        title={`Fichiers DCE — ${filesModal?.analysis_result?.titre ?? filesModal?.title ?? ''}`}
        width={560}
      >
        {filesModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>
              {filesModal.file_count} fichier{filesModal.file_count > 1 ? 's' : ''} téléchargé{filesModal.file_count > 1 ? 's' : ''} depuis le portail officiel.
            </p>
            {filesModal.downloaded_files.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--fg-muted)', fontSize: 12 }}>
                Aucun fichier listé. Consultez la source pour télécharger.
              </div>
            ) : (
              filesModal.downloaded_files.map((file, i) => {
                const name = file.split('/').pop() ?? file;
                const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8,
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border)',
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
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                      Télécharger
                    </a>
                  </div>
                );
              })
            )}
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
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
                Voir l'appel d'offre sur le portail officiel
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
