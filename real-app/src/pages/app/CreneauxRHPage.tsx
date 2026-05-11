import React, { useState, useEffect } from 'react';
import {
    Clock, Calendar as CalendarIcon, Plus, Trash2,
    Save, Filter, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button, Card, Spinner } from '../../components/ui';
import { toast } from 'sonner';
import type { HRSlot } from '../../lib/api';
import { listSlots, addSlots, deleteSlot } from '../../lib/api';

export default function CreneauxRHPage() {
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [slots, setSlots] = useState<HRSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New slot form
    const [newSlots, setNewSlots] = useState<{ date: string, start: string, end: string }[]>([]);

    useEffect(() => {
        loadSlots();
    }, []);

    const loadSlots = async () => {
        setLoading(true);
        try {
            const data = await listSlots();
            setSlots(data);
        } catch (err) {
            toast.error("Erreur lors du chargement des créneaux");
        } finally {
            setLoading(false);
        }
    };

    const weekDays = Array.from({ length: 6 }, (_, i) => addDays(currentWeek, i)); // Mon to Sat

    const handleAddSlot = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        setNewSlots([...newSlots, { date: dateStr, start: '09:00', end: '10:00' }]);
    };

    const handleSaveNewSlots = async () => {
        if (newSlots.length === 0) return;
        setSaving(true);
        try {
            await addSlots(newSlots.map(s => ({
                date: s.date,
                start_time: s.start,
                end_time: s.end,
                status: 'free'
            })));
            toast.success("Créneaux enregistrés !");
            setNewSlots([]);
            loadSlots();
        } catch (err) {
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSlot = async (id: string) => {
        try {
            await deleteSlot(id);
            toast.success("Créneau supprimé");
            setSlots(slots.filter(s => s.id !== id));
        } catch (err) {
            toast.error("Erreur lors de la suppression");
        }
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spinner /></div>;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Gestion des Créneaux RH</h1>
                    <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: 0 }}>Définissez vos disponibilités pour les entretiens</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elev)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
                        <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><ChevronLeft size={18} /></button>
                        <span style={{ padding: '4px 12px', fontSize: 14, fontWeight: 700, minWidth: 200, textAlign: 'center' }}>
                            Semaine du {format(currentWeek, 'd MMMM', { locale: fr })}
                        </span>
                        <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><ChevronRight size={18} /></button>
                    </div>
                    {newSlots.length > 0 && (
                        <Button onClick={handleSaveNewSlots} loading={saving} variant="primary">
                            <Save size={16} style={{ marginRight: 8 }} /> Enregistrer ({newSlots.length})
                        </Button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
                {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const daySlots = slots.filter(s => s.date === dateStr);
                    const pendingSlots = newSlots.filter(s => s.date === dateStr);

                    return (
                        <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-elev)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', margin: 0 }}>{format(day, 'EEEE', { locale: fr })}</p>
                                <p style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0' }}>{format(day, 'd')}</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {daySlots.map(s => (
                                    <div key={s.id} style={{
                                        padding: '10px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Clock size={14} style={{ color: s.status === 'reserved' ? 'var(--primary)' : 'var(--fg-subtle)' }} />
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{s.start_time} - {s.end_time}</span>
                                        </div>
                                        {s.status === 'free' ? (
                                            <button onClick={() => handleDeleteSlot(s.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                                <Trash2 size={14} />
                                            </button>
                                        ) : (
                                            <Check size={14} style={{ color: 'var(--success)' }} />
                                        )}
                                    </div>
                                ))}

                                {pendingSlots.map((s, idx) => (
                                    <div key={idx} style={{
                                        padding: '10px', borderRadius: 10, background: 'var(--primary-soft)', border: '1px dashed var(--primary)',
                                        display: 'flex', flexDirection: 'column', gap: 8
                                    }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <input type="time" value={s.start} onChange={e => {
                                                const next = [...newSlots];
                                                const i = next.indexOf(s);
                                                next[i].start = e.target.value;
                                                setNewSlots(next);
                                            }} style={{ flex: 1, fontSize: 11, padding: 2, borderRadius: 4, border: '1px solid var(--border)' }} />
                                            <input type="time" value={s.end} onChange={e => {
                                                const next = [...newSlots];
                                                const i = next.indexOf(s);
                                                next[i].end = e.target.value;
                                                setNewSlots(next);
                                            }} style={{ flex: 1, fontSize: 11, padding: 2, borderRadius: 4, border: '1px solid var(--border)' }} />
                                        </div>
                                        <button onClick={() => setNewSlots(newSlots.filter(x => x !== s))} style={{ fontSize: 10, color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>Annuler</button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => handleAddSlot(day)}
                                    style={{
                                        padding: '10px', borderRadius: 10, background: 'transparent', border: '1px dashed var(--border)',
                                        color: 'var(--fg-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Plus size={14} /> Ajouter
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
