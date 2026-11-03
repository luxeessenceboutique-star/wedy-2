import { useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Lock, ShieldCheck } from 'lucide-react';
import { api, getApiError } from '@/services/api';
import type { Employee } from '@/services/api';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang, type Lang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import './portal.css';

const getMe = () => api.get<Employee>('/portal/me').then(r => r.data);
const EDITABLE: ['phone' | 'address' | 'city', TKey][] = [['phone', 'pprof_phone'], ['address', 'pprof_address'], ['city', 'pprof_city']];
const mask = (v?: string) => (v ? `•••• •••• •••• ${v.replace(/\s/g, '').slice(-4)}` : '—');
const fmtDate = (d?: string) => (d ? d.slice(0, 10).split('-').reverse().join('/') : '—');
const input: CSSProperties = { height: 44, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: '#0a1c24', outline: 'none', background: '#ffffff' };

export default function MyProfilePage() {
  const { t, lang, setLang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const { data: me, isLoading } = useQuery({ queryKey: ['portal-me'], queryFn: getMe, retry: false });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const value = (k: 'phone' | 'address' | 'city') => draft[k] ?? (me?.[k] as string | undefined) ?? '';
  const dirty = Object.keys(draft).some(k => (draft[k] ?? '') !== ((me?.[k as keyof Employee] as string | undefined) ?? ''));
  const save = useMutation({
    mutationFn: () => api.patch('/portal/me', draft).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-me'] }); setDraft({}); notify.success(t('pprof_saved')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  if (isLoading || !me) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>;
  const cf = (me.custom_fields ?? {}) as Record<string, string>;
  const locked: [TKey, string, boolean][] = [
    ['pprof_cin', me.cin || '—', false], ['pprof_matricule', me.matricule || '—', false], ['pprof_cnss', cf.cnss || cf.CNSS || cf['N° CNSS'] || '—', false],
    ['pprof_rib', mask(cf.rib || cf.RIB), true], ['pprof_birth', fmtDate(me.birth_date), false], ['pprof_nationality', me.nationality || '—', false],
  ];
  const chip: CSSProperties = { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,.08)', color: '#cfdde1' };
  const LANGS: [Lang, string, string][] = [['fr', 'Français', 'inherit'], ['ar', 'العربية', "'Noto Kufi Arabic',system-ui,sans-serif"], ['en', 'English', 'inherit']];

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 24px 100px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <RV as="section" variant="up" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: 24, borderRadius: 24, background: '#06141a', color: '#e8eff1', isolation: 'isolate' }}>
        <div aria-hidden="true" className="wedy-drift" style={{ position: 'absolute', left: -60, top: -140, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)', zIndex: -1 }} />
        <span style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
          <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.6)' }} />
          <span style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(me.full_name), fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 26, fontWeight: 700, color: '#ffffff', border: '2px solid rgba(255,255,255,.2)' }}>{initialsOf(me.full_name)}</span>
        </span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: '-.04em' }}>{me.full_name}</div>
          <div style={{ fontSize: 14, color: '#9fb4bb', marginTop: 3 }}>{[me.position, me.department].filter(Boolean).join(' · ') || '—'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {me.contract_type && <span style={{ ...chip, fontWeight: 700, background: 'rgba(154,139,240,.18)', color: '#c9c0f8' }}>{me.contract_type}</span>}
            {me.hire_date && <span style={chip}>{tf(t('pprof_since'), { date: fmtDate(me.hire_date) })}</span>}
            {me.manager && <span style={chip}>{tf(t('onb_manager'), { name: me.manager })}</span>}
            {me.email && <span style={chip}>{me.email}</span>}
          </div>
        </div>
      </RV>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <RV as="div" variant="up" delay={80} style={{ flex: '1.4 1 440px', minWidth: 0, padding: 22, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 17 }}>{t('pprof_contact')}</div>
          <div style={{ fontSize: 13, color: '#52646d', marginTop: 2 }}>{t('pprof_contact_sub')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))', gap: 14, marginTop: 16 }}>
            {EDITABLE.map(([k, l]) => (
              <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>{t(l)}
                <input value={value(k)} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} style={input} className="ptl-f1" />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>Email
              <input value={me.email ?? ''} readOnly style={{ ...input, background: '#f8fafb', color: '#52646d' }} />
            </label>
          </div>
          {dirty && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => setDraft({})} className="btn btn-secondary">{t('cancel')}</button>
              <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="btn btn-primary">{save.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('save')}</button>
            </div>
          )}
          <div style={{ marginTop: 22, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pprof_admin')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
            {locked.map(([l, v]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid #f0f3f4', flexWrap: 'wrap' }}>
                <span style={{ width: 150, fontSize: 13, color: '#5f7079' }}>{t(l)}</span>
                <span style={{ flex: 1, fontFamily: "'Geist Mono',monospace", fontSize: 13, fontWeight: 500 }}>{v}</span>
                <Lock size={13} style={{ color: '#a3b1b7' }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: '#7d8f97' }}>{t('pprof_admin_hint')}</div>
        </RV>

        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RV as="div" variant="up" delay={120} style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('pprof_lang')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6, marginTop: 12 }}>
              {LANGS.map(([k, l, f]) => {
                const on = lang === k;
                return <button key={k} type="button" onClick={() => setLang(k)} style={{ height: 42, borderRadius: 11, border: `1px solid ${on ? '#0a1c24' : '#d6dfe3'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: f, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{l}</button>;
              })}
            </div>
          </RV>
          <RV as="div" variant="up" delay={160} style={{ padding: 20, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}><ShieldCheck size={17} style={{ color: '#0e6f84' }} />{t('pprof_security')}</div>
            <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.55, color: '#33474f' }}>{t('pprof_security_text')}</div>
          </RV>
        </div>
      </div>
    </div>
  );
}
