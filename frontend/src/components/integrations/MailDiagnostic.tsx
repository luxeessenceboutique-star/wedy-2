// The e-mail connection, step by step: server address, port, the server's answer, encryption, login — where it
// stops, why, and which other port / security works (with the lines for the server's environment, or a button to
// use it when the account is set in Wedy).
import { useState } from 'react';
import { Check, CircleAlert, CircleCheck, Copy, X } from 'lucide-react';
import type { MailDiagnostic as Diag } from '@/services/api';
import { useLang, type TKey } from '@/lib/lang';
import { tf } from '@/lib/format';

const STEP_LABEL: Record<string, TKey> = { dns: 'mdg_dns', tcp: 'mdg_tcp', greeting: 'mdg_greeting', tls: 'mdg_tls', login: 'mdg_login' };
const MODE: Record<string, string> = { starttls: 'STARTTLS', ssl: 'SSL', none: '—' };

export function MailDiagnosticView({ d, onUse, using }: { d: Diag; onUse?: (alt: NonNullable<Diag['alternative']>) => void; using?: boolean }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const allBlocked = d.failed === 'tcp' && d.tried.length > 0 && d.tried.every(x => x.reached !== 'tcp' && !x.ok);
  const copy = () => { void navigator.clipboard.writeText((d.env_lines ?? []).join('\n')).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }); };
  return (
    <div className="mdg">
      <div className="mdg-target">{d.server}:{d.port} · {MODE[d.security]}</div>
      <ol className="mdg-steps">
        {d.steps.map(st => (
          <li key={st.key} className={st.ok ? 'ok' : 'ko'}>
            <span className="ic">{st.ok ? <Check size={13} /> : <X size={13} />}</span>
            <span><b>{t(STEP_LABEL[st.key])}</b>{st.detail && <small>{st.detail}</small>}</span>
          </li>
        ))}
      </ol>
      {d.ok ? (
        <p className="mdg-verdict ok"><CircleCheck size={15} />{t('mdg_ok')}</p>
      ) : d.alternative ? (
        <div className="mdg-verdict fix">
          <span><CircleCheck size={15} />{tf(t('mdg_alt'), { port: d.alternative.port, mode: MODE[d.alternative.security] })}</span>
          {d.source === 'env' && d.env_lines ? <>
            <small>{t('mdg_alt_env')}</small>
            <pre>{d.env_lines.join('\n')}</pre>
            <button type="button" className="cx-btn" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{t(copied ? 'mdg_copied' : 'mdg_copy')}</button>
          </> : onUse && <button type="button" className="cx-btn primary" style={{ background: '#0e6f84' }} disabled={using} onClick={() => onUse(d.alternative!)}>{t('mdg_use')}</button>}
        </div>
      ) : (
        <p className="mdg-verdict ko"><CircleAlert size={15} />{t(allBlocked ? 'mdg_blocked' : d.failed === 'login' ? 'mdg_bad_login' : d.failed === 'dns' ? 'mdg_bad_server' : 'mdg_none')}</p>
      )}
      {d.tried.length > 0 && (
        <details className="mdg-tried">
          <summary>{t('mdg_tried')}</summary>
          <ul>{d.tried.map(x => <li key={`${x.port}-${x.security}`}>{x.port} · {MODE[x.security]} — {x.ok ? '✓' : x.detail || '✗'}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
