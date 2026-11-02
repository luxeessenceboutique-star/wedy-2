import { createElement, type HTMLAttributes, type ReactNode } from 'react';
import { useReveal, type RevealVariant } from './useReveal';

type RevealProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  as?: 'div' | 'span' | 'section' | 'article' | 'li' | 'p' | 'form' | 'header' | 'h1' | 'h2' | 'h3' | 'button' | 'a' | 'ul' | 'aside' | 'label' | 'main';
  variant?: RevealVariant;
  /** ms (capped at `maxDelay`, 900 by default) */
  delay?: number;
  duration?: number;
  distance?: number;
  easing?: string;
  scaleFrom?: number;
  maxDelay?: number;
  children?: ReactNode;
};

/** `<Reveal variant="up" delay={60}>` — replaces `data-reveal="up" data-delay="60"` from the references. */
export function Reveal({ as = 'div', variant = 'up', delay, duration, distance, easing, scaleFrom, maxDelay, ...rest }: RevealProps) {
  const ref = useReveal<HTMLElement>(variant, { delay, duration, distance, easing, scaleFrom, maxDelay });
  return createElement(as, { ref, ...rest });
}
