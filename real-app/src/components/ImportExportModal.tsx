import React, { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal, Button, Spinner } from './ui';
import { getApiError } from '../lib/api';
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

export function ImportExportModal({ open, onClose, cols, rows, entityName, arrayFields = [], onCreate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [statuses, setStatuses] = useState<RowStatus[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  // Column mapping state (sourceHeader → targetKey or SKIP)
  const [colMapping, setColMapping] = useState<Record<string, string>>({});
  const [showMapper, setShowMapper] = useState(false);

  const labelToKey = Object.fromEntries(cols.map(c => [c.label, c.key]));

  const reset = () => {
    setPreviewRows([]); setStatuses([]); setImporting(false); setDone(false);
    setColMapping({}); setShowMapper(false);
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
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
        setPreviewRows(parsed);

        if (parsed.length > 0) {
          const sourceHeaders = Object.keys(parsed[0]);
          // Build initial mapping: auto-match by label, otherwise SKIP
          const initial: Record<string, string> = {};
          sourceHeaders.forEach(h => {
            initial[h] = labelToKey[h] ?? SKIP;
          });
          setColMapping(initial);
          // Show mapper only if no header matched at all
          const hasAnyMatch = sourceHeaders.some(h => labelToKey[h]);
          setShowMapper(!hasAnyMatch);
        }
      } catch {
        alert('Impossible de lire le fichier. Vérifiez le format (CSV ou Excel).');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const applyMapping = (raw: Record<string, string>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    Object.entries(raw).forEach(([header, val]) => {
      const targetKey = colMapping[header];
      if (!targetKey || targetKey === SKIP || val === '') return;
      result[targetKey] = arrayFields.includes(targetKey)
        ? String(val).split(',').map(s => s.trim()).filter(Boolean)
        : val;
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

  const successCount = statuses.filter(s => s.status === 'success').length;
  const errorCount   = statuses.filter(s => s.status === 'error').length;
  const previewCols  = cols.slice(0, 6);
  const sourceHeaders = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];
  const sampleRow = previewRows[0] ?? {};

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={`Import / Export — ${entityName}`} width={720}>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 24, marginBottom: 24 }}>
        {(['export', 'import'] as const).map(t => (
          <button key={t} onClick={() => switchTab(t)} style={{
            padding: '8px 4px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab === t ? 'var(--primary)' : 'var(--fg-muted)',
          }}>
            {t === 'export' ? 'Exporter' : 'Importer'}
          </button>
        ))}
      </div>

      {/* Export tab */}
      {tab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            Exporte les <strong>{rows.length}</strong> enregistrements actuellement affichés ({cols.length} colonnes).
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button onClick={exportCsv} variant="soft" style={{ flex: 1 }}>
              <Download size={14} /> Exporter CSV
            </Button>
            <Button onClick={exportExcel} style={{ flex: 1 }}>
              <FileSpreadsheet size={14} /> Exporter Excel (.xlsx)
            </Button>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>
              Pour importer, téléchargez le modèle avec les colonnes attendues, remplissez-le, puis utilisez l'onglet Importer.
            </p>
            <Button variant="ghost" onClick={downloadTemplate}>
              <Download size={13} /> Télécharger le modèle (.xlsx)
            </Button>
          </div>
        </div>
      )}

      {/* Import tab */}
      {tab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Step 1 — file picker */}
          {previewRows.length === 0 && (
            <div
              style={{
                border: '2px dashed var(--border)', borderRadius: 12, padding: '40px 24px',
                textAlign: 'center', cursor: 'pointer', color: 'var(--fg-muted)',
                transition: 'border-color 0.2s',
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

          {/* Step 2a — column mapper (when headers don't match template) */}
          {previewRows.length > 0 && showMapper && !done && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>Correspondance des colonnes</p>
                  <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
                    Associez chaque colonne de votre fichier au champ correspondant.
                  </p>
                </div>
                <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <X size={12} /> Changer de fichier
                </button>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-muted)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}>Colonne fichier</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}>Exemple</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)' }}>Champ cible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceHeaders.map(h => (
                      <tr key={h} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 12px', color: 'var(--fg-muted)', fontFamily: 'monospace', fontSize: 11 }}>{h}</td>
                        <td style={{ padding: '6px 12px', color: 'var(--fg)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String(sampleRow[h] ?? '')}
                        </td>
                        <td style={{ padding: '6px 12px' }}>
                          <select
                            value={colMapping[h] ?? SKIP}
                            onChange={e => setColMapping(prev => ({ ...prev, [h]: e.target.value }))}
                            style={{
                              padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
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
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={reset}>Annuler</Button>
                <Button
                  onClick={() => setShowMapper(false)}
                  disabled={!cols.filter(c => c.required).every(c => Object.values(colMapping).includes(c.key))}
                >
                  Confirmer la correspondance →
                </Button>
              </div>
              {cols.some(c => c.required && !Object.values(colMapping).includes(c.key)) && (
                <p style={{ fontSize: 12, color: 'var(--danger)', textAlign: 'right', marginTop: -8 }}>
                  Champs obligatoires manquants : {cols.filter(c => c.required && !Object.values(colMapping).includes(c.key)).map(c => c.label).join(', ')}
                </p>
              )}
            </>
          )}

          {/* Step 2b — preview */}
          {previewRows.length > 0 && !showMapper && !done && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>
                  {previewRows.length} ligne{previewRows.length > 1 ? 's' : ''} détectée{previewRows.length > 1 ? 's' : ''}
                </p>
                {!importing && (
                  <button onClick={reset} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                  }}>
                    <X size={12} /> Changer de fichier
                  </button>
                )}
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', maxHeight: 280, border: '1px solid var(--border)', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-muted)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--bg-muted)' }}>#</th>
                      {statuses.length > 0 && (
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-muted)' }}>Statut</th>
                      )}
                      {previewCols.map(c => (
                        <th key={c.key} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--fg-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--bg-muted)' }}>
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
                        <tr key={i} style={{
                          borderBottom: '1px solid var(--border)',
                          background: st?.status === 'success' ? '#f0fdf4' : st?.status === 'error' ? '#fff1f2' : '',
                        }}>
                          <td style={{ padding: '6px 10px', color: 'var(--fg-muted)' }}>{i + 1}</td>
                          {statuses.length > 0 && (
                            <td style={{ padding: '6px 10px' }}>
                              {st?.status === 'pending'  && <Spinner size={14} />}
                              {st?.status === 'success'  && <CheckCircle2 size={14} style={{ color: '#10b981' }} />}
                              {st?.status === 'error'    && (
                                <span title={st.message} style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                  <AlertCircle size={14} />
                                </span>
                              )}
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
                <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>… et {previewRows.length - 50} lignes supplémentaires (aperçu limité à 50)</p>
              )}

              {!importing && statuses.length === 0 && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" onClick={reset}>Annuler</Button>
                  <Button onClick={runImport}>
                    <Upload size={14} /> Importer {previewRows.length} enregistrement{previewRows.length > 1 ? 's' : ''}
                  </Button>
                </div>
              )}

              {importing && (
                <p style={{ fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
              <p style={{ fontSize: 14, color: 'var(--fg-muted)', marginBottom: 20 }}>
                {successCount} succès · {errorCount} erreur{errorCount !== 1 ? 's' : ''}
              </p>
              {errorCount > 0 && (
                <div style={{ textAlign: 'left', maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 16 }}>
                  {statuses.filter(s => s.status === 'error').map(s => (
                    <p key={s.row} style={{ fontSize: 12, color: '#ef4444', marginBottom: 4 }}>
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
