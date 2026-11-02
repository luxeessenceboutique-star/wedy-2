import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useReveal } from '@/components/motion';
import { useLang } from '@/lib/lang';
import { useDialog } from './useDialog';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** icon inside the 40px gradient tile of the header */
  icon?: ReactNode;
  /** px, capped at 100vw (reference: 520–560) */
  width?: number;
  /** sticky footer (right-aligned buttons) */
  footer?: ReactNode;
  /** turns the panel into a `<form noValidate>` */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

export function Drawer(props: DrawerProps) {
  return props.open ? <DrawerPanel {...props} /> : null;
}

function DrawerPanel({ onClose, title, subtitle, icon, width = 540, footer, onSubmit, children }: DrawerProps) {
  const { t } = useLang();
  const rootRef = useDialog(onClose);
  const panelRef = useReveal<HTMLDivElement>('left');

  const content = (
    <>
      <div className="wy-sheet-head">
        {icon && <span className="wy-sheet-icon">{icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wy-sheet-title">{title}</div>
          {subtitle && <div className="wy-sheet-sub">{subtitle}</div>}
        </div>
        <button type="button" className="wy-sheet-close" onClick={onClose} aria-label={t('close')}><X size={17} /></button>
      </div>
      <div className="wy-sheet-body">{children}</div>
      {footer && <div className="wy-sheet-foot">{footer}</div>}
    </>
  );

  return createPortal(
    <div ref={rootRef} className="wy-dialog-root">
      <div className="wy-overlay" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className="wy-drawer" role="dialog" aria-modal="true" aria-label={title} style={{ ['--drawer-w' as string]: `${width}px` } as CSSProperties}>
        {onSubmit ? <form className="wy-drawer-form" onSubmit={onSubmit} noValidate>{content}</form> : content}
      </div>
    </div>,
    document.body,
  );
}
