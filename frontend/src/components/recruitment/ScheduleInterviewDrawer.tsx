import { useState, type CSSProperties } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Check } from 'lucide-react';
import { scheduleInterview, getApiError } from '@/services/api';
import type { Employee, Interview } from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { INTERVIEW_KIND } from '@/lib/recruitment';
import { useNotify } from '@/lib/notify';

const KIND = INTERVIEW_KIND;
const inputStyle: CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 13.5, color: '#0a1c24', outline: 'none' };
const labelStyle: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#33474f', marginBottom: 6 };

/** Schedule an interview for a candidate (`/entretiens`). `candidateId` preselects one. */
export function ScheduleInterviewDrawer({ open, onClose, candidates, defaultDate, candidateId = '', onScheduled }: { open: boolean; onClose: () => void; candidates: Employee[]; defaultDate?: string; candidateId?: string; onScheduled?: (c?: Employee) => void }) {
  const { t } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const empty = { candidate_id: candidateId, date: defaultDate || new Date().toISOString().slice(0, 10), start_time: '10:00', end_time: '11:00', type: 'rh', recruiter_name: '', meet_link: '', notes: '' };
  const [f, setF] = useState(empty);
  const [lastKey, setLastKey] = useState(`${open}|${candidateId}`);
  if (`${open}|${candidateId}` !== lastKey) { setLastKey(`${open}|${candidateId}`); if (open) setF(empty); }
  const set = (k: keyof typeof empty, v: string) => setF(x => ({ ...x, [k]: v }));
  const mut = useMutation({
    mutationFn: () => {
      const c = candidates.find(x => x.id === f.candidate_id);
      return scheduleInterview({ ...f, type: f.type as Interview['type'], candidate_name: c?.full_name, job_title: c?.position || undefined, meet_link: f.meet_link || undefined, notes: f.notes || undefined });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interviews'] }); notify.success(t('pl_interview_planned')); onScheduled?.(candidates.find(x => x.id === f.candidate_id)); setF(empty); onClose(); },
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
        <div><label style={labelStyle}>{t('pl_interviewer')}</label><input value={f.recruiter_name} onChange={e => set('recruiter_name', e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>{t('pl_meet_link')}</label><input value={f.meet_link} onChange={e => set('meet_link', e.target.value)} placeholder="https://meet.google.com/…" style={inputStyle} /></div>
        <div><label style={labelStyle}>{t('pl_notes')}</label><textarea rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }} /></div>
      </div>
    </Drawer>
  );
}
