// Generated from design_handoff_wedy/design/Wedy Time Off.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// every figure, the month, the timeline, balances and holidays come from `v` (real leave data).
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Inbox, Plus, Scale } from 'lucide-react';
import { RV, CountText } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import type { TimeOffVals } from './TimeOffPage';
import './TimeOffView.css';

const navBtn: CSSProperties = { width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #d6dfe3', borderRadius: '9px', background: '#ffffff', color: '#33474f', cursor: 'pointer', fontFamily: 'inherit' };

export function TimeOffView({ v }: { v: TimeOffVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('tof_conges')}</RV>
            <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('tof_qui_est_absent_quand_et_combien')}</RV>
          </div>
          <RV as='div' variant='up' delay={100} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {v.pending > 0 && <Link to="/app/requests?kind=leave" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontSize: '13.5px', fontWeight: '600', whiteSpace: 'nowrap' }} className="tof-h1">
              <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Inbox size={15} style={{ display: 'block' }} /></span>
              {v.pendingLabel}
            </Link>}
            <button type="button" onClick={v.addLeave} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
              <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Plus size={16} strokeWidth={2.2} style={{ display: 'block' }} /></span>
              {t('tof_enregistrer_un_conge')}
            </button>
          </RV>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
          <RV as='div' variant='up' delay={60} style={{ padding: '16px 18px', borderRadius: '18px', background: 'linear-gradient(135deg,#5444b8,#6d5ad6)', color: '#ffffff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', opacity: '.9' }}>{t('tof_en_conge_aujourd_hui')}</div>
            <CountText as='div' text={String(v.onToday)} style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px' }} />
          </RV>
          <RV as='div' variant='up' delay={110} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{v.monthDaysLabel}</div>
            <CountText as='div' text={String(v.monthDays)} style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px' }} />
          </RV>
          <RV as='div' variant='up' delay={160} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('tof_solde_moyen')}</div>
            <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px' }}>{v.avgLeft}</div>
          </RV>
          <RV as='div' variant='up' delay={210} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('tof_jours_feries_ce_mois')}</div>
            <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px' }}>{v.holMonth}</div>
          </RV>
        </div>
        <RV as='div' variant='up' delay={140} style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '16px 20px', borderBottom: '1px solid #eef2f4' }}>
            <span style={{ display: 'inline-flex', gap: '4px' }}>
              <button type="button" onClick={v.prev} aria-label={t('tof_prev_month')} style={navBtn} className="tof-h2"><ChevronLeft size={15} className="wy-flip" /></button>
              <button type="button" onClick={v.next} aria-label={t('tof_next_month')} style={navBtn} className="tof-h2"><ChevronRight size={15} className="wy-flip" /></button>
            </span>
            <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '17px' }}>{v.monthLabel}</span>
            {!v.isCurrent && <button type="button" onClick={v.thisMonth} style={{ ...navBtn, width: 'auto', padding: '0 10px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }} className="tof-h2">{t('tof_this_month')}</button>}
            <div style={{ display: 'flex', gap: '14px', marginLeft: 'auto', flexWrap: 'wrap', fontSize: '12.5px', color: '#33474f' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#16b6c8' }} />
                {t('tof_annuel')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#6d5ad6' }} />
                {t('tof_exceptionnel')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#df5740' }} />
                {t('tof_maladie')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'repeating-linear-gradient(45deg,#f5e3c3 0 3px,#fbf3e4 3px 6px)' }} />
                {t('tof_ferie')}
              </span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ position: 'relative', minWidth: '980px', padding: '0 20px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '170px minmax(0,1fr)', alignItems: 'end' }}>
                <span />
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${v.dayCount},minmax(0,1fr))`, padding: '12px 0 8px' }}>
                  {v.days.map((d, dIndex) => (
                    <Fragment key={dIndex}>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontFamily: '\'Geist Mono\',monospace', fontSize: '10.5px', color: d.color }}>
                        <span>{d.dow}</span>
                        <span style={{ width: '22px', height: '22px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11.5px', fontWeight: '600', background: d.bg, color: d.numColor }}>{d.n}</span>
                      </span>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '170px minmax(0,1fr)' }}>
                <span />
                <div style={{ position: 'relative' }}>
                  <div aria-hidden="true" style={{ position: 'absolute', inset: '0', display: 'grid', gridTemplateColumns: `repeat(${v.dayCount},minmax(0,1fr))`, pointerEvents: 'none' }}>
                    {v.days.map((d, dIndex) => (
                      <Fragment key={dIndex}>
                        <span style={{ background: d.col, borderInlineStart: '1px solid #f1f4f5' }} />
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative', marginTop: '-1px' }}>
                <div aria-hidden="true" style={{ position: 'absolute', top: '0', bottom: '0', insetInlineStart: '170px', insetInlineEnd: '0', display: 'grid', gridTemplateColumns: `repeat(${v.dayCount},minmax(0,1fr))`, pointerEvents: 'none' }}>
                  {v.days.map((d, dIndex) => (
                    <Fragment key={dIndex}>
                      <span style={{ background: d.col, borderInlineStart: '1px solid #f1f4f5' }} />
                    </Fragment>
                  ))}
                </div>
                {v.loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}><Spinner /></div>}
                {!v.loading && v.rows.length === 0 && <div style={{ position: 'relative', padding: '30px 0', borderTop: '1px solid #f1f4f5', textAlign: 'center', fontSize: '13.5px', color: '#5f7079' }}>{t('tof_none_month')}</div>}
                {v.rows.map((r, rIndex) => (
                  <Fragment key={rIndex}>
                    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '170px minmax(0,1fr)', alignItems: 'center', height: '46px', borderTop: '1px solid #f1f4f5' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: '0', paddingRight: '10px' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: r.av, color: '#ffffff', fontSize: '10.5px', fontWeight: '700', flexShrink: '0' }}>{r.ini}</span>
                        <span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                      </span>
                      <div style={{ position: 'relative', height: '100%' }}>
                        {r.bars.map((b, bIndex) => (
                          <Fragment key={bIndex}>
                            <RV as='span' variant='growx' delay={Number(b.delay)} title={b.title} style={{ position: 'absolute', top: '9px', bottom: '9px', insetInlineStart: `${b.left}%`, width: `${b.width}%`, borderRadius: '8px', background: b.bg, color: '#ffffff', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', transformOrigin: v.rtl ? 'right' : 'left', boxShadow: `0 6px 14px -8px ${b.shadow}` }}>{b.label}</RV>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  </Fragment>
                ))}
                {v.todayAt != null && <div aria-hidden="true" style={{ position: 'absolute', top: '-36px', bottom: '0', insetInlineStart: `calc(170px + (100% - 170px) * ${v.todayAt.toFixed(4)})`, width: '2px', background: '#16b6c8', boxShadow: '0 0 10px rgba(22,182,200,.6)', pointerEvents: 'none' }} />}
              </div>
            </div>
          </div>
        </RV>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <RV as='div' variant='up' style={{ flex: '2 1 520px', minWidth: '0', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('tof_soldes_de_conges')}</div>
            {v.balances.length === 0 && <div style={{ padding: '22px 20px', borderTop: '1px solid #eef2f4', fontSize: '13.5px', color: '#5f7079' }}>{v.loading ? <Spinner /> : t('tof_no_balances')}</div>}
            {v.balances.map((b, bIndex) => (
              <Fragment key={bIndex}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.4fr) minmax(0,2fr) 90px', alignItems: 'center', gap: '14px', padding: '11px 20px', borderTop: '1px solid #eef2f4' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '500', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.title}>{b.name}</span>
                  <span style={{ height: '8px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden' }}>
                    <RV as='span' variant='growx' style={{ display: 'block', height: '100%', width: `${b.pct}%`, borderRadius: '99px', background: b.bar, transformOrigin: v.rtl ? 'right' : 'left' }} />
                  </span>
                  <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', textAlign: 'end' }}>
                    <strong style={{ color: '#0a1c24' }}>{b.left}</strong>
                    {' '}{`/ ${b.total} ${t('tof_d')}`}
                  </span>
                </div>
              </Fragment>
            ))}
            {v.moreBalances > 0 && <button type="button" onClick={v.toggleAll} style={{ display: 'block', width: '100%', padding: '12px 20px', border: 'none', borderTop: '1px solid #eef2f4', background: '#fbfcfc', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', color: '#0e6f84', cursor: 'pointer', textAlign: 'center' }} className="tof-h3">{v.toggleLabel}</button>}
          </RV>
          <div style={{ flex: '1 1 300px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RV as='div' variant='up' delay={80} style={{ padding: '20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ display: 'inline-flex', width: '17px', height: '17px', color: '#16a06b' }}><Scale size={17} style={{ display: 'block' }} /></span>
                <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('tof_politique_de_conges')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px', fontSize: '13.5px', color: '#33474f' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('tof_acquisition')}</span>
                  <strong>{t('tof_1_5_j_mois')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('tof_anciennete')}</span>
                  <strong>{t('tof_1_5_j_5_ans')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('tof_plafond')}</span>
                  <strong>{t('tof_30_jours_ouvrables')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('tof_jours_feries')}</span>
                  <strong>{v.holidaysYear}</strong>
                </div>
              </div>
            </RV>
            <RV as='div' variant='up' delay={140} style={{ padding: '20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('tof_prochains_jours_feries')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {v.holidays.map(h => (
                  <div key={h.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '44px', textAlign: 'center', padding: '6px 0', borderRadius: '10px', background: h.soon ? '#fbefda' : '#f3f6f7', color: h.soon ? '#8a5207' : '#52646d', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', fontWeight: '600', lineHeight: '1.2', flexShrink: '0' }}>
                      {h.day}
                      <br />
                      {h.mon}
                    </span>
                    <span style={{ fontSize: '13.5px' }}>{h.label}</span>
                  </div>
                ))}
              </div>
            </RV>
          </div>
        </div>
      </div>
      {v.drawer}
    </>
  );
}
