// A small, safe markdown renderer for the agents' answers: paragraphs, headings, bullet / numbered lists, tables,
// **bold**, *italic*, `code` and links. Builds React nodes only (no HTML injection).
import { Fragment, type ReactNode } from 'react';

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const k = `${key}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={k} className="cop-code">{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={k}>{part.slice(1, -1)}</em>;
    const m = /^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)$/.exec(part);
    if (m) return <a key={k} href={m[2]} target={m[2].startsWith('/') ? undefined : '_blank'} rel="noreferrer" className="cop-a">{m[1]}</a>;
    return <Fragment key={k}>{part}</Fragment>;
  });
}

const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const out: ReactNode[] = [];
  let i = 0, n = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const key = `b${n++}`;
    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isRow(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        <div key={key} className="cop-table-wrap"><table className="cop-table">
          <thead><tr>{head.map((h, c) => <th key={c}>{inline(h, `${key}h${c}`)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `${key}r${ri}c${ci}`)}</td>)}</tr>)}</tbody>
        </table></div>,
      );
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { out.push(<div key={key} className="cop-h">{inline(h[2], key)}</div>); i++; continue; }
    if (/^\s*([-*•–])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•–])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•–])\s+/, ''));
      out.push(<ul key={key} className="cop-ul">{items.map((it, k) => <li key={k}>{inline(it, `${key}-${k}`)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      out.push(<ol key={key} className="cop-ul">{items.map((it, k) => <li key={k}>{inline(it, `${key}-${k}`)}</li>)}</ol>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isRow(lines[i]) && !/^(#{1,4})\s+/.test(lines[i]) && !/^\s*([-*•–]|\d+[.)])\s+/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={key} className="cop-p">{para.map((l, k) => <Fragment key={k}>{k > 0 && <br />}{inline(l, `${key}-${k}`)}</Fragment>)}</p>);
  }
  return <>{out}</>;
}
