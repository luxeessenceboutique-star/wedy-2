// Floating "Ask Wedy" launcher on every management page: suggests what the Copilot can do about the page you are on
// (the prompts are real tasks its agents carry out) and sends the request to the Copilot, which starts working at once.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, Sparkles, X, Zap } from 'lucide-react';
import { useLang, type TKey } from '@/lib/lang';
import { copilotUrl } from '@/lib/copilotAsk';
import { useAskPrompts } from '@/lib/askContext';
import './AskWedy.css';

type Group = 'dash' | 'emp' | 'req' | 'leave' | 'rec' | 'int' | 'pay' | 'perf' | 'ana' | 'doc' | 'mtg';

const GROUPS: [RegExp, Group][] = [
  [/^\/app\/employees|^\/app\/orgchart|^\/app\/onboarding/, 'emp'],
  [/^\/app\/requests/, 'req'],
  [/^\/app\/(timeoff|absences|planning-rh|calendrier-rh|creneaux-rh)/, 'leave'],
  [/^\/app\/(recruitment|candidats|entretiens|annonces|tenders)/, 'rec'],
  [/^\/app\/interns/, 'int'],
  [/^\/app\/payroll/, 'pay'],
  [/^\/app\/(performance|training|talents)/, 'perf'],
  [/^\/app\/analytics/, 'ana'],
  [/^\/app\/(generate|templates|history)/, 'doc'],
  [/^\/app\/meetings/, 'mtg'],
];

const PROMPTS: Record<Group, [TKey, TKey, TKey]> = {
  dash: ['ask_p_dash_1', 'ask_p_dash_2', 'ask_p_dash_3'],
  emp: ['ask_p_emp_1', 'ask_p_emp_2', 'ask_p_emp_3'],
  req: ['ask_p_req_1', 'ask_p_req_2', 'ask_p_req_3'],
  leave: ['ask_p_leave_1', 'ask_p_leave_2', 'ask_p_leave_3'],
  rec: ['ask_p_rec_1', 'ask_p_rec_2', 'ask_p_rec_3'],
  int: ['ask_p_int_1', 'ask_p_int_2', 'ask_p_int_3'],
  pay: ['ask_p_pay_1', 'ask_p_pay_2', 'ask_p_pay_3'],
  perf: ['ask_p_perf_1', 'ask_p_perf_2', 'ask_p_perf_3'],
  ana: ['ask_p_ana_1', 'ask_p_ana_2', 'ask_p_ana_3'],
  doc: ['ask_p_doc_1', 'ask_p_doc_2', 'ask_p_doc_3'],
  mtg: ['ask_p_mtg_1', 'ask_p_mtg_2', 'ask_p_mtg_3'],
};

export function AskWedy() {
  const { t } = useLang();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const pagePrompts = useAskPrompts();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  // the Copilot page is the destination itself; the interview room has its own full-screen controls
  const hidden = pathname.startsWith('/app/copilot') || /^\/app\/entretiens\/[^/]+/.test(pathname);
  useEffect(() => {
    if (hidden) return;
    document.body.classList.add('has-askw'); // toasts move up so they never sit under the launcher
    return () => document.body.classList.remove('has-askw');
  }, [hidden]);
  if (hidden) return null;

  const group = GROUPS.find(([re]) => re.test(pathname))?.[1] ?? 'dash';
  const prompts = pagePrompts ?? PROMPTS[group].map(k => t(k));
  const send = (q: string) => { const v = q.trim(); setOpen(false); setText(''); navigate(copilotUrl(v)); };

  return (
    <div className="askw" ref={box}>
      {open && (
        <div className="askw-pop" role="dialog" aria-label={t('ask_wedy_short')}>
          <div className="askw-head">
            <span className="askw-ic"><Sparkles size={16} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="askw-title">{t('ask_pop_title')}</div>
              <div className="askw-sub">{t('ask_pop_sub')}</div>
            </div>
            <button type="button" className="askw-x" onClick={() => setOpen(false)} aria-label={t('close')}><X size={15} /></button>
          </div>
          <div className="askw-list">
            {prompts.map(p => (
              <button key={p} type="button" className="askw-item" onClick={() => send(p)}><Zap size={13} />{p}</button>
            ))}
          </div>
          <form className="askw-form" onSubmit={e => { e.preventDefault(); send(text); }}>
            <input autoFocus value={text} onChange={e => setText(e.target.value)} placeholder={t('ask_pop_ph')} aria-label={t('ask_pop_ph')} />
            <button type="submit" aria-label={t('copilot_send')} disabled={!text.trim()}><ArrowUp size={16} strokeWidth={2.4} /></button>
          </form>
        </div>
      )}
      <button type="button" className={`askw-fab${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={t('ask_wedy_short')} title={t('ask_wedy_short')}>
        <img src="/wedy-avatar.png" alt="" />
        <span className="askw-spark"><Sparkles size={11} /></span>
      </button>
    </div>
  );
}
