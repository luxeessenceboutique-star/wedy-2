// Shared IntersectionObservers for every reveal / count-up (same rules as design/wedy-fx.js):
// threshold .05; an element the user already scrolled past is finished instantly, one that has not
// been reached yet keeps waiting. Several callers may watch the same element (e.g. the bars of one
// timeline row all watch the row).

type Handlers = { onEnter: () => void; onPassed: () => void };

const observers = new Map<string, { io: IntersectionObserver; handlers: WeakMap<Element, Set<Handlers>> }>();

/** Observer settings; the default matches wedy-fx.js, the landing reference uses `{ threshold: .12, rootMargin: '0px 0px -6% 0px' }`. */
export type ObserveOptions = { threshold?: number; rootMargin?: string };

function getObserver({ threshold = 0.05, rootMargin = '0px' }: ObserveOptions = {}) {
  const key = `${threshold}|${rootMargin}`;
  const known = observers.get(key);
  if (known) return known;
  const handlers = new WeakMap<Element, Set<Handlers>>();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting && e.boundingClientRect.bottom >= 0) continue; // below the fold, not reached yet
      io.unobserve(e.target);
      const set = handlers.get(e.target);
      handlers.delete(e.target);
      set?.forEach(h => (e.isIntersecting ? h.onEnter() : h.onPassed()));
    }
  }, { threshold, rootMargin });
  const entry = { io, handlers };
  observers.set(key, entry);
  return entry;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Calls `onEnter` once when the element becomes visible (or `onPassed` if it is already above the viewport). Returns a cleanup. */
export function observeOnce(el: Element, onEnter: () => void, onPassed: () => void = onEnter, opts?: ObserveOptions): () => void {
  if (typeof IntersectionObserver === 'undefined') { onPassed(); return () => {}; }
  const { io, handlers } = getObserver(opts);
  const h: Handlers = { onEnter, onPassed };
  let set = handlers.get(el);
  if (!set) { set = new Set(); handlers.set(el, set); io.observe(el); }
  set.add(h);
  return () => {
    const s = handlers.get(el);
    if (!s) return;
    s.delete(h);
    if (!s.size) { handlers.delete(el); io.unobserve(el); }
  };
}
