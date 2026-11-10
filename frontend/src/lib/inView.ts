// Shared IntersectionObservers for every reveal / count-up (same rules as design/wedy-fx.js):
// threshold .05; an element the user already scrolled past is finished instantly, one that has not
// been reached yet keeps waiting. Several callers may watch the same element (e.g. the bars of one
// timeline row all watch the row).
//
// « 5 % visible » is a share of the element's own area, so a very tall element (a card wrapping 200 table rows is
// 12 000 px high) never reaches it while the screen shows only a few hundred px of it: it stayed invisible forever.
// The test is therefore « 5 % of the element OR 10 % of the screen height », whichever is smaller.

type Handlers = { onEnter: () => void; onPassed: () => void };

const observers = new Map<string, { io: IntersectionObserver; handlers: WeakMap<Element, Set<Handlers>> }>();

/** Observer settings; the default matches wedy-fx.js, the landing reference uses `{ threshold: .12, rootMargin: '0px 0px -6% 0px' }`. */
export type ObserveOptions = { threshold?: number; rootMargin?: string };

// Ratios at which the browser calls back, so a tall element is re-checked as more of it scrolls into view.
const FINE_STEPS = [0, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02];

/** Enough of the element is on screen: `threshold` of its area, or (for tall elements) 10 % of the screen height. */
function seenEnough(e: IntersectionObserverEntry, threshold: number): boolean {
  if (e.intersectionRatio >= threshold - 1e-4) return true;
  const screen = e.rootBounds?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 0);
  return e.intersectionRect.height >= Math.min(threshold * e.boundingClientRect.height, 0.1 * screen);
}

function getObserver({ threshold = 0.05, rootMargin = '0px' }: ObserveOptions = {}) {
  const key = `${threshold}|${rootMargin}`;
  const known = observers.get(key);
  if (known) return known;
  const handlers = new WeakMap<Element, Set<Handlers>>();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting && e.boundingClientRect.bottom >= 0) continue; // below the fold, not reached yet
      if (e.isIntersecting && !seenEnough(e, threshold)) continue; // only the top edge shows so far: keep waiting
      io.unobserve(e.target);
      const set = handlers.get(e.target);
      handlers.delete(e.target);
      set?.forEach(h => (e.isIntersecting ? h.onEnter() : h.onPassed()));
    }
  }, { threshold: [...FINE_STEPS.filter(x => x < threshold), threshold], rootMargin });
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
