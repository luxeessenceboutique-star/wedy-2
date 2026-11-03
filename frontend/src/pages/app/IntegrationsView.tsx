// Generated from design_handoff_wedy/design/Wedy Integrations.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// only integrations that work are listed (iCal feed, Slack / Teams incoming webhooks, JSON webhooks).
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment } from 'react';
import { Check, Trash2, Webhook } from 'lucide-react';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import type { IntegrationsVals } from './IntegrationsPage';
import './IntegrationsView.css';

export function IntegrationsView({ v }: { v: IntegrationsVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%' }}>
        <div>
          <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('int_integrations')}</RV>
          <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('int_connectez_wedy_aux_outils_que')}</RV>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '12px' }}>
          <RV as='div' variant='up' delay={60} style={{ padding: '16px 18px', borderRadius: '18px', background: 'linear-gradient(135deg,#0b5f72,#0e7f96)', color: '#ffffff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', opacity: '.9' }}>{t('int_connectees')}</div>
            <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px' }}>
              {v.nOn}
              <span style={{ fontSize: '17px', opacity: '.75' }}>{`/ ${v.nAll}`}</span>
            </div>
          </RV>
          <RV as='div' variant='up' delay={110} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('int_webhooks_actifs')}</div>
            <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px' }}>{v.nHooks}</div>
          </RV>
          <RV as='div' variant='up' delay={160} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('int_k_last')}</div>
            <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '22px', fontWeight: '800', letterSpacing: '-.03em', marginTop: '10px', color: v.kLastColor }}>{v.kLast}</div>
          </RV>
          <RV as='div' variant='up' delay={210} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('int_k_ical')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ position: 'relative', display: 'inline-flex', width: '10px', height: '10px' }}>
                {v.icalOn && <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', background: '#16a06b' }} className="wedy-ping" />}
                <span style={{ position: 'relative', width: '10px', height: '10px', borderRadius: '50%', background: v.icalOn ? '#16a06b' : '#c3ced3' }} />
              </span>
              <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em' }}>{v.kIcal}</span>
            </div>
          </RV>
        </div>
        <RV as='div' variant='up' delay={120} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {v.cats.map((c, cIndex) => (
            <Fragment key={cIndex}>
              <button type="button" onClick={c.go} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 13px', borderRadius: '99px', border: `1px solid ${c.border}`, background: c.bg, color: c.color, fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><c.icon size={14} style={{ display: 'block' }} /></span>
                {c.label}
              </button>
            </Fragment>
          ))}
        </RV>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: '14px' }}>
          {v.apps.map(a => (
            <Fragment key={a.id}>
              <RV as='div' variant='up' delay={Number(a.delay)} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px', padding: '18px', borderRadius: '18px', background: '#ffffff', border: `1px solid ${a.border}`, boxShadow: a.shadow, transition: 'border-color .3s,box-shadow .3s,transform .2s' }} className="int-h1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ position: 'relative', width: '46px', height: '46px', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.color, color: '#ffffff', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '800', fontSize: '15px', flexShrink: '0', boxShadow: `0 10px 20px -10px ${a.color}` }}>
                    {a.mono}
                    {a.on ? (
                      <>
                      <span style={{ position: 'absolute', insetInlineEnd: '-4px', bottom: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#16a06b', border: '2.5px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ display: 'inline-flex', width: '10px', height: '10px' }}><Check size={10} strokeWidth={3.4} style={{ display: 'block' }} /></span>
                      </span>
                      </>
                    ) : null}
                  </span>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700' }}>{a.name}</div>
                    <div style={{ fontSize: '12px', color: '#5f7079' }}>{a.catLabel}</div>
                  </div>
                  <button type="button" onClick={a.toggle} aria-label={a.aria} disabled={a.busy} style={{ position: 'relative', width: '44px', height: '26px', border: 'none', borderRadius: '99px', background: a.track, cursor: 'pointer', padding: '0', flexShrink: '0', transition: 'background .25s' }}>
                    <span style={{ position: 'absolute', top: '3px', insetInlineStart: a.knob, width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(10,28,36,.3)', transition: 'left .25s cubic-bezier(.2,.8,.2,1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {a.busy ? (
                        <>
                        <span style={{ width: '11px', height: '11px', borderRadius: '50%', border: '2px solid #d6dfe3', borderTopColor: '#16b6c8' }} className="wedy-spin" />
                        </>
                      ) : null}
                    </span>
                  </button>
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#52646d' }}>{a.desc}</div>
                {a.extra}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f0f3f4', fontSize: '12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: a.stColor }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: a.stDot }} />
                    {a.status}
                  </span>
                  <span style={{ marginInlineStart: 'auto', color: '#7d8f97' }}>{a.sync}</span>
                </div>
              </RV>
            </Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <RV as='div' variant='up' style={{ flex: '1 1 340px', minWidth: '0', padding: '20px', borderRadius: '20px', background: '#06141a', color: '#e8eff1' }}>
            {v.devCard}
          </RV>
          <RV as='div' variant='up' delay={80} style={{ flex: '1.4 1 420px', minWidth: '0', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px' }}>
              <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#b06b0c' }}><Webhook size={18} style={{ display: 'block' }} /></span>
              <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('int_webhooks')}</span>
            </div>
            {v.hooksNote}
            {v.hooks.map(h => (
              <Fragment key={h.id}>
                <RV as='div' variant='up' style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderTop: '1px solid #eef2f4', flexWrap: 'wrap' }}>
                  <code style={{ flex: '1 1 220px', minWidth: '0', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.url}</code>
                  <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11.5px', fontWeight: '600', padding: '3px 8px', borderRadius: '7px', background: '#fbefda', color: '#7a4706' }}>{h.evt}</span>
                  {h.kind && <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '99px', background: '#ece9fb', color: '#5444b8' }}>{h.kind}</span>}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: h.color, fontWeight: '600' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: h.dot }} />
                    {h.last}
                  </span>
                  <button type="button" onClick={h.test} disabled={h.testing} style={{ height: '30px', padding: '0 10px', borderRadius: '8px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{h.testing ? <Spinner size={12} /> : t('int_test')}</button>
                  <button type="button" onClick={h.remove} aria-label={t('int_supprimer')} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '8px', background: 'transparent', color: '#7d8f97', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="int-h2">
                    <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Trash2 size={15} style={{ display: 'block' }} /></span>
                  </button>
                </RV>
              </Fragment>
            ))}
            <form onSubmit={v.addHook} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '14px 20px', borderTop: '1px solid #eef2f4', background: '#f8fafb' }}>
              <input value={v.hookUrl} onChange={v.onHookUrl} placeholder={t('int_https_votre_app_ma_webhooks_wedy')} style={{ flex: '1 1 220px', minWidth: '0', height: '40px', padding: '0 12px', borderRadius: '10px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', color: '#0a1c24', outline: 'none' }} className="int-f3" />
              <select value={v.hookEvt} onChange={v.onHookEvt} style={{ height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#33474f', outline: 'none' }}>
                <option value="leave.approved">{t('int_leave_approved')}</option>
                <option value="employee.created">{t('int_employee_created')}</option>
                <option value="document.generated">{t('int_document_generated')}</option>
                <option value="candidate.hired">{t('int_candidate_hired')}</option>
              </select>
              <button type="submit" style={{ height: '40px', padding: '0 14px', border: 'none', borderRadius: '10px', background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{t('int_ajouter')}</button>
            </form>
          </RV>
        </div>
      </div>
      {v.drawer}
    </>
  );
}
