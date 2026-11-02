(function () {
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const LOOPS = {
    drift: [[{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(7%,-6%) scale(1.12)' }, { transform: 'translate(0,0) scale(1)' }], 22000, 'ease-in-out'],
    ping: [[{ transform: 'scale(1)', opacity: 0.6 }, { transform: 'scale(1.5)', opacity: 0 }], 2400, 'cubic-bezier(0,0,.2,1)'],
    shine: [[{ transform: 'translateX(-150%) skewX(-20deg)', offset: 0 }, { transform: 'translateX(350%) skewX(-20deg)', offset: 0.35 }, { transform: 'translateX(350%) skewX(-20deg)', offset: 1 }], 4200, 'ease-in-out'],
    float: [[{ transform: 'translateY(0px)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0px)' }], 3200, 'ease-in-out'],
    spin: [[{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], 900, 'linear'],
    'spin-slow': [[{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], 12000, 'linear'],
    pulse: [[{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], 2000, 'ease-in-out'],
    dot: [[{ transform: 'translateY(0px)', opacity: 0.35 }, { transform: 'translateY(-4px)', opacity: 1 }, { transform: 'translateY(0px)', opacity: 0.35 }], 1000, 'ease-in-out'],
    shimmer: [[{ backgroundPosition: '0% 50%' }, { backgroundPosition: '200% 50%' }], 7000, 'linear'],
    scan: [[{ transform: 'translateX(-100%)' }, { transform: 'translateX(260%)' }], 1300, 'ease-in-out'],
  };
  const NS = 'http://www.w3.org/2000/svg';
  function fill(root) {
    const L = window.lucide; if (!L || !L.icons || !root) return;
    root.querySelectorAll('[data-icon]').forEach(el => {
      if (el.firstChild && el.__icon === el.dataset.icon) return;
      el.replaceChildren(); el.__icon = el.dataset.icon;
      let node = null;
      for (const n of el.dataset.icon.split('|')) { node = L.icons[n.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase())]; if (node) break; }
      if (!node) return;
      const s = el.dataset.size || 16, svg = document.createElementNS(NS, 'svg');
      const a = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': el.dataset.sw || 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      Object.keys(a).forEach(k => svg.setAttribute(k, a[k])); svg.style.display = 'block';
      ((node[0] === 'svg' ? node[2] : node) || []).forEach(c => { if (!Array.isArray(c)) return; const e = document.createElementNS(NS, c[0]); Object.keys(c[1] || {}).forEach(k => { if (k !== 'key') e.setAttribute(k, c[1][k]); }); svg.appendChild(e); });
      el.appendChild(svg);
    });
  }
  function kf(el) {
    const k = el.dataset.reveal || 'up';
    switch (k) {
      case 'fade': return [{ opacity: 0 }, { opacity: 1 }];
      case 'left': return [{ opacity: 0, translate: '36px 0' }, { opacity: 1, translate: '0 0' }];
      case 'right': return [{ opacity: 0, translate: '-36px 0' }, { opacity: 1, translate: '0 0' }];
      case 'scale': return [{ opacity: 0, scale: '0.94' }, { opacity: 1, scale: '1' }];
      case 'pill': return [{ opacity: 0, scale: '0.9' }, { opacity: 1, scale: '1' }];
      case 'growx': return [{ scale: '0 1' }, { scale: '1 1' }];
      case 'growy': return [{ scale: '1 0' }, { scale: '1 1' }];
      case 'draw': {
        let L = 0; try { L = el.getTotalLength(); } catch (_) {}
        if (!L) return null;
        const f = +(el.dataset.frac || 1);
        el.style.strokeDasharray = `${(L * f).toFixed(2)}px ${L.toFixed(2)}px`;
        return [{ strokeDashoffset: `${(L * f).toFixed(2)}px` }, { strokeDashoffset: '0px' }];
      }
      default: return [{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }];
    }
  }
  function attach(root) {
    const ws = { r: new WeakSet(), l: new WeakSet(), c: new WeakSet() };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting && e.boundingClientRect.bottom >= 0) return;
      io.unobserve(e.target);
      const a = e.target.__reveal; if (a) { try { e.isIntersecting ? a.play() : a.finish(); } catch (_) {} }
      if (e.target.__count) e.target.__count();
    }), { threshold: 0.05 });
    function scan() {
      fill(root);
      if (reduce) return;
      root.querySelectorAll('[data-reveal]').forEach(el => {
        if (ws.r.has(el)) return; ws.r.add(el);
        const K = kf(el); if (!K) return;
        const k = el.dataset.reveal;
        const base = k === 'draw' ? 1300 : (k === 'growx' || k === 'growy') ? 1000 : k === 'pill' ? 300 : 620;
        let a; try { a = el.animate(K, { duration: +el.dataset.dur || base, delay: Math.min(+el.dataset.delay || 0, 900), easing: EASE, fill: 'both' }); } catch (_) { return; }
        a.pause(); a.onfinish = () => { try { a.cancel(); } catch (_) {} }; el.__reveal = a; io.observe(el);
      });
      root.querySelectorAll('[data-count]').forEach(el => {
        if (ws.c.has(el)) return; ws.c.add(el);
        const node = el.firstChild; if (!node || el.childNodes.length !== 1 || node.nodeType !== 3) return;
        const raw = node.nodeValue, mt = raw.match(/\d[\d\s]*/); if (!mt) return;
        const target = +mt[0].replace(/\s/g, ''), pre = raw.slice(0, mt.index), post = raw.slice(mt.index + mt[0].length);
        node.nodeValue = pre + '0' + post;
        el.__count = () => { const st = performance.now() + (+el.dataset.delay || 0); const step = now => { const t = Math.max(0, Math.min(1, (now - st) / 1400)); node.nodeValue = t >= 1 ? raw : pre + Math.round(target * (1 - Math.pow(2, -10 * t))).toLocaleString('fr-FR') + post; if (t < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
        io.observe(el);
      });
      root.querySelectorAll('[data-loop]').forEach(el => {
        if (ws.l.has(el)) return; ws.l.add(el);
        const d = LOOPS[el.dataset.loop]; if (!d) return;
        try { el.animate(d[0], { duration: +el.dataset.dur || d[1], iterations: Infinity, easing: d[2], delay: +el.dataset.delay || 0 }); } catch (_) {}
      });
    }
    let t = 0, n = 0;
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 70); });
    mo.observe(root, { childList: true, subtree: true });
    (function wait() { if (window.lucide && window.lucide.icons) { fill(root); return; } if (n++ < 100) setTimeout(wait, 120); })();
    scan();
    return { scan, destroy() { io.disconnect(); mo.disconnect(); clearTimeout(t); } };
  }
  window.WedyFx = { attach, EASE };
})();
