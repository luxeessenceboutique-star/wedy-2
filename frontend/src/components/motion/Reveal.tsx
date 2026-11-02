import { createElement, type HTMLAttributes, type ReactNode } from 'react';
import { useReveal, type RevealVariant } from './useReveal';

type RevealProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  as?: 'div' | 'span' | 'section' | 'article' | 'li' | 'p' | 'form' | 'header' | 'h1' | 'h2' | 'h3' | 'button' | 'a' | 'ul' | 'aside';
  variant?: RevealVariant;
  /** ms (capped at 900) */
  delay?: number;
  duration?: number;
  children?: ReactNode;
};

/** `<Reveal variant="up" delay={60}>` — replaces `data-reveal="up" data-delay="60"` from the references. */
export function Reveal({ as = 'div', variant = 'up', delay, duration, ...rest }: RevealProps) {
  const ref = useReveal<HTMLElement>(variant, { delay, duration });
  return createElement(as, { ref, ...rest });
}
