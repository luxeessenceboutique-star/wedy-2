import { toast } from 'sonner';
import { useLang } from '@/lib/lang';

export interface NotifyOptions {
  description?: string;
  /** shows an "Annuler" action (5s instead of 2.8s) */
  undo?: () => void;
  duration?: number;
  id?: string | number;
}

/**
 * Toast helper with the undo pattern from the handoff:
 *   const notify = useNotify();
 *   notify.success(`${name} supprimé`, { undo: () => restore(id) });
 */
export function useNotify() {
  const { t } = useLang();
  const build = (o?: NotifyOptions) => ({
    id: o?.id,
    description: o?.description,
    duration: o?.duration ?? (o?.undo ? 5000 : undefined),
    action: o?.undo ? { label: t('undo'), onClick: o.undo } : undefined,
  });
  return {
    success: (message: string, o?: NotifyOptions) => toast.success(message, build(o)),
    error: (message: string, o?: NotifyOptions) => toast.error(message, build(o)),
    info: (message: string, o?: NotifyOptions) => toast.info(message, build(o)),
    warning: (message: string, o?: NotifyOptions) => toast.warning(message, build(o)),
  };
}
