// One shared IntersectionObserver for every reveal / count-up (same rules as design/wedy-fx.js):
// threshold .05; an element the user already scrolled past is finished instantly, one that has not
// been reached yet keeps waiting.

type Handlers = { onEnter: () => void; onPassed: () => void };

const handlers = new WeakMap<Element, Handlers>();
const observers = new Map<string, IntersectionObserver>();

/** Observer settings; the default matches wedy-fx.js, the landing reference uses `{ threshold: .12, rootMargin: '0px 0px -6% 0px' }`. */
export type ObserveOptions = { threshold?: number; rootMargin?: string };

function getObserver({ threshold = 0.05, rootMargin = '0px' }: ObserveOptions = {}): IntersectionObserver {
  const key = `${threshold}|${rootMargin}`;
  const known = observers.get(key);
  if (known) return known;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting && e.boundingClientRect.bottom >= 0) continue; // below the fold, not reached yet
      io.unobserve(e.target);
      const h = handlers.get(e.target);
      handlers.delete(e.target);
      if (!h) continue;
      if (e.isIntersecting) h.onEnter(); else h.onPassed();
    }
  }, { threshold, rootMargin });
  observers.set(key, io);
  return io;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Calls `onEnter` once when the element becomes visible (or `onPassed` if it is already above the viewport). Returns a cleanup. */
export function observeOnce(el: Element, onEnter: () => void, onPassed: () => void = onEnter, opts?: ObserveOptions): () => void {
  if (typeof IntersectionObserver === 'undefined') { onPassed(); return () => {}; }
  const io = getObserver(opts);
  handlers.set(el, { onEnter, onPassed });
  io.observe(el);
  return () => { handlers.delete(el); io.unobserve(el); };
}
