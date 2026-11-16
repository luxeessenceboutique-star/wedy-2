// Intégrations › « Réseaux sociaux et e-mails »: the company's LinkedIn page and Facebook page (+ Instagram) connected
// once by an admin, so job posts are published in one click; and the e-mails sent to candidates (invitation, link
// 15 minutes before the interview). Tokens never reach the browser: only the page names are shown.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircleAlert, CircleCheck, Mail, Plug, RefreshCw, Send, Settings2, Unplug } from 'lucide-react';
import {
  chooseSocialAccount, connectSocial, disconnectSocial, getApiError, getMailStatus, getSocialStatus, removeMailAccount, sendTestMail,
  type SocialAccount, type SocialProvider,
} from '@/services/api';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { useAppSettings } from '@/lib/appSettings';
import { MailSetupModal } from './MailSetupModal';
import './ConnectorsSection.css';

const PROVIDERS: { id: SocialProvider; name: TKey; desc: TKey; mono: string; color: string; env: string }[] = [
  { id: 'linkedin', name: 'soc_linkedin', desc: 'soc_linkedin_desc', mono: 'in', color: '#0a66c2', env: 'LINKEDIN_CLIENT_ID · LINKEDIN_CLIENT_SECRET' },
  { id: 'meta', name: 'soc_meta', desc: 'soc_meta_desc', mono: 'f', color: '#1877f2', env: 'META_APP_ID · META_APP_SECRET' },
];

export function ConnectorsSection() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const socialQ = useQuery({ queryKey: ['social-status'], queryFn: getSocialStatus, retry: false });
  const mailQ = useQuery({ queryKey: ['mail-status'], queryFn: getMailStatus, retry: false });
  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  // back from LinkedIn / Facebook: say how it went, then clean the address
  const back = params.get('social');
  useEffect(() => {
    if (!back) return;
    const ok = params.get('status') === 'ok';
    const name = back === 'linkedin' ? 'LinkedIn' : 'Facebook / Instagram';
    if (ok) notify.success(tf(t('soc_connected_toast'), { name }));
    else notify.error(`${tf(t('soc_failed_toast'), { name })} ${params.get('msg') ?? ''}`.trim());
    qc.invalidateQueries({ queryKey: ['social-status'] });
    navigate('/app/integrations', { replace: true });
  }, [back]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async (p: SocialProvider) => {
    setBusy(p);
    try { window.location.assign(await connectSocial(p)); } catch (e) { notify.error(getApiError(e, t('error'))); setBusy(null); }
  };
  const disconnect = useMutation({
    mutationFn: (p: SocialProvider) => disconnectSocial(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-status'] }); notify.success(t('soc_disconnected')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const choose = useMutation({
    mutationFn: ({ p, id }: { p: SocialProvider; id: string }) => chooseSocialAccount(p, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-status'] }),
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  // « Configurer l'envoi » — also opened from the interview planning (?mail=setup)
  const [mailSetup, setMailSetupState] = useState(() => params.get('mail') === 'setup');
  const setMailSetup = (open: boolean) => {
    setMailSetupState(open);
    if (!open && params.get('mail')) navigate('/app/integrations', { replace: true });
  };
  const removeMail = useMutation({
    mutationFn: removeMailAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mail-status'] }); notify.success(t('mail_removed')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const { data: appSettings } = useAppSettings();
  const testMail = useMutation({
    mutationFn: sendTestMail,
    onSuccess: r => notify.success(tf(t('soc_mail_test_ok'), { to: r.to })),
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  const card = (p: (typeof PROVIDERS)[number], a?: SocialAccount) => {
    const on = !!a?.connected;
    return (
      <div key={p.id} className={`cx-card${on ? ' on' : ''}`}>
        <div className="cx-head">
          <span className="cx-mono" style={{ background: p.color }}>{p.mono}</span>
          <div className="cx-title"><b>{t(p.name)}</b><small>{t(p.desc)}</small></div>
          <span className={`cx-state ${on ? 'ok' : a?.configured === false ? 'off' : ''}`}>
            {on ? <><CircleCheck size={13} />{t('soc_state_on')}</> : a?.expired ? t('soc_state_expired') : a?.configured === false ? t('soc_state_server') : t('soc_state_off')}
          </span>
        </div>
        {socialQ.isLoading ? <div className="cx-body"><Spinner size={14} /></div> : on && a ? (
          <div className="cx-body">
            <div className="cx-line"><span>{t(p.id === 'linkedin' ? 'soc_page_li' : 'soc_page_fb')}</span>
              {a.choices.length > 1
                ? <select value={a.account_id ?? ''} onChange={e => choose.mutate({ p: p.id, id: e.target.value })} disabled={choose.isPending}>
                    {a.choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                : <b>{a.account_name}</b>}
            </div>
            {p.id === 'meta' && <div className="cx-line"><span>Instagram</span>{a.ig_username ? <b>@{a.ig_username}</b> : <em>{t('soc_no_ig')}</em>}</div>}
            {a.connected_by && <div className="cx-meta">{tf(t('soc_connected_by'), { name: a.connected_by, d: fmt(a.connected_at) })}</div>}
            <div className="cx-btns">
              <button type="button" className="cx-btn" onClick={() => void connect(p.id)} disabled={busy === p.id}>{busy === p.id ? <Spinner size={13} /> : <RefreshCw size={13} />}{t('soc_reconnect')}</button>
              <button type="button" className="cx-btn danger" onClick={() => { if (window.confirm(t('soc_disconnect_confirm'))) disconnect.mutate(p.id); }}><Unplug size={13} />{t('soc_disconnect')}</button>
            </div>
          </div>
        ) : a?.configured === false ? (
          <div className="cx-body"><p className="cx-note"><CircleAlert size={14} />{t('soc_server_note')}</p><code className="cx-env">{p.env}</code></div>
        ) : (
          <div className="cx-body">
            <p className="cx-hint">{t(p.id === 'linkedin' ? 'soc_hint_li' : 'soc_hint_fb')}</p>
            <button type="button" className="cx-btn primary" style={{ background: p.color }} onClick={() => void connect(p.id)} disabled={busy === p.id || socialQ.isError}>
              {busy === p.id ? <Spinner size={13} color="#fff" /> : <Plug size={13} />}{t(p.id === 'linkedin' ? 'soc_connect_li' : 'soc_connect_fb')}
            </button>
          </div>
        )}
      </div>
    );
  };

  const mail = mailQ.data;
  return (
    <section className="cx">
      <div className="cx-h"><b>{t('soc_section')}</b><small>{t('soc_section_s')}</small></div>
      {socialQ.isError && <p className="cx-note"><CircleAlert size={14} />{getApiError(socialQ.error, t('error'))}</p>}
      <div className="cx-grid">
        {PROVIDERS.map(p => card(p, socialQ.data?.[p.id]))}
        <div className={`cx-card${mail?.configured ? ' on' : ''}`}>
          <div className="cx-head">
            <span className="cx-mono" style={{ background: '#0e6f84' }}><Mail size={16} /></span>
            <div className="cx-title"><b>{t('soc_mail')}</b><small>{t('soc_mail_desc')}</small></div>
            <span className={`cx-state ${mail?.configured ? 'ok' : 'off'}`}>{mail?.configured ? <><CircleCheck size={13} />{t('soc_state_on')}</> : t('mail_state_todo')}</span>
          </div>
          <div className="cx-body">
            {mailQ.isLoading ? <Spinner size={14} /> : mail?.configured ? <>
              <div className="cx-line"><span>{t('soc_mail_from')}</span><b>{mail.from}</b></div>
              <div className="cx-meta">
                {mail.source === 'platform' && mail.account?.updated_by_name ? tf(t('mail_set_by'), { name: mail.account.updated_by_name, d: fmt(mail.account.updated_at) }) : mail.source === 'env' ? t('mail_set_server') : null}
                {' '}{tf(t('soc_mail_flow'), { n: mail.reminder_minutes })}
              </div>
              <div className="cx-btns">
                <button type="button" className="cx-btn" onClick={() => testMail.mutate()} disabled={testMail.isPending}>{testMail.isPending ? <Spinner size={13} /> : <Send size={13} />}{t('soc_mail_test')}</button>
                <button type="button" className="cx-btn" onClick={() => setMailSetup(true)}><Settings2 size={13} />{t('mail_edit')}</button>
                {mail.source === 'platform' && <button type="button" className="cx-btn danger" onClick={() => { if (window.confirm(t('mail_remove_confirm'))) removeMail.mutate(); }}><Unplug size={13} />{t('mail_remove')}</button>}
              </div>
            </> : <>
              <p className="cx-hint">{t('mail_todo_note')}</p>
              <button type="button" className="cx-btn primary" style={{ background: '#0e6f84' }} onClick={() => setMailSetup(true)}><Settings2 size={13} />{t('mail_setup_btn')}</button>
            </>}
          </div>
        </div>
      </div>
      {mailSetup && <MailSetupModal status={mail} companyName={appSettings?.company?.name ?? ''} onClose={() => setMailSetup(false)} />}
    </section>
  );
}
