import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Briefcase, Copy, Megaphone, Send, Sparkles, Trash2, Users } from 'lucide-react';
import { SocialKit } from '@/components/annonces/SocialKit';
import { useAppSettings } from '@/lib/appSettings';
import { listAnnonces, createAnnonce, updateAnnonce, deleteAnnonce, chatGenerateAnnonce, listCandidates, getApiError } from '@/services/api';
import type { Employee, JobAd } from '@/services/api';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import './AnnoncesPage.css';

const LANGS: { k: 'fr' | 'ar' | 'en'; label: string; code: string }[] = [
  { k: 'fr', label: 'Français', code: 'FR' }, { k: 'ar', label: 'العربية', code: 'AR' }, { k: 'en', label: 'English', code: 'EN' },
];
const CONTRACTS = ['CDI', 'CDD', 'Stage', 'Freelance'];
const fieldLabel = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' } as const;
const fieldInput = { height: 44, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: '#0a1c24', outline: 'none' } as const;

export default function AnnoncesPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const notify = useNotify();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [contract, setContract] = useState('CDI');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [lang, setLang] = useState<'fr' | 'ar' | 'en'>('fr');
  const [draft, setDraft] = useState('');
  const [kit, setKit] = useState<{ ad: JobAd; fresh: boolean } | null>(null);
  const settingsQ = useAppSettings();

  const { data: ads = [], isLoading } = useQuery({ queryKey: ['annonces'], queryFn: listAnnonces });
  const { data: cands = [] } = useQuery<Employee[]>({ queryKey: ['candidates'], queryFn: listCandidates });
  const company = settingsQ.data?.company?.name || (typeof user?.profile?.company === 'string' ? user.profile.company : '');

  // applications of a post: candidates linked to it (custom_fields.ad_id) or applying for the same position
  const appsOf = (ad: JobAd) => cands.filter(c => c.custom_fields?.ad_id === ad.id || (!c.custom_fields?.ad_id && (c.position || '').trim().toLowerCase() === ad.poste.trim().toLowerCase())).length;

  const gen = useMutation({
    mutationFn: () => chatGenerateAnnonce([{ role: 'user', content: [
      `${t('ads_f_title')} : ${title.trim()}`, `${t('ads_f_contract')} : ${contract}`, city.trim() ? `${t('ads_f_city')} : ${city.trim()}` : '', notes.trim() ? `${t('ads_f_points')} : ${notes.trim()}` : '',
    ].filter(Boolean).join('\n') }], { mode: 'direct', language: lang, company }),
    onSuccess: r => setDraft((r.reply || '').replace(/```[a-z]*\n?|```/g, '').replace(/\*\*/g, '').trim()),
    onError: e => notify.error(getApiError(e, t('ads_gen_error'))),
  });
  const publish = useMutation({
    mutationFn: () => createAnnonce({ poste: title.trim(), description: [contract, city.trim()].filter(Boolean).join(' · '), competences: notes.trim() || undefined, contenu: draft, is_active: true }),
    onSuccess: ad => { qc.invalidateQueries({ queryKey: ['annonces'] }); setDraft(''); notify.success(tf(t('ads_published'), { title: ad.poste })); setKit({ ad, fresh: true }); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const toggle = useMutation({
    mutationFn: (ad: JobAd) => updateAnnonce(ad, { is_active: !ad.is_active }),
    onSuccess: ad => { qc.invalidateQueries({ queryKey: ['annonces'] }); notify.success(tf(t(ad.is_active ? 'ads_reopened' : 'ads_closed'), { title: ad.poste })); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const remove = useMutation({
    mutationFn: (ad: JobAd) => deleteAnnonce(ad.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['annonces'] }); notify.success(t('ads_deleted')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  const generate = () => {
    if (!title.trim()) { notify.error(t('ads_title_required')); return; }
    if (!gen.isPending) gen.mutate();
  };
  const copyLink = (ad: JobAd) => {
    const url = `${window.location.origin}/postuler/${ad.id}`;
    navigator.clipboard?.writeText(url).then(() => notify.success(t('ads_link_copied')), () => notify.info(url));
  };
  const sorted = [...ads].sort((a, b) => Number(b.is_active) - Number(a.is_active) || (b.created_at || '').localeCompare(a.created_at || ''));
  const busy = gen.isPending;
  const code = LANGS.find(l => l.k === lang)!.code;

  return (
    <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, width: '100%' }}>
      <div>
        <RV as="h1" variant="up" style={{ margin: 0, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: 1.05 }}>{t('ads_title')}</RV>
        <RV as="p" variant="up" delay={60} style={{ margin: '8px 0 0', fontSize: 15, color: '#52646d' }}>{t('ads_subtitle')}</RV>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>}
          {!isLoading && sorted.length === 0 && (
            <div style={{ padding: '40px 20px', borderRadius: 20, border: '1px dashed #d0dadf', textAlign: 'center', fontSize: 14, color: '#52646d' }}>{t('ads_none')}</div>
          )}
          {sorted.map((ad, i) => {
            const st: [TKey, string, string] = ad.is_active ? ['ads_st_published', '#e1f5ec', '#0f6f49'] : ['ads_st_closed', '#fbe9e6', '#a33a28'];
            return (
              <RV key={ad.id} as="div" variant="up" delay={Math.min(i, 10) * 60} style={{ padding: '18px 20px', borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', transition: 'border-color .2s,box-shadow .2s' }} className="ads-h1">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {ad.image_url
                    ? <button type="button" onClick={() => setKit({ ad, fresh: false })} title={t('sk_title')} style={{ width: 80, height: 42, borderRadius: 10, flexShrink: 0, border: '1px solid #e2e8eb', padding: 0, cursor: 'pointer', background: `#eaf0f2 center/cover url(${ad.image_url})` }} />
                    : <span style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84', flexShrink: 0 }}><Briefcase size={19} /></span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 600, fontSize: 17, letterSpacing: '-.02em' }}>{ad.poste}</div>
                    <div style={{ fontSize: 13, color: '#52646d', marginTop: 2 }}>{ad.description || '—'}</div>
                  </div>
                  <button type="button" onClick={() => toggle.mutate(ad)} title={t(ad.is_active ? 'ads_close' : 'ads_reopen')} style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, border: 'none', background: st[1], color: st[2], whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit' }}>{t(st[0])}</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, paddingTop: 12, borderTop: '1px solid #eef2f4', fontSize: 13, color: '#52646d', flexWrap: 'wrap' }}>
                  <Link to="/app/candidats" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#52646d' }}><Users size={14} /><strong style={{ color: '#0a1c24' }}>{appsOf(ad)}</strong> {t('ads_applications')}</Link>
                  <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 12 }}>{ad.created_at ? new Date(ad.created_at).toLocaleDateString('fr-FR') : ''}</span>
                  <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <button type="button" onClick={() => setKit({ ad, fresh: false })} className="ads-share"><Megaphone size={14} />{t('sk_open')}</button>
                    <button type="button" onClick={() => copyLink(ad)} aria-label={t('ads_copy_link')} title={t('ads_copy_link')} className="ads-icon"><Copy size={14} /></button>
                    <button type="button" onClick={() => { if (window.confirm(tf(t('ads_confirm_delete'), { title: ad.poste }))) remove.mutate(ad); }} aria-label={t('delete')} title={t('delete')} className="ads-icon ads-danger"><Trash2 size={14} /></button>
                    <a href={`/postuler/${ad.id}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#0e6f84' }} className="ads-h2">{t('ads_public_page')}<ArrowUpRight size={14} /></a>
                  </span>
                </div>
              </RV>
            );
          })}
        </div>

        <RV as="div" variant="left" delay={120} style={{ flex: '1.15 1 440px', minWidth: 0, position: 'sticky', top: 90, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 12, padding: '20px 22px', background: '#06141a', color: '#e8eff1', isolation: 'isolate' }}>
            <div aria-hidden="true" className="wedy-drift" style={{ position: 'absolute', right: -60, top: -110, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.55),transparent)', zIndex: -1 }} />
            <img src="/wedy-avatar.png" alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: '#0f262e', border: '2px solid rgba(95,227,240,.5)' }} />
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18 }}>{t('ads_studio')}</div>
              <div style={{ fontSize: 12.5, color: '#9fb4bb' }}>{t('ads_studio_sub')}</div>
            </div>
          </div>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              <label style={{ ...fieldLabel, gridColumn: '1 / -1' }}>{t('ads_f_title')}<input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('ads_f_title_ph')} style={fieldInput} className="ads-f1" /></label>
              <label style={fieldLabel}>{t('ads_f_contract')}<select value={contract} onChange={e => setContract(e.target.value)} style={{ ...fieldInput, padding: '0 10px' }}>{CONTRACTS.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
              <label style={fieldLabel}>{t('ads_f_city')}<input value={city} onChange={e => setCity(e.target.value)} placeholder="Casablanca" style={fieldInput} className="ads-f1" /></label>
              <label style={{ ...fieldLabel, gridColumn: '1 / -1' }}>{t('ads_f_points')}<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={t('ads_f_points_ph')} style={{ ...fieldInput, height: 'auto', resize: 'vertical', padding: '10px 12px' }} className="ads-f1" /></label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>{t('ads_lang')}</span>
              {LANGS.map(l => {
                const on = lang === l.k;
                return <button key={l.k} type="button" onClick={() => setLang(l.k)} style={{ height: 32, padding: '0 12px', borderRadius: 99, border: `1px solid ${on ? '#0a1c24' : '#e2e8eb'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{l.label}</button>;
              })}
            </div>
            <button type="button" onClick={generate} disabled={busy} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, border: 'none', borderRadius: 13, background: 'linear-gradient(135deg,#5444b8,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 14px 30px -14px rgba(109,90,214,.8)' }}>
              <span className="wedy-shine" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} />
              {busy ? (
                <><span className="wedy-spin" style={{ position: 'relative', width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#ffffff' }} /><span style={{ position: 'relative' }}>{t('ads_writing')}</span></>
              ) : (
                <><Sparkles size={17} style={{ position: 'relative' }} /><span style={{ position: 'relative' }}>{t(draft ? 'ads_regenerate' : 'ads_generate')}</span></>
              )}
            </button>
            {draft && !busy && (
              <>
                <RV as="div" variant="up" style={{ borderRadius: 16, border: '1px solid #dfe7ea', background: '#fbfcfc', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid #eef2f4', fontFamily: "'Geist Mono',monospace", fontSize: 11, letterSpacing: '.1em', color: '#0e6f84' }}>
                    {t('ads_preview')}<span style={{ marginInlineStart: 'auto', padding: '2px 7px', borderRadius: 6, background: '#e4f2f4' }}>{code}</span>
                  </div>
                  <textarea dir={lang === 'ar' ? 'rtl' : 'ltr'} value={draft} onChange={e => setDraft(e.target.value)} rows={12}
                    style={{ display: 'block', width: '100%', maxHeight: 340, border: 'none', background: 'transparent', resize: 'vertical', padding: '16px 18px', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.65, color: '#1d3540', outline: 'none' }} />
                </RV>
                <button type="button" onClick={() => publish.mutate()} disabled={publish.isPending} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, border: 'none', borderRadius: 12, background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }} className="ads-h3">
                  {publish.isPending ? <Spinner size={16} color="#fff" /> : <Send size={16} />}{t('ads_publish')}
                </button>
              </>
            )}
          </div>
        </RV>
      </div>
      <SocialKit ad={kit?.ad ?? null} open={!!kit} fresh={kit?.fresh} lang={lang} onClose={() => setKit(null)} />
    </div>
  );
}
