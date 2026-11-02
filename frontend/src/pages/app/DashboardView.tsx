// Generated from design_handoff_wedy/design/Wedy Dashboard.dc.html by scripts/dc2jsx.mjs, then edited by hand.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Calendar, Check, CircleCheck, CircleX, Clock, FileClock, FileText, FileWarning, GraduationCap, Inbox, PartyPopper, Percent, Search, Sparkles, TrendingUp, UserCheck, UserPlus, UserX, Users, WandSparkles, X } from 'lucide-react';
import { RV, CountText } from '@/components/motion';
import { useLang } from '@/lib/lang';
import { tf } from '@/lib/format';
import type { DashboardVals } from './DashboardPage';
import './DashboardView.css';

export function DashboardView({ v }: { v: DashboardVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '30px 32px 56px', display: 'flex', flexDirection: 'column', gap: '26px', maxWidth: '1440px', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05', color: '#0a1c24' }}>{tf(t('dash_hello'), { name: v.firstName })}</RV>
            <RV as='p' variant='up' delay={70} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('dash_voici_ce_qui_se_passe_dans_votre')}</RV>
          </div>
          <RV as='div' variant='up' delay={120} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" onClick={v.addEmployee} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 16px', whiteSpace: 'nowrap', flexShrink: '0', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#0a1c24', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'border-color .2s' }} className="dash-h1">
              <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><UserPlus size={16} style={{ display: 'block' }} /></span>
              {t('dash_ajouter_un_employe')}
            </button>
            <button type="button" onClick={v.genToast} data-magnet="" style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 18px', whiteSpace: 'nowrap', flexShrink: '0', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 12px 28px -12px rgba(22,182,200,.85)', transform: 'translate(var(--tx,0px),var(--ty,0px))', transition: 'transform .35s cubic-bezier(.2,.8,.2,1)' }}>
              <span style={{ position: 'absolute', top: '0', bottom: '0', left: '0', width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} className="wedy-shine" />
              <span style={{ position: 'relative', display: 'inline-flex', width: '16px', height: '16px' }}><WandSparkles size={16} style={{ display: 'block' }} /></span>
              <span style={{ position: 'relative' }}>{t('dash_generer_un_document')}</span>
            </button>
          </RV>
        </div>
        <RV as='section' variant='up' delay={160} style={{ position: 'relative', overflow: 'hidden', borderRadius: '24px', background: '#06141a', color: '#e8eff1', padding: '24px 26px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '22px', alignItems: 'center', isolation: 'isolate' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: '0', zIndex: '-1', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '-10%', top: '-60%', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)' }} className="wedy-drift" />
            <div style={{ position: 'absolute', right: '-8%', top: '-40%', width: '560px', height: '560px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.35),transparent)', '--dur': '26s', '--delay': '-8s' } as CSSProperties} className="wedy-drift" />
            <div style={{ position: 'absolute', inset: '0', backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '40px 40px', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 40%,#000 70%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 40%,#000 70%,transparent)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: '0' }}>
              <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.55)' }} className="wedy-ping" />
              <img src="/wedy-avatar.png" alt={t('dash_wedy')} style={{ position: 'relative', display: 'block', width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', background: '#0f262e', border: '2px solid rgba(95,227,240,.5)' }} />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.12em', color: '#5fe3f0' }}>
                <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Sparkles size={13} style={{ display: 'block' }} /></span>
                {t('dash_briefing_du_jour')}
              </div>
              <div style={{ marginTop: '6px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '24px', letterSpacing: '-.035em', lineHeight: '1.1', background: 'linear-gradient(90deg,#f1f8f9,#5fe3f0 35%,#b3a8f5 65%,#f1f8f9)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }} className="wedy-shimmer">{t('dash_wedy_a_prepare_votre_journee')}</div>
              <div style={{ marginTop: '4px', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e' }}>{v.briefingMeta}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <RV as='div' variant='left' delay={400} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '13px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(230,169,72,.16)', color: '#f0bd6a', flexShrink: '0' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><FileClock size={15} style={{ display: 'block' }} /></span>
              </span>
              <span style={{ flex: '1', fontSize: '13.5px', lineHeight: '1.45', color: '#dbe7ea' }}>
                <strong style={{ color: '#ffffff' }}>{v.expLead}</strong>
                {' '}{v.expSentence}
              </span>
              <button type="button" onClick={v.draftToast} style={{ flexShrink: '0', border: 'none', borderRadius: '9px', padding: '7px 11px', background: 'rgba(255,255,255,.08)', color: '#e8eff1', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }} className="dash-h2">{t('dash_preparer')}</button>
            </RV>
            <RV as='div' variant='left' delay={520} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '13px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.15)', color: '#5fe3f0', flexShrink: '0' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Inbox size={15} style={{ display: 'block' }} /></span>
              </span>
              <span style={{ flex: '1', fontSize: '13.5px', lineHeight: '1.45', color: '#dbe7ea' }}>
                <strong style={{ color: '#ffffff' }}>{tf(t('dash_pendingcount_demandes'), { pendingCount: v.pendingCount })}</strong>
                {' '}{t('dash_attendent_votre_validation')}
              </span>
              <button type="button" onClick={v.goRequests} style={{ flexShrink: '0', border: 'none', borderRadius: '9px', padding: '7px 11px', background: 'rgba(255,255,255,.08)', color: '#e8eff1', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }} className="dash-h2">{t('dash_voir')}</button>
            </RV>
            <RV as='div' variant='left' delay={640} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '13px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,189,134,.15)', color: '#4fd3a0', flexShrink: '0' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><TrendingUp size={15} style={{ display: 'block' }} /></span>
              </span>
              <span style={{ flex: '1', fontSize: '13.5px', lineHeight: '1.45', color: '#dbe7ea' }}>
                {t('dash_presence_is')}{' '}
                <strong style={{ color: '#ffffff' }}>{v.presenceLabel}</strong>
                {' '}{v.overDays}
              </span>
            </RV>
          </div>
        </RV>
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '17px', fontWeight: '700', letterSpacing: '-.02em' }}>{t('dash_indicateurs_prioritaires')}</h2>
            <span style={{ fontSize: '12.5px', color: '#5f7079' }}>{t('dash_aujourd_hui')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px' }}>
            <RV as={Link} variant='up' delay={200} to="/app/employees" style={{ position: 'relative', overflow: 'hidden', display: 'block', minHeight: '128px', borderRadius: '18px', padding: '15px 16px 14px', background: 'linear-gradient(135deg,#0b5f72,#0e7f96)', color: '#ffffff', textDecoration: 'none', boxShadow: '0 8px 20px -12px rgba(11,95,114,.8)', transition: 'box-shadow .2s' }} className="dash-h3">
              <span style={{ position: 'absolute', right: '-26px', top: '-26px', width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
              <span style={{ position: 'absolute', right: '12px', bottom: '10px', opacity: '.2', display: 'inline-flex' }}><Users size={46} style={{ display: 'block' }} /></span>
              <div style={{ position: 'relative', fontSize: '10.5px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', minHeight: '27px' }}>{t('dash_total_employes')}</div>
              <CountText as='div' text={String(v.k.total)} delay={300} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }} />
              <div style={{ position: 'relative', fontSize: '11.5px', color: 'rgba(255,255,255,.92)', marginTop: '3px' }}>{tf(t('dash_active_inactive'), { a: v.k.active, i: v.k.inactive })}</div>
            </RV>
            <RV as={Link} variant='up' delay={250} to="/app/interns" style={{ position: 'relative', overflow: 'hidden', display: 'block', minHeight: '128px', borderRadius: '18px', padding: '15px 16px 14px', background: 'linear-gradient(135deg,#2f4bb0,#4a69d8)', color: '#ffffff', textDecoration: 'none', boxShadow: '0 8px 20px -12px rgba(47,75,176,.8)', transition: 'box-shadow .2s' }} className="dash-h4">
              <span style={{ position: 'absolute', right: '-26px', top: '-26px', width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
              <span style={{ position: 'absolute', right: '12px', bottom: '10px', opacity: '.2', display: 'inline-flex' }}><GraduationCap size={46} style={{ display: 'block' }} /></span>
              <div style={{ position: 'relative', fontSize: '10.5px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', minHeight: '27px' }}>{t('dash_stagiaires')}</div>
              <CountText as='div' text={String(v.k.interns)} delay={350} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }} />
              <div style={{ position: 'relative', fontSize: '11.5px', color: 'rgba(255,255,255,.92)', marginTop: '3px' }}>{tf(t('dash_in_progress'), { n: v.k.internsInProgress })}</div>
            </RV>
            <RV as={Link} variant='up' delay={300} to="/app/absences" style={{ position: 'relative', overflow: 'hidden', display: 'block', minHeight: '128px', borderRadius: '18px', padding: '15px 16px 14px', background: 'linear-gradient(135deg,#0f6f49,#16915f)', color: '#ffffff', textDecoration: 'none', boxShadow: '0 8px 20px -12px rgba(15,111,73,.8)', transition: 'box-shadow .2s' }} className="dash-h5">
              <span style={{ position: 'absolute', right: '-26px', top: '-26px', width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
              <span style={{ position: 'absolute', right: '12px', bottom: '10px', opacity: '.2', display: 'inline-flex' }}><UserCheck size={46} style={{ display: 'block' }} /></span>
              <div style={{ position: 'relative', fontSize: '10.5px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', minHeight: '27px' }}>{t('dash_employes_presents')}</div>
              <CountText as='div' text={String(v.k.present)} delay={400} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }} />
              <div style={{ position: 'relative', fontSize: '11.5px', color: 'rgba(255,255,255,.92)', marginTop: '3px' }}>{tf(t('dash_of_active'), { n: v.k.active })}</div>
            </RV>
            <RV as={Link} variant='up' delay={350} to="/app/requests" style={{ position: 'relative', overflow: 'hidden', display: 'block', minHeight: '128px', borderRadius: '18px', padding: '15px 16px 14px', background: 'linear-gradient(135deg,#a8650a,#c9810f)', color: '#ffffff', textDecoration: 'none', boxShadow: '0 8px 20px -12px rgba(168,101,10,.8)', transition: 'box-shadow .2s' }} className="dash-h6">
              <span style={{ position: 'absolute', right: '-26px', top: '-26px', width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
              <span style={{ position: 'absolute', right: '12px', bottom: '10px', opacity: '.2', display: 'inline-flex' }}><Inbox size={46} style={{ display: 'block' }} /></span>
              <div style={{ position: 'relative', fontSize: '10.5px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', minHeight: '27px' }}>{t('dash_demandes_en_attente')}</div>
              <div style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }}>{v.pendingCount}</div>
              <div style={{ position: 'relative', fontSize: '11.5px', color: 'rgba(255,255,255,.92)', marginTop: '3px' }}>{v.pendingSub}</div>
            </RV>
            <RV as={Link} variant='up' delay={400} to="/app/timeoff" style={{ position: 'relative', overflow: 'hidden', display: 'block', minHeight: '128px', borderRadius: '18px', padding: '15px 16px 14px', background: 'linear-gradient(135deg,#5444b8,#6d5ad6)', color: '#ffffff', textDecoration: 'none', boxShadow: '0 8px 20px -12px rgba(84,68,184,.8)', transition: 'box-shadow .2s' }} className="dash-h7">
              <span style={{ position: 'absolute', right: '-26px', top: '-26px', width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
              <span style={{ position: 'absolute', right: '12px', bottom: '10px', opacity: '.2', display: 'inline-flex' }}><Calendar size={46} style={{ display: 'block' }} /></span>
              <div style={{ position: 'relative', fontSize: '10.5px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', minHeight: '27px' }}>{t('dash_conges_en_cours')}</div>
              <CountText as='div' text={String(v.k.onLeave)} delay={500} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }} />
              <div style={{ position: 'relative', fontSize: '11.5px', color: 'rgba(255,255,255,.92)', marginTop: '3px' }}>{t('dash_en_conge_aujourd_hui')}</div>
            </RV>
            <RV as={Link} variant='up' delay={450} to="/app/absences" style={{ position: 'relative', overflow: 'hidden', display: 'block', minHeight: '128px', borderRadius: '18px', padding: '15px 16px 14px', background: 'linear-gradient(135deg,#b8402c,#d1503a)', color: '#ffffff', textDecoration: 'none', boxShadow: '0 8px 20px -12px rgba(184,64,44,.8)', transition: 'box-shadow .2s' }} className="dash-h8">
              <span style={{ position: 'absolute', right: '-26px', top: '-26px', width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
              <span style={{ position: 'absolute', right: '12px', bottom: '10px', opacity: '.2', display: 'inline-flex' }}><UserX size={46} style={{ display: 'block' }} /></span>
              <div style={{ position: 'relative', fontSize: '10.5px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', minHeight: '27px' }}>{t('dash_absences_du_jour')}</div>
              <CountText as='div' text={String(v.k.absent)} delay={550} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }} />
              <div style={{ position: 'relative', fontSize: '11.5px', color: 'rgba(255,255,255,.92)', marginTop: '3px' }}>{t('dash_maladie_non_justifiee')}</div>
            </RV>
            <RV as={Link} variant='up' delay={500} to="/app/history" style={{ position: 'relative', overflow: 'hidden', display: 'block', minHeight: '128px', borderRadius: '18px', padding: '15px 16px 14px', background: 'linear-gradient(135deg,#0b7f90,#0f98ab)', color: '#ffffff', textDecoration: 'none', boxShadow: '0 8px 20px -12px rgba(11,127,144,.8)', transition: 'box-shadow .2s' }} className="dash-h9">
              <span style={{ position: 'absolute', right: '-26px', top: '-26px', width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
              <span style={{ position: 'absolute', right: '12px', bottom: '10px', opacity: '.2', display: 'inline-flex' }}><FileWarning size={46} style={{ display: 'block' }} /></span>
              <div style={{ position: 'relative', fontSize: '10.5px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', minHeight: '27px' }}>{t('dash_documents_a_traiter')}</div>
              <CountText as='div' text={String(v.k.toProcess)} delay={600} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }} />
              <div style={{ position: 'relative', fontSize: '11.5px', color: 'rgba(255,255,255,.92)', marginTop: '3px' }}>{tf(t('dash_incomplete_renew'), { a: v.k.incomplete, b: v.k.toRenew })}</div>
            </RV>
          </div>
        </section>
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '17px', fontWeight: '700', letterSpacing: '-.02em' }}>{t('dash_autres_indicateurs_rh')}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <button type="button" onClick={v.setP0} style={{ position: 'relative', border: 'none', background: 'transparent', padding: '6px 12px', borderRadius: '8px', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#52646d', cursor: 'pointer' }}>
                {v.p0 ? (
                  <>
                  <span style={{ position: 'absolute', inset: '0', borderRadius: '8px', background: '#0a1c24' }} />
                  <span style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>{t('dash_30_jours')}</span>
                  </>
                ) : null}
                {t('dash_30_jours')}
              </button>
              <button type="button" onClick={v.setP1} style={{ position: 'relative', border: 'none', background: 'transparent', padding: '6px 12px', borderRadius: '8px', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#52646d', cursor: 'pointer' }}>
                {v.p1 ? (
                  <>
                  <span style={{ position: 'absolute', inset: '0', borderRadius: '8px', background: '#0a1c24' }} />
                  <span style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>{t('dash_3_mois')}</span>
                  </>
                ) : null}
                {t('dash_3_mois')}
              </button>
              <button type="button" onClick={v.setP2} style={{ position: 'relative', border: 'none', background: 'transparent', padding: '6px 12px', borderRadius: '8px', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#52646d', cursor: 'pointer' }}>
                {v.p2 ? (
                  <>
                  <span style={{ position: 'absolute', inset: '0', borderRadius: '8px', background: '#0a1c24' }} />
                  <span style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>{t('dash_6_mois')}</span>
                  </>
                ) : null}
                {t('dash_6_mois')}
              </button>
              <button type="button" onClick={v.setP3} style={{ position: 'relative', border: 'none', background: 'transparent', padding: '6px 12px', borderRadius: '8px', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#52646d', cursor: 'pointer' }}>
                {v.p3 ? (
                  <>
                  <span style={{ position: 'absolute', inset: '0', borderRadius: '8px', background: '#0a1c24' }} />
                  <span style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>{t('dash_12_mois')}</span>
                  </>
                ) : null}
                {t('dash_12_mois')}
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '12px' }}>
            <RV as='div' variant='up' delay={100} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b' }}>
                    <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Percent size={14} style={{ display: 'block' }} /></span>
                  </span>
                  <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.05em', textTransform: 'uppercase', color: '#5f7079' }}>{t('dash_taux_de_presence')}</span>
                </div>
                <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '32px', fontWeight: '800', letterSpacing: '-.035em', marginTop: '8px' }}>{v.presence}</div>
                <div style={{ fontSize: '12px', color: '#52646d' }}>{tf(t('dash_sur_periodlabel'), { periodLabel: v.periodLabel })}</div>
              </div>
              <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: '0' }}>
                <svg viewBox="0 0 76 76" style={{ display: 'block', width: '76px', height: '76px', transform: 'rotate(-90deg)' }}>
                  <circle cx="38" cy="38" r="30" style={{ fill: 'none', stroke: '#eef2f4', strokeWidth: '9px' }} />
                  <RV as='circle' variant='draw' delay={300} frac={v.presenceFrac} cx="38" cy="38" r="30" style={{ fill: 'none', stroke: '#16a06b', strokeWidth: '9px', strokeLinecap: 'round', strokeDasharray: `${(188.5 * v.presenceFrac).toFixed(1)}px 188.5px` }} />
                </svg>
              </div>
            </RV>
            <RV as='div' variant='up' delay={150} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b' }}>
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><CircleCheck size={14} style={{ display: 'block' }} /></span>
                </span>
                <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.05em', textTransform: 'uppercase', color: '#5f7079' }}>{t('dash_demandes_acceptees')}</span>
              </div>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '32px', fontWeight: '800', letterSpacing: '-.035em', marginTop: '8px' }}>{v.accepted}</div>
              <div style={{ fontSize: '12px', color: '#52646d' }}>{tf(t('dash_sur_periodlabel'), { periodLabel: v.periodLabel })}</div>
              <div style={{ height: '6px', borderRadius: '99px', background: '#eef2f4', marginTop: '10px', overflow: 'hidden' }}>
                <RV as='div' variant='growx' delay={400} style={{ height: '100%', width: `${v.acceptedPct}%`, borderRadius: '99px', background: '#16a06b', transformOrigin: 'left', transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
              </div>
            </RV>
            <RV as='div' variant='up' delay={200} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbe9e6', color: '#df5740' }}>
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><CircleX size={14} style={{ display: 'block' }} /></span>
                </span>
                <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.05em', textTransform: 'uppercase', color: '#5f7079' }}>{t('dash_demandes_refusees')}</span>
              </div>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '32px', fontWeight: '800', letterSpacing: '-.035em', marginTop: '8px' }}>{v.refused}</div>
              <div style={{ fontSize: '12px', color: '#52646d' }}>{tf(t('dash_sur_periodlabel'), { periodLabel: v.periodLabel })}</div>
              <div style={{ height: '6px', borderRadius: '99px', background: '#eef2f4', marginTop: '10px', overflow: 'hidden' }}>
                <RV as='div' variant='growx' delay={450} style={{ height: '100%', width: `${v.refusedPct}%`, borderRadius: '99px', background: '#df5740', transformOrigin: 'left', transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
              </div>
            </RV>
            <RV as='div' variant='up' delay={250} style={{ padding: '16px 18px', borderRadius: '18px', background: 'transparent', border: '1.5px dashed #d0dadf' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef2f4', color: '#7d8f97' }}>
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Clock size={14} style={{ display: 'block' }} /></span>
                </span>
                <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.05em', textTransform: 'uppercase', color: '#5f7079' }}>{t('dash_retards_du_jour')}</span>
              </div>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '32px', fontWeight: '800', letterSpacing: '-.035em', marginTop: '8px', color: '#9aaab1' }}>{v.lateLabel}</div>
              <div style={{ fontSize: '12px', color: '#52646d' }}>{v.lateHint}</div>
            </RV>
            <RV as='div' variant='up' delay={300} style={{ padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbefda', color: '#b06b0c' }}>
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><FileClock size={14} style={{ display: 'block' }} /></span>
                </span>
                <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.05em', textTransform: 'uppercase', color: '#5f7079' }}>{t('dash_contrats_a_echeance')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                <CountText as='span' text={String(v.k.expiring)} delay={400} style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '32px', fontWeight: '800', letterSpacing: '-.035em' }} />
                <span style={{ fontSize: '12px', color: '#52646d' }}>{tf(t('dash_under30_expired'), { n: v.k.expired })}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', fontSize: '12px', color: '#33474f' }}>
                {v.expItems.map((x, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{x.name}</span>
                    <span style={{ fontWeight: '700', color: i === 0 ? '#b8402c' : '#5f7079' }}>{x.left}</span>
                  </div>
                ))}
              </div>
          </RV>
          </div>
        </section>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: '16px' }}>
          <RV as='div' variant='up' style={{ padding: '20px 22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', minWidth: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px', letterSpacing: '-.02em' }}>{t('dash_evolution_de_l_effectif')}</div>
                <div style={{ fontSize: '12.5px', color: '#5f7079', marginTop: '2px' }}>{t('dash_recrutements_et_departs_6_mois')}</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#0f6f49', padding: '4px 9px', borderRadius: '99px', background: '#e1f5ec' }}>
                <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><TrendingUp size={13} style={{ display: 'block' }} /></span>
                {v.evoDelta}
              </span>
            </div>
            <svg viewBox="0 0 600 210" style={{ display: 'block', width: '100%', height: 'auto', marginTop: '14px', overflow: 'visible' }}>
              <line x1="0" y1="40" x2="600" y2="40" style={{ stroke: '#eef2f4', strokeWidth: '1px', strokeDasharray: '4 4' }} />
              <line x1="0" y1="80" x2="600" y2="80" style={{ stroke: '#eef2f4', strokeWidth: '1px', strokeDasharray: '4 4' }} />
              <line x1="0" y1="120" x2="600" y2="120" style={{ stroke: '#eef2f4', strokeWidth: '1px', strokeDasharray: '4 4' }} />
              <line x1="0" y1="180" x2="600" y2="180" style={{ stroke: '#dfe6e9', strokeWidth: '1px' }} />
                            {v.evo.map((m, i) => (
                <Fragment key={i}>
                  <RV as='rect' variant='growy' delay={100 + i * 80} x={m.xh} y={m.yh} width="16" height={m.hh} rx="4" style={{ fill: '#16a06b', transformBox: 'fill-box', transformOrigin: '50% 100%' }} />
                  <RV as='rect' variant='growy' delay={140 + i * 80} x={m.xd} y={m.yd} width="16" height={m.hd} rx="4" style={{ fill: '#df5740', transformBox: 'fill-box', transformOrigin: '50% 100%' }} />
                  <text x={m.cx} y="204" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fill: '#7d8f97', textAnchor: 'middle' }}>{m.label}</text>
                </Fragment>
              ))}
              <RV as='path' variant='draw' delay={500} duration={1800} d={v.evoPath} style={{ fill: 'none', stroke: '#0e6f84', strokeWidth: '3px', strokeLinecap: 'round' }} />
              <circle cx={v.evoLast.x} cy={v.evoLast.y} r="6" style={{ fill: '#0e6f84', stroke: '#ffffff', strokeWidth: '3px' }} />
            </svg>
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '12px', color: '#52646d' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#16a06b' }} />
                {t('dash_recrutements')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#df5740' }} />
                {t('dash_departs')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '3px', borderRadius: '2px', background: '#0e6f84' }} />
                {t('dash_effectif')}
              </span>
            </div>
          </RV>
          <RV as='div' variant='up' delay={80} style={{ padding: '20px 22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', minWidth: '0' }}>
            <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px', letterSpacing: '-.02em' }}>{t('dash_effectif_par_service')}</div>
            <div style={{ fontSize: '12.5px', color: '#5f7079', marginTop: '2px' }}>{t('dash_repartition_des_employes_actifs')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px', marginTop: '20px' }}>
              {v.depts.map((d, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr) 28px', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <span style={{ height: '10px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden' }}>
                    <RV as='span' variant='growx' delay={150 + i * 80} style={{ display: 'block', height: '100%', width: `${d.pct}%`, borderRadius: '99px', background: d.color, transformOrigin: 'left' }} />
                  </span>
                  <span style={{ fontWeight: '700', textAlign: 'right' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </RV>
          <RV as='div' variant='up' delay={160} style={{ padding: '20px 22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', minWidth: '0' }}>
            <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px', letterSpacing: '-.02em' }}>{t('dash_repartition_par_contrat')}</div>
            <div style={{ fontSize: '12.5px', color: '#5f7079', marginTop: '2px' }}>{t('dash_cdi_cdd_stagiaires')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '18px' }}>
              <div style={{ position: 'relative', width: '156px', height: '156px', flexShrink: '0' }}>
                <svg viewBox="0 0 100 100" style={{ display: 'block', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="38" style={{ fill: 'none', stroke: '#f1f5f6', strokeWidth: '13px' }} />
                  {v.slices.map((c, i) => (
                    <RV key={i} as='circle' variant='draw' delay={200 + i * 400} duration={700} frac={c.frac} cx="50" cy="50" r="38" style={{ fill: 'none', stroke: c.color, strokeWidth: '13px', strokeDasharray: `${(238.76 * c.frac).toFixed(1)}px 238.76px`, transform: `rotate(${c.rot}deg)`, transformOrigin: '50px 50px' }} />
                  ))}
                </svg>
                <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <CountText as='span' text={String(v.contractTotal)} delay={200} style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '800', fontSize: '28px', letterSpacing: '-.04em' }} />
                  <span style={{ fontSize: '11px', color: '#5f7079' }}>{t('dash_actifs')}</span>
                </div>
              </div>
              <div style={{ flex: '1', minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                {v.contracts.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: c.color }} />
                    <span style={{ flex: '1', color: '#33474f' }}>{c.name}</span>
                    <span style={{ fontWeight: '700' }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </RV>
        </section>
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: '2 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RV as='div' variant='up' id="demandes" style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px', letterSpacing: '-.02em' }}>{t('dash_demandes_en_attente')}</span>
                  {v.hasPending ? (
                    <>
                    <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '2px 9px', borderRadius: '99px', background: '#fbefda', color: '#9a5c08' }}>{v.pendingCount}</span>
                    </>
                  ) : null}
                </div>
                <Link to="/app/requests" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '600', color: '#0e6f84' }} className="dash-h10">
                  {t('dash_gerer')}
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><ArrowRight size={14} style={{ display: 'block' }} /></span>
                </Link>
              </div>
              {v.requests.map((r, rIndex) => (
                <Fragment key={rIndex}>
                  <RV as='div' variant='up' data-req={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderTop: '1px solid #eef2f4', overflow: 'hidden' }}>
                    {r.isLeave ? (
                      <>
                      <span style={{ width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Calendar size={17} style={{ display: 'block' }} /></span>
                      </span>
                      </>
                    ) : null}
                    {r.isDoc ? (
                      <>
                      <span style={{ width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><FileText size={17} style={{ display: 'block' }} /></span>
                      </span>
                      </>
                    ) : null}
                    <div style={{ flex: '1', minWidth: '0' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a1c24' }}>{r.type}</div>
                      <div style={{ fontSize: '12.5px', color: '#52646d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${r.name} · ${r.meta}`}</div>
                    </div>
                    <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11.5px', color: '#7d8f97', flexShrink: '0' }}>{r.date}</span>
                    {r.isPending ? (
                      <>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: '0' }}>
                        <button type="button" onClick={r.refuse} aria-label={t('dash_refuser')} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8eb', background: '#ffffff', color: '#7d8f97', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .2s' }} className="dash-h11">
                          <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><X size={16} style={{ display: 'block' }} /></span>
                        </button>
                        <button type="button" onClick={r.approve} style={{ height: '36px', padding: '0 13px', borderRadius: '10px', border: 'none', background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'background .2s' }} className="dash-h12">
                          <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Check size={15} strokeWidth={2.4} style={{ display: 'block' }} /></span>
                          {t('dash_approuver')}
                        </button>
                      </div>
                      </>
                    ) : null}
                    {r.isApproved ? (
                      <>
                      <RV as='span' variant='scale' style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '99px', background: '#e1f5ec', color: '#0f6f49', fontSize: '12.5px', fontWeight: '700', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Check size={14} strokeWidth={2.6} style={{ display: 'block' }} /></span>
                        {t('dash_approuve')}
                      </RV>
                      </>
                    ) : null}
                    {r.isRefused ? (
                      <>
                      <RV as='span' variant='scale' style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '99px', background: '#fbe9e6', color: '#a33a28', fontSize: '12.5px', fontWeight: '700', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><X size={14} strokeWidth={2.6} style={{ display: 'block' }} /></span>
                        {t('dash_refuse')}
                      </RV>
                      </>
                    ) : null}
                  </RV>
                </Fragment>
              ))}
              {v.noRequests ? (
                <>
                <RV as='div' variant='scale' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '34px 20px', borderTop: '1px solid #eef2f4', textAlign: 'center' }}>
                  <span style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b' }}>
                    <span style={{ display: 'inline-flex', width: '22px', height: '22px' }}><PartyPopper size={22} style={{ display: 'block' }} /></span>
                  </span>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{t('dash_tout_est_a_jour')}</div>
                  <div style={{ fontSize: '13px', color: '#52646d' }}>{t('dash_aucune_demande_en_attente')}</div>
                </RV>
                </>
              ) : null}
            </RV>
            <RV as='div' variant='up' delay={80} style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px', letterSpacing: '-.02em' }}>{t('dash_documents_recents')}</span>
                <Link to="/app/history" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '600', color: '#0e6f84' }} className="dash-h10">
                  {t('dash_voir_tout')}
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><ArrowRight size={14} style={{ display: 'block' }} /></span>
                </Link>
              </div>
              {v.docs.length === 0 ? (
                <div style={{ padding: '26px 20px', borderTop: '1px solid #eef2f4', textAlign: 'center', fontSize: '13px', color: '#52646d' }}>{t('dash_no_documents')}</div>
              ) : null}
              {v.docs.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 20px', borderTop: '1px solid #eef2f4', transition: 'background .15s' }} className="dash-h13">
                  <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: d.bg, color: d.fg, flexShrink: '0' }}>
                    <FileText size={17} style={{ display: 'block' }} />
                  </span>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(d.rtl ? { fontFamily: 'var(--font-ar)' } : null) }}>{d.title}</div>
                    <div style={{ fontSize: '12.5px', color: '#52646d' }}>{d.who}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: '600', padding: '2px 7px', borderRadius: '6px', background: d.bg, color: d.fg }}>{d.lang}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: '#7d8f97', minWidth: '48px', whiteSpace: 'nowrap', textAlign: 'right' }}>{d.date}</span>
                </div>
              ))}
            </RV>
          </div>
          <div style={{ flex: '1 1 300px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RV as='div' variant='up' delay={120} style={{ padding: '18px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px', letterSpacing: '-.02em', marginBottom: '12px' }}>{t('dash_actions_rapides')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <button type="button" onClick={v.genToast} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '500', color: '#0a1c24', cursor: 'pointer', textAlign: 'left', transition: 'border-color .2s,background .2s' }} className="dash-h14">
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }}>
                    <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><WandSparkles size={16} style={{ display: 'block' }} /></span>
                  </span>
                  <span style={{ flex: '1' }}>{t('dash_generer_un_document')}</span>
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px', color: '#9aaab1' }}><ArrowRight size={14} style={{ display: 'block' }} /></span>
                </button>
                <button type="button" onClick={v.openPalette} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '500', color: '#0a1c24', cursor: 'pointer', textAlign: 'left', transition: 'border-color .2s,background .2s' }} className="dash-h14">
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f6f9', color: '#0b7f90' }}>
                    <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Users size={16} style={{ display: 'block' }} /></span>
                  </span>
                  <span style={{ flex: '1' }}>{t('dash_ajouter_un_employe')}</span>
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px', color: '#9aaab1' }}><ArrowRight size={14} style={{ display: 'block' }} /></span>
                </button>
                <button type="button" onClick={v.openCopilotToast} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '500', color: '#0a1c24', cursor: 'pointer', textAlign: 'left', transition: 'border-color .2s,background .2s' }} className="dash-h14">
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6' }}>
                    <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Bot size={16} style={{ display: 'block' }} /></span>
                  </span>
                  <span style={{ flex: '1' }}>{t('dash_demander_au_copilote')}</span>
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px', color: '#9aaab1' }}><ArrowRight size={14} style={{ display: 'block' }} /></span>
                </button>
                <button type="button" onClick={v.openPalette} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '500', color: '#0a1c24', cursor: 'pointer', textAlign: 'left', transition: 'border-color .2s,background .2s' }} className="dash-h14">
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b' }}>
                    <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><TrendingUp size={16} style={{ display: 'block' }} /></span>
                  </span>
                  <span style={{ flex: '1' }}>{t('dash_voir_les_analytics')}</span>
                  <span style={{ display: 'inline-flex', width: '14px', height: '14px', color: '#9aaab1' }}><ArrowRight size={14} style={{ display: 'block' }} /></span>
                </button>
              </div>
            </RV>
            <RV as='div' variant='up' delay={200} style={{ position: 'relative', overflow: 'hidden', padding: '22px', borderRadius: '20px', background: 'linear-gradient(140deg,#0b5f72,#0e7f96 55%,#5444b8)', color: '#ffffff', isolation: 'isolate' }}>
              <span aria-hidden="true" style={{ position: 'absolute', right: '-60px', top: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(255,255,255,.22),transparent)', zIndex: '-1' }} className="wedy-drift" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ position: 'relative', width: '48px', height: '48px', flexShrink: '0' }}>
                  <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.6)' }} className="wedy-ping" />
                  <img src="/wedy-avatar.png" alt={''} style={{ position: 'relative', display: 'block', width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,.2)', border: '2px solid rgba(255,255,255,.6)' }} />
                </span>
                <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.12em', color: 'rgba(255,255,255,.85)' }}>{t('dash_copilote_ia')}</div>
              </div>
              <div style={{ marginTop: '14px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '21px', letterSpacing: '-.03em', lineHeight: '1.15' }}>{t('dash_votre_co_equipier_rh_toujours')}</div>
              <p style={{ margin: '8px 0 0', fontSize: '13.5px', lineHeight: '1.55', color: 'rgba(255,255,255,.88)' }}>{t('dash_redigez_traduisez_et_analysez_en')}</p>
              <button type="button" onClick={v.openCopilotToast} style={{ marginTop: '16px', width: '100%', height: '42px', border: 'none', borderRadius: '11px', background: '#ffffff', color: '#0b5f72', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(0,0,0,.35)', transition: 'transform .2s' }} className="dash-h15">
                {t('dash_essayer_maintenant')}
                <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><ArrowRight size={15} style={{ display: 'block' }} /></span>
              </button>
            </RV>
          </div>
        </section>
        {v.showPalette ? (
          <>
          <div onClick={v.closePalette} style={{ position: 'fixed', inset: '0', zIndex: '100', background: 'rgba(6,20,26,.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '12vh 16px 16px' }}>
            <RV as='div' variant='scale' onClick={v.stop} style={{ width: '100%', maxWidth: '620px', borderRadius: '22px', background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 50px 120px -30px rgba(6,20,26,.7)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #eef2f4' }}>
                <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#7d8f97' }}><Search size={18} style={{ display: 'block' }} /></span>
                <input value={v.query} onChange={v.onQuery} placeholder={t('dash_rechercher_une_page_une_action_ou')} autoFocus style={{ flex: '1', minWidth: '0', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '16px', color: '#0a1c24' }} />
                <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', padding: '2px 7px', borderRadius: '6px', border: '1px solid #e2e8eb', color: '#5f7079' }}>{t('dash_echap')}</span>
              </div>
              <div style={{ maxHeight: 'min(400px,60vh)', overflowY: 'auto', padding: '8px' }}>
                {v.hasQuery ? (
                  <>
                  <div onClick={v.pickAi} onMouseEnter={v.hoverAi} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', borderRadius: '12px', cursor: 'pointer' }}>
                    {v.aiSel ? (
                      <>
                      <span style={{ position: 'absolute', inset: '0', borderRadius: '12px', background: 'linear-gradient(135deg,rgba(22,182,200,.1),rgba(109,90,214,.1))', boxShadow: 'inset 0 0 0 1px rgba(109,90,214,.3)' }} />
                      </>
                    ) : null}
                    <img src="/wedy-avatar.png" alt={''} style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />
                    <span style={{ position: 'relative', flex: '1', minWidth: '0', fontSize: '14.5px', color: '#0a1c24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.aiLabel}</span>
                    <span style={{ position: 'relative', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#6d5ad6' }}>{'IA'}</span>
                  </div>
                  </>
                ) : null}
                {v.paletteItems.map((p, pIndex) => (
                  <Fragment key={pIndex}>
                    <div onClick={p.onPick} onMouseEnter={p.onHover} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', borderRadius: '12px', cursor: 'pointer' }}>
                      {p.isSel ? (
                        <>
                        <span style={{ position: 'absolute', inset: '0', borderRadius: '12px', background: '#eef6f7', boxShadow: 'inset 0 0 0 1px #b9dfe5' }} />
                        </>
                      ) : null}
                      <span style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f6f7', color: '#33474f' }}>
                        <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><p.icon size={16} style={{ display: 'block' }} /></span>
                      </span>
                      <span style={{ position: 'relative', flex: '1', fontSize: '14.5px', color: '#0a1c24' }}>{p.label}</span>
                      <span style={{ position: 'relative', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7d8f97' }}>{p.group}</span>
                    </div>
                  </Fragment>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '16px', padding: '11px 20px', borderTop: '1px solid #eef2f4', background: '#f8fafb', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#5f7079' }}>
                <span>{t('dash_naviguer')}</span>
                <span>{t('dash_ouvrir')}</span>
                <span>{t('dash_k_fermer')}</span>
              </div>
            </RV>
          </div>
          </>
        ) : null}
      </div>
    </>
  );
}
