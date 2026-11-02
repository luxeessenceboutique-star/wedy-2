// Fails when fr.ts / en.ts / ar.ts do not define exactly the same keys.
// `t()` silently falls back to French, so a key added to one file only would go unnoticed otherwise.
// Usage: npm run i18n:check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'constants', 'i18n');

/** Top-level keys of `export const x = { ... }`, found by scanning outside of string literals. */
function keysOf(file) {
  const src = fs.readFileSync(path.join(dir, file), 'utf8');
  const keys = [];
  let depth = 0, i = src.indexOf('{');
  while (i < src.length) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch; i++;
      while (i < src.length && src[i] !== q) i += src[i] === '\\' ? 2 : 1;
      i++; continue;
    }
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 2; continue; }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') depth--;
    else if (depth === 1 && /[A-Za-z_$]/.test(ch)) {
      let j = i; while (j < src.length && /[\w$]/.test(src[j])) j++;
      let k = j; while (/\s/.test(src[k])) k++;
      if (src[k] === ':') keys.push(src.slice(i, j));
      i = j; continue;
    }
    i++;
  }
  return keys;
}

const langs = ['fr', 'en', 'ar'];
const sets = Object.fromEntries(langs.map(l => [l, keysOf(`${l}.ts`)]));
let failed = false;
for (const l of langs) {
  const dup = sets[l].filter((k, idx) => sets[l].indexOf(k) !== idx);
  if (dup.length) { failed = true; console.error(`${l}.ts has duplicate keys: ${[...new Set(dup)].join(', ')}`); }
}
for (const l of langs) {
  for (const other of langs.filter(o => o !== l)) {
    const missing = sets[l].filter(k => !sets[other].includes(k));
    if (missing.length) { failed = true; console.error(`${other}.ts is missing ${missing.length} key(s) present in ${l}.ts: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ', …' : ''}`); }
  }
}
console.log(langs.map(l => `${l}: ${sets[l].length} keys`).join(' · '));
if (failed) process.exit(1);
console.log('i18n parity OK');
