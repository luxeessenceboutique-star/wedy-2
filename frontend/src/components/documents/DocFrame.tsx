// A generated document shown as its real page — the same HTML and styles as the PDF (A4, 210 mm wide), scaled down
// to fit the space. The page sits in a sandboxed frame without scripts; « Modifier le texte » makes it editable in place.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

const PAGE_PX = 794; // 210 mm at 96 dpi

export interface DocFrameHandle {
  /** The document's HTML as it is now (with the changes typed in the page). */
  read: () => string | null;
}

export const DocFrame = forwardRef<DocFrameHandle, { html: string; editing: boolean; title: string; dir?: 'rtl' | 'ltr' }>(
  function DocFrame({ html, editing, title }, ref) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(1123);
    const [scale, setScale] = useState(1);
    const [loads, setLoads] = useState(0);

    const measure = useCallback(() => {
      const doc = frameRef.current?.contentDocument;
      if (doc?.documentElement) setHeight(Math.max(1123, doc.documentElement.scrollHeight));
    }, []);

    useImperativeHandle(ref, () => ({
      read: () => {
        const doc = frameRef.current?.contentDocument;
        if (!doc?.body) return null;
        const page = doc.querySelector('.wedy-doc');
        return page ? page.outerHTML : doc.body.innerHTML;
      },
    }), []);

    // fit the page into the space it has
    useEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / PAGE_PX)));
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // editable in place while « Modifier le texte » is on
    useEffect(() => {
      const doc = frameRef.current?.contentDocument;
      if (!doc?.body) return;
      doc.body.contentEditable = editing ? 'true' : 'false';
      doc.body.style.outline = editing ? '2px dashed #9fd6df' : 'none';
      doc.body.style.outlineOffset = '-6px';
      if (editing) doc.body.focus();
      const onInput = () => measure();
      doc.addEventListener('input', onInput);
      return () => doc.removeEventListener('input', onInput);
    }, [editing, loads, measure]);

    return (
      <div ref={wrapRef} style={{ width: '100%', height: height * scale, overflow: 'hidden' }}>
        <iframe
          ref={frameRef} title={title} srcDoc={html} sandbox="allow-same-origin" onLoad={() => { measure(); setLoads(n => n + 1); }}
          style={{ width: PAGE_PX, height, border: 'none', background: '#ffffff', transform: `scale(${scale})`, transformOrigin: 'top left',
            boxShadow: '0 30px 60px -30px rgba(10,28,36,.4), 0 0 0 1px #e2e8eb', borderRadius: 4, display: 'block' }}
        />
      </div>
    );
  },
);
