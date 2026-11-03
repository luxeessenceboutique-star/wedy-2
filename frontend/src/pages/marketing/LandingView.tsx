// Generated from design_handoff_wedy/design/Wedy Landing.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// refs come in as props, sign-up CTAs route to /login, sales / demo / contact open a mail to support,
// and the footer languages switch the UI language.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { type CSSProperties, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUp, BadgeCheck, Bell, BellRing, BookOpen, Bot, Calendar, CalendarCheck, ChartColumn, Check, ClipboardList, Clock, Database, Download, FileCheck, FileText, Globe, History, Inbox, Info, KeyRound, Languages, LayoutDashboard, Lock, Megaphone, Network, Paperclip, Play, Scale, Search, ShieldCheck, Smartphone, Sparkles, Star, Target, Timer, TrendingUp, UserCheck, UserPlus, UserX, Users, Video, Wallet, WandSparkles, Webhook } from 'lucide-react';
import { RV, CountText } from '@/components/motion';
import { useLang } from '@/lib/lang';
import type { LandingVals } from './LandingPage';
import './LandingView.css';

type Refs = { rootRef: RefObject<HTMLDivElement | null>; inputRef: RefObject<HTMLSpanElement | null>; inputBoxRef: RefObject<HTMLDivElement | null> };

export function LandingView({ v, rootRef, inputRef, inputBoxRef }: { v: LandingVals } & Refs) {
  const { t, lang, setLang } = useLang();
  const langBtn = (on: boolean): CSSProperties => ({ padding: 0, border: 'none', background: 'none', font: 'inherit', cursor: 'pointer', color: on ? '#e8eff1' : 'inherit' });
  return (
    <>
      <div ref={rootRef} style={{ position: 'relative', overflowX: 'clip', background: '#06141a', color: '#e8eff1', fontFamily: '\'Geist\',system-ui,sans-serif' }}>
        <header data-nav="" style={{ position: 'fixed', top: '14px', left: '0', right: '0', zIndex: '80', display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none' }}>
          <RV as='nav' variant='down' style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '1100px', padding: '7px 7px 7px 8px', borderRadius: '999px', background: 'rgba(7,22,28,calc(.45 + var(--nav,0) * .4))', border: '1px solid rgba(255,255,255,.09)', backdropFilter: 'blur(18px) saturate(150%)', WebkitBackdropFilter: 'blur(18px) saturate(150%)', boxShadow: '0 12px 40px -14px rgba(0,0,0,.6)' }}>
            <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: '9px', paddingRight: '10px', color: '#f1f8f9', textDecoration: 'none', flexShrink: '0' }}>
              <img src="/wedy-avatar.png" alt={t('lnd_wedy')} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', background: '#0f262e', border: '1.5px solid rgba(255,255,255,.2)' }} />
              <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '20px', letterSpacing: '-.03em' }}>{t('lnd_wedy')}</span>
            </a>
            <div style={{ flex: '1', minWidth: '0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2px', height: '38px', overflow: 'hidden' }} className="lnd-navlinks">
              <a href="#copilot" style={{ padding: '9px 14px', borderRadius: '999px', fontSize: '14px', color: '#a9bcc2', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background .2s,color .2s' }} className="lnd-h1">{t('lnd_copilot')}</a>
              <a href="#features" style={{ padding: '9px 14px', borderRadius: '999px', fontSize: '14px', color: '#a9bcc2', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background .2s,color .2s' }} className="lnd-h1">{t('lnd_features')}</a>
              <a href="#platform" style={{ padding: '9px 14px', borderRadius: '999px', fontSize: '14px', color: '#a9bcc2', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background .2s,color .2s' }} className="lnd-h1">{t('lnd_platform')}</a>
              <a href="#security" style={{ padding: '9px 14px', borderRadius: '999px', fontSize: '14px', color: '#a9bcc2', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background .2s,color .2s' }} className="lnd-h1">{t('lnd_security')}</a>
              <a href="#pricing" style={{ padding: '9px 14px', borderRadius: '999px', fontSize: '14px', color: '#a9bcc2', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background .2s,color .2s' }} className="lnd-h1">{t('lnd_pricing')}</a>
            </div>
            <Link to="/login" style={{ padding: '9px 12px', fontSize: '14px', color: '#cfdde1', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: '0' }} className="lnd-h2">{t('lnd_sign_in')}</Link>
            <a href="#pricing" data-magnet="" style={{ flexShrink: '0', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px 10px 18px', borderRadius: '999px', background: '#effbfc', color: '#06141a', fontWeight: '600', fontSize: '14px', textDecoration: 'none', whiteSpace: 'nowrap', transform: 'translate(var(--tx,0px),var(--ty,0px))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s' }} className="lnd-h3">
              {t('lnd_start_free')}
              <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><ArrowRight size={16} className="wy-flip" style={{ display: 'block' }} /></span>
            </a>
          </RV>
        </header>
        <section id="top" data-mouse="" style={{ position: 'relative', padding: '170px 24px 0', background: '#06141a', overflow: 'hidden', isolation: 'isolate' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: '0', zIndex: '-1', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: '0', backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)', backgroundSize: '72px 72px', WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 28%,#000 25%,transparent 75%)', maskImage: 'radial-gradient(ellipse 70% 55% at 50% 28%,#000 25%,transparent 75%)' }} />
            <div style={{ position: 'absolute', left: '-12%', top: '-22%', width: '780px', height: '780px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)' }} className="wedy-drift" />
            <div style={{ position: 'absolute', right: '-14%', top: '-12%', width: '840px', height: '840px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.34),transparent)', '--dur': '27s', '--delay': '-9s' } as CSSProperties} className="wedy-drift" />
            <div style={{ position: 'absolute', left: '28%', top: '30%', width: '720px', height: '540px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(22,182,200,.24),transparent)', '--dur': '31s', '--delay': '-16s' } as CSSProperties} className="wedy-drift" />
            <div style={{ position: 'absolute', inset: '0', background: 'radial-gradient(560px circle at var(--cx,50%) var(--cy,22%),rgba(95,227,240,.11),transparent 65%)' }} />
          </div>
          <div style={{ position: 'relative', maxWidth: '1100px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <RV as='a' variant='up' href="#copilot" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.11)', color: '#cfe9ee', fontSize: '13.5px', textDecoration: 'none', marginBottom: '30px', transition: 'border-color .25s,background .25s' }} className="lnd-h4">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: '12px', fontWeight: '600' }}>
                <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Sparkles size={13} style={{ display: 'block' }} /></span>
                {t('lnd_new')}
              </span>
              <span>{t('lnd_ai_powered_hr_for_moroccan')}</span>
              <span style={{ display: 'inline-flex', width: '14px', height: '14px', color: '#5fe3f0' }}><ArrowRight size={14} className="wy-flip" style={{ display: 'block' }} /></span>
            </RV>
            <h1 style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(46px,7.4vw,100px)', lineHeight: '.98', letterSpacing: '-.05em', color: '#f1f8f9', maxWidth: '1040px', textWrap: 'balance' }}>
              <RV as='span' variant='word' delay={60} style={{ display: 'inline-block', margin: '0 .11em' }}>{t('lnd_the')}</RV>
              <RV as='span' variant='word' delay={130} style={{ display: 'inline-block', margin: '0 .11em', paddingBottom: '.08em', background: 'linear-gradient(90deg,#5fe3f0,#27c0d4 30%,#9a8bf0 60%,#5fe3f0)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', '--delay': '0.13s' } as CSSProperties} className="wedy-shimmer">{t('lnd_ai_native')}</RV>
              <RV as='span' variant='word' delay={200} style={{ display: 'inline-block', margin: '0 .11em' }}>{t('lnd_hr')}</RV>
              <RV as='span' variant='word' delay={270} style={{ display: 'inline-block', margin: '0 .11em' }}>{t('lnd_platform_2')}</RV>
              <RV as='span' variant='word' delay={340} style={{ display: 'inline-block', margin: '0 .11em' }}>{t('lnd_for')}</RV>
              <RV as='span' variant='word' delay={410} style={{ display: 'inline-block', margin: '0 .11em' }}>{t('lnd_modern')}</RV>
              <RV as='span' variant='word' delay={480} style={{ display: 'inline-block', margin: '0 .11em' }}>{t('lnd_teams')}</RV>
            </h1>
            <RV as='p' variant='up' delay={560} style={{ margin: '30px 0 0', maxWidth: '660px', fontSize: 'clamp(17px,1.6vw,20px)', lineHeight: '1.55', color: '#9fb4bb', textWrap: 'pretty' }}>
              {t('lnd_wedy')}{' '}
              <span style={{ display: 'inline-flex', height: '1.55em', overflow: 'hidden', verticalAlign: 'bottom' }}>
                <span data-rotator="" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ height: '1.55em', whiteSpace: 'nowrap', color: '#5fe3f0', fontWeight: '600' }}>{t('lnd_drafts')}</span>
                  <span style={{ height: '1.55em', whiteSpace: 'nowrap', color: '#b3a8f5', fontWeight: '600' }}>{t('lnd_translates')}</span>
                  <span style={{ height: '1.55em', whiteSpace: 'nowrap', color: '#4fd3a0', fontWeight: '600' }}>{t('lnd_files')}</span>
                  <span style={{ height: '1.55em', whiteSpace: 'nowrap', color: '#5fe3f0', fontWeight: '600' }}>{t('lnd_drafts')}</span>
                </span>
              </span>
              {' '}{t('lnd_every_hr_document_in_french')}
            </RV>
            <RV as='div' variant='up' delay={680} style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '38px' }}>
              <a href="#pricing" data-magnet="" style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 24px 16px 26px', borderRadius: '14px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontWeight: '600', fontSize: '16px', textDecoration: 'none', boxShadow: 'inset 0 0 0 1px rgba(95,227,240,.35),0 18px 44px -12px rgba(22,182,200,.7)', transform: 'translate(var(--tx,0px),var(--ty,0px))', transition: 'transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .3s' }} className="lnd-h5">
                <span style={{ position: 'absolute', top: '0', bottom: '0', left: '0', width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent)', pointerEvents: 'none' }} className="wedy-shine" />
                <span style={{ position: 'relative' }}>{t('lnd_start_free_trial')}</span>
                <span style={{ position: 'relative', display: 'inline-flex', width: '18px', height: '18px' }}><ArrowRight size={18} className="wy-flip" style={{ display: 'block' }} /></span>
              </a>
              <a href="#copilot" data-magnet="" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 22px 16px 16px', borderRadius: '14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.14)', color: '#e8eff1', fontWeight: '600', fontSize: '16px', textDecoration: 'none', transform: 'translate(var(--tx,0px),var(--ty,0px))', transition: 'transform .35s cubic-bezier(.2,.8,.2,1),background .2s' }} className="lnd-h6">
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255,255,255,.12)' }}>
                  <span style={{ display: 'inline-flex', width: '12px', height: '12px', marginLeft: '2px' }}><Play size={12} style={{ display: 'block' }} /></span>
                </span>
                {t('lnd_see_wedy_in_action')}
              </a>
            </RV>
            <RV as='div' variant='fade' delay={820} style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '26px', fontSize: '13.5px', color: '#8ea5ad' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><Check size={15} strokeWidth={2.2} style={{ display: 'block' }} /></span>
                {t('lnd_no_credit_card_required')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><Check size={15} strokeWidth={2.2} style={{ display: 'block' }} /></span>
                {t('lnd_free_14_day_trial')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><Check size={15} strokeWidth={2.2} style={{ display: 'block' }} /></span>
                {t('lnd_cancel_anytime')}
              </span>
            </RV>
          </div>
          <RV as='div' variant='blur' delay={300} duration={1500} style={{ position: 'relative', maxWidth: '1180px', margin: '78px auto 0' }}>
            <div aria-hidden="true" style={{ position: 'absolute', left: '10%', right: '10%', top: '-50px', height: '240px', background: 'radial-gradient(50% 60% at 50% 50%,rgba(39,192,212,.42),transparent)', pointerEvents: 'none' }} />
            <div data-fit="1100" style={{ position: 'relative', left: '50%', marginLeft: '-550px', width: '1100px', transform: 'scale(var(--fit,1))', transformOrigin: '50% 0', perspective: '2000px' }}>
              <div data-scroll="tilt" style={{ transform: 'rotateX(calc((1 - var(--p,1)) * 18deg)) scale(calc(.95 + var(--p,1) * .05))', transformOrigin: '50% 0', transition: 'transform .12s linear', WebkitMaskImage: 'linear-gradient(#000 70%,transparent 99%)', maskImage: 'linear-gradient(#000 70%,transparent 99%)' }}>
                <div style={{ width: '1100px', height: '680px', borderRadius: '20px', background: 'linear-gradient(180deg,#0d222a,#08191f)', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 50px 120px -30px rgba(0,0,0,.85)', overflow: 'hidden', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <div style={{ height: '42px', flexShrink: '0', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.02)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,.14)' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,.14)' }} />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,.14)' }} />
                    <div style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 14px', borderRadius: '8px', background: 'rgba(255,255,255,.045)', fontFamily: '\'Geist Mono\',monospace', fontSize: '11.5px', color: '#7f969e' }}>
                      <span style={{ display: 'inline-flex', width: '11px', height: '11px' }}><Lock size={11} style={{ display: 'block' }} /></span>
                      {t('lnd_app_wedy_ai_app')}
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e' }}>
                      <span style={{ position: 'relative', display: 'inline-flex', width: '7px', height: '7px' }}>
                        <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', background: '#2bbd86' }} className="wedy-ping" />
                        <span style={{ position: 'relative', width: '7px', height: '7px', borderRadius: '50%', background: '#2bbd86' }} />
                      </span>
                      {t('lnd_live')}
                    </span>
                  </div>
                  <div style={{ flex: '1', display: 'flex', minHeight: '0' }}>
                    <div style={{ width: '214px', flexShrink: '0', borderRight: '1px solid rgba(255,255,255,.06)', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,.012)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 6px 12px' }}>
                        <img src="/wedy-avatar.png" alt={''} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,.15)' }} />
                        <span style={{ fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '700', fontSize: '15px', color: '#eef5f7', letterSpacing: '-.02em' }}>{t('lnd_wedy')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 2px 10px', padding: '7px 10px', borderRadius: '9px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', fontSize: '12px', color: '#6b838c' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Search size={13} style={{ display: 'block' }} /></span>
                        <span style={{ flex: '1' }}>{t('lnd_search')}</span>
                        <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', padding: '1px 5px', borderRadius: '5px', border: '1px solid rgba(255,255,255,.08)' }}>{'⌘K'}</span>
                      </div>
                      <div style={{ padding: '6px 10px 4px', fontFamily: '\'Geist Mono\',monospace', fontSize: '9.5px', letterSpacing: '.12em', color: '#5b737b' }}>{t('lnd_overview')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', background: 'rgba(39,192,212,.12)', color: '#5fe3f0', fontWeight: '600', boxShadow: 'inset 2px 0 0 #27c0d4' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><LayoutDashboard size={14} style={{ display: 'block' }} /></span>
                        {t('lnd_dashboard')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', color: '#93a9b0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Bot size={14} style={{ display: 'block' }} /></span>
                        <span style={{ flex: '1' }}>{t('lnd_ai_copilot')}</span>
                        <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 6px', borderRadius: '99px', background: 'rgba(39,192,212,.14)', color: '#5fe3f0', border: '1px solid rgba(39,192,212,.3)' }}>{t('lnd_new')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', color: '#93a9b0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Bell size={14} style={{ display: 'block' }} /></span>
                        <span style={{ flex: '1' }}>{t('lnd_notifications')}</span>
                        <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '1px 6px', borderRadius: '99px', background: '#27c0d4', color: '#06141a' }}>{'3'}</span>
                      </div>
                      <div style={{ padding: '12px 10px 4px', fontFamily: '\'Geist Mono\',monospace', fontSize: '9.5px', letterSpacing: '.12em', color: '#5b737b' }}>{t('lnd_people')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', color: '#93a9b0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Users size={14} style={{ display: 'block' }} /></span>
                        {t('lnd_employees')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', color: '#93a9b0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Inbox size={14} style={{ display: 'block' }} /></span>
                        <span style={{ flex: '1' }}>{t('lnd_requests')}</span>
                        <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '1px 6px', borderRadius: '99px', background: '#27c0d4', color: '#06141a' }}>{'6'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', color: '#93a9b0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Target size={14} style={{ display: 'block' }} /></span>
                        {t('lnd_recruitment')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', color: '#93a9b0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Clock size={14} style={{ display: 'block' }} /></span>
                        {t('lnd_time_off')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', color: '#93a9b0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Wallet size={14} style={{ display: 'block' }} /></span>
                        {t('lnd_payroll')}
                      </div>
                      <div style={{ padding: '12px 10px 4px', fontFamily: '\'Geist Mono\',monospace', fontSize: '9.5px', letterSpacing: '.12em', color: '#5b737b' }}>{t('lnd_documents')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', color: '#93a9b0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><WandSparkles size={14} style={{ display: 'block' }} /></span>
                        <span style={{ flex: '1' }}>{t('lnd_generate')}</span>
                        <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 6px', borderRadius: '99px', background: 'rgba(154,139,240,.16)', color: '#b3a8f5', border: '1px solid rgba(154,139,240,.3)' }}>{'AI'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 10px', borderRadius: '9px', fontSize: '12.5px', color: '#93a9b0' }}>
                        <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><FileText size={14} style={{ display: 'block' }} /></span>
                        {t('lnd_templates')}
                      </div>
                      <div style={{ flex: '1' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '10px 6px 2px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#6d5ad6,#16b6c8)', color: '#ffffff', fontSize: '11px', fontWeight: '700' }}>{'SI'}</span>
                        <div style={{ flex: '1', minWidth: '0' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#e3eef0' }}>{t('lnd_salma_idrissi')}</div>
                          <div style={{ fontSize: '10.5px', color: '#6b838c' }}>{t('lnd_hr_admin')}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ flex: '1', minWidth: '0', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                          <div style={{ fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '600', fontSize: '23px', color: '#eef5f7', letterSpacing: '-.03em' }}>{t('lnd_good_morning_salma')}</div>
                          <div style={{ fontSize: '12px', color: '#6b838c', marginTop: '3px' }}>{t('lnd_here_s_your_team_at_a_glance')}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', padding: '3px', borderRadius: '9px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', fontSize: '11px', color: '#7f969e' }}>
                            <span style={{ padding: '4px 9px', borderRadius: '7px', background: 'rgba(39,192,212,.16)', color: '#5fe3f0', fontWeight: '600' }}>{'30d'}</span>
                            <span style={{ padding: '4px 9px' }}>{'3m'}</span>
                            <span style={{ padding: '4px 9px' }}>{'6m'}</span>
                            <span style={{ padding: '4px 9px' }}>{'12m'}</span>
                          </div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '9px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: '12px', fontWeight: '600' }}>
                            <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><WandSparkles size={13} style={{ display: 'block' }} /></span>
                            {t('lnd_generate')}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                        <RV as='div' variant='up' delay={500} style={{ position: 'relative', overflow: 'hidden', borderRadius: '14px', padding: '13px 14px', height: '108px', background: 'linear-gradient(135deg,#0b5f72,#0e7f96)', color: '#ffffff' }}>
                          <span style={{ position: 'absolute', right: '-24px', top: '-24px', width: '86px', height: '86px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
                          <span style={{ position: 'absolute', right: '10px', bottom: '8px', opacity: '.2', display: 'inline-flex' }}><Users size={40} style={{ display: 'block' }} /></span>
                          <div style={{ position: 'relative', fontSize: '9.5px', fontWeight: '700', letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.88)' }}>{t('lnd_total_employees')}</div>
                          <CountText as='div' text={'128'} delay={600} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '800', fontSize: '32px', letterSpacing: '-.04em', lineHeight: '1.1', marginTop: '6px' }} />
                          <div style={{ position: 'relative', fontSize: '11px', color: 'rgba(255,255,255,.92)' }}>{t('lnd_126_active_2_inactive')}</div>
                        </RV>
                        <RV as='div' variant='up' delay={580} style={{ position: 'relative', overflow: 'hidden', borderRadius: '14px', padding: '13px 14px', height: '108px', background: 'linear-gradient(135deg,#0f6f49,#16915f)', color: '#ffffff' }}>
                          <span style={{ position: 'absolute', right: '-24px', top: '-24px', width: '86px', height: '86px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
                          <span style={{ position: 'absolute', right: '10px', bottom: '8px', opacity: '.2', display: 'inline-flex' }}><UserCheck size={40} style={{ display: 'block' }} /></span>
                          <div style={{ position: 'relative', fontSize: '9.5px', fontWeight: '700', letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.88)' }}>{t('lnd_present_today')}</div>
                          <CountText as='div' text={'117'} delay={680} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '800', fontSize: '32px', letterSpacing: '-.04em', lineHeight: '1.1', marginTop: '6px' }} />
                          <div style={{ position: 'relative', fontSize: '11px', color: 'rgba(255,255,255,.92)' }}>{t('lnd_of_126_active')}</div>
                        </RV>
                        <RV as='div' variant='up' delay={660} style={{ position: 'relative', overflow: 'hidden', borderRadius: '14px', padding: '13px 14px', height: '108px', background: 'linear-gradient(135deg,#a8650a,#c9810f)', color: '#ffffff' }}>
                          <span style={{ position: 'absolute', right: '-24px', top: '-24px', width: '86px', height: '86px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
                          <span style={{ position: 'absolute', right: '10px', bottom: '8px', opacity: '.2', display: 'inline-flex' }}><Inbox size={40} style={{ display: 'block' }} /></span>
                          <div style={{ position: 'relative', fontSize: '9.5px', fontWeight: '700', letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.88)' }}>{t('lnd_pending_requests')}</div>
                          <CountText as='div' text={'6'} delay={760} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '800', fontSize: '32px', letterSpacing: '-.04em', lineHeight: '1.1', marginTop: '6px' }} />
                          <div style={{ position: 'relative', fontSize: '11px', color: 'rgba(255,255,255,.92)' }}>{t('lnd_4_leave_2_documents')}</div>
                        </RV>
                        <RV as='div' variant='up' delay={740} style={{ position: 'relative', overflow: 'hidden', borderRadius: '14px', padding: '13px 14px', height: '108px', background: 'linear-gradient(135deg,#5444b8,#6d5ad6)', color: '#ffffff' }}>
                          <span style={{ position: 'absolute', right: '-24px', top: '-24px', width: '86px', height: '86px', borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
                          <span style={{ position: 'absolute', right: '10px', bottom: '8px', opacity: '.2', display: 'inline-flex' }}><Calendar size={40} style={{ display: 'block' }} /></span>
                          <div style={{ position: 'relative', fontSize: '9.5px', fontWeight: '700', letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.88)' }}>{t('lnd_on_leave_today')}</div>
                          <CountText as='div' text={'5'} delay={840} style={{ position: 'relative', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '800', fontSize: '32px', letterSpacing: '-.04em', lineHeight: '1.1', marginTop: '6px' }} />
                          <div style={{ position: 'relative', fontSize: '11px', color: 'rgba(255,255,255,.92)' }}>{t('lnd_approved_leave')}</div>
                        </RV>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '12px' }}>
                        <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '600', fontSize: '14px', color: '#eef5f7' }}>{t('lnd_headcount_evolution')}</div>
                              <div style={{ fontSize: '11px', color: '#6b838c', marginTop: '2px' }}>{t('lnd_last_6_months')}</div>
                            </div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: '#4fd3a0', padding: '3px 8px', borderRadius: '99px', background: 'rgba(43,189,134,.12)' }}>
                              <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><TrendingUp size={12} style={{ display: 'block' }} /></span>
                              {'+14%'}
                            </span>
                          </div>
                          <div style={{ position: 'relative', height: '150px', marginTop: '14px' }}>
                            <div style={{ position: 'absolute', left: '0', right: '0', top: '25%', borderTop: '1px dashed rgba(255,255,255,.06)' }} />
                            <div style={{ position: 'absolute', left: '0', right: '0', top: '50%', borderTop: '1px dashed rgba(255,255,255,.06)' }} />
                            <div style={{ position: 'absolute', left: '0', right: '0', top: '75%', borderTop: '1px dashed rgba(255,255,255,.06)' }} />
                            <svg viewBox="0 0 478 150" style={{ position: 'absolute', inset: '0', width: '100%', height: '100%', overflow: 'visible' }}>
                              <defs>
                                <linearGradient id="wedyArea" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0" style={{ stopColor: '#27c0d4', stopOpacity: '.38' }} />
                                  <stop offset="1" style={{ stopColor: '#27c0d4', stopOpacity: '0' }} />
                                </linearGradient>
                              </defs>
                              <RV as='path' variant='fade' delay={1100} duration={1400} d="M4 118.2 C35 118.2 67 101.8 98 101.8 C129 101.8 161 107.3 192 107.3 C223 107.3 255 80 286 80 C317 80 349 52.7 380 52.7 C411 52.7 443 30.9 474 30.9 L474 150 L4 150 Z" style={{ fill: 'url(#wedyArea)' }} />
                              <RV as='path' variant='draw' delay={800} duration={2000} d="M4 118.2 C35 118.2 67 101.8 98 101.8 C129 101.8 161 107.3 192 107.3 C223 107.3 255 80 286 80 C317 80 349 52.7 380 52.7 C411 52.7 443 30.9 474 30.9" style={{ fill: 'none', stroke: '#27c0d4', strokeWidth: '2.5px', strokeLinecap: 'round' }} />
                            </svg>
                            <span style={{ position: 'absolute', left: '99.16%', top: '20.6%', width: '10px', height: '10px', margin: '-5px 0 0 -5px' }}>
                              <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', background: '#27c0d4' }} className="wedy-ping" />
                              <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', background: '#27c0d4', border: '2px solid #08191f' }} />
                            </span>
                            <RV as='span' variant='pop' delay={2500} style={{ position: 'absolute', right: '-6px', top: 'calc(20.6% - 36px)', padding: '3px 8px', borderRadius: '7px', background: '#eef5f7', color: '#06141a', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>{t('lnd_128_people')}</RV>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', color: '#5b737b' }}>
                            <span>{t('lnd_may')}</span>
                            <span>{t('lnd_jun')}</span>
                            <span>{t('lnd_jul')}</span>
                            <span>{t('lnd_aug')}</span>
                            <span>{t('lnd_sep')}</span>
                            <span>{t('lnd_oct')}</span>
                          </div>
                        </div>
                        <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 12px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 6px' }}>
                            <span style={{ fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '600', fontSize: '14px', color: '#eef5f7' }}>{t('lnd_live_activity')}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', letterSpacing: '.08em', color: '#2bbd86', fontFamily: '\'Geist Mono\',monospace' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2bbd86' }} className="wedy-pulse" />
                              {t('lnd_live_2')}
                            </span>
                          </div>
                          <RV as='div' variant='left' delay={1100} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,.025)' }}>
                            <span style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,189,134,.14)', color: '#2bbd86', flexShrink: '0' }}>
                              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><CalendarCheck size={14} style={{ display: 'block' }} /></span>
                            </span>
                            <div style={{ flex: '1', minWidth: '0' }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#e3eef0' }}>{t('lnd_leave_approved')}</div>
                              <div style={{ fontSize: '11px', color: '#6b838c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_omar_alaoui_3_days')}</div>
                            </div>
                            <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', color: '#5b737b' }}>{'2m'}</span>
                          </RV>
                          <RV as='div' variant='left' delay={1250} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,.025)' }}>
                            <span style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.14)', color: '#5fe3f0', flexShrink: '0' }}>
                              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><FileText size={14} style={{ display: 'block' }} /></span>
                            </span>
                            <div style={{ flex: '1', minWidth: '0' }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#e3eef0' }}>{t('lnd_document_generated')}</div>
                              <div style={{ fontSize: '11px', color: '#6b838c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_attestation_de_travail_fr')}</div>
                            </div>
                            <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', color: '#5b737b' }}>{'6m'}</span>
                          </RV>
                          <RV as='div' variant='left' delay={1400} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,.025)' }}>
                            <span style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(154,139,240,.16)', color: '#b3a8f5', flexShrink: '0' }}>
                              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><UserPlus size={14} style={{ display: 'block' }} /></span>
                            </span>
                            <div style={{ flex: '1', minWidth: '0' }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#e3eef0' }}>{t('lnd_candidate_hired')}</div>
                              <div style={{ fontSize: '11px', color: '#6b838c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_mehdi_rami_sales')}</div>
                            </div>
                            <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', color: '#5b737b' }}>{'1h'}</span>
                          </RV>
                          <RV as='div' variant='left' delay={1550} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,.025)' }}>
                            <span style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(230,169,72,.15)', color: '#f0bd6a', flexShrink: '0' }}>
                              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Clock size={14} style={{ display: 'block' }} /></span>
                            </span>
                            <div style={{ flex: '1', minWidth: '0' }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#e3eef0' }}>{t('lnd_contract_ending')}</div>
                              <div style={{ fontSize: '11px', color: '#6b838c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_yasmine_benali_12_days')}</div>
                            </div>
                            <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', color: '#5b737b' }}>{'3h'}</span>
                          </RV>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                        <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 16px', height: '130px' }}>
                          <div style={{ fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '600', fontSize: '14px', color: '#eef5f7' }}>{t('lnd_contracts')}</div>
                          <div style={{ display: 'flex', height: '10px', borderRadius: '99px', overflow: 'hidden', marginTop: '16px', gap: '3px' }}>
                            <span style={{ width: '72%', background: '#27c0d4', borderRadius: '99px' }} />
                            <span style={{ width: '18%', background: '#9a8bf0', borderRadius: '99px' }} />
                            <span style={{ width: '10%', background: '#e6a948', borderRadius: '99px' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '14px', marginTop: '12px', fontSize: '11px', color: '#93a9b0' }}>
                            <span>{t('lnd_cdi_72')}</span>
                            <span>{t('lnd_cdd_18')}</span>
                            <span>{t('lnd_interns_10')}</span>
                          </div>
                        </div>
                        <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 16px', height: '130px' }}>
                          <div style={{ fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '600', fontSize: '14px', color: '#eef5f7' }}>{t('lnd_by_department')}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '14px' }}>
                            <span style={{ height: '7px', width: '100%', borderRadius: '99px', background: '#27c0d4' }} />
                            <span style={{ height: '7px', width: '76%', borderRadius: '99px', background: '#16b6c8' }} />
                            <span style={{ height: '7px', width: '65%', borderRadius: '99px', background: '#9a8bf0' }} />
                            <span style={{ height: '7px', width: '41%', borderRadius: '99px', background: '#2bbd86' }} />
                          </div>
                        </div>
                        <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 16px', height: '130px' }}>
                          <div style={{ fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '600', fontSize: '14px', color: '#eef5f7' }}>{t('lnd_attendance')}</div>
                          <div style={{ fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '800', fontSize: '30px', color: '#eef5f7', marginTop: '10px', letterSpacing: '-.04em' }}>{'96%'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <RV as='div' variant='right' delay={1300} style={{ position: 'absolute', left: '-64px', top: '118px', zIndex: '3' }}>
                <div style={{ transform: 'translate3d(calc(var(--mx,0) * -16px),calc(var(--my,0) * -12px),0)', transition: 'transform .5s cubic-bezier(.2,.8,.2,1)' }}>
                  <div data-seq-root="6400" style={{ width: '262px', padding: '14px', borderRadius: '18px', background: 'rgba(13,34,42,.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 30px 60px -20px rgba(0,0,0,.75)' }} className="wedy-float">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '36px', height: '36px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#6d5ad6,#9a8bf0)', color: '#ffffff', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Sparkles size={17} style={{ display: 'block' }} /></span>
                      </span>
                      <div style={{ minWidth: '0' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#eef5f7' }}>{t('lnd_attestation_de_travail')}</div>
                        <div style={{ fontSize: '11.5px', color: '#8ea5ad' }}>{t('lnd_yasmine_benali_marketing_lead')}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '13px', height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                      <div data-seq="x" data-at="0.04" data-len="0.4" style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg,#9a8bf0,#5fe3f0)', transformOrigin: 'left' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10.5px', color: '#8ea5ad' }}>{t('lnd_drafted_by_wedy_ai')}</span>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <span data-seq="pop" data-at="0.48" style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '6px', background: 'rgba(39,192,212,.16)', color: '#5fe3f0' }}>{'FR'}</span>
                        <span data-seq="pop" data-at="0.54" style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '6px', background: 'rgba(154,139,240,.18)', color: '#b3a8f5' }}>{'AR'}</span>
                        <span data-seq="pop" data-at="0.60" style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '6px', background: 'rgba(43,189,134,.16)', color: '#4fd3a0' }}>{'EN'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </RV>
              <RV as='div' variant='left' delay={1600} style={{ position: 'absolute', right: '-58px', top: '230px', zIndex: '3' }}>
                <div style={{ transform: 'translate3d(calc(var(--mx,0) * 22px),calc(var(--my,0) * 16px),0)', transition: 'transform .6s cubic-bezier(.2,.8,.2,1)' }}>
                  <div style={{ width: '294px', padding: '16px', borderRadius: '20px', background: 'rgba(240,250,251,.97)', color: '#0a1c24', boxShadow: '0 40px 80px -24px rgba(0,0,0,.8)' }} className="wedy-float2">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ position: 'relative', flexShrink: '0' }}>
                        <img src="/wedy-avatar.png" alt={''} style={{ display: 'block', width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />
                        <span style={{ position: 'absolute', right: '-1px', bottom: '-1px', width: '11px', height: '11px', borderRadius: '50%', background: '#16a06b', border: '2px solid #f0fafb' }} />
                      </span>
                      <div style={{ flex: '1' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700' }}>{t('lnd_wedy_copilot')}</div>
                        <div style={{ fontSize: '11px', color: '#52646d' }}>{t('lnd_suggestion_just_now')}</div>
                      </div>
                      <span style={{ display: 'inline-flex', width: '16px', height: '16px', color: '#6d5ad6' }}><Sparkles size={16} style={{ display: 'block' }} /></span>
                    </div>
                    <p style={{ margin: '12px 0 0', fontSize: '13.5px', lineHeight: '1.5', color: '#1d3540' }}>
                      {t('lnd_yasmine_s_cdd_ends_in')}{' '}
                      <strong style={{ color: '#b8402c' }}>{t('lnd_12_days')}</strong>
                      {t('lnd_want_me_to_draft_the_renewal')}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <span style={{ flex: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', borderRadius: '10px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: '12.5px', fontWeight: '600' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><WandSparkles size={13} style={{ display: 'block' }} /></span>
                        {t('lnd_draft_renewal')}
                      </span>
                      <span style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #d4dce0', fontSize: '12.5px', fontWeight: '600', color: '#52646d' }}>{t('lnd_later')}</span>
                    </div>
                  </div>
                </div>
              </RV>
              <RV as='div' variant='up' delay={1900} style={{ position: 'absolute', left: '110px', top: '540px', zIndex: '3' }}>
                <div style={{ transform: 'translate3d(calc(var(--mx,0) * -10px),calc(var(--my,0) * 10px),0)', transition: 'transform .5s cubic-bezier(.2,.8,.2,1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px 12px 12px', borderRadius: '16px', background: 'rgba(13,34,42,.86)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 30px 60px -20px rgba(0,0,0,.75)', '--delay': '-2.5s' } as CSSProperties} className="wedy-float">
                    <span style={{ width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,189,134,.18)', color: '#2bbd86', flexShrink: '0' }}>
                      <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Check size={17} strokeWidth={2.4} style={{ display: 'block' }} /></span>
                    </span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#eef5f7' }}>{t('lnd_leave_approved_omar_alaoui')}</div>
                      <div style={{ fontSize: '11.5px', color: '#8ea5ad' }}>{t('lnd_3_days_synced_to_google_calendar')}</div>
                    </div>
                  </div>
                </div>
              </RV>
            </div>
          </RV>
          <div data-mosaic="" aria-hidden="true" style={{ position: 'absolute', inset: '0', zIndex: '6', pointerEvents: 'none', overflow: 'hidden', opacity: '0' }} />
        </section>
        <section style={{ position: 'relative', padding: '36px 0 130px', background: '#06141a' }}>
          <RV as='p' variant='fade' style={{ margin: '0 0 26px', textAlign: 'center', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', letterSpacing: '.16em', textTransform: 'uppercase', color: '#7f969e' }}>{t('lnd_every_hr_document_in_french_2')}</RV>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)' }}>
            <div style={{ display: 'flex', width: 'max-content', '--dur': '64s' } as CSSProperties} className="wedy-marquee">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_attestation_de_travail')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_contrat_cdi')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_contrat_cdd')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_convention_de_stage')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_attestation_de_salaire')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_lettre_d_embauche')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_avenant_au_contrat')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_solde_de_tout_compte')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_attestation_de_travail')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_contrat_cdi')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_contrat_cdd')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_convention_de_stage')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_attestation_de_salaire')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_lettre_d_embauche')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_avenant_au_contrat')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#27c0d4' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_solde_de_tout_compte')}
              </span>
            </div>
            <div style={{ display: 'flex', width: 'max-content', fontFamily: '\'Noto Kufi Arabic\',sans-serif', '--dur': '70s' } as CSSProperties} className="wedy-marquee-rev">
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_2')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_3')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_4')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_5')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_6')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_7')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_8')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_2')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_3')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_4')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_5')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_6')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_7')}
              </span>
              <span dir="rtl" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '10px 14px 10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#9a8bf0' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_s_8')}
              </span>
            </div>
            <div style={{ display: 'flex', width: 'max-content', '--dur': '76s' } as CSSProperties} className="wedy-marquee">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_work_certificate')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_permanent_contract')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_fixed_term_contract')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_internship_agreement')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_salary_certificate')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_offer_letter')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_contract_amendment')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_final_settlement')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_work_certificate')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_permanent_contract')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_fixed_term_contract')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_internship_agreement')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_salary_certificate')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_offer_letter')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_contract_amendment')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginRight: '12px', padding: '11px 20px 11px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', fontSize: '15px', color: '#cfdde1', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#2bbd86' }}><FileText size={15} style={{ display: 'block' }} /></span>
                {t('lnd_final_settlement')}
              </span>
            </div>
          </div>
        </section>
        <div style={{ position: 'relative', zIndex: '2', marginTop: '-56px', background: '#f3f6f7', color: '#0a1c24', borderRadius: '44px 44px 0 0' }}>
          <section id="copilot" style={{ padding: '120px 24px 90px', scrollMarginTop: '30px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,440px),1fr))', gap: '64px', alignItems: 'center' }}>
              <div>
                <RV as='div' variant='up' style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', color: '#0e6f84' }}>
                  <span style={{ width: '24px', height: '1px', background: '#0e6f84' }} />
                  {t('lnd_01_wedy_copilot')}
                </RV>
                <RV as='h2' variant='up' delay={80} style={{ margin: '18px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(38px,4.8vw,62px)', lineHeight: '1', letterSpacing: '-.045em', color: '#0a1c24', textWrap: 'balance' }}>
                  {t('lnd_meet_wedy_your_ai_hr')}{' '}
                  <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
                    <RV as='span' variant='growx' delay={700} style={{ position: 'absolute', left: '-4px', right: '-4px', bottom: '.04em', height: '.36em', borderRadius: '6px', background: 'linear-gradient(90deg,rgba(22,182,200,.38),rgba(109,90,214,.32))', transformOrigin: 'left' }} />
                    <span style={{ position: 'relative' }}>{t('lnd_co_worker')}</span>
                  </span>
                </RV>
                <RV as='p' variant='up' delay={160} style={{ margin: '22px 0 0', maxWidth: '520px', fontSize: '18px', lineHeight: '1.6', color: '#52646d', textWrap: 'pretty' }}>{t('lnd_ask_in_french_arabic_or_english')}</RV>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '34px' }}>
                  <RV as='button' variant='up' delay={200} type="button" onClick={v.pick0} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '14px', width: '100%', padding: '16px 18px', borderRadius: '18px', border: '1px solid #e2e8eb', background: '#ffffff', textAlign: 'left', cursor: 'pointer', overflow: 'hidden', fontFamily: 'inherit', transition: 'border-color .2s,box-shadow .2s' }} className="lnd-h7">
                    {v.s0 ? (
                      <>
                      <span style={{ position: 'absolute', inset: '0', borderRadius: '18px', boxShadow: 'inset 0 0 0 1.5px #16b6c8', background: 'linear-gradient(135deg,rgba(22,182,200,.07),rgba(109,90,214,.05))', pointerEvents: 'none' }} />
                      <span style={{ position: 'absolute', left: '18px', right: '18px', bottom: '0', height: '3px', borderRadius: '3px', background: 'rgba(22,182,200,.15)', overflow: 'hidden' }}>
                        <span data-scen-bar="" style={{ display: 'block', height: '100%', background: 'linear-gradient(90deg,#16b6c8,#6d5ad6)', transformOrigin: 'left' }} />
                      </span>
                      </>
                    ) : null}
                    <span style={{ position: 'relative', flexShrink: '0', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }}>
                      <span style={{ display: 'inline-flex', width: '20px', height: '20px' }}><FileText size={20} style={{ display: 'block' }} /></span>
                    </span>
                    <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '17px', color: '#0a1c24', letterSpacing: '-.01em' }}>{t('lnd_draft_any_hr_document')}</span>
                      <span style={{ fontSize: '14px', lineHeight: '1.5', color: '#52646d' }}>{t('lnd_contracts_certificates_and')}</span>
                    </span>
                  </RV>
                  <RV as='button' variant='up' delay={280} type="button" onClick={v.pick1} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '14px', width: '100%', padding: '16px 18px', borderRadius: '18px', border: '1px solid #e2e8eb', background: '#ffffff', textAlign: 'left', cursor: 'pointer', overflow: 'hidden', fontFamily: 'inherit', transition: 'border-color .2s,box-shadow .2s' }} className="lnd-h7">
                    {v.s1 ? (
                      <>
                      <span style={{ position: 'absolute', inset: '0', borderRadius: '18px', boxShadow: 'inset 0 0 0 1.5px #6d5ad6', background: 'linear-gradient(135deg,rgba(109,90,214,.07),rgba(22,182,200,.05))', pointerEvents: 'none' }} />
                      <span style={{ position: 'absolute', left: '18px', right: '18px', bottom: '0', height: '3px', borderRadius: '3px', background: 'rgba(109,90,214,.15)', overflow: 'hidden' }}>
                        <span data-scen-bar="" style={{ display: 'block', height: '100%', background: 'linear-gradient(90deg,#6d5ad6,#16b6c8)', transformOrigin: 'left' }} />
                      </span>
                      </>
                    ) : null}
                    <span style={{ position: 'relative', flexShrink: '0', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6' }}>
                      <span style={{ display: 'inline-flex', width: '20px', height: '20px' }}><Scale size={20} style={{ display: 'block' }} /></span>
                    </span>
                    <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '17px', color: '#0a1c24', letterSpacing: '-.01em' }}>{t('lnd_ask_about_moroccan_labor_law')}</span>
                      <span style={{ fontSize: '14px', lineHeight: '1.5', color: '#52646d' }}>{t('lnd_notice_periods_leave_rules_cnss')}</span>
                    </span>
                  </RV>
                  <RV as='button' variant='up' delay={360} type="button" onClick={v.pick2} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '14px', width: '100%', padding: '16px 18px', borderRadius: '18px', border: '1px solid #e2e8eb', background: '#ffffff', textAlign: 'left', cursor: 'pointer', overflow: 'hidden', fontFamily: 'inherit', transition: 'border-color .2s,box-shadow .2s' }} className="lnd-h7">
                    {v.s2 ? (
                      <>
                      <span style={{ position: 'absolute', inset: '0', borderRadius: '18px', boxShadow: 'inset 0 0 0 1.5px #16a06b', background: 'linear-gradient(135deg,rgba(22,160,107,.07),rgba(22,182,200,.05))', pointerEvents: 'none' }} />
                      <span style={{ position: 'absolute', left: '18px', right: '18px', bottom: '0', height: '3px', borderRadius: '3px', background: 'rgba(22,160,107,.15)', overflow: 'hidden' }}>
                        <span data-scen-bar="" style={{ display: 'block', height: '100%', background: 'linear-gradient(90deg,#16a06b,#16b6c8)', transformOrigin: 'left' }} />
                      </span>
                      </>
                    ) : null}
                    <span style={{ position: 'relative', flexShrink: '0', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b' }}>
                      <span style={{ display: 'inline-flex', width: '20px', height: '20px' }}><ChartColumn size={20} style={{ display: 'block' }} /></span>
                    </span>
                    <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '17px', color: '#0a1c24', letterSpacing: '-.01em' }}>{t('lnd_analyze_your_team_data')}</span>
                      <span style={{ fontSize: '14px', lineHeight: '1.5', color: '#52646d' }}>{t('lnd_absenteeism_headcount_and')}</span>
                    </span>
                  </RV>
                </div>
                <RV as='div' variant='up' delay={200} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '22px' }}>
                  <span style={{ fontSize: '13px', color: '#5f7079', marginRight: '4px' }}>{t('lnd_quick_commands')}</span>
                  <span dir="ltr" style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', padding: '5px 10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8eb', color: '#0e6f84' }}>{t('lnd_doc')}</span>
                  <span dir="ltr" style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', padding: '5px 10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8eb', color: '#0e6f84' }}>{t('lnd_emp')}</span>
                  <span dir="ltr" style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', padding: '5px 10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8eb', color: '#0e6f84' }}>{t('lnd_conge')}</span>
                  <span dir="ltr" style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', padding: '5px 10px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8eb', color: '#0e6f84' }}>{t('lnd_aide')}</span>
                </RV>
              </div>
              <RV as='div' variant='scale' delay={150} data-chat="" style={{ position: 'relative' }}>
                <div aria-hidden="true" style={{ position: 'absolute', inset: '-40px -30px', background: 'radial-gradient(50% 50% at 75% 25%,rgba(22,182,200,.24),transparent),radial-gradient(45% 45% at 20% 85%,rgba(109,90,214,.2),transparent)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', borderRadius: '28px', background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 50px 100px -40px rgba(10,28,36,.4),0 0 0 6px rgba(255,255,255,.55)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #edf1f3' }}>
                    <span style={{ position: 'relative', flexShrink: '0' }}>
                      <img src="/wedy-avatar.png" alt={t('lnd_wedy')} style={{ display: 'block', width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />
                      <span style={{ position: 'absolute', right: '0', bottom: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#16a06b', border: '2px solid #ffffff' }} />
                    </span>
                    <div style={{ flex: '1', minWidth: '0' }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: '#0a1c24' }}>{t('lnd_wedy_copilot')}</div>
                      <div style={{ fontSize: '12.5px', color: '#52646d' }}>{t('lnd_powered_by_claude_knows_your_team')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', padding: '3px', borderRadius: '10px', background: '#f3f6f7', fontSize: '12px', fontWeight: '600', color: '#5f7079' }}>
                      <span style={{ padding: '4px 9px', borderRadius: '7px', background: '#ffffff', color: '#0e6f84', boxShadow: '0 1px 2px rgba(10,28,36,.1)' }}>{'EN'}</span>
                      <span style={{ padding: '4px 9px' }}>{'FR'}</span>
                      <span style={{ padding: '4px 9px', fontFamily: '\'Noto Kufi Arabic\',sans-serif' }}>{'ع'}</span>
                    </div>
                  </div>
                  <div style={{ height: '450px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '14px', backgroundColor: '#f8fafb', backgroundImage: 'radial-gradient(#e3e9ec 1px,transparent 1px)', backgroundSize: '20px 20px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', maxWidth: '88%' }}>
                      <img src="/wedy-avatar.png" alt={''} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: '0', background: '#e4f2f4' }} />
                      <div style={{ padding: '11px 14px', borderRadius: '16px 16px 16px 4px', background: '#ffffff', border: '1px solid #e8eef0', fontSize: '14px', lineHeight: '1.5', color: '#1d3540' }}>{t('lnd_hi_salma_what_can_i_take_off_your')}</div>
                    </div>
                    {v.u0 ? (
                      <>
                      <RV as='div' variant='up' style={{ alignSelf: 'flex-end', maxWidth: '82%', padding: '11px 15px', borderRadius: '16px 16px 4px 16px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: '14px', lineHeight: '1.5' }}>{t('lnd_draft_a_work_certificate_for')}</RV>
                      </>
                    ) : null}
                    {v.u1 ? (
                      <>
                      <RV as='div' variant='up' style={{ alignSelf: 'flex-end', maxWidth: '82%', padding: '11px 15px', borderRadius: '16px 16px 4px 16px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: '14px', lineHeight: '1.5' }}>{t('lnd_what_s_the_legal_notice_period')}</RV>
                      </>
                    ) : null}
                    {v.u2 ? (
                      <>
                      <RV as='div' variant='up' style={{ alignSelf: 'flex-end', maxWidth: '82%', padding: '11px 15px', borderRadius: '16px 16px 4px 16px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: '14px', lineHeight: '1.5' }}>{t('lnd_which_departments_had_the_most')}</RV>
                      </>
                    ) : null}
                    {v.typing ? (
                      <>
                      <RV as='div' variant='up' style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                        <img src="/wedy-avatar.png" alt={''} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: '0', background: '#e4f2f4' }} />
                        <div style={{ display: 'flex', gap: '5px', padding: '15px 16px', borderRadius: '16px 16px 16px 4px', background: '#ffffff', border: '1px solid #e8eef0' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16b6c8' }} className="wedy-dot" />
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16b6c8', '--delay': '0.15s' } as CSSProperties} className="wedy-dot" />
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16b6c8', '--delay': '0.3s' } as CSSProperties} className="wedy-dot" />
                        </div>
                      </RV>
                      </>
                    ) : null}
                    {v.a0 ? (
                      <>
                      <RV as='div' variant='up' style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', maxWidth: '94%' }}>
                        <img src="/wedy-avatar.png" alt={''} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: '0', background: '#e4f2f4' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '16px 16px 16px 4px', background: '#ffffff', border: '1px solid #e8eef0', minWidth: '0' }}>
                          <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#1d3540', padding: '0 2px' }}>{t('lnd_done_here_s_the_work_certificate')}</div>
                          <div style={{ borderRadius: '12px', border: '1px solid #e2e8eb', background: '#fbfcfc', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10.5px', letterSpacing: '.14em', color: '#0e6f84' }}>{t('lnd_attestation_de_travail_2')}</span>
                              <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '6px', background: '#e4f2f4', color: '#0e6f84' }}>{'FR'}</span>
                            </div>
                            <RV as='div' variant='fade' delay={250} style={{ marginTop: '10px', fontFamily: 'Georgia,\'Times New Roman\',serif', fontSize: '13px', lineHeight: '1.6', color: '#33474f' }}>
                              {t('lnd_nous_soussignes')}{' '}
                              <strong>{t('lnd_tython_sarl')}</strong>
                              {t('lnd_attestons_que_mme')}{' '}
                              <strong>{t('lnd_yasmine_benali')}</strong>
                              {' '}{t('lnd_occupe_le_poste_de_responsable')}
                            </RV>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '55%' }}>
                                <RV as='span' variant='growx' delay={500} style={{ display: 'block', height: '5px', width: '100%', borderRadius: '4px', background: '#e3eaed', transformOrigin: 'left' }} />
                                <RV as='span' variant='growx' delay={600} style={{ display: 'block', height: '5px', width: '70%', borderRadius: '4px', background: '#e3eaed', transformOrigin: 'left' }} />
                                <span style={{ fontSize: '11px', color: '#5f7079', marginTop: '4px' }}>{t('lnd_fait_a_casablanca')}</span>
                              </div>
                              <RV as='span' variant='pop' delay={900} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '58px', height: '58px', borderRadius: '50%', border: '2px solid rgba(14,111,132,.6)', color: '#0e6f84', fontFamily: '\'Geist Mono\',monospace', fontSize: '8px', fontWeight: '600', letterSpacing: '.08em', lineHeight: '1.3', transform: 'rotate(-14deg)' }}>
                                <span>{t('lnd_tython')}</span>
                                <span>{t('lnd_sarl')}</span>
                              </RV>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '9px', background: '#0a1c24', color: '#ffffff', fontSize: '12.5px', fontWeight: '600' }}>
                              <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Download size={13} style={{ display: 'block' }} /></span>
                              {t('lnd_download_pdf')}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '9px', border: '1px solid #e2e8eb', color: '#33474f', fontSize: '12.5px', fontWeight: '600' }}>
                              <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Languages size={13} style={{ display: 'block' }} /></span>
                              {t('lnd_translate_to_arabic')}
                            </span>
                          </div>
                        </div>
                      </RV>
                      </>
                    ) : null}
                    {v.a1 ? (
                      <>
                      <RV as='div' variant='up' style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', maxWidth: '94%' }}>
                        <img src="/wedy-avatar.png" alt={''} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: '0', background: '#e4f2f4' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '16px 16px 16px 4px', background: '#ffffff', border: '1px solid #e8eef0', minWidth: '0' }}>
                          <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#1d3540', padding: '0 2px' }}>{t('lnd_under_decree_2_04_469_the_notice')}</div>
                          <div style={{ borderRadius: '12px', border: '1px solid #e2e8eb', overflow: 'hidden', fontSize: '13px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', background: '#f3f6f7', color: '#5f7079', fontWeight: '600', fontSize: '12px' }}>
                              <span style={{ padding: '9px 12px' }}>{t('lnd_seniority')}</span>
                              <span style={{ padding: '9px 12px' }}>{t('lnd_managers')}</span>
                              <span style={{ padding: '9px 12px' }}>{t('lnd_employees_workers')}</span>
                            </div>
                            <RV as='div' variant='right' delay={150} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', borderTop: '1px solid #edf1f3', color: '#1d3540' }}>
                              <span style={{ padding: '10px 12px' }}>{t('lnd_under_1_year')}</span>
                              <span style={{ padding: '10px 12px', fontWeight: '600', color: '#0e6f84' }}>{t('lnd_1_month')}</span>
                              <span style={{ padding: '10px 12px', fontWeight: '600', color: '#0e6f84' }}>{t('lnd_8_days')}</span>
                            </RV>
                            <RV as='div' variant='right' delay={300} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', borderTop: '1px solid #edf1f3', color: '#1d3540' }}>
                              <span style={{ padding: '10px 12px' }}>{t('lnd_1_to_5_years')}</span>
                              <span style={{ padding: '10px 12px', fontWeight: '600', color: '#0e6f84' }}>{t('lnd_2_months')}</span>
                              <span style={{ padding: '10px 12px', fontWeight: '600', color: '#0e6f84' }}>{t('lnd_1_month')}</span>
                            </RV>
                            <RV as='div' variant='right' delay={450} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', borderTop: '1px solid #edf1f3', color: '#1d3540' }}>
                              <span style={{ padding: '10px 12px' }}>{t('lnd_over_5_years')}</span>
                              <span style={{ padding: '10px 12px', fontWeight: '600', color: '#0e6f84' }}>{t('lnd_3_months')}</span>
                              <span style={{ padding: '10px 12px', fontWeight: '600', color: '#0e6f84' }}>{t('lnd_2_months')}</span>
                            </RV>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#5f7079', padding: '0 2px' }}>
                            <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Info size={14} style={{ display: 'block' }} /></span>
                            {t('lnd_indicative_answer_confirm_edge')}
                          </div>
                        </div>
                      </RV>
                      </>
                    ) : null}
                    {v.a2 ? (
                      <>
                      <RV as='div' variant='up' style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', maxWidth: '94%' }}>
                        <img src="/wedy-avatar.png" alt={''} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: '0', background: '#e4f2f4' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '16px 16px 16px 4px', background: '#ffffff', border: '1px solid #e8eef0', minWidth: '0', flex: '1' }}>
                          <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#1d3540', padding: '0 2px' }}>{t('lnd_absence_rate_this_quarter_by')}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8eb', background: '#fbfcfc' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr 42px', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                              <span style={{ color: '#33474f' }}>{t('lnd_logistics')}</span>
                              <span style={{ height: '9px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden' }}>
                                <RV as='span' variant='growx' delay={150} style={{ display: 'block', height: '100%', width: '100%', borderRadius: '99px', background: 'linear-gradient(90deg,#df9326,#df5740)', transformOrigin: 'left' }} />
                              </span>
                              <span style={{ fontWeight: '700', color: '#b8402c', textAlign: 'right' }}>{'6.2%'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr 42px', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                              <span style={{ color: '#33474f' }}>{t('lnd_customer_care')}</span>
                              <span style={{ height: '9px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden' }}>
                                <RV as='span' variant='growx' delay={280} style={{ display: 'block', height: '100%', width: '77%', borderRadius: '99px', background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', transformOrigin: 'left' }} />
                              </span>
                              <span style={{ fontWeight: '700', color: '#0a1c24', textAlign: 'right' }}>{'4.8%'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr 42px', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                              <span style={{ color: '#33474f' }}>{t('lnd_sales')}</span>
                              <span style={{ height: '9px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden' }}>
                                <RV as='span' variant='growx' delay={410} style={{ display: 'block', height: '100%', width: '50%', borderRadius: '99px', background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', transformOrigin: 'left' }} />
                              </span>
                              <span style={{ fontWeight: '700', color: '#0a1c24', textAlign: 'right' }}>{'3.1%'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '104px 1fr 42px', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                              <span style={{ color: '#33474f' }}>{t('lnd_finance')}</span>
                              <span style={{ height: '9px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden' }}>
                                <RV as='span' variant='growx' delay={540} style={{ display: 'block', height: '100%', width: '23%', borderRadius: '99px', background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', transformOrigin: 'left' }} />
                              </span>
                              <span style={{ fontWeight: '700', color: '#0a1c24', textAlign: 'right' }}>{'1.4%'}</span>
                            </div>
                          </div>
                          <RV as='div' variant='up' delay={800} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '10px', background: '#ece9fb', color: '#3d2f99', fontSize: '13px', lineHeight: '1.5' }}>
                            <span style={{ display: 'inline-flex', width: '15px', height: '15px', marginTop: '2px' }}><Sparkles size={15} style={{ display: 'block' }} /></span>
                            <span>{t('lnd_logistics_is_nearly_2_the_company')}</span>
                          </RV>
                        </div>
                      </RV>
                      </>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderTop: '1px solid #edf1f3', background: '#ffffff' }}>
                    <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#7d8f97' }}><Paperclip size={18} style={{ display: 'block' }} /></span>
                    <div ref={inputBoxRef} style={{ flex: '1', minWidth: '0', display: 'flex', alignItems: 'center', height: '44px', padding: '0 14px', borderRadius: '12px', background: '#f3f6f7', border: '1px solid #e2e8eb', fontSize: '14px', color: '#0a1c24', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      <span ref={inputRef} style={{ whiteSpace: 'pre' }} />
                      <span style={{ display: 'inline-block', width: '2px', height: '18px', marginLeft: '1px', background: '#16b6c8', flexShrink: '0' }} className="wedy-blink" />
                      {v.showPh ? (
                        <>
                        <span style={{ color: '#6b7c84', marginLeft: '6px' }}>{t('lnd_ask_wedy_anything')}</span>
                        </>
                      ) : null}
                    </div>
                    <span style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', flexShrink: '0', boxShadow: '0 8px 20px -8px rgba(22,182,200,.8)' }}>
                      <span style={{ display: 'inline-flex', width: '18px', height: '18px' }}><ArrowUp size={18} strokeWidth={2.2} style={{ display: 'block' }} /></span>
                    </span>
                  </div>
                </div>
              </RV>
            </div>
          </section>
          <section id="features" style={{ padding: '40px 24px 140px', scrollMarginTop: '30px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
                <div style={{ maxWidth: '660px' }}>
                  <RV as='div' variant='up' style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', color: '#0e6f84' }}>
                    <span style={{ width: '24px', height: '1px', background: '#0e6f84' }} />
                    {t('lnd_02_features')}
                  </RV>
                  <RV as='h2' variant='up' delay={80} style={{ margin: '18px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(38px,4.8vw,62px)', lineHeight: '1', letterSpacing: '-.045em', color: '#0a1c24', textWrap: 'balance' }}>{t('lnd_everything_hr_teams_need_nothing')}</RV>
                </div>
                <RV as='p' variant='up' delay={160} style={{ maxWidth: '380px', margin: '0', fontSize: '17px', lineHeight: '1.6', color: '#52646d', textWrap: 'pretty' }}>{t('lnd_from_document_generation_to')}</RV>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '56px' }}>
                <RV as='div' variant='up' data-tilt="4" style={{ position: 'relative', flex: '7 1 480px', borderRadius: '28px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: 'perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .4s cubic-bezier(.2,.8,.2,1),box-shadow .4s' }} className="lnd-h8">
                  <span style={{ position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none', background: 'radial-gradient(420px circle at var(--sx,-999px) var(--sy,-999px),rgba(22,182,200,.12),transparent 45%)' }} />
                  <div data-seq-root="7000" style={{ position: 'relative', height: '300px', background: 'linear-gradient(180deg,#eaf5f6,#ffffff)', borderBottom: '1px solid #eef2f4', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', padding: '0 28px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '220px', flexShrink: '1', minWidth: '0' }}>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10.5px', letterSpacing: '.12em', color: '#5f7079', marginBottom: '2px' }}>{t('lnd_templates_2')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb', fontSize: '13px', color: '#33474f' }}>
                        <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#7d8f97' }}><FileText size={15} style={{ display: 'block' }} /></span>
                        {t('lnd_contrat_cdi')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: '#ffffff', border: '1.5px solid #16b6c8', boxShadow: '0 10px 22px -12px rgba(22,182,200,.7)', fontSize: '13px', fontWeight: '600', color: '#0a1c24' }}>
                        <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#0e6f84' }}><FileCheck size={15} style={{ display: 'block' }} /></span>
                        <span style={{ flex: '1', whiteSpace: 'nowrap' }}>{t('lnd_attestation_de_travail')}</span>
                        <span data-seq="pop" data-at="0.02" style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#16b6c8', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' }}>
                          <span style={{ display: 'inline-flex', width: '11px', height: '11px' }}><Check size={11} strokeWidth={3} style={{ display: 'block' }} /></span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb', fontSize: '13px', color: '#33474f' }}>
                        <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#7d8f97' }}><FileText size={15} style={{ display: 'block' }} /></span>
                        {t('lnd_lettre_d_embauche')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb', fontSize: '13px', color: '#33474f' }}>
                        <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#7d8f97' }}><FileText size={15} style={{ display: 'block' }} /></span>
                        {t('lnd_convention_de_stage')}
                      </div>
                    </div>
                    <div style={{ position: 'relative', width: '216px', height: '252px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 30px 60px -30px rgba(10,28,36,.4)', padding: '20px 18px', transform: 'rotate(2.5deg)', flexShrink: '0' }}>
                      <div data-seq="x" data-at="0.08" style={{ height: '8px', width: '62%', borderRadius: '4px', background: '#0a1c24', transformOrigin: 'left' }} />
                      <div data-seq="x" data-at="0.13" style={{ height: '5px', width: '40%', borderRadius: '3px', background: '#a9b7bd', marginTop: '8px', transformOrigin: 'left' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '20px' }}>
                        <div data-seq="x" data-at="0.19" style={{ height: '5px', width: '100%', borderRadius: '3px', background: '#dde5e8', transformOrigin: 'left' }} />
                        <div data-seq="x" data-at="0.23" style={{ height: '5px', width: '94%', borderRadius: '3px', background: '#dde5e8', transformOrigin: 'left' }} />
                        <div data-seq="x" data-at="0.27" style={{ height: '5px', width: '98%', borderRadius: '3px', background: '#dde5e8', transformOrigin: 'left' }} />
                        <div data-seq="x" data-at="0.31" style={{ height: '5px', width: '72%', borderRadius: '3px', background: '#b9dfe5', transformOrigin: 'left' }} />
                        <div data-seq="x" data-at="0.35" style={{ height: '5px', width: '96%', borderRadius: '3px', background: '#dde5e8', transformOrigin: 'left' }} />
                        <div data-seq="x" data-at="0.39" style={{ height: '5px', width: '60%', borderRadius: '3px', background: '#dde5e8', transformOrigin: 'left' }} />
                      </div>
                      <div style={{ position: 'absolute', left: '18px', right: '18px', bottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div data-seq="x" data-at="0.47" style={{ height: '5px', width: '72px', borderRadius: '3px', background: '#dde5e8', transformOrigin: 'left' }} />
                          <div data-seq="x" data-at="0.51" style={{ height: '5px', width: '50px', borderRadius: '3px', background: '#dde5e8', transformOrigin: 'left' }} />
                        </div>
                        <div data-seq="pop" data-at="0.58" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #16b6c8', color: '#0e6f84', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-14deg)', background: 'rgba(22,182,200,.06)' }}>
                          <span style={{ display: 'inline-flex', width: '26px', height: '26px' }}><BadgeCheck size={26} style={{ display: 'block' }} /></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', padding: '26px 28px 30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }}>
                        <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><WandSparkles size={17} style={{ display: 'block' }} /></span>
                      </span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.12em', color: '#0e6f84' }}>{t('lnd_document_generation')}</span>
                    </div>
                    <h3 style={{ margin: '16px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '27px', letterSpacing: '-.03em', color: '#0a1c24' }}>{t('lnd_hr_documents_in_seconds_not_hours')}</h3>
                    <p style={{ margin: '8px 0 0', fontSize: '15.5px', lineHeight: '1.6', color: '#52646d', maxWidth: '520px' }}>{t('lnd_contracts_attestations_and')}</p>
                  </div>
                </RV>
                <RV as='div' variant='up' delay={100} data-tilt="4" style={{ position: 'relative', flex: '5 1 360px', borderRadius: '28px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: 'perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .4s cubic-bezier(.2,.8,.2,1),box-shadow .4s' }} className="lnd-h8">
                  <span style={{ position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none', background: 'radial-gradient(420px circle at var(--sx,-999px) var(--sy,-999px),rgba(109,90,214,.12),transparent 45%)' }} />
                  <div data-cycle="2800" style={{ position: 'relative', height: '300px', background: 'radial-gradient(120% 90% at 50% 0%,#ece9fb,#ffffff 72%)', borderBottom: '1px solid #eef2f4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '24px' }}>
                    <div style={{ display: 'grid', placeItems: 'center', width: '100%', minHeight: '124px', textAlign: 'center' }}>
                      <div data-cycle-item="" style={{ gridArea: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(28px,3vw,36px)', letterSpacing: '-.035em', color: '#0a1c24' }}>{t('lnd_attestation_de_travail')}</div>
                        <div style={{ fontFamily: 'Georgia,\'Times New Roman\',serif', fontSize: '14.5px', color: '#52646d', maxWidth: '300px', lineHeight: '1.5' }}>{t('lnd_nous_attestons_que_mme_yasmine')}</div>
                      </div>
                      <div data-cycle-item="" dir="rtl" style={{ gridArea: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', opacity: '0', fontFamily: '\'Noto Kufi Arabic\',sans-serif' }}>
                        <div style={{ fontWeight: '700', fontSize: 'clamp(26px,2.8vw,34px)', color: '#0a1c24' }}>{t('lnd_s')}</div>
                        <div style={{ fontSize: '14px', color: '#52646d', maxWidth: '300px', lineHeight: '1.8' }}>{t('lnd_s_9')}</div>
                      </div>
                      <div data-cycle-item="" style={{ gridArea: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', opacity: '0' }}>
                        <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(28px,3vw,36px)', letterSpacing: '-.035em', color: '#0a1c24' }}>{t('lnd_work_certificate')}</div>
                        <div style={{ fontFamily: 'Georgia,\'Times New Roman\',serif', fontSize: '14.5px', color: '#52646d', maxWidth: '300px', lineHeight: '1.5' }}>{t('lnd_we_certify_that_ms_yasmine_benali')}</div>
                      </div>
                    </div>
                    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3,64px)', padding: '4px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 8px 18px -12px rgba(10,28,36,.35)' }}>
                      <span data-cycle-pill="" style={{ position: 'absolute', left: '4px', top: '4px', bottom: '4px', width: '64px', borderRadius: '9px', background: '#0a1c24', transition: 'transform .6s cubic-bezier(.2,.8,.2,1)' }} />
                      <span data-cycle-tab="" data-on="#ffffff" data-off="#52646d" style={{ position: 'relative', textAlign: 'center', padding: '7px 0', fontSize: '13px', fontWeight: '600', color: '#ffffff', transition: 'color .3s' }}>{'FR'}</span>
                      <span data-cycle-tab="" data-on="#ffffff" data-off="#52646d" style={{ position: 'relative', textAlign: 'center', padding: '7px 0', fontSize: '13px', fontWeight: '600', color: '#52646d', transition: 'color .3s', fontFamily: '\'Noto Kufi Arabic\',sans-serif' }}>{'ع'}</span>
                      <span data-cycle-tab="" data-on="#ffffff" data-off="#52646d" style={{ position: 'relative', textAlign: 'center', padding: '7px 0', fontSize: '13px', fontWeight: '600', color: '#52646d', transition: 'color .3s' }}>{'EN'}</span>
                    </div>
                  </div>
                  <div style={{ position: 'relative', padding: '26px 28px 30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6' }}>
                        <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Languages size={17} style={{ display: 'block' }} /></span>
                      </span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.12em', color: '#6d5ad6' }}>{t('lnd_trilingual')}</span>
                    </div>
                    <h3 style={{ margin: '16px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '27px', letterSpacing: '-.03em', color: '#0a1c24' }}>{t('lnd_fluent_in_french_arabic_and')}</h3>
                    <p style={{ margin: '8px 0 0', fontSize: '15.5px', lineHeight: '1.6', color: '#52646d' }}>{t('lnd_every_template_in_three_languages')}</p>
                  </div>
                </RV>
                <RV as='div' variant='up' data-tilt="5" style={{ position: 'relative', flex: '1 1 320px', borderRadius: '28px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: 'perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .4s cubic-bezier(.2,.8,.2,1),box-shadow .4s' }} className="lnd-h8">
                  <span style={{ position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none', background: 'radial-gradient(380px circle at var(--sx,-999px) var(--sy,-999px),rgba(22,160,107,.12),transparent 45%)' }} />
                  <div style={{ height: '250px', background: 'linear-gradient(180deg,#e7f5ee,#ffffff)', borderBottom: '1px solid #eef2f4', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '9px', padding: '22px' }}>
                    <RV as='div' variant='right' delay={100} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb', fontSize: '13.5px', color: '#1d3540' }}>
                      <RV as='span' variant='pop' delay={450} style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#16a06b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Check size={13} strokeWidth={3} style={{ display: 'block' }} /></span>
                      </RV>
                      <span style={{ flex: '1' }}>{t('lnd_notice_periods')}</span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#5f7079' }}>{'2-04-469'}</span>
                    </RV>
                    <RV as='div' variant='right' delay={200} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb', fontSize: '13.5px', color: '#1d3540' }}>
                      <RV as='span' variant='pop' delay={550} style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#16a06b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Check size={13} strokeWidth={3} style={{ display: 'block' }} /></span>
                      </RV>
                      <span style={{ flex: '1' }}>{t('lnd_cnss_ice_on_documents')}</span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#5f7079' }}>{t('lnd_auto')}</span>
                    </RV>
                    <RV as='div' variant='right' delay={300} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb', fontSize: '13.5px', color: '#1d3540' }}>
                      <RV as='span' variant='pop' delay={650} style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#16a06b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Check size={13} strokeWidth={3} style={{ display: 'block' }} /></span>
                      </RV>
                      <span style={{ flex: '1' }}>{t('lnd_moroccan_public_holidays')}</span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#5f7079' }}>{t('lnd_preloaded')}</span>
                    </RV>
                    <RV as='div' variant='right' delay={400} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb', fontSize: '13.5px', color: '#1d3540' }}>
                      <RV as='span' variant='pop' delay={750} style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#16a06b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Check size={13} strokeWidth={3} style={{ display: 'block' }} /></span>
                      </RV>
                      <span style={{ flex: '1' }}>{t('lnd_leave_accrual')}</span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#5f7079' }}>{t('lnd_1_5_d_month')}</span>
                    </RV>
                  </div>
                  <div style={{ position: 'relative', padding: '24px 26px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b' }}>
                        <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Scale size={17} style={{ display: 'block' }} /></span>
                      </span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.12em', color: '#0f7a51' }}>{t('lnd_compliance')}</span>
                    </div>
                    <h3 style={{ margin: '16px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '24px', letterSpacing: '-.03em', color: '#0a1c24' }}>{t('lnd_built_for_moroccan_labor_law')}</h3>
                    <p style={{ margin: '8px 0 0', fontSize: '15px', lineHeight: '1.6', color: '#52646d' }}>{t('lnd_templates_and_rules_aligned_with')}</p>
                  </div>
                </RV>
                <RV as='div' variant='up' delay={100} data-tilt="5" style={{ position: 'relative', flex: '1 1 320px', borderRadius: '28px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: 'perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .4s cubic-bezier(.2,.8,.2,1),box-shadow .4s' }} className="lnd-h8">
                  <span style={{ position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none', background: 'radial-gradient(380px circle at var(--sx,-999px) var(--sy,-999px),rgba(22,182,200,.12),transparent 45%)' }} />
                  <div style={{ height: '250px', background: 'linear-gradient(180deg,#e9f1f8,#ffffff)', borderBottom: '1px solid #eef2f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '22px' }}>
                    <RV as='div' variant='scale' delay={150} style={{ width: '100%', maxWidth: '300px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 22px 44px -26px rgba(10,28,36,.4)', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontWeight: '700', fontSize: '15px', flexShrink: '0' }}>{'YB'}</span>
                        <div style={{ flex: '1', minWidth: '0' }}>
                          <div style={{ fontWeight: '700', fontSize: '14.5px', color: '#0a1c24' }}>{t('lnd_yasmine_benali')}</div>
                          <div style={{ fontSize: '12px', color: '#52646d' }}>{t('lnd_marketing_lead_cdi')}</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '99px', background: '#e1f5ec', color: '#0f6f49' }}>{t('lnd_active')}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginTop: '14px' }}>
                        <div style={{ padding: '8px 10px', borderRadius: '10px', background: '#f3f6f7' }}>
                          <div style={{ fontSize: '10.5px', color: '#5f7079' }}>{t('lnd_leave_left')}</div>
                          <CountText as='div' text={'14.5 d'} style={{ fontWeight: '700', fontSize: '15px', color: '#0a1c24' }} />
                        </div>
                        <div style={{ padding: '8px 10px', borderRadius: '10px', background: '#f3f6f7' }}>
                          <div style={{ fontSize: '10.5px', color: '#5f7079' }}>{t('lnd_documents_2')}</div>
                          <CountText as='div' text={'12'} style={{ fontWeight: '700', fontSize: '15px', color: '#0a1c24' }} />
                        </div>
                        <div style={{ padding: '8px 10px', borderRadius: '10px', background: '#f3f6f7' }}>
                          <div style={{ fontSize: '10.5px', color: '#5f7079' }}>{t('lnd_seniority')}</div>
                          <CountText as='div' text={'4.6 y'} style={{ fontWeight: '700', fontSize: '15px', color: '#0a1c24' }} />
                        </div>
                      </div>
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#52646d' }}>
                          <span>{t('lnd_profile_completeness')}</span>
                          <span style={{ fontWeight: '700', color: '#0e6f84' }}>{'92%'}</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '99px', background: '#eef2f4', marginTop: '6px', overflow: 'hidden' }}>
                          <RV as='div' variant='growx' delay={400} style={{ height: '100%', width: '92%', borderRadius: '99px', background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', transformOrigin: 'left' }} />
                        </div>
                      </div>
                    </RV>
                  </div>
                  <div style={{ position: 'relative', padding: '24px 26px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }}>
                        <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Users size={17} style={{ display: 'block' }} /></span>
                      </span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.12em', color: '#0e6f84' }}>{t('lnd_employee_records')}</span>
                    </div>
                    <h3 style={{ margin: '16px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '24px', letterSpacing: '-.03em', color: '#0a1c24' }}>{t('lnd_one_record_per_employee')}</h3>
                    <p style={{ margin: '8px 0 0', fontSize: '15px', lineHeight: '1.6', color: '#52646d' }}>{t('lnd_contracts_documents_leave_and')}</p>
                  </div>
                </RV>
                <RV as='div' variant='up' delay={200} data-tilt="5" style={{ position: 'relative', flex: '1 1 320px', borderRadius: '28px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: 'perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .4s cubic-bezier(.2,.8,.2,1),box-shadow .4s' }} className="lnd-h8">
                  <span style={{ position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none', background: 'radial-gradient(380px circle at var(--sx,-999px) var(--sy,-999px),rgba(223,147,38,.12),transparent 45%)' }} />
                  <div style={{ height: '250px', background: 'linear-gradient(180deg,#fbf3e6,#ffffff)', borderBottom: '1px solid #eef2f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '22px', width: '100%', maxWidth: '300px' }}>
                      <div style={{ flex: '1', display: 'flex', alignItems: 'flex-end', gap: '7px', height: '130px' }}>
                        <RV as='span' variant='growy' delay={100} style={{ flex: '1', height: '45%', borderRadius: '6px 6px 3px 3px', background: '#d7e6ea', transformOrigin: 'bottom' }} />
                        <RV as='span' variant='growy' delay={170} style={{ flex: '1', height: '60%', borderRadius: '6px 6px 3px 3px', background: '#d7e6ea', transformOrigin: 'bottom' }} />
                        <RV as='span' variant='growy' delay={240} style={{ flex: '1', height: '52%', borderRadius: '6px 6px 3px 3px', background: '#d7e6ea', transformOrigin: 'bottom' }} />
                        <RV as='span' variant='growy' delay={310} style={{ flex: '1', height: '70%', borderRadius: '6px 6px 3px 3px', background: '#d7e6ea', transformOrigin: 'bottom' }} />
                        <RV as='span' variant='growy' delay={380} style={{ flex: '1', height: '64%', borderRadius: '6px 6px 3px 3px', background: '#d7e6ea', transformOrigin: 'bottom' }} />
                        <RV as='span' variant='growy' delay={450} style={{ flex: '1', height: '82%', borderRadius: '6px 6px 3px 3px', background: '#9fd6df', transformOrigin: 'bottom' }} />
                        <RV as='span' variant='growy' delay={520} style={{ flex: '1', height: '96%', borderRadius: '6px 6px 3px 3px', background: 'linear-gradient(180deg,#16b6c8,#0e6f84)', transformOrigin: 'bottom' }} />
                      </div>
                      <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: '0' }}>
                        <svg viewBox="0 0 100 100" style={{ display: 'block', width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                          <circle cx="50" cy="50" r="42" style={{ fill: 'none', stroke: '#eef2f4', strokeWidth: '9px' }} />
                          <RV as='circle' variant='draw' delay={300} frac={0.96} cx="50" cy="50" r="42" style={{ fill: 'none', stroke: '#16a06b', strokeWidth: '9px', strokeLinecap: 'round', strokeDasharray: '253.3px 263.9px' }} />
                        </svg>
                        <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <CountText as='span' text={'96%'} style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '800', fontSize: '23px', color: '#0a1c24', letterSpacing: '-.03em' }} />
                          <span style={{ fontSize: '10px', color: '#5f7079' }}>{t('lnd_attendance_2')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', padding: '24px 26px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbefda', color: '#b06b0c' }}>
                        <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><ChartColumn size={17} style={{ display: 'block' }} /></span>
                      </span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.12em', color: '#9a5c08' }}>{t('lnd_analytics')}</span>
                    </div>
                    <h3 style={{ margin: '16px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '24px', letterSpacing: '-.03em', color: '#0a1c24' }}>{t('lnd_insights_live')}</h3>
                    <p style={{ margin: '8px 0 0', fontSize: '15px', lineHeight: '1.6', color: '#52646d' }}>{t('lnd_headcount_attendance_and_turnover')}</p>
                  </div>
                </RV>
              </div>
            </div>
          </section>
        </div>
        <div style={{ position: 'relative', zIndex: '3', marginTop: '-44px', background: '#06141a', color: '#e8eff1', borderRadius: '44px 44px 0 0', overflow: 'hidden' }}>
          <div aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '-260px', width: '1100px', height: '620px', marginLeft: '-550px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.42),transparent)', pointerEvents: 'none' }} />
          <section id="platform" style={{ position: 'relative', padding: '130px 24px 110px', scrollMarginTop: '30px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: '56px', alignItems: 'center' }}>
              <div>
                <RV as='div' variant='up' style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', color: '#5fe3f0' }}>
                  <span style={{ width: '24px', height: '1px', background: '#5fe3f0' }} />
                  {t('lnd_03_platform')}
                </RV>
                <RV as='h2' variant='up' delay={80} style={{ margin: '18px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(38px,4.8vw,62px)', lineHeight: '1', letterSpacing: '-.045em', color: '#f1f8f9', textWrap: 'balance' }}>{t('lnd_one_platform_every_hr_workflow')}</RV>
                <RV as='p' variant='up' delay={160} style={{ margin: '22px 0 0', maxWidth: '500px', fontSize: '18px', lineHeight: '1.6', color: '#9fb4bb', textWrap: 'pretty' }}>{t('lnd_from_the_first_job_post_to_the')}</RV>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '34px' }}>
                  <RV as='div' variant='up' delay={200} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '16px 18px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.13)', color: '#5fe3f0', flexShrink: '0' }}>
                      <span style={{ display: 'inline-flex', width: '19px', height: '19px' }}><Database size={19} style={{ display: 'block' }} /></span>
                    </span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15.5px', color: '#eef5f7' }}>{t('lnd_one_source_of_truth')}</div>
                      <div style={{ fontSize: '14px', lineHeight: '1.55', color: '#93a9b0', marginTop: '3px' }}>{t('lnd_employee_data_flows_into')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={280} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '16px 18px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(154,139,240,.15)', color: '#b3a8f5', flexShrink: '0' }}>
                      <span style={{ display: 'inline-flex', width: '19px', height: '19px' }}><BellRing size={19} style={{ display: 'block' }} /></span>
                    </span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15.5px', color: '#eef5f7' }}>{t('lnd_approvals_where_you_work')}</div>
                      <div style={{ fontSize: '14px', lineHeight: '1.55', color: '#93a9b0', marginTop: '3px' }}>{t('lnd_leave_and_recruiting')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={360} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '16px 18px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,189,134,.14)', color: '#4fd3a0', flexShrink: '0' }}>
                      <span style={{ display: 'inline-flex', width: '19px', height: '19px' }}><Smartphone size={19} style={{ display: 'block' }} /></span>
                    </span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15.5px', color: '#eef5f7' }}>{t('lnd_a_portal_for_every_employee')}</div>
                      <div style={{ fontSize: '14px', lineHeight: '1.55', color: '#93a9b0', marginTop: '3px' }}>{t('lnd_self_service_leave_documents')}</div>
                    </div>
                  </RV>
                </div>
              </div>
              <RV as='div' variant='scale' delay={120} duration={1200} style={{ position: 'relative', width: '100%', maxWidth: '600px', aspectRatio: '1/1', margin: '0 auto' }}>
                <div style={{ position: 'absolute', inset: '0', borderRadius: '50%', border: '1px solid rgba(255,255,255,.05)' }} />
                <div style={{ position: 'absolute', inset: '8%', borderRadius: '50%', border: '1px dashed rgba(255,255,255,.13)' }} />
                <div style={{ position: 'absolute', inset: '20%', borderRadius: '50%', border: '1px dashed rgba(255,255,255,.15)' }} />
                <div style={{ position: 'absolute', inset: '8%', borderRadius: '50%', background: 'conic-gradient(from 0deg,rgba(95,227,240,0) 0deg,rgba(95,227,240,0) 270deg,rgba(95,227,240,.95) 356deg,rgba(95,227,240,0) 360deg)', WebkitMask: 'radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 1.5px))', mask: 'radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 1.5px))', '--dur': '9s' } as CSSProperties} className="wedy-spin" />
                <div style={{ position: 'absolute', inset: '20%', borderRadius: '50%', background: 'conic-gradient(from 0deg,rgba(154,139,240,0) 0deg,rgba(154,139,240,0) 280deg,rgba(154,139,240,.9) 356deg,rgba(154,139,240,0) 360deg)', WebkitMask: 'radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 1.5px))', mask: 'radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 1.5px))', '--dur': '14s' } as CSSProperties} className="wedy-spin-rev" />
                <div style={{ position: 'absolute', inset: '28%', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(39,192,212,.38),transparent)' }} />
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: '136px', height: '136px', margin: '-68px 0 0 -68px' }}>
                  <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.55)' }} className="wedy-ping" />
                  <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.55)', '--delay': '1.3s' } as CSSProperties} className="wedy-ping" />
                  <img src="/wedy-avatar.png" alt={t('lnd_wedy')} style={{ position: 'relative', display: 'block', width: '136px', height: '136px', borderRadius: '50%', objectFit: 'cover', background: '#0f262e', border: '2px solid rgba(95,227,240,.55)', boxShadow: '0 0 70px -8px rgba(39,192,212,.75)' }} />
                  <span style={{ position: 'absolute', left: '50%', bottom: '-14px', transform: 'translateX(-50%)', whiteSpace: 'nowrap', padding: '4px 11px', borderRadius: '99px', background: '#06141a', border: '1px solid rgba(95,227,240,.45)', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#5fe3f0' }}>{t('lnd_wedy_ai')}</span>
                </div>
                <div style={{ position: 'absolute', inset: '0', '--dur': '80s' } as CSSProperties} className="wedy-spin">
                  <div style={{ position: 'absolute', left: '75.98%', top: '65%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 13px 6px 6px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.11)', boxShadow: '0 12px 30px -12px rgba(0,0,0,.7)', fontSize: '13px', fontWeight: '500', color: '#dbe7ea', whiteSpace: 'nowrap', '--dur': '80s' } as CSSProperties} className="wedy-spin-rev">
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.16)', color: '#5fe3f0' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Users size={13} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_employees')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '50%', top: '80%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 13px 6px 6px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.11)', boxShadow: '0 12px 30px -12px rgba(0,0,0,.7)', fontSize: '13px', fontWeight: '500', color: '#dbe7ea', whiteSpace: 'nowrap', '--dur': '80s' } as CSSProperties} className="wedy-spin-rev">
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(154,139,240,.18)', color: '#b3a8f5' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Target size={13} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_recruitment')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '24.02%', top: '65%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 13px 6px 6px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.11)', boxShadow: '0 12px 30px -12px rgba(0,0,0,.7)', fontSize: '13px', fontWeight: '500', color: '#dbe7ea', whiteSpace: 'nowrap', '--dur': '80s' } as CSSProperties} className="wedy-spin-rev">
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,189,134,.16)', color: '#4fd3a0' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Calendar size={13} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_time_off')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '24.02%', top: '35%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 13px 6px 6px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.11)', boxShadow: '0 12px 30px -12px rgba(0,0,0,.7)', fontSize: '13px', fontWeight: '500', color: '#dbe7ea', whiteSpace: 'nowrap', '--dur': '80s' } as CSSProperties} className="wedy-spin-rev">
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(230,169,72,.16)', color: '#f0bd6a' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Wallet size={13} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_payroll')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '50%', top: '20%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 13px 6px 6px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.11)', boxShadow: '0 12px 30px -12px rgba(0,0,0,.7)', fontSize: '13px', fontWeight: '500', color: '#dbe7ea', whiteSpace: 'nowrap', '--dur': '80s' } as CSSProperties} className="wedy-spin-rev">
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.16)', color: '#5fe3f0' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><FileText size={13} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_documents_2')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '75.98%', top: '35%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 13px 6px 6px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.11)', boxShadow: '0 12px 30px -12px rgba(0,0,0,.7)', fontSize: '13px', fontWeight: '500', color: '#dbe7ea', whiteSpace: 'nowrap', '--dur': '80s' } as CSSProperties} className="wedy-spin-rev">
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(154,139,240,.18)', color: '#b3a8f5' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><ChartColumn size={13} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_analytics_2')}
                    </div>
                  </div>
                </div>
                <div style={{ position: 'absolute', inset: '0', '--dur': '120s' } as CSSProperties} className="wedy-spin-rev">
                  <div style={{ position: 'absolute', left: '92%', top: '50%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,189,134,.16)', color: '#4fd3a0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><UserCheck size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_onboarding')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '83.98%', top: '74.69%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(230,169,72,.16)', color: '#f0bd6a' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><TrendingUp size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_performance')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '62.98%', top: '89.94%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.16)', color: '#5fe3f0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Network size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_org_chart')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '37.02%', top: '89.94%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(154,139,240,.18)', color: '#b3a8f5' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><BookOpen size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_training')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '16.02%', top: '74.69%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,189,134,.16)', color: '#4fd3a0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Inbox size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_requests')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '8%', top: '50%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(230,169,72,.16)', color: '#f0bd6a' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Megaphone size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_job_posts')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '16.02%', top: '25.31%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.16)', color: '#5fe3f0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><UserX size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_absences')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '37.02%', top: '10.06%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(154,139,240,.18)', color: '#b3a8f5' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Video size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_meetings')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '62.98%', top: '10.06%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(43,189,134,.16)', color: '#4fd3a0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Star size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_talents')}
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: '83.98%', top: '25.31%', transform: 'translate(-50%,-50%)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 5px', borderRadius: '999px', background: 'rgba(10,30,37,.92)', border: '1px solid rgba(255,255,255,.09)', fontSize: '12.5px', color: '#c4d4d8', whiteSpace: 'nowrap', '--dur': '120s' } as CSSProperties} className="wedy-spin">
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(230,169,72,.16)', color: '#f0bd6a' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><ClipboardList size={12} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_audit_log')}
                    </div>
                  </div>
                </div>
              </RV>
            </div>
          </section>
          <section id="security" style={{ position: 'relative', padding: '30px 24px 150px', scrollMarginTop: '30px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,440px),1fr))', gap: '56px', alignItems: 'center' }}>
                <div>
                  <RV as='div' variant='up' style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', color: '#5fe3f0' }}>
                    <span style={{ width: '24px', height: '1px', background: '#5fe3f0' }} />
                    {t('lnd_04_security')}
                  </RV>
                  <RV as='h2' variant='up' delay={80} style={{ margin: '18px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(38px,4.8vw,62px)', lineHeight: '1', letterSpacing: '-.045em', color: '#f1f8f9', textWrap: 'balance' }}>{t('lnd_enterprise_grade_security_by')}</RV>
                  <RV as='p' variant='up' delay={160} style={{ margin: '22px 0 0', maxWidth: '500px', fontSize: '18px', lineHeight: '1.6', color: '#9fb4bb', textWrap: 'pretty' }}>{t('lnd_employee_data_is_the_most')}</RV>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '22px 26px', marginTop: '36px' }}>
                    <RV as='div' variant='up' delay={100} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'inline-flex', width: '21px', height: '21px', color: '#5fe3f0', marginTop: '1px' }}><ShieldCheck size={21} style={{ display: 'block' }} /></span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#eef5f7' }}>{t('lnd_role_based_access')}</div>
                        <div style={{ fontSize: '13.5px', color: '#8ea5ad', marginTop: '3px' }}>{t('lnd_admin_hr_manager_employee')}</div>
                      </div>
                    </RV>
                    <RV as='div' variant='up' delay={160} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'inline-flex', width: '21px', height: '21px', color: '#5fe3f0', marginTop: '1px' }}><KeyRound size={21} style={{ display: 'block' }} /></span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#eef5f7' }}>{t('lnd_two_factor_authentication')}</div>
                        <div style={{ fontSize: '13.5px', color: '#8ea5ad', marginTop: '3px' }}>{t('lnd_optional_or_enforced_for_admins')}</div>
                      </div>
                    </RV>
                    <RV as='div' variant='up' delay={220} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'inline-flex', width: '21px', height: '21px', color: '#5fe3f0', marginTop: '1px' }}><Globe size={21} style={{ display: 'block' }} /></span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#eef5f7' }}>{t('lnd_ip_allow_listing')}</div>
                        <div style={{ fontSize: '13.5px', color: '#8ea5ad', marginTop: '3px' }}>{t('lnd_restrict_access_to_your_offices')}</div>
                      </div>
                    </RV>
                    <RV as='div' variant='up' delay={280} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'inline-flex', width: '21px', height: '21px', color: '#5fe3f0', marginTop: '1px' }}><Timer size={21} style={{ display: 'block' }} /></span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#eef5f7' }}>{t('lnd_session_timeouts')}</div>
                        <div style={{ fontSize: '13.5px', color: '#8ea5ad', marginTop: '3px' }}>{t('lnd_automatic_sign_out_when_idle')}</div>
                      </div>
                    </RV>
                    <RV as='div' variant='up' delay={340} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'inline-flex', width: '21px', height: '21px', color: '#5fe3f0', marginTop: '1px' }}><History size={21} style={{ display: 'block' }} /></span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#eef5f7' }}>{t('lnd_complete_audit_log')}</div>
                        <div style={{ fontSize: '13.5px', color: '#8ea5ad', marginTop: '3px' }}>{t('lnd_every_action_every_user')}</div>
                      </div>
                    </RV>
                    <RV as='div' variant='up' delay={400} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'inline-flex', width: '21px', height: '21px', color: '#5fe3f0', marginTop: '1px' }}><Webhook size={21} style={{ display: 'block' }} /></span>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#eef5f7' }}>{t('lnd_webhooks_rest_api')}</div>
                        <div style={{ fontSize: '13.5px', color: '#8ea5ad', marginTop: '3px' }}>{t('lnd_plug_wedy_into_your_systems')}</div>
                      </div>
                    </RV>
                  </div>
                </div>
                <RV as='div' variant='scale' delay={120} style={{ position: 'relative' }}>
                  <div aria-hidden="true" style={{ position: 'absolute', inset: '-30px', background: 'radial-gradient(50% 50% at 50% 50%,rgba(39,192,212,.18),transparent)', pointerEvents: 'none' }} />
                  <div style={{ position: 'relative', borderRadius: '22px', background: '#081a20', border: '1px solid rgba(255,255,255,.09)', boxShadow: '0 40px 100px -30px rgba(0,0,0,.85)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,.14)' }} />
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,.14)' }} />
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,.14)' }} />
                      <span style={{ marginLeft: '8px', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#7f969e' }}>{t('lnd_audit_log_2')}</span>
                      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#2bbd86' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2bbd86' }} className="wedy-pulse" />
                        {t('lnd_streaming')}
                      </span>
                    </div>
                    <div style={{ height: '372px', overflow: 'hidden', WebkitMaskImage: 'linear-gradient(transparent,#000 14%,#000 86%,transparent)', maskImage: 'linear-gradient(transparent,#000 14%,#000 86%,transparent)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', '--dur': '26s' } as CSSProperties} className="wedy-marquee-y">
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:41:07'}</span>
                          <span style={{ color: '#4fd3a0' }}>{t('lnd_leave_approved_2')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_salma_i_omar_a_3_days')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:41:52'}</span>
                          <span style={{ color: '#5fe3f0' }}>{t('lnd_document_generated_2')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_attestation_de_travail_fr')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:42:15'}</span>
                          <span style={{ color: '#b3a8f5' }}>{t('lnd_employee_created')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_nadia_berrada_cdi')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:43:01'}</span>
                          <span style={{ color: '#f0bd6a' }}>{t('lnd_candidate_hired_2')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_mehdi_rami_sales')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:43:40'}</span>
                          <span style={{ color: '#9fb4bb' }}>{t('lnd_user_login')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_salma_tython_ma_2fa')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:44:12'}</span>
                          <span style={{ color: '#9fb4bb' }}>{t('lnd_role_updated')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_karim_b_hr_manager')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:44:58'}</span>
                          <span style={{ color: '#5fe3f0' }}>{t('lnd_document_generated_2')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_ar')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:45:30'}</span>
                          <span style={{ color: '#4fd3a0' }}>{t('lnd_leave_requested')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_hind_tazi_2_days')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:41:07'}</span>
                          <span style={{ color: '#4fd3a0' }}>{t('lnd_leave_approved_2')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_salma_i_omar_a_3_days')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:41:52'}</span>
                          <span style={{ color: '#5fe3f0' }}>{t('lnd_document_generated_2')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_attestation_de_travail_fr')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:42:15'}</span>
                          <span style={{ color: '#b3a8f5' }}>{t('lnd_employee_created')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_nadia_berrada_cdi')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:43:01'}</span>
                          <span style={{ color: '#f0bd6a' }}>{t('lnd_candidate_hired_2')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_mehdi_rami_sales')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:43:40'}</span>
                          <span style={{ color: '#9fb4bb' }}>{t('lnd_user_login')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_salma_tython_ma_2fa')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:44:12'}</span>
                          <span style={{ color: '#9fb4bb' }}>{t('lnd_role_updated')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_karim_b_hr_manager')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:44:58'}</span>
                          <span style={{ color: '#5fe3f0' }}>{t('lnd_document_generated_2')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_ar')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70px 158px minmax(0,1fr)', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.04)', fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#5b737b' }}>{'09:45:30'}</span>
                          <span style={{ color: '#4fd3a0' }}>{t('lnd_leave_requested')}</span>
                          <span style={{ color: '#b9cbd0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('lnd_hind_tazi_2_days')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </RV>
              </div>
              <div style={{ marginTop: '110px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
                  <RV as='h3' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: 'clamp(26px,3vw,38px)', lineHeight: '1.1', letterSpacing: '-.035em', color: '#f1f8f9', maxWidth: '580px', textWrap: 'balance' }}>{t('lnd_connects_with_the_tools_your_team')}</RV>
                  <RV as='span' variant='up' style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', letterSpacing: '.12em', textTransform: 'uppercase', color: '#7f969e' }}>{t('lnd_integrations')}</RV>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '12px', marginTop: '30px' }}>
                  <RV as='div' variant='up' delay={0} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#effbfc', color: '#0a1c24', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '700', fontSize: '14px', flexShrink: '0' }}>{'GC'}</span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_google_calendar')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_two_way_sync')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={50} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#effbfc', color: '#0a1c24', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '700', fontSize: '14px', flexShrink: '0' }}>{'OL'}</span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_microsoft_outlook')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_event_sync')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={100} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#effbfc', color: '#0a1c24', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '700', fontSize: '14px', flexShrink: '0' }}>{'AC'}</span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_apple_calendar')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_ical_feed')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={150} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#3d2f99', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '700', fontSize: '14px', flexShrink: '0' }}>{'SL'}</span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_slack')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_hr_notifications')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={200} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#3d2f99', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '700', fontSize: '14px', flexShrink: '0' }}>{'MT'}</span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_microsoft_teams')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_alerts')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={0} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#3d2f99', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '700', fontSize: '15px', flexShrink: '0' }}>{'@'}</span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_smtp_email')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_your_own_server')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={50} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#0f6f49', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '700', fontSize: '14px', flexShrink: '0' }}>{'SP'}</span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_sage_paie')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_payroll_export')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={100} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#0f6f49', fontFamily: '\'Bricolage Grotesque\',sans-serif', fontWeight: '700', fontSize: '14px', flexShrink: '0' }}>{'CG'}</span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_cegid')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_employee_sync')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={150} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbefda', color: '#7a4706', fontFamily: '\'Geist Mono\',monospace', fontWeight: '600', fontSize: '13px', flexShrink: '0' }}>{'{ }'}</span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_rest_api')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_custom_integrations')}</div>
                    </div>
                  </RV>
                  <RV as='div' variant='up' delay={200} data-tilt="8" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', transform: 'perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))', transition: 'transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s' }} className="lnd-h9">
                    <span style={{ position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(200px circle at var(--sx,-999px) var(--sy,-999px),rgba(95,227,240,.14),transparent 60%)' }} />
                    <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbefda', color: '#7a4706', flexShrink: '0' }}>
                      <span style={{ display: 'inline-flex', width: '18px', height: '18px' }}><Webhook size={18} style={{ display: 'block' }} /></span>
                    </span>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14.5px', color: '#eef5f7' }}>{t('lnd_webhooks')}</div>
                      <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#7f969e', marginTop: '2px' }}>{t('lnd_leave_approved_3')}</div>
                    </div>
                  </RV>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div style={{ position: 'relative', zIndex: '4', marginTop: '-44px', background: '#f3f6f7', color: '#0a1c24', borderRadius: '44px 44px 0 0' }}>
          <section id="pricing" style={{ padding: '130px 24px 160px', scrollMarginTop: '30px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <RV as='div' variant='up' style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', letterSpacing: '.14em', textTransform: 'uppercase', color: '#0e6f84' }}>
                  <span style={{ width: '24px', height: '1px', background: '#0e6f84' }} />
                  {t('lnd_05_pricing')}
                  <span style={{ width: '24px', height: '1px', background: '#0e6f84' }} />
                </RV>
                <RV as='h2' variant='up' delay={80} style={{ margin: '18px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(38px,4.8vw,62px)', lineHeight: '1', letterSpacing: '-.045em', color: '#0a1c24', textWrap: 'balance' }}>{t('lnd_simple_transparent_pricing')}</RV>
                <RV as='p' variant='up' delay={160} style={{ margin: '18px 0 0', fontSize: '18px', lineHeight: '1.6', color: '#52646d' }}>{t('lnd_start_free_for_14_days_scale_as')}</RV>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: '18px', marginTop: '60px', alignItems: 'stretch' }}>
                <RV as='div' variant='up' style={{ display: 'flex', flexDirection: 'column', padding: '34px', borderRadius: '28px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                  <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '22px', color: '#0a1c24' }}>{t('lnd_starter')}</div>
                  <div style={{ fontSize: '14.5px', color: '#52646d', marginTop: '6px' }}>{t('lnd_for_small_teams_getting_organized')}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '28px' }}>
                    <CountText as='span' text={'199'} style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '58px', letterSpacing: '-.05em', lineHeight: '1', color: '#0a1c24' }} />
                    <span style={{ fontSize: '15px', color: '#52646d' }}>{t('lnd_mad_month')}</span>
                  </div>
                  <Link to="/login" style={{ marginTop: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 18px', borderRadius: '13px', border: '1px solid #cfd8dc', color: '#0a1c24', fontWeight: '600', fontSize: '15px', textDecoration: 'none', transition: 'background .2s,border-color .2s' }} className="lnd-h10">{t('lnd_get_started')}</Link>
                  <div style={{ height: '1px', background: '#edf1f3', margin: '28px 0 24px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#33474f' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_up_to_25_employees')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#33474f' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_50_documents_month')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#33474f' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_french_arabic')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#33474f' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_email_support')}
                    </div>
                  </div>
                </RV>
                <RV as='div' variant='up' delay={100} style={{ position: 'relative', padding: '1.5px', borderRadius: '30px', overflow: 'hidden', boxShadow: '0 40px 90px -40px rgba(14,111,132,.75)' }}>
                  <div style={{ position: 'absolute', left: '50%', top: '50%', width: '180%', aspectRatio: '1/1', marginLeft: '-90%', marginTop: '-90%', background: 'conic-gradient(from 0deg,rgba(95,227,240,0) 0deg,#5fe3f0 70deg,#9a8bf0 140deg,rgba(154,139,240,0) 200deg,rgba(95,227,240,0) 360deg)', '--dur': '7s' } as CSSProperties} className="wedy-spin" />
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', padding: '34px', borderRadius: '28.5px', background: 'linear-gradient(180deg,#0c242b,#06141a)', color: '#e8eff1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '22px', color: '#f1f8f9' }}>{t('lnd_professional')}</span>
                      <span style={{ fontSize: '12px', fontWeight: '600', padding: '5px 11px', borderRadius: '99px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff' }}>{t('lnd_most_popular')}</span>
                    </div>
                    <div style={{ fontSize: '14.5px', color: '#9fb4bb', marginTop: '6px' }}>{t('lnd_for_growing_hr_teams_that_want_ai')}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '28px' }}>
                      <CountText as='span' text={'499'} style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '58px', letterSpacing: '-.05em', lineHeight: '1', color: '#ffffff' }} />
                      <span style={{ fontSize: '15px', color: '#9fb4bb' }}>{t('lnd_mad_month')}</span>
                    </div>
                    <Link to="/login" data-magnet="" style={{ position: 'relative', overflow: 'hidden', marginTop: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 18px', borderRadius: '13px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontWeight: '600', fontSize: '15px', textDecoration: 'none', boxShadow: '0 14px 34px -12px rgba(22,182,200,.8)', transform: 'translate(var(--tx,0px),var(--ty,0px))', transition: 'transform .35s cubic-bezier(.2,.8,.2,1)' }} className="lnd-h2">
                      <span style={{ position: 'absolute', top: '0', bottom: '0', left: '0', width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent)', pointerEvents: 'none' }} className="wedy-shine" />
                      <span style={{ position: 'relative' }}>{t('lnd_start_free_trial')}</span>
                      <span style={{ position: 'relative', display: 'inline-flex', width: '16px', height: '16px' }}><ArrowRight size={16} className="wy-flip" style={{ display: 'block' }} /></span>
                    </Link>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,.08)', margin: '28px 0 24px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#cfdde1' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.18)', color: '#5fe3f0', flexShrink: '0' }}>
                          <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                        </span>
                        {t('lnd_up_to_100_employees')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#cfdde1' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.18)', color: '#5fe3f0', flexShrink: '0' }}>
                          <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                        </span>
                        {t('lnd_unlimited_documents')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#cfdde1' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.18)', color: '#5fe3f0', flexShrink: '0' }}>
                          <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                        </span>
                        {t('lnd_all_languages_ai_copilot')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#cfdde1' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.18)', color: '#5fe3f0', flexShrink: '0' }}>
                          <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                        </span>
                        {t('lnd_priority_support')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#cfdde1' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.18)', color: '#5fe3f0', flexShrink: '0' }}>
                          <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                        </span>
                        {t('lnd_custom_templates')}
                      </div>
                    </div>
                  </div>
                </RV>
                <RV as='div' variant='up' delay={200} style={{ display: 'flex', flexDirection: 'column', padding: '34px', borderRadius: '28px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                  <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '22px', color: '#0a1c24' }}>{t('lnd_enterprise')}</div>
                  <div style={{ fontSize: '14.5px', color: '#52646d', marginTop: '6px' }}>{t('lnd_for_large_organizations_with')}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '28px' }}>
                    <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '58px', letterSpacing: '-.05em', lineHeight: '1', color: '#0a1c24' }}>{t('lnd_custom')}</span>
                  </div>
                  <a href="mailto:support@wedy.ma?subject=Wedy%20Enterprise" style={{ marginTop: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 18px', borderRadius: '13px', background: '#0a1c24', color: '#ffffff', fontWeight: '600', fontSize: '15px', textDecoration: 'none', transition: 'background .2s' }} className="lnd-h11">{t('lnd_contact_sales')}</a>
                  <div style={{ height: '1px', background: '#edf1f3', margin: '28px 0 24px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#33474f' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_unlimited_everything')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#33474f' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_saml_sso')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#33474f' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_dedicated_support')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#33474f' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_sla_guarantee')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', fontSize: '14.5px', color: '#33474f' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Check size={12} strokeWidth={2.8} style={{ display: 'block' }} /></span>
                      </span>
                      {t('lnd_custom_integrations')}
                    </div>
                  </div>
                </RV>
              </div>
            </div>
          </section>
        </div>
        <div style={{ position: 'relative', zIndex: '5', marginTop: '-44px', background: '#06141a', color: '#e8eff1', borderRadius: '44px 44px 0 0', overflow: 'hidden' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: '0', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', inset: '0', backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '72px 72px', WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%,#000 20%,transparent 75%)', maskImage: 'radial-gradient(ellipse 60% 50% at 50% 30%,#000 20%,transparent 75%)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '0', width: '900px', height: '640px', marginLeft: '-450px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.5),transparent)' }} className="wedy-drift" />
            <div style={{ position: 'absolute', left: '58%', top: '12%', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.28),transparent)', '--dur': '26s', '--delay': '-7s' } as CSSProperties} className="wedy-drift" />
          </div>
          <section style={{ position: 'relative', padding: '150px 24px 100px', textAlign: 'center' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <RV as='div' variant='scale' style={{ position: 'relative', width: '96px', height: '96px' }}>
                <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.55)' }} className="wedy-ping" />
                <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.55)', '--delay': '1.3s' } as CSSProperties} className="wedy-ping" />
                <img src="/wedy-avatar.png" alt={t('lnd_wedy')} style={{ position: 'relative', display: 'block', width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', background: '#0f262e', border: '2px solid rgba(95,227,240,.55)', boxShadow: '0 0 60px -6px rgba(39,192,212,.7)' }} />
              </RV>
              <RV as='h2' variant='up' delay={100} style={{ margin: '38px 0 0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(44px,6.4vw,88px)', lineHeight: '.98', letterSpacing: '-.05em', color: '#f1f8f9', textWrap: 'balance' }}>{t('lnd_ready_to_transform_your_hr')}</RV>
              <RV as='p' variant='up' delay={200} style={{ margin: '24px 0 0', fontSize: '19px', lineHeight: '1.6', color: '#9fb4bb', maxWidth: '520px', textWrap: 'pretty' }}>{t('lnd_join_hr_teams_using_wedy_to')}</RV>
              <RV as='div' variant='up' delay={300} style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '40px' }}>
                <Link to="/login" data-magnet="" style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '17px 26px 17px 28px', borderRadius: '14px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontWeight: '600', fontSize: '16.5px', textDecoration: 'none', boxShadow: 'inset 0 0 0 1px rgba(95,227,240,.35),0 18px 44px -12px rgba(22,182,200,.7)', transform: 'translate(var(--tx,0px),var(--ty,0px))', transition: 'transform .35s cubic-bezier(.2,.8,.2,1)' }} className="lnd-h2">
                  <span style={{ position: 'absolute', top: '0', bottom: '0', left: '0', width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent)', pointerEvents: 'none', '--delay': '-1.5s' } as CSSProperties} className="wedy-shine" />
                  <span style={{ position: 'relative' }}>{t('lnd_start_free_trial')}</span>
                  <span style={{ position: 'relative', display: 'inline-flex', width: '18px', height: '18px' }}><ArrowRight size={18} className="wy-flip" style={{ display: 'block' }} /></span>
                </Link>
                <a href="mailto:support@wedy.ma?subject=Wedy%20demo" data-magnet="" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '17px 24px', borderRadius: '14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.14)', color: '#e8eff1', fontWeight: '600', fontSize: '16.5px', textDecoration: 'none', transform: 'translate(var(--tx,0px),var(--ty,0px))', transition: 'transform .35s cubic-bezier(.2,.8,.2,1),background .2s' }} className="lnd-h6">{t('lnd_book_a_demo')}</a>
              </RV>
            </div>
          </section>
          <footer style={{ position: 'relative', padding: '0 24px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '56px 0 40px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', flexWrap: 'wrap', gap: '48px', justifyContent: 'space-between' }}>
              <div style={{ maxWidth: '320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src="/wedy-avatar.png" alt={''} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', background: '#0f262e', border: '1.5px solid rgba(255,255,255,.2)' }} />
                  <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '21px', letterSpacing: '-.03em', color: '#f1f8f9' }}>{t('lnd_wedy')}</span>
                </div>
                <p style={{ margin: '16px 0 0', fontSize: '14.5px', lineHeight: '1.6', color: '#8ea5ad' }}>{t('lnd_the_ai_native_hr_platform_for')}</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '64px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.14em', color: '#6b838c', marginBottom: '4px' }}>{t('lnd_product')}</span>
                  <a href="#copilot" style={{ fontSize: '14.5px', color: '#cfdde1', textDecoration: 'none' }} className="lnd-h2">{t('lnd_copilot')}</a>
                  <a href="#features" style={{ fontSize: '14.5px', color: '#cfdde1', textDecoration: 'none' }} className="lnd-h2">{t('lnd_features')}</a>
                  <a href="#platform" style={{ fontSize: '14.5px', color: '#cfdde1', textDecoration: 'none' }} className="lnd-h2">{t('lnd_platform')}</a>
                  <a href="#pricing" style={{ fontSize: '14.5px', color: '#cfdde1', textDecoration: 'none' }} className="lnd-h2">{t('lnd_pricing')}</a>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.14em', color: '#6b838c', marginBottom: '4px' }}>{t('lnd_company')}</span>
                  <a href="#top" style={{ fontSize: '14.5px', color: '#cfdde1', textDecoration: 'none' }} className="lnd-h2">{t('lnd_about')}</a>
                  <a href="mailto:support@wedy.ma" style={{ fontSize: '14.5px', color: '#cfdde1', textDecoration: 'none' }} className="lnd-h2">{t('lnd_contact')}</a>
                  <a href="#security" style={{ fontSize: '14.5px', color: '#cfdde1', textDecoration: 'none' }} className="lnd-h2">{t('lnd_security')}</a>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.14em', color: '#6b838c', marginBottom: '4px' }}>{t('lnd_legal')}</span>
                  <a href="#top" style={{ fontSize: '14.5px', color: '#cfdde1', textDecoration: 'none' }} className="lnd-h2">{t('lnd_privacy')}</a>
                  <a href="#top" style={{ fontSize: '14.5px', color: '#cfdde1', textDecoration: 'none' }} className="lnd-h2">{t('lnd_terms')}</a>
                </div>
              </div>
            </div>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', paddingBottom: '28px', fontSize: '13px', color: '#7f969e' }}>
              <span>{t('lnd_2026_wedy_powered_by_claude_ai')}</span>
              <span style={{ display: 'flex', gap: '16px' }}>
                <button type="button" onClick={() => setLang('en')} style={langBtn(lang === 'en')} className="lnd-h2">English</button>
                <button type="button" onClick={() => setLang('fr')} style={langBtn(lang === 'fr')} className="lnd-h2">Français</button>
                <button type="button" onClick={() => setLang('ar')} style={{ ...langBtn(lang === 'ar'), fontFamily: '\'Noto Kufi Arabic\',sans-serif' }} className="lnd-h2">العربية</button>
              </span>
            </div>
            <RV as='div' variant='up' duration={1400} aria-hidden="true" style={{ maxWidth: '1300px', margin: '0 auto', textAlign: 'center', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '800', fontSize: 'clamp(120px,27vw,400px)', lineHeight: '.8', letterSpacing: '-.065em', background: 'linear-gradient(180deg,rgba(95,227,240,.5),rgba(39,192,212,.08) 72%,rgba(39,192,212,0))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', userSelect: 'none', marginBottom: '-.1em', paddingTop: '.05em' }}>{t('lnd_wedy_2')}</RV>
          </footer>
        </div>
      </div>
    </>
  );
}
