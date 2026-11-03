// Generated from design_handoff_wedy/design/Wedy Performance.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// the campaign, the 9-box, the indicators, the themes and the reviews come from `v` (real data).
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment, type CSSProperties } from 'react';
import { ArrowRight, BellRing, Plus, Send, Star, X } from 'lucide-react';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import type { PerformanceVals } from './PerformancePage';
import './PerformanceView.css';

export function PerformanceView({ v }: { v: PerformanceVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('prf_performance')}</RV>
            <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('prf_entretiens_annuels_matrice_des')}</RV>
          </div>
          <RV as='button' variant='up' delay={100} type="button" onClick={v.newCampaign} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
            <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Plus size={16} strokeWidth={2.2} style={{ display: 'block' }} /></span>
            {t('prf_nouvelle_campagne')}
          </RV>
        </div>
        <RV as='section' variant='up' delay={80} style={{ position: 'relative', overflow: 'hidden', borderRadius: '24px', background: '#06141a', color: '#e8eff1', padding: '24px 26px', isolation: 'isolate' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: '0', zIndex: '-1', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '-8%', top: '-80%', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.5),transparent)' }} className="wedy-drift" />
            <div style={{ position: 'absolute', right: '-6%', top: '-60%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.55),transparent)', '--dur': '27s', '--delay': '-9s' } as CSSProperties} className="wedy-drift" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '28px' }}>
            <div style={{ position: 'relative', width: '124px', height: '124px', flexShrink: '0' }}>
              <svg viewBox="0 0 124 124" style={{ display: 'block', width: '124px', height: '124px', transform: 'rotate(-90deg)' }}>
                <defs>
                  <linearGradient id="perfRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" style={{ stopColor: '#5fe3f0' }} />
                    <stop offset="1" style={{ stopColor: '#9a8bf0' }} />
                  </linearGradient>
                </defs>
                <circle cx="62" cy="62" r="52" style={{ fill: 'none', stroke: 'rgba(255,255,255,.08)', strokeWidth: '11px' }} />
                <RV as='circle' variant='draw' delay={250} frac={v.ringFrac} cx="62" cy="62" r="52" style={{ fill: 'none', stroke: 'url(#perfRing)', strokeWidth: '11px', strokeLinecap: 'round', strokeDasharray: `${(326.7 * v.ringFrac).toFixed(1)}px 326.7px` }} />
              </svg>
              <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '30px', fontWeight: '800', letterSpacing: '-.04em' }}>{v.ringPct}</span>
                <span style={{ fontSize: '11px', color: '#9fb4bb' }}>{t('prf_realises')}</span>
              </div>
            </div>
            <div style={{ flex: '1', minWidth: '260px' }}>
              <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.14em', color: '#5fe3f0' }}>{v.periodPicker}</div>
              <div style={{ marginTop: '6px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '26px', letterSpacing: '-.035em' }}>{v.headline}</div>
              <div style={{ marginTop: '4px', fontSize: '13.5px', color: '#9fb4bb' }}>{v.closing}</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', fontSize: '13px', color: '#cfdde1' }}>
                  <strong style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '17px', color: '#ffffff' }}>{v.selfN}</strong>
                  {t('prf_auto_evaluations')}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', fontSize: '13px', color: '#cfdde1' }}>
                  <strong style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '17px', color: '#ffffff' }}>{v.plannedN}</strong>
                  {t('prf_entretiens_planifies')}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', background: 'rgba(239,107,84,.12)', border: '1px solid rgba(239,107,84,.3)', fontSize: '13px', color: '#ffd9d1' }}>
                  <strong style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '17px', color: '#ffb3a5' }}>{v.lateN}</strong>
                  {t('prf_en_retard')}
                </span>
              </div>
            </div>
            <button type="button" onClick={v.remindAll} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 16px', border: 'none', borderRadius: '12px', background: '#effbfc', color: '#06141a', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }} className="prf-h1">
              <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><v.remIcon size={16} style={{ display: 'block' }} /></span>
              {v.remLabel}
            </button>
          </div>
        </RV>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <RV as='div' variant='up' delay={100} style={{ flex: '1.3 1 500px', minWidth: '0', padding: '20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '17px' }}>{t('prf_matrice_des_talents')}</div>
                <div style={{ fontSize: '13px', color: '#52646d', marginTop: '2px' }}>{t('prf_performance_potentiel_cliquez_une')}</div>
              </div>
              {v.hasCell ? (
                <>
                <button type="button" onClick={v.clearCell} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 11px', borderRadius: '99px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#33474f', cursor: 'pointer' }}>
                  {v.cellName}
                  <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><X size={13} style={{ display: 'block' }} /></span>
                </button>
                </>
              ) : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr)', gap: '10px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontFamily: '\'Geist Mono\',monospace', fontSize: '10.5px', letterSpacing: '.14em', color: '#5f7079' }}>{t('prf_potentiel')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px' }}>
                {v.box.map((b, bIndex) => (
                  <Fragment key={bIndex}>
                    <RV as='button' variant='scale' delay={Number(b.delay)} type="button" onClick={b.pick} style={{ minHeight: '112px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px', padding: '12px', borderRadius: '14px', border: 'none', background: b.bg, fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', boxShadow: b.ring, opacity: b.op, transition: 'box-shadow .2s,opacity .25s,transform .2s' }} className="prf-h2">
                      <span style={{ fontSize: '12px', fontWeight: '700', color: b.color }}>{b.name}</span>
                      <span style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '6px' }}>
                        <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '28px', fontWeight: '800', letterSpacing: '-.04em', color: '#0a1c24', lineHeight: '1' }}>{b.count}</span>
                        <span style={{ display: 'flex', paddingInlineStart: '7px' }}>
                          {b.faces.map((f, fIndex) => (
                            <Fragment key={fIndex}>
                              <span title={f.name} style={{ width: '24px', height: '24px', marginInlineStart: '-7px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.av, color: '#ffffff', fontSize: '9px', fontWeight: '700', border: '2px solid #ffffff' }}>{f.ini}</span>
                            </Fragment>
                          ))}
                        </span>
                      </span>
                    </RV>
                  </Fragment>
                ))}
              </div>
              <span />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px', textAlign: 'center', fontFamily: '\'Geist Mono\',monospace', fontSize: '10.5px', letterSpacing: '.1em', color: '#5f7079' }}>
                <span>{t('prf_faible')}</span>
                <span>{t('prf_performance_2')}</span>
                <span>{t('prf_elevee')}</span>
              </div>
            </div>
          </RV>
          <div style={{ flex: '1 1 320px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RV as='div' variant='up' delay={140} style={{ padding: '20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>{v.goalsTitle}</div>
              {v.goals.map((g, gIndex) => (
                <Fragment key={gIndex}>
                  <div style={{ padding: '12px 0', borderTop: '1px solid #f0f3f4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13.5px' }}>
                      <span style={{ fontWeight: '500' }}>{g.title}</span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#52646d' }}>{`${g.pct}%`}</span>
                    </div>
                    <div style={{ height: '7px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden', marginTop: '8px' }}>
                      <RV as='div' variant='growx' delay={Number(g.delay)} style={{ height: '100%', width: `${g.pct}%`, borderRadius: '99px', background: g.bar, transformOrigin: v.rtl ? 'right' : 'left' }} />
                    </div>
                  </div>
                </Fragment>
              ))}
            </RV>
            <RV as='div' variant='up' delay={200} style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(140deg,#5444b8,#6d5ad6 55%,#0e7f96)', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/wedy-avatar.png" alt={''} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4', border: '2px solid rgba(255,255,255,.4)' }} />
                <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('prf_ce_que_disent_les_entretiens')}</div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '13.5px', lineHeight: '1.55' }}>{v.themesText}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '14px' }}>
                {v.themes.map((t_, t_Index) => (
                  <Fragment key={t_Index}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 11px', borderRadius: '99px', background: 'rgba(255,255,255,.15)', fontSize: '12.5px', fontWeight: '600' }}>
                      {t_.label}
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', padding: '1px 6px', borderRadius: '99px', background: 'rgba(255,255,255,.22)' }}>{t_.n}</span>
                    </span>
                  </Fragment>
                ))}
              </div>
            </RV>
          </div>
        </div>
        <RV as='div' variant='up' delay={120} style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '14px 20px', borderBottom: '1px solid #eef2f4' }}>
            <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('prf_entretiens')}</span>
            <span style={{ fontSize: '13px', color: '#52646d' }}>{v.listLabel}</span>
            <div style={{ marginInlineStart: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {v.tabs.map((t_, t_Index) => (
                <Fragment key={t_Index}>
                  <button type="button" onClick={t_.go} style={{ height: '32px', padding: '0 12px', borderRadius: '99px', border: `1px solid ${t_.border}`, background: t_.bg, color: t_.color, fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t_.label}</button>
                </Fragment>
              ))}
            </div>
          </div>
          {v.loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}><Spinner /></div>}
          {v.reviews.map(r => (
            <Fragment key={r.id}>
              <RV as='div' variant='up' delay={Number(r.delay)} style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', padding: '12px 20px', borderBottom: '1px solid #eef2f4' }}>
                <span style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: '11px', minWidth: '0' }}>
                  <span style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: r.av, color: '#ffffff', fontSize: '12px', fontWeight: '700', flexShrink: '0' }}>{r.ini}</span>
                  <span style={{ minWidth: '0' }}>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                    <span style={{ display: 'block', fontSize: '12.5px', color: '#5f7079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.role}</span>
                  </span>
                </span>
                <span style={{ flex: '0 1 200px', minWidth: '0', fontSize: '13px', color: '#52646d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('prf_manager')}{' '}
                  <span style={{ color: '#33474f', fontWeight: '500' }}>{r.manager || '—'}</span>
                </span>
                <span style={{ width: '130px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: r.stBg, color: r.stColor, whiteSpace: 'nowrap' }}>{r.status}</span>
                </span>
                <span style={{ width: '64px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13.5px', fontWeight: '700' }}>
                  {r.hasNote ? (
                    <>
                    <span style={{ display: 'inline-flex', width: '14px', height: '14px', color: '#df9326' }}><Star size={14} style={{ display: 'block' }} /></span>
                    {r.note}
                    </>
                  ) : null}
                  {r.noNote ? (
                    <>
                    <span style={{ color: '#a3b1b7', fontWeight: '500' }}>{'—'}</span>
                    </>
                  ) : null}
                </span>
                <span style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  {r.canRemind ? (
                    <>
                    <button type="button" onClick={r.remind} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 11px', borderRadius: '9px', border: '1px solid #f0c9c0', background: '#ffffff', color: '#a33a28', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }} className="prf-h3">
                      <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><BellRing size={13} style={{ display: 'block' }} /></span>
                      {t('prf_relancer')}
                    </button>
                    </>
                  ) : null}
                  {r.reminded ? (
                    <>
                    <RV as='span' variant='pill' style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: '600', color: '#8a5207' }}>
                      <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Send size={13} style={{ display: 'block' }} /></span>
                      {t('prf_relance')}
                    </RV>
                    </>
                  ) : null}
                  {r.isDone ? (
                    <>
                    <button type="button" onClick={r.open} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '0', border: 'none', background: 'none', color: '#0e6f84', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} className="prf-h4">
                      {t('prf_voir')}
                      <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><ArrowRight size={14} className="wy-flip" style={{ display: 'block' }} /></span>
                    </button>
                    </>
                  ) : null}
                  {r.isPlanned ? (
                    <>
                    <button type="button" onClick={r.open} style={{ padding: '0', border: 'none', background: 'none', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#0b5f72', cursor: 'pointer' }} className="prf-h4">{r.action}</button>
                    </>
                  ) : null}
                  {r.isSelf ? (
                    <>
                    <button type="button" onClick={r.open} style={{ padding: '0', border: 'none', background: 'none', fontFamily: 'inherit', fontSize: '12.5px', color: '#5444b8', fontWeight: '600', cursor: 'pointer' }} className="prf-h4">{t('prf_en_cours')}</button>
                    </>
                  ) : null}
                </span>
              </RV>
            </Fragment>
          ))}
          {v.noReviews ? (
            <>
            <div style={{ padding: '36px 20px', textAlign: 'center', fontSize: '14px', color: '#52646d' }}>{t('prf_aucun_entretien_dans_cette_vue')}</div>
            </>
          ) : null}
        </RV>
      </div>
      {v.drawer}
    </>
  );
}
