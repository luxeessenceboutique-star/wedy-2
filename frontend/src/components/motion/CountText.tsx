import { createElement } from 'react';
import { useCountUp } from './useCountUp';

/**
 * `data-count`: counts the first number found in `text` up from 0 (keeps what comes before and after it,
 * fr-FR thousands separator) once the element is visible.
 */
export function CountText({ as = 'span', text, delay, ...rest }: { as?: string; text: string | number; delay?: number } & Record<string, unknown>) {
  const s = String(text ?? '');
  const m = /\d[\d\s]*/.exec(s);
  const target = m ? Number(m[0].replace(/\s/g, '')) : null;
  const pre = m ? s.slice(0, m.index) : s;
  const post = m ? s.slice(m.index + m[0].length) : '';
  const { ref, text: shown } = useCountUp<HTMLElement>(target, { delay, format: n => pre + Math.round(n).toLocaleString('fr-FR') + post });
  return createElement(as, { ref, ...rest }, m ? shown : s);
}
