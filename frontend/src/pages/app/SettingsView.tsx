// Generated from design_handoff_wedy/design/Wedy Settings.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// values come from /api/settings; logo, signature and stamp are real uploads; billing shows real usage.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment } from 'react';
import { Scale, Upload } from 'lucide-react';
import { RV } from '@/components/motion';
import { ContractTypesCard } from '@/components/settings/ContractTypesCard';
import { useLang } from '@/lib/lang';
import type { SettingsVals } from './SettingsPage';
import './SettingsView.css';

export function SettingsView({ v }: { v: SettingsVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 110px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', width: '100%' }}>
        <div>
          <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('set_parametres')}</RV>
          <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('set_les_informations_de_votre')}</RV>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          <RV as='nav' variant='up' delay={100} style={{ flex: '0 1 230px', minWidth: '200px', position: 'sticky', top: '90px', display: 'flex', flexDirection: 'column', gap: '3px', padding: '8px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            {v.tabs.map((t_, t_Index) => (
              <Fragment key={t_Index}>
                <button type="button" onClick={t_.go} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px', height: '42px', padding: '0 12px', border: 'none', borderRadius: '11px', background: t_.bg, fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', color: t_.color, cursor: 'pointer', textAlign: 'left' }} className="set-h1">
                  <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><t_.icon size={16} style={{ display: 'block' }} /></span>
                  {t_.label}
                </button>
              </Fragment>
            ))}
          </RV>
          <div style={{ flex: '1 1 560px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {v.tCompany ? (
              <>
              <RV as='div' variant='up' style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', paddingBottom: '18px', borderBottom: '1px solid #eef2f4' }}>
                  {v.logoTile}
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '18px' }}>{v.c.name}</div>
                    <div style={{ fontSize: '13px', color: '#52646d' }}>{t('set_logo_utilise_sur_tous_les')}</div>
                  </div>
                  {v.logoRemove}
                  <button type="button" onClick={v.changeLogo} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 13px', borderRadius: '10px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', color: '#33474f', cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Upload size={14} style={{ display: 'block' }} /></span>
                    {t('set_changer_le_logo')}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '14px', marginTop: '18px' }}>
                  {v.companyFields.map((f, fIndex) => (
                    <Fragment key={fIndex}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                        {f.label}
                        <input value={f.value} onChange={f.set} style={{ height: '42px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: f.font, fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }} className="set-f2" />
                      </label>
                    </Fragment>
                  ))}
                </div>
              </RV>
              </>
            ) : null}
            {v.tRefs ? <ContractTypesCard /> : null}
            {v.tPrefs ? (
              <>
              <RV as='div' variant='up' style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#33474f' }}>{t('set_langue_par_defaut_de_l_interface')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px', marginTop: '10px', maxWidth: '460px' }}>
                    {v.langs.map((l, lIndex) => (
                      <Fragment key={lIndex}>
                        <button type="button" onClick={l.go} style={{ height: '46px', borderRadius: '12px', border: `1px solid ${l.border}`, background: l.bg, color: l.color, fontFamily: l.font, fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{l.label}</button>
                      </Fragment>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                    {t('set_fuseau_horaire')}
                    <select value={v.p.tz} onChange={v.setTz} style={{ height: '42px', padding: '0 10px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', outline: 'none' }}>
                      <option value="Africa/Casablanca">{t('set_africa_casablanca_gmt_1')}</option>
                      <option value="Europe/Paris">{t('set_europe_paris')}</option>
                      <option value="UTC">{t('set_utc')}</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                    {t('set_format_de_date')}
                    <select value={v.p.date} onChange={v.setDate} style={{ height: '42px', padding: '0 10px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', outline: 'none' }}>
                      <option value="dmy">{t('set_jj_mm_aaaa_01_11_2026')}</option>
                      <option value="iso">{t('set_aaaa_mm_jj_2026_11_01')}</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                    {t('set_devise')}
                    <select value={v.p.cur} onChange={v.setCur} style={{ height: '42px', padding: '0 10px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', outline: 'none' }}>
                      <option value="MAD">{t('set_mad_dirham_marocain')}</option>
                      <option value="EUR">{t('set_eur_euro')}</option>
                    </select>
                  </label>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#33474f' }}>{t('set_semaine_de_travail')}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {v.days.map((d, dIndex) => (
                      <Fragment key={dIndex}>
                        <button type="button" onClick={d.toggle} style={{ width: '48px', height: '44px', borderRadius: '11px', border: `1px solid ${d.border}`, background: d.bg, color: d.color, fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{d.t}</button>
                      </Fragment>
                    ))}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#5f7079', marginTop: '8px' }}>{v.weekNote}</div>
                </div>
              </RV>
              </>
            ) : null}
            {v.tLeave ? (
              <>
              <RV as='div' variant='up' style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('set_regles_d_acquisition')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '14px', marginTop: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                    {t('set_jours_acquis_par_mois')}
                    <input type="number" step="0.5" value={v.l.monthly} onChange={v.setMonthly} style={{ height: '42px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', outline: 'none' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                    {t('set_bonus_par_5_ans_d_anciennete')}
                    <input type="number" step="0.5" value={v.l.bonus} onChange={v.setBonus} style={{ height: '42px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', outline: 'none' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                    {t('set_plafond_annuel_jours')}
                    <input type="number" value={v.l.cap} onChange={v.setCap} style={{ height: '42px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', outline: 'none' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                    {t('set_circuit_de_validation')}
                    <select value={v.l.flow} onChange={v.setFlow} style={{ height: '42px', padding: '0 10px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', outline: 'none' }}>
                      <option value="mgr-rh">{t('set_manager_puis_rh')}</option>
                      <option value="rh">{t('set_rh_uniquement')}</option>
                      <option value="mgr">{t('set_manager_uniquement')}</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '14px', padding: '12px 14px', borderRadius: '12px', background: '#e1f5ec', color: '#0f5a3c', fontSize: '13px', lineHeight: '1.5' }}>
                  <span style={{ display: 'inline-flex', width: '16px', height: '16px', flexShrink: '0', marginTop: '1px' }}><Scale size={16} style={{ display: 'block' }} /></span>
                  {t('set_valeurs_par_defaut_conformes_au')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '22px' }}>
                  <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{v.holTitle}</span>
                  <span style={{ fontSize: '12.5px', color: '#5f7079' }}>{v.holCount}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: '6px', marginTop: '10px' }}>
                  {v.hols.map((h, hIndex) => (
                    <Fragment key={hIndex}>
                      <button type="button" onClick={h.toggle} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '11px', border: '1px solid #eef2f4', background: h.bg, fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer', opacity: h.op }}>
                        <span style={{ width: '58px', fontFamily: '\'Geist Mono\',monospace', fontSize: '11.5px', fontWeight: '600', color: h.dateColor }}>{h.d}</span>
                        <span style={{ flex: '1', fontSize: '13px', color: '#1d3540' }}>{h.name}</span>
                        <span style={{ position: 'relative', width: '32px', height: '18px', borderRadius: '99px', background: h.track, flexShrink: '0', transition: 'background .2s' }}>
                          <span style={{ position: 'absolute', top: '2px', insetInlineStart: h.knob, width: '14px', height: '14px', borderRadius: '50%', background: '#ffffff', transition: 'left .2s' }} />
                        </span>
                      </button>
                    </Fragment>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#7d8f97', marginTop: '10px' }}>{t('set_hol_lunar_note')}</div>
                {v.holAdd}
              </RV>
              </>
            ) : null}
            {v.tDocs ? (
              <>
              <RV as='div' variant='up' style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                    {t('set_langue_par_defaut_des_documents')}
                    <select value={v.d.lang} onChange={v.setDocLang} style={{ height: '42px', padding: '0 10px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', outline: 'none' }}>
                      <option value="fr">{t('set_francais')}</option>
                      <option value="ar">{t('set_s')}</option>
                      <option value="en">{t('set_english')}</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '12px' }}>
                  <button type="button" onClick={v.upSign} style={{ height: '120px', borderRadius: '14px', border: '1.5px dashed #b9dfe5', background: '#f8fdfd', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#0b5f72' }}>
                    {v.signNode}
                    <span style={{ fontSize: '12.5px', fontWeight: '600' }}>{v.signLabel}</span>
                  </button>
                  <button type="button" onClick={v.upStamp} style={{ height: '120px', borderRadius: '14px', border: '1.5px dashed #b9dfe5', background: '#f8fdfd', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#0b5f72' }}>
                    {v.stampNode}
                    <span style={{ fontSize: '12.5px', fontWeight: '600' }}>{v.stampLabel}</span>
                  </button>
                </div>
              </RV>
              </>
            ) : null}
            {v.tBilling ? (
              <>
              <RV as='div' variant='up' style={{ position: 'relative', overflow: 'hidden', padding: '22px', borderRadius: '20px', background: '#06141a', color: '#e8eff1' }}>
                <div aria-hidden="true" style={{ position: 'absolute', right: '-80px', top: '-120px', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.45),transparent)', pointerEvents: 'none' }} className="wedy-drift" />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.14em', color: '#5fe3f0' }}>{v.planEyebrow}</div>
                    <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '28px', letterSpacing: '-.03em', marginTop: '6px' }}>{v.planName}</div>
                    <div style={{ fontSize: '13.5px', color: '#9fb4bb', marginTop: '4px' }}>{v.planSub}</div>
                  </div>
                  <button type="button" onClick={v.contact} style={{ height: '40px', padding: '0 14px', border: 'none', borderRadius: '11px', background: '#effbfc', color: '#06141a', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}>{t('set_contacter_mon_conseiller')}</button>
                </div>
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '12px', marginTop: '20px' }}>
                  {v.usage.map((u, uIndex) => (
                    <Fragment key={uIndex}>
                      <div style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
                        <div style={{ fontSize: '12px', color: '#9fb4bb' }}>{u.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px' }}>{u.value}</div>
                        {u.pct != null && <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,.1)', overflow: 'hidden', marginTop: '8px' }}>
                          <RV as='div' variant='growx' style={{ height: '100%', width: `${u.pct}%`, borderRadius: '99px', background: 'linear-gradient(90deg,#16b6c8,#9a8bf0)', transformOrigin: v.rtl ? 'right' : 'left' }} />
                        </div>}
                      </div>
                    </Fragment>
                  ))}
                </div>
              </RV>
              <RV as='div' variant='up' delay={80} style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('set_factures')}</div>
                {v.invoicesNode}
              </RV>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {v.dirty ? (
        <>
        <RV as='div' variant='up' style={{ position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)', zIndex: '110', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 10px 10px 18px', borderRadius: '16px', background: '#0a1c24', color: '#e8eff1', boxShadow: '0 24px 50px -16px rgba(10,28,36,.6)', fontSize: '14px', maxWidth: 'calc(100vw - 32px)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f0bd6a' }} />
          <span style={{ whiteSpace: 'nowrap' }}>{t('set_modifications_non_enregistrees')}</span>
          <button type="button" onClick={v.cancel} style={{ height: '36px', padding: '0 13px', border: 'none', borderRadius: '10px', background: 'rgba(255,255,255,.1)', color: '#e8eff1', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{t('set_annuler')}</button>
          <button type="button" onClick={v.save} style={{ height: '36px', padding: '0 14px', border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{t('set_enregistrer')}</button>
        </RV>
        </>
      ) : null}
      {v.extra}
    </>
  );
}
