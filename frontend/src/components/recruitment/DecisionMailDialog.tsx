// The decision e-mail to a candidate, once HR has decided: « candidature retenue » (after the interviews: offer,
// hiring) or the refusal. Wedy proposes the subject and the message; HR reads them, can change the words, sees the
// real e-mail (logo, badge, signature) and sends — or doesn't. Opened from the interview room (« Terminer
// l'entretien »), the Candidats page and the recruitment pipeline.
import { useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CircleAlert, Eye, MailCheck, MailX, PencilLine, RotateCcw, Send } from 'lucide-react';
import { getApiError, previewDecisionMail, sendDecisionMail, type DecisionKind, type DecisionMailRecord } from '@/services/api';
import { Modal, Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';

export type DecisionTarget = { id: string; full_name: string; kind: DecisionKind; intern?: boolean };

const box: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #d6dfe3', borderRadius: 11, padding: '0 12px', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', background: '#fff', outline: 'none' };
const label: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };
const warn: CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 11, fontSize: 12.5, lineHeight: 1.45 };

const sentOn = (r: DecisionMailRecord) => new Date(r.sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function DecisionMailDialog({ target, onClose }: { target: DecisionTarget | null; onClose: (sent: boolean) => void }) {
  const { t } = useLang();
  const accept = target?.kind === 'accept';
  return (
    <Modal open={!!target} onClose={() => onClose(false)} width={620}
      title={t(accept ? 'dm_title_accept' : 'dm_title_reject')} subtitle={target ? tf(t('dm_sub'), { name: target.full_name }) : ''}
      icon={accept ? <MailCheck size={18} /> : <MailX size={18} />}>
      {target && <DecisionMailBody key={`${target.id}|${target.kind}|${target.intern ?? ''}`} target={target} onClose={onClose} />}
    </Modal>
  );
}

function DecisionMailBody({ target, onClose }: { target: DecisionTarget; onClose: (sent: boolean) => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const req = { kind: target.kind, ...(target.intern !== undefined ? { intern: target.intern } : {}) };
  const q = useQuery({ queryKey: ['decision-mail', target.id, target.kind, target.intern ?? null], queryFn: () => previewDecisionMail(target.id, req), retry: false, staleTime: 0 });
  const [subject, setSubject] = useState<string | null>(null);   // null: Wedy's text
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const subj = subject ?? q.data?.subject ?? '';
  const msg = message ?? q.data?.message ?? '';
  const edited = subject !== null || message !== null;

  const preview = useMutation({ mutationFn: () => previewDecisionMail(target.id, { ...req, subject: subj, message: msg }) });
  const showPreview = () => { setTab('preview'); preview.mutate(); };
  const send = useMutation({
    mutationFn: () => sendDecisionMail(target.id, { ...req, subject: subj.trim(), message: msg.trim() }),
    onSuccess: r => {
      if (!r.sent) { notify.error(r.error ?? t('error')); return; }
      notify.success(tf(t('dm_sent'), { to: r.to ?? '' }));
      qc.invalidateQueries({ queryKey: ['candidates'] }); qc.invalidateQueries({ queryKey: ['employees'] }); qc.invalidateQueries({ queryKey: ['interview-room'] });
      onClose(true);
    },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  if (q.isLoading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}><Spinner /></div>;
  if (q.isError || !q.data) return <p style={{ color: '#a33a28', fontSize: 13 }}>{getApiError(q.error, t('error'))}</p>;
  const d = q.data;
  const canSend = d.configured && !!d.to && !!subj.trim() && !!msg.trim();
  const tabBtn = (on: boolean): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 9, border: 'none', background: on ? '#ffffff' : 'transparent', boxShadow: on ? '0 1px 3px rgba(10,28,36,.12)' : 'none', color: on ? '#0a1c24' : '#5f7079', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {d.sent && (
        <div style={{ ...warn, background: '#fdf1dc', color: '#8a5207' }}><CircleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{tf(t('dm_already'), { d: sentOn(d.sent), to: d.sent.to, what: t(d.sent.kind === 'accept' ? 'dm_what_accept' : 'dm_what_reject') })}</span></div>
      )}
      {!d.configured && (
        <div style={{ ...warn, background: '#fbe9e6', color: '#a33a28' }}><CircleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t('itv_mail_off')} <Link to="/app/integrations?mail=setup" style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>{t('mail_setup_btn')}</Link></span></div>
      )}
      {!d.to && (
        <div style={{ ...warn, background: '#fbe9e6', color: '#a33a28' }}><CircleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{t('dm_no_address')}</span></div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#33474f' }}>
        <span style={{ fontWeight: 600 }}>{t('dm_to')} :</span><span>{target.full_name}{d.to ? ` <${d.to}>` : ''}</span>
        <span style={{ marginInlineStart: 'auto', padding: '3px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: target.kind === 'accept' ? '#e1f5ec' : '#eef2f4', color: target.kind === 'accept' ? '#0f6f49' : '#33474f' }}>
          {t(target.kind === 'accept' ? 'dm_badge_accept' : 'dm_badge_reject')}
        </span>
      </div>
      <div style={{ display: 'inline-flex', alignSelf: 'flex-start', gap: 2, padding: 3, borderRadius: 11, background: '#eef2f4' }} role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'edit'} style={tabBtn(tab === 'edit')} onClick={() => setTab('edit')}><PencilLine size={13} />{t('dm_tab_edit')}</button>
        <button type="button" role="tab" aria-selected={tab === 'preview'} style={tabBtn(tab === 'preview')} onClick={showPreview}><Eye size={13} />{t('dm_tab_preview')}</button>
      </div>
      {tab === 'edit' ? (
        <>
          <div><label style={label} htmlFor="dm-subject">{t('dm_subject')}</label>
            <input id="dm-subject" value={subj} onChange={e => setSubject(e.target.value)} maxLength={300} style={{ ...box, height: 40 }} /></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <label style={label} htmlFor="dm-message">{t('dm_message')}</label>
              {edited && <button type="button" onClick={() => { setSubject(null); setMessage(null); }} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#0e6f84', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><RotateCcw size={12} />{t('dm_reset')}</button>}
            </div>
            <textarea id="dm-message" value={msg} onChange={e => setMessage(e.target.value)} rows={12} maxLength={8000} style={{ ...box, padding: '10px 12px', lineHeight: 1.55, resize: 'vertical' }} />
            <small style={{ display: 'block', marginTop: 5, fontSize: 11.5, color: '#7d8f97' }}>{t('dm_message_s')}</small>
          </div>
        </>
      ) : (
        <div style={{ borderRadius: 12, border: '1px solid #e2e8eb', overflow: 'hidden', background: '#eef2f4', minHeight: 380, display: 'grid' }}>
          {preview.isPending || !preview.data
            ? <div style={{ display: 'grid', placeItems: 'center' }}>{preview.isError ? <span style={{ color: '#a33a28', fontSize: 13 }}>{getApiError(preview.error, t('error'))}</span> : <Spinner />}</div>
            : <iframe title={t('dm_tab_preview')} sandbox="" srcDoc={preview.data.html} style={{ width: '100%', height: 460, border: 0, background: '#ffffff' }} />}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
        <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>{t('dm_skip')}</button>
        <button type="button" className="btn btn-primary" onClick={() => send.mutate()} disabled={!canSend || send.isPending}>
          {send.isPending ? <Spinner size={14} color="#fff" /> : <Send size={14} />} {t('dm_send')}
        </button>
      </div>
    </div>
  );
}


/** On a candidate's file: « E-mail de refus envoyé le … » (with « Renvoyer »), or the button to send it. */
export function DecisionMailLine({ candidate, kind, intern, onOpen }: {
  candidate: { id: string; full_name: string; custom_fields?: Record<string, unknown> | null }; kind: DecisionKind; intern?: boolean; onOpen: (t: DecisionTarget) => void;
}) {
  const { t } = useLang();
  const rec = (candidate.custom_fields?.decision_mail ?? null) as DecisionMailRecord | null;
  const open = () => onOpen({ id: candidate.id, full_name: candidate.full_name, kind, intern });
  const link: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'none', color: '#0e6f84', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
  if (rec && rec.kind === kind) {
    return (
      <div className="dm-line" style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: '#33474f' }}>
        <MailCheck size={14} color="#0f6f49" />
        <span>{tf(t(kind === 'accept' ? 'dm_status_accept' : 'dm_status_reject'), { d: sentOn(rec) })}</span>
        <button type="button" onClick={open} style={{ ...link, marginInlineStart: 'auto' }}>{t('dm_resend')}</button>
      </div>
    );
  }
  return (
    <div className="dm-line" style={{ flexBasis: '100%' }}>
      <button type="button" onClick={open} style={{ ...link, height: 34, padding: '0 12px', borderRadius: 10, border: `1px solid ${kind === 'accept' ? '#b9e3cd' : '#d6dfe3'}`, background: '#ffffff', color: kind === 'accept' ? '#0f6f49' : '#33474f' }}>
        {kind === 'accept' ? <MailCheck size={14} /> : <MailX size={14} />}{t(kind === 'accept' ? 'dm_inform_accept' : 'dm_inform_reject')}
      </button>
    </div>
  );
}
