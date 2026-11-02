import { useEffect, useRef, useState } from 'react';
import { observeOnce, prefersReducedMotion } from '@/lib/inView';

const fmtFr = (n: number) => Math.round(n).toLocaleString('fr-FR');

export interface CountUpOptions {
  /** ms before the first count starts */
  delay?: number;
  /** ms of the first count (default 1400, easeOutExpo like wedy-fx.js) */
  duration?: number;
  format?: (n: number) => string;
}

/**
 * Counts from 0 to `value` once the element is visible. When `value` changes afterwards
 * (live data refetched) it tweens from what is on screen to the new value.
 * Attach `ref` to the element showing `text`. Under `prefers-reduced-motion` the final value is shown at once.
 */
export function useCountUp<T extends HTMLElement = HTMLElement>(value: number | null | undefined, opts: CountUpOptions = {}) {
  const { delay = 0, duration = 1400, format = fmtFr } = opts;
  const ref = useRef<T>(null);
  const [reduced] = useState(prefersReducedMotion);
  const [display, setDisplay] = useState(0);
  const [visible, setVisible] = useState(false);
  const shown = useRef(0);
  const hasRun = useRef(false);
  const target = value ?? 0;

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el) return;
    return observeOnce(el, () => setVisible(true));
  }, [reduced]);

  useEffect(() => {
    if (reduced || !visible) return;
    const from = shown.current;
    const dur = hasRun.current ? 600 : duration;
    const t0 = performance.now() + (hasRun.current ? 0 : delay);
    hasRun.current = true;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - t0) / dur));
      const v = t >= 1 ? target : from + (target - from) * (1 - Math.pow(2, -10 * t));
      shown.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, visible, target, delay, duration]);

  return { ref, text: format(reduced ? target : display) };
}
