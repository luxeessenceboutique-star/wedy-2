import type { ComponentProps } from 'react';
import { Reveal } from '@/components/motion';

/**
 * `Reveal` with the login screen's own timing (design/Wedy Login.dc.html): 26px travel, 800ms,
 * delays up to 2s, and a springy 0.85 → 1 scale.
 */
export function LoginReveal({ variant = 'up', ...rest }: ComponentProps<typeof Reveal>) {
  const timing = variant === 'scale'
    ? { duration: 700, scaleFrom: 0.85, easing: 'cubic-bezier(.3,1.4,.5,1)' }
    : { duration: 800 };
  return <Reveal variant={variant} distance={26} maxDelay={2000} {...timing} {...rest} />;
}
