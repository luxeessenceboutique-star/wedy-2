// Generated from design_handoff_wedy/design/Wedy Audit.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// entries come from /audit-logs/feed; what the log does not record (IP, device, field changes) is not shown.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment } from 'react';
import { Activity, CircleCheck, Download, FileText, Pause, Search, ShieldAlert, Users } from 'lucide-react';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import type { AuditVals } from './AuditPage';
import './AuditView.css';

export function AuditView({ v }: { v: AuditVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('aud_journal_d_audit')}</RV>
            <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('aud_subtitle')}</RV>
          </div>
          <RV as='div' variant='up' delay={100} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={v.toggleLive} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 14px', borderRadius: '12px', border: `1px solid ${v.liveBorder}`, background: v.liveBg, color: v.liveColor, fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {v.live ? (
                <>
                <span style={{ position: 'relative', display: 'inline-flex', width: '8px', height: '8px' }}>
                  <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', background: '#16a06b' }} className="wedy-ping" />
                  <span style={{ position: 'relative', width: '8px', height: '8px', borderRadius: '50%', background: '#16a06b' }} />
                </span>
                </>
              ) : null}
              {v.paused ? (
                <>
                <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Pause size={14} style={{ display: 'block' }} /></span>
                </>
              ) : null}
              {v.liveLabel}
            </button>
            <button type="button" onClick={v.exportCsv} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 14px', border: 'none', borderRadius: '12px', background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }} className="aud-h1">
              <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Download size={15} style={{ display: 'block' }} /></span>
              {t('aud_exporter_csv')}
            </button>
          </RV>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '12px' }}>
          <RV as='div' variant='up' delay={60} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <span style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }}>
              <span style={{ display: 'inline-flex', width: '19px', height: '19px' }}><Activity size={19} style={{ display: 'block' }} /></span>
            </span>
            <div>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '26px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }}>{v.kEvents}</div>
              <div style={{ fontSize: '12.5px', color: '#52646d' }}>{t('aud_evenements_30_jours')}</div>
            </div>
          </RV>
          <RV as='div' variant='up' delay={110} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <span style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6' }}>
              <span style={{ display: 'inline-flex', width: '19px', height: '19px' }}><Users size={19} style={{ display: 'block' }} /></span>
            </span>
            <div>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '26px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }}>{v.kUsers}</div>
              <div style={{ fontSize: '12.5px', color: '#52646d' }}>{t('aud_utilisateurs_actifs')}</div>
            </div>
          </RV>
          <RV as='div' variant='up' delay={160} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <span style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbe9e6', color: '#df5740' }}>
              <span style={{ display: 'inline-flex', width: '19px', height: '19px' }}><ShieldAlert size={19} style={{ display: 'block' }} /></span>
            </span>
            <div>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '26px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05', color: v.kDeletes ? '#a33a28' : '#0a1c24' }}>{v.kDeletes}</div>
              <div style={{ fontSize: '12.5px', color: '#52646d' }}>{t('aud_k_deletes')}</div>
            </div>
          </RV>
          <RV as='div' variant='up' delay={210} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <span style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbefda', color: '#b06b0c' }}>
              <span style={{ display: 'inline-flex', width: '19px', height: '19px' }}><FileText size={19} style={{ display: 'block' }} /></span>
            </span>
            <div>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '26px', fontWeight: '800', letterSpacing: '-.04em', lineHeight: '1.05' }}>{v.kDocs}</div>
              <div style={{ fontSize: '12.5px', color: '#52646d' }}>{t('aud_k_docs')}</div>
            </div>
          </RV>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: '12px' }}>
          {v.alerts.map((a, aIndex) => (
            <Fragment key={aIndex}>
              <RV as='div' variant='up' delay={Number(a.delay)} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '16px', background: a.bg, border: `1px solid ${a.border}`, flexWrap: 'wrap' }}>
                <span style={{ width: '36px', height: '36px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', color: a.color, flexShrink: '0' }}>
                  <span style={{ display: 'inline-flex', width: '18px', height: '18px' }}><a.icon size={18} style={{ display: 'block' }} /></span>
                </span>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: a.color }}>{a.title}</div>
                  <div style={{ fontSize: '12.5px', color: '#33474f', marginTop: '2px' }}>{a.text}</div>
                </div>
                {a.open ? (
                  <>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={a.act} style={{ height: '34px', padding: '0 12px', border: 'none', borderRadius: '10px', background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>{a.cta}</button>
                    <button type="button" onClick={a.dismiss} style={{ height: '34px', padding: '0 11px', borderRadius: '10px', border: '1px solid rgba(10,28,36,.15)', background: 'transparent', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#33474f', cursor: 'pointer' }}>{t('aud_ignorer')}</button>
                  </div>
                  </>
                ) : null}
                {a.closed ? (
                  <>
                  <RV as='span' variant='pill' style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '34px', fontSize: '12.5px', fontWeight: '700', color: '#0f6f49' }}>
                    <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><CircleCheck size={15} style={{ display: 'block' }} /></span>
                    {a.doneLabel}
                  </RV>
                  </>
                ) : null}
              </RV>
            </Fragment>
          ))}
        </div>
        <RV as='div' variant='up' delay={140} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '200px', maxWidth: '320px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', marginTop: '-7.5px', display: 'inline-flex', width: '15px', height: '15px', color: '#7d8f97', pointerEvents: 'none' }}><Search size={15} style={{ display: 'block' }} /></span>
            <input value={v.q} onChange={v.onQ} placeholder={t('aud_search_ph')} style={{ width: '100%', height: '40px', padding: '0 12px 0 36px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13.5px', color: '#0a1c24', outline: 'none' }} className="aud-f2" />
          </div>
          {v.mods.map((m, mIndex) => (
            <Fragment key={mIndex}>
              <button type="button" onClick={m.go} style={{ height: '34px', padding: '0 12px', borderRadius: '99px', border: `1px solid ${m.border}`, background: m.bg, color: m.color, fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>{m.label}</button>
            </Fragment>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            {v.sevs.map((v_, v_Index) => (
              <Fragment key={v_Index}>
                <button type="button" onClick={v_.go} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '34px', padding: '0 11px', borderRadius: '99px', border: `1px solid ${v_.border}`, background: v_.bg, color: v_.color, fontFamily: 'inherit', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: v_.dot }} />
                  {v_.label}
                </button>
              </Fragment>
            ))}
          </div>
        </RV>
        <RV as='div' variant='up' delay={160} style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '13px 18px', background: '#f8fafb' }}>
            <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '15px' }}>{t('aud_evenements')}</span>
            <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#5f7079' }}>{v.countLabel}</span>
          </div>
          {v.loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0', borderTop: '1px solid #eef2f4' }}><Spinner /></div>}
          {v.events.map(e => (
            <Fragment key={e.id}>
              <RV as='div' variant='up' style={{ borderTop: '1px solid #eef2f4', background: e.bg, transition: 'background 1.2s' }}>
                <button type="button" onClick={e.toggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', border: 'none', background: 'transparent', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', flexWrap: 'wrap' }} className="aud-h3">
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: e.dot, flexShrink: '0' }} />
                  <span style={{ width: '76px', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#52646d' }}>{e.time}</span>
                  <span style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: e.iconBg, color: e.iconColor, flexShrink: '0' }}>
                    <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><e.icon size={15} style={{ display: 'block' }} /></span>
                  </span>
                  <span style={{ flex: '1 1 300px', minWidth: '0', fontSize: '13.5px', lineHeight: '1.45', color: '#52646d' }}>
                    <strong style={{ color: '#0a1c24', fontWeight: '600' }}>{e.user}</strong>
                    {' '}{e.verb}{' '}
                    <strong style={{ color: '#0a1c24', fontWeight: '600' }}>{e.target}</strong>
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: '600', padding: '3px 9px', borderRadius: '99px', background: '#f3f6f7', color: '#33474f', whiteSpace: 'nowrap' }}>{e.module}</span>
                  <span style={{ width: '124px', fontFamily: '\'Geist Mono\',monospace', fontSize: '11.5px', color: '#7d8f97', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.ref}</span>
                  <span style={{ display: 'inline-flex', width: '15px', height: '15px', color: '#a3b1b7' }}><e.chev size={15} style={{ display: 'block' }} /></span>
                </button>
                {e.open ? (
                  <>
                  <RV as='div' variant='up' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '14px', padding: '2px 18px 16px 18px' }}>
                    <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#fbfcfc', border: '1px solid #eef2f4' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('aud_what')}</div>
                      <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: '1.5', color: '#1d3540' }}>{e.what}</div>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#7d8f97' }}>{t('aud_no_field_detail')}</div>
                    </div>
                    <div style={{ padding: '12px 14px', borderRadius: '12px', background: '#fbfcfc', border: '1px solid #eef2f4', display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12.5px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('aud_contexte')}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                        <span style={{ color: '#52646d' }}>{t('aud_type')}</span>
                        <span style={{ fontWeight: '500' }}>{e.entityLabel}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                        <span style={{ color: '#52646d' }}>{t('aud_when')}</span>
                        <span style={{ fontFamily: '\'Geist Mono\',monospace' }}>{e.stamp}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                        <span style={{ color: '#52646d' }}>{'ID'}</span>
                        <span style={{ fontFamily: '\'Geist Mono\',monospace' }}>{e.eid}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                        <span style={{ color: '#52646d' }}>{t('aud_author_id')}</span>
                        <span style={{ fontFamily: '\'Geist Mono\',monospace', color: '#0f6f49' }}>{e.author}</span>
                      </div>
                    </div>
                  </RV>
                  </>
                ) : null}
              </RV>
            </Fragment>
          ))}
          {v.empty ? (
            <>
            <div style={{ padding: '36px 20px', textAlign: 'center', fontSize: '14px', color: '#52646d' }}>{t('aud_aucun_evenement_ne_correspond_a')}</div>
            </>
          ) : null}
        </RV>
      </div>
    </>
  );
}
