// Bulk restore of employee documents: a folder (or zip) of scans is matched to the people of Wedy and to the file
// records that lost their file. Pure functions only (no React, no network) so the matching can be tested on its own.

export type DocKind = 'cin' | 'cv' | 'contrat' | 'diplome' | 'rib' | 'autre';
export const STANDARD_KINDS: DocKind[] = ['cin', 'cv', 'contrat', 'diplome', 'rib'];

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

/** How close two person names are (0..1): spelling slips (Amar / Ammar, Grida / Gridda), word order and joined words are tolerated. */
export function nameScore(a: string, b: string): number {
  const ta = norm(a).split(' ').filter(Boolean), tb = norm(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const raw = ratio(compact(a), compact(b));
  const sorted = ratio([...ta].sort().join(''), [...tb].sort().join(''));
  return Math.max(raw, sorted);
}

// ── document kind ────────────────────────────────────────────────────────────────────────────────────────

const KIND_WORDS = /\b(cin|cni|carte nationale|rib|releve d identite bancaire|contrat|cdi|cdd|anapec|cv|curriculum vitae|diplome|dipl\w*|attestation|de|reussite|licence|master|bachelor|scan|copie|du|la|le|des|d)\b/g;

export function kindOf(name: string, fileType?: string): DocKind {
  if (fileType === 'cin' || fileType === 'certificat') return 'cin';
  if (fileType === 'cv' || fileType === 'contrat' || fileType === 'diplome') return fileType;
  const n = norm(fixMojibake(name));
  if (/\b(cin|cni)\b|carte nationale/.test(n)) return 'cin';
  if (/\brib\b|releve d identite bancaire|\biban\b/.test(n)) return 'rib';
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

/** The person a label designates, if one is clearly closest (null when nobody is close or two people are as close). */
export function bestPerson(label: string, people: Person[]): Person | null {
  if (norm(label).split(' ').filter(t => t.length > 1).length < 2) return null;
  let best: Person | null = null, bs = 0, second = 0;
  for (const p of people) {
    const s = nameScore(label, p.full_name);
    if (s > bs) { second = bs; bs = s; best = p; } else if (s > second) second = s;
  }
  return bs >= MATCH && bs - second >= 0.04 ? best : null;
}

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
    // the file names someone else than the folder it sits in
    const named = bestPerson(fromName, people);
    if (!chosen && named && named.id !== person.id && nameScore(fromName, person.full_name) < 0.7)
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
    const kinds = STANDARD_KINDS.filter(k => !have.has(k));
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
