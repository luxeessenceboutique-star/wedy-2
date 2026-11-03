import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Briefcase, CalendarClock, Check, CircleAlert, CloudUpload, FileText, Gift, Target, UserCheck, X } from 'lucide-react';
import { applyCandidate, getAnnonce, listAnnonces, listSlots, extractCV, getApiError } from '@/services/api';
import type { HRSlot } from '@/services/api';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { tf } from '@/lib/format';
import '../employee/portal.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BLOCK_STYLE: [string, string, typeof Target][] = [['#e4f2f4', '#0e6f84', Target], ['#ece9fb', '#6d5ad6', UserCheck], ['#e1f5ec', '#16a06b', Gift], ['#fbefda', '#b06b0c', Briefcase]];

/** Split the AI-written ad (plain text, "•" bullets, section titles on their own line) into intro + sections. */
function parseAd(text: string) {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean).filter(l => !/^#+\s*$/.test(l));
  const blocks: { title: string; items: string[] }[] = [];
  const intro: string[] = [];
  let cur: { title: string; items: string[] } | null = null;
  lines.forEach((l, i) => {
    const bullet = /^([•\-*–]|\d+[.)])\s+/.test(l);
    const clean = l.replace(/^([•\-*–]|\d+[.)])\s+/, '').replace(/\*\*/g, '').replace(/^#+\s*/, '');
    const nextIsBullet = /^([•\-*–]|\d+[.)])\s+/.test(lines[i + 1] ?? '');
    if (!bullet && nextIsBullet) { cur = { title: clean.replace(/:$/, ''), items: [] }; blocks.push(cur); return; }
    if (bullet && cur) { cur.items.push(clean); return; }
    if (bullet) { cur = { title: '', items: [clean] }; blocks.push(cur); return; }
    if (!blocks.length) intro.push(clean); else cur = null;
  });
  return { intro: intro.slice(1).join(' ') || intro.join(' '), blocks: blocks.filter(b => b.items.length) };
}

export default function PostulerPage() {
  const { id = '' } = useParams();
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ full_name: '', email: '', phone: '', linkedin: '' });
  const [touched, setTouched] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [consent, setConsent] = useState(false);
  const [cv, setCv] = useState<{ name: string; size: number; url: string; skills: string[] } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [slotId, setSlotId] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ first: string; interview: { date: string; time: string } | null } | null>(null);

  const { data: ad, isLoading, isError } = useQuery({ queryKey: ['public-ad', id], queryFn: () => getAnnonce(id), retry: false });
  const { data: ads = [] } = useQuery({ queryKey: ['public-ads'], queryFn: listAnnonces, retry: false });
  const { data: slots = [] } = useQuery({ queryKey: ['public-slots'], queryFn: () => listSlots(), retry: false });
  const parsed = useMemo(() => parseAd(ad?.contenu ?? ''), [ad]);
  const [now] = useState(() => Date.now());
  const freeSlots = (slots as HRSlot[]).filter(s => s.status === 'free' && new Date(`${s.date}T${(s.start_time || '00:00').slice(0, 5)}`).getTime() > now).slice(0, 8);
  useEffect(() => { if (ad?.poste) document.title = `${ad.poste} — ${t('apply_careers')}`; }, [ad, t]);

  const meta = (ad?.description || '').split('·').map(s => s.trim()).filter(Boolean);
  const daysAgo = ad?.created_at ? Math.max(0, Math.round((now - new Date(ad.created_at).getTime()) / 864e5)) : null;
  const fields: { k: keyof typeof f; label: string; type: string; ph: string; required?: boolean; valid?: (v: string) => boolean }[] = [
    { k: 'full_name', label: `${t('apply_name')} *`, type: 'text', ph: t('apply_name_ph'), required: true, valid: v => v.trim().length >= 2 },
    { k: 'email', label: 'Email *', type: 'email', ph: t('apply_email_ph'), required: true, valid: v => EMAIL.test(v.trim()) },
    { k: 'phone', label: t('apply_phone'), type: 'tel', ph: '+212 6 00 00 00 00' },
    { k: 'linkedin', label: t('apply_linkedin'), type: 'url', ph: 'linkedin.com/in/…' },
  ];

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErr(t('apply_cv_big')); return; }
    setErr(''); setParsing(true); setCv({ name: file.name, size: file.size, url: '', skills: [] });
    try {
      const { extraction, cv_url } = await extractCV(file);
      const x = (extraction ?? {}) as Record<string, unknown>;
      setF(p => ({ full_name: p.full_name || String(x.full_name ?? ''), email: p.email || String(x.email ?? ''), phone: p.phone || String(x.phone ?? ''), linkedin: p.linkedin || String(x.linkedin ?? '') }));
      setCv({ name: file.name, size: file.size, url: cv_url ?? '', skills: Array.isArray(x.skills) ? (x.skills as string[]).slice(0, 6) : [] });
    } catch {
      setCv({ name: file.name, size: file.size, url: '', skills: [] });
    } finally { setParsing(false); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (fields.some(x => x.required && !x.valid!(f[x.k]))) { setErr(t('apply_err_fields')); return; }
    if (!consent) { setErr(t('apply_err_consent')); return; }
    setErr(''); setSending(true);
    try {
      const slot = freeSlots.find(s => s.id === slotId);
      const r = await applyCandidate({ ...f, ad_id: id, message: motivation || undefined, cv_url: cv?.url || undefined, slot_id: slot?.id, interview_time: slot?.start_time?.slice(0, 5) });
      setDone({ first: f.full_name.trim().split(' ')[0], interview: r?.interview ?? null });
    } catch (e2) {
      setErr(getApiError(e2, t('apply_err_send')));
    } finally { setSending(false); }
  };

  const inputStyle = (bad: boolean): CSSProperties => ({ height: 44, padding: '0 12px', borderRadius: 11, border: `1px solid ${bad ? '#df5740' : '#d6dfe3'}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: '#0a1c24', outline: 'none' });

  if (isLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f6f7' }}><Spinner /></div>;
  if (isError || !ad) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#f3f6f7', color: '#0a1c24', padding: 24, textAlign: 'center' }}>
      <span style={{ width: 52, height: 52, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #e2e8eb', color: '#7d8f97' }}><Briefcase size={22} /></span>
      <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 22 }}>{t('apply_gone')}</div>
      <div style={{ fontSize: 14, color: '#52646d' }}>{t('apply_gone_sub')}</div>
    </div>
  );
  const closed = ad.is_active === false;
  const steps: [string, boolean][] = [[t('apply_s1'), true], [done?.interview ? tf(t('apply_s2_booked'), { date: new Date(`${done.interview.date}T00:00:00`).toLocaleDateString('fr-FR'), time: done.interview.time }) : t('apply_s2'), !!done?.interview], [t('apply_s3'), false], [t('apply_s4'), false]];

  return (
    <div style={{ minHeight: '100vh', background: '#f3f6f7', color: '#0a1c24', fontFamily: "'Geist',system-ui,sans-serif" }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(243,246,247,.86)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid #e2e8eb' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px' }}>
          <img src="/wedy-avatar.png" alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', background: '#0f262e' }} />
          <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 16 }}>{t('apply_careers')}</span>
          {ads.filter(a => a.is_active).length > 0 && <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#33474f' }}><Briefcase size={14} />{tf(t('apply_open_n'), { n: ads.filter(a => a.is_active).length })}</span>}
        </div>
      </header>
      <section style={{ position: 'relative', overflow: 'hidden', background: '#06141a', color: '#e8eff1', isolation: 'isolate' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
          <div className="wedy-drift" style={{ position: 'absolute', left: '-6%', top: '-60%', width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.65),transparent)' }} />
          <div className="wedy-drift" style={{ position: 'absolute', right: '-4%', top: '-40%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.38),transparent)', ['--dur' as string]: '27s', ['--delay' as string]: '-9s' } as CSSProperties} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)', backgroundSize: '40px 40px', WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%,#000,transparent 70%)', maskImage: 'radial-gradient(ellipse at 30% 40%,#000,transparent 70%)' }} />
        </div>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '54px 24px 46px' }}>
          <RV as="div" variant="up" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {meta.map((m, i) => <span key={m} style={{ fontSize: 12, fontWeight: i === 0 ? 700 : 600, padding: '5px 11px', borderRadius: 99, background: i === 0 ? 'rgba(43,189,134,.16)' : 'rgba(255,255,255,.08)', color: i === 0 ? '#4fd3a0' : '#cfdde1' }}>{m}</span>)}
            {daysAgo !== null && <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 99, background: 'rgba(255,255,255,.08)', color: '#cfdde1' }}>{daysAgo === 0 ? t('apply_today') : tf(t('apply_ago'), { n: daysAgo })}</span>}
            {closed && <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 99, background: 'rgba(239,107,84,.16)', color: '#ef8b78' }}>{t('apply_closed')}</span>}
          </RV>
          <RV as="h1" variant="up" delay={80} style={{ margin: '18px 0 0', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 'clamp(36px,5vw,62px)', letterSpacing: '-.05em', lineHeight: 1, color: '#f1f8f9' }}>{ad.poste}</RV>
          {parsed.intro && <RV as="p" variant="up" delay={160} style={{ margin: '16px 0 0', maxWidth: 640, fontSize: 17, lineHeight: 1.6, color: '#b9cbd0' }}>{parsed.intro}</RV>}
        </div>
      </section>

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '28px 24px 64px', display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        <div style={{ flex: '1.3 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {parsed.blocks.length ? parsed.blocks.map((b, i) => {
            const [tint, color, Icon] = BLOCK_STYLE[i % BLOCK_STYLE.length];
            return (
              <RV key={i} as="div" variant="up" delay={i * 80} style={{ padding: 22, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb' }}>
                {b.title && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint, color }}><Icon size={18} /></span><span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18 }}>{b.title}</span></div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: b.title ? 14 : 0 }}>
                  {b.items.map(it => <div key={it} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14.5, lineHeight: 1.55, color: '#1d3540' }}><Check size={16} strokeWidth={2.4} style={{ color: '#16a06b', flexShrink: 0, marginTop: 3 }} />{it}</div>)}
                </div>
              </RV>
            );
          }) : (
            <RV as="div" variant="up" style={{ padding: 22, borderRadius: 20, background: '#ffffff', border: '1px solid #e2e8eb', fontSize: 14.5, lineHeight: 1.65, color: '#1d3540', whiteSpace: 'pre-wrap' }}>{ad.contenu}</RV>
          )}
          {ad.competences && <RV as="div" variant="up" style={{ padding: 18, borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8eb', fontSize: 14, color: '#33474f' }}><b style={{ color: '#0a1c24' }}>{t('apply_key_points')} · </b>{ad.competences}</RV>}
        </div>

        <div style={{ flex: '1 1 360px', minWidth: 0, position: 'sticky', top: 84 }}>
          {!done ? (
            <RV as="form" variant="left" delay={120} noValidate onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13, padding: 22, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 30px 60px -40px rgba(10,28,36,.45)' }}>
              <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '-.02em' }}>{t('apply_title')}</div>
              <div style={{ fontSize: 13, color: '#52646d', marginTop: -6 }}>{t('apply_sub')}</div>
              {fields.map(x => (
                <label key={x.k} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>{x.label}
                  <input type={x.type} value={f[x.k]} onChange={e => setF(p => ({ ...p, [x.k]: e.target.value }))} placeholder={x.ph} style={inputStyle(touched && !!x.required && !x.valid!(f[x.k]))} className="ptl-f1" />
                </label>
              ))}
              {!cv ? (
                <button type="button" onClick={() => fileRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 14px', borderRadius: 14, border: '1.5px dashed #b9dfe5', background: '#f8fdfd', fontFamily: 'inherit', cursor: 'pointer' }} className="apl-drop">
                  <span className="wedy-float" style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }}><CloudUpload size={20} /></span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0a1c24' }}>{t('apply_cv_add')}</span>
                  <span style={{ fontSize: 12, color: '#5f7079' }}>{t('apply_cv_formats')}</span>
                </button>
              ) : (
                <RV as="div" variant="up" style={{ padding: 12, borderRadius: 14, border: '1px solid #e2e8eb', background: '#fbfcfc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbe9e6', color: '#df5740' }}><FileText size={17} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cv.name}</span><span style={{ display: 'block', fontSize: 12, color: '#5f7079' }}>{Math.round(cv.size / 1024)} Ko</span></span>
                    <button type="button" aria-label={t('delete')} onClick={() => setCv(null)} style={{ width: 30, height: 30, border: 'none', borderRadius: 8, background: 'transparent', color: '#7d8f97', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
                  </div>
                  {parsing && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, color: '#5444b8' }}><span className="wedy-spin" style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid #dcd6f6', borderTopColor: '#6d5ad6' }} />{t('apply_cv_reading')}</div>}
                  {!parsing && cv.skills.length > 0 && (
                    <RV as="div" variant="up" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #eef2f4' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#5444b8' }}>{t('apply_cv_skills')}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>{cv.skills.map(s => <span key={s} style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: '#ece9fb', color: '#5444b8' }}>{s}</span>)}</div>
                    </RV>
                  )}
                </RV>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" style={{ display: 'none' }} onChange={e => onFile(e.target.files?.[0])} />
              {freeSlots.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}><CalendarClock size={14} />{t('apply_slot')}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {freeSlots.map(s => {
                      const on = slotId === s.id;
                      const d = new Date(`${s.date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                      return <button key={s.id} type="button" onClick={() => setSlotId(on ? '' : s.id)} style={{ height: 32, padding: '0 10px', borderRadius: 9, border: `1px solid ${on ? '#0a1c24' : '#d6dfe3'}`, background: on ? '#0a1c24' : '#ffffff', color: on ? '#ffffff' : '#33474f', fontFamily: "'Geist Mono',monospace", fontSize: 11.5, fontWeight: 500, cursor: 'pointer' }}>{d} {s.start_time.slice(0, 5)}</button>;
                    })}
                  </div>
                </div>
              )}
              <textarea value={motivation} onChange={e => setMotivation(e.target.value)} rows={3} placeholder={t('apply_motivation_ph')} style={{ resize: 'vertical', padding: '10px 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 14, color: '#0a1c24', outline: 'none' }} className="ptl-f1" />
              <button type="button" onClick={() => setConsent(c => !c)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 0, border: 'none', background: 'transparent', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer' }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${touched && !consent ? '#df5740' : consent ? '#0e6f84' : '#c3ced3'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, color: '#ffffff', background: consent ? '#0e6f84' : '#ffffff' }}>{consent && <Check size={13} strokeWidth={3} />}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: '#52646d' }}>{t('apply_consent')}</span>
              </button>
              {err && <RV as="div" variant="up" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: '#fbe9e6', color: '#a33a28', fontSize: 13 }}><CircleAlert size={15} />{err}</RV>}
              <button type="submit" disabled={sending || closed} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, border: 'none', borderRadius: 14, background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: closed ? 'default' : 'pointer', opacity: closed ? 0.6 : 1, boxShadow: '0 16px 32px -14px rgba(22,182,200,.85)' }}>
                <span className="wedy-shine" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} />
                {sending ? <Spinner size={16} color="#fff" /> : null}<span style={{ position: 'relative' }}>{t(closed ? 'apply_closed' : 'apply_send')}</span>{!sending && !closed && <ArrowRight size={16} className="wy-flip" style={{ position: 'relative' }} />}
              </button>
            </RV>
          ) : (
            <RV as="div" variant="scale" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '26px 22px', borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 30px 60px -40px rgba(10,28,36,.45)' }}>
              <span style={{ position: 'relative', width: 64, height: 64, alignSelf: 'center' }}>
                <span className="wedy-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(22,160,107,.3)' }} />
                <span style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#16a06b', color: '#ffffff' }}><Check size={28} strokeWidth={2.6} /></span>
              </span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '-.02em' }}>{tf(t('apply_thanks'), { name: done.first })}</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: '#52646d', marginTop: 6 }}>{t('apply_thanks_sub')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
                {steps.map(([label, ok], i) => (
                  <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok ? '#16a06b' : '#eef2f4', color: ok ? '#ffffff' : '#5f7079', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{ok ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                      {i < steps.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 16, background: '#eef2f4' }} />}
                    </span>
                    <span style={{ fontSize: 13.5, color: ok ? '#0a1c24' : '#52646d', fontWeight: ok ? 600 : 400, paddingBottom: 12 }}>{label}</span>
                  </div>
                ))}
              </div>
            </RV>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, fontSize: 12, color: '#7d8f97' }}><img src="/wedy-avatar.png" alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />{t('apply_powered')}</div>
        </div>
      </div>
    </div>
  );
}
