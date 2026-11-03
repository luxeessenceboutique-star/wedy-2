import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Check, Video, X } from 'lucide-react';
import { scheduleInterview, listEmployees, getApiError } from '@/services/api';
import type { Employee, Interview, InterviewPerson } from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { INTERVIEW_KIND } from '@/lib/recruitment';
import { durationMin, interviewStart } from '@/lib/interview';
import { useNotify } from '@/lib/notify';

const KIND = INTERVIEW_KIND;
const inputStyle: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };

/** Schedule an interview for a candidate (`/entretiens`), with its interviewers and its meeting in the agenda.
 *  `candidateId` preselects one, `defaultType` the interview type (e.g. the next round after an interview). */
export function ScheduleInterviewDrawer({ open, onClose, candidates, defaultDate, candidateId = '', defaultType = 'rh', onScheduled }: {
  open: boolean; onClose: () => void; candidates: Employee[]; defaultDate?: string; candidateId?: string; defaultType?: Interview['type'];
  onScheduled?: (c?: Employee, iv?: Interview) => void;
}) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const empty = { candidate_id: candidateId, date: defaultDate || new Date().toISOString().slice(0, 10), start_time: '10:00', end_time: '11:00', type: defaultType as string, meet_link: '', place: '', notes: '' };
  const [f, setF] = useState(empty);
  const [people, setPeople] = useState<InterviewPerson[]>([]);
  const [who, setWho] = useState('');
  const [withMeeting, setWithMeeting] = useState(true);
  const [lastKey, setLastKey] = useState(`${open}|${candidateId}|${defaultType}`);
  if (`${open}|${candidateId}|${defaultType}` !== lastKey) { setLastKey(`${open}|${candidateId}|${defaultType}`); if (open) { setF(empty); setPeople([]); setWho(''); } }
  const set = (k: keyof typeof empty, v: string) => setF(x => ({ ...x, [k]: v }));
  const staffQ = useQuery({ queryKey: ['employees', 'active'], queryFn: () => listEmployees({ limit: 500, status: 'active' }), enabled: open });
  const staff = staffQ.data?.data ?? [];

  const addPerson = (raw: string) => {
    const name = raw.trim();
    if (!name || people.some(p => p.name.toLowerCase() === name.toLowerCase())) { setWho(''); return; }
    const e = staff.find(x => x.full_name.toLowerCase() === name.toLowerCase());
    setPeople(p => [...p, { employee_id: e?.id ?? null, name: e?.full_name ?? name }]);
    setWho('');
  };
  const onWhoKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addPerson(who); } };

  const mut = useMutation({
    mutationFn: () => {
      const c = candidates.find(x => x.id === f.candidate_id);
      const all = who.trim() ? [...people, { employee_id: staff.find(x => x.full_name.toLowerCase() === who.trim().toLowerCase())?.id ?? null, name: who.trim() }] : people;
      return scheduleInterview({
        candidate_id: f.candidate_id, date: f.date, start_time: f.start_time, end_time: f.end_time, type: f.type as Interview['type'],
        candidate_name: c?.full_name, job_title: c?.position || undefined, meet_link: f.meet_link || undefined, notes: f.notes || undefined,
        recruiter_name: all[0]?.name, interviewers: all,
        meeting: withMeeting ? { starts_at: interviewStart(f.date, f.start_time).toISOString(), duration_min: durationMin(f.start_time, f.end_time), place: f.place || undefined, visio_url: f.meet_link || undefined } : undefined,
      });
    },
    onSuccess: iv => {
      qc.invalidateQueries({ queryKey: ['interviews'] }); qc.invalidateQueries({ queryKey: ['interviews-board'] }); qc.invalidateQueries({ queryKey: ['meetings'] });
      notify.success(t('pl_interview_planned'));
      onScheduled?.(candidates.find(x => x.id === f.candidate_id), iv);
      setF(empty); setPeople([]); onClose();
    },
    onError: e => notify.error(getApiError(e, t('error'))),
  });
  const submit = () => {
    if (!f.candidate_id) { notify.error(t('pl_pick_candidate')); return; }
    if (f.end_time <= f.start_time) { notify.error(t('pl_end_after_start')); return; }
    mut.mutate();
  };
  return (
    <Drawer open={open} onClose={onClose} title={t('pl_new_interview')} subtitle={t('pl_new_interview_sub')} icon={<CalendarClock size={17} />} width={480}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={mut.isPending}>{mut.isPending ? <Spinner size={14} color="#fff" /> : <Check size={14} />} {t('pl_schedule')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t('pl_candidate')} *</label>
          <select value={f.candidate_id} onChange={e => set('candidate_id', e.target.value)} style={inputStyle}>
            <option value="">{t('pl_pick_candidate')}</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.position ? ` · ${c.position}` : ''}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 10 }}>
          <div><label style={labelStyle}>{t('pl_date')}</label><input type="date" value={f.date} onChange={e => set('date', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('pl_start')}</label><input type="time" value={f.start_time} onChange={e => set('start_time', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('pl_end')}</label><input type="time" value={f.end_time} onChange={e => set('end_time', e.target.value)} style={inputStyle} /></div>
        </div>
        <div>
          <label style={labelStyle}>{t('pl_type')}</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['rh', 'technical', 'final'] as const).map(k => (
              <button key={k} type="button" onClick={() => set('type', k)} style={{ flex: 1, height: 38, borderRadius: 10, border: `1px solid ${f.type === k ? KIND[k][3] : '#d6dfe3'}`, background: f.type === k ? KIND[k][1] : '#ffffff', color: f.type === k ? KIND[k][2] : '#33474f', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t(KIND[k][0])}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t('itv_interviewers')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 40, padding: '5px 8px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff' }}>
            {people.map(p => (
              <span key={p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 27, padding: '0 6px 0 10px', borderRadius: 8, background: p.employee_id ? '#e4f2f4' : '#eef2f4', color: p.employee_id ? '#0b5f72' : '#33474f', fontSize: 12.5, fontWeight: 600 }}>
                {p.name}
                <button type="button" aria-label={t('itv_remove')} onClick={() => setPeople(x => x.filter(y => y !== p))} style={{ display: 'inline-flex', padding: 2, border: 'none', background: 'none', color: 'inherit', cursor: 'pointer' }}><X size={12} /></button>
              </span>
            ))}
            <input list="itv-staff" value={who} onChange={e => { const v = e.target.value; if (staff.some(x => x.full_name === v)) addPerson(v); else setWho(v); }} onKeyDown={onWhoKey} onBlur={() => who.trim() && addPerson(who)}
              placeholder={people.length ? '' : t('itv_interviewers_ph')} style={{ flex: 1, minWidth: 120, height: 28, border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', background: 'transparent' }} />
            <datalist id="itv-staff">{staff.filter(s => !people.some(p => p.employee_id === s.id)).map(s => <option key={s.id} value={s.full_name}>{s.position ?? ''}</option>)}</datalist>
          </div>
        </div>
        <div><label style={labelStyle}>{t('pl_meet_link')}</label><input value={f.meet_link} onChange={e => set('meet_link', e.target.value)} placeholder="https://meet.google.com/…" style={inputStyle} /></div>
        <div><label style={labelStyle}>{t('itv_place')}</label><input value={f.place} onChange={e => set('place', e.target.value)} placeholder={t('itv_place_ph')} style={inputStyle} /></div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 12, background: withMeeting ? '#f2f9fa' : '#f6f8f9', border: `1px solid ${withMeeting ? '#cfe8ec' : '#e2e8eb'}`, cursor: 'pointer' }}>
          <input type="checkbox" checked={withMeeting} onChange={e => setWithMeeting(e.target.checked)} style={{ marginTop: 2, accentColor: '#0e6f84' }} />
          <span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0a1c24' }}><Video size={14} color="#0e6f84" />{t('itv_with_meeting')}</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#5f7079' }}>{t('itv_with_meeting_s')}</span>
          </span>
        </label>
        <div><label style={labelStyle}>{t('pl_notes')}</label><textarea rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }} /></div>
      </div>
    </Drawer>
  );
}
