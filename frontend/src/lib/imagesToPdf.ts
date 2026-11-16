// A PDF made of JPEG pages, written by hand (no library): one page per photo, the page as wide as an A4 sheet and as
// tall as the photo's proportions ask. JPEG data goes in as is (DCTDecode), so nothing is re-encoded.

export interface JpegPage {
  bytes: Uint8Array;
  width: number;   // pixels
  height: number;  // pixels
}

const A4_WIDTH_PT = 595.28;

export function imagesToPdf(pages: JpegPage[]): Blob {
  if (!pages.length) throw new Error('No page');
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const put = (chunk: string | Uint8Array) => {
    const b = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(b);
    size += b.length;
  };
  const obj = (n: number, body: string | (() => void)) => {
    offsets[n] = size;
    put(`${n} 0 obj\n`);
    if (typeof body === 'string') put(body); else body();
    put('\nendobj\n');
  };

  // objects: 1 catalog, 2 page tree, then per page: page, image, content stream
  const pageNo = (i: number) => 3 + i * 3;
  put('%PDF-1.4\n%âãÏÓ\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageNo(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((p, i) => {
    const w = A4_WIDTH_PT;
    const h = Math.round((A4_WIDTH_PT * p.height / p.width) * 100) / 100;
    const n = pageNo(i);
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${n + 1} 0 R >> >> /Contents ${n + 2} 0 R >>`);
    obj(n + 1, () => {
      put(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);
      put(p.bytes);
      put('\nendstream');
    });
    const draw = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    obj(n + 2, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  });

  const count = 3 + pages.length * 3;
  const xref = size;
  put(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) put(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  put(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}
