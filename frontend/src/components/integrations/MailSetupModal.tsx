// Intégrations › E-mails aux candidats › « Configurer l'envoi »: the company's own mailbox sends the interview
// invitations. HR types the account here (no server change): it is tested by sending an e-mail to the signed-in
// user, and only saved when that worked. The password is encrypted on the server and never shown again.
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Eye, EyeOff, Mail, Send } from 'lucide-react';
import { getApiError, saveMailAccount, type MailAccountIn, type MailDiagnostic, type MailStatus } from '@/services/api';
import { MailDiagnosticView } from './MailDiagnostic';
import { Modal, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';

type Provider = 'google' | 'microsoft' | 'ovh' | 'zoho' | 'other';
const PROVIDERS: { id: Provider; name: string; server: string; port: number; security: MailAccountIn['security']; hint: TKey }[] = [
  { id: 'google', name: 'Google (Gmail / Workspace)', server: 'smtp.gmail.com', port: 587, security: 'starttls', hint: 'mail_hint_google' },
  { id: 'microsoft', name: 'Microsoft 365 / Outlook', server: 'smtp.office365.com', port: 587, security: 'starttls', hint: 'mail_hint_microsoft' },
  { id: 'ovh', name: 'OVH', server: 'ssl0.ovh.net', port: 465, security: 'ssl', hint: 'mail_hint_ovh' },
  { id: 'zoho', name: 'Zoho', server: 'smtp.zoho.eu', port: 465, security: 'ssl', hint: 'mail_hint_zoho' },
  { id: 'other', name: '', server: '', port: 587, security: 'starttls', hint: 'mail_hint_other' },
];
/** « Tython SARL » → « Tython RH » (the legal form is not written in the sender's name). */
const shortName = (company: string) => { const n = company.replace(/\s+(SARLAU|SARL AU|SARL|SAS|SA)\.?$/i, '').trim(); return n ? `${n} RH` : ''; };
const providerOf = (server?: string): Provider => PROVIDERS.find(p => p.server && p.server === server)?.id ?? (server ? 'other' : 'google');

export function MailSetupModal({ status, companyName, onClose }: { status?: MailStatus; companyName: string; onClose: () => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const acc = status?.account;
  const [provider, setProvider] = useState<Provider>(providerOf(acc?.server));
  const [f, setF] = useState<MailAccountIn>({
    server: acc?.server ?? 'smtp.gmail.com', port: acc?.port ?? 587, security: acc?.security ?? 'starttls',
    username: acc?.username ?? '', password: '', sender_email: acc?.from ?? '', sender_name: acc?.from_name || shortName(companyName),
  });
  const [showPw, setShowPw] = useState(false);
  const [advanced, setAdvanced] = useState(providerOf(acc?.server) === 'other');
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<MailDiagnostic | null>(null);
  const set = <K extends keyof MailAccountIn>(k: K, v: MailAccountIn[K]) => setF(x => ({ ...x, [k]: v }));
  const pick = (p: Provider) => {
    setProvider(p);
    const preset = PROVIDERS.find(x => x.id === p)!;
    if (p !== 'other') setF(x => ({ ...x, server: preset.server, port: preset.port, security: preset.security }));
    setAdvanced(p === 'other');
  };
  const save = useMutation({
    mutationFn: () => saveMailAccount({ ...f, username: f.username.trim() || f.sender_email.trim() }),
    onSuccess: r => {
      qc.setQueryData(['mail-status'], r);
      qc.invalidateQueries({ queryKey: ['mail-status'] });
      notify.success(tf(t('mail_saved'), { to: r.test_sent_to }), r.adjusted ? { description: tf(t('mail_adjusted'), { port: r.adjusted.port, mode: r.adjusted.security === 'ssl' ? 'SSL' : 'STARTTLS' }) } : undefined);
      onClose();
    },
    onError: e => {
      setError(getApiError(e, t('error')));
      setDiag((e as { response?: { data?: { detail?: { diagnostic?: MailDiagnostic } } } })?.response?.data?.detail?.diagnostic ?? null);
    },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setError(null); setDiag(null); save.mutate(); };
  const hint = PROVIDERS.find(x => x.id === provider)!.hint;
  const needPw = !acc?.has_password;

  return (
    <Modal open onClose={onClose} width={560} icon={<Mail size={17} />} title={t('mail_setup_title')} subtitle={t('mail_setup_sub')}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={save.isPending}>{t('cancel')}</button>
        <button type="submit" form="mail-setup" className="btn btn-primary" disabled={save.isPending || !f.sender_email.trim() || !f.server.trim() || (needPw && !f.password)}>
          {save.isPending ? <Spinner size={14} color="#fff" /> : <Send size={14} />} {t('mail_save_test')}
        </button>
      </>}>
      <form id="mail-setup" onSubmit={submit} className="mx-form">
        <div className="mx-providers" role="radiogroup" aria-label={t('mail_provider')}>
          {PROVIDERS.map(p => (
            <button key={p.id} type="button" role="radio" aria-checked={provider === p.id} className={provider === p.id ? 'on' : ''} onClick={() => pick(p.id)}>
              {p.id === 'other' ? t('mail_provider_other') : p.name}
            </button>
          ))}
        </div>
        <div className="mx-grid">
          <label>{t('mail_f_from')}<input type="email" required value={f.sender_email} onChange={e => set('sender_email', e.target.value)} placeholder="rh@entreprise.ma" autoComplete="off" /></label>
          <label>{t('mail_f_name')}<input value={f.sender_name} onChange={e => set('sender_name', e.target.value)} placeholder={t('mail_f_name_ph')} /></label>
          <label>{t('mail_f_user')}<input value={f.username} onChange={e => set('username', e.target.value)} placeholder={f.sender_email || t('mail_f_user_ph')} autoComplete="off" /></label>
          <label>{t('mail_f_password')}
            <span className="mx-pw">
              <input type={showPw ? 'text' : 'password'} value={f.password} onChange={e => set('password', e.target.value)} autoComplete="new-password"
                placeholder={acc?.has_password ? t('mail_f_password_keep') : ''} required={needPw} />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label={t(showPw ? 'mail_pw_hide' : 'mail_pw_show')}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </span>
          </label>
        </div>
        <p className="mx-hint">{t(hint)}</p>
        <button type="button" className="mx-adv-toggle" onClick={() => setAdvanced(v => !v)} aria-expanded={advanced}>{t('mail_advanced')} {advanced ? '▴' : '▾'}</button>
        {advanced && (
          <div className="mx-grid three">
            <label>{t('mail_f_server')}<input required value={f.server} onChange={e => { set('server', e.target.value); setProvider('other'); }} placeholder="smtp.exemple.com" /></label>
            <label>{t('mail_f_port')}<input type="number" min={1} max={65535} value={f.port} onChange={e => set('port', Number(e.target.value) || 587)} /></label>
            <label>{t('mail_f_security')}
              <select value={f.security} onChange={e => set('security', e.target.value as MailAccountIn['security'])}>
                <option value="starttls">STARTTLS</option><option value="ssl">SSL / TLS</option><option value="none">{t('mail_sec_none')}</option>
              </select>
            </label>
          </div>
        )}
        {error && <p className="mx-error" role="alert"><CircleAlert size={15} />{error}</p>}
        {diag && <MailDiagnosticView d={diag} />}
        <p className="mx-note">{t('mail_setup_note')}</p>
      </form>
    </Modal>
  );
}
