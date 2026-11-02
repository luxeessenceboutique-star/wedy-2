import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Check, CircleAlert, Sparkles, TriangleAlert } from 'lucide-react';
import { useLang } from '@/lib/lang';

function Bubble({ tone, children }: { tone?: 'success' | 'error' | 'warning'; children: ReactNode }) {
  return <span className={`wy-toast-bubble${tone ? ` wy-toast-bubble--${tone}` : ''}`}>{children}</span>;
}

/**
 * The app's toast host (sonner, restyled to the handoff: dark card, 28px icon bubble, bottom corner,
 * 2.8s — 5s when the toast carries an "Annuler" action, see lib/notify.ts).
 * Existing `toast.success(...)` calls keep working.
 */
export function WedyToaster() {
  const { dir } = useLang();
  return (
    <Toaster
      position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'}
      dir={dir}
      duration={2800}
      gap={10}
      offset={24}
      visibleToasts={4}
      icons={{
        success: <Bubble tone="success"><Check size={15} strokeWidth={2.4} /></Bubble>,
        error: <Bubble tone="error"><CircleAlert size={15} /></Bubble>,
        warning: <Bubble tone="warning"><TriangleAlert size={15} /></Bubble>,
        info: <Bubble><Sparkles size={15} /></Bubble>,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'wy-toast',
          content: 'wy-toast-content',
          title: 'wy-toast-title',
          description: 'wy-toast-desc',
          actionButton: 'wy-toast-action',
          cancelButton: 'wy-toast-action',
        },
      }}
    />
  );
}
