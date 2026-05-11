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

    const [newSlots, setNewSlots] = useState<{ date: string, start: string, end: string }[]>([]);
    const [bulkMode, setBulkMode] = useState<{ date: Date | null, start: string, end: string, duration: number }>({
        date: null,
        start: '09:00',
        end: '12:00',
        duration: 30
    });

    useEffect(() => {
        loadSlots();
    }, []);

    const loadSlots = async () => {
        setLoading(true);
        try {
            // Add a cache-buster timestamp
            const data = await listSlots({ _t: Date.now() } as any);
            console.log('[DEBUG] Loaded slots:', data);
            setSlots(data);
        } catch (err: any) {
            console.error('[DEBUG] loadSlots error:', err);
            toast.error("Erreur lors du chargement des créneaux: " + (err.message || "Inconnue"));
        } finally {
            setLoading(false);
        }
    };

    const weekDays = Array.from({ length: 6 }, (_, i) => addDays(currentWeek, i)); // Mon to Sat

    const handleAddSlot = (date: Date) => {
        setBulkMode({ ...bulkMode, date });
    };

    const generateSlots = () => {
        if (!bulkMode.date) return;

        const { start, end, duration, date } = bulkMode;
        const dateStr = format(date, 'yyyy-MM-dd');

        const [hStart, mStart] = start.split(':').map(Number);
        const [hEnd, mEnd] = end.split(':').map(Number);

        let currentMinutes = hStart * 60 + mStart;
        const endMinutes = hEnd * 60 + mEnd;

        if (currentMinutes >= endMinutes) {
            toast.error("L'heure de fin doit être après l'heure de début");
            return;
        }

        const generated: { date: string, start: string, end: string }[] = [];

        while (currentMinutes + duration <= endMinutes) {
            const h = Math.floor(currentMinutes / 60);
            const m = currentMinutes % 60;
            const hNext = Math.floor((currentMinutes + duration) / 60);
            const mNext = (currentMinutes + duration) % 60;

            const timeStart = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            const timeEnd = `${hNext.toString().padStart(2, '0')}:${mNext.toString().padStart(2, '0')}`;

            generated.push({ date: dateStr, start: timeStart, end: timeEnd });
            currentMinutes += duration;
        }

        setNewSlots([...newSlots, ...generated]);
        setBulkMode({ ...bulkMode, date: null });
        toast.success(`${generated.length} créneaux générés !`);
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

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Spinner /></div>;

    return (
        <div style={{ padding: 24, minHeight: '100vh', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--fg)' }}>Gestion des Créneaux RH</h1>
                    <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: '4px 0 0' }}>Définissez vos disponibilités pour les entretiens</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elev)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
                        <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><ChevronLeft size={18} /></button>
                        <span style={{ padding: '4px 12px', fontSize: 14, fontWeight: 700, minWidth: 200, textAlign: 'center', color: 'var(--fg)' }}>
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

            {bulkMode.date && (
                <div style={{
                    marginBottom: 24, padding: 20, background: 'var(--primary-soft)', border: '1px solid var(--primary)', borderRadius: 12,
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CalendarIcon size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{format(bulkMode.date, 'EEEE d MMMM', { locale: fr })}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} style={{ color: 'var(--primary)' }} />
                        <input type="time" value={bulkMode.start} onChange={e => setBulkMode({ ...bulkMode, start: e.target.value })}
                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
                        <span>à</span>
                        <input type="time" value={bulkMode.end} onChange={e => setBulkMode({ ...bulkMode, end: e.target.value })}
                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Durée :</span>
                        <select
                            value={bulkMode.duration}
                            onChange={e => setBulkMode({ ...bulkMode, duration: parseInt(e.target.value) })}
                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-elev)' }}
                        >
                            <option value={10}>10 min</option>
                            <option value={20}>20 min</option>
                            <option value={30}>30 min</option>
                            <option value={45}>45 min</option>
                            <option value={60}>1 heure</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <button onClick={() => setBulkMode({ ...bulkMode, date: null })} className="btn btn-ghost" style={{ fontSize: 13 }}>Annuler</button>
                        <Button onClick={generateSlots} variant="primary" size="sm">Générer les créneaux</Button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
                {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const daySlots = slots.filter(s => s.date === dateStr);
                    const pendingSlots = newSlots.filter(s => s.date === dateStr);

                    return (
                        <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-elev)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', margin: 0 }}>{format(day, 'EEEE', { locale: fr })}</p>
                                <p style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0', color: 'var(--fg)' }}>{format(day, 'd')}</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {daySlots.map(s => (
                                    <div key={s.id} style={{
                                        padding: '10px', borderRadius: 10, background: 'var(--bg-elev)', border: '1px solid var(--border)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Clock size={14} style={{ color: s.status === 'reserved' ? 'var(--primary)' : 'var(--fg-subtle)' }} />
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{s.start_time} - {s.end_time}</span>
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
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Plus size={14} style={{ color: 'var(--primary)' }} />
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{s.start} - {s.end}</span>
                                        </div>
                                        <button onClick={() => setNewSlots(newSlots.filter(x => x !== s))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => handleAddSlot(day)}
                                    style={{
                                        padding: '12px', borderRadius: 10, background: 'transparent', border: '1px dashed var(--border)',
                                        color: 'var(--fg-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'var(--primary-soft)';
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                        e.currentTarget.style.color = 'var(--primary)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = 'var(--border)';
                                        e.currentTarget.style.color = 'var(--fg-muted)';
                                    }}
                                >
                                    <Plus size={14} /> Définir dispos
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
