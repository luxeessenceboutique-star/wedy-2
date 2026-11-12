// Événements: the CVs collected at a job fair / forum. Drop the scanned files, the AI extracts the whole profile of each person
// (identity, contact, skills, experience, education, languages…), then HR searches, keeps the best ones and turns them into candidates.
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, CalendarDays, CircleAlert, Download, ExternalLink, FileText, MapPin, Pencil, Plus, RotateCcw, ScanSearch, Star, ThumbsDown, Trash2, Upload, UserPlus, X,
} from 'lucide-react';
import {
  convertProspects, createCvEvent, deleteCvEvent, deleteProspect, getApiError, listAnnonces, listCvEvents, listProspects, scanCv, updateCvEvent, updateProspect, viewEmployeeFile,
  type ConvertResult, type CvEvent, type Prospect, type ProspectPatch,
} from '@/services/api';
import { Button, Drawer, Input, Modal, Select, Spinner, Textarea } from '@/components/ui';
import { RV } from '@/components/motion';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import './EvenementsPage.css';

const ALLOWED = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'webp'];
const MAX_BYTES = 15 * 1024 * 1024;
type QItem = { key: string; name: string; file: File; state: 'wait' | 'run' | 'ok' | 'warn' | 'err'; why?: string };
type StatusFilter = 'all' | Prospect['status'];
type Sort = 'recent' | 'exp' | 'rating' | 'name';

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const extOf = (n: string) => (n.split('.').pop() ?? '').toLowerCase();

function Stars({ value, onChange, size = 15 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <span className="evt-stars" role="group" aria-label="rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" className={n <= value ? 'on' : ''} aria-label={`${n}/5`} onClick={e => { e.stopPropagation(); onChange(value === n ? 0 : n); }}>
          <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </span>
  );
}

export default function EvenementsPage() {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const [selected, setSelected] = useState('');
  const [eventModal, setEventModal] = useState<{ mode: 'new' | 'edit'; name: string; date: string; place: string; notes: string } | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [sel, setSel] = useState<string[]>([]);
  const [queue, setQueue] = useState<QItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [convertIds, setConvertIds] = useState<string[] | null>(null);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const eventsQ = useQuery({ queryKey: ['cv-events'], queryFn: listCvEvents, retry: false });
  const events = eventsQ.data ?? [];
  const current: CvEvent | null = events.find(e => e.id === selected) ?? events[0] ?? null;
  const eventId = current?.id ?? '';
  const prospectsQ = useQuery({ queryKey: ['cv-prospects', eventId], queryFn: () => listProspects(eventId), enabled: !!eventId });
  const adsQ = useQuery({ queryKey: ['annonces'], queryFn: listAnnonces, enabled: convertIds !== null });
  const prospects = useMemo(() => prospectsQ.data ?? [], [prospectsQ.data]);

  // ── the scan queue: three CVs at a time, each one independent (a bad file never blocks the others) ──
  const patchQ = (key: string, patch: Partial<QItem>) => setQueue(list => list.map(i => (i.key === key ? { ...i, ...patch } : i)));
  const runItems = async (items: QItem[], evId: string) => {
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const it = items[next++];
        patchQ(it.key, { state: 'run', why: undefined });
        try {
          const p = await scanCv(evId, it.file);
          qc.setQueryData<Prospect[]>(['cv-prospects', evId], old => [p, ...(old ?? [])]);
          patchQ(it.key, p.extraction === 'ok' ? { state: 'ok' } : { state: 'warn', why: p.extraction_error ?? t('evt_review_tip') });
        } catch (e) { patchQ(it.key, { state: 'err', why: getApiError(e, t('error')) }); }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    qc.invalidateQueries({ queryKey: ['cv-events'] });
  };
  const enqueue = (files: File[]) => {
    if (!eventId || !files.length) return;
    const items: QItem[] = files.map(file => {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      if (!ALLOWED.includes(extOf(file.name))) return { key, name: file.name, file, state: 'err' as const, why: t('evt_bad_file') };
      if (file.size > MAX_BYTES) return { key, name: file.name, file, state: 'err' as const, why: t('evt_too_big') };
      return { key, name: file.name, file, state: 'wait' as const };
    });
    setQueue(list => [...list, ...items]);
    void runItems(items.filter(i => i.state === 'wait'), eventId);
  };
  const retry = (it: QItem) => { patchQ(it.key, { state: 'wait', why: undefined }); void runItems([{ ...it, state: 'wait' }], eventId); };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); enqueue(Array.from(e.dataTransfer.files)); };

  // ── events ──
  const saveEvent = useMutation({
    mutationFn: (m: NonNullable<typeof eventModal>) => {
      const body = { name: m.name.trim(), event_date: m.date || null, location: m.place.trim() || null, notes: m.notes.trim() || null };
      return m.mode === 'new' ? createCvEvent(body) : updateCvEvent(eventId, body);
    },
    onSuccess: ev => { qc.invalidateQueries({ queryKey: ['cv-events'] }); setSelected(ev.id); setEventModal(null); notify.success(t('evt_saved')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const removeEvent = useMutation({
    mutationFn: () => deleteCvEvent(eventId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cv-events'] }); setSelected(''); setSel([]); setQueue([]); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  // ── prospects (optimistic: the star / keep / reject answer at once) ──
  const key = ['cv-prospects', eventId];
  const patchP = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProspectPatch }) => updateProspect(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Prospect[]>(key);
      qc.setQueryData<Prospect[]>(key, old => old?.map(p => (p.id === id ? { ...p, ...patch } as Prospect : p)));
      return { prev };
    },
    onError: (e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); notify.error(getApiError(e, t('error'))); },
    onSettled: () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['cv-events'] }); },
  });
  const removeP = useMutation({
    mutationFn: (id: string) => deleteProspect(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['cv-events'] }); setOpenId(null); notify.success(t('evt_cv_deleted')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const bulkStatus = async (s: 'shortlisted' | 'rejected') => {
    const ids = sel; setSel([]);
    await Promise.all(ids.map(id => updateProspect(id, { status: s }).catch(() => null)));
    qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['cv-events'] });
  };

  // ── list: search / status / sort ──
  const counts = { all: prospects.length, new: 0, shortlisted: 0, rejected: 0, converted: 0 } as Record<StatusFilter, number>;
  prospects.forEach(p => { counts[p.status] += 1; });
  const shown = useMemo(() => {
    const needle = plain(q.trim());
    const rows = prospects.filter(p => (status === 'all' || p.status === status)
      && (!needle || plain([p.full_name, p.email, p.phone, p.city, p.headline, p.file_name, ...(p.skills ?? [])].filter(Boolean).join(' ')).includes(needle)));
    const by: Record<Sort, (a: Prospect, b: Prospect) => number> = {
      recent: (a, b) => (b.created_at || '').localeCompare(a.created_at || ''),
      exp: (a, b) => (b.years_experience ?? -1) - (a.years_experience ?? -1),
      rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
      name: (a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '', lang),
    };
    return [...rows].sort(by[sort]);
  }, [prospects, q, status, sort, lang]);
  const selectable = shown.filter(p => p.status !== 'converted');
  const allSel = selectable.length > 0 && selectable.every(p => sel.includes(p.id));
  const toggle = (id: string) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  const exportCsv = () => {
    const head = [t('evt_f_fullname'), t('evt_f_email'), t('evt_f_phone'), t('evt_f_city'), t('evt_f_headline'), t('evt_f_years'), t('evt_d_skills'), t('evt_d_rating'), current?.name ?? ''];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = shown.map(p => [p.full_name, p.email, p.phone, p.city, p.headline, p.years_experience, (p.skills ?? []).join(', '), p.rating || '', t(`evt_s_${p.status === 'shortlisted' ? 'keep' : p.status}` as TKey)].map(esc).join(','));
    const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `${(current?.name ?? 'cv').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const done = queue.filter(i => i.state === 'ok' || i.state === 'warn' || i.state === 'err').length;
  const open = prospects.find(p => p.id === openId) ?? null;
  const dateLabel = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const statusLabel = (s: Prospect['status']) => t(({ new: 'evt_s_new', shortlisted: 'evt_s_keep', rejected: 'evt_s_rejected', converted: 'evt_s_converted' } as const)[s]);

  return (
    <div className="evt">
      <div className="evt-head">
        <div>
          <RV as="h1" variant="up">{t('evt_title')}</RV>
          <RV as="p" variant="up" delay={60}>{t('evt_subtitle')}</RV>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setEventModal({ mode: 'new', name: '', date: '', place: '', notes: '' })}>{t('evt_new')}</Button>
      </div>

      {eventsQ.isError && (
        <div className="evt-warnbox" role="alert"><CircleAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} /><span>{getApiError(eventsQ.error, t('error'))}</span></div>
      )}

      <div className="evt-layout">
        {/* ── events ── */}
        <div className="evt-side">
          {eventsQ.isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>}
          {!eventsQ.isLoading && !events.length && !eventsQ.isError && (
            <div className="evt-empty"><ScanSearch size={26} style={{ color: '#0e6f84' }} /><div style={{ fontWeight: 700, color: '#0a1c24', marginTop: 8 }}>{t('evt_empty_title')}</div><p style={{ margin: '6px 0 0' }}>{t('evt_empty_s')}</p></div>
          )}
          {events.map((e, i) => (
            <RV key={e.id} as="div" variant="up" delay={Math.min(i, 8) * 40}>
              <button type="button" className={`evt-card${e.id === eventId ? ' on' : ''}`} onClick={() => { setSelected(e.id); setSel([]); setQueue([]); setQ(''); setStatus('all'); }}>
                <b>{e.name}</b>
                <small>{[dateLabel(e.event_date), e.location].filter(Boolean).join(' · ') || '—'}</small>
                <div className="evt-n">{tf(t('evt_counts'), { n: e.total, k: e.shortlisted, c: e.converted })}</div>
              </button>
            </RV>
          ))}
        </div>

        {/* ── the selected event ── */}
        {current && (
          <div className="evt-main">
            <div className="evt-bar">
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2>{current.name}</h2>
                <div className="evt-sub">
                  {current.event_date && <><CalendarDays size={12} style={{ verticalAlign: '-1px' }} /> {dateLabel(current.event_date)} </>}
                  {current.location && <><MapPin size={12} style={{ verticalAlign: '-1px', marginInlineStart: 8 }} /> {current.location}</>}
                </div>
              </div>
              <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => setEventModal({ mode: 'edit', name: current.name, date: current.event_date ?? '', place: current.location ?? '', notes: current.notes ?? '' })}>{t('evt_edit')}</Button>
              <Button variant="secondary" size="sm" icon={<Trash2 size={14} />} onClick={() => { if (window.confirm(tf(t('evt_delete_confirm'), { name: current.name, n: current.total }))) removeEvent.mutate(); }}>{t('evt_delete')}</Button>
            </div>

            <div
              className={`evt-drop${over ? ' over' : ''}`} role="button" tabIndex={0}
              onClick={() => fileInput.current?.click()} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click(); } }}
              onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
            >
              <span className="ic"><Upload size={22} /></span>
              <b>{t('evt_drop')}</b>
              <small>{t('evt_drop_s')}</small>
              <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); fileInput.current?.click(); }}>{t('evt_pick')}</Button>
              <input ref={fileInput} type="file" multiple hidden accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={e => { enqueue(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
            </div>

            {queue.length > 0 && (
              <div className="evt-queue" aria-live="polite">
                <div className="evt-queue-h">
                  <span>{t('evt_q_title')}</span><span className="grow" style={{ fontWeight: 500, color: '#52646d' }}>{tf(t('evt_q_progress'), { done, total: queue.length })}</span>
                  {done === queue.length && <Button variant="secondary" size="sm" onClick={() => setQueue([])}>{t('evt_q_clear')}</Button>}
                </div>
                <div className="evt-progress"><i style={{ width: `${(done / queue.length) * 100}%` }} /></div>
                <ul>
                  {[...queue].reverse().map(it => (
                    <li key={it.key} className={it.state}>
                      <span className="nm" title={it.name}>{it.name}</span>
                      {it.why && <span className="why" title={it.why}>{it.why.length > 46 ? `${it.why.slice(0, 45)}…` : it.why}</span>}
                      <span className="st">
                        {it.state === 'run' ? <Spinner size={10} /> : null}{' '}
                        {t(({ wait: 'evt_q_wait', run: 'evt_q_run', ok: 'evt_q_ok', warn: 'evt_q_review', err: 'evt_q_err' } as const)[it.state])}
                      </span>
                      {it.state === 'err' && ALLOWED.includes(extOf(it.name)) && it.file.size <= MAX_BYTES && <button type="button" className="evt-act" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0e6f84' }} onClick={() => retry(it)} aria-label={t('evt_q_retry')} title={t('evt_q_retry')}><RotateCcw size={13} /></button>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prospects.length > 0 && (
              <>
                <div className="evt-filters">
                  <div className="grow"><Input value={q} onChange={e => setQ(e.target.value)} placeholder={t('evt_search')} aria-label={t('evt_search')} /></div>
                  <div style={{ width: 190 }}>
                    <Select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="sort">
                      <option value="recent">{t('evt_sort_recent')}</option><option value="exp">{t('evt_sort_exp')}</option><option value="rating">{t('evt_sort_rating')}</option><option value="name">{t('evt_sort_name')}</option>
                    </Select>
                  </div>
                  <Button variant="secondary" icon={<Download size={15} />} onClick={exportCsv}>{t('evt_export')}</Button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group">
                  {(['all', 'new', 'shortlisted', 'rejected', 'converted'] as StatusFilter[]).map(s => (
                    <button key={s} type="button" aria-pressed={status === s} className={`wy-pill${status === s ? ' is-active' : ''}`} onClick={() => setStatus(s)}>
                      {s === 'all' ? t('evt_s_all') : statusLabel(s)}<span className="wy-seg-count">{counts[s]}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {sel.length > 0 && (
              <div className="evt-selbar">
                <b>{tf(t('evt_sel'), { n: sel.length })}</b>
                <button type="button" onClick={() => bulkStatus('shortlisted')}><Star size={14} />{t('evt_keep')}</button>
                <button type="button" onClick={() => bulkStatus('rejected')}><ThumbsDown size={14} />{t('evt_reject')}</button>
                <button type="button" className="go" onClick={() => setConvertIds(sel)}><UserPlus size={14} />{t('evt_convert_n')}</button>
                <button type="button" onClick={() => setSel([])} aria-label={t('cancel')}><X size={14} /></button>
              </div>
            )}

            {prospectsQ.isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}><Spinner /></div>}
            {!prospectsQ.isLoading && !prospects.length && <div className="evt-empty">{t('evt_no_cv')}</div>}
            {!!prospects.length && !shown.length && <div className="evt-empty">{t('evt_no_results')}</div>}
            {shown.length > 0 && (
              <div className="evt-list">
                <div className="evt-row evt-thead" style={{ background: '#f8fafb', fontSize: 11.5, fontWeight: 600, color: '#5f7079' }}>
                  <input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : selectable.map(p => p.id))} aria-label={t('evt_s_all')} />
                  <span>{t('evt_f_fullname')}</span><span>{t('evt_d_contact')}</span><span>{t('evt_d_skills')}</span><span>{t('evt_d_rating')}</span><span />
                </div>
                {shown.map(p => {
                  const name = p.full_name || t('evt_unnamed');
                  return (
                    <div key={p.id} className={`evt-row${p.status === 'rejected' ? ' rejected' : ''}`}>
                      <input type="checkbox" checked={sel.includes(p.id)} disabled={p.status === 'converted'} onChange={() => toggle(p.id)} aria-label={name} />
                      <div className="evt-who" onClick={() => setOpenId(p.id)}>
                        <span className="evt-av" style={{ background: avatarGradient(name) }}>{initialsOf(name)}</span>
                        <span style={{ minWidth: 0 }}><b>{name}</b><small>{p.headline || p.file_name || '—'}</small></span>
                      </div>
                      <div className="evt-contact">
                        <div>{p.email || '—'}</div><div>{[p.phone, p.city].filter(Boolean).join(' · ') || '—'}</div>
                      </div>
                      <div className="evt-chips">
                        {p.years_experience != null && <span className="evt-chip yrs">{tf(t('evt_years'), { n: p.years_experience })}</span>}
                        {(p.skills ?? []).slice(0, 3).map(s => <span key={s} className="evt-chip">{s}</span>)}
                        {(p.skills ?? []).length > 3 && <span className="evt-chip">+{p.skills.length - 3}</span>}
                        {p.extraction !== 'ok' && <span className="evt-chip warn" title={p.extraction_error || t('evt_review_tip')}>{t('evt_review')}</span>}
                        {p.duplicate_of && <span className="evt-chip dup" title={tf(t('evt_dup_tip'), { name: p.duplicate_name ?? '' })}>{t('evt_dup')}</span>}
                      </div>
                      <div className="evt-meta" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <Stars value={p.rating ?? 0} onChange={n => patchP.mutate({ id: p.id, patch: { rating: n } })} />
                        {p.status !== 'new' && <span className={`evt-chip st-${p.status}`}>{statusLabel(p.status)}</span>}
                      </div>
                      <div className="evt-act">
                        {p.status !== 'converted' && <>
                          <button type="button" className={`keep${p.status === 'shortlisted' ? ' on' : ''}`} title={t('evt_keep')} aria-label={t('evt_keep')} onClick={() => patchP.mutate({ id: p.id, patch: { status: p.status === 'shortlisted' ? 'new' : 'shortlisted' } })}><Star size={16} fill={p.status === 'shortlisted' ? 'currentColor' : 'none'} /></button>
                          <button type="button" className={`rej${p.status === 'rejected' ? ' on' : ''}`} title={t('evt_reject')} aria-label={t('evt_reject')} onClick={() => patchP.mutate({ id: p.id, patch: { status: p.status === 'rejected' ? 'new' : 'rejected' } })}><ThumbsDown size={16} /></button>
                          <button type="button" className="go" title={t('evt_convert')} aria-label={t('evt_convert')} onClick={() => setConvertIds([p.id])}><UserPlus size={16} /></button>
                        </>}
                        {p.status === 'converted' && p.candidate_id && <Link to={`/app/candidats?c=${p.candidate_id}`} className="go" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 600, color: '#0e6f84' }}>{t('evt_s_converted')}<ArrowRight size={13} className="wy-flip" /></Link>}
                        <button type="button" title={t('evt_view_cv')} aria-label={t('evt_view_cv')} onClick={() => setOpenId(p.id)}><FileText size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── create / edit an event ── */}
      <Modal
        open={!!eventModal} onClose={() => setEventModal(null)} width={480} title={t(eventModal?.mode === 'edit' ? 'evt_edit' : 'evt_new')}
        footer={eventModal && <><Button variant="secondary" onClick={() => setEventModal(null)}>{t('cancel')}</Button><Button loading={saveEvent.isPending} disabled={eventModal.name.trim().length < 2} onClick={() => saveEvent.mutate(eventModal)}>{t('save')}</Button></>}
      >
        {eventModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input autoFocus label={t('evt_f_name')} placeholder={t('evt_f_name_ph')} value={eventModal.name} maxLength={160} onChange={e => setEventModal({ ...eventModal, name: e.target.value })} />
            <div className="evt-grid2">
              <Input type="date" label={t('evt_f_date')} value={eventModal.date} onChange={e => setEventModal({ ...eventModal, date: e.target.value })} />
              <Input label={t('evt_f_place')} value={eventModal.place} maxLength={160} onChange={e => setEventModal({ ...eventModal, place: e.target.value })} />
            </div>
            <Textarea label={t('evt_f_notes')} rows={3} value={eventModal.notes} onChange={e => setEventModal({ ...eventModal, notes: e.target.value })} />
          </div>
        )}
      </Modal>

      {/* ── one CV in detail ── */}
      <Drawer open={!!open} onClose={() => setOpenId(null)} width={560} icon={<FileText size={18} />} title={open?.full_name || t('evt_unnamed')} subtitle={open?.headline || open?.file_name || ''}>
        {open && <ProspectBody key={open.id + (open.extraction ?? '')} p={open} saving={patchP.isPending} onSave={patch => patchP.mutate({ id: open.id, patch }, { onSuccess: () => notify.success(t('evt_saved')) })}
          onConvert={() => setConvertIds([open.id])} onDelete={() => { if (window.confirm(t('evt_cv_delete_confirm'))) removeP.mutate(open.id); }}
          onView={() => { if (open.file_path) viewEmployeeFile(open.file_path, open.file_name ?? 'cv', open.mime_type ?? undefined).catch(e => notify.error(getApiError(e, t('error')))); }} />}
      </Drawer>

      {convertIds && <ConvertModal ids={convertIds} prospects={prospects} ads={(adsQ.data ?? []).filter(a => a.is_active)} onClose={() => setConvertIds(null)}
        onDone={() => { setSel([]); qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['cv-events'] }); qc.invalidateQueries({ queryKey: ['candidates'] }); }} />}
    </div>
  );
}

// ── detail of one CV: editable fields, the whole extraction, notes, rating ───────────────────────────────

function ProspectBody({ p, saving, onSave, onConvert, onDelete, onView }: { p: Prospect; saving: boolean; onSave: (patch: ProspectPatch) => void; onConvert: () => void; onDelete: () => void; onView: () => void }) {
  const { t } = useLang();
  const [f, setF] = useState({ full_name: p.full_name ?? '', email: p.email ?? '', phone: p.phone ?? '', city: p.city ?? '', headline: p.headline ?? '', years: p.years_experience == null ? '' : String(p.years_experience), skills: (p.skills ?? []).join(', '), notes: p.notes ?? '' });
  const pr = p.profile ?? {};
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(x => ({ ...x, [k]: e.target.value }));
  const dirty = f.full_name !== (p.full_name ?? '') || f.email !== (p.email ?? '') || f.phone !== (p.phone ?? '') || f.city !== (p.city ?? '') || f.headline !== (p.headline ?? '')
    || f.years !== (p.years_experience == null ? '' : String(p.years_experience)) || f.skills !== (p.skills ?? []).join(', ') || f.notes !== (p.notes ?? '');
  const save = () => onSave({
    full_name: f.full_name, email: f.email, phone: f.phone, city: f.city, headline: f.headline, notes: f.notes,
    years_experience: f.years.trim() === '' || Number.isNaN(Number(f.years)) ? null : Math.max(0, Number(f.years)),
    skills: f.skills.split(',').map(s => s.trim()).filter(Boolean),
  });
  return (
    <div>
      {p.extraction !== 'ok' && <div className="evt-warnbox"><CircleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} /><span>{p.extraction_error || t('evt_review_tip')}</span></div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Button variant="secondary" size="sm" icon={<ExternalLink size={14} />} onClick={onView} disabled={!p.file_path}>{t('evt_view_cv')}</Button>
        <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>{t('evt_d_rating')}<Stars value={p.rating ?? 0} onChange={n => onSave({ rating: n })} size={17} /></span>
      </div>

      <div className="evt-block">
        <div className="evt-sec">{t('evt_d_contact')}</div>
        <div className="evt-grid2">
          <Input label={t('evt_f_fullname')} value={f.full_name} onChange={set('full_name')} />
          <Input label={t('evt_f_headline')} value={f.headline} onChange={set('headline')} />
          <Input label={t('evt_f_email')} value={f.email} onChange={set('email')} />
          <Input label={t('evt_f_phone')} value={f.phone} onChange={set('phone')} />
          <Input label={t('evt_f_city')} value={f.city} onChange={set('city')} />
          <Input label={t('evt_f_years')} inputMode="decimal" value={f.years} onChange={set('years')} />
        </div>
      </div>
      <div className="evt-block"><Input label={`${t('evt_d_skills')} · ${t('evt_d_skills_hint')}`} value={f.skills} onChange={set('skills')} /></div>
      {pr.summary && <div className="evt-block"><div className="evt-sec">{t('evt_d_summary')}</div><p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#33474f' }}>{pr.summary}</p></div>}
      {!!pr.experience?.length && <div className="evt-block"><div className="evt-sec">{t('evt_d_exp')}</div>{pr.experience.map((e, i) => <div key={i} className="evt-item"><b>{e.title}</b>{e.company ? ` · ${e.company}` : ''}<small>{e.dates}</small>{e.description && <small style={{ color: '#52646d' }}>{e.description}</small>}</div>)}</div>}
      {!!pr.education?.length && <div className="evt-block"><div className="evt-sec">{t('evt_d_edu')}</div>{pr.education.map((e, i) => <div key={i} className="evt-item"><b>{e.degree}</b>{e.institution ? ` · ${e.institution}` : ''}<small>{e.dates}</small></div>)}</div>}
      {!!pr.languages?.length && <div className="evt-block"><div className="evt-sec">{t('evt_d_lang')}</div><div className="evt-chips">{pr.languages.map((l, i) => <span key={i} className="evt-chip">{l.name}{l.level && l.level !== 'Non précisé' ? ` · ${l.level}` : ''}</span>)}</div></div>}
      {!!pr.certifications?.length && <div className="evt-block"><div className="evt-sec">{t('evt_d_cert')}</div><div className="evt-chips">{pr.certifications.map((c, i) => <span key={i} className="evt-chip">{c}</span>)}</div></div>}
      <div className="evt-block"><Textarea label={t('evt_d_notes')} rows={3} value={f.notes} placeholder={t('evt_d_notes_ph')} onChange={set('notes')} /></div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
        <Button loading={saving} disabled={!dirty} onClick={save}>{t('save')}</Button>
        {p.status !== 'converted' && <Button variant="secondary" icon={<UserPlus size={15} />} onClick={onConvert}>{t('evt_convert')}</Button>}
        <Button variant="secondary" icon={<Trash2 size={15} />} onClick={onDelete} style={{ marginInlineStart: 'auto' }}>{t('delete')}</Button>
      </div>
    </div>
  );
}

// ── turn CVs into candidates ──────────────────────────────────────────────────────────────────────────────

function ConvertModal({ ids, prospects, ads, onClose, onDone }: { ids: string[]; prospects: Prospect[]; ads: { id: string; poste: string }[]; onClose: () => void; onDone: () => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const [adId, setAdId] = useState('');
  const [position, setPosition] = useState('');
  const [results, setResults] = useState<ConvertResult[] | null>(null);
  const nameOf = (id: string) => prospects.find(p => p.id === id)?.full_name || t('evt_unnamed');
  const go = useMutation({
    mutationFn: () => convertProspects({ ids, ad_id: adId || undefined, position: position.trim() || undefined }),
    onSuccess: r => {
      onDone();
      if (r.results.every(x => x.ok)) { notify.success(tf(t('evt_conv_done'), { n: r.converted })); onClose(); } else setResults(r.results);
    },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const why = (r: ConvertResult) => t(({ already_converted: 'evt_conv_e_already_converted', already_known: 'evt_conv_e_already_known', needs_review: 'evt_conv_e_needs_review', no_name: 'evt_conv_e_no_name' } as Record<string, TKey>)[r.error ?? ''] ?? 'evt_conv_e_other');
  return (
    <Modal
      open onClose={onClose} width={500} title={t('evt_conv_title')} subtitle={tf(t('evt_conv_sub'), { n: ids.length })}
      footer={results
        ? <><Link to="/app/candidats" className="btn btn-secondary">{t('evt_conv_see')}</Link><Button onClick={onClose}>{t('close')}</Button></>
        : <><Button variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button loading={go.isPending} icon={<UserPlus size={15} />} onClick={() => go.mutate()}>{t('evt_conv_go')}</Button></>}
    >
      {!results ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select label={t('evt_conv_ad')} value={adId} onChange={e => setAdId(e.target.value)}>
            <option value="">{t('evt_conv_noad')}</option>
            {ads.map(a => <option key={a.id} value={a.id}>{a.poste}</option>)}
          </Select>
          <Input label={t('evt_conv_pos')} value={position} maxLength={200} onChange={e => setPosition(e.target.value)} />
          <p style={{ margin: 0, fontSize: 12.5, color: '#5f7079', lineHeight: 1.5 }}>{t('evt_conv_note')}</p>
        </div>
      ) : (
        <div>
          <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#0f6f49' }}>{tf(t('evt_conv_done'), { n: results.filter(r => r.ok).length })}</p>
          {results.filter(r => !r.ok).map(r => <div key={r.id} className="evt-item"><b>{nameOf(r.id)}</b><small style={{ color: '#a33a28' }}>{why(r)}</small></div>)}
        </div>
      )}
    </Modal>
  );
}
