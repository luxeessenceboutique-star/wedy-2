// « Restaurer les documents »: HR drops the folder (or the zip, even a zip inside a zip) that holds everyone's scans.
// Each folder / file name is matched to a person of Wedy and each document to the record that lost its file; what is
// put back, added, already there or to check is shown before anything is sent, and what is still missing is listed after.
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { unzipSync } from 'fflate';
import { CheckCircle2, CircleAlert, ClipboardCopy, FolderOpen, FolderUp, RotateCcw, Upload } from 'lucide-react';
import { getApiError, getDocumentsOverview, replaceEmployeeFileContent, uploadEmployeeFile } from '@/services/api';
import { Button, Modal, Spinner } from '@/components/ui';
import { useLang, type TKey } from '@/lib/lang';
import { tf } from '@/lib/format';
import { useNotify } from '@/lib/notify';
import { avatarGradient, initialsOf } from '@/lib/visual';
import { buildPlan, fileTypeFor, fixMojibake, type Action, type DocKind, type Picked, type PlanItem } from '@/lib/docRestore';
import './RestoreDocsModal.css';

const DOC_EXT = /\.(pdf|jpe?g|png|webp|heic|gif|bmp|tiff?|docx?|odt|xlsx?|txt)$/i;
const SKIP = /(^|\/)(__MACOSX|\.[^/]*|Thumbs\.db|desktop\.ini)(\/|$)/i;
const MIME: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const KIND_KEY: Record<DocKind, TKey> = { cin: 'rst_k_cin', cv: 'rst_k_cv', contrat: 'rst_k_contrat', diplome: 'rst_k_diplome', rib: 'rst_k_rib', autre: 'rst_k_autre' };
const ACTION_KEY: Record<Action, TKey> = { restore: 'rst_a_restore', add: 'rst_a_add', present: 'rst_a_present', conflict: 'rst_a_conflict', unmatched: 'rst_a_unmatched' };

type Status = { state: 'run' | 'ok' | 'err'; why?: string };
type Phase = 'pick' | 'reading' | 'review' | 'applying' | 'done';

const base = (p: string) => p.split('/').pop() ?? p;

/** Every document inside a zip, zips inside it included; the path keeps the zip's name as a first folder. */
function unzipAll(bytes: Uint8Array, prefix: string, out: { path: string; file: File }[]) {
  const entries = unzipSync(bytes, { filter: f => !f.name.endsWith('/') && !SKIP.test(f.name) });
  for (const [raw, data] of Object.entries(entries)) {
    const name = fixMojibake(raw);
    if (/\.zip$/i.test(name)) { unzipAll(data, `${prefix}${name.replace(/\.zip$/i, '')}/`, out); continue; }
    if (!DOC_EXT.test(name)) continue;
    const ext = (name.split('.').pop() ?? '').toLowerCase();
    out.push({ path: prefix + name, file: new File([data as BlobPart], base(name), { type: MIME[ext] ?? 'application/octet-stream' }) });
  }
}

/** Files of a dropped folder (the drag-and-drop API walks it entry by entry). */
async function walkEntry(entry: FileSystemEntry, out: { path: string; file: File }[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    out.push({ path: entry.fullPath.replace(/^\//, ''), file });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await walkEntry(e, out);
    }
  }
}

export function RestoreDocsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <RestoreDocsPanel onClose={onClose} /> : null;
}

function RestoreDocsPanel({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLang();
  const notify = useNotify();
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ['documents-overview'], queryFn: getDocumentsOverview, staleTime: 0 });
  const [phase, setPhase] = useState<Phase>('pick');
  const [picked, setPicked] = useState<Picked[]>([]);
  const filesRef = useRef(new Map<string, File>());
  const [ignored, setIgnored] = useState(0);
  const [manual, setManual] = useState<Record<string, string>>({});
  const [off, setOff] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [over, setOver] = useState(false);
  const folderInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);

  const people = useMemo(() => [...(overview.data?.employees ?? [])].sort((a, b) => a.full_name.localeCompare(b.full_name, lang)), [overview.data, lang]);
  const plan = useMemo(() => (overview.data && picked.length ? buildPlan(picked, people, overview.data.files, manual) : null), [overview.data, picked, people, manual]);
  const willSend = (it: PlanItem) => (it.action === 'restore' || it.action === 'add') && !off[it.pick.key];
  const toSend = plan?.items.filter(willSend) ?? [];
  const count = (a: Action) => plan?.items.filter(i => i.action === a).length ?? 0;

  // ── reading what was dropped / chosen ──
  const load = async (getFiles: () => Promise<{ path: string; file: File }[]>) => {
    setPhase('reading');
    await new Promise(r => setTimeout(r, 30)); // let the « reading » state paint before a big zip blocks the thread
    try {
      const raw = await getFiles();
      const docs: { path: string; file: File }[] = [];
      for (const r of raw) {
        if (SKIP.test(r.path)) continue;
        if (/\.zip$/i.test(r.file.name)) unzipAll(new Uint8Array(await r.file.arrayBuffer()), `${r.path.replace(/\.zip$/i, '')}/`, docs);
        else if (DOC_EXT.test(r.file.name)) docs.push(r);
      }
      setIgnored(raw.filter(r => !SKIP.test(r.path) && !/\.zip$/i.test(r.file.name) && !DOC_EXT.test(r.file.name)).length);
      const map = new Map<string, File>();
      const list: Picked[] = docs.map((d, i) => {
        const key = `${i}:${d.path}`;
        map.set(key, d.file);
        return { key, path: d.path, name: fixMojibake(d.file.name), size: d.file.size };
      });
      filesRef.current = map;
      setPicked(list); setManual({}); setOff({}); setStatus({});
      setPhase(list.length ? 'review' : 'pick');
      if (!list.length) notify.warning(t('rst_none'));
    } catch (e) {
      setPhase('pick');
      notify.error(`${t('rst_read_err')} ${e instanceof Error ? e.message : ''}`);
    }
  };
  const fromInput = (e: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    e.target.value = '';
    void load(async () => list.map(file => ({ path: file.webkitRelativePath || file.name, file })));
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setOver(false);
    const entries = Array.from(e.dataTransfer.items ?? []).map(i => i.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
    const plain = Array.from(e.dataTransfer.files);
    void load(async () => {
      if (!entries.length) return plain.map(file => ({ path: file.name, file }));
      const out: { path: string; file: File }[] = [];
      for (const en of entries) await walkEntry(en, out);
      return out;
    });
  };

  // ── sending: two documents at a time, each one on its own ──
  const apply = async () => {
    if (!plan) return;
    const queue = plan.items.filter(willSend);
    setPhase('applying');
    setStatus(Object.fromEntries(queue.map(i => [i.pick.key, { state: 'run' } as Status])));
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const it = queue[next++];
        const src = filesRef.current.get(it.pick.key);
        try {
          if (!src || !it.personId) throw new Error(t('rst_a_unmatched'));
          const file = src.name === it.pick.name ? src : new File([src], it.pick.name, { type: src.type });
          if (it.action === 'restore' && it.recordId) await replaceEmployeeFileContent(it.personId, it.recordId, file);
          else await uploadEmployeeFile(it.personId, file, fileTypeFor(it.kind), '');
          setStatus(s => ({ ...s, [it.pick.key]: { state: 'ok' } }));
        } catch (e) {
          setStatus(s => ({ ...s, [it.pick.key]: { state: 'err', why: getApiError(e, t('error')) } }));
        }
      }
    };
    await Promise.all([worker(), worker()]);
    qc.invalidateQueries({ queryKey: ['employee-files'] });
    qc.invalidateQueries({ queryKey: ['employees'] });
    setPhase('done');
  };
  const results = Object.values(status);
  const okN = results.filter(s => s.state === 'ok').length;
  const errN = results.filter(s => s.state === 'err').length;
  const doneN = okN + errN;

  // after sending, the report is recomputed on fresh data: what was put back no longer shows as lost or missing
  const refresh = async () => { await overview.refetch(); setStatus({}); setPhase('review'); };

  // ── the report of what is still missing, ready to paste in a message ──
  const reportText = () => {
    if (!plan) return '';
    const lines: string[] = [t('rst_r_title'), ''];
    if (plan.missing.length) { lines.push(t('rst_r_missing')); plan.missing.forEach(m => lines.push(`- ${m.personName} : ${m.kinds.map(k => t(KIND_KEY[k])).join(', ')}`)); lines.push(''); }
    if (plan.stillLost.length) { lines.push(t('rst_r_lost')); plan.stillLost.forEach(s => lines.push(`- ${s.personName} : ${s.record.name}`)); lines.push(''); }
    if (plan.misfiled.length) { lines.push(t('rst_r_misfiled')); plan.misfiled.forEach(m => lines.push(`- ${m.record.name} — ${tf(t('rst_in_folder_of'), { name: m.personName })} (${tf(t('rst_names'), { name: m.namesOther })})`)); lines.push(''); }
    const conflicts = plan.items.filter(i => i.action === 'conflict' || i.action === 'unmatched');
    if (conflicts.length) { lines.push(t('rst_r_check')); conflicts.forEach(i => lines.push(`- ${i.pick.path}${i.namesOther ? ` (${tf(t('rst_names'), { name: i.namesOther })})` : ''}`)); }
    return lines.join('\n').trim();
  };
  const copyReport = async () => {
    try { await navigator.clipboard.writeText(reportText()); notify.success(t('rst_copied')); } catch { notify.error(t('error')); }
  };

  // ── grouped by person, people with something to check first ──
  const groups = useMemo(() => {
    if (!plan) return [];
    const m = new Map<string, { id: string; name: string; items: PlanItem[] }>();
    for (const it of plan.items) {
      const id = it.action === 'unmatched' ? '__none' : it.personId!;
      const g = m.get(id) ?? { id, name: it.action === 'unmatched' ? t('rst_unknown') : it.personName!, items: [] };
      g.items.push(it); m.set(id, g);
    }
    const weight = (g: { id: string; items: PlanItem[] }) => (g.id === '__none' ? 0 : g.items.some(i => i.action === 'conflict') ? 1 : 2);
    return [...m.values()].sort((a, b) => weight(a) - weight(b) || a.name.localeCompare(b.name, lang));
  }, [plan, t, lang]);

  const busy = phase === 'applying' || phase === 'reading';
  const footer = phase === 'review' ? (
    <>
      <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => { setPicked([]); setPhase('pick'); }}>{t('rst_other')}</Button>
      <Button icon={<Upload size={15} />} disabled={!toSend.length} onClick={() => void apply()}>{tf(t('rst_apply'), { n: toSend.length })}</Button>
    </>
  ) : phase === 'applying' ? (
    <Button loading disabled>{tf(t('rst_sending'), { done: doneN, total: results.length })}</Button>
  ) : phase === 'done' ? (
    <>
      <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => void refresh()}>{t('rst_refresh')}</Button>
      <Button onClick={onClose}>{t('close')}</Button>
    </>
  ) : null;

  return (
    <Modal open onClose={busy ? () => undefined : onClose} width={940} icon={<FolderUp size={18} />} title={t('rst_title')} subtitle={t('rst_subtitle')} footer={footer}>
      {overview.isError && <div className="rst-warn"><CircleAlert size={15} /><span>{getApiError(overview.error, t('error'))}</span></div>}

      {(phase === 'pick' || phase === 'reading') && (
        <div
          className={`rst-drop${over ? ' over' : ''}`}
          onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
        >
          {phase === 'reading' || overview.isLoading ? <Spinner /> : <span className="ic"><FolderOpen size={24} /></span>}
          <b>{phase === 'reading' ? t('rst_reading') : t('rst_drop')}</b>
          <small>{t('rst_drop_s')}</small>
          {phase === 'pick' && (
            <div className="rst-btns">
              <Button size="sm" icon={<FolderOpen size={14} />} disabled={!overview.data} onClick={() => folderInput.current?.click()}>{t('rst_pick_folder')}</Button>
              <Button size="sm" variant="secondary" icon={<Upload size={14} />} disabled={!overview.data} onClick={() => filesInput.current?.click()}>{t('rst_pick_files')}</Button>
            </div>
          )}
          <input ref={folderInput} type="file" multiple hidden onChange={fromInput} {...{ webkitdirectory: '', directory: '' }} />
          <input ref={filesInput} type="file" multiple hidden accept=".zip,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={fromInput} />
        </div>
      )}

      {plan && phase !== 'pick' && phase !== 'reading' && (
        <>
          <div className="rst-sum">
            <span className="rst-pill restore"><b>{count('restore')}</b>{t('rst_s_restore')}</span>
            <span className="rst-pill add"><b>{count('add')}</b>{t('rst_s_add')}</span>
            <span className="rst-pill present"><b>{count('present')}</b>{t('rst_s_present')}</span>
            {count('conflict') + count('unmatched') > 0 && <span className="rst-pill check"><b>{count('conflict') + count('unmatched')}</b>{t('rst_s_check')}</span>}
            <span className="rst-meta">{tf(t('rst_found'), { n: picked.length, p: groups.filter(g => g.id !== '__none').length })}{ignored ? ` · ${tf(t('rst_ignored'), { n: ignored })}` : ''}</span>
          </div>
          {(phase === 'applying' || phase === 'done') && (
            <div className="rst-progress" aria-live="polite">
              <div className="bar"><i style={{ width: `${results.length ? (doneN / results.length) * 100 : 0}%` }} /></div>
              <span>{phase === 'done' ? tf(t('rst_done'), { ok: okN, err: errN }) : tf(t('rst_sending'), { done: doneN, total: results.length })}</span>
            </div>
          )}

          <div className="rst-body">
          <div className="rst-list">
            {groups.map(g => (
              <section key={g.id} className="rst-group">
                <header>
                  {g.id === '__none'
                    ? <span className="rst-av none"><CircleAlert size={15} /></span>
                    : <span className="rst-av" style={{ background: avatarGradient(g.name) }}>{initialsOf(g.name)}</span>}
                  <b>{g.name}</b>
                  <small>{tf(t('rst_n_docs'), { n: g.items.length })}</small>
                </header>
                {g.items.map(it => {
                  const st = status[it.pick.key];
                  const canSend = it.action === 'restore' || it.action === 'add';
                  const needsPerson = it.action === 'unmatched' || it.action === 'conflict';
                  return (
                    <div key={it.pick.key} className={`rst-row ${it.action}`}>
                      <input type="checkbox" aria-label={it.pick.name} checked={willSend(it)} disabled={!canSend || phase !== 'review'}
                        onChange={() => setOff(o => ({ ...o, [it.pick.key]: !o[it.pick.key] }))} />
                      <div className="nm">
                        <span title={it.pick.path}>{it.pick.name}</span>
                        <small>
                          {t(KIND_KEY[it.kind])}
                          {it.action === 'restore' && it.recordName && ` · ${tf(t('rst_into'), { name: it.recordName })}`}
                          {it.action === 'conflict' && it.namesOther && ` · ${tf(t('rst_names'), { name: it.namesOther })}`}
                          {it.action === 'unmatched' && ` · ${tf(t('rst_from'), { name: it.guessedFrom || it.pick.path })}`}
                        </small>
                      </div>
                      {needsPerson && phase === 'review' ? (
                        <select className="select rst-sel" aria-label={t('rst_choose')} value={manual[it.pick.key] ?? ''} onChange={e => setManual(m => ({ ...m, [it.pick.key]: e.target.value }))}>
                          <option value="">{t('rst_choose')}</option>
                          {people.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                        </select>
                      ) : <span className="rst-ph" />}
                      <span className={`rst-tag ${st?.state ?? it.action}`} title={st?.why}>
                        {st?.state === 'run' ? <Spinner size={10} /> : st?.state === 'ok' ? <CheckCircle2 size={12} /> : st?.state === 'err' ? <CircleAlert size={12} /> : null}
                        {st?.state === 'ok' ? t('rst_t_ok') : st?.state === 'err' ? t('rst_t_err') : st?.state === 'run' ? t('rst_t_run') : t(ACTION_KEY[it.action])}
                      </span>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>

          <div className="rst-report">
            <div className="rst-report-h">
              <b>{t('rst_r_title')}</b>
              <Button size="sm" variant="secondary" icon={<ClipboardCopy size={14} />} onClick={() => void copyReport()}>{t('rst_copy')}</Button>
            </div>
            {!plan.missing.length && !plan.stillLost.length && !plan.misfiled.length && <p className="rst-ok"><CheckCircle2 size={15} />{t('rst_r_none')}</p>}
            {plan.missing.length > 0 && (
              <div className="rst-block">
                <div className="rst-sec">{t('rst_r_missing')} <span>{plan.missing.length}</span></div>
                {plan.missing.map(m => (
                  <div key={m.personId} className="rst-line"><b>{m.personName}</b><span className="rst-kinds">{m.kinds.map(k => <i key={k}>{t(KIND_KEY[k])}</i>)}</span></div>
                ))}
              </div>
            )}
            {plan.stillLost.length > 0 && (
              <div className="rst-block">
                <div className="rst-sec">{t('rst_r_lost')} <span>{plan.stillLost.length}</span></div>
                {plan.stillLost.map(s => <div key={s.record.id} className="rst-line"><b>{s.personName}</b><span>{s.record.name}</span></div>)}
              </div>
            )}
            {plan.misfiled.length > 0 && (
              <div className="rst-block">
                <div className="rst-sec">{t('rst_r_misfiled')} <span>{plan.misfiled.length}</span></div>
                {plan.misfiled.map(m => (
                  <div key={m.record.id} className="rst-line warn"><b>{m.record.name}</b><span>{tf(t('rst_in_folder_of'), { name: m.personName })} · {tf(t('rst_names'), { name: m.namesOther })}</span><Link to={`/app/employees/${m.record.employee_id}`} className="rst-open">{t('rst_open')}</Link></div>
                ))}
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </Modal>
  );
}
