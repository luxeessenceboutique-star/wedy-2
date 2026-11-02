import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useReveal } from '@/components/motion';
import { useLang } from '@/lib/lang';
import { useDialog } from './useDialog';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** icon inside the 40px gradient tile of the header */
  icon?: ReactNode;
  /** px, capped at 100vw - 32px (reference: 440) */
  width?: number;
  /** right-aligned buttons under the content */
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal(props: ModalProps) {
  return props.open ? <ModalPanel {...props} /> : null;
}

function ModalPanel({ onClose, title, subtitle, icon, width = 540, footer, children }: ModalProps) {
  const { t } = useLang();
  const rootRef = useDialog(onClose);
  const panelRef = useReveal<HTMLDivElement>('scale');

  return createPortal(
    <div ref={rootRef} className="wy-dialog-root">
      <div className="wy-overlay" onClick={onClose} aria-hidden="true" />
      <div className="wy-modal-wrap">
        <div ref={panelRef} className="wy-modal" role="dialog" aria-modal="true" aria-label={title} style={{ ['--modal-w' as string]: `${width}px` } as CSSProperties}>
          <div className="wy-sheet-head">
            {icon && <span className="wy-sheet-icon">{icon}</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="wy-sheet-title">{title}</div>
              {subtitle && <div className="wy-sheet-sub">{subtitle}</div>}
            </div>
            <button type="button" className="wy-sheet-close" onClick={onClose} aria-label={t('close')}><X size={16} /></button>
          </div>
          {children}
          {footer && <div className="wy-modal-foot">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
