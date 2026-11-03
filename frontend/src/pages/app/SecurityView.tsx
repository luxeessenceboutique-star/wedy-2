// Generated from design_handoff_wedy/design/Wedy Security.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// session timeout and IP allow-list are enforced settings; sign-in, 2FA and passwords belong to the Tybot account.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment, type CSSProperties } from 'react';
import { Building, GlobeLock, ShieldCheck, Smartphone, Timer, X } from 'lucide-react';
import { RV } from '@/components/motion';
import { useLang } from '@/lib/lang';
import type { SecurityVals } from './SecurityPage';
import './SecurityView.css';

export function SecurityView({ v }: { v: SecurityVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1360px', width: '100%' }}>
        <div>
          <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('sec_securite')}</RV>
          <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('sec_protegez_les_donnees_personnelles')}</RV>
        </div>
        <RV as='section' variant='up' delay={80} style={{ position: 'relative', overflow: 'hidden', borderRadius: '24px', background: '#06141a', color: '#e8eff1', padding: '24px 26px', isolation: 'isolate' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: '0', zIndex: '-1', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '-8%', top: '-90%', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)' }} className="wedy-drift" />
            <div style={{ position: 'absolute', right: '-6%', top: '-70%', width: '460px', height: '460px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(43,189,134,.28),transparent)', '--dur': '27s', '--delay': '-9s' } as CSSProperties} className="wedy-drift" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '136px', height: '136px', flexShrink: '0' }}>
              <svg viewBox="0 0 136 136" style={{ display: 'block', width: '136px', height: '136px', transform: 'rotate(-90deg)' }}>
                <defs>
                  <linearGradient id="secRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" style={{ stopColor: '#5fe3f0' }} />
                    <stop offset="1" style={{ stopColor: '#2bbd86' }} />
                  </linearGradient>
                </defs>
                <circle cx="68" cy="68" r="58" style={{ fill: 'none', stroke: 'rgba(255,255,255,.08)', strokeWidth: '12px' }} />
                <circle cx="68" cy="68" r="58" style={{ fill: 'none', stroke: 'url(#secRing)', strokeWidth: '12px', strokeLinecap: 'round', strokeDasharray: v.ring, transition: 'stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)' }} />
              </svg>
              <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '38px', fontWeight: '800', letterSpacing: '-.05em', lineHeight: '1' }}>{v.score}</span>
                <span style={{ fontSize: '11.5px', color: '#9fb4bb', marginTop: '2px' }}>{t('sec_sur_100')}</span>
              </div>
            </div>
            <div style={{ flex: '1', minWidth: '260px' }}>
              <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.14em', color: '#5fe3f0' }}>{t('sec_score_de_securite')}</div>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '26px', letterSpacing: '-.035em', marginTop: '6px' }}>{v.level}</div>
              <div style={{ fontSize: '13.5px', color: '#9fb4bb', marginTop: '4px' }}>{v.levelText}</div>
            </div>
            <div style={{ flex: '1 1 320px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {v.recos.map((r, rIndex) => (
                <Fragment key={rIndex}>
                  <RV as='div' variant='left' delay={Number(r.delay)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                    <span style={{ display: 'inline-flex', width: '16px', height: '16px', color: '#f0bd6a' }}><r.icon size={16} style={{ display: 'block' }} /></span>
                    <span style={{ flex: '1', fontSize: '13px', color: '#e8eff1' }}>{r.t}</span>
                    <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#4fd3a0' }}>{`+${r.pts}`}</span>
                    <button type="button" onClick={r.fix} style={{ height: '30px', padding: '0 11px', border: 'none', borderRadius: '8px', background: '#effbfc', color: '#06141a', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('sec_activer')}</button>
                  </RV>
                </Fragment>
              ))}
              {v.allDone ? (
                <>
                <RV as='div' variant='up' style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', background: 'rgba(43,189,134,.14)', color: '#4fd3a0', fontSize: '13.5px', fontWeight: '600' }}>
                  <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><ShieldCheck size={17} style={{ display: 'block' }} /></span>
                  {t('sec_toutes_les_recommandations_sont')}
                </RV>
                </>
              ) : null}
            </div>
          </div>
        </RV>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,330px),1fr))', gap: '14px' }}>
          <RV as='div' variant='up' style={{ padding: '20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }}>
                <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Smartphone size={17} style={{ display: 'block' }} /></span>
              </span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700' }}>{t('sec_auth_title')}</div>
                <div style={{ fontSize: '12.5px', color: '#5f7079' }}>{t('sec_auth_sub')}</div>
              </div>
            </div>
            {v.authNode}
            <div style={{ fontSize: '12.5px', color: '#52646d', marginTop: '10px' }}>{v.tfaNote}</div>
          </RV>
          <RV as='div' variant='up' delay={60} style={{ padding: '20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6' }}>
                <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Timer size={17} style={{ display: 'block' }} /></span>
              </span>
              <div style={{ flex: '1' }}>
                <div style={{ fontSize: '15px', fontWeight: '700' }}>{t('sec_expiration_de_session')}</div>
                <div style={{ fontSize: '12.5px', color: '#5f7079' }}>{t('sec_deconnexion_automatique_apres')}</div>
              </div>
              <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '22px', fontWeight: '800', color: v.timeoutOn ? '#0a1c24' : '#a3b1b7' }}>{v.timeoutLabel}</span>
            </div>
            <input type="range" min="15" max="240" step="15" value={v.timeout} onChange={v.setTimeout} aria-label={t('sec_duree_de_session')} style={{ width: '100%', marginTop: '18px', accentColor: '#6d5ad6', cursor: 'pointer' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7d8f97', marginTop: '4px' }}>
              <span>{t('sec_15_min')}</span>
              <span>{'2 h'}</span>
              <span>{'4 h'}</span>
            </div>
            {v.timeoutExtra}
          </RV>
          <RV as='div' variant='up' delay={120} style={{ padding: '20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <button type="button" onClick={v.toggleIp} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '0', border: 'none', background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b' }}>
                <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><GlobeLock size={17} style={{ display: 'block' }} /></span>
              </span>
              <span style={{ flex: '1' }}>
                <span style={{ display: 'block', fontSize: '15px', fontWeight: '700', color: '#0a1c24' }}>{t('sec_restriction_par_adresse_ip')}</span>
                <span style={{ display: 'block', fontSize: '12.5px', color: '#5f7079' }}>{t('sec_acces_admin_limite_a_vos_reseaux')}</span>
              </span>
              <span style={{ position: 'relative', width: '40px', height: '24px', borderRadius: '99px', background: v.ipTrack, flexShrink: '0', transition: 'background .2s' }}>
                <span style={{ position: 'absolute', top: '3px', left: v.ipKnob, width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(10,28,36,.3)', transition: 'left .25s' }} />
              </span>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '14px', opacity: v.ipOp, transition: 'opacity .2s' }}>
              {v.ips.map((i, iIndex) => (
                <Fragment key={iIndex}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: '#f8fafb' }}>
                    <code style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', color: '#0a1c24' }}>{i.ip}</code>
                    <span style={{ flex: '1', fontSize: '12px', color: '#5f7079' }}>{i.label}</span>
                    <button type="button" onClick={i.remove} aria-label={t('sec_retirer')} style={{ width: '26px', height: '26px', border: 'none', borderRadius: '7px', background: 'transparent', color: '#7d8f97', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="sec-h1">
                      <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><X size={13} style={{ display: 'block' }} /></span>
                    </button>
                  </div>
                </Fragment>
              ))}
              {v.ipHint}
              <form onSubmit={v.addIp} style={{ display: 'flex', gap: '6px' }}>
                <input value={v.ipIn} onChange={v.onIpIn} placeholder={'ex. 105.66.0.0/16'} style={{ flex: '1', minWidth: '0', height: '36px', padding: '0 10px', borderRadius: '9px', border: '1px solid #d6dfe3', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', outline: 'none' }} className="sec-f2" />
                <button type="submit" style={{ height: '36px', padding: '0 12px', border: 'none', borderRadius: '9px', background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>{t('sec_ajouter')}</button>
              </form>
            </div>
          </RV>
          <RV as='div' variant='up' delay={120} style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(140deg,#5444b8,#6d5ad6 55%,#0e7f96)', color: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.16)' }}>
                <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Building size={17} style={{ display: 'block' }} /></span>
              </span>
              <div style={{ flex: '1' }}>
                <div style={{ fontSize: '15px', fontWeight: '700' }}>{t('sec_sso_title')}</div>
                <div style={{ fontSize: '12.5px', opacity: '.85' }}>{t('sec_sso_sub')}</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: 'rgba(255,255,255,.18)' }}>{v.ssoChip}</span>
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.55', marginTop: '12px', opacity: '.92' }}>{t('sec_sso_text')}</div>
            {v.ssoAction}
          </RV>
        </div>
        <RV as='div' variant='up' style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '14px 20px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('sec_priv_title')}</span>
            {v.privCount}
          </div>
          {v.privNote}
          {v.sessions.map(x => (
            <Fragment key={x.id}>
              <RV as='div' variant='up' style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderTop: '1px solid #eef2f4', flexWrap: 'wrap' }}>
                <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f6f7', color: '#33474f', flexShrink: '0' }}>
                  <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><x.icon size={17} style={{ display: 'block' }} /></span>
                </span>
                <div style={{ flex: '1 1 220px', minWidth: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
                    {`${x.user} · ${x.device}`}
                    {x.current ? (
                      <>
                      <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 7px', borderRadius: '99px', background: '#e1f5ec', color: '#0f6f49' }}>{t('sec_you')}</span>
                      </>
                    ) : null}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#5f7079' }}>
                    {x.place}
                  </div>
                </div>
                <span style={{ fontSize: '12.5px', color: '#52646d' }}>{x.last}</span>
                {x.canRevoke ? (
                  <>
                  <button type="button" onClick={x.revoke} style={{ height: '32px', padding: '0 11px', borderRadius: '9px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#33474f', cursor: 'pointer' }} className="sec-h4">{t('sec_demote')}</button>
                  </>
                ) : null}
              </RV>
            </Fragment>
          ))}
        </RV>
        <RV as='div' variant='up' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '10px' }}>
          {v.badges.map((b, bIndex) => (
            <Fragment key={bIndex}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#0e6f84' }}><b.icon size={18} style={{ display: 'block' }} /></span>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '700' }}>{b.t}</div>
                  <div style={{ fontSize: '12px', color: '#5f7079' }}>{b.s}</div>
                </div>
              </div>
            </Fragment>
          ))}
        </RV>
      </div>
    </>
  );
}
