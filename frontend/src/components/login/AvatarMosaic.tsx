import { useEffect, useImperativeHandle, useRef, type Ref, type RefObject } from 'react';
import { prefersReducedMotion } from '@/lib/inView';

export interface MosaicHandle {
  /** Pushes every tile outward (the reference fires it on click, and `1.3` when the login succeeds). */
  burst: (power?: number) => void;
}

/** Pointer position inside the brand panel, written by the panel, read by the tiles. */
export interface PanelPointer { x: number | null; y: number | null; inside: boolean }

interface Tile {
  el: HTMLDivElement;
  hx: number; hy: number;   // home position
  n: number;                // 0 at the center, 1 at the rim
  k: number;                // spring stiffness
  vx: number; vy: number;
  x: number; y: number;
  o: number;                // opacity
  start: number;            // when it starts flying in (ms, performance.now)
}

const N = 18, T = 13, G = 2, C = T + G, S = N * C, R = S / 2;

/**
 * The Wedy avatar cut into ~250 square tiles that fly in, float, scatter away from the cursor and
 * spring back (design/Wedy Login.dc.html `data-bigmosaic`). Without motion the tiles just sit in place.
 */
export function AvatarMosaic({ pointer, ref }: { pointer: RefObject<PanelPointer>; ref?: Ref<MosaicHandle> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<(power?: number) => void>(() => {});
  useImperativeHandle(ref, () => ({ burst: (power) => burstRef.current(power) }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const still = prefersReducedMotion();
    const now0 = performance.now();
    const tiles: Tile[] = [];
    const frag = document.createDocumentFragment();

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cx = c * C + T / 2 - R, cy = r * C + T / 2 - R, dist = Math.hypot(cx, cy);
        if (dist > R - 3) continue;
        const d = document.createElement('div');
        d.className = 'lg-mosaic-tile';
        d.style.width = `${T}px`;
        d.style.height = `${T}px`;
        d.style.backgroundImage = 'url(/wedy-avatar.png)';
        d.style.backgroundSize = `${S}px ${S}px`;
        d.style.backgroundPosition = `${-c * C}px ${-r * C}px`;
        frag.appendChild(d);
        const n = dist / R, a = Math.random() * 6.283, rad = 260 + Math.random() * 320;
        const t: Tile = { el: d, hx: c * C, hy: r * C, n, k: 0.085 + Math.random() * 0.035, vx: 0, vy: 0, x: c * C, y: r * C, o: 1, start: 0 };
        if (!still) {
          t.x = t.hx + Math.cos(a) * rad; t.y = t.hy + Math.sin(a) * rad; t.o = 0;
          t.start = now0 + 250 + n * 900 + Math.random() * 450;
        }
        d.style.opacity = String(t.o);
        d.style.transform = `translate3d(${t.x}px,${t.y}px,0)`;
        tiles.push(t);
      }
    }
    host.replaceChildren(frag);
    if (still) return;

    let raf = 0, visible = true, alive = true;
    const tick = (now: number) => {
      raf = 0;
      if (!alive) return;
      const rect = host.getBoundingClientRect();
      const sc = rect.width / S || 1;
      const p = pointer.current;
      const mx = p.x != null ? (p.x - rect.left) / sc : -9999, my = p.y != null ? (p.y - rect.top) / sc : -9999;
      const repel = p.inside, h = T / 2;
      for (const t of tiles) {
        if (now < t.start) continue;
        let tx = t.hx, ty = t.hy + Math.sin(now / 760 - t.n * 6) * 1.4;
        if (repel) {
          const dx = t.hx + h - mx, dy = t.hy + h - my, d = Math.hypot(dx, dy) || 1;
          if (d < 120) { const f = Math.pow(1 - d / 120, 2) * 52; tx += (dx / d) * f; ty += (dy / d) * f; }
        }
        t.vx = (t.vx + (tx - t.x) * t.k) * 0.8;
        t.vy = (t.vy + (ty - t.y) * t.k) * 0.8;
        t.x += t.vx; t.y += t.vy;
        const sp = Math.hypot(t.vx, t.vy);
        const rot = Math.max(-60, Math.min(60, t.vx * 2.6));
        const off = Math.hypot(tx - t.hx, ty - t.hy);
        const s = (1 + Math.min(0.4, sp * 0.02)) * (1 - Math.min(0.35, off * 0.006));
        t.el.style.transform = `translate3d(${t.x.toFixed(1)}px,${t.y.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg) scale(${s.toFixed(3)})`;
        if (t.o < 1) { t.o = Math.min(1, t.o + 0.045); t.el.style.opacity = t.o.toFixed(3); }
      }
      if (visible) raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf && alive) raf = requestAnimationFrame(tick); };

    burstRef.current = (power = 1) => {
      const c = S / 2;
      for (const t of tiles) {
        const a = Math.atan2(t.hy - c, t.hx - c) + (Math.random() - 0.5) * 0.9;
        const f = (12 + t.n * 26 + Math.random() * 12) * power;
        t.vx += Math.cos(a) * f; t.vy += Math.sin(a) * f;
      }
      kick();
    };

    const onDown = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < r.width / 2 + 10) burstRef.current(1);
    };
    window.addEventListener('pointerdown', onDown, { passive: true });

    const io = new IntersectionObserver(([e]) => { visible = !!(e && e.isIntersecting); if (visible) kick(); });
    io.observe(host);
    kick();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointerdown', onDown);
      burstRef.current = () => {};
    };
  }, [pointer]);

  return <div ref={hostRef} className="lg-mosaic" aria-hidden="true" />;
}
