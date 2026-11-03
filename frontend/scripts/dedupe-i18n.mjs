// Removes earlier duplicates of one-key-per-line entries in fr.ts / en.ts / ar.ts (the last definition wins),
// so re-running apply-i18n.mjs after editing translations is safe.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'constants', 'i18n');
for (const f of ['fr.ts', 'en.ts', 'ar.ts']) {
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
  const last = new Map();
  lines.forEach((l, i) => { const m = l.match(/^\s{4}([A-Za-z_$][\w$]*):\s/); if (m && !/,\s*[A-Za-z_$][\w$]*:\s/.test(l.replace(/'(?:[^'\\]|\\.)*'/g, "''"))) last.set(m[1], i); });
  const out = lines.filter((l, i) => { const m = l.match(/^\s{4}([A-Za-z_$][\w$]*):\s/); return !(m && last.has(m[1]) && last.get(m[1]) !== i); });
  fs.writeFileSync(path.join(dir, f), out.join('\n'));
  console.log(f, lines.length - out.length, 'duplicates removed');
}
