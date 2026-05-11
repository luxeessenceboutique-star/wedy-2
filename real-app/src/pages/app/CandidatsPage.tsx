import React, { useState, useEffect } from 'react';
import {
    Users, Search, UserPlus, GraduationCap, Eye,
    Filter, RefreshCw, Mail, Phone, MapPin,
    Calendar, CheckCircle, XCircle, MoreVertical, Trash2
} from 'lucide-react';
import { Button, Card, Spinner, Avatar } from '../../components/ui';
import { toast } from 'sonner';
import type { Employee } from '../../lib/api';
import { listCandidates, promoteToEmployee, promoteToIntern, deleteCandidate } from '../../lib/api';

export default function CandidatsPage() {
    const [candidates, setCandidates] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCand, setSelectedCand] = useState<Employee | null>(null);
    const [promoting, setPromoting] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await listCandidates();
            setCandidates(data);
        } catch (err) {
            toast.error("Erreur lors du chargement");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le candidat ${name} ?`)) return;
        try {
            await deleteCandidate(id);
            toast.success("Candidat supprimé");
            load();
        } catch (err) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const handlePromote = async (type: 'employee' | 'intern') => {
        if (!selectedCand) return;
        setPromoting(true);
        try {
            if (type === 'employee') {
                await promoteToEmployee(selectedCand.id, {
                    hire_date: new Date().toISOString().split('T')[0],
                    position: selectedCand.position || 'Recrue'
                });
            } else {
                await promoteToIntern(selectedCand.id, {
                    internship_start: new Date().toISOString().split('T')[0]
                });
            }
            toast.success(`${selectedCand.full_name} a été promu avec succès !`);
            load();
            setSelectedCand(null);
        } catch (err) {
            toast.error("Erreur lors de la promotion");
        } finally {
            setPromoting(false);
        }
    };

    const filtered = candidates.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.position?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spinner /></div>;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Gestion des Candidats</h1>
                    <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: 0 }}>Pool de talents et pipeline de recrutement</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                        <input
                            className="input"
                            style={{ paddingLeft: 38, width: 260 }}
                            placeholder="Rechercher un candidat..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Button onClick={load} variant="ghost"><RefreshCw size={16} /></Button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {filtered.map(c => (
                    <Card key={c.id} className="flex flex-col gap-4">
                        <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
                            <Avatar name={c.full_name} size={48} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</h3>
                                <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, margin: 0 }}>{c.position || 'Poste non spécifié'}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => setSelectedCand(c)} style={{ background: 'var(--bg-muted)', border: 'none', padding: 6, borderRadius: 8, cursor: 'pointer', color: 'var(--fg-muted)' }} title="Voir détails"><Eye size={14} /></button>
                                <button onClick={() => handleDelete(c.id, c.full_name)} style={{ background: 'var(--error-soft)', border: 'none', padding: 6, borderRadius: 8, cursor: 'pointer', color: 'var(--error)' }} title="Supprimer"><Trash2 size={14} /></button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--fg-muted)' }}><Mail size={12} /> {c.email}</div>}
                            {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--fg-muted)' }}><Phone size={12} /> {c.phone}</div>}
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                            <Button size="sm" style={{ flex: 1 }} onClick={() => { setSelectedCand(c); handlePromote('employee'); }} loading={promoting && selectedCand?.id === c.id}>
                                <UserPlus size={14} style={{ marginRight: 6 }} /> Engager
                            </Button>
                            <Button size="sm" variant="ghost" style={{ flex: 1 }} onClick={() => { setSelectedCand(c); handlePromote('intern'); }}>
                                <GraduationCap size={14} style={{ marginRight: 6 }} /> Stagiaire
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {selectedCand && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setSelectedCand(null)}>
                    <div style={{ background: 'var(--bg-elev)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Profil Candidat</h2>
                            <button onClick={() => setSelectedCand(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={20} style={{ color: 'var(--fg-muted)' }} /></button>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                            <Avatar name={selectedCand.full_name} size={64} />
                            <div>
                                <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{selectedCand.full_name}</h3>
                                <p style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedCand.position}</p>
                            </div>
                        </div>
                        {/* More details here if needed */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <Button style={{ flex: 1 }} variant="primary" onClick={() => handlePromote('employee')}>Promouvoir en Employé</Button>
                            <Button style={{ flex: 1 }} variant="ghost" onClick={() => handlePromote('intern')}>Promouvoir en Stagiaire</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
