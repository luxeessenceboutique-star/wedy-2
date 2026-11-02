// Generated from design_handoff_wedy/design/Wedy Employee.dc.html by scripts/dc2jsx.mjs, then edited by hand.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Briefcase, Calendar, Check, CircleCheck, CloudUpload, Download, FileClock, FileText, Mail, MapPin, Pencil, Receipt, ScanText, Sparkles, Star, StarHalf, User, WandSparkles } from 'lucide-react';
import { RV } from '@/components/motion';
import { useLang } from '@/lib/lang';
import { tf } from '@/lib/format';
import type { EmployeeFolderVals } from './EmployeeFolderPage';
import './EmployeeFolderView.css';

export function EmployeeFolderView({ v }: { v: EmployeeFolderVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '26px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1240px', width: '100%' }}>
        <RV as={Link} variant='up' to="/app/employees" style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '7px', fontSize: '13.5px', color: '#52646d' }} className="emf-h1">
          <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><ArrowLeft size={15} style={{ display: 'block' }} /></span>
          {t('emf_retour_aux_employes')}
        </RV>
        <RV as='section' variant='up' delay={60} style={{ position: 'relative', overflow: 'hidden', borderRadius: '26px', background: '#06141a', color: '#e8eff1', padding: '28px', isolation: 'isolate' }}>
          <div aria-hidden="true" style={{ position: 'absolute', inset: '0', zIndex: '-1', pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '-8%', top: '-70%', width: '560px', height: '560px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.65),transparent)' }} className="wedy-drift" />
            <div style={{ position: 'absolute', right: '-6%', top: '-50%', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(109,90,214,.38),transparent)', '--dur': '26s', '--delay': '-9s' } as CSSProperties} className="wedy-drift" />
            <div style={{ position: 'absolute', inset: '0', backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '40px 40px', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 50%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 50%,transparent)' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '22px' }}>
            <div style={{ position: 'relative', width: '92px', height: '92px', flexShrink: '0' }}>
              <span style={{ position: 'absolute', inset: '0', borderRadius: '50%', border: '1.5px solid rgba(95,227,240,.6)' }} className="wedy-ping" />
              <span style={{ position: 'relative', width: '92px', height: '92px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '32px', fontWeight: '700', color: '#ffffff', border: '3px solid rgba(255,255,255,.18)', boxShadow: '0 0 50px -10px rgba(39,192,212,.8)' }}>{'YB'}</span>
            </div>
            <div style={{ flex: '1', minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(28px,3vw,38px)', letterSpacing: '-.045em', lineHeight: '1.05', color: '#f1f8f9' }}>{t('emf_yasmine_benali')}</h1>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '99px', background: 'rgba(43,189,134,.16)', color: '#4fd3a0' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2bbd86' }} />
                  {t('emf_actif')}
                </span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '15px', color: '#9fb4bb' }}>{t('emf_responsable_marketing_marketing')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '99px', background: 'rgba(154,139,240,.18)', color: '#c9c0f8' }}>{t('emf_cdd')}</span>
                <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', padding: '4px 10px', borderRadius: '99px', background: 'rgba(255,255,255,.06)', color: '#b9cbd0' }}>{t('emf_emp_0042')}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 10px', borderRadius: '99px', background: 'rgba(255,255,255,.06)', color: '#b9cbd0' }}>
                  <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Calendar size={13} style={{ display: 'block' }} /></span>
                  {t('emf_depuis_le_15_03_2022')}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 10px', borderRadius: '99px', background: 'rgba(255,255,255,.06)', color: '#b9cbd0' }}>
                  <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><MapPin size={13} style={{ display: 'block' }} /></span>
                  {t('emf_casablanca')}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '230px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(223,87,64,.12)', border: '1px solid rgba(239,107,84,.3)' }}>
                <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#ef8b78' }}><FileClock size={18} style={{ display: 'block' }} /></span>
                <div style={{ flex: '1' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#ffd9d1' }}>{t('emf_contrat_fin_dans_12_jours')}</div>
                  <div style={{ fontSize: '12px', color: '#d9a79c' }}>{t('emf_cdd_jusqu_au_12_11_2026')}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={v.renew} style={{ flex: '1', position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', height: '42px', padding: '0 14px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <span style={{ position: 'absolute', top: '0', bottom: '0', left: '0', width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} className="wedy-shine" />
                  <span style={{ position: 'relative', display: 'inline-flex', width: '15px', height: '15px' }}><WandSparkles size={15} style={{ display: 'block' }} /></span>
                  <span style={{ position: 'relative' }}>{t('emf_preparer_l_avenant')}</span>
                </button>
                <a href="mailto:yasmine.benali@tython.ma" aria-label={t('emf_email')} style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.08)', color: '#e8eff1' }} className="emf-h2">
                  <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Mail size={17} style={{ display: 'block' }} /></span>
                </a>
                <button type="button" onClick={v.editToast} aria-label={t('emf_modifier')} style={{ width: '42px', height: '42px', border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.08)', color: '#e8eff1', cursor: 'pointer' }} className="emf-h3">
                  <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Pencil size={16} style={{ display: 'block' }} /></span>
                </button>
              </div>
            </div>
          </div>
        </RV>
        <RV as='nav' variant='up' delay={100} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '5px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
          {v.tabs.map((t_, t_Index) => (
            <Fragment key={t_Index}>
              <button type="button" onClick={t_.go} style={{ position: 'relative', flex: '1 1 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '42px', padding: '0 12px', border: 'none', borderRadius: '12px', background: 'transparent', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', color: '#52646d', cursor: 'pointer', whiteSpace: 'nowrap' }} className="emf-h1">
                {t_.on ? (
                  <>
                  <RV as='span' variant='pill' style={{ position: 'absolute', inset: '0', borderRadius: '12px', background: '#0a1c24' }} />
                  </>
                ) : null}
                <span style={{ position: 'relative', display: 'inline-flex', width: '16px', height: '16px', color: t_.color }}><t_.icon size={16} style={{ display: 'block' }} /></span>
                <span style={{ position: 'relative', color: t_.color }}>{t_.label}</span>
              </button>
            </Fragment>
          ))}
        </RV>
        {v.tProfil ? (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '16px', alignItems: 'start' }}>
            <RV as='div' variant='up' style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}>
                <span style={{ display: 'inline-flex', width: '17px', height: '17px', color: '#0e6f84' }}><User size={17} style={{ display: 'block' }} /></span>
                <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('emf_informations_personnelles')}</span>
              </div>
              {v.personal.map((f, fIndex) => (
                <Fragment key={fIndex}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderTop: '1px solid #f0f3f4', fontSize: '14px' }}>
                    <span style={{ color: '#5f7079' }}>{f.label}</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', color: f.color }}>{f.value}</span>
                  </div>
                </Fragment>
              ))}
            </RV>
            <RV as='div' variant='up' delay={80} style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '16px' }}>
                <span style={{ display: 'inline-flex', width: '17px', height: '17px', color: '#6d5ad6' }}><Briefcase size={17} style={{ display: 'block' }} /></span>
                <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('emf_contrat_remuneration')}</span>
              </div>
              {v.contractInfo.map((f, fIndex) => (
                <Fragment key={fIndex}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderTop: '1px solid #f0f3f4', fontSize: '14px' }}>
                    <span style={{ color: '#5f7079' }}>{f.label}</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', color: f.color }}>{f.value}</span>
                  </div>
                </Fragment>
              ))}
            </RV>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <RV as='div' variant='up' delay={160} style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: '0' }}>
                  <svg viewBox="0 0 84 84" style={{ display: 'block', width: '84px', height: '84px', transform: 'rotate(-90deg)' }}>
                    <circle cx="42" cy="42" r="34" style={{ fill: 'none', stroke: '#eef2f4', strokeWidth: '9px' }} />
                    <circle cx="42" cy="42" r="34" style={{ fill: 'none', stroke: '#16b6c8', strokeWidth: '9px', strokeLinecap: 'round', strokeDasharray: v.ringDash, transition: 'stroke-dasharray .9s cubic-bezier(.2,.8,.2,1)' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '800', fontSize: '20px' }}>{`${v.completeness}%`}</div>
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{t('emf_dossier_complete')}</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#52646d', marginTop: '4px' }}>{v.missingLabel}</div>
                  {v.hasMissing ? (
                    <>
                    <button type="button" onClick={v.goFiles} style={{ marginTop: '8px', border: 'none', background: 'none', padding: '0', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', color: '#0e6f84', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      {t('emf_completer_avec_l_ia')}
                      <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><ArrowRight size={14} style={{ display: 'block' }} /></span>
                    </button>
                    </>
                  ) : null}
                </div>
              </RV>
              <RV as='div' variant='up' delay={220} style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
                  <span style={{ display: 'inline-flex', width: '17px', height: '17px', color: '#16a06b' }}><Sparkles size={17} style={{ display: 'block' }} /></span>
                  <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('emf_competences_langues')}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', padding: '5px 11px', borderRadius: '99px', background: '#e4f2f4', color: '#0b5f72' }}>{t('emf_marketing_digital')}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', padding: '5px 11px', borderRadius: '99px', background: '#e4f2f4', color: '#0b5f72' }}>{t('emf_seo_sea')}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', padding: '5px 11px', borderRadius: '99px', background: '#e4f2f4', color: '#0b5f72' }}>{t('emf_brand_management')}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', padding: '5px 11px', borderRadius: '99px', background: '#e4f2f4', color: '#0b5f72' }}>{t('emf_google_analytics')}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '10px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', padding: '5px 11px', borderRadius: '99px', background: '#ece9fb', color: '#5444b8', fontFamily: '\'Noto Kufi Arabic\',sans-serif' }}>{t('emf_s')}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', padding: '5px 11px', borderRadius: '99px', background: '#ece9fb', color: '#5444b8' }}>{t('emf_francais')}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', padding: '5px 11px', borderRadius: '99px', background: '#ece9fb', color: '#5444b8' }}>{t('emf_english')}</span>
                </div>
              </RV>
            </div>
          </div>
          </>
        ) : null}
        {v.tFiles ? (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: '16px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <RV as='div' variant='up' style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('emf_ajouter_un_fichier')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                  {v.fileTypes.map((ft, ftIndex) => (
                    <Fragment key={ftIndex}>
                      <button type="button" onClick={ft.pick} style={{ position: 'relative', height: '32px', padding: '0 12px', borderRadius: '99px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#52646d', cursor: 'pointer' }}>
                        {ft.on ? (
                          <>
                          <span style={{ position: 'absolute', inset: '-1px', borderRadius: '99px', background: '#0a1c24' }} />
                          </>
                        ) : null}
                        <span style={{ position: 'relative', color: ft.color }}>{ft.label}</span>
                      </button>
                    </Fragment>
                  ))}
                </div>
                <button type="button" onClick={v.upload} style={{ marginTop: '14px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '28px 16px', borderRadius: '16px', border: '1.5px dashed #b9dfe5', background: 'linear-gradient(180deg,#f3fafb,#ffffff)', fontFamily: 'inherit', cursor: 'pointer', transition: 'border-color .2s,background .2s' }} className="emf-h4">
                  <span style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }} className="wedy-float">
                    <span style={{ display: 'inline-flex', width: '22px', height: '22px' }}><CloudUpload size={22} style={{ display: 'block' }} /></span>
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a1c24' }}>{t('emf_deposez_un_fichier_ou_cliquez')}</span>
                  <span style={{ fontSize: '12.5px', color: '#5f7079' }}>{t('emf_pdf_docx_jpg_10_mo_max')}</span>
                </button>
              </RV>
              <RV as='div' variant='up' delay={80} style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{tf(t('emf_fichiers_filecount'), { fileCount: v.fileCount })}</div>
                {v.files.map((fl, flIndex) => (
                  <Fragment key={flIndex}>
                    <RV as='div' variant='up' style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 20px', borderTop: '1px solid #eef2f4' }}>
                      <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: fl.bg, color: fl.color, flexShrink: '0' }}>
                        <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><FileText size={16} style={{ display: 'block' }} /></span>
                      </span>
                      <div style={{ flex: '1', minWidth: '0' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fl.name}</div>
                        <div style={{ fontSize: '12px', color: '#5f7079' }}>{`${fl.type} · ${fl.size}`}</div>
                      </div>
                      <button type="button" onClick={v.dlToast} aria-label={t('emf_telecharger')} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '9px', background: 'transparent', color: '#7d8f97', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="emf-h5">
                        <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Download size={15} style={{ display: 'block' }} /></span>
                      </button>
                    </RV>
                  </Fragment>
                ))}
              </RV>
            </div>
            <RV as='div' variant='up' delay={120} style={{ position: 'relative', overflow: 'hidden', padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#6d5ad6,#16b6c8)', color: '#ffffff' }}>
                  <span style={{ display: 'inline-flex', width: '20px', height: '20px' }}><ScanText size={20} style={{ display: 'block' }} /></span>
                </span>
                <div>
                  <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '17px' }}>{t('emf_completer_le_dossier_avec_l_ia')}</div>
                  <div style={{ fontSize: '13px', color: '#52646d' }}>{t('emf_wedy_lit_les_fichiers_et_propose')}</div>
                </div>
              </div>
              {v.aiIdle ? (
                <>
                <div style={{ marginTop: '18px', padding: '16px', borderRadius: '14px', background: '#f8fafb', border: '1px solid #eef2f4', fontSize: '13.5px', lineHeight: '1.55', color: '#52646d' }}>{t('emf_rien_n_est_jamais_ecrase_sans')}</div>
                <button type="button" onClick={v.analyze} style={{ marginTop: '14px', width: '100%', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '46px', border: 'none', borderRadius: '12px', background: '#0a1c24', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }} className="emf-h6">
                  <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Sparkles size={16} style={{ display: 'block' }} /></span>
                  {t('emf_analyser_les_4_fichiers')}
                </button>
                </>
              ) : null}
              {v.aiBusy ? (
                <>
                <RV as='div' variant='up' style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: '#33474f' }}>
                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #d6dfe3', borderTopColor: '#16b6c8' }} className="wedy-spin" />
                    {t('emf_lecture_des_documents')}
                  </div>
                  <div style={{ height: '8px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '40%', borderRadius: '99px', background: 'linear-gradient(90deg,#16b6c8,#6d5ad6)' }} className="wedy-scan" />
                  </div>
                </RV>
                </>
              ) : null}
              {v.aiDone ? (
                <>
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {v.extracted.map((x, xIndex) => (
                    <Fragment key={xIndex}>
                      <RV as='button' variant='up' delay={Number(x.delay)} type="button" onClick={x.toggle} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', borderRadius: '12px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }} className="emf-h7">
                        <span style={{ width: '20px', height: '20px', borderRadius: '6px', border: '1.5px solid #c3ced3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', color: '#ffffff' }}>
                          {x.on ? (
                            <>
                            <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#0e6f84', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Check size={13} strokeWidth={3} style={{ display: 'block' }} /></span>
                            </span>
                            </>
                          ) : null}
                        </span>
                        <span style={{ flex: '1', minWidth: '0' }}>
                          <span style={{ display: 'block', fontSize: '12px', color: '#5f7079' }}>{x.label}</span>
                          <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0a1c24' }}>{x.value}</span>
                        </span>
                        {x.conflict ? (
                          <>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '99px', background: '#fbefda', color: '#8a5207' }}>{tf(t('emf_conflit_actuel_x_current'), { x_current: x.current })}</span>
                          </>
                        ) : null}
                        {x.empty ? (
                          <>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '99px', background: '#e1f5ec', color: '#0f6f49' }}>{t('emf_champ_vide')}</span>
                          </>
                        ) : null}
                      </RV>
                    </Fragment>
                  ))}
                  <button type="button" onClick={v.apply} disabled={v.noneSel} style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '46px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
                    <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Check size={16} strokeWidth={2.4} style={{ display: 'block' }} /></span>
                    {tf(t('emf_appliquer_selcount_champ_s'), { selCount: v.selCount })}
                  </button>
                </div>
                </>
              ) : null}
              {v.aiApplied ? (
                <>
                <RV as='div' variant='up' style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '14px', background: '#e1f5ec', color: '#0f6f49' }}>
                  <span style={{ display: 'inline-flex', width: '22px', height: '22px' }}><CircleCheck size={22} style={{ display: 'block' }} /></span>
                  <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    <strong>{t('emf_dossier_mis_a_jour')}</strong>
                    {' '}{t('emf_les_champs_valides_ont_ete')}
                  </div>
                </RV>
                </>
              ) : null}
            </RV>
          </div>
          </>
        ) : null}
        {v.tDocs ? (
          <>
          <RV as='div' variant='up' style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 20px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('emf_documents_generes')}</span>
              <Link to="/app/generate" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 14px', borderRadius: '11px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: '13.5px', fontWeight: '600' }} className="emf-h8">
                <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><WandSparkles size={15} style={{ display: 'block' }} /></span>
                {t('emf_generer_un_document')}
              </Link>
            </div>
            {v.docs.map((d, dIndex) => (
              <Fragment key={dIndex}>
                <RV as='div' variant='up' delay={Number(d.delay)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderTop: '1px solid #eef2f4', transition: 'background .15s' }} className="emf-h9">
                  <span style={{ width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84', flexShrink: '0' }}>
                    <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><FileText size={17} style={{ display: 'block' }} /></span>
                  </span>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <div dir={d.dir} style={{ fontSize: '14px', fontWeight: '600', textAlign: 'left' }}>{d.title}</div>
                    <div style={{ fontSize: '12.5px', color: '#5f7079' }}>{tf(t('emf_genere_par_d_by'), { d_by: d.by })}</div>
                  </div>
                  <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', background: '#e4f2f4', color: '#0e6f84' }}>{d.lang}</span>
                  <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#7d8f97', minWidth: '84px', textAlign: 'right', whiteSpace: 'nowrap' }}>{d.date}</span>
                  <button type="button" onClick={v.dlToast} aria-label={t('emf_telecharger')} style={{ width: '34px', height: '34px', border: 'none', borderRadius: '9px', background: 'transparent', color: '#7d8f97', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="emf-h5">
                    <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Download size={16} style={{ display: 'block' }} /></span>
                  </button>
                </RV>
              </Fragment>
            ))}
          </RV>
          </>
        ) : null}
        {v.tLeaves ? (
          <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px' }}>
              <RV as='div' variant='up' style={{ padding: '18px 20px', borderRadius: '18px', background: 'linear-gradient(135deg,#0b5f72,#0e7f96)', color: '#ffffff' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', opacity: '.9' }}>{t('emf_solde_disponible')}</div>
                <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '6px' }}>{'14,5 j'}</div>
                <div style={{ fontSize: '12.5px', opacity: '.9' }}>{t('emf_1_5_j_acquis_par_mois')}</div>
              </RV>
              <RV as='div' variant='up' delay={60} style={{ padding: '18px 20px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('emf_pris_en_2026')}</div>
                <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '6px' }}>{'8 j'}</div>
                <div style={{ fontSize: '12.5px', color: '#52646d' }}>{t('emf_dont_1_j_de_maladie')}</div>
              </RV>
              <RV as='div' variant='up' delay={120} style={{ padding: '18px 20px', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>{t('emf_en_attente')}</div>
                <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '36px', fontWeight: '800', letterSpacing: '-.04em', marginTop: '6px' }}>{'0'}</div>
                <div style={{ fontSize: '12.5px', color: '#52646d' }}>{t('emf_aucune_demande')}</div>
              </RV>
            </div>
            <RV as='div' variant='up' delay={120} style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('emf_historique_des_conges')}</div>
              {v.leaves.map((l, lIndex) => (
                <Fragment key={lIndex}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderTop: '1px solid #eef2f4' }}>
                    <span style={{ width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6', flexShrink: '0' }}>
                      <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Calendar size={17} style={{ display: 'block' }} /></span>
                    </span>
                    <div style={{ flex: '1', minWidth: '0' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{l.type}</div>
                      <div style={{ fontSize: '12.5px', color: '#5f7079' }}>{l.dates}</div>
                    </div>
                    <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', color: '#33474f' }}>{l.days}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '99px', background: l.bg, color: l.color }}>{l.status}</span>
                  </div>
                </Fragment>
              ))}
            </RV>
          </div>
          </>
        ) : null}
        {v.tPay ? (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '16px', alignItems: 'start' }}>
            <RV as='div' variant='up' style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('emf_octobre_2026')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px' }}>
                <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '40px', fontWeight: '800', letterSpacing: '-.045em' }}>{'13 942'}</span>
                <span style={{ fontSize: '14px', color: '#52646d' }}>{t('emf_mad_net')}</span>
              </div>
              <div style={{ display: 'flex', height: '12px', borderRadius: '99px', overflow: 'hidden', gap: '3px', marginTop: '16px' }}>
                <RV as='span' variant='growx' style={{ width: '75%', background: '#0e6f84', borderRadius: '99px', transformOrigin: 'left' }} />
                <RV as='span' variant='growx' delay={200} style={{ width: '6%', background: '#16b6c8', borderRadius: '99px', transformOrigin: 'left' }} />
                <RV as='span' variant='growx' delay={300} style={{ width: '19%', background: '#6d5ad6', borderRadius: '99px', transformOrigin: 'left' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '16px', fontSize: '13.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#33474f' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0e6f84' }} />
                    {t('emf_salaire_net')}
                  </span>
                  <span style={{ fontWeight: '600' }}>{t('emf_13_942_mad')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#33474f' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16b6c8' }} />
                    {t('emf_cnss_amo')}
                  </span>
                  <span style={{ fontWeight: '600' }}>{t('emf_1_111_mad')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#33474f' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6d5ad6' }} />
                    {'IR'}
                  </span>
                  <span style={{ fontWeight: '600' }}>{t('emf_3_447_mad')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '9px', borderTop: '1px solid #eef2f4' }}>
                  <span style={{ color: '#5f7079' }}>{t('emf_salaire_brut')}</span>
                  <span style={{ fontWeight: '700' }}>{t('emf_18_500_mad')}</span>
                </div>
              </div>
            </RV>
            <RV as='div' variant='up' delay={80} style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('emf_bulletins_de_paie')}</div>
              {v.slips.map((p, pIndex) => (
                <Fragment key={pIndex}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderTop: '1px solid #eef2f4' }}>
                    <span style={{ width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                      <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><Receipt size={17} style={{ display: 'block' }} /></span>
                    </span>
                    <div style={{ flex: '1' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{p.month}</div>
                      <div style={{ fontSize: '12.5px', color: '#5f7079' }}>{p.note}</div>
                    </div>
                    <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '13px', fontWeight: '600' }}>{p.net}</span>
                    <button type="button" onClick={v.dlToast} aria-label={t('emf_telecharger')} style={{ width: '34px', height: '34px', border: 'none', borderRadius: '9px', background: 'transparent', color: '#7d8f97', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="emf-h5">
                      <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Download size={16} style={{ display: 'block' }} /></span>
                    </button>
                  </div>
                </Fragment>
              ))}
            </RV>
          </div>
          </>
        ) : null}
        {v.tPerf ? (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '16px', alignItems: 'start' }}>
            <RV as='div' variant='up' style={{ position: 'relative', overflow: 'hidden', padding: '24px', borderRadius: '20px', background: 'linear-gradient(140deg,#5444b8,#6d5ad6 55%,#0e7f96)', color: '#ffffff' }}>
              <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.12em', opacity: '.85' }}>{t('emf_evaluation_annuelle_2025')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '12px' }}>
                <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '56px', fontWeight: '800', letterSpacing: '-.05em', lineHeight: '1' }}>{'4,3'}</span>
                <span style={{ fontSize: '18px', opacity: '.8' }}>{'/ 5'}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
                <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#ffd36b' }}><Star size={18} style={{ display: 'block' }} /></span>
                <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#ffd36b' }}><Star size={18} style={{ display: 'block' }} /></span>
                <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#ffd36b' }}><Star size={18} style={{ display: 'block' }} /></span>
                <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#ffd36b' }}><Star size={18} style={{ display: 'block' }} /></span>
                <span style={{ display: 'inline-flex', width: '18px', height: '18px', color: '#ffd36b' }}><StarHalf size={18} style={{ display: 'block' }} /></span>
              </div>
              <div style={{ marginTop: '12px', fontSize: '14.5px', fontWeight: '600' }}>{t('emf_depasse_les_attentes')}</div>
              <div style={{ marginTop: '4px', fontSize: '13px', opacity: '.85', lineHeight: '1.5' }}>{t('emf_leadership_remarque_sur_la')}</div>
            </RV>
            <RV as='div' variant='up' delay={80} style={{ padding: '22px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>{t('emf_objectifs_2026')}</div>
              {v.goals.map((g, gIndex) => (
                <Fragment key={gIndex}>
                  <div style={{ padding: '13px 0', borderTop: '1px solid #f0f3f4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{g.title}</span>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: g.bg, color: g.color, whiteSpace: 'nowrap' }}>{g.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '9px' }}>
                      <div style={{ flex: '1', height: '7px', borderRadius: '99px', background: '#eef2f4', overflow: 'hidden' }}>
                        <RV as='div' variant='growx' style={{ height: '100%', width: `${g.pct}%`, borderRadius: '99px', background: g.bar, transformOrigin: 'left' }} />
                      </div>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#52646d', width: '36px', textAlign: 'right' }}>{`${g.pct}%`}</span>
                    </div>
                  </div>
                </Fragment>
              ))}
            </RV>
          </div>
          </>
        ) : null}
      </div>
      {v.showToast ? (
        <>
        <RV as='div' variant='up' role="status" style={{ position: 'fixed', right: '24px', bottom: '24px', zIndex: '120', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px 11px 11px', borderRadius: '14px', background: '#0a1c24', color: '#e8eff1', boxShadow: '0 24px 50px -16px rgba(10,28,36,.6)', fontSize: '14px', maxWidth: 'calc(100vw - 48px)' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(39,192,212,.2)', color: '#5fe3f0', flexShrink: '0' }}>
            <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Sparkles size={15} style={{ display: 'block' }} /></span>
          </span>
          {v.toastText}
        </RV>
        </>
      ) : null}
    </>
  );
}
