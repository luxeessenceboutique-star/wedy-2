// One shared IntersectionObserver for every reveal / count-up (same rules as design/wedy-fx.js):
// threshold .05; an element the user already scrolled past is finished instantly, one that has not
// been reached yet keeps waiting.

type Handlers = { onEnter: () => void; onPassed: () => void };

const handlers = new WeakMap<Element, Handlers>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting && e.boundingClientRect.bottom >= 0) continue; // below the fold, not reached yet
      io.unobserve(e.target);
      const h = handlers.get(e.target);
      handlers.delete(e.target);
      if (!h) continue;
      if (e.isIntersecting) h.onEnter(); else h.onPassed();
    }
  }, { threshold: 0.05 });
  observer = io;
  return io;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Calls `onEnter` once when the element becomes visible (or `onPassed` if it is already above the viewport). Returns a cleanup. */
export function observeOnce(el: Element, onEnter: () => void, onPassed: () => void = onEnter): () => void {
  if (typeof IntersectionObserver === 'undefined') { onPassed(); return () => {}; }
  const io = getObserver();
  handlers.set(el, { onEnter, onPassed });
  io.observe(el);
  return () => { handlers.delete(el); io.unobserve(el); };
}
