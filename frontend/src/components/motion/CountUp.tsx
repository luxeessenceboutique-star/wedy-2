import { createElement, type CSSProperties } from 'react';
import { useCountUp, type CountUpOptions } from './useCountUp';

/** `<CountUp value={126} delay={300} />` — replaces `data-count` from the references. */
export function CountUp({ value, delay, duration, format, prefix, suffix, as = 'span', className, style }: CountUpOptions & {
  value: number | null | undefined; prefix?: string; suffix?: string;
  as?: 'span' | 'div' | 'strong' | 'p'; className?: string; style?: CSSProperties;
}) {
  const { ref, text } = useCountUp(value, { delay, duration, format });
  return createElement(as, { ref, className, style }, `${prefix ?? ''}${text}${suffix ?? ''}`);
}
