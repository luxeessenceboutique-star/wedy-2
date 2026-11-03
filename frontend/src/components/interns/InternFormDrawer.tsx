// Add / edit an intern — side drawer in the Employees drawer style. Every register column of the intern can be set here.
import { useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Check, ChevronsUpDown, CircleAlert, GraduationCap } from 'lucide-react';
import { listDepartments, type Intern } from '@/services/api';
import { Drawer, Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { INTERNSHIP_TYPES, STAGE_KEY, STAGE_OPTIONS, TYPE_KEY } from './internMeta';

const lab: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#33474f' };
const inp: CSSProperties = { height: 44, padding: '0 12px', borderRadius: 11, border: '1px solid #d6dfe3', background: '#ffffff', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: '#0a1c24', outline: 'none', width: '100%', boxSizing: 'border-box' };
const area: CSSProperties = { ...inp, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 };
const kicker: CSSProperties = { fontFamily: "'Geist Mono',monospace", fontSize: 11, letterSpacing: '.12em', color: '#5f7079', textTransform: 'uppercase' };
const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 };

type F = Partial<Intern> & { languages?: string[] };

export function InternFormDrawer({ open, initial, saving, onClose, onSave }: {
  open: boolean; initial: Partial<Intern> | null; saving: boolean; onClose: () => void; onSave: (data: Partial<Intern>) => void;
}) {
  const { t } = useLang();
  const deptQ = useQuery({ queryKey: ['departments'], queryFn: listDepartments, enabled: open });
  const blank = (): F => ({ full_name: '', email: '', phone: '', position: '', department: '', manager: '', internship_start: '', internship_end: '', internship_status: 'En cours', internship_type: '', skills: [], languages: [], ...(initial ?? {}) });
  const [f, setF] = useState<F>(blank);
  const [err, setErr] = useState('');
  const [more, setMore] = useState(false);
  const [key, setKey] = useState(`${open}|${initial?.id ?? ''}`);
  if (`${open}|${initial?.id ?? ''}` !== key) { setKey(`${open}|${initial?.id ?? ''}`); if (open) { setF(blank()); setErr(''); setMore(!!initial?.id); } }
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof F) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { const v = e.target.value; setF(x => ({ ...x, [k]: v })); setErr(''); };
  const setList = (k: 'skills' | 'languages') => (e: ChangeEvent<HTMLInputElement>) => { const v = e.target.value; setF(x => ({ ...x, [k]: v.split(',').map(s => s.trimStart()) })); };
  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) { setErr(t('stg_photo_big')); return; }
    const r = new FileReader();
    r.onload = ev => { const res = String(ev.target?.result ?? ''); setF(x => ({ ...x, photo_url: res.includes(',') ? res.split(',')[1] : res })); };
    r.readAsDataURL(file);
  };
  const photoSrc = f.photo_url ? (f.photo_url.startsWith('data:') || f.photo_url.startsWith('http') ? f.photo_url : `data:image/jpeg;base64,${f.photo_url}`) : '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(f.full_name ?? '').trim()) { setErr(t('stg_err_name')); return; }
    if (f.internship_start && f.internship_end && f.internship_end < f.internship_start) { setErr(t('stg_err_dates')); return; }
    const clean = (s?: string | null) => ((s ?? '').trim() === '' ? null : (s ?? '').trim());
    const list = (a?: string[]) => (a ?? []).map(s => s.trim()).filter(Boolean);
    const out: Partial<Intern> = {
      ...f, full_name: (f.full_name ?? '').trim(), status: initial?.status && initial.status !== 'intern' ? initial.status : 'intern', contract_type: 'Stage',
      skills: list(f.skills), languages: list(f.languages),
      remuneration: f.remuneration === undefined || (f.remuneration as unknown) === '' ? undefined : Number(f.remuneration),
    } as Partial<Intern>;
    for (const k of ['email', 'phone', 'position', 'department', 'manager', 'internship_start', 'internship_end', 'internship_status', 'internship_type', 'school', 'education_summary', 'internship_period', 'school_contact', 'notes', 'bio', 'test_code_source', 'test_demo_link', 'test_cv', 'test_note_rh', 'test_note_test'] as const) {
      (out as Record<string, unknown>)[k] = clean(f[k] as string | undefined);
    }
    onSave(out);
  };

  const field = (k: keyof F, label: string, ph = '', type = 'text') => (
    <label style={lab}>{label}<input type={type} value={(f[k] as string | number | undefined) ?? ''} onChange={set(k)} placeholder={ph} style={inp} className="emp-f4" /></label>
  );

  return (
    <Drawer open={open} onClose={onClose} onSubmit={submit} width={600} icon={<GraduationCap size={19} />}
      title={t(initial?.id ? 'stg_edit_title' : 'stg_add_title')} subtitle={t('stg_form_sub')}
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Spinner size={14} color="#fff" /> : <Check size={15} />} {t(initial?.id ? 'stg_save' : 'stg_add')}</button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, background: '#f8fafb', border: '1px solid #eef2f4' }}>
          <button type="button" onClick={() => fileRef.current?.click()} aria-label={t('stg_photo')} style={{ position: 'relative', width: 58, height: 58, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: photoSrc ? `center/cover url(${photoSrc})` : avatarGradient(f.full_name || '?'), color: '#fff', fontWeight: 700, fontSize: 18 }}>
            {!photoSrc && initialsOf(f.full_name || '?')}
            <span style={{ position: 'absolute', insetInlineEnd: -2, bottom: -2, width: 22, height: 22, borderRadius: '50%', background: '#0e6f84', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={11} /></span>
          </button>
          <div style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: '#0a1c24' }}>{t('stg_photo')}</div>
            <div style={{ color: '#5f7079', fontSize: 12 }}>{t('stg_photo_s')}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        </div>

        <div style={kicker}>{t('stg_k_identity')}</div>
        <div style={grid2}>
          {field('full_name', `${t('stg_f_name')} *`, 'Amine Alami')}
          {field('email', t('stg_f_email'), 'amine@gmail.com', 'email')}
          {field('phone', t('stg_f_phone'), '+212 6 00 00 00 00')}
          {field('position', t('stg_f_mission'), t('stg_f_mission_ph'))}
        </div>

        <div style={kicker}>{t('stg_k_internship')}</div>
        <div style={grid2}>
          <label style={lab}>{t('stg_f_type')}
            <select value={f.internship_type ?? ''} onChange={set('internship_type')} style={inp}>
              <option value="">{t('stg_choose')}</option>
              {INTERNSHIP_TYPES.map(o => <option key={o} value={o}>{t(TYPE_KEY[o])}</option>)}
            </select>
          </label>
          <label style={lab}>{t('stg_f_status')}
            <select value={f.internship_status ?? ''} onChange={set('internship_status')} style={inp}>
              <option value="">{t('stg_choose')}</option>
              {STAGE_OPTIONS.map(o => <option key={o} value={o}>{t(STAGE_KEY[o])}</option>)}
            </select>
          </label>
          {field('internship_start', t('stg_f_start'), '', 'date')}
          {field('internship_end', t('stg_f_end'), '', 'date')}
          <label style={lab}>{t('stg_f_dept')}
            <select value={f.department ?? ''} onChange={set('department')} style={inp}>
              <option value="">{t('stg_choose')}</option>
              {(deptQ.data ?? []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              {f.department && !(deptQ.data ?? []).some(d => d.name === f.department) && <option value={f.department}>{f.department}</option>}
            </select>
          </label>
          {field('manager', t('stg_f_tutor'), t('stg_f_tutor_ph'))}
        </div>

        <div style={kicker}>{t('stg_k_school')}</div>
        <div style={grid2}>
          {field('school', t('stg_f_school'), 'ENSA Casablanca')}
          {field('education_summary', t('stg_f_study'), t('stg_f_study_ph'))}
          {field('school_contact', t('stg_f_school_contact'), 'prof@ecole.ma')}
          {field('internship_period', t('stg_f_period'), t('stg_f_period_ph'))}
        </div>

        <button type="button" onClick={() => setMore(m => !m)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 11, border: '1.5px dashed #d0dadf', background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: '#52646d', cursor: 'pointer' }} className="emp-h14">
          <ChevronsUpDown size={14} />{t(more ? 'stg_less' : 'stg_more')}
        </button>
        {more && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 14, background: '#f8fafb', border: '1px solid #eef2f4' }}>
            <div style={grid2}>
              {field('remuneration', t('stg_f_pay'), '2000', 'number')}
              <label style={lab}>{t('stg_f_skills')}<input value={(f.skills ?? []).join(',')} onChange={setList('skills')} placeholder="React, SQL, Excel" style={inp} /></label>
              <label style={lab}>{t('stg_f_langs')}<input value={(f.languages ?? []).join(',')} onChange={setList('languages')} placeholder="Français, Anglais" style={inp} /></label>
            </div>
            <div style={kicker}>{t('stg_k_test')}</div>
            <div style={grid2}>
              {field('test_code_source', t('stg_f_code'), 'https://github.com/…')}
              {field('test_demo_link', t('stg_f_demo'), 'https://…')}
              {field('test_cv', t('stg_f_cv_link'), 'https://drive.google.com/…')}
              {field('test_note_rh', t('stg_f_note_rh'))}
              {field('test_note_test', t('stg_f_note_test'))}
            </div>
            <label style={lab}>{t('stg_f_obs')}<textarea rows={2} value={f.notes ?? ''} onChange={set('notes')} placeholder={t('stg_f_obs_ph')} style={area} /></label>
            <label style={lab}>{t('stg_f_bio')}<textarea rows={3} value={f.bio ?? ''} onChange={set('bio')} style={area} /></label>
          </div>
        )}
        {err && <div style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '11px 13px', borderRadius: 11, background: '#fbe9e6', border: '1px solid rgba(223,87,64,.3)', color: '#a33a28', fontSize: 13.5 }}><CircleAlert size={16} />{err}</div>}
      </div>
    </Drawer>
  );
}
