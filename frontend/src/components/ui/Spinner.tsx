import { Loader2 } from 'lucide-react';

export function Spinner({ size = 20, color = 'var(--primary)' }: { size?: number; color?: string }) {
  return <Loader2 size={size} className="wedy-spin" style={{ color }} aria-hidden="true" />;
}
