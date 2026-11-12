// Generated from design_handoff_wedy/design/Wedy Notifications.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// notifications and preferences come from /notifications; only the in-app channel exists, so it is the only column.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment } from 'react';
import { ArrowRight, BellOff, Check, CheckCheck, CircleCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import type { NotificationsVals } from './NotificationsPage';
import './NotificationsView.css';

export function NotificationsView({ v }: { v: NotificationsVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('ntf_notifications')}</RV>
            <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{v.subtitle}</RV>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <RV as='button' variant='up' delay={100} type="button" onClick={v.clearRead} disabled={v.clearing} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', opacity: v.clearReadOp }} className="ntf-clear">
            <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}>{v.clearing ? <Spinner size={15} /> : <Trash2 size={15} style={{ display: 'block' }} />}</span>
            {t('ntf_clear_read')}
          </RV>
          <RV as='button' variant='up' delay={100} type="button" onClick={v.readAll} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', opacity: v.readAllOp }} className="ntf-h1">
            <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><CheckCheck size={15} style={{ display: 'block' }} /></span>
            {t('ntf_tout_marquer_comme_lu')}
          </RV>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: '2 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <RV as='div' variant='up' delay={120} style={{ display: 'flex', gap: '4px', padding: '5px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8eb', alignSelf: 'flex-start', flexWrap: 'wrap' }}>
              {v.tabs.map((t_, t_Index) => (
                <Fragment key={t_Index}>
                  <button type="button" onClick={t_.go} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 13px', border: 'none', borderRadius: '10px', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', color: t_.color }}>
                    {t_.on ? (
                      <>
                      <RV as='span' variant='pill' style={{ position: 'absolute', inset: '0', borderRadius: '10px', background: '#0a1c24' }} />
                      </>
                    ) : null}
                    <span style={{ position: 'relative' }}>{t_.label}</span>
                    <span style={{ position: 'relative', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', padding: '1px 6px', borderRadius: '99px', background: t_.badgeBg }}>{t_.n}</span>
                  </button>
                </Fragment>
              ))}
            </RV>
            {v.loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}><Spinner /></div>}
            {v.groups.map((g, gIndex) => (
              <Fragment key={gIndex}>
                <RV as='div' variant='up' style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 18px', background: '#f8fafb', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '14px' }}>{g.label}</div>
                  {g.items.map((n, nIndex) => (
                    <Fragment key={nIndex}>
                      <RV as='div' variant='up' delay={Number(n.delay)} onClick={n.read} style={{ position: 'relative', display: 'flex', gap: '13px', alignItems: 'flex-start', padding: '15px 18px', borderTop: '1px solid #eef2f4', background: n.bg, cursor: 'pointer', transition: 'background .3s' }} className="ntf-h2">
                        {n.unread ? (
                          <>
                          <span style={{ position: 'absolute', insetInlineStart: '0', top: '14px', bottom: '14px', width: '3px', borderRadius: v.rtl ? '3px 0 0 3px' : '0 3px 3px 0', background: '#16b6c8' }} />
                          </>
                        ) : null}
                        <span style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: n.tint, color: n.color, flexShrink: '0' }}>
                          <span style={{ display: 'inline-flex', width: '18px', height: '18px' }}><n.icon size={18} style={{ display: 'block' }} /></span>
                        </span>
                        <div style={{ flex: '1', minWidth: '0' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: n.weight, color: '#0a1c24' }}>{n.title}</span>
                            <span style={{ marginInlineStart: 'auto', fontSize: '12px', color: '#7d8f97', whiteSpace: 'nowrap' }}>{n.time}</span>
                          </div>
                          <div style={{ fontSize: '13.5px', lineHeight: '1.5', color: '#52646d', marginTop: '3px' }}>{n.body}</div>
                          {n.hasActions ? (
                            <>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                              {n.actions.map((a, aIndex) => (
                                <Fragment key={aIndex}>
                                  {a.isBtn ? (
                                    <>
                                    <button type="button" onClick={a.run} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 12px', border: 'none', borderRadius: '9px', background: 'linear-gradient(135deg,#0f6f49,#16a06b)', color: '#ffffff', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>
                                      <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}>{a.busy ? <Spinner size={13} color="#fff" /> : <Check size={13} strokeWidth={2.4} style={{ display: 'block' }} />}</span>
                                      {a.label}
                                    </button>
                                    </>
                                  ) : null}
                                  {a.isLink ? (
                                    <>
                                    <Link to={a.href} onClick={a.run} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 12px', borderRadius: '9px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#0a1c24', fontSize: '12.5px', fontWeight: '600' }} className="ntf-h3">
                                      {a.label}
                                      <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><ArrowRight size={13} className="wy-flip" style={{ display: 'block' }} /></span>
                                    </Link>
                                    </>
                                  ) : null}
                                </Fragment>
                              ))}
                            </div>
                            </>
                          ) : null}
                          {n.hasDone ? (
                            <>
                            <RV as='span' variant='pill' style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '12.5px', fontWeight: '700', color: '#0f6f49' }}>
                              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><CircleCheck size={14} style={{ display: 'block' }} /></span>
                              {n.done}
                            </RV>
                            </>
                          ) : null}
                        </div>
                        {n.unread ? (
                          <>
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#16b6c8', flexShrink: '0', marginTop: '6px', boxShadow: '0 0 0 4px rgba(22,182,200,.15)' }} />
                          </>
                        ) : null}
                        <button type="button" onClick={e => { e.stopPropagation(); n.remove(); }} aria-label={t('ntf_delete')} title={t('ntf_delete')} className="ntf-del">
                          <Trash2 size={15} style={{ display: 'block' }} />
                        </button>
                      </RV>
                    </Fragment>
                  ))}
                </RV>
              </Fragment>
            ))}
            {v.empty ? (
              <>
              <RV as='div' variant='up' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '48px 20px', borderRadius: '20px', background: '#ffffff', border: '1px dashed #d0dadf', textAlign: 'center' }}>
                <span style={{ width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b' }}>
                  <span style={{ display: 'inline-flex', width: '22px', height: '22px' }}><BellOff size={22} style={{ display: 'block' }} /></span>
                </span>
                <div style={{ fontWeight: '700', fontSize: '16px' }}>{t('ntf_tout_est_a_jour')}</div>
                <div style={{ fontSize: '14px', color: '#52646d' }}>{t('ntf_aucune_notification_dans_cette_vue')}</div>
              </RV>
              </>
            ) : null}
          </div>
          <RV as='div' variant='left' delay={160} style={{ flex: '1 1 300px', minWidth: '0', position: 'sticky', top: '90px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '18px 20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('ntf_preferences')}</div>
              <div style={{ fontSize: '12.5px', color: '#5f7079', marginTop: '2px' }}>{t('ntf_prefs_sub')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px', gap: '6px', alignItems: 'center', marginTop: '14px', fontSize: '11px', fontWeight: '700', letterSpacing: '.04em', textTransform: 'uppercase', color: '#7d8f97' }}>
                <span />
                <span style={{ textAlign: 'center' }}>{t('ntf_in_app')}</span>
              </div>
              {v.prefs.map((p, pIndex) => (
                <Fragment key={pIndex}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px', gap: '6px', alignItems: 'center', padding: '9px 0', borderTop: '1px solid #f0f3f4' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#33474f', minWidth: '0' }}>
                      <span style={{ display: 'inline-flex', width: '14px', height: '14px', color: p.color, flexShrink: '0' }}><p.icon size={14} style={{ display: 'block' }} /></span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
                    </span>
                    {p.ch.map((c, cIndex) => (
                      <Fragment key={cIndex}>
                        <button type="button" onClick={c.toggle} aria-label={c.aria} style={{ justifySelf: 'center', position: 'relative', width: '34px', height: '20px', border: 'none', borderRadius: '99px', background: c.track, cursor: 'pointer', padding: '0', transition: 'background .2s' }}>
                          <span style={{ position: 'absolute', top: '2px', insetInlineStart: c.knob, width: '16px', height: '16px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(10,28,36,.3)', transition: 'left .2s cubic-bezier(.2,.8,.2,1)' }} />
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </Fragment>
              ))}
            </div>
          </RV>
        </div>
      </div>
    </>
  );
}
