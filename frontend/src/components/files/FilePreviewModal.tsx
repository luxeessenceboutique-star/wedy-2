// The files of a folder shown inside Wedy (PDF, images, text), one after the other (← / → or the arrows), with
// « Ouvrir dans un onglet » and « Télécharger ». The protected upload is fetched with the session token as a Blob.
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CircleAlert, Download, ExternalLink, FileText } from 'lucide-react';
import { downloadEmployeeFile, fetchEmployeeFileBlob, getApiError, isFileMissing } from '@/services/api';
import { Button, Modal, Spinner } from '@/components/ui';
import { useLang } from '@/lib/lang';
import { useNotify } from '@/lib/notify';
import './FilePreviewModal.css';

export type PreviewFile = { id: string; name: string; file_path: string; mime_type?: string; available?: boolean; label?: string };

export function FilePreviewModal({ files, openId, onClose }: { files: PreviewFile[]; openId: string | null; onClose: () => void }) {
  return openId && files.length ? <Viewer key={openId} files={files} openId={openId} onClose={onClose} /> : null;
}

/** A Blob shown in an <iframe> / <img>: the object URL is created and revoked with the element (no state, no leak). */
function BlobView({ blob, kind, title }: { blob: Blob; kind: 'pdf' | 'image' | 'text'; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (kind === 'image' && img.current) img.current.src = url;
    if (kind !== 'image' && frame.current) frame.current.src = kind === 'pdf' ? `${url}#view=FitH` : url;
    return () => URL.revokeObjectURL(url);
  }, [blob, kind]);
  return kind === 'image' ? <img ref={img} alt={title} className="fpv-img" /> : <iframe ref={frame} title={title} className="fpv-frame" />;
}

function Viewer({ files, openId, onClose }: { files: PreviewFile[]; openId: string; onClose: () => void }) {
  const { t, lang } = useLang();
  const notify = useNotify();
  const [idx, setIdx] = useState(() => Math.max(0, files.findIndex(f => f.id === openId)));
  const f = files[Math.min(idx, files.length - 1)];
  const lost = f.available === false;
  const q = useQuery({
    queryKey: ['file-blob', f.file_path],
    queryFn: () => fetchEmployeeFileBlob(f.file_path, f.name, f.mime_type),
    enabled: !lost, retry: false, staleTime: 5 * 60_000, gcTime: 5 * 60_000,
  });
  const type = q.data?.type ?? '';
  const kind = type === 'application/pdf' ? 'pdf' : type.startsWith('image/') ? 'image' : type.startsWith('text/') ? 'text' : null;
  // phones without a built-in PDF viewer cannot show it in a frame: they get the « open » button instead
  const pdfInline = typeof navigator === 'undefined' || (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled !== false;
  const many = files.length > 1;

  useEffect(() => {
    if (!many) return;
    const rtl = lang === 'ar';
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') setIdx(i => (i + (rtl ? -1 : 1) + files.length) % files.length);
      if (e.key === 'ArrowLeft') setIdx(i => (i + (rtl ? 1 : -1) + files.length) % files.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [many, files.length, lang]);

  const go = (d: number) => setIdx(i => (i + d + files.length) % files.length);
  const openTab = () => {
    if (!q.data) return;
    const url = URL.createObjectURL(q.data);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  };
  const download = () => downloadEmployeeFile(f.file_path, f.name).catch(e => notify.error(isFileMissing(e) ? t('emf_file_missing') : getApiError(e, t('error'))));

  const errorText = q.isError ? (isFileMissing(q.error) ? t('emf_file_missing') : getApiError(q.error, t('error'))) : '';
  return (
    <Modal
      open onClose={onClose} width={1080} icon={<FileText size={18} />} title={f.name}
      subtitle={[f.label, many ? `${idx + 1} / ${files.length}` : ''].filter(Boolean).join(' · ')}
      footer={(
        <div className="fpv-foot">
          {many && (
            <div className="fpv-nav">
              <Button variant="secondary" size="sm" icon={<ChevronLeft size={15} className="wy-flip" />} onClick={() => go(-1)}>{t('fpv_prev')}</Button>
              <Button variant="secondary" size="sm" onClick={() => go(1)}>{t('fpv_next')}<ChevronRight size={15} className="wy-flip" /></Button>
            </div>
          )}
          <Button variant="secondary" size="sm" icon={<ExternalLink size={14} />} disabled={!q.data} onClick={openTab}>{t('fpv_open_tab')}</Button>
          <Button size="sm" icon={<Download size={14} />} disabled={lost} onClick={download}>{t('emf_telecharger')}</Button>
        </div>
      )}
    >
      <div className="fpv-stage">
        {lost || q.isError ? (
          <div className="fpv-msg err"><CircleAlert size={22} /><b>{lost ? t('emf_file_missing') : errorText}</b>{lost && <small>{t('fpv_lost_hint')}</small>}</div>
        ) : q.isLoading || !q.data ? (
          <div className="fpv-msg"><Spinner /><small>{t('fpv_loading')}</small></div>
        ) : kind && (kind !== 'pdf' || pdfInline) ? (
          <BlobView blob={q.data} kind={kind} title={f.name} />
        ) : (
          <div className="fpv-msg"><FileText size={26} /><b>{t(kind === 'pdf' ? 'fpv_no_pdf' : 'fpv_no_preview')}</b><small>{t('fpv_no_preview_s')}</small>
            <div className="fpv-msg-btns">
              <Button size="sm" variant="secondary" icon={<ExternalLink size={14} />} onClick={openTab}>{t('fpv_open_tab')}</Button>
              <Button size="sm" icon={<Download size={14} />} onClick={download}>{t('emf_telecharger')}</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
