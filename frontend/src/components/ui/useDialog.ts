import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Open dialogs, topmost last: Escape only closes the one on top (a modal opened from a drawer).
const stack: symbol[] = [];

/**
 * Shared behaviour of Drawer and Modal (mount it only while open): Escape closes, focus moves inside
 * and Tab stays inside, focus returns to the trigger on close, background scroll is locked.
 * Attach the returned ref to the dialog's root element.
 */
export function useDialog(onClose: () => void) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const root = rootRef.current;
    const token = Symbol('dialog');
    stack.push(token);
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const items = () => (root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : []);
    const first = root?.querySelector<HTMLElement>('input:not([type="hidden"]),select,textarea') ?? items()[0];
    first?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) return;
      const head = list[0], tail = list[list.length - 1];
      if (e.shiftKey && document.activeElement === head) { e.preventDefault(); tail.focus(); }
      else if (!e.shiftKey && document.activeElement === tail) { e.preventDefault(); head.focus(); }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  return rootRef;
}
