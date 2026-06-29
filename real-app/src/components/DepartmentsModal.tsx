import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Building2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listDepartments, createDepartment, updateDepartment, deleteDepartment, getApiError } from '../lib/api';
import { Modal, Button, Spinner } from './ui';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DepartmentsModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: () => createDepartment({ name: newName.trim(), description: newDesc.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      setNewName('');
      setNewDesc('');
      toast.success('Département créé');
    },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur lors de la création')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateDepartment(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      setEditingId(null);
      toast.success('Département modifié');
    },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur lors de la modification')),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Département supprimé'); },
    onError: (e: any) => toast.error(getApiError(e, 'Erreur lors de la suppression')),
  });

  const startEdit = (dept: { id: string; name: string }) => { setEditingId(dept.id); setEditName(dept.name); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); };
  const saveEdit = () => {
    if (editName.trim() && editingId) updateMut.mutate({ id: editingId, name: editName.trim() });
  };

  return (
    <Modal open={open} onClose={onClose} title="Gérer les départements" width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Department list */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
        ) : departments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center', padding: '16px 0' }}>
            Aucun département. Ajoutez-en un ci-dessous.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
            {departments.map(dept => (
              <div key={dept.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8,
              }}>
                <Building2 size={14} style={{ color: 'var(--primary)', flexShrink: 0, opacity: 0.7 }} />

                {editingId === dept.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      style={{
                        flex: 1, border: '1px solid var(--primary)', borderRadius: 6,
                        padding: '4px 8px', fontSize: 13, outline: 'none', background: 'var(--bg-elev)',
                      }}
                    />
                    <button onClick={saveEdit} disabled={updateMut.isPending}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: 3, display: 'flex' }}>
                      <Check size={15} />
                    </button>
                    <button onClick={cancelEdit}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 3, display: 'flex' }}>
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{dept.name}</span>
                    {dept.description && (
                      <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginRight: 4 }}>{dept.description}</span>
                    )}
                    <button onClick={() => startEdit(dept)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 3, display: 'flex' }}>
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Supprimer le département "${dept.name}" ?`)) deleteMut.mutate(dept.id); }}
                      disabled={deleteMut.isPending}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 3, display: 'flex' }}>
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            Ajouter un département
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMut.mutate(); }}
              placeholder="Nom du département *"
              style={{
                flex: 2, border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--bg-elev)',
              }}
            />
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMut.mutate(); }}
              placeholder="Description (optionnel)"
              style={{
                flex: 3, border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--bg-elev)',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => { if (newName.trim()) createMut.mutate(); }} loading={createMut.isPending} disabled={!newName.trim()}>
              <Plus size={14} /> Ajouter
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
