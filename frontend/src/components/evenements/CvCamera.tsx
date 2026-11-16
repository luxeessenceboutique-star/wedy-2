// Événements › « Scanner avec la caméra »: the phone (or laptop) camera photographs each page of a paper CV; the pages
// become one PDF, sent straight to the scan queue of the event, and the camera stays open for the next CV.
// Uses the rear camera when there is one; falls back to the phone's own camera app when the browser cannot open it.
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CircleAlert, Flashlight, FlashlightOff, ImagePlus, RotateCcw, Send, SwitchCamera, Wand2, X } from 'lucide-react';
import { useDialog } from '@/components/ui/useDialog';
import { Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { tf } from '@/lib/format';
import { imagesToPdf, type JpegPage } from '@/lib/imagesToPdf';
import './CvCamera.css';

const MAX_SIDE = 2200;        // pixels on the long side of a page: sharp for reading, light to send
const MAX_PAGES = 8;
const MAX_BYTES = 15 * 1024 * 1024;

type CamState = 'starting' | 'live' | 'denied' | 'insecure' | 'nocam' | 'busy' | 'other';
type Page = JpegPage & { key: string; url: string };

const ERR_KEY: Record<Exclude<CamState, 'starting' | 'live'>, TKey> = {
  denied: 'evt_cam_err_denied', insecure: 'evt_cam_err_insecure', nocam: 'evt_cam_err_nocam', busy: 'evt_cam_err_busy', other: 'evt_cam_err_other',
};

function initialState(): CamState {
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'insecure';
  return typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'starting' : 'other';
}

/** Stretches the light range of a washed-out photo (fair halls, neon light) so the text stands out; colours are kept. */
function autoLevels(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < d.length; i += 16) { hist[(d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8]++; n++; }
  let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < n * 0.01) lo++;
  acc = 0;
  while (hi > 0 && (acc += hist[hi]) < n * 0.01) hi--;
  if (hi - lo < 40 || (lo <= 6 && hi >= 249)) return;   // flat image, or already using the full range
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = ((v - lo) * 255) / (hi - lo);
  for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
  ctx.putImageData(img, 0, 0);
}

type Area = { x: number; y: number; w: number; h: number };

/** The part of the camera frame inside the on-screen frame (plus a margin), in the video's own pixels. The preview is
 *  shown « contain », so the frame is mapped through the letterboxing. Whole picture when it cannot be worked out. */
function guideArea(video: HTMLVideoElement, guide: HTMLElement | null): Area {
  const vw = video.videoWidth, vh = video.videoHeight;
  const whole = { x: 0, y: 0, w: vw, h: vh };
  if (!guide) return whole;
  const v = video.getBoundingClientRect(), g = guide.getBoundingClientRect();
  const k = Math.min(v.width / vw, v.height / vh);
  if (!k || !g.width) return whole;
  const left = v.left + (v.width - vw * k) / 2, top = v.top + (v.height - vh * k) / 2;
  const mx = g.width * 0.08, my = g.height * 0.06;
  const x = Math.max(0, (g.left - mx - left) / k), y = Math.max(0, (g.top - my - top) / k);
  const w = Math.min(vw - x, (g.width + 2 * mx) / k), h = Math.min(vh - y, (g.height + 2 * my) / k);
  return w > 40 && h > 40 ? { x, y, w, h } : whole;
}

/** One page: the area of the picture drawn at most MAX_SIDE px, optionally evened out, as JPEG. */
async function toPage(src: CanvasImageSource, a: Area, enhance: boolean): Promise<Page> {
  const k = Math.min(1, MAX_SIDE / Math.max(a.w, a.h));
  const width = Math.max(1, Math.round(a.w * k)), height = Math.max(1, Math.round(a.h * k));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: enhance });
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(src, a.x, a.y, a.w, a.h, 0, 0, width, height);
  if (enhance) autoLevels(ctx, width, height);
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.86));
  if (!blob) throw new Error('jpeg');
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: URL.createObjectURL(blob), bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
}

export interface CvCameraProps {
  eventName: string;
  /** the scan queue of the page, shown in the top bar */
  progress: { done: number; total: number };
  onSend: (file: File) => void;
  onClose: () => void;
}

/** Mount it only while open. */
export function CvCamera({ eventName, progress, onSend, onClose }: CvCameraProps) {
  const { t } = useLang();
  const [pages, setPages] = useState<Page[]>([]);
  const [state, setState] = useState<CamState>(initialState);
  const [devices, setDevices] = useState<string[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [torch, setTorch] = useState<{ ok: boolean; on: boolean }>({ ok: false, on: false });
  const [enhance, setEnhance] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(0);
  const [sent, setSent] = useState(0);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const nativeInput = useRef<HTMLInputElement>(null);
  const pagesRef = useRef<Page[]>([]);
  useEffect(() => { pagesRef.current = pages; }, [pages]);

  const close = () => {
    if (pagesRef.current.length && !window.confirm(tf(t('evt_cam_close_confirm'), { n: pagesRef.current.length }))) return;
    onClose();
  };
  const rootRef = useDialog(close);
  // focus on the shutter, or on the way out of an error (the phone's camera app)
  useEffect(() => {
    const target = state === 'live' ? shutterRef.current : rootRef.current?.querySelector<HTMLButtonElement>('.cam-msg button');
    target?.focus({ preventScroll: true });
  }, [state, rootRef]);

  // ── the camera: opened on mount and whenever another camera is chosen; always stopped on the way out ──
  useEffect(() => {
    if (initialState() !== 'starting') return;
    let alive = true;
    const quality = { width: { ideal: 2560 }, height: { ideal: 1440 } };
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: deviceId ? { deviceId: { exact: deviceId }, ...quality } : { facingMode: { ideal: 'environment' }, ...quality },
        });
        if (!alive) { stream.getTracks().forEach(tr => tr.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) { video.srcObject = stream; await video.play().catch(() => undefined); }
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] };
        if (caps.focusMode?.includes('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => undefined);
        }
        const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput' && d.deviceId).map(d => d.deviceId);
        if (!alive) return;
        setTorch({ ok: !!caps.torch, on: false });
        setDevices(cams);
        setState('live');
      } catch (e) {
        if (!alive) return;
        const name = (e as DOMException)?.name;
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
          : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocam'
          : name === 'NotReadableError' || name === 'AbortError' ? 'busy' : 'other');
      }
    })();
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach(tr => tr.stop());
      streamRef.current = null;
    };
  }, [deviceId, attempt]);

  // thumbnails are object URLs: freed when the camera closes
  useEffect(() => () => { pagesRef.current.forEach(p => URL.revokeObjectURL(p.url)); }, []);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(id);
  }, [notice]);

  // the space bar takes the page wherever the focus is (except on a button, which the space bar presses)
  const captureRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== ' ' || el?.closest('button, input, select, textarea, a')) return;
      e.preventDefault();
      captureRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const addPage = (p: Page) => setPages(list => [...list, p]);
  const full = pages.length >= MAX_PAGES;

  const capture = async () => {
    const video = videoRef.current;
    if (busy || full || state !== 'live' || !video || !video.videoWidth) return;
    setBusy(true);
    setFlash(f => f + 1);
    try { addPage(await toPage(video, guideArea(video, guideRef.current), enhance)); }
    catch { setNotice({ ok: false, text: t('evt_cam_err_other') }); }
    finally { setBusy(false); }
  };
  useEffect(() => { captureRef.current = () => void capture(); });

  // the phone's own camera app (or a photo already taken): same treatment as a frame of the live camera
  const fromNative = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PAGES - pages.length);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      for (const file of files) {
        const bmp = await createImageBitmap(file);
        try { addPage(await toPage(bmp, { x: 0, y: 0, w: bmp.width, h: bmp.height }, enhance)); } finally { bmp.close(); }
      }
    } catch { setNotice({ ok: false, text: t('evt_cam_bad_photo') }); }
    finally { setBusy(false); }
  };

  const removePage = (key: string) => setPages(list => {
    const p = list.find(x => x.key === key);
    if (p) URL.revokeObjectURL(p.url);
    return list.filter(x => x.key !== key);
  });

  const send = () => {
    if (!pages.length) return;
    const pdf = imagesToPdf(pages);
    if (pdf.size > MAX_BYTES) { setNotice({ ok: false, text: t('evt_cam_too_big') }); return; }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
    onSend(new File([pdf], `scan-cv-${stamp}-${sent + 1}.pdf`, { type: 'application/pdf' }));
    pages.forEach(p => URL.revokeObjectURL(p.url));
    setPages([]);
    setSent(n => n + 1);
    setNotice({ ok: true, text: t('evt_cam_sent_toast') });
    shutterRef.current?.focus({ preventScroll: true });   // the send button is now disabled: keep the focus in the camera
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch.on } as MediaTrackConstraintSet] });
      setTorch(x => ({ ...x, on: !x.on }));
    } catch { setTorch({ ok: false, on: false }); }
  };
  const switchCamera = () => {
    if (devices.length < 2) return;
    const current = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;
    const i = devices.indexOf(current ?? '');
    setState('starting');
    setDeviceId(devices[(i + 1) % devices.length]);
  };
  const retry = () => { setState(initialState()); setAttempt(a => a + 1); };

  const live = state === 'live';
  const failed = state !== 'live' && state !== 'starting';
  return createPortal(
    <div ref={rootRef} className="cam-root" role="dialog" aria-modal="true" aria-label={t('evt_cam_title')}
>
      <header className="cam-top">
        <span className="cam-ic"><Camera size={17} /></span>
        <div className="cam-title"><b>{t('evt_cam_title')}</b><small>{eventName}</small></div>
        {sent > 0 && <span className="cam-chip ok">{tf(t('evt_cam_sent'), { n: sent })}</span>}
        {progress.total > 0 && progress.done < progress.total && <span className="cam-chip"><Spinner size={11} color="#9fe3ec" />{tf(t('evt_cam_analysing'), { done: progress.done, total: progress.total })}</span>}
        <button type="button" className="cam-x" onClick={close} aria-label={t('close')}><X size={18} /></button>
      </header>

      <div className="cam-stage" onClick={() => void capture()}>
        <video ref={videoRef} playsInline muted autoPlay className={live ? '' : 'off'} />
        {live && <div ref={guideRef} className="cam-guide" aria-hidden="true"><i /><i /><i /><i /></div>}
        {live && <p className="cam-hint">{t('evt_cam_hint')}</p>}
        {flash > 0 && <span key={flash} className="cam-flash" aria-hidden="true" />}
        {state === 'starting' && <div className="cam-msg"><Spinner size={22} color="#9fe3ec" /><span>{t('evt_cam_starting')}</span></div>}
        {failed && (
          <div className="cam-msg" onClick={e => e.stopPropagation()}>
            <CircleAlert size={26} color="#ffb4a8" />
            <span>{t(ERR_KEY[state])}</span>
            <div className="cam-msg-btns">
              <button type="button" className="cam-btn primary" onClick={() => nativeInput.current?.click()}><ImagePlus size={15} />{t('evt_cam_native')}</button>
              {state !== 'insecure' && <button type="button" className="cam-btn" onClick={retry}><RotateCcw size={15} />{t('evt_cam_retry')}</button>}
            </div>
          </div>
        )}
        {notice && <div className={`cam-notice${notice.ok ? ' ok' : ''}`} role="status">{notice.text}</div>}
      </div>

      <div className="cam-pages">
        {pages.length === 0
          ? <p>{t('evt_cam_pages_empty')}</p>
          : pages.map((p, i) => (
              <figure key={p.key}>
                <img src={p.url} alt={tf(t('evt_cam_page'), { n: i + 1 })} />
                <figcaption>{i + 1}</figcaption>
                <button type="button" onClick={() => removePage(p.key)} aria-label={t('evt_cam_remove')} title={t('evt_cam_remove')}><X size={12} /></button>
              </figure>
            ))}
        {full && <small className="cam-max">{t('evt_cam_max')}</small>}
      </div>

      <footer className="cam-bar">
        <div className="cam-tools">
          {torch.ok && live && (
            <button type="button" className={`cam-tool${torch.on ? ' on' : ''}`} onClick={() => void toggleTorch()} aria-pressed={torch.on} title={t('evt_cam_torch')}>
              {torch.on ? <Flashlight size={17} /> : <FlashlightOff size={17} />}<span>{t('evt_cam_torch')}</span>
            </button>
          )}
          {devices.length > 1 && live && (
            <button type="button" className="cam-tool" onClick={switchCamera} title={t('evt_cam_switch')}><SwitchCamera size={17} /><span>{t('evt_cam_switch')}</span></button>
          )}
          <button type="button" className={`cam-tool${enhance ? ' on' : ''}`} onClick={() => setEnhance(v => !v)} aria-pressed={enhance} title={t('evt_cam_enhance')}><Wand2 size={17} /><span>{t('evt_cam_enhance')}</span></button>
          <button type="button" className="cam-tool" onClick={() => nativeInput.current?.click()} disabled={full || busy} title={t('evt_cam_native')}><ImagePlus size={17} /><span>{t('evt_cam_native')}</span></button>
        </div>
        <button ref={shutterRef} type="button" className="cam-shutter" onClick={() => void capture()} disabled={!live || busy || full} aria-label={t('evt_cam_capture')} title={t('evt_cam_capture')}>
          {busy ? <Spinner size={20} color="#0e6f84" /> : <span />}
        </button>
        <div className="cam-send">
          <button type="button" className="cam-btn primary big" onClick={send} disabled={!pages.length || busy}>
            <Send size={16} />{pages.length ? tf(t('evt_cam_send'), { n: pages.length }) : t('evt_cam_send_0')}
          </button>
        </div>
      </footer>
      <input ref={nativeInput} type="file" accept="image/*" capture="environment" multiple hidden onChange={e => void fromNative(e)} />
    </div>,
    document.body,
  );
}
