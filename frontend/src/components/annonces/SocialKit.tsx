// « Diffuser l'annonce »: the recruitment visual of a job post (square, LinkedIn, story — 3 styles), the post text for
// each network written by Wedy, and the ways to publish: LinkedIn and Facebook share dialogs (their link preview shows
// the visual), Instagram (download + caption, or the phone's share sheet), Indeed (job description to paste), WhatsApp.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Download, ExternalLink, Image as ImageIcon, Link2, Megaphone, RefreshCw, Share2, Sparkles } from 'lucide-react';
import { adShareUrl, getApiError, getSocialPosts, uploadAdVisual, type JobAd, type SocialPosts } from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { useAppSettings } from '@/lib/appSettings';
import { FORMATS, canvasBlob, pointsFrom, renderJobVisual, type VisualFormat, type VisualTheme } from '@/lib/jobVisual';

type Net = 'linkedin' | 'facebook' | 'instagram' | 'indeed';
const LABELS: Record<'fr' | 'en' | 'ar', { hiring: string; apply: string; scan: string }> = {
  fr: { hiring: 'Nous recrutons', apply: 'Postulez en 2 minutes', scan: 'Scannez le code ou ouvrez le lien' },
  en: { hiring: "We're hiring", apply: 'Apply in 2 minutes', scan: 'Scan the code or open the link' },
  ar: { hiring: 'نوظف', apply: 'قدّم ترشيحك في دقيقتين', scan: 'امسح الرمز أو افتح الرابط' },
};
const FORMAT_KEYS: [VisualFormat, TKey, TKey][] = [['square', 'sk_f_square', 'sk_f_square_s'], ['linkedin', 'sk_f_linkedin', 'sk_f_linkedin_s'], ['story', 'sk_f_story', 'sk_f_story_s']];
const THEMES: [VisualTheme, string][] = [['ocean', 'linear-gradient(135deg,#06141a,#0b4a58,#16b6c8)'], ['light', 'linear-gradient(135deg,#f3f6f7,#d7eef1)'], ['night', 'linear-gradient(135deg,#0a0f1f,#3b2f8f)']];
const NETS: [Net, string, string][] = [['linkedin', 'LinkedIn', '#0a66c2'], ['facebook', 'Facebook', '#1877f2'], ['instagram', 'Instagram', '#d62976'], ['indeed', 'Indeed', '#2557a7']];

const lab: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' };
const inp: CSSProperties = { height: 40, padding: '0 11px', borderRadius: 10, border: '1px solid #d6dfe3', background: '#fff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none', boxSizing: 'border-box', width: '100%' };
const btn: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 38, padding: '0 13px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#fff', color: '#0a1c24', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
const kicker: CSSProperties = { fontFamily: "'Geist Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5f7079' };

export function SocialKit({ ad, open, onClose, lang: initialLang = 'fr', fresh }: { ad: JobAd | null; open: boolean; onClose: () => void; lang?: 'fr' | 'en' | 'ar'; fresh?: boolean }) {
  const { t } = useLang();
  const notify = useNotify();
  const settingsQ = useAppSettings();
  const company = settingsQ.data?.company?.name || '';
  const logo = settingsQ.data?.assets?.logo || null;
  const [fmt, setFmt] = useState<VisualFormat>('square');
  const [theme, setTheme] = useState<VisualTheme>('ocean');
  const [vlang, setVlang] = useState<'fr' | 'en' | 'ar'>(initialLang);
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState('');
  const [net, setNet] = useState<Net>('linkedin');
  const [texts, setTexts] = useState<Partial<Record<Net, string>>>({});
  const [key, setKey] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // reset when another ad is opened
  if (ad && open && key !== ad.id) {
    setKey(ad.id); setTitle(ad.poste); setPoints(pointsFrom(ad).join('\n')); setTexts({}); setSaved('idle'); setVlang(initialLang);
  }
  const share = ad ? adShareUrl(ad.id) : '';
  const [contract, city] = (ad?.description || '').split('·').map(s => s.trim());
  const data = useMemo(() => ({
    title: title.trim() || ad?.poste || '', contract, city, points: points.split('\n').map(s => s.trim()).filter(Boolean),
    company, logo, url: share, lang: vlang, labels: LABELS[vlang],
  }), [title, points, contract, city, company, logo, share, vlang, ad?.poste]);

  // preview
  useEffect(() => {
    if (!open || !ad || !canvasRef.current) return;
    renderJobVisual(canvasRef.current, fmt, theme, data).catch(() => {});
  }, [open, ad, fmt, theme, data]);

  // the LinkedIn-size visual is the link preview of the share link: keep the stored one in step (debounced)
  useEffect(() => {
    if (!open || !ad) return;
    const h = window.setTimeout(async () => {
      setSaved('saving');
      try {
        const c = document.createElement('canvas');
        await renderJobVisual(c, 'linkedin', theme, data);
        const b = await canvasBlob(c);
        if (b) await uploadAdVisual(ad.id, 'linkedin', b);
        setSaved('saved');
      } catch { setSaved('error'); }
    }, 1200);
    return () => window.clearTimeout(h);
  }, [open, ad, theme, data]);

  const socialQ = useQuery<SocialPosts>({
    queryKey: ['ad-social', ad?.id, vlang, company],
    queryFn: () => getSocialPosts(ad!.id, { lang: vlang, company, share_url: share }),
    enabled: open && !!ad, staleTime: Infinity, retry: false,
  });
  const textOf = (n: Net) => texts[n] ?? socialQ.data?.[n] ?? '';

  const fileName = (f: VisualFormat) => `${(ad?.poste || 'annonce').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/gi, '-').replace(/^-|-$/g, '')}-${f}.png`;
  const renderBlob = async (f: VisualFormat) => { const c = document.createElement('canvas'); await renderJobVisual(c, f, theme, data); return canvasBlob(c); };
  const download = async (f: VisualFormat) => {
    const b = await renderBlob(f);
    if (!b) return;
    const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = fileName(f); a.click();
    window.setTimeout(() => URL.revokeObjectURL(u), 2000);
  };
  const copy = async (text: string, msg: TKey = 'sk_copied') => { try { await navigator.clipboard.writeText(text); notify.success(t(msg)); } catch { window.prompt(t('sk_copy'), text); } };
  const openWin = (url: string) => window.open(url, '_blank', 'noopener,width=720,height=720');

  const publish = async (n: Net) => {
    const text = textOf(n);
    if (n === 'linkedin') { await copy(text, 'sk_copied_paste'); openWin(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(share)}`); return; }
    if (n === 'facebook') { await copy(text, 'sk_copied_paste'); openWin(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share)}`); return; }
    if (n === 'instagram') {
      const b = await renderBlob(fmt === 'linkedin' ? 'square' : fmt);
      const file = b ? new File([b], fileName(fmt === 'linkedin' ? 'square' : fmt), { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], text }); return; } catch { /* cancelled: fall back to download */ }
      }
      await copy(text, 'sk_copied_ig'); if (b) await download(fmt === 'linkedin' ? 'square' : fmt);
      return;
    }
    await copy(text, 'sk_copied_indeed'); openWin('https://employers.indeed.com/');
  };
  const whatsapp = () => openWin(`https://wa.me/?text=${encodeURIComponent(`${t('sk_wa_text')} ${ad?.poste ?? ''}\n${share}`)}`);

  const [w, h] = FORMATS[fmt];
  const netHint: Record<Net, TKey> = { linkedin: 'sk_h_linkedin', facebook: 'sk_h_facebook', instagram: 'sk_h_instagram', indeed: 'sk_h_indeed' };
  const netBtn: Record<Net, TKey> = { linkedin: 'sk_b_linkedin', facebook: 'sk_b_facebook', instagram: 'sk_b_instagram', indeed: 'sk_b_indeed' };

  return (
    <Drawer open={open && !!ad} onClose={onClose} width={1040} icon={<Megaphone size={19} />} title={t(fresh ? 'sk_title_fresh' : 'sk_title')} subtitle={ad ? `${ad.poste}${ad.description ? ` · ${ad.description}` : ''}` : ''}>
      {ad && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20, alignItems: 'start' }}>
          {/* ── visual ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={kicker}><ImageIcon size={12} style={{ verticalAlign: '-2px' }} /> {t('sk_visual')}</span>
              <span style={{ fontSize: 11.5, color: saved === 'error' ? '#a33a28' : '#7d8f97' }}>{saved === 'saving' ? t('sk_saving') : saved === 'saved' ? t('sk_saved') : saved === 'error' ? t('sk_save_error') : ''}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: '#f3f6f7', flexWrap: 'wrap' }}>
              {FORMAT_KEYS.map(([f, key, sub]) => (
                <button key={f} type="button" onClick={() => setFmt(f)} style={{ flex: '1 1 90px', padding: '7px 8px', border: 'none', borderRadius: 9, background: fmt === f ? '#fff' : 'transparent', boxShadow: fmt === f ? '0 1px 3px rgba(10,28,36,.14)' : 'none', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center' }}>
                  <b style={{ display: 'block', fontSize: 12.5, color: '#0a1c24' }}>{t(key)}</b><small style={{ fontSize: 11, color: '#7d8f97' }}>{t(sub)}</small>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: 14, borderRadius: 16, background: '#eaf0f2', border: '1px solid #e2e8eb' }}>
              <canvas ref={canvasRef} width={w} height={h} style={{ width: '100%', maxWidth: fmt === 'story' ? 260 : fmt === 'square' ? 420 : 480, height: 'auto', borderRadius: 10, boxShadow: '0 18px 40px -22px rgba(10,28,36,.6)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>{t('sk_style')}</span>
              {THEMES.map(([th, bg]) => <button key={th} type="button" aria-label={th} onClick={() => setTheme(th)} style={{ width: 30, height: 30, borderRadius: 9, border: theme === th ? '2px solid #0a1c24' : '1px solid #d6dfe3', background: bg, cursor: 'pointer' }} />)}
              <span style={{ marginInlineStart: 'auto', fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>{t('sk_lang')}</span>
              {(['fr', 'en', 'ar'] as const).map(l => <button key={l} type="button" onClick={() => setVlang(l)} style={{ height: 28, padding: '0 9px', borderRadius: 8, border: `1px solid ${vlang === l ? '#0a1c24' : '#d6dfe3'}`, background: vlang === l ? '#0a1c24' : '#fff', color: vlang === l ? '#fff' : '#33474f', fontFamily: "'Geist Mono',monospace", fontSize: 11.5, cursor: 'pointer' }}>{l.toUpperCase()}</button>)}
            </div>
            <label style={lab}>{t('sk_headline')}<input value={title} onChange={e => setTitle(e.target.value)} style={inp} /></label>
            <label style={lab}>{t('sk_points')}<textarea rows={4} value={points} onChange={e => setPoints(e.target.value)} placeholder={t('sk_points_ph')} style={{ ...inp, height: 'auto', padding: '9px 11px', resize: 'vertical', lineHeight: 1.5 }} /></label>
            {!logo && <p style={{ margin: 0, fontSize: 12, color: '#8a5207', background: '#fbefda', padding: '8px 10px', borderRadius: 9 }}>{t('sk_no_logo')}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" style={{ ...btn, background: '#0a1c24', color: '#fff', border: 'none' }} onClick={() => download(fmt)}><Download size={15} />{t('sk_download')}</button>
              <button type="button" style={btn} onClick={async () => { for (const f of ['square', 'linkedin', 'story'] as const) await download(f); }}><Download size={15} />{t('sk_download_all')}</button>
            </div>
          </div>

          {/* ── publish ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={kicker}><Share2 size={12} style={{ verticalAlign: '-2px' }} /> {t('sk_publish')}</span>
            <div style={{ padding: 12, borderRadius: 14, background: '#f2f9fa', border: '1px solid #d7ecef' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0a1c24', display: 'flex', alignItems: 'center', gap: 6 }}><Link2 size={14} color="#0e6f84" />{t('sk_share_link')}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input readOnly value={share} onFocus={e => e.target.select()} style={{ ...inp, height: 36, fontFamily: "'Geist Mono',monospace", fontSize: 11.5 }} />
                <button type="button" style={{ ...btn, height: 36 }} onClick={() => copy(share)}><Copy size={14} />{t('sk_copy')}</button>
              </div>
              <div style={{ fontSize: 11.5, color: '#5f7079', marginTop: 6 }}>{t('sk_share_link_s')}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: '#f3f6f7' }}>
              {NETS.map(([n, label, color]) => (
                <button key={n} type="button" onClick={() => setNet(n)} style={{ flex: 1, height: 34, border: 'none', borderRadius: 9, background: net === n ? '#fff' : 'transparent', boxShadow: net === n ? '0 1px 3px rgba(10,28,36,.14)' : 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: net === n ? color : '#52646d', cursor: 'pointer' }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#5f7079', flex: 1 }}>{t(netHint[net])}</span>
              {socialQ.data && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 7, background: socialQ.data.source === 'ai' ? '#ece9fb' : '#eef2f4', color: socialQ.data.source === 'ai' ? '#5444b8' : '#33474f' }}>{socialQ.data.source === 'ai' ? <><Sparkles size={11} />{t('sk_by_wedy')}</> : t('sk_standard')}</span>}
              <button type="button" aria-label={t('sk_rewrite')} title={t('sk_rewrite')} onClick={() => { setTexts({}); socialQ.refetch(); }} style={{ ...btn, height: 30, padding: '0 8px' }} disabled={socialQ.isFetching}><RefreshCw size={13} /></button>
            </div>
            {socialQ.isLoading ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 30, justifyContent: 'center', color: '#5f7079', fontSize: 13 }}><Spinner size={16} />{t('sk_writing')}</div>
              : socialQ.isError ? <p style={{ fontSize: 13, color: '#a33a28' }}>{getApiError(socialQ.error, t('error'))}</p>
                : <textarea dir={vlang === 'ar' ? 'rtl' : 'ltr'} rows={net === 'indeed' ? 14 : 11} value={textOf(net)} onChange={e => setTexts(x => ({ ...x, [net]: e.target.value }))} style={{ ...inp, height: 'auto', padding: '11px 12px', resize: 'vertical', lineHeight: 1.55 }} />}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" style={{ ...btn, background: NETS.find(x => x[0] === net)![2], color: '#fff', border: 'none', flex: '1 1 200px' }} onClick={() => publish(net)} disabled={!textOf(net)}><ExternalLink size={15} />{t(netBtn[net])}</button>
              <button type="button" style={btn} onClick={() => copy(textOf(net))} disabled={!textOf(net)}><Copy size={14} />{t('sk_copy_text')}</button>
            </div>
            <button type="button" style={{ ...btn, alignSelf: 'flex-start', color: '#128c4a' }} onClick={whatsapp}><Share2 size={14} />{t('sk_whatsapp')}</button>
            <p style={{ margin: 0, fontSize: 11.5, color: '#7d8f97', lineHeight: 1.5 }}><Check size={12} style={{ verticalAlign: '-2px' }} /> {t('sk_note')}</p>
          </div>
        </div>
      )}
    </Drawer>
  );
}
