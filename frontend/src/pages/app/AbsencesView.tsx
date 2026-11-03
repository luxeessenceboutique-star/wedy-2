// Generated from design_handoff_wedy/design/Wedy Absences.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// figures, rows, department rates and the insight come from `v` (approved absences + headcount).
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment } from 'react';
import { BellRing, FileCheck, Plus, Send, Sparkles } from 'lucide-react';
import { RV, CountText } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import type { AbsencesVals } from './AbsencesPage';
import './AbsencesView.css';

export function AbsencesView({ v }: { v: AbsencesVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('abs_absences')}</RV>
            <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('abs_maladies_absences_non_justifiees')}</RV>
          </div>
          <RV as='button' variant='up' delay={100} type="button" onClick={v.declare} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#b8402c,#df5740)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(223,87,64,.8)' }}>
            <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Plus size={16} strokeWidth={2.2} style={{ display: 'block' }} /></span>
            {t('abs_declarer_une_absence')}
          </RV>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
          <RV as='div' variant='up' delay={60} style={{ padding: '16px 18px', borderRadius: '18px', background: 'linear-gradient(135deg,#b8402c,#d1503a)', color: '#ffffff' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', opacity: '.9' }}>{t('abs_absences_du_jour')}</div>
            <CountText as='div' text={String(v.today)} style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px' }} />
          </RV>
          <RV as='div' variant='up' delay={110} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{v.rateLabel}</div>
            <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px' }}>{v.rate}</div>
          </RV>
          <RV as='div' variant='up' delay={160} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('abs_justificatifs_manquants')}</div>
            <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px', color: v.missing > 0 ? '#b8402c' : '#0a1c24' }}>{v.missing}</div>
          </RV>
          <RV as='div' variant='up' delay={210} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('abs_jours_perdus_ce_mois')}</div>
            <CountText as='div' text={String(v.lost)} style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '34px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '4px' }} />
          </RV>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <RV as='div' variant='up' delay={120} style={{ flex: '1.4 1 460px', minWidth: '0', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('abs_absences_recentes')}</div>
            {v.loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0', borderTop: '1px solid #eef2f4' }}><Spinner /></div>}
            {!v.loading && v.rows.length === 0 && <div style={{ padding: '30px 20px', borderTop: '1px solid #eef2f4', textAlign: 'center', fontSize: '13.5px', color: '#5f7079' }}>{t('abs_none_recent')}</div>}
            {v.rows.map(r => (
              <Fragment key={r.id}>
                <RV as='div' variant='up' delay={Number(r.delay)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderTop: '1px solid #eef2f4', flexWrap: 'wrap' }}>
                  <span style={{ width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: r.av, color: '#ffffff', fontSize: '12.5px', fontWeight: '700', flexShrink: '0' }}>{r.ini}</span>
                  <div style={{ flex: '1', minWidth: '160px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{r.name}</div>
                    <div style={{ fontSize: '12.5px', color: '#5f7079' }}>{r.dates}</div>
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: r.tBg, color: r.tColor }}>{r.type}</span>
                  {r.ok ? (
                    <>
                    <span title={r.okTitle} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: '600', color: '#0f6f49' }}>
                      <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><FileCheck size={14} style={{ display: 'block' }} /></span>
                      {t('abs_justificatif_recu')}
                    </span>
                    </>
                  ) : null}
                  {r.ko ? (
                    <>
                    <button type="button" onClick={r.remind} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 11px', borderRadius: '9px', border: '1px solid #f0c9c0', background: '#ffffff', color: '#a33a28', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }} className="abs-h1">
                      <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><BellRing size={13} style={{ display: 'block' }} /></span>
                      {t('abs_relancer')}
                    </button>
                    </>
                  ) : null}
                  {r.sent ? (
                    <>
                    <RV as='span' variant='pill' style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: '600', color: '#8a5207' }}>
                      <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Send size={13} style={{ display: 'block' }} /></span>
                      {t('abs_relance_envoyee')}
                    </RV>
                    </>
                  ) : null}
                  {r.tools}
                  {r.editor}
                </RV>
              </Fragment>
            ))}
            {v.more > 0 && <button type="button" onClick={v.toggleAll} style={{ display: 'block', width: '100%', padding: '12px 20px', border: 'none', borderTop: '1px solid #eef2f4', background: '#fbfcfc', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', color: '#0e6f84', cursor: 'pointer', textAlign: 'center' }} className="abs-h3">{v.toggleLabel}</button>}
          </RV>
          <div style={{ flex: '1 1 320px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RV as='div' variant='up' delay={160} style={{ padding: '20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{v.deptTitle}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {v.depts.length === 0 && <div style={{ fontSize: '13px', color: '#5f7079' }}>{v.loading ? <Spinner /> : t('abs_no_depts')}</div>}
                {v.depts.map((d, dIndex) => (
                  <Fragment key={dIndex}>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 52px', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                      <span title={d.title} style={{ color: '#33474f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <span style={{ height: '9px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden' }}>
                        <RV as='span' variant='growx' delay={Number(d.delay)} style={{ display: 'block', height: '100%', width: `${d.w}%`, borderRadius: '99px', background: d.bar, transformOrigin: v.rtl ? 'right' : 'left' }} />
                      </span>
                      <span style={{ fontWeight: '700', textAlign: 'end', whiteSpace: 'nowrap' }}>{d.v}</span>
                    </div>
                  </Fragment>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', marginTop: '16px', padding: '12px', borderRadius: '12px', background: '#ece9fb', color: '#3d2f99', fontSize: '13px', lineHeight: '1.5' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', flexShrink: '0', marginTop: '2px' }}><Sparkles size={15} style={{ display: 'block' }} /></span>
                {v.insight}
              </div>
            </RV>
          </div>
        </div>
      </div>
      {v.drawer}
    </>
  );
}
