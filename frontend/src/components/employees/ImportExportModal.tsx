import React, { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal, Button, Spinner } from '@/components/ui';
import { getApiError } from '@/services/api';
import * as XLSX from 'xlsx';

export interface ColDef {
  key: string;
  label: string;
  required?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  cols: ColDef[];
  rows: Record<string, unknown>[];
  entityName: string;
  arrayFields?: string[];
  onCreate: (row: Record<string, unknown>) => Promise<unknown>;
}

interface RowStatus { row: number; status: 'pending' | 'success' | 'error'; message?: string }

const SKIP = '__skip__';

// Robustly parse messy date values → ISO YYYY-MM-DD, or null if unparseable/invalid
function normalizeDate(val: string): string | null {
  const s = val.trim();
  if (!s) return null;

  // Already ISO YYYY-MM-DD — validate (catches impossible dates like Feb 31)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, mo, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCMonth() + 1 === mo ? s : null;
  }

  // Excel serial number (e.g. "45705")
  if (/^\d{5}$/.test(s)) {
    const dt = new Date(Math.round((parseInt(s) - 25569) * 86400_000));
    return isNaN(dt.getTime()) ? null : dt.toISOString().split('T')[0];
  }

  // Strip French "le " prefix then extract first D/M/YYYY pattern anywhere in the string
  const cleaned = s.replace(/^le\s+/i, '');
  const m = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    const day = m[1].padStart(2, '0'), month = m[2].padStart(2, '0'), year = m[3];
    const dt = new Date(Date.UTC(+year, +month - 1, +day));
    return dt.getUTCMonth() + 1 === +month ? `${year}-${month}-${day}` : null;
  }

  return null; // "Non précisé", "A VOIR", etc. → skip field
}

const DATE_FIELD = (key: string) =>
  key.includes('date') || key.endsWith('_start') || key.endsWith('_end');

// Strip accents, lowercase, collapse non-alphanum to spaces
function normalize(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Find the row index that is most likely the header row:
// — first 10 rows, prefer the one with the most non-empty, non-numeric cells
function detectHeaderRowIndex(rawRows: string[][]): number {
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const score = rawRows[i].filter(cell => {
      const s = String(cell ?? '').trim();
      return s.length > 0 && isNaN(Number(s));
    }).length;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

// Try to match a source column header to a target col key using:
// 1. Exact label match
// 2. Exact normalized label match
// 3. Scored word-overlap (unambiguous winner only)
function autoMapHeader(header: string, cols: ColDef[], labelToKey: Record<string, string>): string {
  const trimmed = header.trim();
  if (labelToKey[trimmed]) return labelToKey[trimmed];

  const normH = normalize(trimmed);
  if (!normH) return SKIP;

  // Exact normalized label match
  for (const c of cols) {
    if (normalize(c.label) === normH) return c.key;
  }

  // Word-overlap scoring (words > 2 chars)
  const hWords = normH.split(' ').filter(w => w.length > 2);
  if (hWords.length === 0) return SKIP;

  let bestKey = SKIP;
  let bestScore = 0;

  for (const c of cols) {
    const lWords = normalize(c.label).split(' ').filter(w => w.length > 2);
    const common = hWords.filter(w => lWords.includes(w)).length;
    // Strict improvement only — first match wins on ties (cols are ordered by priority)
    if (common > bestScore) { bestScore = common; bestKey = c.key; }
  }

  return bestScore === 0 ? SKIP : bestKey;
}

// Parse the file and return { headers, dataRows } using the detected header row
function parseFile(
  file: File,
  cols: ColDef[],
  labelToKey: Record<string, string>,
  onResult: (headers: string[], dataRows: Record<string, string>[], initMapping: Record<string, string>) => void,
  onError: () => void,
) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: string[][] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '', header: 1 }) as string[][];

      const hIdx = detectHeaderRowIndex(rawRows);
      const rawHeaders = rawRows[hIdx] ?? [];
      // Build unique, human-readable header names
      const usedNames = new Set<string>();
      const headers = rawHeaders.map((h, i) => {
        const s = String(h ?? '').trim();
        if (!s) return `Colonne ${i + 1}`;
        // deduplicate
        let name = s; let n = 2;
        while (usedNames.has(name)) { name = `${s} (${n++})`; }
        usedNames.add(name);
        return name;
      });

      // Data rows: all rows after the header, skip fully-empty rows
      const dataRows = rawRows.slice(hIdx + 1)
        .filter(row => row.some(c => String(c ?? '').trim() !== ''))
        .map(row => {
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => { obj[h] = String(row[i] ?? ''); });
          return obj;
        });

      // Build initial column mapping with auto-matching
      const initMapping: Record<string, string> = {};
      const usedTargets = new Set<string>();
      headers.forEach(h => {
        const matched = autoMapHeader(h, cols, labelToKey);
        // Avoid mapping two source cols to the same target
        if (matched !== SKIP && usedTargets.has(matched)) {
          initMapping[h] = SKIP;
        } else {
          initMapping[h] = matched;
          if (matched !== SKIP) usedTargets.add(matched);
        }
      });

      onResult(headers, dataRows, initMapping);
    } catch {
      onError();
    }
  };
  reader.readAsArrayBuffer(file);
}

export function ImportExportModal({ open, onClose, cols, rows, entityName, arrayFields = [], onCreate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [colMapping, setColMapping] = useState<Record<string, string>>({});
  const [showMapper, setShowMapper] = useState(false);
  const [statuses, setStatuses] = useState<RowStatus[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const labelToKey = Object.fromEntries(cols.map(c => [c.label, c.key]));

  const reset = () => {
    setHeaders([]); setPreviewRows([]); setColMapping({});
    setShowMapper(false); setStatuses([]); setImporting(false); setDone(false);
  };
  const switchTab = (t: 'export' | 'import') => { setTab(t); reset(); };

  // ── Export ──────────────────────────────────────────────────────────────────

  const buildSheetData = () =>
    rows.map(row => {
      const obj: Record<string, unknown> = {};
      cols.forEach(c => {
        const val = row[c.key];
        obj[c.label] = Array.isArray(val) ? val.join(', ') : (val ?? '');
      });
      return obj;
    });

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(buildSheetData());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${entityName}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSheetData()), entityName);
    XLSX.writeFile(wb, `${entityName}.xlsx`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([cols.map(c => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `modele_${entityName}.xlsx`);
  };

  // ── Import ──────────────────────────────────────────────────────────────────

  const handleFile = (file: File) => {
    reset();
    parseFile(
      file, cols, labelToKey,
      (hdrs, data, initMapping) => {
        setHeaders(hdrs);
        setPreviewRows(data);
        setColMapping(initMapping);
        // Show mapper only if any col is SKIP (i.e. not everything auto-matched)
        const allMapped = hdrs.every(h => initMapping[h] !== SKIP);
        setShowMapper(!allMapped);
      },
      () => alert('Impossible de lire le fichier. Vérifiez le format (CSV ou Excel).'),
    );
  };

  const applyMapping = (raw: Record<string, string>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    headers.forEach(h => {
      const targetKey = colMapping[h];
      if (!targetKey || targetKey === SKIP) return;
      const val = String(raw[h] ?? '').trim();
      if (!val) return;
      if (arrayFields.includes(targetKey)) {
        result[targetKey] = val.split(',').map(s => s.trim()).filter(Boolean);
      } else if (DATE_FIELD(targetKey)) {
        const iso = normalizeDate(val);
        if (iso !== null) result[targetKey] = iso;
        // null → field omitted entirely (DB keeps NULL rather than erroring)
      } else {
        result[targetKey] = val;
      }
    });
    return result;
  };

  const runImport = async () => {
    setImporting(true);
    setStatuses(previewRows.map((_, i) => ({ row: i, status: 'pending' })));
    for (let i = 0; i < previewRows.length; i++) {
      const mapped = applyMapping(previewRows[i]);
      try {
        await onCreate(mapped);
        setStatuses(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'success' } : s));
      } catch (e: unknown) {
        setStatuses(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'error', message: getApiError(e, 'Erreur') } : s));
      }
    }
    setImporting(false);
    setDone(true);
  };

  const requiredMissing = cols.filter(c => c.required && !Object.values(colMapping).includes(c.key));
  const successCount = statuses.filter(s => s.status === 'success').length;
  const errorCount   = statuses.filter(s => s.status === 'error').length;
  const previewCols  = cols.slice(0, 6);
  const sampleRow = previewRows[0] ?? {};

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={`Import / Export — ${entityName}`} width={740}>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', gap: 24, marginBottom: 24 }}>
        {(['export', 'import'] as const).map(t => (
          <button key={t} onClick={() => switchTab(t)} style={{
            padding: '8px 4px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab === t ? 'var(--primary)' : 'var(--ink-2)',
          }}>
            {t === 'export' ? 'Exporter' : 'Importer'}
          </button>
        ))}
      </div>

      {/* ── Export ── */}
      {tab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            Exporte les <strong>{rows.length}</strong> enregistrements affichés ({cols.length} colonnes).
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={exportCsv} variant="soft" style={{ flex: 1 }}>
              <Download size={14} /> Exporter CSV
            </Button>
            <Button onClick={exportExcel} style={{ flex: 1 }}>
              <FileSpreadsheet size={14} /> Exporter Excel (.xlsx)
            </Button>
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 10 }}>
              Pour importer, téléchargez le modèle avec les colonnes attendues, remplissez-le, puis utilisez l'onglet Importer.
            </p>
            <Button variant="ghost" onClick={downloadTemplate}>
              <Download size={13} /> Télécharger le modèle (.xlsx)
            </Button>
          </div>
        </div>
      )}

      {/* ── Import ── */}
      {tab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Step 1 — file picker */}
          {previewRows.length === 0 && (
            <div
              style={{
                border: '2px dashed var(--line)', borderRadius: 12, padding: '40px 24px',
                textAlign: 'center', cursor: 'pointer', color: 'var(--ink-2)',
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload size={32} style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Glissez un fichier CSV ou Excel ici</p>
              <p style={{ fontSize: 12 }}>ou cliquez pour parcourir — .csv, .xlsx, .xls acceptés</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            </div>
          )}

          {/* Step 2a — column mapper */}
          {previewRows.length > 0 && showMapper && !done && (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>Correspondance des colonnes</p>
                  <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0 }}>
                    {previewRows.length} ligne{previewRows.length > 1 ? 's' : ''} détectée{previewRows.length > 1 ? 's' : ''} · associez chaque colonne au champ correspondant.
                  </p>
                </div>
                <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <X size={12} /> Changer de fichier
                </button>
              </div>

              <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', maxHeight: 360, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-2)', borderBottom: '1px solid var(--line)' }}>Colonne fichier</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-2)', borderBottom: '1px solid var(--line)' }}>1ère valeur</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-2)', borderBottom: '1px solid var(--line)' }}>Champ cible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map(h => {
                      const isMapped = colMapping[h] && colMapping[h] !== SKIP;
                      return (
                        <tr key={h} style={{ borderBottom: '1px solid var(--line)', background: isMapped ? 'var(--success-soft, #f0fdf4)' : '' }}>
                          <td style={{ padding: '6px 12px', color: 'var(--fg)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</td>
                          <td style={{ padding: '6px 12px', color: 'var(--ink-2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String(sampleRow[h] ?? '')}
                          </td>
                          <td style={{ padding: '6px 12px' }}>
                            <select
                              value={colMapping[h] ?? SKIP}
                              onChange={e => setColMapping(prev => ({ ...prev, [h]: e.target.value }))}
                              style={{
                                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)',
                                background: 'var(--bg)', color: 'var(--fg)', fontSize: 12, width: '100%',
                              }}
                            >
                              <option value={SKIP}>— Ignorer —</option>
                              {cols.map(c => (
                                <option key={c.key} value={c.key}>
                                  {c.label}{c.required ? ' *' : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {requiredMissing.length > 0 && (
                <p style={{ fontSize: 12, color: 'var(--danger)', margin: '-4px 0' }}>
                  Champs obligatoires non associés : {requiredMissing.map(c => c.label).join(', ')}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={reset}>Annuler</Button>
                <Button onClick={() => setShowMapper(false)} disabled={requiredMissing.length > 0}>
                  Confirmer la correspondance →
                </Button>
              </div>
            </>
          )}

          {/* Step 2b — preview & import */}
          {previewRows.length > 0 && !showMapper && !done && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>
                  {previewRows.length} ligne{previewRows.length > 1 ? 's' : ''} prête{previewRows.length > 1 ? 's' : ''} à importer
                </p>
                {!importing && (
                  <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <X size={12} /> Recommencer
                  </button>
                )}
              </div>

              <div style={{ overflowX: 'auto', maxHeight: 280, border: '1px solid var(--line)', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--surface-2)', whiteSpace: 'nowrap' }}>#</th>
                      {statuses.length > 0 && (
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--surface-2)' }}>Statut</th>
                      )}
                      {previewCols.map(c => (
                        <th key={c.key} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--surface-2)', whiteSpace: 'nowrap' }}>
                          {c.label}{c.required ? ' *' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 50).map((row, i) => {
                      const mapped = applyMapping(row);
                      const st = statuses[i];
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid var(--line)', background: st?.status === 'success' ? '#f0fdf4' : st?.status === 'error' ? '#fff1f2' : '' }}>
                          <td style={{ padding: '6px 10px', color: 'var(--ink-2)' }}>{i + 1}</td>
                          {statuses.length > 0 && (
                            <td style={{ padding: '6px 10px' }}>
                              {st?.status === 'pending' && <Spinner size={14} />}
                              {st?.status === 'success' && <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />}
                              {st?.status === 'error' && <span title={st.message} style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}><AlertCircle size={14} /></span>}
                            </td>
                          )}
                          {previewCols.map(c => (
                            <td key={c.key} style={{ padding: '6px 10px', color: 'var(--fg)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {String(mapped[c.key] ?? '')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {previewRows.length > 50 && (
                <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>… et {previewRows.length - 50} lignes supplémentaires</p>
              )}

              {!importing && statuses.length === 0 && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" onClick={() => setShowMapper(true)}>← Modifier la correspondance</Button>
                  <Button onClick={runImport}>
                    <Upload size={14} /> Importer {previewRows.length} enregistrement{previewRows.length > 1 ? 's' : ''}
                  </Button>
                </div>
              )}
              {importing && (
                <p style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Spinner size={14} /> Import en cours… {statuses.filter(s => s.status !== 'pending').length} / {previewRows.length}
                </p>
              )}
            </>
          )}

          {/* Step 3 — done */}
          {done && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{errorCount === 0 ? '✅' : '⚠️'}</div>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Import terminé</p>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>
                {successCount} succès · {errorCount} erreur{errorCount !== 1 ? 's' : ''}
              </p>
              {errorCount > 0 && (
                <div style={{ textAlign: 'left', maxHeight: 160, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                  {statuses.filter(s => s.status === 'error').map(s => (
                    <p key={s.row} style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 4 }}>
                      Ligne {s.row + 1}: {s.message}
                    </p>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <Button variant="ghost" onClick={reset}>Nouvel import</Button>
                <Button onClick={() => { reset(); onClose(); }}>Fermer</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
