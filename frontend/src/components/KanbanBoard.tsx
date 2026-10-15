import React, { useState } from 'react';

export type KanbanColumn = { id: string; label: string; color?: string };

/**
 * Generic Kanban board with native drag & drop (no dependency).
 * - Items whose column is unknown fall into an extra, non-droppable "Autre" column.
 * - Without `onMove`, the board is read-only (cards are not draggable).
 */
export function KanbanBoard<T>({
  columns, items, getId, getColumn, renderCard, onMove, onOpen,
}: {
  columns: KanbanColumn[];
  items: T[];
  getId: (item: T) => string;
  getColumn: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onMove?: (item: T, toColumn: string) => void;
  onOpen?: (item: T) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const known = new Set(columns.map(c => c.id));
  const orphans = items.filter(i => !known.has(getColumn(i)));
  const cols: (KanbanColumn & { droppable: boolean })[] = [
    ...columns.map(c => ({ ...c, droppable: true })),
    ...(orphans.length ? [{ id: '__other__', label: 'Autre', color: 'var(--ink-3)', droppable: false }] : []),
  ];

  const reset = () => { setDragId(null); setOverCol(null); };

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
      {cols.map(col => {
        const colItems = col.id === '__other__' ? orphans : items.filter(i => getColumn(i) === col.id);
        const isOver = overCol === col.id && !!dragId && col.droppable;
        return (
          <div key={col.id}
            onDragOver={e => { if (onMove && dragId && col.droppable) { e.preventDefault(); if (overCol !== col.id) setOverCol(col.id); } }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(c => (c === col.id ? null : c)); }}
            onDrop={e => {
              e.preventDefault();
              const item = items.find(i => getId(i) === dragId);
              if (item && onMove && col.droppable && getColumn(item) !== col.id) onMove(item, col.id);
              reset();
            }}
            style={{
              flex: '0 0 290px', minWidth: 290, display: 'flex', flexDirection: 'column',
              background: isOver ? 'var(--primary-soft)' : 'var(--surface-2)',
              border: `1px solid ${isOver ? 'var(--primary)' : 'var(--line)'}`,
              borderRadius: 12, maxHeight: 'calc(100vh - 260px)', transition: 'background .12s, border-color .12s',
            }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
              borderBottom: '1px solid var(--line)', position: 'sticky', top: 0,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color ?? 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '1px 8px' }}>
                {colItems.length}
              </span>
            </div>

            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 60 }}>
              {colItems.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', padding: '14px 6px', border: '1px dashed var(--line)', borderRadius: 8 }}>
                  {onMove && col.droppable ? 'Déposez une carte ici' : 'Aucun élément'}
                </div>
              )}
              {colItems.map(item => {
                const id = getId(item);
                return (
                  <div key={id}
                    draggable={!!onMove}
                    onDragStart={e => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); }}
                    onDragEnd={reset}
                    onClick={() => onOpen?.(item)}
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 12,
                      cursor: onMove ? 'grab' : onOpen ? 'pointer' : 'default',
                      opacity: dragId === id ? 0.45 : 1, boxShadow: 'var(--shadow-sm)',
                    }}>
                    {renderCard(item)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
