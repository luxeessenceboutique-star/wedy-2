// Generated from design_handoff_wedy/design/Wedy Templates.dc.html by scripts/dc2jsx.mjs, then edited by hand.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Eye, FileText, FileUp, Upload, Pencil, Plus, Search, Sparkles, Trash2, WandSparkles, X } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { RV } from '@/components/motion';
import { useLang } from '@/lib/lang';
import { tf } from '@/lib/format';
import type { TemplatesVals } from './TemplatesPage';
import './TemplatesView.css';

export function TemplatesView({ v, edRef, pvRef }: { v: TemplatesVals; edRef: RefObject<HTMLDivElement | null>; pvRef: RefObject<HTMLDivElement | null> }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('tpl_modeles')}</RV>
            <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('tpl_vos_modeles_de_documents_avec_des')}</RV>
          </div>
          <RV as='div' variant='up' delay={100} style={{ position: 'relative', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={v.toggleAdd} aria-expanded={v.addOpen} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }} className="tpl-h3">
              <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}>{v.seeding ? <Spinner size={15} /> : <Upload size={15} style={{ display: 'block' }} />}</span>
              {t('tpl_import')}
              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><ChevronDown size={14} style={{ display: 'block' }} /></span>
            </button>
            {v.addOpen ? (
              <>
              <div onClick={v.toggleAdd} style={{ position: 'fixed', inset: '0', zIndex: '29' }} />
              <RV as='div' variant='up' style={{ position: 'absolute', right: '0', top: '50px', zIndex: '30', width: '300px', padding: '6px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 24px 50px -20px rgba(10,28,36,.35)' }}>
                <button type="button" onClick={v.openImport} style={{ width: '100%', display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '10px', border: 'none', borderRadius: '11px', background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }} className="tpl-h9">
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84', flexShrink: '0' }}><FileUp size={16} /></span>
                  <span>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0a1c24' }}>{t('tpl_import_title')}</span>
                    <span style={{ display: 'block', fontSize: '12.5px', color: '#52646d', marginTop: '2px' }}>{t('tpl_import_menu_sub')}</span>
                  </span>
                </button>
                <button type="button" onClick={v.seed} style={{ width: '100%', display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '10px', border: 'none', borderRadius: '11px', background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }} className="tpl-h9">
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6', flexShrink: '0' }}><Sparkles size={16} /></span>
                  <span>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0a1c24' }}>{t('tpl_official')}</span>
                    <span style={{ display: 'block', fontSize: '12.5px', color: '#52646d', marginTop: '2px' }}>{t('tpl_official_sub')}</span>
                  </span>
                </button>
              </RV>
              </>
            ) : null}
          <button type="button" onClick={v.newTpl} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
            <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Plus size={16} strokeWidth={2.2} style={{ display: 'block' }} /></span>
            {t('tpl_nouveau_modele')}
          </button>
          </RV>
        </div>
        <RV as='div' variant='up' delay={120} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '200px', maxWidth: '320px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', marginTop: '-7.5px', display: 'inline-flex', width: '15px', height: '15px', color: '#7d8f97', pointerEvents: 'none' }}><Search size={15} style={{ display: 'block' }} /></span>
            <input value={v.q} onChange={v.onQ} placeholder={t('tpl_rechercher_un_modele')} style={{ width: '100%', height: '40px', padding: '0 12px 0 36px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13.5px', color: '#0a1c24', outline: 'none' }} className="tpl-f1" />
          </div>
          {v.cats.map((c, cIndex) => (
            <Fragment key={cIndex}>
              <button type="button" onClick={c.go} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '34px', padding: '0 12px', borderRadius: '99px', border: `1px solid ${c.border}`, background: c.bg, color: c.color, fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {c.label}
                <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', opacity: '.7' }}>{c.n}</span>
              </button>
            </Fragment>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', padding: '4px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            {v.targets.map((t_, t_Index) => (
              <Fragment key={t_Index}>
                <button type="button" onClick={t_.go} style={{ position: 'relative', height: '32px', padding: '0 12px', border: 'none', borderRadius: '9px', background: 'transparent', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', color: t_.color }}>
                  {t_.on ? (
                    <>
                    <RV as='span' variant='pill' style={{ position: 'absolute', inset: '0', borderRadius: '9px', background: '#0a1c24' }} />
                    </>
                  ) : null}
                  <span style={{ position: 'relative' }}>{t_.label}</span>
                </button>
              </Fragment>
            ))}
          </div>
        </RV>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '14px' }}>
          {v.tpls.map((t_, t_Index) => (
            <Fragment key={t_Index}>
              <RV as='div' variant='up' delay={Number(t_.delay)} style={{ display: 'flex', flexDirection: 'column', borderRadius: '18px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden', transition: 'box-shadow .25s,border-color .25s,transform .25s' }} className="tpl-h2">
                <button type="button" onClick={t_.preview} aria-label={t('tpl_apercu')} style={{ position: 'relative', height: '150px', border: 'none', background: `linear-gradient(180deg,${t_.tint},#ffffff)`, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px 0 0', overflow: 'hidden', cursor: 'zoom-in' }}>
                  <span style={{ width: '62%', maxWidth: '170px', height: '160px', borderRadius: '6px', background: '#ffffff', boxShadow: '0 16px 30px -18px rgba(10,28,36,.5)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px', transform: 'rotate(-2deg)' }}>
                    <span style={{ height: '6px', width: '44%', borderRadius: '3px', background: '#0a1c24', alignSelf: 'center' }} />
                    <span style={{ height: '4px', width: '100%', borderRadius: '3px', background: '#e7ecee', marginTop: '6px' }} />
                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ height: '4px', width: '28%', borderRadius: '3px', background: '#e7ecee' }} />
                      <span style={{ height: '8px', width: '36%', borderRadius: '4px', background: '#d4ecef' }} />
                      <span style={{ height: '4px', flex: '1', borderRadius: '3px', background: '#e7ecee' }} />
                    </span>
                    <span style={{ height: '4px', width: '92%', borderRadius: '3px', background: '#e7ecee' }} />
                    <span style={{ height: '4px', width: '74%', borderRadius: '3px', background: '#e7ecee' }} />
                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ height: '8px', width: '30%', borderRadius: '4px', background: '#d4ecef' }} />
                      <span style={{ height: '4px', flex: '1', borderRadius: '3px', background: '#e7ecee' }} />
                    </span>
                    <span style={{ height: '4px', width: '86%', borderRadius: '3px', background: '#e7ecee' }} />
                    <span style={{ height: '4px', width: '40%', borderRadius: '3px', background: '#e7ecee', alignSelf: 'flex-end', marginTop: '8px' }} />
                  </span>
                </button>
                <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '6px', flex: '1' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px', background: t_.tint, color: t_.color }}>{t_.cat}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px', background: '#f3f6f7', color: '#33474f' }}>
                      <span style={{ display: 'inline-flex', width: '11px', height: '11px' }}><t_.tIcon size={11} style={{ display: 'block' }} /></span>
                      {t_.target}
                    </span>
                  </div>
                  <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '16px', letterSpacing: '-.02em', lineHeight: '1.25', marginTop: '2px' }}>{t_.fr}</div>
                  <div style={{ fontSize: '12.5px', color: '#5f7079' }}>{t_.en}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '8px' }}>
                    {t_.langs.map((l, lIndex) => (
                      <Fragment key={lIndex}>
                        <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '10.5px', fontWeight: '600', padding: '2px 6px', borderRadius: '6px', background: '#eef5f7', color: '#0b5f72' }}>{l.t}</span>
                      </Fragment>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: '#7d8f97' }}>{tf(t('tpl_t_nvars_variables_t_used'), { t_nvars: t_.nvars, t_used: t_.used })}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    <button type="button" onClick={t_.preview} style={{ flex: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '36px', borderRadius: '10px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#33474f', cursor: 'pointer' }} className="tpl-h3">
                      <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Eye size={14} style={{ display: 'block' }} /></span>
                      {t('tpl_apercu')}
                    </button>
                    <button type="button" onClick={t_.edit} style={{ flex: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '36px', borderRadius: '10px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#33474f', cursor: 'pointer' }} className="tpl-h3">
                      <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Pencil size={14} style={{ display: 'block' }} /></span>
                      {t('tpl_modifier')}
                    </button>
                    <Link to={t_.generate} aria-label={t('tpl_generer')} style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff' }} className="tpl-h4">
                      <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><WandSparkles size={15} style={{ display: 'block' }} /></span>
                    </Link>
                  </div>
                </div>
              </RV>
            </Fragment>
          ))}
        </div>
        {v.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Spinner /></div>
        ) : v.noTpls ? (
          <div style={{ padding: '40px 20px', borderRadius: '18px', border: '1px dashed #d0dadf', textAlign: 'center', fontSize: '14px', color: '#52646d' }}>
            {v.noneAtAll ? t('tpl_none_yet') : t('tpl_aucun_modele_ne_correspond_a_ces')}
            {v.noneAtAll ? (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
                <button type="button" onClick={v.seed} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 14px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} className="tpl-h3"><Sparkles size={14} />{t('tpl_official')}</button>
                <button type="button" onClick={v.openImport} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 14px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} className="tpl-h3"><FileUp size={14} />{t('tpl_import')}</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {v.previewOpen ? (
        <>
        <div onClick={v.closePreview} style={{ position: 'fixed', inset: '0', zIndex: '100', background: 'rgba(6,20,26,.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
        <RV as='div' variant='scale' style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: '101', width: 'min(760px,calc(100vw - 32px))', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', borderRadius: '20px', background: '#ffffff', overflow: 'hidden', boxShadow: '0 40px 100px -30px rgba(6,20,26,.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #eef2f4' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: v.pv.tint, color: v.pv.color }}>
              <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><FileText size={17} style={{ display: 'block' }} /></span>
            </span>
            <div style={{ flex: '1', minWidth: '0' }}>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>{v.pv.fr}</div>
              <div style={{ fontSize: '12px', color: '#5f7079' }}>{tf(t('tpl_pv_cat_apercu'), { pv_cat: v.pv.cat })}</div>
            </div>
            <button type="button" onClick={v.closePreview} aria-label={t('tpl_fermer')} style={{ width: '36px', height: '36px', border: 'none', borderRadius: '10px', background: '#f3f6f7', color: '#52646d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><X size={16} style={{ display: 'block' }} /></span>
            </button>
          </div>
          <div style={{ flex: '1', overflowY: 'auto', padding: '22px', background: '#eef2f4' }}>
            <div style={{ background: '#ffffff', borderRadius: '6px', padding: '36px 44px', boxShadow: '0 20px 40px -26px rgba(10,28,36,.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#06141a,#0e6f84)', color: '#ffffff', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '800', fontSize: '13px' }}>{v.companyInitials}</span>
                <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '14px' }}>{v.company}</span>
              </div>
              <div style={{ height: '2px', background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', marginTop: '12px' }} />
              <div style={{ margin: '26px 0 18px', textAlign: 'center', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '18px', letterSpacing: '.1em' }}>{v.pv.upper}</div>
              <div ref={pvRef} style={{ fontFamily: 'Georgia,\'Times New Roman\',serif', fontSize: '14.5px', lineHeight: '1.85', color: '#1d2a30' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '12px 18px', borderTop: '1px solid #eef2f4' }}>
            {v.pv.langs.map((l, lIndex) => (
              <Fragment key={lIndex}>
                <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', fontWeight: '600', padding: '3px 7px', borderRadius: '6px', background: '#eef5f7', color: '#0b5f72' }}>{l.t}</span>
              </Fragment>
            ))}
            <span style={{ fontSize: '12.5px', color: '#5f7079' }}>{tf(t('tpl_pv_nvars_variables'), { pv_nvars: v.pv.nvars })}</span>
            <button type="button" onClick={v.pv.remove} aria-label={t('tpl_delete')} title={t('tpl_delete')} style={{ marginLeft: 'auto', width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #f0c9c0', background: '#ffffff', color: '#b8402c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="tpl-h8">
              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Trash2 size={14} style={{ display: 'block' }} /></span>
            </button>
            <button type="button" onClick={v.pv.edit} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 13px', borderRadius: '10px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', color: '#33474f', cursor: 'pointer' }}>
              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Pencil size={14} style={{ display: 'block' }} /></span>
              {t('tpl_modifier')}
            </button>
            <Link to={v.pv.generate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 14px', borderRadius: '10px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontSize: '13px', fontWeight: '600' }} className="tpl-h4">
              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><WandSparkles size={14} style={{ display: 'block' }} /></span>
              {t('tpl_generer_avec_ce_modele')}
            </Link>
          </div>
        </RV>
        </>
      ) : null}
      {v.editorOpen ? (
        <>
        <RV as='div' variant='fade' style={{ position: 'fixed', inset: '0', zIndex: '200', display: 'flex', flexDirection: 'column', background: '#eef2f4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '12px 18px', background: '#ffffff', borderBottom: '1px solid #e2e8eb' }}>
            <button type="button" onClick={v.closeEditor} aria-label={t('tpl_fermer_l_editeur')} style={{ width: '38px', height: '38px', border: 'none', borderRadius: '10px', background: '#f3f6f7', color: '#33474f', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><ArrowLeft size={17} style={{ display: 'block' }} /></span>
            </button>
            <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px', whiteSpace: 'nowrap' }}>{v.editorTitle}</span>
            <input value={v.eName} onChange={v.onEName} placeholder={t('tpl_nom_fr')} style={{ flex: '1 1 200px', maxWidth: '280px', height: '38px', padding: '0 11px', borderRadius: '10px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '13.5px', color: '#0a1c24', outline: 'none' }} className="tpl-f5" />
            <input value={v.eNameEn} onChange={v.onENameEn} placeholder={t('tpl_nom_en')} style={{ flex: '1 1 160px', maxWidth: '220px', height: '38px', padding: '0 11px', borderRadius: '10px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '13.5px', color: '#0a1c24', outline: 'none' }} className="tpl-f5" />
            <select value={v.eCat} onChange={v.onECat} style={{ height: '38px', padding: '0 10px', borderRadius: '10px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13px', color: '#33474f', outline: 'none' }}>
              <option value="attestation">{t('tpl_attestation')}</option>
              <option value="contrat">{t('tpl_contrat')}</option>
              <option value="lettre">{t('tpl_lettre')}</option>
              <option value="avenant">{t('tpl_avenant')}</option>
              <option value="autre">{t('tpl_autre')}</option>
            </select>
            <select value={v.eTarget} onChange={v.onETarget} style={{ height: '38px', padding: '0 10px', borderRadius: '10px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13px', color: '#33474f', outline: 'none' }}>
              <option value="employee">{t('tpl_employe')}</option>
              <option value="intern">{t('tpl_stagiaire')}</option>
              <option value="both">{t('tpl_les_deux')}</option>
            </select>
            <button type="button" onClick={v.save} disabled={v.saving} style={{ opacity: v.saving ? .7 : 1, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '7px', height: '40px', padding: '0 16px', border: 'none', borderRadius: '11px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 10px 22px -12px rgba(22,182,200,.85)' }}>
              <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}>{v.saving ? <Spinner size={15} color="#fff" /> : <Check size={15} strokeWidth={2.4} style={{ display: 'block' }} />}</span>
              {t('tpl_enregistrer')}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap', padding: '7px 18px', background: '#ffffff', borderBottom: '1px solid #e2e8eb' }}>
            {v.tools.map((b, bIndex) => (
              <Fragment key={bIndex}>
                <button type="button" onMouseDown={b.run} title={b.title} style={{ minWidth: '34px', height: '34px', padding: '0 8px', border: 'none', borderRadius: '8px', background: 'transparent', color: '#33474f', fontFamily: b.font, fontSize: '13px', fontWeight: b.weight, fontStyle: b.italic, textDecoration: b.deco, cursor: 'pointer', marginRight: b.gap }} className="tpl-h6">{b.label}</button>
              </Fragment>
            ))}
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#52646d' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: v.dirtyDot }} />
              {v.detLabel}
            </span>
          </div>
          <div style={{ flex: '1', minHeight: '0', display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: '1', minWidth: '0', overflowY: 'auto', padding: '28px 20px' }}>
              <div style={{ maxWidth: '760px', margin: '0 auto', background: '#ffffff', borderRadius: '6px', boxShadow: '0 30px 60px -30px rgba(10,28,36,.4),0 0 0 1px #e2e8eb', padding: '44px 52px', minHeight: '760px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#06141a,#0e6f84)', color: '#ffffff', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '800', fontSize: '13px' }}>{v.companyInitials}</span>
                  <div>
                    <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '14.5px' }}>{v.company}</div>
                    {v.companyAddress ? <div style={{ fontSize: '11px', color: '#7d8f97' }}>{v.companyAddress}</div> : null}
                  </div>
                </div>
                <div style={{ height: '2px', background: 'linear-gradient(90deg,#0e6f84,#16b6c8)', marginTop: '12px' }} />
                <div style={{ margin: '28px 0 20px', textAlign: 'center', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '19px', letterSpacing: '.1em' }}>{v.eUpper}</div>
                <div contentEditable="true" spellCheck="false" onInput={v.onEdit} ref={edRef} style={{ outline: 'none', minHeight: '440px', fontFamily: 'Georgia,\'Times New Roman\',serif', fontSize: '15px', lineHeight: '1.85', color: '#1d2a30' }} />
              </div>
              <p style={{ maxWidth: '760px', margin: '12px auto 0', textAlign: 'center', fontSize: '12px', color: '#7d8f97' }}>{t('tpl_cliquez_dans_le_document_pour')}</p>
            </div>
            <aside style={{ width: '280px', flexShrink: '0', overflowY: 'auto', background: '#ffffff', borderLeft: '1px solid #e2e8eb', padding: '16px' }}>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '15px' }}>{t('tpl_inserer_une_variable')}</div>
              <div style={{ fontSize: '12.5px', color: '#5f7079', marginTop: '3px', lineHeight: '1.45' }}>{t('tpl_cliquez_pour_l_ajouter_la_ou_se')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '12px' }}>
                {v.evars.map((v_, v_Index) => (
                  <Fragment key={v_Index}>
                    <button type="button" onMouseDown={v_.insert} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '7px 8px', border: 'none', borderRadius: '9px', background: v_.bg, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }} className="tpl-h7">
                      <code style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', fontWeight: '600', padding: '2px 6px', borderRadius: '6px', background: '#e4f2f4', color: '#0b5f72', whiteSpace: 'nowrap' }}>{v_.code}</code>
                      <span style={{ flex: '1', fontSize: '12.5px', color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v_.label}</span>
                      {v_.used ? (
                        <>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px', color: '#16a06b' }}><Check size={13} strokeWidth={2.6} style={{ display: 'block' }} /></span>
                        </>
                      ) : null}
                    </button>
                  </Fragment>
                ))}
              </div>
            </aside>
          </div>
        </RV>
        </>
      ) : null}
    </>
  );
}
