// Pointer, scroll and timing effects of the landing page, ported from the reference's DCLogic
// (Wedy Landing.dc.html). Everything is attribute driven, so the markup in LandingView stays the
// reference's markup: data-nav, data-mouse, data-mosaic, data-magnet, data-tilt, data-rotator,
// data-fit, data-seq-root / data-seq, data-cycle, data-scroll and data-chat.
// Reveals, counters and loops are handled by RV, CountText and the wedy-* classes.

const EASE = 'cubic-bezier(.2,.8,.2,1)';

type Mosaic = { el: HTMLElement; tiles: Tile[]; op: number };
type Tile = { el: HTMLElement; ox: number; oy: number; n: number; x: number; y: number; vx: number; vy: number; k: number; ph: number; init: boolean };

export type EngineOptions = {
  /** Called when the chat demo enters (true) or leaves (false) the viewport. */
  onChatVisible: (visible: boolean) => void;
};

export function reducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function startLandingEngine(root: HTMLElement, opts: EngineOptions): () => void {
  const full = !reducedMotion();
  let alive = true;
  const ints: number[] = [];
  const ts: number[] = [];
  const resets: (() => void)[] = [];
  const observers: { disconnect(): void }[] = [];
  const anims: Animation[] = [];

  const hero = root.querySelector<HTMLElement>('[data-mouse]');
  const nav = root.querySelector<HTMLElement>('[data-nav]');
  const tilts = [...root.querySelectorAll<HTMLElement>('[data-scroll="tilt"]')];
  const progs = [...root.querySelectorAll<HTMLElement>('[data-scroll="progress"]')];
  const fits = [...root.querySelectorAll<HTMLElement>('[data-fit]')];

  // ── fit: scale a fixed-width mock to its container ─────────────────────────
  const onResize = () => {
    if (!alive) return;
    fits.forEach(el => {
      const d = +(el.dataset.fit || 1100);
      const par = el.parentElement;
      if (!par) return;
      const s = Math.min(1, par.clientWidth / d);
      el.style.setProperty('--fit', s.toFixed(4));
      const h = Math.ceil(el.offsetHeight * s) + 'px';
      if (par.style.height !== h) par.style.height = h;
    });
    onScroll();
  };
  const ro = new ResizeObserver(() => requestAnimationFrame(onResize));
  fits.forEach(el => { if (el.parentElement) ro.observe(el.parentElement); });
  observers.push(ro);
  resets.push(() => fits.forEach(el => { if (el.parentElement) el.parentElement.style.height = ''; }));

  // ── scroll: nav background, hero mock tilt, progress bars ──────────────────
  let raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!alive) return;
      const vh = window.innerHeight;
      if (nav) nav.style.setProperty('--nav', Math.min(1, window.scrollY / 120).toFixed(3));
      tilts.forEach(el => {
        const r = (el.parentElement || el).getBoundingClientRect();
        const p = full ? Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.9))) : 1;
        el.style.setProperty('--p', p.toFixed(3));
      });
      progs.forEach(el => {
        const r = el.getBoundingClientRect();
        const p = full ? Math.max(0, Math.min(1, (vh * 0.8 - r.top) / (vh * 0.5))) : 1;
        el.style.setProperty('--p', p.toFixed(3));
      });
    });
  }

  // ── seq: timelines that build a mock up and fade it out, on repeat ─────────
  if (full) {
    root.querySelectorAll<HTMLElement>('[data-seq]').forEach(el => {
      const host = el.closest<HTMLElement & { __st?: number | null }>('[data-seq-root]');
      if (!host) return;
      const P = +(host.dataset.seqRoot || 7000);
      if (host.__st == null) host.__st = document.timeline ? (document.timeline.currentTime as number) : 0;
      const kind = el.dataset.seq || '';
      const at = +(el.dataset.at || 0);
      const end = Math.min(at + +(el.dataset.len || 0.1), 0.84);
      const map: Record<string, [string, string, string]> = { x: ['scale', '0 1', '1 1'], y: ['scale', '1 0', '1 1'], pop: ['scale', '0.3', '1'] };
      let K: Keyframe[];
      if (kind === 'fade') K = [{ opacity: 0, offset: 0 }, { opacity: 0, offset: at, easing: EASE }, { opacity: 1, offset: end }, { opacity: 1, offset: 0.88 }, { opacity: 0, offset: 0.96 }, { opacity: 0, offset: 1 }];
      else if (map[kind]) {
        const [p, a, b] = map[kind];
        const o0 = kind === 'pop' ? 0 : 1;
        K = [
          { [p]: a, opacity: o0, offset: 0 },
          { [p]: a, opacity: o0, offset: at, easing: kind === 'pop' ? 'cubic-bezier(.3,1.6,.5,1)' : EASE },
          { [p]: b, opacity: 1, offset: end },
          { [p]: b, opacity: 1, offset: 0.88 },
          { [p]: b, opacity: 0, offset: 0.96 },
          { [p]: a, opacity: 0, offset: 1 },
        ];
      } else return;
      try { const an = el.animate(K, { duration: P, iterations: Infinity }); an.startTime = host.__st; anims.push(an); } catch { /* unsupported */ }
    });
  }

  // ── cycle: FR / ع / EN document that switches language ─────────────────────
  root.querySelectorAll<HTMLElement>('[data-cycle]').forEach(el => {
    const items = [...el.querySelectorAll<HTMLElement>('[data-cycle-item]')];
    if (items.length < 2) return;
    const pill = el.querySelector<HTMLElement>('[data-cycle-pill]');
    const tabs = [...el.querySelectorAll<HTMLElement>('[data-cycle-tab]')];
    const origC = tabs.map(t => t.style.color);
    const origO = items.map(it => it.style.opacity);
    let i = 0;
    const paint = () => {
      items.forEach((it, j) => { it.style.opacity = j === i ? '1' : '0'; });
      if (pill) pill.style.transform = `translateX(${i * 100}%)`;
      tabs.forEach((t, j) => { t.style.color = j === i ? (t.dataset.on || '') : (t.dataset.off || ''); });
    };
    paint();
    resets.push(() => { items.forEach((it, j) => { it.style.opacity = origO[j]; }); if (pill) pill.style.transform = ''; tabs.forEach((t, j) => { t.style.color = origC[j]; }); });
    if (!full) return;
    ints.push(window.setInterval(() => {
      const prev = items[i];
      i = (i + 1) % items.length;
      const next = items[i];
      paint();
      try {
        prev.animate([{ opacity: 1, filter: 'blur(0px)', translate: '0 0' }, { opacity: 0, filter: 'blur(8px)', translate: '0 -14px' }], { duration: 450, easing: EASE });
        next.animate([{ opacity: 0, filter: 'blur(8px)', translate: '0 14px' }, { opacity: 1, filter: 'blur(0px)', translate: '0 0' }], { duration: 700, easing: EASE });
      } catch { /* unsupported */ }
    }, +(el.dataset.cycle || 2800)));
  });

  // ── rotator: "Wedy drafts / translates / files" ────────────────────────────
  root.querySelectorAll<HTMLElement>('[data-rotator]').forEach(el => {
    const kids = [...el.children] as HTMLElement[];
    const mask = el.parentElement;
    if (kids.length < 2 || !mask) return;
    const n = kids.length - 1;
    let i = 0;
    const fitW = () => { const w = kids[i].offsetWidth; if (w) mask.style.width = w + 'px'; };
    fitW();
    if (document.fonts?.ready) document.fonts.ready.then(() => { if (alive) fitW(); });
    resets.push(() => { mask.style.width = ''; mask.style.transition = ''; el.style.transform = ''; el.style.transition = ''; });
    if (!full) return;
    requestAnimationFrame(() => { mask.style.transition = 'width .6s ' + EASE; });
    ints.push(window.setInterval(() => {
      i++;
      const h = kids[0].offsetHeight;
      el.style.transition = 'transform .7s ' + EASE;
      el.style.transform = `translateY(${-i * h}px)`;
      fitW();
      if (i >= n) ts.push(window.setTimeout(() => { el.style.transition = 'none'; el.style.transform = 'translateY(0px)'; i = 0; }, 760));
    }, 2400));
  });

  // ── chat demo visibility ───────────────────────────────────────────────────
  const chat = root.querySelector<HTMLElement>('[data-chat]');
  if (chat) {
    let inView = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e || !alive) return;
      if (e.isIntersecting && !inView) { inView = true; opts.onChatVisible(true); }
      else if (!e.isIntersecting && inView) { inView = false; opts.onChatVisible(false); }
    }, { threshold: 0.3 });
    io.observe(chat);
    observers.push(io);
  }

  // ── mosaic: the Wedy avatar, cut into tiles, follows the cursor in the hero ─
  let mosaic: Mosaic | null = null;
  const mosaicEl = root.querySelector<HTMLElement>('[data-mosaic]');
  if (mosaicEl && full) {
    mosaicEl.replaceChildren();
    const N = 9, T = 11, G = 2, C = T + G, S = N * C, R = S / 2;
    const tiles: Tile[] = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const ox = c * C - R, oy = r * C - R;
      const dist = Math.hypot(ox + T / 2, oy + T / 2);
      if (dist > R - 2) continue;
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:0;top:0;width:${T}px;height:${T}px;border-radius:3px;background-color:rgba(15,38,46,.72);background-image:url(/wedy-avatar.png);background-size:${S}px ${S}px;background-position:${-c * C}px ${-r * C}px;box-shadow:0 0 0 .5px rgba(95,227,240,.28);will-change:transform`;
      mosaicEl.appendChild(d);
      tiles.push({ el: d, ox, oy, n: dist / R, x: 0, y: 0, vx: 0, vy: 0, k: 0.17 - (dist / R) * 0.1 + Math.random() * 0.025, ph: Math.random() * 6.28, init: false });
    }
    mosaic = { el: mosaicEl, tiles, op: 0 };
  }
  let mx: number | null = null, my = 0, mIn = false, mHover = false, mraf = 0;
  const mosaicTick = (now: number) => {
    mraf = 0;
    const M = mosaic, h = hero;
    if (!M || !h || !alive) return;
    const want = mIn ? 1 : 0;
    M.op += (want - M.op) * 0.14;
    M.el.style.opacity = M.op.toFixed(3);
    const r = h.getBoundingClientRect();
    const ax = (mx || 0) - r.left + 58, ay = my - r.top + 58;
    const spread = mHover ? 1.75 : 1;
    M.tiles.forEach(t => {
      const tx = ax + t.ox * spread, ty = ay + t.oy * spread + Math.sin(now / 520 + t.ph) * 1.1;
      if (!t.init) { t.x = tx + (Math.random() - 0.5) * 140; t.y = ty + (Math.random() - 0.5) * 140; t.init = true; }
      t.vx = (t.vx + (tx - t.x) * t.k) * 0.74;
      t.vy = (t.vy + (ty - t.y) * t.k) * 0.74;
      t.x += t.vx; t.y += t.vy;
      const sp = Math.hypot(t.vx, t.vy);
      const rot = Math.max(-45, Math.min(45, t.vx * 2.4 - t.vy * 0.8));
      const sc = (0.55 + M.op * 0.45) * (1 + Math.min(0.45, sp * 0.018));
      t.el.style.transform = `translate3d(${t.x.toFixed(1)}px,${t.y.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
    });
    if (M.op > 0.005 || want) mraf = requestAnimationFrame(mosaicTick);
    else M.tiles.forEach(t => { t.init = false; });
  };
  const kickMosaic = () => { if (!mraf && mosaic) mraf = requestAnimationFrame(mosaicTick); };
  const burstMosaic = (e: PointerEvent) => {
    const M = mosaic;
    if (!M || !mIn || e.pointerType === 'touch') return;
    M.tiles.forEach(t => {
      const a = Math.atan2(t.oy, t.ox) + (Math.random() - 0.5) * 0.8, f = 14 + t.n * 22 + Math.random() * 10;
      t.vx += Math.cos(a) * f; t.vy += Math.sin(a) * f;
    });
    kickMosaic();
  };
  const kickMosaicOnScroll = () => {
    if (!hero || mx == null) return;
    const r = hero.getBoundingClientRect();
    mIn = my >= r.top && my <= r.bottom && mx >= r.left && mx <= r.right;
    kickMosaic();
  };
  const onLeaveWindow = (e: PointerEvent) => { if (!e.relatedTarget) { mIn = false; kickMosaic(); } };

  // ── pointer: hero glow, card tilt, magnetic buttons ────────────────────────
  let tiltEl: HTMLElement | null = null, magEl: HTMLElement | null = null;
  const resetTilt = (t: HTMLElement) => { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); t.style.setProperty('--sx', '-999px'); t.style.setProperty('--sy', '-999px'); };
  const onPointer = (e: PointerEvent) => {
    if (!full) return;
    const x = e.clientX, y = e.clientY;
    const tgt = e.target instanceof Element ? e.target : null;
    if (hero && e.pointerType !== 'touch') {
      const r = hero.getBoundingClientRect();
      mx = x; my = y;
      mIn = y >= r.top && y <= r.bottom && x >= r.left && x <= r.right;
      mHover = !!tgt?.closest('a,button');
      kickMosaic();
    }
    if (hero) {
      const r = hero.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) {
        hero.style.setProperty('--mx', ((x - r.left) / r.width * 2 - 1).toFixed(3));
        hero.style.setProperty('--my', ((y - r.top) / r.height * 2 - 1).toFixed(3));
        hero.style.setProperty('--cx', (x - r.left).toFixed(0) + 'px');
        hero.style.setProperty('--cy', (y - r.top).toFixed(0) + 'px');
      }
    }
    const t = tgt?.closest<HTMLElement>('[data-tilt]') ?? null;
    if (t !== tiltEl) { if (tiltEl) resetTilt(tiltEl); tiltEl = t; }
    if (t) {
      const r = t.getBoundingClientRect();
      const px = (x - r.left) / r.width, py = (y - r.top) / r.height, amt = +(t.dataset.tilt || 6);
      t.style.setProperty('--ry', ((px - 0.5) * amt).toFixed(2) + 'deg');
      t.style.setProperty('--rx', ((0.5 - py) * amt).toFixed(2) + 'deg');
      t.style.setProperty('--sx', (x - r.left).toFixed(0) + 'px');
      t.style.setProperty('--sy', (y - r.top).toFixed(0) + 'px');
    }
    const g = tgt?.closest<HTMLElement>('[data-magnet]') ?? null;
    if (g !== magEl) { if (magEl) { magEl.style.setProperty('--tx', '0px'); magEl.style.setProperty('--ty', '0px'); } magEl = g; }
    if (g) {
      const r = g.getBoundingClientRect();
      g.style.setProperty('--tx', ((x - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
      g.style.setProperty('--ty', ((y - r.top - r.height / 2) * 0.32).toFixed(1) + 'px');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', burstMosaic, { passive: true });
  window.addEventListener('pointerout', onLeaveWindow, { passive: true });
  window.addEventListener('scroll', kickMosaicOnScroll, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(() => { if (alive) onResize(); });
  onResize();

  return () => {
    alive = false;
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('pointerdown', burstMosaic);
    window.removeEventListener('pointerout', onLeaveWindow);
    window.removeEventListener('scroll', kickMosaicOnScroll);
    observers.forEach(o => o.disconnect());
    ints.forEach(clearInterval);
    ts.forEach(clearTimeout);
    anims.forEach(a => { try { a.cancel(); } catch { /* gone */ } });
    if (raf) cancelAnimationFrame(raf);
    if (mraf) cancelAnimationFrame(mraf);
    if (mosaic) { mosaic.el.replaceChildren(); mosaic.el.style.opacity = '0'; }
    root.querySelectorAll<HTMLElement>('[data-tilt]').forEach(resetTilt);
    root.querySelectorAll<HTMLElement>('[data-magnet]').forEach(g => { g.style.setProperty('--tx', '0px'); g.style.setProperty('--ty', '0px'); });
    resets.forEach(f => { try { f(); } catch { /* gone */ } });
  };
}
