import { useEffect, useRef } from 'react';
import { observeOnce, prefersReducedMotion } from '@/lib/inView';

export type RevealVariant = 'up' | 'down' | 'fade' | 'left' | 'right' | 'scale' | 'pill' | 'growx' | 'growy' | 'draw' | 'word';

export interface RevealOptions {
  /** ms, capped at 900 like wedy-fx.js */
  delay?: number;
  /** ms, overrides the variant's default */
  duration?: number;
  /** `draw` only: filled fraction of the stroke (0..1) */
  frac?: number;
  disabled?: boolean;
  /** px travelled by up / down / left / right (defaults: 14 for up and down, 36 for left and right) */
  distance?: number;
  /** CSS easing, default `EASE` */
  easing?: string;
  /** `scale` only: starting scale (default .94) */
  scaleFrom?: number;
  /** cap for `delay` in ms (default 900, like wedy-fx.js; the login page staggers up to 1.4s) */
  maxDelay?: number;
}

export const EASE = 'cubic-bezier(.2,.8,.2,1)';

const DURATION: Record<RevealVariant, number> = {
  up: 620, down: 620, fade: 620, left: 620, right: 620, scale: 620, pill: 300, growx: 1000, growy: 1000, draw: 1300, word: 620,
};

// The individual `translate` / `scale` properties are used (not `transform`) so a hover
// `transform: translateY(-3px)` on the same element keeps working while it reveals.
function keyframes(el: Element, variant: RevealVariant, o: RevealOptions, rtl: boolean): Keyframe[] | null {
  const dx = rtl ? -1 : 1;
  switch (variant) {
    case 'fade': return [{ opacity: 0 }, { opacity: 1 }];
    case 'down': return [{ opacity: 0, translate: `0 ${-(o.distance ?? 14)}px` }, { opacity: 1, translate: '0 0' }];
    case 'left': return [{ opacity: 0, translate: `${(o.distance ?? 36) * dx}px 0` }, { opacity: 1, translate: '0 0' }];
    case 'right': return [{ opacity: 0, translate: `${-(o.distance ?? 36) * dx}px 0` }, { opacity: 1, translate: '0 0' }];
    case 'scale': return [{ opacity: 0, scale: String(o.scaleFrom ?? 0.94) }, { opacity: 1, scale: '1' }];
    case 'pill': return [{ opacity: 0, scale: '0.9' }, { opacity: 1, scale: '1' }];
    case 'growx': return [{ scale: '0 1' }, { scale: '1 1' }];
    case 'growy': return [{ scale: '1 0' }, { scale: '1 1' }];
    case 'word': return [{ opacity: 0, filter: 'blur(10px)', translate: '0 40%' }, { opacity: 1, filter: 'blur(0px)', translate: '0 0' }];
    case 'draw': {
      const frac = o.frac ?? 1;
      let len = 0;
      try { len = (el as SVGGeometryElement).getTotalLength(); } catch { /* not a geometry element */ }
      if (!len) return null;
      (el as SVGElement).style.strokeDasharray = `${(len * frac).toFixed(2)}px ${len.toFixed(2)}px`;
      return [{ strokeDashoffset: `${(len * frac).toFixed(2)}px` }, { strokeDashoffset: '0px' }];
    }
    default: return [{ opacity: 0, translate: `0 ${o.distance ?? 14}px` }, { opacity: 1, translate: '0 0' }];
  }
}

/**
 * Plays an enter animation once, when the element scrolls into view (spec: wedy-fx.js `data-reveal`).
 * Attach the returned ref to the element. Does nothing under `prefers-reduced-motion`.
 */
export function useReveal<T extends Element = HTMLElement>(variant: RevealVariant = 'up', opts: RevealOptions = {}) {
  const ref = useRef<T>(null);
  const { delay = 0, duration, frac = 1, disabled = false, distance, easing = EASE, scaleFrom, maxDelay = 900 } = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled || prefersReducedMotion()) return;
    const rtl = document.documentElement.dir === 'rtl';
    const frames = keyframes(el, variant, { frac, distance, scaleFrom }, rtl);
    if (!frames) return;

    let anim: Animation;
    try {
      anim = el.animate(frames, { duration: duration ?? DURATION[variant], delay: Math.min(delay, maxDelay), easing, fill: 'both' });
    } catch { return; }
    anim.pause();
    anim.onfinish = () => { try { anim.cancel(); } catch { /* already cancelled */ } };

    const stop = observeOnce(el, () => anim.play(), () => anim.finish());
    return () => { stop(); try { anim.cancel(); } catch { /* already cancelled */ } };
  }, [variant, delay, duration, frac, disabled, distance, easing, scaleFrom, maxDelay]);

  return ref;
}

/** Stagger helper for lists: 40–60ms per item, never beyond the 900ms cap. */
export const stagger = (index: number, step = 50, base = 0) => Math.min(base + index * step, 900);
