// Recruitment visual of a job post, drawn on a canvas in the browser (free, no image service): company logo and
// name, « Nous recrutons », the job title, contract and city, up to 4 key points, and how to apply (link + QR code).
// One size per network: square (Facebook / Instagram feed), LinkedIn (1200×627, also the link preview image) and
// story (Instagram / Facebook / WhatsApp stories). Arabic is laid out right to left.
import qrcode from 'qrcode-generator';

export type VisualFormat = 'square' | 'linkedin' | 'story';
export type VisualTheme = 'ocean' | 'light' | 'night';
export const FORMATS: Record<VisualFormat, [number, number]> = { square: [1080, 1080], linkedin: [1200, 627], story: [1080, 1920] };

export type VisualData = {
  title: string; contract?: string; city?: string; points: string[];
  company: string; logo?: string | null; url: string; lang: 'fr' | 'en' | 'ar';
  labels: { hiring: string; apply: string; scan: string };
};

type Palette = { bg: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; ink: string; sub: string; accent: string; chipBg: string; chipInk: string; card: string; cardInk: string; check: string };
const PALETTES: Record<VisualTheme, Palette> = {
  ocean: {
    bg: (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#06141a'); g.addColorStop(0.55, '#0b4a58'); g.addColorStop(1, '#16b6c8');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      glow(c, w * 0.92, h * 0.05, Math.max(w, h) * 0.55, 'rgba(95,227,240,.35)');
      glow(c, w * 0.05, h * 0.98, Math.max(w, h) * 0.45, 'rgba(109,90,214,.30)');
    },
    ink: '#ffffff', sub: '#c9e7ec', accent: '#5fe3f0', chipBg: 'rgba(255,255,255,.12)', chipInk: '#ffffff', card: '#ffffff', cardInk: '#0a1c24', check: '#5fe3f0',
  },
  light: {
    bg: (c, w, h) => {
      c.fillStyle = '#f3f6f7'; c.fillRect(0, 0, w, h);
      glow(c, w, 0, Math.max(w, h) * 0.6, 'rgba(22,182,200,.22)');
      c.fillStyle = '#0e6f84'; c.fillRect(0, 0, w, Math.max(10, h * 0.012));
    },
    ink: '#0a1c24', sub: '#52646d', accent: '#0e6f84', chipBg: '#e4f2f4', chipInk: '#0b5f72', card: '#0a1c24', cardInk: '#ffffff', check: '#16a06b',
  },
  night: {
    bg: (c, w, h) => {
      c.fillStyle = '#0a0f1f'; c.fillRect(0, 0, w, h);
      glow(c, w * 0.85, h * 0.15, Math.max(w, h) * 0.6, 'rgba(109,90,214,.55)');
      glow(c, w * 0.1, h * 0.9, Math.max(w, h) * 0.5, 'rgba(22,182,200,.35)');
    },
    ink: '#ffffff', sub: '#c7c2f0', accent: '#a99bff', chipBg: 'rgba(169,155,255,.16)', chipInk: '#e6e1ff', card: '#ffffff', cardInk: '#0a0f1f', check: '#a99bff',
  },
};

function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

/** Words → lines no wider than `max` (at most `limit` lines, the last one ellipsised). */
function wrap(c: CanvasRenderingContext2D, text: string, max: number, limit: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (c.measureText(next).width <= max || !cur) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > limit) {
    const kept = lines.slice(0, limit);
    let last = kept[limit - 1];
    while (last && c.measureText(`${last}…`).width > max) last = last.slice(0, -1);
    kept[limit - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

const loadImage = (src: string) => new Promise<HTMLImageElement | null>(res => {
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => res(img); img.onerror = () => res(null); img.src = src;
});

/** What the visual prints under « apply »: the site's address only (the QR code carries the full link). */
export const shortUrl = (url: string) => { try { return new URL(url).host; } catch { return url.replace(/^https?:\/\//, '').split('/')[0]; } };

export async function renderJobVisual(canvas: HTMLCanvasElement, fmt: VisualFormat, theme: VisualTheme, d: VisualData) {
  const [W, H] = FORMATS[fmt];
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  if (!c) return;
  const rtl = d.lang === 'ar';
  const display = rtl ? '"Noto Kufi Arabic", "Bricolage Grotesque", sans-serif' : '"Bricolage Grotesque", system-ui, sans-serif';
  const body = rtl ? '"Noto Kufi Arabic", Geist, sans-serif' : 'Geist, system-ui, sans-serif';
  try { await Promise.all([document.fonts.load(`700 60px ${display}`), document.fonts.load(`600 30px ${body}`), document.fonts.load(`400 30px ${body}`)]); } catch { /* system fonts */ }
  const logo = d.logo ? await loadImage(d.logo) : null;
  const p = PALETTES[theme];
  p.bg(c, W, H);
  c.direction = rtl ? 'rtl' : 'ltr';
  c.textBaseline = 'alphabetic';

  const landscape = fmt === 'linkedin';
  const S = landscape ? H / 627 : W / 1080;          // scale unit
  const tall = fmt === 'story';
  const P = Math.round((landscape ? 56 : tall ? 96 : 80) * S);   // outer padding
  const colW = landscape ? W * 0.6 - P : W - 2 * P;  // text column width
  const X = (x: number, w = 0) => (rtl ? W - x - w : x); // mirror for RTL
  const textX = rtl ? W - P : P;
  c.textAlign = rtl ? 'right' : 'left';

  // ── company ─────────────────────────────────────────────────────────────────
  let y = P;
  const logoS = Math.round((landscape ? 64 : 84) * S);
  if (logo) {
    const r = Math.min(logoS / logo.width, logoS / logo.height);
    const lw = logo.width * r, lh = logo.height * r;
    c.fillStyle = '#ffffff'; roundRect(c, X(P, logoS + 16 * S), y - 8 * S, logoS + 16 * S, logoS + 16 * S, 18 * S); c.fill();
    c.drawImage(logo, X(P + 8 * S + (logoS - lw) / 2, lw), y + (logoS - lh) / 2, lw, lh);
  } else {
    c.fillStyle = p.accent; roundRect(c, X(P, logoS), y, logoS, logoS, 20 * S); c.fill();
    c.fillStyle = theme === 'light' ? '#ffffff' : '#06141a';
    c.font = `700 ${Math.round(logoS * 0.4)}px ${display}`; c.textAlign = 'center';
    const ini = (d.company || 'W').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    c.fillText(ini, X(P, logoS) + logoS / 2, y + logoS * 0.64);
    c.textAlign = rtl ? 'right' : 'left';
  }
  c.fillStyle = p.ink; c.font = `600 ${Math.round(30 * S)}px ${body}`;
  const nameX = rtl ? W - P - logoS - 34 * S : P + logoS + 34 * S;
  c.fillText(wrap(c, d.company || '', colW - logoS - 40 * S, 1)[0] ?? '', nameX, y + logoS * 0.62);
  y += logoS + Math.round((landscape ? 34 : tall ? 150 : 64) * S);

  // ── « we're hiring » pill ───────────────────────────────────────────────────
  c.font = `700 ${Math.round(24 * S)}px ${body}`;
  const hiring = d.labels.hiring.toUpperCase();
  const pillW = c.measureText(hiring).width + 44 * S, pillH = 48 * S;
  c.fillStyle = p.accent; roundRect(c, X(P, pillW), y, pillW, pillH, pillH / 2); c.fill();
  c.fillStyle = theme === 'light' ? '#ffffff' : '#06141a';
  c.fillText(hiring, rtl ? W - P - 22 * S : P + 22 * S, y + pillH * 0.66);
  y += pillH + Math.round(28 * S);

  // ── title ───────────────────────────────────────────────────────────────────
  let size = Math.round((tall ? 124 : landscape ? 64 : 92) * S);
  let lines: string[] = [];
  for (; size > 40 * S; size -= 4 * S) {
    c.font = `700 ${size}px ${display}`;
    lines = wrap(c, d.title, colW, 3);
    if (lines.length <= (fmt === 'story' ? 4 : 3) && !lines[lines.length - 1].endsWith('…')) break;
  }
  c.fillStyle = p.ink; c.font = `700 ${size}px ${display}`;
  for (const l of lines) { y += size * 1.04; c.fillText(l, textX, y); }
  y += Math.round(30 * S);

  // ── contract / city chips ───────────────────────────────────────────────────
  c.font = `600 ${Math.round(26 * S)}px ${body}`;
  let cx = P;
  for (const chip of [d.contract, d.city].filter(Boolean) as string[]) {
    const w = c.measureText(chip).width + 40 * S, h = 52 * S;
    c.fillStyle = p.chipBg; roundRect(c, X(cx, w), y, w, h, h / 2); c.fill();
    c.fillStyle = p.chipInk; c.fillText(chip, rtl ? W - cx - 20 * S : cx + 20 * S, y + h * 0.66);
    cx += w + 12 * S;
  }
  if (d.contract || d.city) y += 52 * S + Math.round((landscape ? 26 : tall ? 70 : 44) * S);

  // ── key points ──────────────────────────────────────────────────────────────
  const maxPoints = landscape ? 3 : tall ? 5 : 4;
  c.font = `500 ${Math.round((landscape ? 25 : tall ? 40 : 32) * S)}px ${body}`;
  const lineH = (landscape ? 36 : tall ? 58 : 46) * S;
  const boxH = (tall ? 440 : 210) * S;
  const ctaTop = landscape ? H - P : H - P - boxH;
  for (const pt of d.points.slice(0, maxPoints)) {
    const pl = wrap(c, pt, colW - 56 * S, 2);
    if (y + pl.length * lineH > ctaTop - 24 * S) break;
    const r = (tall ? 19 : 15) * S, cxp = rtl ? W - P - r : P + r, cyp = y + lineH * 0.52;
    c.fillStyle = p.check; c.beginPath(); c.arc(cxp, cyp, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = theme === 'light' ? '#ffffff' : '#06141a'; c.lineWidth = 3.4 * S; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(cxp - 6 * S, cyp); c.lineTo(cxp - 1.5 * S, cyp + 5 * S); c.lineTo(cxp + 7 * S, cyp - 5 * S); c.stroke();
    c.fillStyle = p.ink;
    pl.forEach((l, i) => c.fillText(l, rtl ? W - P - (tall ? 60 : 48) * S : P + (tall ? 60 : 48) * S, y + lineH * 0.72 + i * lineH));
    y += pl.length * lineH + (tall ? 22 : 14) * S;
  }

  // ── apply: link + QR ────────────────────────────────────────────────────────
  const qr = qrcode(0, 'M'); qr.addData(d.url); qr.make();
  const n = qr.getModuleCount();
  const drawQr = (qx: number, qy: number, size: number) => {
    c.fillStyle = '#ffffff'; roundRect(c, qx, qy, size, size, 14 * S); c.fill();
    const pad = size * 0.08, cell = (size - 2 * pad) / n;
    c.fillStyle = '#0a1c24';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) c.fillRect(qx + pad + k * cell, qy + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
  };
  if (landscape) {
    const panelW = W * 0.4 - P, panelX = rtl ? P : W - P - panelW, panelY = P, panelH = H - 2 * P;
    c.fillStyle = p.card; roundRect(c, panelX, panelY, panelW, panelH, 28 * S); c.fill();
    const qs = Math.min(panelW - 80 * S, panelH - 190 * S);
    drawQr(panelX + (panelW - qs) / 2, panelY + 40 * S, qs);
    c.textAlign = 'center'; c.fillStyle = p.cardInk;
    c.font = `700 ${Math.round(30 * S)}px ${display}`; c.fillText(d.labels.apply, panelX + panelW / 2, panelY + qs + 96 * S);
    c.font = `500 ${Math.round(19 * S)}px ${body}`; c.globalAlpha = 0.75;
    c.fillText(wrap(c, shortUrl(d.url), panelW - 40 * S, 1)[0] ?? '', panelX + panelW / 2, panelY + qs + 134 * S);
    c.globalAlpha = 1;
  } else {
    const boxY = H - P - boxH, boxW = W - 2 * P;
    c.fillStyle = p.card; roundRect(c, P, boxY, boxW, boxH, 32 * S); c.fill();
    const qs = boxH - (tall ? 64 : 44) * S;
    drawQr(rtl ? P + (tall ? 32 : 22) * S : P + boxW - qs - (tall ? 32 : 22) * S, boxY + (tall ? 32 : 22) * S, qs);
    c.textAlign = rtl ? 'right' : 'left'; c.fillStyle = p.cardInk;
    const tx = rtl ? W - P - 40 * S : P + 40 * S, tw = boxW - qs - 100 * S;
    const fs = Math.round((tall ? 50 : 42) * S), small = Math.round(24 * S);
    c.font = `700 ${fs}px ${display}`;
    const al = wrap(c, d.labels.apply, tw, 2), ah = fs * 1.18;
    const blockH = al.length * ah + small * 3.4;
    let ty = boxY + (boxH - blockH) / 2 + fs;
    al.forEach((l, i) => c.fillText(l, tx, ty + i * ah));
    ty += (al.length - 1) * ah + small * 1.8;
    c.font = `500 ${small}px ${body}`; c.globalAlpha = 0.72;
    c.fillText(wrap(c, d.labels.scan, tw, 1)[0] ?? '', tx, ty);
    c.font = `600 ${small}px ${body}`; c.globalAlpha = 0.9;
    c.fillText(wrap(c, shortUrl(d.url), tw, 1)[0] ?? '', tx, ty + small * 1.6);
    c.globalAlpha = 1;
  }
}

/** Key points for the visual: the bullets of the generated ad (missions, then profile), else the comma-separated notes. */
export function pointsFrom(ad: { contenu?: string; competences?: string | null }): string[] {
  const bullets = (ad.contenu || '').split('\n').map(l => l.trim()).filter(l => /^[•\-*–]/.test(l)).map(l => l.replace(/^[•\-*–]\s*/, '').replace(/[.;]$/, ''));
  const short = bullets.filter(b => b.length <= 90);
  if (short.length) return short.slice(0, 4);
  return (ad.competences || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean).slice(0, 4);
}

export const canvasBlob = (canvas: HTMLCanvasElement) => new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/png'));
