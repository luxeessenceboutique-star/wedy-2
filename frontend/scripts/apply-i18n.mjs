// Merges the strings extracted by dc2jsx.mjs with hand-written translations into fr.ts / en.ts / ar.ts.
//
//   node scripts/apply-i18n.mjs scripts/.i18n/EmployeesView.i18n.json scripts/.i18n/emp.tr.txt "Employees"
//
// Translation file, one line per key (French comes from the extracted JSON):
//   emp_exporter = Export || تصدير
// Keys that are not in the JSON (strings the page logic needs) carry their own French text:
//   emp_toast_added = Employé ajouté · {name} || Employee added · {name} || تمت إضافة الموظف · {name}
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, '..', 'src', 'constants', 'i18n');
const [genPath, trPath, label = '', ...sources] = process.argv.slice(2);
const gen = genPath && fs.existsSync(genPath) ? JSON.parse(fs.readFileSync(genPath, 'utf8')) : {};
// keys the hand-edited view / page no longer reference are dropped
if (sources.length) {
  const code = sources.map(f => fs.readFileSync(f, 'utf8')).join('\n');
  for (const k of Object.keys(gen)) if (!code.includes(`'${k}'`)) delete gen[k];
}
const rows = { fr: {}, en: {}, ar: {} };
const lines = fs.readFileSync(trPath, 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
for (const line of lines) {
  const i = line.indexOf(' = ');
  if (i < 0) throw new Error('bad line: ' + line);
  const key = line.slice(0, i).trim();
  const parts = line.slice(i + 3).split(' || ').map(s => s.trim());
  if (key in gen) {
    if (parts.length !== 2) throw new Error(`${key}: expected "en || ar"`);
    rows.fr[key] = gen[key]; [rows.en[key], rows.ar[key]] = parts;
  } else {
    if (parts.length === 2) continue; // an extracted key the hand-edited view no longer uses
    if (parts.length !== 3) throw new Error(`${key}: not in the extracted JSON, expected "fr || en || ar"`);
    [rows.fr[key], rows.en[key], rows.ar[key]] = parts;
  }
}
const missing = Object.keys(gen).filter(k => !(k in rows.fr));
if (missing.length) { console.error('missing translations:\n' + missing.map(k => `${k} = ${gen[k]}`).join('\n')); process.exit(1); }
const q = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
for (const l of ['fr', 'en', 'ar']) {
  const file = path.join(dir, `${l}.ts`);
  let s = fs.readFileSync(file, 'utf8');
  const clash = Object.keys(rows[l]).filter(k => new RegExp(`(^|[\s,{])${k}\s*:`).test(s));
  if (clash.length) throw new Error(`${l}.ts already defines: ${clash.slice(0, 8).join(', ')}`);
  const block = `    // ${label}\n` + Object.entries(rows[l]).map(([k, v]) => `    ${k}: ${q(v)},`).join('\n') + '\n';
  const end = s.lastIndexOf('} as const;');
  fs.writeFileSync(file, s.slice(0, end) + block + s.slice(end));
}
console.log(`${Object.keys(rows.fr).length} keys added to fr/en/ar (${label})`);
