import { createElement, type ElementType } from 'react';
import { useReveal, type RevealVariant } from './useReveal';

/**
 * `Reveal` for generated views: any tag (including svg shapes) or component (e.g. router `Link`).
 * Mirrors `data-reveal` / `data-delay` / `data-dur` / `data-frac` from the references.
 */
export function RV({ as = 'div', variant = 'up', delay, duration, frac, ...rest }: {
  as?: ElementType;
  variant?: RevealVariant; delay?: number; duration?: number; frac?: number;
} & Record<string, unknown>) {
  const ref = useReveal<Element>(variant, { delay, duration, frac });
  return createElement(as as string, { ref, ...rest });
}
