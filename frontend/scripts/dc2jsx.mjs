// Converts a design_handoff_wedy `.dc.html` template into a typed React view.
//
//   node scripts/dc2jsx.mjs "Wedy Employees" --prefix emp --name EmployeesView --out src/pages/app/EmployeesView \
//        --vals "EmployeesVals from ./EmployeesPage" [--keep-shell]
//
// Writes <out>.tsx (the markup with the exact inline styles), <out>.css (the :hover / :focus rules of
// `style-hover` / `style-focus`) and <out>.i18n.json (every UI string found: key -> French text).
// The markup reads its data from a `v` object (the reference's renderVals()), so TypeScript checks that the
// page logic provides every name the template uses. The output is meant to be edited by hand afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Lucide from 'lucide-react';

const here = path.dirname(fileURLToPath(import.meta.url));
const designDir = path.join(here, '..', '..', 'design_handoff_wedy', 'design');

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const file = argv[0];
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : dflt; };
const prefix = opt('prefix', 'x');
const viewName = opt('name', 'View');
const outBase = opt('out', path.join(here, viewName));
const valsSpec = opt('vals', 'Vals from ./Page'); // "TypeName from ./module"
const keepShell = argv.includes('--keep-shell');
if (!file) { console.error('usage: dc2jsx.mjs "Wedy Employees" --prefix emp --name EmployeesView --out src/pages/app/EmployeesView'); process.exit(1); }

const src = fs.readFileSync(path.join(designDir, file.endsWith('.html') ? file : `${file}.dc.html`), 'utf8');
const bodyMatch = src.match(/<x-dc>([\s\S]*?)<\/x-dc>/);
if (!bodyMatch) throw new Error('no <x-dc> block');
let body = bodyMatch[1].replace(/<helmet>[\s\S]*?<\/helmet>/g, '');

// ── tokenizer ────────────────────────────────────────────────────────────────
const VOID = new Set(['img', 'input', 'br', 'hr', 'link', 'meta']);
function parse(s) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  let i = 0;
  const top = () => stack[stack.length - 1];
  while (i < s.length) {
    if (s.startsWith('<!--', i)) { i = s.indexOf('-->', i) + 3; continue; }
    if (s[i] === '<' && /[a-zA-Z/]/.test(s[i + 1] || '')) {
      if (s[i + 1] === '/') {
        const j = s.indexOf('>', i);
        const name = s.slice(i + 2, j).trim();
        const t = stack.pop();
        if (!t || t.tag !== name) throw new Error(`mismatched </${name}> (open <${t && t.tag}>) near: ${s.slice(Math.max(0, i - 80), i + 30)}`);
        i = j + 1; continue;
      }
      let j = i + 1;
      while (/[\w:-]/.test(s[j])) j++;
      const tag = s.slice(i + 1, j);
      const attrs = [];
      let selfClose = false;
      for (;;) {
        while (/\s/.test(s[j])) j++;
        if (s[j] === '>') { j++; break; }
        if (s[j] === '/' && s[j + 1] === '>') { selfClose = true; j += 2; break; }
        let k = j;
        while (k < s.length && !/[\s=>]/.test(s[k]) && !(s[k] === '/' && s[k + 1] === '>')) k++;
        const name = s.slice(j, k);
        j = k;
        if (s[j] === '=') {
          j++;
          let val;
          if (s[j] === '"' || s[j] === "'") { const q = s[j]; const e = s.indexOf(q, j + 1); val = s.slice(j + 1, e); j = e + 1; }
          else { let e = j; while (e < s.length && !/[\s>]/.test(s[e])) e++; val = s.slice(j, e); j = e; }
          attrs.push([name, val]);
        } else attrs.push([name, true]);
      }
      const node = { type: 'el', tag, attrs, children: [] };
      top().children.push(node);
      if (!selfClose && !VOID.has(tag)) stack.push(node);
      i = j; continue;
    }
    let j = i;
    while (j < s.length && !(s[j] === '<' && (/[a-zA-Z/]/.test(s[j + 1] || '') || s.startsWith('<!--', j)))) j++;
    top().children.push({ type: 'text', value: s.slice(i, j) });
    i = j;
  }
  if (stack.length !== 1) throw new Error('unclosed <' + top().tag + '>');
  return root;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', hellip: '…', rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', times: '×', minus: '−', ndash: '–', mdash: '—', bull: '•', rarr: '→', larr: '←', check: '✓', copy: '©', eacute: 'é' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENT[e] ?? m;
});
const q = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
/** JSX attribute string: plain "..." when safe, otherwise {'...'} (JSX attribute strings do not support escapes). */
const attrLit = s => (/["\\&\n]/.test(s) ? `{${q(s)}}` : `"${s}"`);
const hasExpr = s => typeof s === 'string' && s.includes('{{');
const EXPR = /\{\{\s*([\w.]+)\s*\}\}/g;

const loopVars = [];
// loop variables named like the i18n function / the data object get a trailing underscore
const jsLoopName = n => (n === 't' || n === 'v' ? n + '_' : n);
const exprJs = e => {
  const [first, ...rest] = e.split('.');
  return loopVars.includes(first) ? [jsLoopName(first), ...rest].join('.') : 'v.' + e;
};
/** Attribute / style value that may contain {{ }}: returns a JS expression. */
const valueJs = s => {
  const only = s.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
  if (only) return exprJs(only[1]);
  if (!hasExpr(s)) return q(decode(s));
  return '`' + decode(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(EXPR, (_, e) => '${' + exprJs(e) + '}') + '`';
};

const strings = {}; // key -> fr
const byText = new Map();
const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
function stringKey(text) {
  if (byText.has(text)) return byText.get(text);
  let base = slug(text).slice(0, 34).replace(/_[^_]*$/, m => (slug(text).length > 34 ? '' : m)) || 's';
  if (!base) base = 's';
  let key = `${prefix}_${base}`, n = 2;
  while (strings[key] !== undefined) key = `${prefix}_${base}_${n++}`;
  strings[key] = text;
  byText.set(text, key);
  return key;
}
const needsI18n = t => (t.replace(/\{\{[^}]*\}\}/g, '').match(/\p{L}/gu) || []).length >= 3;
let usesTf = false;
/** Literal user-facing text -> JS expression using t() (with placeholders for {{ }}). */
function textJs(raw) {
  const text = decode(raw);
  if (!needsI18n(text)) return hasExpr(text) ? valueJs(raw) : q(text);
  const vars = {};
  const withPh = text.replace(EXPR, (_, e) => { const name = e.replace(/\./g, '_'); vars[name] = exprJs(e); return `{${name}}`; });
  const key = stringKey(withPh);
  if (!Object.keys(vars).length) return `t(${q(key)})`;
  usesTf = true;
  return `tf(t(${q(key)}), { ${Object.entries(vars).map(([k, x]) => `${k}: ${x}`).join(', ')} })`;
}

const camel = n => n.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function splitDecls(style) {
  const out = []; let depth = 0, quote = '', cur = '';
  for (const ch of style) {
    if (quote) { cur += ch; if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map(d => { const i = d.indexOf(':'); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; });
}
const propJs = p => {
  if (p.startsWith('--')) return q(p);
  if (p.startsWith('-webkit-')) return 'Webkit' + camel(p.slice(8)).replace(/^./, c => c.toUpperCase());
  if (p.startsWith('-moz-')) return 'Moz' + camel(p.slice(5)).replace(/^./, c => c.toUpperCase());
  if (p.startsWith('-ms-')) return 'ms' + camel(p.slice(4)).replace(/^./, c => c.toUpperCase());
  return camel(p);
};
let usesCssType = false;
const styleObj = (style, extra = []) => {
  const parts = splitDecls(style).map(([p, v]) => `${propJs(p)}: ${valueJs(v)}`).concat(extra);
  if (!parts.length) return null;
  // custom properties (--dur, --delay, --tx...) are not part of CSSProperties
  if (parts.some(x => x.startsWith("'--"))) { usesCssType = true; return `{{ ${parts.join(', ')} } as CSSProperties}`; }
  return `{{ ${parts.join(', ')} }}`;
};

// hover / focus rules -> classes
const rules = new Map(); // "pseudo|decls" -> class
function ruleClass(pseudo, decls) {
  if (hasExpr(decls)) { console.warn(`! dynamic ${pseudo} style ignored: ${decls}`); return null; }
  const k = pseudo + '|' + decls;
  if (!rules.has(k)) rules.set(k, `${prefix}-${pseudo === 'hover' ? 'h' : 'f'}${rules.size + 1}`);
  return rules.get(k);
}

const ROUTES = {
  'Wedy Landing': '/', 'Wedy Login': '/login', 'Wedy Apply': '/postuler/demo', 'Wedy Dashboard': '/app', 'Wedy Copilot': '/app/copilot',
  'Wedy Employees': '/app/employees', 'Wedy Employee': '/app/employees', 'Wedy Interns': '/app/interns', 'Wedy Requests': '/app/requests',
  'Wedy Recruitment': '/app/recruitment', 'Wedy Candidates': '/app/candidats', 'Wedy Job Posts': '/app/annonces', 'Wedy Planning': '/app/planning-rh',
  'Wedy Performance': '/app/performance', 'Wedy Time Off': '/app/timeoff', 'Wedy Absences': '/app/absences', 'Wedy Payroll': '/app/payroll',
  'Wedy Org Chart': '/app/orgchart', 'Wedy Meetings': '/app/meetings', 'Wedy Onboarding': '/app/onboarding', 'Wedy Training': '/app/training',
  'Wedy Talents': '/app/talents', 'Wedy Tenders': '/app/tenders', 'Wedy Generate': '/app/generate', 'Wedy Templates': '/app/templates',
  'Wedy History': '/app/history', 'Wedy Analytics': '/app/analytics', 'Wedy Audit': '/app/audit', 'Wedy Notifications': '/app/notifications',
  'Wedy Integrations': '/app/integrations', 'Wedy Users': '/app/users', 'Wedy Settings': '/app/settings', 'Wedy Security': '/app/security',
  'Wedy Help': '/app/help', 'Wedy Portal': '/employee', 'Wedy Portal Leave': '/employee/conges', 'Wedy Portal Documents': '/employee/documents',
  'Wedy Portal Training': '/employee/formation', 'Wedy Portal Profile': '/employee/profil',
};
const routeOf = href => { const m = href.match(/^(Wedy [^.#?]*)\.dc\.html(.*)$/); return m && ROUTES[m[1]] ? ROUTES[m[1]] + m[2] : null; };

const lucideImports = new Set();
function iconComponent(name) {
  for (const n of name.split('|')) {
    const pascal = n.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
    if (Lucide[pascal]) { lucideImports.add(pascal); return pascal; }
  }
  console.warn('! lucide icon not found: ' + name);
  return null;
}

const LOOPS = { drift: 'wedy-drift', ping: 'wedy-ping', shine: 'wedy-shine', float: 'wedy-float', spin: 'wedy-spin', 'spin-slow': 'wedy-spin-slow', 'spin-rev': 'wedy-spin-rev', pulse: 'wedy-pulse', dot: 'wedy-dot', shimmer: 'wedy-shimmer', scan: 'wedy-scan' };
const BOOL = new Set(['noValidate', 'disabled', 'required', 'checked', 'multiple', 'readOnly', 'autoFocus', 'hidden', 'selected', 'draggable']);
const ATTR_RENAME = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', colspan: 'colSpan', autocomplete: 'autoComplete', novalidate: 'noValidate', inputmode: 'inputMode', autofocus: 'autoFocus', contenteditable: 'contentEditable', spellcheck: 'spellCheck' };
const CONSUMED = /^(data-(reveal|delay|dur|frac|loop|count|icon|size|sw)|hint-.*|style-hover|style-focus|style|ref)$/;

let usesRV = false, usesCount = false, usesLink = false, usesFragment = false;

// ── JSX emission ─────────────────────────────────────────────────────────────
const pad = d => '  '.repeat(d);

function attrString(node, extraStyle, extraClass) {
  const a = new Map(node.attrs);
  const out = [];
  const classes = [];
  if (extraClass) classes.push(extraClass);
  const hov = a.get('style-hover'), foc = a.get('style-focus');
  if (typeof hov === 'string') { const c = ruleClass('hover', hov); if (c) classes.push(c); }
  if (typeof foc === 'string') { const c = ruleClass('focus', foc); if (c) classes.push(c); }
  const loop = a.get('data-loop');
  const extra = [...(extraStyle || [])];
  if (loop) {
    if (!LOOPS[loop]) console.warn('! unknown loop ' + loop); else classes.push(LOOPS[loop]);
    const dur = a.get('data-dur'), dly = a.get('data-delay');
    if (dur) extra.push(`'--dur': ${q(`${+dur / 1000}s`)}`);
    if (dly) extra.push(`'--delay': ${q(`${+dly / 1000}s`)}`);
  }
  const hasOnChange = a.has('onChange');
  for (const [rawName, val] of node.attrs) {
    if (CONSUMED.test(rawName)) continue;
    let name = ATTR_RENAME[rawName] ?? rawName;
    if (name === 'aria-label' && typeof val === 'string') { out.push(`aria-label={${textJs(val)}}`); continue; }
    if (/^(data|aria)-/.test(name)) { out.push(typeof val === 'string' ? `${name}=${hasExpr(val) ? `{${valueJs(val)}}` : attrLit(decode(val))}` : name); continue; }
    if (name.includes('-')) name = camel(name);
    if (val === true) { out.push(name); continue; }
    if (name === 'href') {
      const r = routeOf(val);
      if (r) { out.push(`to=${attrLit(r)}`); continue; }
      out.push(`href=${hasExpr(val) ? `{${valueJs(val)}}` : attrLit(val)}`); continue;
    }
    if (name === 'src' && val.startsWith('assets/')) { out.push(`src=${attrLit('/' + val.slice(7))}`); continue; }
    if (BOOL.has(name) && val === '') { out.push(name); continue; }
    if (/^on[A-Z]/.test(name)) { out.push(`${name}={${valueJs(val)}}`); continue; }
    if (name === 'value' && !hasExpr(val) && !hasOnChange && /^(input|textarea|select)$/.test(node.tag)) { out.push(`defaultValue=${attrLit(decode(val))}`); continue; }
    if (/^(placeholder|title|alt|aria-label)$/.test(name) && !/^\{\{\s*[\w.]+\s*\}\}$/.test(val)) { out.push(`${name}={${textJs(val)}}`); continue; }
    if (hasExpr(val)) { out.push(`${name}={${valueJs(val)}}`); continue; }
    out.push(`${name}=${attrLit(decode(val))}`);
  }
  const ref = a.get('ref');
  if (ref) out.push(`ref={${valueJs(ref)}}`);
  const st = a.get('style');
  const sObj = styleObj(typeof st === 'string' ? st : '', extra);
  if (sObj) out.push(`style=${sObj.replace(/^\{\{/, '{{').replace(/\}\}$/, '}}')}`);
  if (classes.length) out.push(`className=${attrLit(classes.join(' '))}`);
  return out;
}

function renderChildren(children, depth, parentTag) {
  const out = [];
  children.forEach((c, idx) => {
    if (c.type === 'text') {
      const raw = c.value;
      if (!raw.trim()) { if (!raw.includes('\n') && raw.length) { const prev = children[idx - 1], next = children[idx + 1]; if (prev && next) out.push(pad(depth) + "{' '}"); } return; }
      let t = raw.replace(/\s+/g, ' ');
      const lw = raw.match(/^\s*/)[0], tw = raw.match(/\s*$/)[0];
      const lead = lw.length > 0 && !lw.includes('\n') && !!children[idx - 1];
      const trail = tw.length > 0 && !tw.includes('\n') && !!children[idx + 1];
      t = t.trim();
      if (!t) return;
      const parts = [];
      if (lead) parts.push("{' '}");
      parts.push(`{${textJs(t)}}`);
      if (trail) parts.push("{' '}");
      out.push(pad(depth) + parts.join(''));
      return;
    }
    out.push(renderNode(c, depth));
  });
  return out;
}

function renderNode(n, depth) {
  const a = new Map(n.attrs);
  // sc-if / sc-for
  if (n.tag === 'sc-if') {
    const val = valueJs(a.get('value'));
    const kids = renderChildren(n.children, depth + 1, 'sc-if').join('\n');
    return `${pad(depth)}{${val} ? (\n${pad(depth + 1)}<>\n${kids}\n${pad(depth + 1)}</>\n${pad(depth)}) : null}`;
  }
  if (n.tag === 'sc-for') {
    const list = valueJs(a.get('list'));
    const as = a.get('as');
    usesFragment = true;
    loopVars.push(as);
    const kids = renderChildren(n.children, depth + 2, 'sc-for').join('\n');
    loopVars.pop();
    const js = jsLoopName(as);
    return `${pad(depth)}{${list}.map((${js}, ${js}Index) => (\n${pad(depth + 1)}<Fragment key={${js}Index}>\n${kids}\n${pad(depth + 1)}</Fragment>\n${pad(depth)}))}`;
  }
  if (n.tag === 'dc-import') return '';

  let tag = n.tag;
  const reveal = a.get('data-reveal');
  const count = a.has('data-count');
  const icon = a.get('data-icon');
  let extraStyle = [];
  let head;
  let attrs;

  if (typeof icon === 'string') {
    // <span data-icon="name" data-size=".." style=".."></span>  ->  <span style><Icon size=.. /></span>
    const size = a.get('data-size') ?? '16', sw = a.get('data-sw');
    attrs = attrString(n, extraStyle);
    let inner = '';
    if (hasExpr(icon)) inner = `<${valueJs(icon.match(/\{\{\s*([\w.]+)\s*\}\}/) ? icon : icon)} size={${size}}${sw ? ` strokeWidth={${sw}}` : ''} style={{ display: 'block' }} />`;
    else { const comp = iconComponent(icon); inner = comp ? `<${comp} size={${size}}${sw ? ` strokeWidth={${sw}}` : ''} style={{ display: 'block' }} />` : ''; }
    const open = revealWrap(n, tag, attrs, reveal, a, true);
    return `${pad(depth)}${open.open}${inner}${open.close}`;
  }

  attrs = attrString(n, extraStyle);
  if (tag === 'a' && attrs.some(x => x.startsWith('to='))) { tag = 'Link'; usesLink = true; }
  let openName = tag, closeName = tag, revealAttrs = [];
  if (count) {
    usesCount = true;
    const kid = n.children.find(c => c.type === 'text' && c.value.trim());
    const txt = kid ? kid.value.trim() : '';
    const dly = a.get('data-delay');
    openName = 'CountText'; closeName = null;
    revealAttrs = [`as=${q(tag)}`, `text={${valueJs(txt)}}`];
    if (dly) revealAttrs.push(`delay={${hasExpr(dly) ? `Number(${valueJs(dly)})` : dly}}`);
    return `${pad(depth)}<${openName} ${[...revealAttrs, ...attrs].join(' ')} />`;
  }
  if (reveal !== undefined) {
    usesRV = true;
    const variant = reveal === true || reveal === '' ? 'up' : reveal;
    revealAttrs = [tag === 'Link' ? 'as={Link}' : `as=${q(tag)}`, `variant=${q(variant)}`];
    const dly = a.get('data-delay'), dur = a.get('data-dur'), frac = a.get('data-frac');
    if (dly) revealAttrs.push(`delay={${hasExpr(dly) ? `Number(${valueJs(dly)})` : dly}}`);
    if (dur && !a.get('data-loop')) revealAttrs.push(`duration={${dur}}`);
    if (frac) revealAttrs.push(`frac={${hasExpr(frac) ? `Number(${valueJs(frac)})` : frac}}`);
    openName = 'RV';
    closeName = 'RV';
  }
  const kids = VOID.has(n.tag) ? [] : renderChildren(n.children, depth + 1, n.tag);
  const all = [...revealAttrs, ...attrs];
  const selfClosing = kids.length === 0;
  if (selfClosing) return `${pad(depth)}<${openName}${all.length ? ' ' + all.join(' ') : ''} />`;
  const inline = kids.length === 1 && !kids[0].includes('\n') && kids[0].trim().length < 80 && !kids[0].trim().startsWith('<');
  const closeTag = openName === 'RV' ? 'RV' : tag;
  if (inline) return `${pad(depth)}<${openName}${all.length ? ' ' + all.join(' ') : ''}>${kids[0].trim()}</${closeTag}>`;
  return `${pad(depth)}<${openName}${all.length ? ' ' + all.join(' ') : ''}>\n${kids.filter(Boolean).join('\n')}\n${pad(depth)}</${closeTag}>`;
}

/** Icon spans may also carry data-reveal / data-loop: reuse the generic path. */
function revealWrap(n, tag, attrs, reveal, a) {
  const all = [...attrs];
  if (reveal !== undefined) {
    usesRV = true;
    const variant = reveal === true || reveal === '' ? 'up' : reveal;
    const ra = [`as=${q(tag)}`, `variant=${q(variant)}`];
    const dly = a.get('data-delay');
    if (dly) ra.push(`delay={${hasExpr(dly) ? `Number(${valueJs(dly)})` : dly}}`);
    return { open: `<RV ${[...ra, ...all].join(' ')}>`, close: '</RV>' };
  }
  return { open: `<${tag}${all.length ? ' ' + all.join(' ') : ''}>`, close: `</${tag}>` };
}

// ── shell removal ────────────────────────────────────────────────────────────
function find(node, pred) {
  if (node.type === 'el' && pred(node)) return node;
  for (const c of node.children || []) { const r = find(c, pred); if (r) return r; }
  return null;
}
const hasTag = (node, tag) => !!find(node, x => x.tag === tag);
function stripShell(root) {
  const attr = (x, k) => x.attrs.find(([n]) => n === k)?.[1] || '';
  const isTopbar = x => (x.tag === 'dc-import' && /Topbar|PortalNav/.test(attr(x, 'name')))
    || (x.tag === 'header' && /position:sticky/.test(attr(x, 'style')) && /z-index:(20|30)/.test(attr(x, 'style')));
  const isNav = x => x.tag === 'dc-import' || (x.tag === 'aside' && /width:252px/.test(attr(x, 'style')));
  if (!find(root, x => isTopbar(x) || isNav(x))) return root;
  const rootEl = root.children.find(c => c.type === 'el');
  const orig = rootEl.children.slice();
  const withTopbar = orig.map(c => c.type === 'el' && !!find(c, isTopbar));
  const prune = node => {
    if (!node.children) return;
    node.children = node.children.filter(c => !(c.type === 'el' && (isTopbar(c) || isNav(c))));
    node.children.forEach(prune);
  };
  prune(root);
  const kids = [];
  orig.forEach((c, i) => {
    if (c.type === 'text' || isTopbar(c) || isNav(c)) return;
    if (c.tag === 'aside' && c.children.every(k => k.type === 'text' && !k.value.trim())) return;
    if (withTopbar[i]) kids.push(...c.children);   // main column: keep what is inside
    else kids.push(c);                              // overlays (drawer, toast...)
  });
  return { type: 'root', children: kids };
}

// ── run ──────────────────────────────────────────────────────────────────────
let tree = parse(body);
if (!keepShell) tree = stripShell(tree);
const jsx = renderChildren(tree.children, 3, 'root').filter(Boolean).join('\n');

const [valsType, valsFrom] = valsSpec.split(' from ');
const lucideList = [...lucideImports].sort();
const imports = [
  usesFragment || usesCssType ? `import { ${[usesFragment ? 'Fragment' : '', usesCssType ? 'type CSSProperties' : ''].filter(Boolean).join(', ')} } from 'react';` : '',
  usesLink ? "import { Link } from 'react-router-dom';" : '',
  lucideList.length ? `import { ${lucideList.join(', ')} } from 'lucide-react';` : '',
  usesRV || usesCount ? `import { ${[usesRV ? 'RV' : '', usesCount ? 'CountText' : ''].filter(Boolean).join(', ')} } from '@/components/motion';` : '',
  "import { useLang } from '@/lib/lang';",
  usesTf ? "import { tf } from '@/lib/format';" : '',
  `import type { ${valsType} } from '${valsFrom}';`,
  `import './${path.basename(outBase)}.css';`,
].filter(Boolean).join('\n');

const tsx = `// Generated from design_handoff_wedy/design/${file.replace(/\.dc\.html$/, '')}.dc.html by scripts/dc2jsx.mjs, then edited by hand.
// The markup keeps the reference's exact inline styles; \`v\` is the page logic (the reference's renderVals()).
${imports}

export function ${viewName}({ v }: { v: ${valsType} }) {
  const { t } = useLang();
  return (
    <>
${jsx}
    </>
  );
}
`;
fs.mkdirSync(path.dirname(outBase), { recursive: true });
fs.writeFileSync(outBase + '.tsx', tsx);
const css = [...rules.entries()].map(([k, cls]) => { const [pseudo, decls] = k.split(/\|(.*)/s); return `.${cls}:${pseudo} { ${splitDecls(decls).map(([p, val]) => `${p}: ${val} !important`).join('; ')}; }`; }).join('\n');
fs.writeFileSync(outBase + '.css', `/* hover / focus rules of ${file} (style-hover / style-focus) */\n${css}\n`);
const i18nDir = path.join(here, '.i18n');
fs.mkdirSync(i18nDir, { recursive: true });
fs.writeFileSync(path.join(i18nDir, path.basename(outBase) + '.i18n.json'), JSON.stringify(strings, null, 1));
console.log(`${path.basename(outBase)}.tsx written: ${jsx.split('\n').length} lines, ${Object.keys(strings).length} strings, ${rules.size} hover/focus rules, ${lucideList.length} icons`);
