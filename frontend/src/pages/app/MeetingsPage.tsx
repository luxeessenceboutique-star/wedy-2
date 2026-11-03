import { useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { CalendarPlus, Check, Database, ExternalLink, Link2, MapPin, Pencil, Share2, Sparkles, Trash2, Video, X, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError, getLiveRooms, listEmployees, makeGuestLink, meetingRoom } from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useAuth, isHRRole } from '@/lib/auth';
import { useLang, type TKey } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import { tf } from '@/lib/format';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { MeetingsView } from './MeetingsView';

type Kind = 'meet' | 'onb' | 'int' | 'train' | 'review';
type Person = { employee_id?: string | null; name: string };
type Agenda = { t: string; done: boolean; ai: boolean };
type Action = { t: string; owner: string; due: string; done: boolean };
export type Meeting = {
  id: string; title: string; kind: Kind; starts_at: string; duration_min: number; place?: string | null; visio_url?: string | null;
  participants: Person[]; agenda: Agenda[]; prep_notes?: string | null; summary?: string | null; decisions: string[]; actions: Action[];
};
type Face = { name: string; ini: string; av: string };

export type MeetingsVals = {
  rtl: boolean; canEdit: boolean;
  plan: () => void;
  tabs: { label: string; n: number; on: boolean; color: string; go: () => void }[];
  listNote: ReactNode;
  groups: { label: string; items: { id: string; on: boolean; bg: string; kBg: string; kColor: string; time: string; dur: string; title: string; next: boolean; placeIcon: LucideIcon; place: string; faces: Face[]; hasExtra: boolean; extra: string; delay: string; pick: () => void }[] }[];
  cur: null | {
    kind: string; title: string; when: string; place: string; placeIcon: LucideIcon; faces: Face[]; peopleLabel: string;
    upcoming: boolean; past: boolean; summary: string; hasSummary: boolean;
    decisions: { t: string; delay: string }[];
    actions: { t: string; owner: string; due: string; ini: string; av: string; done: boolean; color: string; deco: string; delay: string; toggle: () => void }[];
    actionLabel: string; actionIcon: LucideIcon; action: () => void; tools: ReactNode;
  };
  emptyPanel: ReactNode;
  agenda: { t: string; done: boolean; ai: boolean; n: string; bg: string; color: string; deco: string; toggle: () => void }[];
  agendaDone: string; actionsDone: string;
  newItem: string; onNewItem: (e: ChangeEvent<HTMLInputElement>) => void; addItem: (e: FormEvent) => void;
  busy: boolean; idle: boolean; suggest: () => void;
  notes: string; onNotes: (e: ChangeEvent<HTMLTextAreaElement>) => void; saveNotes: () => void; notesLabel: string;
  minutesTool: ReactNode;
  sendReport: () => void; pdf: () => void;
  drawer: ReactNode;
};

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA' };
const KIND: Record<Kind, [TKey, string, string]> = {
  onb: ['mtg_kind_onb', '#e4f2f4', '#0b5f72'], int: ['mtg_kind_int', '#ece9fb', '#5444b8'], meet: ['mtg_kind_meet', '#e1f5ec', '#0f6f49'],
  train: ['mtg_kind_train', '#fbefda', '#8a5207'], review: ['mtg_kind_review', '#eef2f4', '#33474f'],
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const face = (name: string): Face => ({ name, ini: initialsOf(name), av: avatarGradient(name) });
const listMeetings = () => api.get<{ data: Meeting[] }>('/meetings').then(r => r.data.data);
const patchMeeting = (id: string, body: Partial<Meeting>) => api.patch<Meeting>(`/meetings/${id}`, body).then(r => r.data);
const missingTable = (e: unknown) => axios.isAxiosError(e) && e.response?.status === 503;

/** "Add to my calendar": a one-event .ics file. */
function downloadIcs(m: Meeting) {
  const s = new Date(m.starts_at), e = new Date(s.getTime() + m.duration_min * 60000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (x: string) => x.replace(/[\\,;]/g, c => `\\${c}`).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedy//Meetings//FR', 'BEGIN:VEVENT', `UID:${m.id}@wedy`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(s)}`, `DTEND:${z(e)}`,
    `SUMMARY:${esc(m.title)}`, m.place ? `LOCATION:${esc(m.place)}` : '', m.agenda.length ? `DESCRIPTION:${esc(m.agenda.map((a, i) => `${i + 1}. ${a.t}`).join('\n'))}` : '', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${m.title.replace(/[^\w\- ]+/g, '').trim() || 'reunion'}.ics`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function MeetingsPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const canEdit = isHRRole(user?.role_name ?? user?.role);
  const notify = useNotify();
  const navigate = useNavigate();
  const liveQ = useQuery({ queryKey: ['visio-live'], queryFn: getLiveRooms, refetchInterval: 30_000, retry: false });
  const liveOf = (id: string) => liveQ.data?.[meetingRoom(id)] ?? 0;
  const inviteGuest = async (id: string) => {
    const name = window.prompt(t('vz_guest_prompt'))?.trim();
    if (!name) return;
    try {
      const r = await makeGuestLink(meetingRoom(id), name);
      try { await navigator.clipboard.writeText(r.url); notify.success(t('vz_link_copied')); } catch { window.prompt(t('vz_copy'), r.url); }
    } catch (e) { notify.error(getApiError(e, t('error'))); }
  };
  const qc = useQueryClient();
  const loc = LOCALE[lang] ?? 'fr-FR';
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<'up' | 'past'>('up');
  const [sel, setSel] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const [notesDraft, setNotesDraft] = useState<{ id: string; v: string } | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);

  const q = useQuery({ queryKey: ['meetings'], queryFn: listMeetings, retry: (n, e) => !missingTable(e) && n < 2 });
  const all = useMemo(() => q.data ?? [], [q.data]);
  const up = all.filter(m => new Date(m.starts_at).getTime() + m.duration_min * 60000 >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = all.filter(m => new Date(m.starts_at).getTime() + m.duration_min * 60000 < now).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const src = tab === 'up' ? up : past;
  const cur = all.find(m => m.id === sel) ?? src[0] ?? null;
  const isPast = !!cur && past.some(m => m.id === cur.id);

  const save = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Meeting> }) => patchMeeting(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ['meetings'] });
      const prev = qc.getQueryData<Meeting[]>(['meetings']);
      qc.setQueryData<Meeting[]>(['meetings'], list => list?.map(m => (m.id === id ? { ...m, ...body } : m)));
      return { prev };
    },
    onError: (e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['meetings'], ctx.prev); notify.error(getApiError(e, t('error'))); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  });
  const suggest = useMutation({
    mutationFn: (m: Meeting) => api.post<{ items: string[] }>(`/meetings/${m.id}/suggest-agenda`, null, { params: { lang }, timeout: 90000 }).then(r => r.data.items),
    onSuccess: (items, m) => { save.mutate({ id: m.id, body: { agenda: [...m.agenda, ...items.map(x => ({ t: x, done: false, ai: true }))] } }); notify.success(tf(t('mtg_added_by_wedy'), { n: items.length })); },
    onError: e => notify.error(getApiError(e, t('mtg_ai_failed'))),
  });
  const minutes = useMutation({
    mutationFn: (m: Meeting) => api.post<Meeting>(`/meetings/${m.id}/minutes`, null, { params: { lang }, timeout: 120000 }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meetings'] }); notify.success(t('mtg_minutes_ready')); },
    onError: e => notify.error(axios.isAxiosError(e) && e.response?.status === 422 ? t('mtg_minutes_need_notes') : getApiError(e, t('mtg_ai_failed'))),
  });
  const report = useMutation({
    mutationFn: (m: Meeting) => api.post<{ sent: number; participants: number }>(`/meetings/${m.id}/send-report`).then(r => r.data),
    onSuccess: r => (r.sent ? notify.success(tf(t('mtg_report_sent'), { n: r.sent })) : notify.info(t('mtg_report_nobody'))),
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/meetings/${id}`),
    onSuccess: () => { setSel(null); qc.invalidateQueries({ queryKey: ['meetings'] }); notify.success(t('mtg_deleted')); },
    onError: e => notify.error(getApiError(e, t('error'))),
  });

  // ── formatting ────────────────────────────────────────────────────────────────
  const dayFmt = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' });
  const timeFmt = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' });
  const durOf = (min: number) => (min < 60 ? tf(t('mtg_min'), { n: min }) : min % 60 ? tf(t('mtg_h_min'), { h: Math.floor(min / 60), m: String(min % 60).padStart(2, '0') }) : tf(t('mtg_h'), { h: min / 60 }));
  const placeOf = (m: Meeting) => m.place || (m.visio_url ? t('mtg_visio') : t('vz_brand'));
  const names = (m: Meeting) => m.participants.map(p => p.name);
  const peopleLabel = (ps: string[]) => (ps.length === 0 ? t('mtg_nobody') : ps.length <= 3 ? ps.join(', ') : tf(t('mtg_and_others'), { names: ps.slice(0, 2).join(', '), n: ps.length - 2 }));

  const groups: MeetingsVals['groups'] = [];
  src.forEach((m, i) => {
    const label = cap(dayFmt.format(new Date(m.starts_at)));
    let g = groups.find(x => x.label === label);
    if (!g) { g = { label, items: [] }; groups.push(g); }
    const ps = names(m), [, kBg, kColor] = KIND[m.kind] ?? KIND.meet;
    g.items.push({
      id: m.id, on: m.id === cur?.id, bg: m.id === cur?.id ? '#f3fafb' : '#ffffff', kBg, kColor,
      time: timeFmt.format(new Date(m.starts_at)), dur: durOf(m.duration_min), title: m.title, next: tab === 'up' && i === 0,
      placeIcon: !m.place ? Video : MapPin, place: placeOf(m), faces: ps.slice(0, 3).map(face), hasExtra: ps.length > 3, extra: `+${ps.length - 3}`,
      delay: String(Math.min(i, 10) * 50), pick: () => { setSel(m.id); setNewItem(''); },
    });
  });

  // ── selected meeting ─────────────────────────────────────────────────────────
  const notes = cur && notesDraft?.id === cur.id ? notesDraft.v : cur?.prep_notes ?? '';
  const shareText = (m: Meeting) => [m.title, `${cap(dayFmt.format(new Date(m.starts_at)))} · ${timeFmt.format(new Date(m.starts_at))}`, '', m.summary ?? '',
    ...(m.decisions.length ? ['', `${t('mtg_decisions')} :`, ...m.decisions.map(d => `• ${d}`)] : []),
    ...(m.actions.length ? ['', `${t('mtg_actions')} :`, ...m.actions.map(a => `• ${a.t}${a.owner ? ` — ${a.owner}` : ''}${a.due ? ` (${a.due})` : ''}`)] : [])].join('\n');
  const printMinutes = (m: Meeting) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const e = (x: string) => x.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
    w.document.write(`<!doctype html><html dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${e(m.title)}</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#0a1c24;line-height:1.55}h1{font-size:24px;margin:0}small{color:#52646d}h2{font-size:16px;margin:24px 0 8px}li{margin:4px 0}</style></head><body>`
      + `<h1>${e(m.title)}</h1><small>${e(cap(dayFmt.format(new Date(m.starts_at))))} · ${e(timeFmt.format(new Date(m.starts_at)))} · ${e(placeOf(m))}<br>${e(names(m).join(', '))}</small>`
      + (m.summary ? `<h2>${e(t('mtg_compte_rendu_redige_par_wedy'))}</h2><p>${e(m.summary)}</p>` : '')
      + (m.decisions.length ? `<h2>${e(t('mtg_decisions'))}</h2><ul>${m.decisions.map(d => `<li>${e(d)}</li>`).join('')}</ul>` : '')
      + (m.actions.length ? `<h2>${e(t('mtg_actions'))}</h2><ul>${m.actions.map(a => `<li>${a.done ? '☑' : '☐'} ${e(a.t)}${a.owner ? ` — ${e(a.owner)}` : ''}${a.due ? ` (${e(a.due)})` : ''}</li>`).join('')}</ul>` : '')
      + '</body></html>');
    w.document.close(); w.focus(); w.print();
  };

  const toolBtn: CSSProperties = { width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.06)', color: '#cfdde1', cursor: 'pointer' };
  const curVals: MeetingsVals['cur'] = cur && {
    kind: t((KIND[cur.kind] ?? KIND.meet)[0]), title: cur.title,
    when: `${cap(dayFmt.format(new Date(cur.starts_at)))} · ${timeFmt.format(new Date(cur.starts_at))} · ${durOf(cur.duration_min)}`,
    place: placeOf(cur), placeIcon: !cur.place ? Video : MapPin,
    faces: names(cur).slice(0, 5).map(face), peopleLabel: peopleLabel(names(cur)),
    upcoming: !isPast, past: isPast, summary: cur.summary ?? '', hasSummary: !!cur.summary?.trim(),
    decisions: cur.decisions.map((d, i) => ({ t: d, delay: String(i * 70) })),
    actions: cur.actions.map((a, i) => ({
      ...a, ini: initialsOf(a.owner || '?'), av: avatarGradient(a.owner || '?'), color: a.done ? '#7d8f97' : '#1d3540', deco: a.done ? 'line-through' : 'none', delay: String(i * 70),
      toggle: () => canEdit && save.mutate({ id: cur.id, body: { actions: cur.actions.map((x, k) => (k === i ? { ...x, done: !x.done } : x)) } }),
    })),
    actionLabel: isPast ? t('mtg_share') : liveOf(cur.id) ? tf(t('vz_join_live'), { n: liveOf(cur.id) }) : t('vz_join_meeting'),
    actionIcon: isPast ? Share2 : Video,
    action: () => {
      if (isPast) { navigator.clipboard?.writeText(shareText(cur)).then(() => notify.success(t('mtg_copied')), () => notify.error(t('error'))); return; }
      navigate(`/visio/${meetingRoom(cur.id)}`);
    },
    tools: (
      <span style={{ display: 'inline-flex', gap: 6 }}>
        {!isPast && <button type="button" aria-label={t('mtg_add_calendar')} title={t('mtg_add_calendar')} onClick={() => downloadIcs(cur)} style={toolBtn}><CalendarPlus size={15} /></button>}
        {!isPast && cur.visio_url && <button type="button" aria-label={t('vz_external')} title={`${t('vz_external')} · ${cur.visio_url}`} onClick={() => window.open(cur.visio_url!, '_blank', 'noopener')} style={toolBtn}><ExternalLink size={15} /></button>}
        {!isPast && canEdit && <button type="button" aria-label={t('vz_invite')} title={t('vz_invite')} onClick={() => inviteGuest(cur.id)} style={toolBtn}><Link2 size={15} /></button>}
        {canEdit && <>
        <button type="button" aria-label={t('edit')} title={t('edit')} onClick={() => setEditing(cur)} style={toolBtn}><Pencil size={15} /></button>
        <button type="button" aria-label={t('delete')} title={t('delete')} onClick={() => { if (window.confirm(tf(t('mtg_confirm_delete'), { title: cur.title }))) del.mutate(cur.id); }} style={toolBtn}><Trash2 size={15} /></button>
        </>}
      </span>
    ),
  };

  const agenda = cur?.agenda ?? [];
  const tableMissing = missingTable(q.error);
  const listNote = q.isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '26px 0' }}><Spinner /></div>
    : tableMissing ? (
      <div style={{ display: 'flex', gap: 10, margin: '4px 12px 12px', padding: 14, borderRadius: 14, background: '#fbefda', color: '#8a5207', fontSize: 13, lineHeight: 1.5 }}>
        <Database size={16} style={{ flexShrink: 0, marginTop: 2 }} /><span>{canEdit ? t('mtg_table_missing') : t('mtg_none_up')}</span>
      </div>
    ) : src.length === 0 ? <div style={{ padding: '26px 16px', textAlign: 'center', fontSize: 13.5, color: '#5f7079' }}>{t(tab === 'up' ? 'mtg_none_up' : 'mtg_none_past')}</div> : null;

  const saveNotes = () => { if (cur && canEdit && notesDraft?.id === cur.id && notesDraft.v !== (cur.prep_notes ?? '')) save.mutate({ id: cur.id, body: { prep_notes: notesDraft.v } }); };
  const panelBox: CSSProperties = { flex: '1.6 1 520px', minWidth: 0, borderRadius: 22, background: '#ffffff', border: '1px solid #e2e8eb', padding: '40px 28px', textAlign: 'center', color: '#52646d', fontSize: 14 };
  const v: MeetingsVals = {
    rtl: lang === 'ar', canEdit,
    plan: () => setPlanOpen(true),
    tabs: ([['up', 'mtg_tab_up', up.length], ['past', 'mtg_tab_past', past.length]] as const).map(([k, key, n]) => ({ label: t(key), n, on: tab === k, color: tab === k ? '#0a1c24' : '#52646d', go: () => { setTab(k); setSel(null); } })),
    listNote, groups, cur: curVals,
    emptyPanel: (
      <div style={panelBox}>
        <img src="/wedy-avatar.png" alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', background: '#e4f2f4' }} />
        <div style={{ marginTop: 12, fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontWeight: 700, fontSize: 18, color: '#0a1c24' }}>{t('mtg_empty_title')}</div>
        <div style={{ marginTop: 6, lineHeight: 1.55 }}>{t(canEdit ? 'mtg_empty_hr' : 'mtg_empty_emp')}</div>
        {canEdit && !tableMissing && <button type="button" className="btn btn-primary" onClick={() => setPlanOpen(true)} style={{ marginTop: 16 }}><CalendarPlus size={15} /> {t('mtg_planifier_une_reunion')}</button>}
      </div>
    ),
    agenda: agenda.map((a, i) => ({
      ...a, ai: !!a.ai, n: String(i + 1).padStart(2, '0'), bg: a.done ? '#f8fafb' : '#ffffff', color: a.done ? '#7d8f97' : '#1d3540', deco: a.done ? 'line-through' : 'none',
      toggle: () => cur && canEdit && save.mutate({ id: cur.id, body: { agenda: agenda.map((x, k) => (k === i ? { ...x, done: !x.done } : x)) } }),
    })),
    agendaDone: tf(t('mtg_agenda_done'), { d: agenda.filter(a => a.done).length, n: agenda.length }),
    actionsDone: tf(t('mtg_actions_done'), { d: (cur?.actions ?? []).filter(a => a.done).length, n: cur?.actions.length ?? 0 }),
    newItem, onNewItem: e => setNewItem(e.target.value),
    addItem: e => { e.preventDefault(); const x = newItem.trim(); if (!x || !cur) return; setNewItem(''); save.mutate({ id: cur.id, body: { agenda: [...agenda, { t: x, done: false, ai: false }] } }); },
    busy: suggest.isPending, idle: !suggest.isPending, suggest: () => cur && suggest.mutate(cur),
    notes, onNotes: e => cur && setNotesDraft({ id: cur.id, v: e.target.value }),
    saveNotes,
    notesLabel: t(isPast ? 'mtg_meeting_notes' : 'mtg_notes_de_preparation'),
    minutesTool: cur && isPast ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(canEdit || notes) && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>
            {t('mtg_meeting_notes')}
            <textarea rows={3} value={notes} readOnly={!canEdit} onChange={e => setNotesDraft({ id: cur.id, v: e.target.value })} onBlur={saveNotes} placeholder={t('mtg_notes_ph')}
              style={{ resize: 'vertical', padding: '10px 12px', borderRadius: 11, border: '1px solid #d6dfe3', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: '#0a1c24', outline: 'none' }} className="mtg-f3" />
          </label>
        )}
        {canEdit && (
          <button type="button" disabled={minutes.isPending} onClick={() => { saveNotes(); minutes.mutate({ ...cur, prep_notes: notes }); }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#5444b8,#6d5ad6)', color: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            {minutes.isPending ? <Spinner size={14} color="#fff" /> : <Sparkles size={15} />}{t(cur.summary ? 'mtg_redraft' : 'mtg_draft_minutes')}
          </button>
        )}
        {!cur.summary && !canEdit && <div style={{ fontSize: 13.5, color: '#5f7079' }}>{t('mtg_no_minutes')}</div>}
      </div>
    ) : null,
    sendReport: () => cur && report.mutate(cur),
    pdf: () => cur && printMinutes(cur),
    drawer: canEdit ? <MeetingDrawer open={planOpen || !!editing} meeting={editing} onClose={() => { setPlanOpen(false); setEditing(null); }} onSaved={m => { setTab(new Date(m.starts_at).getTime() >= Date.now() ? 'up' : 'past'); setSel(m.id); }} /> : null,
  };
  return <MeetingsView v={v} />;
}

// ── plan / edit a meeting ────────────────────────────────────────────────────────
const inputStyle: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };
const pad = (n: number) => String(n).padStart(2, '0');

function MeetingDrawer({ open, meeting, onClose, onSaved }: { open: boolean; meeting: Meeting | null; onClose: () => void; onSaved: (m: Meeting) => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const empQ = useQuery({ queryKey: ['employees', 'staff-list'], queryFn: () => listEmployees({ limit: 1000 }), enabled: open });
  const staff = (empQ.data?.data ?? []).filter(e => e.status !== 'candidate' && e.status !== 'terminated');
  const init = () => {
    const d = meeting ? new Date(meeting.starts_at) : (() => { const x = new Date(); x.setDate(x.getDate() + 1); x.setHours(10, 0, 0, 0); return x; })();
    return {
      title: meeting?.title ?? '', kind: (meeting?.kind ?? 'meet') as Kind, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      duration: String(meeting?.duration_min ?? 60), place: meeting?.place ?? '', visio: meeting?.visio_url ?? '',
      people: (meeting?.participants ?? []) as Person[], agenda: (meeting?.agenda ?? []).map(a => a.t).join('\n'), pick: '', guest: '',
    };
  };
  const [f, setF] = useState(init);
  const [key, setKey] = useState<string | null>(null);
  const k = open ? meeting?.id ?? 'new' : null;
  if (k !== key) { setKey(k); if (open) setF(init()); }

  const mut = useMutation({
    mutationFn: () => {
      const old = new Map((meeting?.agenda ?? []).map(a => [a.t, a]));
      const body = {
        title: f.title.trim(), kind: f.kind, starts_at: new Date(`${f.date}T${f.time || '09:00'}`).toISOString(), duration_min: Math.max(5, Number(f.duration) || 60),
        place: f.place.trim() || null, visio_url: f.visio.trim() || null, participants: f.people,
        agenda: f.agenda.split('\n').map(x => x.trim()).filter(Boolean).map(x => old.get(x) ?? { t: x, done: false, ai: false }),
      };
      return meeting ? api.patch<Meeting>(`/meetings/${meeting.id}`, body).then(r => r.data) : api.post<Meeting>('/meetings', body).then(r => r.data);
    },
    onSuccess: m => { qc.invalidateQueries({ queryKey: ['meetings'] }); notify.success(t(meeting ? 'mtg_updated' : 'mtg_created')); onSaved(m); onClose(); },
    onError: e => notify.error(missingTable(e) ? t('mtg_table_missing') : getApiError(e, t('error'))),
  });
  const addPerson = (p: Person) => setF(x => (x.people.some(y => (p.employee_id && y.employee_id === p.employee_id) || y.name === p.name) ? x : { ...x, people: [...x.people, p], pick: '', guest: '' }));
  const ok = !!f.title.trim() && !!f.date;

  return (
    <Drawer open={open} onClose={onClose} title={t(meeting ? 'mtg_edit' : 'mtg_planifier_une_reunion')} subtitle={t('mtg_drawer_sub')} icon={<CalendarPlus size={17} />} width={540}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!ok || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('save')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={labelStyle}>{t('mtg_title')}</label><input value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder={t('mtg_title_ph')} style={inputStyle} /></div>
        <div>
          <label style={labelStyle}>{t('mtg_kind')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(Object.keys(KIND) as Kind[]).map(kd => {
              const [key2, bg, color] = KIND[kd], on = f.kind === kd;
              return <button key={kd} type="button" onClick={() => setF(x => ({ ...x, kind: kd }))} style={{ height: 34, padding: '0 12px', borderRadius: 99, border: `1px solid ${on ? color : '#d6dfe3'}`, background: on ? bg : '#ffffff', color: on ? color : '#33474f', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{t(key2)}</button>;
            })}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle}>{t('mtg_date')}</label><input type="date" value={f.date} onChange={e => setF(x => ({ ...x, date: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('mtg_time')}</label><input type="time" value={f.time} onChange={e => setF(x => ({ ...x, time: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('mtg_duration')}</label>
            <select value={f.duration} onChange={e => setF(x => ({ ...x, duration: e.target.value }))} style={inputStyle}>
              {[15, 30, 45, 60, 90, 120, 180, 240].map(n => <option key={n} value={n}>{n < 60 ? tf(t('mtg_min'), { n }) : n % 60 ? tf(t('mtg_h_min'), { h: Math.floor(n / 60), m: String(n % 60).padStart(2, '0') }) : tf(t('mtg_h'), { h: n / 60 })}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle}>{t('mtg_place')}</label><input value={f.place} onChange={e => setF(x => ({ ...x, place: e.target.value }))} placeholder={t('mtg_place_ph')} style={inputStyle} /></div>
          <div>
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '10px 12px', marginBottom: 10, borderRadius: 12, background: '#f2f9fa', border: '1px solid #d7ecef', fontSize: 12.5, color: '#33474f' }}><Video size={15} color="#0e6f84" style={{ flexShrink: 0, marginTop: 1 }} /><span><b style={{ color: '#0a1c24' }}>{t('vz_brand')}</b> · {t('vz_form_note')}</span></div>
            <label style={labelStyle}>{t('vz_external_opt')}</label><input value={f.visio} onChange={e => setF(x => ({ ...x, visio: e.target.value }))} placeholder="https://meet.google.com/…" style={inputStyle} dir="ltr" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t('mtg_participants')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: f.people.length ? 8 : 0 }}>
            {f.people.map(p => (
              <span key={p.employee_id ?? p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 4px', borderRadius: 99, background: '#f3f6f7', fontSize: 12.5, fontWeight: 600, color: '#33474f' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: avatarGradient(p.name), color: '#fff', fontSize: 9, fontWeight: 700 }}>{initialsOf(p.name)}</span>
                {p.name}
                <button type="button" aria-label={t('delete')} onClick={() => setF(x => ({ ...x, people: x.people.filter(y => y !== p) }))} style={{ display: 'inline-flex', padding: 2, border: 'none', background: 'none', color: '#7d8f97', cursor: 'pointer' }}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select value={f.pick} onChange={e => { const emp = staff.find(x => x.id === e.target.value); if (emp) addPerson({ employee_id: emp.id, name: emp.full_name }); }} style={inputStyle}>
              <option value="">{empQ.isLoading ? t('loading') : t('mtg_add_employee')}</option>
              {staff.filter(e => !f.people.some(p => p.employee_id === e.id)).map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
            <form onSubmit={e => { e.preventDefault(); if (f.guest.trim()) addPerson({ employee_id: null, name: f.guest.trim() }); }} style={{ display: 'flex', gap: 6 }}>
              <input value={f.guest} onChange={e => setF(x => ({ ...x, guest: e.target.value }))} placeholder={t('mtg_guest_ph')} style={inputStyle} />
              <button type="submit" className="btn btn-secondary" style={{ height: 40 }}>{t('mtg_add')}</button>
            </form>
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t('mtg_ordre_du_jour')}</label>
          <textarea rows={4} value={f.agenda} onChange={e => setF(x => ({ ...x, agenda: e.target.value }))} placeholder={t('mtg_agenda_ph')} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
        </div>
      </div>
    </Drawer>
  );
}
