// Generated from design_handoff_wedy/design/Wedy Employees.dc.html by scripts/dc2jsx.mjs, then edited by hand.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Calendar, Check, ChevronDown, ChevronsUpDown, CircleAlert, Clock, Columns3, Download, Eye, FileClock, FileSpreadsheet, FileUp, GraduationCap, LayoutGrid, List, Mail, Plus, Search, SearchX, Trash2, Upload, UserPlus, Users, WandSparkles, X } from 'lucide-react';
import { RV } from '@/components/motion';
import { Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { tf } from '@/lib/format';
import type { EmployeesVals } from './EmployeesPage';
import './EmployeesView.css';

export function EmployeesView({ v }: { v: EmployeesVals }) {
  const { t } = useLang();
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <RV as='div' variant='up' style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('emp_employes')}</h1>
              <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '13px', fontWeight: '500', padding: '3px 10px', borderRadius: '99px', background: '#e4f2f4', color: '#0e6f84' }}>{v.total}</span>
            </RV>
            <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('emp_dossiers_contrats_et_documents_de')}</RV>
          </div>
          <RV as='div' variant='up' delay={100} style={{ position: 'relative', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={v.deptToast} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }} className="emp-h1">
              <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Building2 size={15} style={{ display: 'block' }} /></span>
              {t('emp_departements')}
            </button>
            <button type="button" onClick={v.toggleImport} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }} className="emp-h1">
              <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Upload size={15} style={{ display: 'block' }} /></span>
              {t('emp_importer')}
              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><ChevronDown size={14} style={{ display: 'block' }} /></span>
            </button>
            <button type="button" onClick={v.exportToast} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '42px', padding: '0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }} className="emp-h1">
              <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Download size={15} style={{ display: 'block' }} /></span>
              {t('emp_exporter')}
            </button>
            <button type="button" onClick={v.openDrawer} style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
              <span style={{ position: 'absolute', top: '0', bottom: '0', left: '0', width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} className="wedy-shine" />
              <span style={{ position: 'relative', display: 'inline-flex', width: '16px', height: '16px' }}><Plus size={16} strokeWidth={2.2} style={{ display: 'block' }} /></span>
              <span style={{ position: 'relative' }}>{t('emp_ajouter_un_employe')}</span>
            </button>
            {v.importOpen ? (
              <>
              <RV as='div' variant='up' style={{ position: 'absolute', right: '120px', top: '50px', zIndex: '30', width: '300px', padding: '6px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8eb', boxShadow: '0 24px 50px -20px rgba(10,28,36,.35)' }}>
                <button type="button" onClick={v.smartImport} style={{ width: '100%', display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '10px', border: 'none', borderRadius: '11px', background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }} className="emp-h2">
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e1f5ec', color: '#16a06b', flexShrink: '0' }}>
                    <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><FileSpreadsheet size={16} style={{ display: 'block' }} /></span>
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0a1c24' }}>{t('emp_import_intelligent')}</span>
                    <span style={{ display: 'block', fontSize: '12.5px', color: '#52646d', marginTop: '2px' }}>{t('emp_excel_ou_csv_colonnes_detectees')}</span>
                  </span>
                </button>
                <button type="button" onClick={v.cvImport} style={{ width: '100%', display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '10px', border: 'none', borderRadius: '11px', background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }} className="emp-h2">
                  <span style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6', flexShrink: '0' }}>
                    <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><FileUp size={16} style={{ display: 'block' }} /></span>
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0a1c24' }}>
                      {t('emp_importer_un_cv')}{' '}
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '99px', background: '#ece9fb', color: '#5444b8' }}>{'IA'}</span>
                    </span>
                    <span style={{ display: 'block', fontSize: '12.5px', color: '#52646d', marginTop: '2px' }}>{t('emp_wedy_lit_le_cv_et_pre_remplit_le')}</span>
                  </span>
                </button>
              </RV>
              </>
            ) : null}
          </RV>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '12px' }}>
          <RV as='button' variant='up' delay={120} type="button" onClick={v.quickAll} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', transition: 'border-color .2s,box-shadow .2s' }} className="emp-h3">
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e4f2f4', color: '#0e6f84' }}>
              <span style={{ display: 'inline-flex', width: '18px', height: '18px' }}><Users size={18} style={{ display: 'block' }} /></span>
            </span>
            <span>
              <span style={{ display: 'block', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '24px', fontWeight: '800', letterSpacing: '-.03em', color: '#0a1c24' }}>{v.cActive}</span>
              <span style={{ display: 'block', fontSize: '12.5px', color: '#52646d' }}>{t('emp_actifs')}</span>
            </span>
          </RV>
          <RV as='button' variant='up' delay={170} type="button" onClick={v.quickLeave} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', transition: 'border-color .2s,box-shadow .2s' }} className="emp-h3">
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbefda', color: '#b06b0c' }}>
              <span style={{ display: 'inline-flex', width: '18px', height: '18px' }}><Calendar size={18} style={{ display: 'block' }} /></span>
            </span>
            <span>
              <span style={{ display: 'block', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '24px', fontWeight: '800', letterSpacing: '-.03em', color: '#0a1c24' }}>{v.cLeave}</span>
              <span style={{ display: 'block', fontSize: '12.5px', color: '#52646d' }}>{t('emp_en_conge')}</span>
            </span>
          </RV>
          <RV as='button' variant='up' delay={220} type="button" onClick={v.quickExpiring} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', transition: 'border-color .2s,box-shadow .2s' }} className="emp-h3">
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fbe9e6', color: '#df5740' }}>
              <span style={{ display: 'inline-flex', width: '18px', height: '18px' }}><FileClock size={18} style={{ display: 'block' }} /></span>
            </span>
            <span>
              <span style={{ display: 'block', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '24px', fontWeight: '800', letterSpacing: '-.03em', color: '#0a1c24' }}>{v.cExpiring}</span>
              <span style={{ display: 'block', fontSize: '12.5px', color: '#52646d' }}>{t('emp_contrats_a_echeance')}</span>
            </span>
          </RV>
          <RV as='button' variant='up' delay={270} type="button" onClick={v.quickInterns} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', transition: 'border-color .2s,box-shadow .2s' }} className="emp-h3">
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ece9fb', color: '#6d5ad6' }}>
              <span style={{ display: 'inline-flex', width: '18px', height: '18px' }}><GraduationCap size={18} style={{ display: 'block' }} /></span>
            </span>
            <span>
              <span style={{ display: 'block', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontSize: '24px', fontWeight: '800', letterSpacing: '-.03em', color: '#0a1c24' }}>{v.cInterns}</span>
              <span style={{ display: 'block', fontSize: '12.5px', color: '#52646d' }}>{t('emp_stagiaires')}</span>
            </span>
          </RV>
        </div>
        <RV as='div' variant='up' delay={150} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', marginTop: '-8px', display: 'inline-flex', width: '16px', height: '16px', color: '#7d8f97', pointerEvents: 'none' }}><Search size={16} style={{ display: 'block' }} /></span>
            <input value={v.q} onChange={v.onQ} placeholder={t('emp_rechercher_un_nom_un_poste_un')} style={{ width: '100%', height: '44px', padding: '0 14px 0 40px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', color: '#0a1c24', outline: 'none', transition: 'border-color .2s,box-shadow .2s' }} className="emp-f4" />
          </div>
          <select value={v.dept} onChange={v.onDept} style={{ height: '44px', padding: '0 34px 0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '500', color: '#33474f', cursor: 'pointer', outline: 'none' }}>
            <option value="all">{t('emp_tous_les_services')}</option>
            {v.deptOptions.map(d => (<option key={d} value={d}>{d}</option>))}
          </select>
          <select value={v.status} onChange={v.onStatus} style={{ height: '44px', padding: '0 34px 0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '500', color: '#33474f', cursor: 'pointer', outline: 'none' }}>
            <option value="all">{t('emp_tous_les_statuts')}</option>
            <option value="active">{t('emp_actif')}</option>
            <option value="on-leave">{t('emp_en_conge')}</option>
            <option value="inactive">{t('emp_inactif')}</option>
            <option value="terminated">{t('emp_termine')}</option>
            <option value="expiring">{t('emp_contrat_a_echeance')}</option>
          </select>
          <select value={v.contract} onChange={v.onContract} style={{ height: '44px', padding: '0 34px 0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '500', color: '#33474f', cursor: 'pointer', outline: 'none' }}>
            <option value="all">{t('emp_tous_les_contrats')}</option>
            {v.contractOptions.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          <div style={{ display: 'flex', padding: '4px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8eb' }}>
            <button type="button" onClick={v.vList} aria-label={t('emp_liste')} style={{ position: 'relative', width: '36px', height: '34px', border: 'none', borderRadius: '9px', background: 'transparent', color: '#52646d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {v.isList ? (
                <>
                <span style={{ position: 'absolute', inset: '0', borderRadius: '9px', background: '#0a1c24' }} />
                <span style={{ position: 'relative', display: 'inline-flex', width: '16px', height: '16px', color: '#ffffff' }}><List size={16} style={{ display: 'block' }} /></span>
                </>
              ) : null}
              {v.notList ? (
                <>
                <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><List size={16} style={{ display: 'block' }} /></span>
                </>
              ) : null}
            </button>
            <button type="button" onClick={v.vGrid} aria-label={t('emp_grille')} style={{ position: 'relative', width: '36px', height: '34px', border: 'none', borderRadius: '9px', background: 'transparent', color: '#52646d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {v.isGrid ? (
                <>
                <span style={{ position: 'absolute', inset: '0', borderRadius: '9px', background: '#0a1c24' }} />
                <span style={{ position: 'relative', display: 'inline-flex', width: '16px', height: '16px', color: '#ffffff' }}><LayoutGrid size={16} style={{ display: 'block' }} /></span>
                </>
              ) : null}
              {v.notGrid ? (
                <>
                <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><LayoutGrid size={16} style={{ display: 'block' }} /></span>
                </>
              ) : null}
            </button>
            <button type="button" onClick={v.vKanban} aria-label={t('emp_kanban')} style={{ position: 'relative', width: '36px', height: '34px', border: 'none', borderRadius: '9px', background: 'transparent', color: '#52646d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {v.isKanban ? (
                <>
                <span style={{ position: 'absolute', inset: '0', borderRadius: '9px', background: '#0a1c24' }} />
                <span style={{ position: 'relative', display: 'inline-flex', width: '16px', height: '16px', color: '#ffffff' }}><Columns3 size={16} style={{ display: 'block' }} /></span>
                </>
              ) : null}
              {v.notKanban ? (
                <>
                <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Columns3 size={16} style={{ display: 'block' }} /></span>
                </>
              ) : null}
            </button>
          </div>
        </RV>
        {v.hasSel ? (
          <>
          <RV as='div' variant='up' style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '10px 12px 10px 16px', borderRadius: '14px', background: '#0a1c24', color: '#e8eff1' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{tf(t('emp_selcount_selectionne_s'), { selCount: v.selCount })}</span>
            <span style={{ flex: '1' }} />
            <button type="button" onClick={v.bulkDoc} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 12px', border: 'none', borderRadius: '10px', background: 'rgba(255,255,255,.1)', color: '#ffffff', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} className="emp-h5">
              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><WandSparkles size={14} style={{ display: 'block' }} /></span>
              {t('emp_generer_un_document')}
            </button>
            <button type="button" onClick={v.exportToast} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 12px', border: 'none', borderRadius: '10px', background: 'rgba(255,255,255,.1)', color: '#ffffff', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }} className="emp-h5">
              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Download size={14} style={{ display: 'block' }} /></span>
              {t('emp_exporter')}
            </button>
            <button type="button" onClick={v.clearSel} aria-label={t('emp_effacer_la_selection')} style={{ width: '36px', height: '36px', border: 'none', borderRadius: '10px', background: 'transparent', color: '#9fb4bb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="emp-h6">
              <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><X size={16} style={{ display: 'block' }} /></span>
            </button>
          </RV>
          </>
        ) : null}
        {v.isList ? (
          <>
          <RV as='div' variant='up' delay={200} style={{ borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '1060px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '44px minmax(230px,2.2fr) minmax(160px,1.5fr) 130px 100px 120px 110px 110px 116px', alignItems: 'center', padding: '11px 16px', background: '#f8fafb', borderBottom: '1px solid #eef2f4', fontSize: '11px', fontWeight: '700', letterSpacing: '.06em', textTransform: 'uppercase', color: '#5f7079' }}>
                  <button type="button" onClick={v.toggleAll} aria-label={t('emp_tout_selectionner')} style={{ width: '20px', height: '20px', borderRadius: '6px', border: '1.5px solid #c3ced3', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', color: '#ffffff' }}>
                    {v.allSel ? (
                      <>
                      <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#0e6f84', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Check size={13} strokeWidth={3} style={{ display: 'block' }} /></span>
                      </span>
                      </>
                    ) : null}
                  </button>
                  <span>{t('emp_nom_complet')}</span>
                  <span>{t('emp_poste')}</span>
                  <span>{t('emp_service')}</span>
                  <span>{t('emp_contrat')}</span>
                  <span>{t('emp_statut')}</span>
                  <span>{t('emp_embauche')}</span>
                  <span>{t('emp_fin_contrat')}</span>
                  <span style={{ textAlign: 'right' }}>{t('emp_actions')}</span>
                </div>
                {v.rows.map((e, eIndex) => (
                  <Fragment key={eIndex}>
                    <RV as='div' variant='up' delay={Number(e.delay)} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '44px minmax(230px,2.2fr) minmax(160px,1.5fr) 130px 100px 120px 110px 110px 116px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #eef2f4', transition: 'background .15s' }} className="emp-h7">
                      {e.isNew ? (
                        <>
                        <RV as='span' variant='fade' style={{ position: 'absolute', inset: '0', background: 'linear-gradient(90deg,rgba(22,182,200,.12),transparent 70%)', pointerEvents: 'none' }} />
                        </>
                      ) : null}
                      <button type="button" onClick={e.toggle} aria-label={t('emp_selectionner')} style={{ position: 'relative', width: '20px', height: '20px', borderRadius: '6px', border: '1.5px solid #c3ced3', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', color: '#ffffff' }}>
                        {e.sel ? (
                          <>
                          <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#0e6f84', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Check size={13} strokeWidth={3} style={{ display: 'block' }} /></span>
                          </span>
                          </>
                        ) : null}
                      </button>
                      <Link to={e.href} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '11px', minWidth: '0', textDecoration: 'none', color: '#0a1c24' }}>
                        <span style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: e.av, color: '#ffffff', fontSize: '12.5px', fontWeight: '700', flexShrink: '0' }}>{e.ini}</span>
                        <span style={{ minWidth: '0' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {e.name}
                            {e.isNew ? (
                              <>
                              <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '99px', background: '#e4f2f4', color: '#0e6f84' }}>{t('emp_nouveau')}</span>
                              </>
                            ) : null}
                          </span>
                          <span style={{ display: 'block', fontSize: '12.5px', color: '#5f7079', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.email}</span>
                        </span>
                      </Link>
                      <span style={{ fontSize: '13.5px', color: '#33474f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>{e.position}</span>
                      <span style={{ fontSize: '13.5px', color: '#33474f', whiteSpace: 'nowrap' }}>{e.dept}</span>
                      <span>
                        {e.cCDI ? (
                          <>
                          <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#e4f2f4', color: '#0b5f72' }}>{t('emp_cdi')}</span>
                          </>
                        ) : null}
                        {e.cCDD ? (
                          <>
                          <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#ece9fb', color: '#5444b8' }}>{t('emp_cdd')}</span>
                          </>
                        ) : null}
                        {e.cStage ? (
                          <>
                          <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#fbefda', color: '#8a5207' }}>{t('emp_stage')}</span>
                          </>
                        ) : null}
                        {e.cFree ? (
                          <>
                          <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#eef2f4', color: '#33474f' }}>{t('emp_freelance')}</span>
                          </>
                        ) : null}
                        {e.cOther ? (

                          <>

                          <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#eef2f4', color: '#33474f' }}>{e.contract}</span>

                          </>

                        ) : null}
                      </span>
                      <span style={{ position: 'relative', display: 'inline-flex', justifySelf: 'start' }}>
                        {e.sActive ? (
                          <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', padding: '4px 9px 4px 8px', borderRadius: '99px', background: '#e1f5ec', color: '#0f6f49' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a06b' }} />
                            {t('emp_actif')}
                            <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><ChevronDown size={12} style={{ display: 'block' }} /></span>
                          </span>
                          </>
                        ) : null}
                        {e.sLeave ? (
                          <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', padding: '4px 9px 4px 8px', borderRadius: '99px', background: '#fbefda', color: '#8a5207' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#df9326' }} />
                            {t('emp_en_conge')}
                            <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><ChevronDown size={12} style={{ display: 'block' }} /></span>
                          </span>
                          </>
                        ) : null}
                        {e.sInactive ? (
                          <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', padding: '4px 9px 4px 8px', borderRadius: '99px', background: '#fbe9e6', color: '#a33a28' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#df5740' }} />
                            {e.inactiveLabel}
                            <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><ChevronDown size={12} style={{ display: 'block' }} /></span>
                          </span>
                          </>
                        ) : null}
                        <select value={e.status} onChange={e.setStatus} title={t('emp_changer_le_statut')} style={{ position: 'absolute', inset: '0', opacity: '0', cursor: 'pointer', width: '100%' }}>
                          <option value="active">{t('emp_actif')}</option>
                          <option value="on-leave">{t('emp_en_conge')}</option>
                          <option value="inactive">{t('emp_inactif')}</option>
            <option value="terminated">{t('emp_termine')}</option>
                        </select>
                      </span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', color: '#52646d' }}>{e.hire}</span>
                      <span>
                        {e.soon ? (
                          <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', padding: '3px 8px', borderRadius: '99px', background: '#fbe9e6', color: '#a33a28' }}>
                            <span style={{ display: 'inline-flex', width: '12px', height: '12px' }}><Clock size={12} style={{ display: 'block' }} /></span>
                            {e.endLabel}
                          </span>
                          </>
                        ) : null}
                        {e.notSoon ? (
                          <>
                          <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12.5px', color: '#52646d' }}>{e.endLabel}</span>
                          </>
                        ) : null}
                      </span>
                      <span style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                        <Link to={e.href} aria-label={t('emp_voir_le_dossier')} style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8f97' }} className="emp-h8">
                          <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Eye size={16} style={{ display: 'block' }} /></span>
                        </Link>
                        <button type="button" onClick={e.doc} aria-label={t('emp_generer_un_document')} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '9px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8f97', cursor: 'pointer' }} className="emp-h9">
                          <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><WandSparkles size={16} style={{ display: 'block' }} /></span>
                        </button>
                        <button type="button" onClick={e.remove} aria-label={t('emp_supprimer')} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '9px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8f97', cursor: 'pointer' }} className="emp-h10">
                          <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Trash2 size={16} style={{ display: 'block' }} /></span>
                        </button>
                      </span>
                    </RV>
                  </Fragment>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 18px', fontSize: '13px', color: '#52646d', flexWrap: 'wrap' }}>
              <span>{v.showing}</span>
            </div>
          </RV>
          </>
        ) : null}
        {v.isGrid ? (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '14px' }}>
            {v.rows.map((e, eIndex) => (
              <Fragment key={eIndex}>
                <RV as='div' variant='up' delay={Number(e.delay)} style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', transition: 'border-color .2s,box-shadow .2s,transform .2s' }} className="emp-h11">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ width: '54px', height: '54px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: e.av, color: '#ffffff', fontSize: '17px', fontWeight: '700' }}>{e.ini}</span>
                    {e.sActive ? (
                      <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#e1f5ec', color: '#0f6f49' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a06b' }} />
                        {t('emp_actif')}
                      </span>
                      </>
                    ) : null}
                    {e.sLeave ? (
                      <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#fbefda', color: '#8a5207' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#df9326' }} />
                        {t('emp_en_conge')}
                      </span>
                      </>
                    ) : null}
                    {e.sInactive ? (
                      <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#fbe9e6', color: '#a33a28' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#df5740' }} />
                        {e.inactiveLabel}
                      </span>
                      </>
                    ) : null}
                  </div>
                  <div style={{ marginTop: '14px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '600', fontSize: '18px', letterSpacing: '-.02em' }}>{e.name}</div>
                  <div style={{ fontSize: '13.5px', color: '#52646d', marginTop: '2px' }}>{e.position}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: '600', padding: '3px 9px', borderRadius: '99px', background: '#f3f6f7', color: '#33474f' }}>{e.dept}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#e4f2f4', color: '#0b5f72' }}>{e.contract}</span>
                    {e.soon ? (
                      <>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '99px', background: '#fbe9e6', color: '#a33a28' }}>{e.endLabel}</span>
                      </>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #eef2f4' }}>
                    <a href={`mailto:${e.email}`} aria-label={t('emp_email')} style={{ width: '34px', height: '34px', borderRadius: '10px', border: '1px solid #e2e8eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52646d' }} className="emp-h12">
                      <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Mail size={15} style={{ display: 'block' }} /></span>
                    </a>
                    <button type="button" onClick={e.doc} aria-label={t('emp_generer_un_document')} style={{ width: '34px', height: '34px', borderRadius: '10px', border: '1px solid #e2e8eb', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52646d', cursor: 'pointer' }} className="emp-h12">
                      <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><WandSparkles size={15} style={{ display: 'block' }} /></span>
                    </button>
                    <Link to={e.href} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '600', color: '#0e6f84' }} className="emp-h13">
                      {t('emp_dossier')}
                      <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><ArrowRight size={14} style={{ display: 'block' }} /></span>
                    </Link>
                  </div>
                </RV>
              </Fragment>
            ))}
          </div>
          </>
        ) : null}
        {v.isKanban ? (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '14px', alignItems: 'start' }}>
            <RV as='div' variant='up' onDragOver={v.allowDrop} onDrop={v.dropActive} style={{ padding: '12px', borderRadius: '20px', background: '#eaf0f2', border: '1px solid #e2e8eb', minHeight: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px 12px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a06b' }} />
                <span style={{ fontWeight: '700', fontSize: '14px' }}>{t('emp_actif')}</span>
                <span style={{ marginLeft: 'auto', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#52646d' }}>{v.kActiveN}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {v.kActive.map((e, eIndex) => (
                  <Fragment key={eIndex}>
                    <div draggable="true" onDragStart={e.drag} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8eb', cursor: 'grab', boxShadow: '0 2px 6px -4px rgba(10,28,36,.3)' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: e.av, color: '#ffffff', fontSize: '12px', fontWeight: '700', flexShrink: '0' }}>{e.ini}</span>
                      <span style={{ minWidth: '0' }}>
                        <span style={{ display: 'block', fontSize: '13.5px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                        <span style={{ display: 'block', fontSize: '12px', color: '#52646d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.position}</span>
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
            </RV>
            <RV as='div' variant='up' delay={80} onDragOver={v.allowDrop} onDrop={v.dropLeave} style={{ padding: '12px', borderRadius: '20px', background: '#f6f0e4', border: '1px solid #efe3cc', minHeight: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px 12px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#df9326' }} />
                <span style={{ fontWeight: '700', fontSize: '14px' }}>{t('emp_en_conge')}</span>
                <span style={{ marginLeft: 'auto', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#52646d' }}>{v.kLeaveN}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {v.kLeave.map((e, eIndex) => (
                  <Fragment key={eIndex}>
                    <div draggable="true" onDragStart={e.drag} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8eb', cursor: 'grab', boxShadow: '0 2px 6px -4px rgba(10,28,36,.3)' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: e.av, color: '#ffffff', fontSize: '12px', fontWeight: '700', flexShrink: '0' }}>{e.ini}</span>
                      <span style={{ minWidth: '0' }}>
                        <span style={{ display: 'block', fontSize: '13.5px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                        <span style={{ display: 'block', fontSize: '12px', color: '#52646d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.position}</span>
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
            </RV>
            <RV as='div' variant='up' delay={160} onDragOver={v.allowDrop} onDrop={v.dropInactive} style={{ padding: '12px', borderRadius: '20px', background: '#f6ecea', border: '1px solid #efd9d4', minHeight: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px 12px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#df5740' }} />
                <span style={{ fontWeight: '700', fontSize: '14px' }}>{t('emp_inactif')}</span>
                <span style={{ marginLeft: 'auto', fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#52646d' }}>{v.kInactiveN}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {v.kInactive.map((e, eIndex) => (
                  <Fragment key={eIndex}>
                    <div draggable="true" onDragStart={e.drag} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8eb', cursor: 'grab', boxShadow: '0 2px 6px -4px rgba(10,28,36,.3)' }}>
                      <span style={{ width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: e.av, color: '#ffffff', fontSize: '12px', fontWeight: '700', flexShrink: '0' }}>{e.ini}</span>
                      <span style={{ minWidth: '0' }}>
                        <span style={{ display: 'block', fontSize: '13.5px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
                        <span style={{ display: 'block', fontSize: '12px', color: '#52646d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.position}</span>
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
            </RV>
          </div>
          </>
        ) : null}
        {v.loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 0' }}><Spinner size={28} /></div>
        ) : null}
        {v.noRows ? (
          <>
          <RV as='div' variant='up' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '56px 20px', borderRadius: '20px', background: '#ffffff', border: '1px dashed #d0dadf', textAlign: 'center' }}>
            <span style={{ width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f6f7', color: '#7d8f97' }}>
              <span style={{ display: 'inline-flex', width: '24px', height: '24px' }}><SearchX size={24} style={{ display: 'block' }} /></span>
            </span>
            <div style={{ fontWeight: '700', fontSize: '16px' }}>{t('emp_aucun_employe_ne_correspond')}</div>
            <div style={{ fontSize: '14px', color: '#52646d' }}>{t('emp_essayez_d_autres_filtres_ou_un')}</div>
            <button type="button" onClick={v.resetFilters} style={{ marginTop: '6px', height: '38px', padding: '0 14px', borderRadius: '10px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', color: '#0a1c24', cursor: 'pointer' }}>{t('emp_reinitialiser_les_filtres')}</button>
          </RV>
          </>
        ) : null}
      </div>
      {v.drawer ? (
        <>
        <div onClick={v.closeDrawer} style={{ position: 'fixed', inset: '0', zIndex: '100', background: 'rgba(6,20,26,.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
        <RV as='form' variant='left' onSubmit={v.save} noValidate style={{ position: 'fixed', top: '0', right: '0', bottom: '0', zIndex: '101', width: 'min(540px,100vw)', display: 'flex', flexDirection: 'column', background: '#ffffff', boxShadow: '-30px 0 80px -30px rgba(6,20,26,.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 24px', borderBottom: '1px solid #eef2f4' }}>
            <span style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff' }}>
              <span style={{ display: 'inline-flex', width: '19px', height: '19px' }}><UserPlus size={19} style={{ display: 'block' }} /></span>
            </span>
            <div style={{ flex: '1' }}>
              <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '20px', letterSpacing: '-.03em' }}>{t('emp_ajouter_un_employe')}</div>
              <div style={{ fontSize: '13px', color: '#52646d' }}>{t('emp_les_champs_marques_sont')}</div>
            </div>
            <button type="button" onClick={v.closeDrawer} aria-label={t('emp_fermer')} style={{ width: '38px', height: '38px', border: 'none', borderRadius: '10px', background: '#f3f6f7', color: '#52646d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ display: 'inline-flex', width: '17px', height: '17px' }}><X size={17} style={{ display: 'block' }} /></span>
            </button>
          </div>
          <div style={{ flex: '1', overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', letterSpacing: '.12em', color: '#5f7079' }}>{t('emp_informations_essentielles')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                {t('emp_nom_complet_2')}
                <input value={v.fName} onChange={v.onFName} placeholder={t('emp_mohammed_alami')} style={{ height: '44px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }} className="emp-f4" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                {t('emp_cin')}
                <input value={v.fCin} onChange={v.onFCin} placeholder={'A123456'} style={{ height: '44px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }} className="emp-f4" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                {t('emp_email')}
                <input value={v.fEmail} onChange={v.onFEmail} placeholder={t('emp_m_alami_tython_ma')} style={{ height: '44px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }} className="emp-f4" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                {t('emp_telephone')}
                <input value={v.fPhone} onChange={v.onFPhone} placeholder={'+212 6 00 00 00 00'} style={{ height: '44px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }} className="emp-f4" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                {t('emp_poste')}
                <input value={v.fPos} onChange={v.onFPos} placeholder={t('emp_responsable_rh')} style={{ height: '44px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }} className="emp-f4" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                {t('emp_service')}
                <select value={v.fDept} onChange={v.onFDept} style={{ height: '44px', padding: '0 10px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }}>
                  {v.deptOptions.map(d => (<option key={d} value={d}>{d}</option>))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                {t('emp_type_de_contrat')}
                <select value={v.fContract} onChange={v.onFContract} style={{ height: '44px', padding: '0 10px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }}>
                  {v.contractOptions.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                {t('emp_date_d_embauche')}
                <input type="date" value={v.fHire} onChange={v.onFHire} style={{ height: '44px', padding: '0 10px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }} />
              </label>
            </div>
            <button type="button" onClick={v.toggleExtra} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', height: '42px', borderRadius: '11px', border: '1.5px dashed #d0dadf', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500', color: '#52646d', cursor: 'pointer' }} className="emp-h14">
              <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><ChevronsUpDown size={14} style={{ display: 'block' }} /></span>
              {v.extraLabel}
            </button>
            {v.extra ? (
              <>
              <RV as='div' variant='up' style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px', padding: '16px', borderRadius: '14px', background: '#f8fafb', border: '1px solid #eef2f4' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                  {t('emp_matricule')}
                  <input value={v.fMatricule} onChange={v.onFMatricule} placeholder={t('emp_emp_001')} style={{ height: '42px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                  {t('emp_fin_de_contrat')}
                  <input type="date" value={v.fEnd} onChange={v.onFEnd} style={{ height: '42px', padding: '0 10px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                  {t('emp_salaire_mad')}
                  <input type="number" value={v.fSalary} onChange={v.onFSalary} placeholder={'8000'} style={{ height: '42px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                  {t('emp_ville')}
                  <input value={v.fCity} onChange={v.onFCity} placeholder={t('emp_casablanca')} style={{ height: '42px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
                </label>
                <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                  {t('emp_manager')}
                  <input value={v.fManager} onChange={v.onFManager} placeholder={t('emp_nom_du_responsable')} style={{ height: '42px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
                </label>
              </RV>
              </>
            ) : null}
            {v.hasFormErr ? (
              <>
              <RV as='div' variant='up' style={{ display: 'flex', gap: '9px', alignItems: 'center', padding: '11px 13px', borderRadius: '11px', background: '#fbe9e6', border: '1px solid rgba(223,87,64,.3)', color: '#a33a28', fontSize: '13.5px' }}>
                <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><CircleAlert size={16} style={{ display: 'block' }} /></span>
                {v.formErr}
              </RV>
              </>
            ) : null}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid #eef2f4', background: '#f8fafb' }}>
            <button type="button" onClick={v.closeDrawer} style={{ height: '44px', padding: '0 18px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', color: '#33474f', cursor: 'pointer' }}>{t('emp_annuler')}</button>
            <button type="submit" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 20px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
              <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><Check size={16} strokeWidth={2.4} style={{ display: 'block' }} /></span>
              {t('emp_enregistrer')}
            </button>
          </div>
        </RV>
        </>
      ) : null}
    </>
  );
}
