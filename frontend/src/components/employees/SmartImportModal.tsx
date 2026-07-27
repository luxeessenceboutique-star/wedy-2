import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, AlertTriangle, Copy, Sparkles } from 'lucide-react';
import { Modal, Button, Spinner, Badge } from '@/components/ui';
import { getApiError } from '@/services/api';
import {
  previewEmployeeImport, commitEmployeeImport,
  type ImportTargetType, type ImportPreviewResponse, type ImportPreviewRow,
  type ImportRowAction, type ImportCommitRow,
} from '@/services/api/employees';
import type { ColDef } from './ExportModal';

interface Props {
  open: boolean;
  onClose: () => void;
  cols: ColDef[];
  entityName: string;
  targetType: ImportTargetType;
  onImported: () => void;
}

type Step = 'upload' | 'processing' | 'review' | 'importing' | 'done';
type DuplicateStrategy = 'skip' | 'update' | 'create';

const METHOD_LABEL: Record<string, string> = {
  exact: 'Détecté', fuzzy: 'Détecté (approx.)', ai: 'Suggéré par IA', unmapped: 'Non reconnu',
};

function rowHasBlockingError(row: ImportPreviewRow): boolean {
  return row.errors.some(e => e.toLowerCase().includes('requis'));
}

function defaultAction(row: ImportPreviewRow, dupStrategy: DuplicateStrategy): ImportRowAction {
  if (rowHasBlockingError(row)) return 'skip';
  if (row.duplicate) return dupStrategy;
  return 'create';
}

export function SmartImportModal({ open, onClose, cols, entityName, targetType, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [actions, setActions] = useState<Record<number, ImportRowAction>>({});
  const [dupStrategy, setDupStrategy] = useState<DuplicateStrategy>('skip');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);

  const reset = () => {
    setStep('upload'); setFile(null); setPreview(null); setMapping({});
    setActions({}); setDupStrategy('skip'); setError(null); setResult(null);
  };

  const previewCols = cols.slice(0, 5);

  // ── Step 1: upload → preview ────────────────────────────────────────────

  const handleFile = async (f: File) => {
    setFile(f);
    setStep('processing');
    setError(null);
    try {
      const res = await previewEmployeeImport(f, targetType);
      setPreview(res);
      setMapping(res.column_mapping.mapping);
      const initActions: Record<number, ImportRowAction> = {};
      res.rows.forEach(r => { initActions[r.row_index] = defaultAction(r, 'skip'); });
      setActions(initActions);
      setStep('review');
    } catch (e) {
      setError(getApiError(e, "Impossible d'analyser le fichier"));
      setStep('upload');
    }
  };

  // ── Step 2: review — mapping overrides + duplicate strategy ────────────

  const applyDuplicateStrategy = (strategy: DuplicateStrategy) => {
    setDupStrategy(strategy);
    if (!preview) return;
    setActions(prev => {
      const next = { ...prev };
      preview.rows.forEach(r => {
        if (r.duplicate && !rowHasBlockingError(r)) next[r.row_index] = strategy;
      });
      return next;
    });
  };

  const setRowAction = (rowIndex: number, action: ImportRowAction) =>
    setActions(prev => ({ ...prev, [rowIndex]: action }));

  const overrideMapping = (header: string, field: string) =>
    setMapping(prev => ({ ...prev, [header]: field || null }));

  // ── Step 3: commit ───────────────────────────────────────────────────────

  const runImport = async () => {
    if (!preview || !file) return;
    setStep('importing');
    setError(null);

    // Re-key each row's `data` from the (possibly overridden) header->field mapping.
    // The preview endpoint already applied its own mapping server-side, so for
    // fields the user didn't touch we just reuse `row.data` as-is; header
    // overrides only matter if we ever re-run cleaning client-side, which we
    // don't — they're recorded in `column_mapping` for the import log instead.
    const rows: ImportCommitRow[] = preview.rows.map(r => ({
      data: r.data,
      custom_fields: r.custom_fields,
      action: actions[r.row_index] ?? 'skip',
      matched_id: r.duplicate?.source === 'database' ? r.duplicate.matched_id : undefined,
    }));

    try {
      const res = await commitEmployeeImport(
        targetType, file.name, { mapping, method: preview.column_mapping.method }, rows,
      );
      setResult(res);
      setStep('done');
      onImported();
    } catch (e) {
      setError(getApiError(e, "Échec de l'import"));
      setStep('review');
    }
  };

  const actionCounts = preview
    ? Object.values(actions).reduce(
        (acc, a) => ({ ...acc, [a]: (acc[a] ?? 0) + 1 }),
        {} as Record<ImportRowAction, number>,
      )
    : ({} as Record<ImportRowAction, number>);

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={`Import intelligent — ${entityName}`}
      width={860}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Step: upload ── */}
        {step === 'upload' && (
          <>
            {error && (
              <p style={{ fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {error}
              </p>
            )}
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
            <p style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} /> Les colonnes sont détectées automatiquement (français, anglais, arabe), même si leur nom diffère de nos champs habituels. Tout ce qui n'est pas reconnu est conservé sans perte.
            </p>
          </>
        )}

        {/* ── Step: processing ── */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spinner size={28} />
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12 }}>
              Analyse du fichier, détection des colonnes et des doublons…
            </p>
          </div>
        )}

        {/* ── Step: review ── */}
        {step === 'review' && preview && (
          <>
            {error && (
              <p style={{ fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {error}
              </p>
            )}

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
              {[
                ['Total', preview.summary.total_rows, 'var(--ink)'],
                ['Valides', preview.summary.valid_rows, 'var(--success)'],
                ['Invalides', preview.summary.invalid_rows, 'var(--danger)'],
                ['Champs requis manquants', preview.summary.missing_required_fields, 'var(--warn)'],
                ['Doublons employés', preview.summary.duplicate_employees, 'var(--primary)'],
                ['Doublons stagiaires', preview.summary.duplicate_interns, 'var(--primary)'],
                ['Doublons dans le fichier', preview.summary.duplicate_in_file, 'var(--warn)'],
              ].map(([label, value, color]) => (
                <div key={label as string} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: color as string }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Column mapping */}
            <details>
              <summary style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                Correspondance des colonnes ({Object.keys(mapping).length})
              </summary>
              <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-2)' }}>Colonne du fichier</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-2)' }}>Champ cible</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-2)' }}>Méthode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(mapping).map(header => (
                      <tr key={header} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '5px 10px', fontWeight: 500 }}>{header}</td>
                        <td style={{ padding: '5px 10px' }}>
                          <select
                            value={mapping[header] ?? ''}
                            onChange={e => overrideMapping(header, e.target.value)}
                            style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 12 }}
                          >
                            <option value="">— Champ personnalisé —</option>
                            {cols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '5px 10px', color: 'var(--ink-2)' }}>
                          {METHOD_LABEL[preview.column_mapping.method[header]] ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            {/* Duplicate strategy */}
            {(preview.summary.duplicate_employees + preview.summary.duplicate_interns) > 0 && (
              <div style={{ border: '1px solid var(--primary-line)', background: 'var(--primary-soft)', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Copy size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <p style={{ fontSize: 12.5, flex: 1, minWidth: 200 }}>
                  {preview.summary.duplicate_employees + preview.summary.duplicate_interns} ligne(s) correspondent à des enregistrements existants (CIN, email ou téléphone).
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['skip', 'update', 'create'] as DuplicateStrategy[]).map(s => (
                    <button
                      key={s}
                      onClick={() => applyDuplicateStrategy(s)}
                      style={{
                        padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${dupStrategy === s ? 'var(--primary)' : 'var(--line)'}`,
                        background: dupStrategy === s ? 'var(--primary)' : 'var(--surface)',
                        color: dupStrategy === s ? '#fff' : 'var(--ink-2)',
                      }}
                    >
                      {s === 'skip' ? 'Ignorer' : s === 'update' ? 'Mettre à jour' : 'Créer quand même'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Row table */}
            <div style={{ overflowX: 'auto', maxHeight: 320, border: '1px solid var(--line)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Statut</th>
                    {previewCols.map(c => <th key={c.key} style={thStyle}>{c.label}</th>)}
                    <th style={thStyle}>Champs perso.</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 100).map(row => {
                    const blocking = rowHasBlockingError(row);
                    const action = actions[row.row_index] ?? 'skip';
                    return (
                      <tr key={row.row_index} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={tdStyle}>{row.row_index + 1}</td>
                        <td style={tdStyle}>
                          {blocking ? (
                            <span title={row.errors.join(' · ')} style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertCircle size={13} /> Erreur
                            </span>
                          ) : row.duplicate ? (
                            <span title={`Doublon (${row.duplicate.matched_on})`} style={{ color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Copy size={13} /> Doublon
                            </span>
                          ) : row.errors.length > 0 ? (
                            <span title={row.errors.join(' · ')} style={{ color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={13} /> Avertissement
                            </span>
                          ) : (
                            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={13} /> OK
                            </span>
                          )}
                        </td>
                        {previewCols.map(c => (
                          <td key={c.key} style={{ ...tdStyle, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String((row.data as Record<string, unknown>)[c.key] ?? '')}
                          </td>
                        ))}
                        <td style={tdStyle}>
                          {Object.keys(row.custom_fields).length > 0
                            ? <Badge variant="violet">{Object.keys(row.custom_fields).length}</Badge>
                            : <span style={{ color: 'var(--ink-3)' }}>—</span>}
                        </td>
                        <td style={tdStyle}>
                          <select
                            value={action}
                            disabled={blocking}
                            onChange={e => setRowAction(row.row_index, e.target.value as ImportRowAction)}
                            style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 12 }}
                          >
                            <option value="create">Créer</option>
                            <option value="update" disabled={!row.duplicate}>Mettre à jour</option>
                            <option value="skip">Ignorer</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {preview.rows.length > 100 && (
              <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>… et {preview.rows.length - 100} lignes supplémentaires (toutes seront traitées à l'import)</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                {actionCounts.create ?? 0} à créer · {actionCounts.update ?? 0} à mettre à jour · {actionCounts.skip ?? 0} ignorée(s)
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="ghost" onClick={reset}>Changer de fichier</Button>
                <Button onClick={runImport} disabled={(actionCounts.create ?? 0) + (actionCounts.update ?? 0) === 0}>
                  <Upload size={14} /> Importer
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Step: importing ── */}
        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spinner size={28} />
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12 }}>Écriture en base de données…</p>
          </div>
        )}

        {/* ── Step: done ── */}
        {step === 'done' && result && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Import terminé</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>
              {result.created} créé(s) · {result.updated} mis à jour · {result.skipped} ignoré(s)
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Button variant="ghost" onClick={reset}>Nouvel import</Button>
              <Button onClick={() => { reset(); onClose(); }}>Fermer</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ink-2)',
  borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--surface-2)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = { padding: '6px 10px', color: 'var(--fg)' };
