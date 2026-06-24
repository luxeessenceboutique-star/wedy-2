import React, { useState, useEffect } from 'react';
import {
    Users, Search, UserPlus, GraduationCap,
    RefreshCw, Mail, Phone, XCircle, Trash2, Plus, X
} from 'lucide-react';
import { Button, Spinner, Avatar, Modal } from '../../components/ui';
import { toast } from 'sonner';
import { useLang } from '../../lib/lang';
import type { Employee } from '../../lib/api';
import { listCandidates, createCandidate, promoteToEmployee, promoteToIntern, deleteCandidate } from '../../lib/api';

// ── Add Candidate Modal ────────────────────────────────────────────────────────

function AddCandidateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({ full_name: '', email: '', phone: '', position: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name.trim()) return;
        setSaving(true);
        try {
            await createCandidate({
                full_name: form.full_name.trim(),
                email: form.email.trim() || undefined,
                phone: form.phone.trim() || undefined,
                position: form.position.trim() || undefined,
                notes: form.notes.trim() || undefined,
            });
            toast.success('Candidat ajouté');
            setForm({ full_name: '', email: '', phone: '', position: '', notes: '' });
            onCreated();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Erreur lors de la création');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Ajouter un candidat" width={480}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>
                        Nom complet <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input className="input" value={form.full_name} onChange={set('full_name')} placeholder="Mohammed El Fassi" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Email</label>
                        <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="email@exemple.com" />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Téléphone</label>
                        <input className="input" value={form.phone} onChange={set('phone')} placeholder="+212 6xx xxx xxx" />
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Poste visé</label>
                    <input className="input" value={form.position} onChange={set('position')} placeholder="Développeur Full Stack" />
                </div>
                <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                    <textarea
                        className="input"
                        value={form.notes}
                        onChange={set('notes')}
                        placeholder="Informations supplémentaires…"
                        rows={3}
                        style={{ resize: 'vertical' }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                    <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
                    <Button type="submit" loading={saving} disabled={!form.full_name.trim()}>
                        <Plus size={14} /> Ajouter
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CandidatsPage() {
    const { t } = useLang();
    const [candidates, setCandidates]   = useState<Employee[]>([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [selectedCand, setSelectedCand] = useState<Employee | null>(null);
    const [promoting, setPromoting]     = useState(false);
    const [showAdd, setShowAdd]         = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await listCandidates();
            setCandidates(Array.isArray(data) ? data : []);
        } catch {
            toast.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Supprimer le candidat "${name}" ?`)) return;
        try {
            await deleteCandidate(id);
            toast.success('Candidat supprimé');
            load();
        } catch {
            toast.error(t('error'));
        }
    };

    const handlePromote = async (cand: Employee, type: 'employee' | 'intern') => {
        setPromoting(true);
        try {
            if (type === 'employee') {
                await promoteToEmployee(cand.id, {
                    hire_date: new Date().toISOString().split('T')[0],
                    position: cand.position || 'Recrue',
                });
                toast.success(`${cand.full_name} promu(e) en employé(e)`);
            } else {
                await promoteToIntern(cand.id, {
                    internship_start: new Date().toISOString().split('T')[0],
                });
                toast.success(`${cand.full_name} promu(e) en stagiaire`);
            }
            load();
            setSelectedCand(null);
        } catch {
            toast.error(t('error'));
        } finally {
            setPromoting(false);
        }
    };

    const filtered = candidates.filter(c =>
        (c.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email    || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.position || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{t('cand_title')}</h1>
                    <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: 0 }}>{t('cand_subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
                        <input
                            className="input"
                            style={{ paddingLeft: 32, width: 220 }}
                            placeholder={t('cand_search_ph')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Button onClick={load} variant="ghost"><RefreshCw size={15} /></Button>
                    <Button onClick={() => setShowAdd(true)}>
                        <Plus size={15} /> Ajouter un candidat
                    </Button>
                </div>
            </div>

            {/* Body */}
            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                    <Spinner />
                </div>
            ) : filtered.length === 0 ? (
                /* Empty state */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={32} style={{ color: 'var(--primary)', opacity: 0.7 }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px', color: 'var(--fg)' }}>
                            {search ? 'Aucun candidat trouvé' : 'Aucun candidat pour le moment'}
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--fg-muted)', margin: 0 }}>
                            {search ? 'Essayez un autre terme de recherche.' : 'Ajoutez votre premier candidat en cliquant sur le bouton ci-dessus.'}
                        </p>
                    </div>
                    {!search && (
                        <Button onClick={() => setShowAdd(true)}>
                            <Plus size={14} /> Ajouter un candidat
                        </Button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
                    {filtered.map(c => (
                        <div key={c.id} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
                            {/* Card header */}
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <Avatar name={c.full_name} size={44} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</p>
                                    <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, margin: 0 }}>{c.position || '—'}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(c.id, c.full_name)}
                                    style={{ background: 'none', border: 'none', padding: 5, cursor: 'pointer', color: 'var(--fg-subtle)', borderRadius: 6, display: 'flex' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-subtle)')}
                                    title="Supprimer"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Contact info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--fg-muted)' }}><Mail size={12} />{c.email}</div>}
                                {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--fg-muted)' }}><Phone size={12} />{c.phone}</div>}
                            </div>

                            {/* Promote actions */}
                            <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                                <Button size="sm" style={{ flex: 1 }} onClick={() => handlePromote(c, 'employee')} loading={promoting && selectedCand?.id === c.id} onMouseEnter={() => setSelectedCand(c)}>
                                    <UserPlus size={13} /> Embaucher
                                </Button>
                                <Button size="sm" variant="ghost" style={{ flex: 1 }} onClick={() => handlePromote(c, 'intern')} loading={promoting && selectedCand?.id === c.id} onMouseEnter={() => setSelectedCand(c)}>
                                    <GraduationCap size={13} /> Stagiaire
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add modal */}
            <AddCandidateModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} />
        </div>
    );
}
