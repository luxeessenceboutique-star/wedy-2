import { useEffect, useRef, useState } from 'react';
import { RevealTuningContext, type RevealTuning } from '@/components/motion';
import { useLang, type TKey } from '@/lib/lang';
import { LandingView } from './LandingView';
import { reducedMotion, startLandingEngine } from './landingEngine';
import './landing.css';

/** Same prompts as the user bubbles in the chat demo: typed into the input, then "sent". */
const PROMPT_KEYS: TKey[] = ['lnd_draft_a_work_certificate_for', 'lnd_what_s_the_legal_notice_period', 'lnd_which_departments_had_the_most'];
const HOLD = 5200;
// The reference's reveals travel 30px over 900ms (draw 1.8s, grow 1.1s, pop 650ms) and start once 12% is in view.
const TUNING: RevealTuning = { threshold: 0.12, rootMargin: '0px 0px -6% 0px', distance: 30, durations: { up: 900, down: 900, left: 900, right: 900, fade: 900, scale: 900, word: 900, blur: 900, growx: 1100, growy: 1100, draw: 1800 } };

export type LandingVals = {
  s0: boolean; s1: boolean; s2: boolean;
  u0: boolean; u1: boolean; u2: boolean;
  a0: boolean; a1: boolean; a2: boolean;
  typing: boolean;
  showPh: boolean;
  pick0: () => void; pick1: () => void; pick2: () => void;
};

type Chat = { scen: number; phase: 0 | 1 | 2; run: number; total: number };
type Runner = { pick: (i: number) => void };

export default function LandingPage() {
  const { t } = useLang();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLSpanElement>(null);
  const inputBoxRef = useRef<HTMLDivElement>(null);
  const promptsRef = useRef<string[]>([]);
  const runnerRef = useRef<Runner | null>(null);
  const [chat, setChat] = useState<Chat>({ scen: 0, phase: 2, run: 0, total: 0 });
  // A click on a scenario is handed to the runner (which lives in the effect) through state.
  const [picked, setPicked] = useState<{ i: number; n: number } | null>(null);

  useEffect(() => { promptsRef.current = PROMPT_KEYS.map(k => t(k)); }, [t]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const motion = !reducedMotion();
    let tok = 0;
    let timers: number[] = [];
    let alive = true;
    let run = 0;

    const setInput = (text: string) => {
      const n = inputRef.current;
      if (n) n.textContent = text;
      const b = inputBoxRef.current;
      if (b) b.scrollLeft = text ? b.scrollWidth : 0;
    };
    const stopChat = () => { tok++; timers.forEach(clearTimeout); timers = []; };
    const runScenario = (i: number) => {
      if (!alive) return;
      stopChat();
      const mine = tok;
      const later = (ms: number, fn: () => void) => { timers.push(window.setTimeout(() => { if (alive && mine === tok) fn(); }, ms)); };
      if (!motion) { setChat(c => ({ ...c, scen: i, phase: 2 })); return; }
      const text = promptsRef.current[i] ?? '';
      const chars = Array.from(text);
      const delays = chars.map(() => 14 + Math.random() * 26);
      const total = 600 + delays.reduce((a, b) => a + b, 0) + 450 + 1400 + HOLD;
      run++;
      setInput('');
      setChat({ scen: i, phase: 0, run, total });
      let k = 0;
      const send = () => {
        setInput('');
        setChat(c => ({ ...c, phase: 1 }));
        later(1400, () => setChat(c => ({ ...c, phase: 2 })));
        later(1400 + HOLD, () => runScenario((i + 1) % PROMPT_KEYS.length));
      };
      const type = () => {
        k++;
        setInput(chars.slice(0, k).join(''));
        if (k < chars.length) later(delays[k], type); else later(450, send);
      };
      later(600, type);
    };

    let chatIn = false;
    const stopEngine = startLandingEngine(root, {
      onChatVisible: visible => {
        if (visible && !chatIn) { chatIn = true; runScenario(0); }
        else if (!visible && chatIn) { chatIn = false; stopChat(); setInput(''); setChat(c => (c.phase === 2 ? c : { ...c, phase: 2 })); }
      },
    });
    runnerRef.current = { pick: i => { chatIn = true; runScenario(i); } };

    return () => {
      alive = false;
      stopChat();
      stopEngine();
      runnerRef.current = null;
    };
  }, []);

  useEffect(() => { if (picked) runnerRef.current?.pick(picked.i); }, [picked]);

  // The progress bar under the active scenario fills over the whole scenario.
  useEffect(() => {
    if (!chat.run) return;
    const bar = rootRef.current?.querySelector<HTMLElement>('[data-scen-bar]');
    if (!bar) return;
    let a: Animation | null = null;
    try { a = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: chat.total, easing: 'linear', fill: 'forwards' }); } catch { /* unsupported */ }
    return () => { try { a?.cancel(); } catch { /* gone */ } };
  }, [chat.run, chat.total]);

  const { scen, phase } = chat;
  const pick = (i: number) => () => setPicked(p => ({ i, n: (p?.n ?? 0) + 1 }));
  const v: LandingVals = {
    s0: scen === 0, s1: scen === 1, s2: scen === 2,
    u0: scen === 0 && phase >= 1, u1: scen === 1 && phase >= 1, u2: scen === 2 && phase >= 1,
    a0: scen === 0 && phase >= 2, a1: scen === 1 && phase >= 2, a2: scen === 2 && phase >= 2,
    typing: phase === 1,
    showPh: phase !== 0,
    pick0: pick(0), pick1: pick(1), pick2: pick(2),
  };
  return (
    <RevealTuningContext.Provider value={TUNING}>
      <div className="lnd-root">
        <LandingView v={v} rootRef={rootRef} inputRef={inputRef} inputBoxRef={inputBoxRef} />
      </div>
    </RevealTuningContext.Provider>
  );
}
