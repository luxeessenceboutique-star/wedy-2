// Generated from design_handoff_wedy/design/Wedy Meetings.dc.html by scripts/dc2jsx.mjs, then edited by hand:
// meetings come from /meetings; HR edits the agenda, notes and minutes, employees read them.
// The markup keeps the reference's exact inline styles; `v` is the page logic (the reference's renderVals()).
import { Fragment } from 'react';
import { CalendarPlus, Check, CircleCheck, Clock, Download, MapPin, Send, Sparkles } from 'lucide-react';
import { RV } from '@/components/motion';
import { useLang } from '@/lib/lang';
import type { MeetingsVals } from './MeetingsPage';
import './MeetingsView.css';

export function MeetingsView({ v }: { v: MeetingsVals }) {
  const { t } = useLang();
  const CurPlace = v.cur?.placeIcon ?? MapPin;
  const CurAction = v.cur?.actionIcon ?? CalendarPlus;
  return (
    <>
      <div style={{ padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <RV as='h1' variant='up' style={{ margin: '0', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: 'clamp(30px,3vw,40px)', letterSpacing: '-.045em', lineHeight: '1.05' }}>{t('mtg_reunions')}</RV>
            <RV as='p' variant='up' delay={60} style={{ margin: '8px 0 0', fontSize: '15px', color: '#52646d' }}>{t('mtg_preparez_l_ordre_du_jour_avec')}</RV>
          </div>
          {v.canEdit && <RV as='button' variant='up' delay={100} type="button" onClick={v.plan} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 12px 26px -12px rgba(22,182,200,.85)' }}>
            <span style={{ display: 'inline-flex', width: '16px', height: '16px' }}><CalendarPlus size={16} style={{ display: 'block' }} /></span>
            {t('mtg_planifier_une_reunion')}
          </RV>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <RV as='div' variant='up' delay={120} style={{ flex: '1 1 360px', minWidth: '0', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '4px', padding: '5px', margin: '12px', borderRadius: '13px', background: '#f3f6f7' }}>
              {v.tabs.map((t_, t_Index) => (
                <Fragment key={t_Index}>
                  <button type="button" onClick={t_.go} style={{ position: 'relative', flex: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', height: '36px', border: 'none', borderRadius: '10px', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: t_.color }}>
                    {t_.on ? (
                      <>
                      <RV as='span' variant='pill' style={{ position: 'absolute', inset: '0', borderRadius: '10px', background: '#ffffff', boxShadow: '0 1px 3px rgba(10,28,36,.14)' }} />
                      </>
                    ) : null}
                    <span style={{ position: 'relative' }}>{t_.label}</span>
                    <span style={{ position: 'relative', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#5f7079' }}>{t_.n}</span>
                  </button>
                </Fragment>
              ))}
            </div>
            {v.listNote}
            {v.groups.map((g, gIndex) => (
              <Fragment key={gIndex}>
                <div style={{ padding: '12px 16px 6px', fontFamily: '\'Geist Mono\',monospace', fontSize: '10.5px', letterSpacing: '.12em', textTransform: 'uppercase', color: '#5f7079' }}>{g.label}</div>
                {g.items.map((m, mIndex) => (
                  <Fragment key={mIndex}>
                    <RV as='button' variant='up' delay={Number(m.delay)} type="button" onClick={m.pick} style={{ position: 'relative', width: '100%', display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 16px', border: 'none', borderTop: '1px solid #eef2f4', background: m.bg, fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer' }} className="mtg-h1">
                      {m.on ? (
                        <>
                        <span style={{ position: 'absolute', insetInlineStart: '0', top: '10px', bottom: '10px', width: '3px', borderRadius: v.rtl ? '3px 0 0 3px' : '0 3px 3px 0', background: '#16b6c8' }} />
                        </>
                      ) : null}
                      <span style={{ width: '60px', flexShrink: '0', padding: '7px 0', borderRadius: '11px', background: m.kBg, textAlign: 'center' }}>
                        <span style={{ display: 'block', fontFamily: '\'Geist Mono\',monospace', fontSize: '13px', fontWeight: '600', color: m.kColor }}>{m.time}</span>
                        <span style={{ display: 'block', fontSize: '10.5px', color: '#52646d' }}>{m.dur}</span>
                      </span>
                      <span style={{ flex: '1', minWidth: '0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a1c24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
                          {m.next ? (
                            <>
                            <span style={{ flexShrink: '0', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', fontWeight: '700', padding: '2px 7px', borderRadius: '99px', background: '#e1f5ec', color: '#0f6f49' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a06b' }} className="wedy-pulse" />
                              {t('mtg_prochaine')}
                            </span>
                            </>
                          ) : null}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '7px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#52646d', minWidth: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ display: 'inline-flex', width: '13px', height: '13px', flexShrink: '0' }}><m.placeIcon size={13} style={{ display: 'block' }} /></span>
                            {m.place}
                          </span>
                          <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', paddingInlineStart: '6px', flexShrink: '0' }}>
                            {m.faces.map((f, fIndex) => (
                              <Fragment key={fIndex}>
                                <span title={f.name} style={{ width: '24px', height: '24px', marginInlineStart: '-6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.av, color: '#ffffff', fontSize: '9px', fontWeight: '700', border: '2px solid #ffffff' }}>{f.ini}</span>
                              </Fragment>
                            ))}
                            {m.hasExtra ? (
                              <>
                              <span style={{ marginInlineStart: '4px', fontFamily: '\'Geist Mono\',monospace', fontSize: '11px', color: '#5f7079' }}>{m.extra}</span>
                              </>
                            ) : null}
                          </span>
                        </span>
                      </span>
                    </RV>
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </RV>
          {v.cur ? (
          <RV as='div' variant='left' delay={160} style={{ flex: '1.6 1 520px', minWidth: '0', position: 'sticky', top: '90px', borderRadius: '22px', background: '#ffffff', border: '1px solid #e2e8eb', overflow: 'hidden' }}>
            <div style={{ position: 'relative', overflow: 'hidden', padding: '22px 24px', background: '#06141a', color: '#e8eff1', isolation: 'isolate' }}>
              <div aria-hidden="true" style={{ position: 'absolute', right: '-80px', top: '-130px', width: '360px', height: '360px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(14,111,132,.6),transparent)', zIndex: '-1' }} className="wedy-drift" />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '240px' }}>
                  <span style={{ display: 'inline-flex', fontSize: '11.5px', fontWeight: '700', padding: '3px 10px', borderRadius: '99px', background: 'rgba(255,255,255,.08)', color: '#b9cbd0' }}>{v.cur!.kind}</span>
                  <div style={{ marginTop: '10px', fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '24px', letterSpacing: '-.03em', lineHeight: '1.15' }}>{v.cur!.title}</div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '13px', color: '#b9cbd0' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><Clock size={14} style={{ display: 'block' }} /></span>
                      {v.cur!.when}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-flex', width: '14px', height: '14px' }}><CurPlace size={14} style={{ display: 'block' }} /></span>
                      {v.cur!.place}
                    </span>
                  </div>
                </div>
                {v.cur!.tools}
                <button type="button" onClick={v.cur!.action} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '40px', padding: '0 14px', border: 'none', borderRadius: '11px', background: '#effbfc', color: '#06141a', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><CurAction size={15} style={{ display: 'block' }} /></span>
                  {v.cur!.actionLabel}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                <span style={{ display: 'flex', paddingLeft: '6px' }}>
                  {v.cur!.faces.map((f, fIndex) => (
                    <Fragment key={fIndex}>
                      <span title={f.name} style={{ width: '30px', height: '30px', marginInlineStart: '-6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: f.av, color: '#ffffff', fontSize: '10.5px', fontWeight: '700', border: '2px solid #06141a' }}>{f.ini}</span>
                    </Fragment>
                  ))}
                </span>
                <span style={{ fontSize: '13px', color: '#b9cbd0' }}>{v.cur!.peopleLabel}</span>
              </div>
            </div>
            {v.cur!.upcoming ? (
              <>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '16px' }}>{t('mtg_ordre_du_jour')}</span>
                  <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#5f7079' }}>{v.agendaDone}</span>
                </div>
                {v.agenda.map((a, aIndex) => (
                  <Fragment key={aIndex}>
                    <RV as='button' variant='up' type="button" onClick={a.toggle} style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8eb', background: a.bg, fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer' }} className="mtg-h2">
                      <span style={{ width: '20px', height: '20px', borderRadius: '6px', border: '1.5px solid #c3ced3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', color: '#ffffff', background: '#ffffff' }}>
                        {a.done ? (
                          <>
                          <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#0e6f84', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Check size={13} strokeWidth={3} style={{ display: 'block' }} /></span>
                          </span>
                          </>
                        ) : null}
                      </span>
                      <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '11.5px', color: '#7d8f97', width: '18px', flexShrink: '0' }}>{a.n}</span>
                      <span style={{ flex: '1', fontSize: '14px', color: a.color, textDecoration: a.deco }}>{a.t}</span>
                      {a.ai ? (
                        <>
                        <span style={{ flexShrink: '0', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '99px', background: '#ece9fb', color: '#5444b8' }}>{'IA'}</span>
                        </>
                      ) : null}
                    </RV>
                  </Fragment>
                ))}
                {v.canEdit && <form onSubmit={v.addItem} style={{ display: 'flex', gap: '8px' }}>
                  <input value={v.newItem} onChange={v.onNewItem} placeholder={t('mtg_ajouter_un_point_a_l_ordre_du_jour')} style={{ flex: '1', minWidth: '0', height: '42px', padding: '0 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', color: '#0a1c24', outline: 'none' }} className="mtg-f3" />
                  <button type="submit" style={{ height: '42px', padding: '0 14px', borderRadius: '11px', border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '600', color: '#0a1c24', cursor: 'pointer' }} className="mtg-h4">{t('mtg_ajouter')}</button>
                </form>}
                {v.canEdit && <button type="button" onClick={v.suggest} disabled={v.busy} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '46px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#5444b8,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 14px 30px -14px rgba(109,90,214,.8)' }}>
                  <span style={{ position: 'absolute', top: '0', bottom: '0', left: '0', width: '40%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)', pointerEvents: 'none' }} className="wedy-shine" />
                  {v.busy ? (
                    <>
                    <span style={{ position: 'relative', width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#ffffff' }} className="wedy-spin" />
                    <span style={{ position: 'relative' }}>{t('mtg_wedy_prepare_des_points')}</span>
                    </>
                  ) : null}
                  {v.idle ? (
                    <>
                    <span style={{ position: 'relative', display: 'inline-flex', width: '16px', height: '16px' }}><Sparkles size={16} style={{ display: 'block' }} /></span>
                    <span style={{ position: 'relative' }}>{t('mtg_completer_l_ordre_du_jour_avec')}</span>
                    </>
                  ) : null}
                </button>}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', fontSize: '12.5px', fontWeight: '600', color: '#33474f' }}>
                  {v.notesLabel}
                  <textarea rows={3} value={v.notes} onChange={v.onNotes} onBlur={v.saveNotes} readOnly={!v.canEdit} placeholder={t('mtg_points_a_aborder_documents_a')} style={{ resize: 'vertical', padding: '10px 12px', borderRadius: '11px', border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: '14px', fontWeight: '400', color: '#0a1c24', outline: 'none' }} className="mtg-f3" />
                </label>
              </div>
              </>
            ) : null}
            {v.cur!.past ? (
              <>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!v.cur!.hasSummary && v.minutesTool}
                {v.cur!.hasSummary && <RV as='div' variant='up' style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '14px', borderRadius: '14px', background: 'linear-gradient(135deg,rgba(22,182,200,.08),rgba(109,90,214,.08))', border: '1px solid rgba(109,90,214,.18)' }}>
                  <img src="/wedy-avatar.png" alt={''} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: '0', background: '#e4f2f4' }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#5444b8' }}>{t('mtg_compte_rendu_redige_par_wedy')}</div>
                    <div style={{ marginTop: '4px', fontSize: '14px', lineHeight: '1.6', color: '#1d3540' }}>{v.cur!.summary}</div>
                  </div>
                </RV>}
                {v.cur!.decisions.length > 0 && <div>
                  <div style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '15px' }}>{t('mtg_decisions')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {v.cur!.decisions.map((d, dIndex) => (
                      <Fragment key={dIndex}>
                        <RV as='div' variant='up' delay={Number(d.delay)} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', color: '#1d3540' }}>
                          <span style={{ display: 'inline-flex', width: '17px', height: '17px', color: '#16a06b', flexShrink: '0', marginTop: '1px' }}><CircleCheck size={17} style={{ display: 'block' }} /></span>
                          {d.t}
                        </RV>
                      </Fragment>
                    ))}
                  </div>
                </div>}
                {v.cur!.actions.length > 0 && <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ fontFamily: '\'Bricolage Grotesque\',system-ui,sans-serif', fontWeight: '700', fontSize: '15px' }}>{t('mtg_actions')}</span>
                    <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', color: '#5f7079' }}>{v.actionsDone}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {v.cur!.actions.map((x, xIndex) => (
                      <Fragment key={xIndex}>
                        <RV as='button' variant='up' delay={Number(x.delay)} type="button" onClick={x.toggle} style={{ display: 'flex', alignItems: 'center', gap: '11px', flexWrap: 'wrap', width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8eb', background: '#ffffff', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer' }} className="mtg-h2">
                          <span style={{ width: '20px', height: '20px', borderRadius: '6px', border: '1.5px solid #c3ced3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', color: '#ffffff' }}>
                            {x.done ? (
                              <>
                              <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: '#16a06b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ display: 'inline-flex', width: '13px', height: '13px' }}><Check size={13} strokeWidth={3} style={{ display: 'block' }} /></span>
                              </span>
                              </>
                            ) : null}
                          </span>
                          <span style={{ flex: '1 1 200px', fontSize: '14px', color: x.color, textDecoration: x.deco }}>{x.t}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: '#33474f' }}>
                            <span style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: x.av, color: '#ffffff', fontSize: '9px', fontWeight: '700' }}>{x.ini}</span>
                            {x.owner}
                          </span>
                          <span style={{ fontFamily: '\'Geist Mono\',monospace', fontSize: '12px', padding: '2px 8px', borderRadius: '7px', background: '#f3f6f7', color: '#33474f' }}>{x.due}</span>
                        </RV>
                      </Fragment>
                    ))}
                  </div>
                </div>}
                {v.cur!.hasSummary && v.minutesTool}
                {v.cur!.hasSummary && <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {v.canEdit && <button type="button" onClick={v.sendReport} style={{ flex: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', height: '44px', padding: '0 14px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg,#0e6f84,#16b6c8)', color: '#ffffff', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Send size={15} style={{ display: 'block' }} /></span>
                    {t('mtg_envoyer_aux_participants')}
                  </button>}
                  <button type="button" onClick={v.pdf} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', height: '44px', padding: '0 14px', borderRadius: '12px', border: '1px solid #d6dfe3', background: '#ffffff', color: '#33474f', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }} className="mtg-h4">
                    <span style={{ display: 'inline-flex', width: '15px', height: '15px' }}><Download size={15} style={{ display: 'block' }} /></span>
                    {t('mtg_pdf')}
                  </button>
                </div>}
              </div>
              </>
            ) : null}
          </RV>
          ) : v.emptyPanel}
        </div>
      </div>
      {v.drawer}
    </>
  );
}
