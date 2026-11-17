// « Diffuser l'annonce » › Moovwin. Moovwin (moovwin.com) has no publishing API: the offer is posted from the
// company's account there. Wedy prepares each field of Moovwin's form (title, address, category, contract,
// experience, education, description, cover image) to copy one by one, opens Moovwin, then keeps the link of the
// offer once it is online. A public XML feed of the active offers is offered too, should Moovwin import feeds.
import { useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleCheck, Copy, Download, ExternalLink, Rss } from 'lucide-react';
import { getApiError, getSocialHistory, jobsFeedUrl, markPublished, type JobAd } from '@/services/api';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { MOOVWIN_URL, educationOf, jobCategory, plainText } from '@/lib/moovwin';

type Field = 'title' | 'address' | 'category' | 'contract' | 'experience' | 'education' | 'description';
const FIELDS: [Field, TKey][] = [['title', 'mw_f_title'], ['address', 'mw_f_address'], ['category', 'mw_f_category'], ['contract', 'mw_f_contract'],
  ['experience', 'mw_f_experience'], ['education', 'mw_f_education'], ['description', 'mw_f_description']];

const box: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #d6dfe3', borderRadius: 10, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, color: '#0a1c24', background: '#fff', outline: 'none' };

export function MoovwinPanel({ ad, company, description, share, onCover }: {
  ad: JobAd; company: { name?: string; address?: string; city?: string }; description: string; share: string; onCover: () => Promise<void> | void;
}) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [contract, city] = (ad.description || '').split('·').map(s => s.trim());
  const address = [company.address, city || company.city].filter(Boolean).join(', ');
  const initial: Record<Field, string> = {
    title: ad.poste, address, category: jobCategory(ad.poste), contract: contract || '', experience: ad.experience || '',
    education: educationOf(`${ad.contenu} ${ad.competences ?? ''}`),
    description: `${plainText(description || ad.contenu)}\n\n${t('mw_apply_line')} ${share}`.trim(),
  };
  const [f, setF] = useState<Record<Field, string>>(initial);
  const [copied, setCopied] = useState<Field | 'all' | 'feed' | null>(null);
  const [link, setLink] = useState('');
  const copy = async (text: string, which: Field | 'all' | 'feed') => {
    try { await navigator.clipboard.writeText(text); } catch { window.prompt(t('sk_copy'), text); }
    setCopied(which); window.setTimeout(() => setCopied(c => (c === which ? null : c)), 1600);
  };
  const all = FIELDS.map(([k, label]) => `${t(label)} : ${f[k]}`).join('\n\n');

  const histQ = useQuery({ queryKey: ['ad-history', ad.id], queryFn: () => getSocialHistory(ad.id), retry: false });
  const done = (histQ.data ?? []).find(h => h.network === 'moovwin' && h.ok);
  const mark = useMutation({
    mutationFn: () => markPublished({ ad_id: ad.id, network: 'moovwin', url: link.trim() }),
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['ad-history', ad.id] });
      if (r.saved) notify.success(t('mw_marked')); else notify.error(t('mw_not_saved'));
      setLink('');
    },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  return (
    <div className="mw">
      {done ? (
        <div className="mw-done"><CircleCheck size={15} />
          <span>{tf(t('mw_done'), { d: new Date(done.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) })}</span>
          {done.post_url && <a href={done.post_url} target="_blank" rel="noreferrer">{t('mw_see')}<ExternalLink size={12} /></a>}
        </div>
      ) : <p className="mw-hint">{t('mw_hint')}</p>}

      <div className="mw-fields">
        {FIELDS.map(([k, label]) => (
          <div key={k} className="mw-field">
            <div className="mw-field-h"><span>{t(label)}</span>
              <button type="button" onClick={() => void copy(f[k], k)} disabled={!f[k]} aria-label={`${t('sk_copy')} · ${t(label)}`}>
                {copied === k ? <Check size={13} /> : <Copy size={13} />}{t(copied === k ? 'mw_copied' : 'sk_copy')}
              </button>
            </div>
            {k === 'description'
              ? <textarea rows={8} value={f[k]} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} style={{ ...box, resize: 'vertical', lineHeight: 1.5 }} />
              : <input value={f[k]} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} placeholder={k === 'education' ? 'Bac+3, Bac+5…' : k === 'experience' ? '2 à 5 ans' : ''} style={{ ...box, height: 36 }} />}
            {k === 'category' && <small>{t('mw_category_s')}</small>}
          </div>
        ))}
        <div className="mw-field">
          <div className="mw-field-h"><span>{t('mw_f_cover')}</span></div>
          <button type="button" className="mw-btn" onClick={() => void onCover()}><Download size={14} />{t('mw_cover')}</button>
          <small>{t('mw_cover_s')}</small>
        </div>
      </div>

      <div className="mw-actions">
        <button type="button" className="mw-btn primary" onClick={() => window.open(MOOVWIN_URL, '_blank', 'noopener')}><ExternalLink size={15} />{t('mw_open')}</button>
        <button type="button" className="mw-btn" onClick={() => void copy(all, 'all')}>{copied === 'all' ? <Check size={14} /> : <Copy size={14} />}{t('mw_copy_all')}</button>
      </div>

      <div className="mw-mark">
        <b>{t('mw_mark_title')}</b>
        <div className="mw-mark-row">
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://moovwin.com/…" style={{ ...box, height: 36, flex: 1 }} />
          <button type="button" className="mw-btn" onClick={() => mark.mutate()} disabled={mark.isPending}>{mark.isPending ? <Spinner size={13} /> : <CircleCheck size={14} />}{t('mw_mark')}</button>
        </div>
      </div>

      <details className="mw-feed">
        <summary><Rss size={13} />{t('mw_feed_title')}</summary>
        <p>{t('mw_feed_s')}</p>
        <div className="mw-mark-row">
          <input readOnly value={jobsFeedUrl()} onFocus={e => e.target.select()} style={{ ...box, height: 34, fontFamily: "'Geist Mono',monospace", fontSize: 11.5, flex: 1 }} />
          <button type="button" className="mw-btn" onClick={() => void copy(jobsFeedUrl(), 'feed')}>{copied === 'feed' ? <Check size={14} /> : <Copy size={14} />}{t('sk_copy')}</button>
        </div>
      </details>
    </div>
  );
}

