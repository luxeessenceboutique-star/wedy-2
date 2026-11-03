import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CircleAlert, CircleCheck, Circle, Clock, Shield, ShieldCheck, Shuffle, Sparkles, TrendingUp, TriangleAlert, Users, X } from 'lucide-react';
import { api, getApiError } from '@/services/api';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import './TalentsPage.css';

type Risk = 'low' | 'medium' | 'high';
type Profile = {
  employee_id: string; performance_score: number; potential_score: number; talent_category: string; flight_risk: Risk;
  amana_score?: number; itkan_score?: number; iltizam_score?: number; ibdaa_score?: number; nama_score?: number;
  is_critical_position?: boolean; successor_names?: string[]; career_path?: string | null; next_role?: string | null; notes?: string | null;
  employees?: { id: string; full_name: string; position?: string; department?: string };
};
type Okr = { id: string; title: string; quarter?: string; progress: number; status: string };
type Pdi = { id: string; title: string; action_type?: string; target_date?: string | null; status: 'pending' | 'in_progress' | 'completed' };

const listTalents = () => api.get<Profile[]>('/talents').then(r => r.data);
const bulkProfile = () => api.post<{ created: number; skipped: number }>('/talents/bulk-profile', {}).then(r => r.data);
const patchTalent = (id: string, b: Partial<Profile>) => api.patch<Profile>(`/talents/${id}`, b).then(r => r.data);
const getOkrs = (id: string) => api.get<Okr[]>(`/talents/${id}/okrs`).then(r => r.data);
const addOkr = (id: string, b: Partial<Okr>) => api.post<Okr>(`/talents/${id}/okrs`, b).then(r => r.data);
const patchOkr = (id: string, okr: string, b: Partial<Okr>) => api.patch<Okr>(`/talents/${id}/okrs/${okr}`, b).then(r => r.data);
const getPdi = (id: string) => api.get<Pdi[]>(`/talents/${id}/pdi`).then(r => r.data);
const addPdi = (id: string, b: Partial<Pdi>) => api.post<Pdi>(`/talents/${id}/pdi`, b).then(r => r.data);
const patchPdi = (id: string, item: string, b: Partial<Pdi>) => api.patch<Pdi>(`/talents/${id}/pdi/${item}`, b).then(r => r.data);

// [label key, tint, text, dot] — the reference's palette, keyed by the backend categories
const CAT: Record<string, [TKey, string, string, string]> = {
  star: ['tal_cat_star', '#fbefda', '#8a5207', '#df9326'], solid: ['tal_cat_solid', '#e1f5ec', '#0f6f49', '#16a06b'],
  potential: ['tal_cat_potential', '#ece9fb', '#5444b8', '#6d5ad6'], key_player: ['tal_cat_key', '#e4f2f4', '#0b5f72', '#16b6c8'],
  needs_improvement: ['tal_cat_develop', '#fbe9e6', '#a33a28', '#df5740'],
};
const catOf = (c?: string) => CAT[c || ''] ?? CAT.key_player;
const RISK: Record<Risk, [TKey, string, string, string, string, typeof Shield]> = {
  high: ['tal_risk_high', '#a33a28', '#fbe9e6', 'rgba(223,87,64,.3)', '#df5740', TriangleAlert],
  medium: ['tal_risk_medium', '#8a5207', '#fbefda', 'rgba(230,169,72,.4)', '#df9326', CircleAlert],
  low: ['tal_risk_low', '#0f6f49', '#e1f5ec', 'rgba(22,160,107,.3)', '#16a06b', ShieldCheck],
};
const NEXT_RISK: Record<Risk, Risk> = { low: 'medium', medium: 'high', high: 'low' };
const PDIT: Record<string, [TKey, string, string]> = {
  formation: ['tal_pdi_formation', '#e4f2f4', '#0b5f72'], coaching: ['tal_pdi_coaching', '#ece9fb', '#5444b8'], mentorat: ['tal_pdi_mentorat', '#e1f5ec', '#0f6f49'],
  projet: ['tal_pdi_projet', '#fbefda', '#8a5207'], lecture: ['tal_pdi_lecture', '#eef2f4', '#33474f'], conference: ['tal_pdi_conference', '#ece9fb', '#3d2f99'],
};
const PST: Record<Pdi['status'], [TKey, string, string, string, typeof Circle]> = {
  pending: ['tal_pst_todo', '#ffffff', '#52646d', '#d6dfe3', Circle], in_progress: ['tal_pst_doing', '#e4f2f4', '#0b5f72', '#b9dfe5', Clock], completed: ['tal_pst_done', '#e1f5ec', '#0f6f49', '#bfe6d2', CircleCheck],
};
const NEXT_PST: Record<Pdi['status'], Pdi['status']> = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
const VALUES: [keyof Profile, string, TKey, string, string][] = [
  ['amana_score', 'Amana', 'tal_v_trust', '50%', '8.3%'], ['itkan_score', 'Itkan', 'tal_v_excellence', '84%', '37.1%'], ['iltizam_score', 'Iltizam', 'tal_v_commitment', '71%', '83.7%'],
  ['ibdaa_score', 'Ibdaa', 'tal_v_innovation', '29%', '83.7%'], ['nama_score', 'Nama', 'tal_v_growth', '16%', '37.1%'],
];
const ANG = [-90, -18, 54, 126, 198].map(a => a * Math.PI / 180);
const dec = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');
const quarter = () => { const d = new Date(); return `T${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`; };

export default function TalentsPage() {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [cat, setCat] = useState('all');
  const [curId, setCurId] = useState<string | null>(null);
  const [tab, setTab] = useState<'profile' | 'okr' | 'pdi'>('profile');
  const [okrIn, setOkrIn] = useState('');
  const [succIn, setSuccIn] = useState('');
  const [pdiIn, setPdiIn] = useState('');
  const [pdiType, setPdiType] = useState('formation');

  const { data: profiles = [], isLoading } = useQuery({ queryKey: ['talents'], queryFn: listTalents });
  const sorted = useMemo(() => [...profiles].sort((a, b) => (b.performance_score + b.potential_score) - (a.performance_score + a.potential_score)), [profiles]);
  const cur = sorted.find(p => p.employee_id === curId) ?? sorted[0];
  const id = cur?.employee_id ?? '';
  const { data: okrs = [] } = useQuery({ queryKey: ['talents', 'okrs', id], queryFn: () => getOkrs(id), enabled: !!id });
  const { data: pdi = [] } = useQuery({ queryKey: ['talents', 'pdi', id], queryFn: () => getPdi(id), enabled: !!id });
  const [okrDraft, setOkrDraft] = useState<Record<string, number>>({});

  const fail = (e: unknown) => notify.error(getApiError(e, t('error')));
  const bulk = useMutation({ mutationFn: bulkProfile, onSuccess: r => { qc.invalidateQueries({ queryKey: ['talents'] }); notify.success(tf(t('tal_bulk_done'), { n: r.created })); }, onError: fail });
  const patch = useMutation({
    mutationFn: ({ emp, body }: { emp: string; body: Partial<Profile> }) => patchTalent(emp, body),
    onMutate: async ({ emp, body }) => {
      await qc.cancelQueries({ queryKey: ['talents'] });
      const prev = qc.getQueryData<Profile[]>(['talents']);
      qc.setQueryData<Profile[]>(['talents'], l => (l ?? []).map(p => (p.employee_id === emp ? { ...p, ...body } : p)));
      return { prev };
    },
    onError: (e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['talents'], ctx.prev); fail(e); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['talents'] }),
  });
  const okrAdd = useMutation({ mutationFn: (title: string) => addOkr(id, { title, quarter: quarter() }), onSuccess: () => { setOkrIn(''); qc.invalidateQueries({ queryKey: ['talents', 'okrs', id] }); notify.success(t('tal_okr_added')); }, onError: fail });
  const okrSet = useMutation({ mutationFn: ({ okr, progress }: { okr: string; progress: number }) => patchOkr(id, okr, { progress, ...(progress >= 100 ? { status: 'completed' } : {}) }), onSettled: () => qc.invalidateQueries({ queryKey: ['talents', 'okrs', id] }), onError: fail });
  const pdiAdd = useMutation({ mutationFn: (b: Partial<Pdi>) => addPdi(id, b), onSuccess: () => { setPdiIn(''); qc.invalidateQueries({ queryKey: ['talents', 'pdi'] }); }, onError: fail });
  const pdiCycle = useMutation({ mutationFn: (p: Pdi) => patchPdi(id, p.id, { status: NEXT_PST[p.status] }), onSettled: () => qc.invalidateQueries({ queryKey: ['talents', 'pdi', id] }), onError: fail });

  // mobility: profiles with a target role; "Proposer" records the move in the person's development plan
  const mobility = sorted.filter(p => (p.next_role ?? '').trim() && (p.next_role ?? '').trim() !== (p.employees?.position ?? '').trim())
    .map(p => ({ p, match: Math.round((p.performance_score + p.potential_score) / 10 * 100) })).sort((a, b) => b.match - a.match).slice(0, 4);
  const { data: mobPdi = {} } = useQuery({
    queryKey: ['talents', 'pdi', 'mobility', mobility.map(m => m.p.employee_id).join(',')],
    queryFn: async () => Object.fromEntries(await Promise.all(mobility.map(async m => [m.p.employee_id, await getPdi(m.p.employee_id)] as const))),
    enabled: mobility.length > 0,
  });
  const mobTitle = (role: string) => tf(t('tal_mob_pdi'), { role });
  const proposed = (emp: string, role: string) => ((mobPdi as Record<string, Pdi[]>)[emp] ?? []).some(x => x.title === mobTitle(role));

  const shown = sorted.filter(p => cat === 'all' || (p.talent_category || 'key_player') === cat);
  const high = profiles.filter(p => p.flight_risk === 'high').length;
  const critical = profiles.filter(p => p.is_critical_position).length;
  const avgPerf = profiles.length ? profiles.reduce((s, p) => s + p.performance_score, 0) / profiles.length : 0;
  const pdiDone = pdi.filter(p => p.status === 'completed').length;
  const liveOkrs = okrs.filter(o => o.status !== 'cancelled');
  const okrAvg = liveOkrs.length ? Math.round(liveOkrs.reduce((s, o) => s + (okrDraft[o.id] ?? o.progress), 0) / liveOkrs.length) : 0;
  const curRisk = RISK[cur?.flight_risk ?? 'low'];
  const RiskIcon = curRisk[5];
  const radar = cur ? VALUES.map(([k], i) => { const r = Math.max(0, Math.min(5, Number(cur[k] ?? 0))) / 5 * 80; return `${(110 + r * Math.cos(ANG[i])).toFixed(1)},${(110 + r * Math.sin(ANG[i])).toFixed(1)}`; }).join(' ') : '';
  const name = cur?.employees?.full_name ?? '—';

  const addSucc = (e: FormEvent) => {
    e.preventDefault();
    const v = succIn.trim();
    if (!v || !cur) return;
    patch.mutate({ emp: id, body: { successor_names: [...(cur.successor_names ?? []), v] } }, { onSuccess: () => notify.success(tf(t('tal_succ_added'), { name: v })) });
    setSuccIn('');
  };
  const setScore = (k: 'performance_score' | 'potential_score', v: number) => cur && patch.mutate({ emp: id, body: { [k]: v, ...(k === 'performance_score' ? { potential_score: cur.potential_score } : { performance_score: cur.performance_score }) } });
  const saveText = (k: 'next_role' | 'career_path' | 'notes', v: string) => { if (cur && (cur[k] ?? '') !== v.trim()) patch.mutate({ emp: id, body: { [k]: v.trim() || null } }); };

  const cats: [string, string, number, string][] = [['all', t('tal_all'), profiles.length, '#0a1c24'], ...Object.keys(CAT).map(k => [k, t(CAT[k][0]), profiles.filter(p => (p.talent_category || 'key_player') === k).length, CAT[k][3]] as [string, string, number, string])];
  const kpi = (Icon: typeof Users, bg: string, color: string, value: React.ReactNode, label: string, delay: number, valueColor?: string) => (
    <RV as="div" variant="up" delay={delay} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 18, background: '#ffffff', border: '1px solid #e2e8eb' }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color }}><Icon size={19} /></span>
      <div><div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.05, color: valueColor }}>{value}</div><div style={{ fontSize: 12.5, color: '#52646d' }}>{label}</div></div>
    </RV>
  );

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('tal_title')}</RV>
          <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('tal_subtitle')}</RV>
        </div>
        <RV as="button" variant="up" delay={100} type="button" disabled={bulk.isPending} onClick={() => bulk.mutate()} style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#5444b8,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(109,90,214,.85)' }}>
          {bulk.isPending ? <span className="wedy-spin" style={{ position: 'relative', width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#ffffff' }} /> : <Sparkles size={16} style={{ position: 'relative' }} />}
          <span style={{ position: 'relative' }}>{t('tal_bulk')}</span>
        </RV>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
        {kpi(Users, '#e4f2f4', '#0e6f84', profiles.length, t('tal_k_profiles'), 60)}
        {kpi(TriangleAlert, '#fbe9e6', '#df5740', high, t('tal_k_risk'), 110, high ? '#a33a28' : undefined)}
        {kpi(Shield, '#fbefda', '#b06b0c', critical, t('tal_k_critical'), 160)}
        {kpi(TrendingUp, '#e1f5ec', '#16a06b', <>{profiles.length ? dec(avgPerf) : '—'}<span style={{ fontSize: 15, color: '#5f7079', fontWeight: 600 }}> / 5</span></>, t('tal_k_perf'), 210)}
      </div>

      <RV as="div" variant="up" delay={120} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cats.map(([k, label, n, dot]) => {
          const on = cat === k;
          return (
            <button key={k} type="button" onClick={() => setCat(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', borderRadius: 99, border: `1px solid ${on ? '#0a1c24' : '#e2e8eb'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: on && k === 'all' ? '#ffffff' : dot }} />{label}<span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 11, opacity: 0.75 }}>{n}</span>
            </button>
          );
        })}
      </RV>

      {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div> : !profiles.length ? (
        <div style={{ padding: '40px 20px', borderRadius: 18, border: '1px dashed #d0dadf', textAlign: 'center', fontSize: 14, color: '#52646d' }}>{t('tal_none')}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: '1.2 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
              {shown.map((p, k) => {
                const c = catOf(p.talent_category), r = RISK[p.flight_risk ?? 'low'], on = p.employee_id === cur?.employee_id;
                const n = p.employees?.full_name ?? '—';
                return (
                  <RV key={p.employee_id} as="button" variant="up" delay={Math.min(k, 12) * 50} type="button" onClick={() => { setCurId(p.employee_id); setSuccIn(''); setOkrIn(''); }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 18, border: `1px solid ${on ? '#16b6c8' : '#e2e8eb'}`, background: '#ffffff', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', boxShadow: on ? '0 0 0 3px rgba(22,182,200,.18)' : 'none', transition: 'transform .2s,box-shadow .2s,border-color .2s' }} className="tal-h1">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%' }}>
                      <span style={{ width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(n), color: '#ffffff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{initialsOf(n)}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#0a1c24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</span>
                        <span style={{ display: 'block', fontSize: 12.5, color: '#5f7079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.employees?.position || '—'}</span>
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: c[1], color: c[2], whiteSpace: 'nowrap' }}>{t(c[0])}</span>
                      <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: r[1], whiteSpace: 'nowrap' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: r[4] }} />{tf(t('tal_risk_short'), { level: t(r[0]) })}</span>
                    </span>
                    <span style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, width: '100%' }}>
                      {([['tal_perf', p.performance_score, '#16a06b'], ['tal_pot', p.potential_score, '#6d5ad6']] as [TKey, number, string][]).map(([l, v, col]) => (
                        <span key={l}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#5f7079' }}><span>{t(l)}</span><span style={{ fontFamily: "'Geist Mono',monospace", color: '#0a1c24' }}>{dec(v)}</span></span>
                          <span style={{ display: 'block', height: 5, borderRadius: 99, background: '#eef2f4', overflow: 'hidden', marginTop: 5 }}><RV as="span" variant="growx" style={{ display: 'block', height: '100%', width: `${v * 20}%`, borderRadius: 99, background: col, transformOrigin: 'left' }} /></span>
                        </span>
                      ))}
                    </span>
                  </RV>
                );
              })}
            </div>
            {!shown.length && <div style={{ padding: '36px 20px', borderRadius: 18, border: '1px dashed #d0dadf', textAlign: 'center', fontSize: 14, color: '#52646d' }}>{t('tal_none_cat')}</div>}

            <RV as="div" variant="up" style={{ padding: '18px 20px', borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6' }}><Shuffle size={17} /></span>
                <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('tal_mobility')}</span>
              </div>
              {!mobility.length && <div style={{ marginTop: 10, fontSize: 13.5, color: '#52646d' }}>{t('tal_mob_none')}</div>}
              {mobility.map(({ p, match }) => {
                const n = p.employees?.full_name ?? '—', role = (p.next_role ?? '').trim(), sent = proposed(p.employee_id, role);
                return (
                  <div key={p.employee_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #f0f3f4', marginTop: 12, flexWrap: 'wrap' }}>
                    <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(n), color: '#ffffff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initialsOf(n)}</span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', fontSize: 14, fontWeight: 600 }}>{n}<ArrowRight size={14} className="wy-flip" style={{ color: '#7d8f97' }} /><span style={{ color: '#0e6f84' }}>{role}</span></div>
                      <div style={{ fontSize: 12.5, color: '#5f7079', marginTop: 2 }}>{p.career_path || tf(t('tal_mob_why'), { perf: dec(p.performance_score), pot: dec(p.potential_score) })}</div>
                    </div>
                    <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: '#e1f5ec', color: '#0f6f49' }}>{match}%</span>
                    {sent ? <RV as="span" variant="pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#0f6f49' }}><CircleCheck size={14} />{t('tal_mob_sent')}</RV> : (
                      <button type="button" onClick={() => addPdi(p.employee_id, { title: mobTitle(role), action_type: 'projet' }).then(() => { qc.invalidateQueries({ queryKey: ['talents', 'pdi'] }); notify.success(tf(t('tal_mob_toast'), { name: n, role })); }).catch(fail)} className="tal-btn">{t('tal_mob_propose')}</button>
                    )}
                  </div>
                );
              })}
            </RV>
          </div>

          {cur && (
            <RV as="div" variant="left" delay={160} style={{ flex: '1 1 400px', minWidth: 0, position: 'sticky', top: 90, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
              <div style={{ position: 'relative', overflow: 'hidden', padding: '20px 22px', background: '#06141a', color: '#e8eff1', isolation: 'isolate' }}>
                <div aria-hidden="true" className="wedy-drift" style={{ position: 'absolute', right: -90, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.5),transparent)', zIndex: -1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(name), color: '#ffffff', fontSize: 18, fontWeight: 700, border: '2px solid rgba(255,255,255,.2)', flexShrink: 0 }}>{initialsOf(name)}</span>
                  <div style={{ minWidth: 0 }}><div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 21, letterSpacing: '-.03em' }}>{name}</div><div style={{ fontSize: 13, color: '#9fb4bb' }}>{[cur.employees?.position, cur.employees?.department].filter(Boolean).join(' · ') || '—'}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,.08)', color: '#ffffff' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: catOf(cur.talent_category)[3] }} />{t(catOf(cur.talent_category)[0])}</span>
                  <button type="button" title={t('tal_change_risk')} onClick={() => patch.mutate({ emp: id, body: { flight_risk: NEXT_RISK[cur.flight_risk ?? 'low'] } })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, border: 'none', background: 'rgba(255,255,255,.08)', color: '#cfdde1', fontFamily: 'inherit', cursor: 'pointer' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: curRisk[4] }} />{tf(t('tal_risk_long'), { level: t(curRisk[0]) })}</button>
                  <button type="button" onClick={() => patch.mutate({ emp: id, body: { is_critical_position: !cur.is_critical_position } })} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, border: 'none', background: cur.is_critical_position ? 'rgba(230,169,72,.22)' : 'rgba(255,255,255,.08)', color: cur.is_critical_position ? '#f0bd6a' : '#9fb4bb', fontFamily: 'inherit', cursor: 'pointer' }}><Shield size={12} />{t(cur.is_critical_position ? 'tal_critical_on' : 'tal_critical_off')}</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, padding: 6, margin: '12px 16px 0', borderRadius: 13, background: '#f3f6f7' }}>
                {([['profile', t('tal_tab_profile')], ['okr', tf(t('tal_tab_okr'), { n: liveOkrs.length })], ['pdi', tf(t('tal_tab_pdi'), { n: pdi.length })]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setTab(k)} style={{ position: 'relative', flex: 1, height: 34, border: 'none', borderRadius: 9, background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: tab === k ? '#0a1c24' : '#52646d' }}>
                    {tab === k && <RV as="span" variant="pill" style={{ position: 'absolute', inset: 0, borderRadius: 9, background: '#ffffff', boxShadow: '0 1px 3px rgba(10,28,36,.14)' }} />}<span style={{ position: 'relative' }}>{label}</span>
                  </button>
                ))}
              </div>
              <div style={{ padding: '16px 22px 22px' }}>
                {tab === 'profile' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                      {([['performance_score', 'tal_perf', '#16a06b'], ['potential_score', 'tal_pot', '#6d5ad6']] as ['performance_score' | 'potential_score', TKey, string][]).map(([k, l, col]) => (
                        <div key={k} style={{ padding: '12px 14px', borderRadius: 14, background: '#f3f6f7' }}>
                          <div style={{ fontSize: 11.5, color: '#5f7079' }}>{t(l)}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-.04em' }}>{dec(cur[k])}</span><span style={{ fontSize: 12, color: '#5f7079' }}>/ 5</span></div>
                          <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                            {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={`${t(l)} ${n}/5`} onClick={() => setScore(k, n)} style={{ flex: 1, height: 6, padding: 0, border: 'none', borderRadius: 99, background: n <= cur[k] ? col : '#e2e8eb', cursor: 'pointer', transition: 'background .3s' }} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 18, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 15 }}>{t('tal_values')}</div>
                    <div style={{ position: 'relative', width: '100%', maxWidth: 300, aspectRatio: '280 / 240', margin: '6px auto 0' }}>
                      <svg viewBox="-30 -10 280 240" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                        {['110,30 186.09,85.28 157.02,174.72 62.98,174.72 33.91,85.28', '110,50 167.07,91.46 145.27,158.54 74.73,158.54 52.93,91.46', '110,70 148.04,97.64 133.51,142.36 86.49,142.36 71.96,97.64', '110,90 129.02,103.82 121.76,126.18 98.24,126.18 90.98,103.82'].map((pts, i) => <polygon key={i} points={pts} style={{ fill: i === 0 ? '#f8fafb' : 'none', stroke: '#e2e8eb', strokeWidth: 1 }} />)}
                        {[[110, 30], [186.09, 85.28], [157.02, 174.72], [62.98, 174.72], [33.91, 85.28]].map(([x, y], i) => <line key={i} x1="110" y1="110" x2={x} y2={y} style={{ stroke: '#e2e8eb', strokeWidth: 1 }} />)}
                        <RV as="g" key={id} variant="scale" style={{ transformOrigin: '110px 110px' }}><polygon points={radar} style={{ fill: 'rgba(22,182,200,.22)', stroke: '#16b6c8', strokeWidth: 2, strokeLinejoin: 'round' }} /></RV>
                      </svg>
                      {VALUES.map(([k, label, tip, left, top]) => (
                        <span key={k} title={t(tip)} style={{ position: 'absolute', left, top, transform: 'translate(-50%,-50%)', textAlign: 'center', lineHeight: 1.2 }}>
                          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#33474f' }}>{label}</span>
                          <span style={{ display: 'block', fontFamily: "'Geist Mono',monospace", fontSize: 11, color: '#0e6f84' }}>{cur[k] ? dec(Number(cur[k])) : '—'}</span>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14, padding: '12px 14px', borderRadius: 14, background: curRisk[2], border: `1px solid ${curRisk[3]}` }}>
                      <RiskIcon size={17} style={{ color: curRisk[1], flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: curRisk[1] }}>{tf(t('tal_risk_long'), { level: t(curRisk[0]) })}</div>
                        <textarea key={`notes-${id}`} defaultValue={cur.notes ?? ''} onBlur={e => saveText('notes', e.target.value)} placeholder={t('tal_why_ph')} rows={2}
                          style={{ width: '100%', marginTop: 2, padding: 0, border: 'none', background: 'transparent', resize: 'vertical', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5, color: '#33474f', outline: 'none' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14, fontSize: 13.5 }}>
                      {([['next_role', 'tal_next'], ['career_path', 'tal_path']] as ['next_role' | 'career_path', TKey][]).map(([k, l]) => (
                        <label key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #f0f3f4' }}>
                          <span style={{ color: '#5f7079', whiteSpace: 'nowrap' }}>{t(l)}</span>
                          <input key={`${k}-${id}`} defaultValue={cur[k] ?? ''} onBlur={e => saveText(k, e.target.value)} placeholder="—" style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', textAlign: 'end', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#0a1c24', outline: 'none' }} className="tal-inline" />
                        </label>
                      ))}
                      <div style={{ padding: '10px 0', borderTop: '1px solid #f0f3f4' }}>
                        <div style={{ color: '#5f7079' }}>{t('tal_succ')}</div>
                        <form onSubmit={addSucc} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 8 }}>
                          {(cur.successor_names ?? []).map(s => (
                            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 8px 0 4px', borderRadius: 99, background: '#e4f2f4', fontSize: 12.5, fontWeight: 600, color: '#0b5f72' }}>
                              <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(s), color: '#ffffff', fontSize: 9, fontWeight: 700 }}>{initialsOf(s)}</span>{s}
                              <button type="button" aria-label={t('delete')} onClick={() => patch.mutate({ emp: id, body: { successor_names: (cur.successor_names ?? []).filter(x => x !== s) } })} style={{ border: 'none', background: 'none', padding: 0, color: '#5f9aa6', cursor: 'pointer', display: 'inline-flex' }}><X size={12} /></button>
                            </span>
                          ))}
                          <input value={succIn} onChange={e => setSuccIn(e.target.value)} placeholder={t('tal_succ_add')} style={{ width: 120, height: 30, padding: '0 11px', borderRadius: 99, border: '1px dashed #c3ced3', background: 'transparent', fontFamily: 'inherit', fontSize: 12.5, color: '#0a1c24', outline: 'none' }} className="tal-f1" />
                        </form>
                      </div>
                    </div>
                  </>
                )}
                {tab === 'okr' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 15 }}>{tf(t('tal_okr_title'), { q: quarter() })}</span><span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, color: '#52646d' }}>{tf(t('tal_okr_avg'), { n: okrAvg })}</span></div>
                    {!liveOkrs.length && <div style={{ fontSize: 13.5, color: '#52646d' }}>{t('tal_okr_none')}</div>}
                    {liveOkrs.map(o => {
                      const p = okrDraft[o.id] ?? o.progress;
                      return (
                        <RV key={o.id} as="div" variant="up" style={{ padding: 14, borderRadius: 14, border: '1px solid #e2e8eb' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}><span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{o.title}</span><span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 800, fontSize: 19, color: p >= 70 ? '#0f6f49' : p >= 40 ? '#0b5f72' : '#8a5207' }}>{p}%</span></div>
                          <input type="range" min={0} max={100} step={5} value={p} aria-label={t('tal_okr_progress')} onChange={e => setOkrDraft(d => ({ ...d, [o.id]: +e.target.value }))}
                            onPointerUp={() => { if (okrDraft[o.id] !== undefined && okrDraft[o.id] !== o.progress) okrSet.mutate({ okr: o.id, progress: okrDraft[o.id] }); }}
                            onKeyUp={() => { if (okrDraft[o.id] !== undefined && okrDraft[o.id] !== o.progress) okrSet.mutate({ okr: o.id, progress: okrDraft[o.id] }); }}
                            style={{ width: '100%', margin: '10px 0 0', accentColor: '#0e6f84', cursor: 'pointer' }} />
                        </RV>
                      );
                    })}
                    <form onSubmit={e => { e.preventDefault(); if (okrIn.trim()) okrAdd.mutate(okrIn.trim()); }} style={{ display: 'flex', gap: 8 }}>
                      <input value={okrIn} onChange={e => setOkrIn(e.target.value)} placeholder={t('tal_okr_ph')} style={{ flex: 1, minWidth: 0, height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' }} className="tal-f2" />
                      <button type="submit" disabled={okrAdd.isPending} style={{ height: 40, padding: '0 14px', border: 'none', borderRadius: 11, background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('tal_add')}</button>
                    </form>
                  </div>
                )}
                {tab === 'pdi' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 15 }}>{t('tal_pdi_title')}</span><span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12, color: '#52646d' }}>{tf(t('tal_pdi_done'), { n: pdiDone, total: pdi.length })}</span></div>
                    <div style={{ height: 6, borderRadius: 99, background: '#eef2f4', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pdi.length ? Math.round(pdiDone / pdi.length * 100) : 0}%`, borderRadius: 99, background: 'linear-gradient(90deg,#0f6f49,#2bbd86)', transition: 'width .6s' }} /></div>
                    {pdi.map(d => {
                      const ty = PDIT[d.action_type || 'formation'] ?? PDIT.formation, st = PST[d.status] ?? PST.pending, StIcon = st[4];
                      return (
                        <RV key={d.id} as="div" variant="up" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1px solid #e2e8eb', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: ty[1], color: ty[2] }}>{t(ty[0])}</span>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: d.status === 'completed' ? '#7d8f97' : '#0a1c24', textDecoration: d.status === 'completed' ? 'line-through' : 'none' }}>{d.title}</div>
                            {d.target_date && <div style={{ fontSize: 12, color: '#5f7079', marginTop: 2 }}>{tf(t('tal_pdi_due'), { date: d.target_date.slice(0, 10).split('-').reverse().join('/') })}</div>}
                          </div>
                          <button type="button" onClick={() => pdiCycle.mutate(d)} title={t('tal_pdi_change')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 11px', borderRadius: 99, border: `1px solid ${st[3]}`, background: st[1], color: st[2], fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}><StIcon size={13} />{t(st[0])}</button>
                        </RV>
                      );
                    })}
                    <form onSubmit={e => { e.preventDefault(); if (pdiIn.trim()) pdiAdd.mutate({ title: pdiIn.trim(), action_type: pdiType }); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <select value={pdiType} onChange={e => setPdiType(e.target.value)} style={{ height: 40, padding: '0 10px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13, color: '#33474f', outline: 'none' } as CSSProperties}>
                        {Object.keys(PDIT).map(k => <option key={k} value={k}>{t(PDIT[k][0])}</option>)}
                      </select>
                      <input value={pdiIn} onChange={e => setPdiIn(e.target.value)} placeholder={t('tal_pdi_ph')} style={{ flex: 1, minWidth: 140, height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' }} className="tal-f2" />
                      <button type="submit" disabled={pdiAdd.isPending} style={{ height: 40, padding: '0 14px', border: 'none', borderRadius: 11, background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('tal_add')}</button>
                    </form>
                  </div>
                )}
              </div>
            </RV>
          )}
        </div>
      )}
    </div>
  );
}
