// Bulk restore of employee documents: a folder (or zip) of scans is matched to the people of Wedy and to the file
// records that lost their file. Pure functions only (no React, no network) so the matching can be tested on its own.

export type DocKind = 'cin' | 'cv' | 'contrat' | 'diplome' | 'rib' | 'convention' | 'nda' | 'completion' | 'autre';
/** The documents every employee's folder should hold. */
export const STANDARD_KINDS: DocKind[] = ['cin', 'cv', 'contrat', 'diplome', 'rib'];
/** …and every intern's (the « Documents » tab of an intern: CIN, convention, charte IT / NDA; the CV too). */
export const INTERN_KINDS: DocKind[] = ['cin', 'cv', 'convention', 'nda'];
export const standardKindsFor = (status?: string) => (status === 'intern' ? INTERN_KINDS : STANDARD_KINDS);

export type Person = { id: string; full_name: string; status?: string };
export type FileRecord = { id: string; employee_id: string; name: string; file_type: string; file_path?: string; available: boolean };
/** One document picked by the user: `path` keeps the folders it came from (« EMPLOYES/Nizar Taoussi/CIN Nizar Taoussi.pdf »). */
export type Picked = { key: string; path: string; name: string; size: number };

export type Action =
  | 'restore'    // a record lost its file: the document goes back under it
  | 'add'        // the person has no record of this document: it is added to the folder
  | 'present'    // the record already has its file: nothing to do
  | 'conflict'   // the document names someone else than the folder it is in: to check by hand
  | 'unmatched'; // nobody in Wedy matches the folder / file name

export type PlanItem = {
  pick: Picked; kind: DocKind; action: Action;
  /** the person it goes to (chosen automatically or by hand) */
  personId?: string; personName?: string;
  /** the record it restores / that already holds it */
  recordId?: string; recordName?: string;
  /** who the document itself names, when that is someone else */
  namesOther?: string;
  /** the folder / file label the person was guessed from */
  guessedFrom: string;
};

export type Plan = {
  items: PlanItem[];
  /** records whose file is lost and that nothing picked puts back: still to find */
  stillLost: { record: FileRecord; personName: string }[];
  /** for the people concerned: the standard documents (CIN, CV, contrat, diplôme, RIB) found nowhere */
  missing: { personId: string; personName: string; kinds: DocKind[] }[];
  /** records filed under someone but whose name points to another person */
  misfiled: { record: FileRecord; personName: string; namesOther: string }[];
};

// ── text helpers ─────────────────────────────────────────────────────────────────────────────────────────

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const compact = (s: string) => norm(s).replace(/ /g, '');
const stripExt = (s: string) => s.replace(/\.[a-z0-9]{1,5}$/i, '');

/** Names written in a zip by tools that do not flag UTF-8 come out as « DiplÃ´me »: decode them back when they look like that. */
export function fixMojibake(s: string): string {
  if (!/[ÃÂ][\u0080-ÿ]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from([...s].map(c => c.charCodeAt(0) & 0xff));
    const out = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return out;
  } catch { return s; }
}

function lev(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const ratio = (a: string, b: string) => (a || b ? 1 - lev(a, b) / Math.max(a.length, b.length) : 0);

/** Share of the letters of `text` (spaces removed) that the words of `words` cover, each letter counted once. */
function coverage(text: string, words: string[]): number {
  const s = compact(text);
  if (!s) return 0;
  const hit = new Array<boolean>(s.length).fill(false);
  for (const w of [...words].sort((x, y) => y.length - x.length)) {
    if (w.length < 2) continue;
    for (let i = s.indexOf(w); i >= 0; i = s.indexOf(w, i + 1)) {
      if (hit.slice(i, i + w.length).some(Boolean)) continue;
      for (let k = i; k < i + w.length; k++) hit[k] = true;
      break;
    }
  }
  return hit.filter(Boolean).length / s.length;
}

/** How close two person names are (0..1): spelling slips (Amin / Amine, Karim / Kareem), word order and joined words
 *  (« Salaheddine Elgharabi » = « EL GHARABI Salah eddine ») are tolerated. */
export function nameScore(a: string, b: string): number {
  const ta = norm(a).split(' ').filter(Boolean), tb = norm(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const raw = ratio(compact(a), compact(b));
  const sorted = ratio([...ta].sort().join(''), [...tb].sort().join(''));
  const joined = Math.min(coverage(a, tb), coverage(b, ta)); // every letter of each name found in the words of the other
  return Math.max(raw, sorted, joined);
}

// ── document kind ────────────────────────────────────────────────────────────────────────────────────────

const KIND_WORDS = /\b(cin|cni|carte nationale|rib|releve d identite bancaire|contrat|cdi|cdd|anapec|cv|curriculum vitae|diplome|dipl\w*|attestation|de|reussite|licence|master|bachelor|convention|stage|charte|nda|confidentialite|engagement|it|scan|copie|du|la|le|des|d)\b/g;

export function kindOf(name: string, fileType?: string): DocKind {
  if (fileType === 'cin' || fileType === 'certificat') return 'cin';
  if (fileType === 'cv' || fileType === 'contrat' || fileType === 'diplome' || fileType === 'convention' || fileType === 'nda' || fileType === 'completion') return fileType;
  const n = norm(fixMojibake(name));
  if (/\b(cin|cni)\b|carte nationale/.test(n)) return 'cin';
  if (/\brib\b|releve d identite bancaire|\biban\b/.test(n)) return 'rib';
  if (/\bconvention\b/.test(n)) return 'convention';
  if (/\bcharte\b|\bnda\b|confidentialite|non divulgation/.test(n)) return 'nda';
  if (/attestation de (fin de )?stage|\bcompletion\b/.test(n)) return 'completion';
  if (/\bcontrat\b|\bcdi\b|\bcdd\b/.test(n)) return 'contrat';
  if (/\bcv\b|curriculum/.test(n)) return 'cv';
  if (/\bdipl|attestation de reussite|\breussite\b|\blicence\b|\bmaster\b|\bbachelor\b/.test(n)) return 'diplome';
  return 'autre';
}

/** The `file_type` stored in Wedy for a kind (there is no RIB type: it is kept as « autre » with its name). */
export const fileTypeFor = (k: DocKind) => (k === 'rib' ? 'autre' : k);

/** The person a file name talks about, once the document words are removed (« Contrat CDI Nizar Taoussi.pdf » → « nizar taoussi »). */
export const personInName = (fileName: string) => norm(stripExt(fixMojibake(fileName))).replace(KIND_WORDS, ' ').replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim();

// ── matching ────────────────────────────────────────────────────────────────────────────────────────────

const MATCH = 0.84;

/** Who wins when the same name is there twice (an employee who was an intern first keeps both records): the employee. */
const STATUS_RANK: Record<string, number> = { active: 4, 'on-leave': 3, intern: 2, inactive: 1, terminated: 1, candidate: 0 };
const rankOf = (p: Person) => STATUS_RANK[p.status ?? ''] ?? 1;

/** The person a label designates, if one is clearly closest (null when nobody is close, or when two people are as
 *  close and nothing tells them apart — the same name twice goes to the employee rather than the intern or candidate). */
export function bestPerson(label: string, people: Person[]): Person | null {
  if (norm(label).split(' ').filter(t => t.length > 1).length < 2) return null;
  const scored = people.map(p => ({ p, s: nameScore(label, p.full_name) })).filter(x => x.s >= MATCH).sort((a, b) => b.s - a.s);
  if (!scored.length) return null;
  const top = scored.filter(x => scored[0].s - x.s < 0.04);
  if (top.length === 1) return top[0].p;
  // several people as close: only the same name written the same way may be told apart, by status
  if (top.some(x => compactSorted(x.p.full_name) !== compactSorted(top[0].p.full_name))) return null;
  const byRank = [...top].sort((a, b) => rankOf(b.p) - rankOf(a.p));
  return rankOf(byRank[0].p) > rankOf(byRank[1].p) ? byRank[0].p : null;
}
const compactSorted = (s: string) => norm(s).split(' ').sort().join('');

const GENERIC = /^(employes?|employees?|documents?|dossiers?|fichiers?|scans?|rh|personnel|staff|stagiaires?|interns?|tous|all|copie|copy|backup|archives?|new|nouveau)$/;

/** The folder that names the person: the deepest folder of the path that is not a generic container (« EMPLOYES », « Documents »…). */
export function folderLabel(path: string): string {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  for (let i = parts.length - 1; i >= 0; i--) {
    const toks = norm(parts[i]).split(' ').filter(t => t.length > 1 && !/^\d+$/.test(t)); // « EMPLOYES (2) » → employes
    if (toks.length >= 2 && !toks.every(t => GENERIC.test(t))) return parts[i];
  }
  return '';
}

export function buildPlan(picks: Picked[], people: Person[], records: FileRecord[], manual: Record<string, string> = {}): Plan {
  const byId = new Map(people.map(p => [p.id, p]));
  const recsOf = new Map<string, FileRecord[]>();
  records.forEach(r => { const l = recsOf.get(r.employee_id) ?? []; l.push(r); recsOf.set(r.employee_id, l); });
  const used = new Set<string>();

  // documents of a person already sorted by exact name first, so « CIN Nizar Taoussi.pdf » finds its own record before a same-kind one
  const items: PlanItem[] = picks.map(pick => {
    const kind = kindOf(pick.name);
    const folder = folderLabel(pick.path);
    const fromName = personInName(pick.name);
    const guessedFrom = folder || fromName;
    const chosen = manual[pick.key] ? byId.get(manual[pick.key]) ?? null : null;
    const person = chosen ?? (folder ? bestPerson(folder, people) : null) ?? bestPerson(fromName, people);
    if (!person) return { pick, kind, action: 'unmatched' as Action, guessedFrom };
    // the file names someone else than the folder it sits in (unless this person already has a record of that very name)
    const named = bestPerson(fromName, people);
    const ownRecord = (recsOf.get(person.id) ?? []).some(r => compact(stripExt(r.name)) === compact(stripExt(fixMojibake(pick.name))));
    if (!chosen && !ownRecord && named && named.id !== person.id && nameScore(fromName, person.full_name) < 0.7)
      return { pick, kind, action: 'conflict' as Action, personId: person.id, personName: person.full_name, namesOther: named.full_name, guessedFrom };
    return { pick, kind, action: 'add' as Action, personId: person.id, personName: person.full_name, guessedFrom };
  });

  const pickName = (i: PlanItem) => compact(stripExt(fixMojibake(i.pick.name)));
  // pass 1: a record with the very same name; pass 2: a lost record of the same kind; pass 3: an available one of the same kind
  for (const pass of [1, 2, 3]) {
    for (const it of items) {
      if (it.action !== 'add' || !it.personId) continue;
      const recs = (recsOf.get(it.personId) ?? []).filter(r => !used.has(r.id));
      const hit = pass === 1 ? recs.find(r => compact(stripExt(r.name)) === pickName(it))
        : it.kind === 'autre' ? undefined
          : recs.find(r => kindOf(r.name, r.file_type) === it.kind && (pass === 2 ? !r.available : r.available));
      if (!hit) continue;
      used.add(hit.id);
      Object.assign(it, { recordId: hit.id, recordName: hit.name, action: hit.available ? 'present' : 'restore' });
    }
  }

  // what is still lost, what is missing, what looks filed under the wrong person
  const restored = new Set(items.filter(i => i.action === 'restore').map(i => i.recordId));
  const stillLost = records.filter(r => !r.available && !restored.has(r.id))
    .map(record => ({ record, personName: byId.get(record.employee_id)?.full_name ?? '?' }));

  const concerned = new Set<string>([...items.filter(i => i.personId && i.action !== 'conflict').map(i => i.personId!), ...stillLost.map(s => s.record.employee_id)]);
  const missing: Plan['missing'] = [];
  concerned.forEach(pid => {
    const have = new Set<DocKind>();
    (recsOf.get(pid) ?? []).forEach(r => { if (r.available) have.add(kindOf(r.name, r.file_type)); });
    items.forEach(i => { if (i.personId === pid && (i.action === 'add' || i.action === 'restore' || i.action === 'present')) have.add(i.kind); });
    const kinds = standardKindsFor(byId.get(pid)?.status).filter(k => !have.has(k));
    if (kinds.length) missing.push({ personId: pid, personName: byId.get(pid)?.full_name ?? '?', kinds });
  });
  missing.sort((a, b) => a.personName.localeCompare(b.personName));

  const misfiled: Plan['misfiled'] = [];
  records.forEach(record => {
    const owner = byId.get(record.employee_id); if (!owner) return;
    const label = personInName(record.name);
    const named = bestPerson(label, people);
    if (named && named.id !== owner.id && nameScore(label, owner.full_name) < 0.7) misfiled.push({ record, personName: owner.full_name, namesOther: named.full_name });
  });

  return { items, stillLost, missing, misfiled };
}
