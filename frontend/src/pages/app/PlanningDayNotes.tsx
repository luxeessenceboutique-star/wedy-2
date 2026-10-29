import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { StickyNote, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
    createPlanningNote, updatePlanningNote, deletePlanningNote, getApiError, type PlanningNote,
} from '@/services/api';

/** Notes of one day of the Planning RH: write, edit and delete, shared by the whole HR team. */
export default function PlanningDayNotes({ date, notes }: { date: Date; notes: PlanningNote[] }) {
    const qc = useQueryClient();
    const day = format(date, 'yyyy-MM-dd');
    const [draft, setDraft] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const refresh = () => qc.invalidateQueries({ queryKey: ['planning-notes'] });
    const fail = (e: unknown) => toast.error(getApiError(e, 'Opération impossible'));

    const add = useMutation({
        mutationFn: (content: string) => createPlanningNote({ note_date: day, content }),
        onSuccess: () => { setDraft(''); refresh(); toast.success('Note ajoutée'); },
        onError: fail,
    });
    const save = useMutation({
        mutationFn: ({ id, content }: { id: string; content: string }) => updatePlanningNote(id, content),
        onSuccess: () => { setEditingId(null); refresh(); toast.success('Note modifiée'); },
        onError: fail,
    });
    const remove = useMutation({
        mutationFn: (id: string) => deletePlanningNote(id),
        onSuccess: () => { refresh(); toast.success('Note supprimée'); },
        onError: fail,
    });

    const submit = () => { const v = draft.trim(); if (v && !add.isPending) add.mutate(v); };
    const submitEdit = () => {
        const v = editValue.trim();
        if (editingId && v && !save.isPending) save.mutate({ id: editingId, content: v });
    };
    const askDelete = (n: PlanningNote) => {
        const preview = n.content.length > 60 ? `${n.content.slice(0, 60)}…` : n.content;
        if (window.confirm(`Supprimer cette note ?\n\n« ${preview} »`)) remove.mutate(n.id);
    };

    return (
        <div className="card" style={{ borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <StickyNote size={18} style={{ color: 'var(--warn)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, flex: 1 }}>Notes du jour</h3>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>{notes.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: notes.length ? 16 : 0 }}>
                <textarea className="textarea" rows={3} value={draft} placeholder="Écrire une note pour cette journée…  (Ctrl + Entrée pour ajouter)"
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
                    style={{ width: '100%', resize: 'vertical', fontSize: 14 }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary btn-sm" disabled={!draft.trim() || add.isPending} onClick={submit}>
                        {add.isPending ? 'Ajout…' : 'Ajouter la note'}
                    </button>
                </div>
            </div>

            {notes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {notes.map(n => {
                        const editing = editingId === n.id;
                        return (
                            <div key={n.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--warn-soft)', border: '1px solid var(--warn)' }}>
                                {editing ? (
                                    <>
                                        <textarea className="textarea" rows={3} autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitEdit(); }
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            style={{ width: '100%', resize: 'vertical', fontSize: 14 }} />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}><X size={13} /> Annuler</button>
                                            <button className="btn btn-primary btn-sm" disabled={!editValue.trim() || save.isPending} onClick={submitEdit}>
                                                <Check size={13} /> Enregistrer
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, color: 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.content}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                                                {n.created_by_name || 'RH'} · {format(parseISO(n.created_at), 'dd/MM/yyyy HH:mm')}
                                                {n.updated_at && n.updated_at.slice(0, 19) !== n.created_at.slice(0, 19) ? ' · modifiée' : ''}
                                            </div>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" title="Modifier la note" onClick={() => { setEditingId(n.id); setEditValue(n.content); }}>
                                            <Pencil size={13} />
                                        </button>
                                        <button className="btn btn-ghost btn-sm" title="Supprimer la note" style={{ color: 'var(--danger)' }}
                                            disabled={remove.isPending && remove.variables === n.id} onClick={() => askDelete(n)}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
