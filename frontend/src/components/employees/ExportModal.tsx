import { Download, FileSpreadsheet } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
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
}

/** Export the given rows to CSV/Excel, or download a blank template with the expected columns. */
export function ExportModal({ open, onClose, cols, rows, entityName }: Props) {
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

  return (
    <Modal open={open} onClose={onClose} title={`Exporter — ${entityName}`} width={520}>
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
            Pour importer, téléchargez le modèle avec les colonnes attendues, remplissez-le, puis utilisez le bouton Importer.
          </p>
          <Button variant="ghost" onClick={downloadTemplate}>
            <Download size={13} /> Télécharger le modèle (.xlsx)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
