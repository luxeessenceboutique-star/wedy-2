import React, { useState, useMemo, useEffect } from 'react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameMonth, isSameDay,
    addDays, subDays, eachDayOfInterval, parseISO,
    isWithinInterval, addWeeks, subWeeks
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Plus, Users, Search, Video, Clock, Filter, Bot
} from 'lucide-react';
import { Button, Card, Spinner } from '../../components/ui';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import type { Interview, Employee } from '../../lib/api';
import { listInterviews, listCandidates, scheduleInterview, updateInterviewStatus } from '../../lib/api';

type ViewMode = 'month' | 'week';

export default function CalendrierRHPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [candidates, setCandidates] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [intData, candData] = await Promise.all([
                    listInterviews(),
                    listCandidates()
                ]);
                setInterviews(intData);
                setCandidates(candData);
            } catch (err) {
                toast.error("Erreur lors du chargement des données");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const nextPeriod = () => {
        if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(addWeeks(currentDate, 1));
    };

    const prevPeriod = () => {
        if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
        else setCurrentDate(subWeeks(currentDate, 1));
    };

    const handleToggleRealized = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'realized' ? 'confirmed' : 'realized';
        try {
            await updateInterviewStatus(id, newStatus);
            setInterviews(prev => prev.map(e => e.id === id ? { ...e, status: newStatus as any } : e));
            toast.success(newStatus === 'realized' ? "Entretien marqué comme réalisé !" : "Statut réinitialisé");
        } catch (err) {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    const renderMonthView = () => {
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
        const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

        return (
            <div style={{ background: 'var(--bg)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                    {weekDays.map(d => (
                        <div key={d} style={{ padding: '12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {d}
                        </div>
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 600 }}>
                    {dateRange.map((day, i) => {
                        const dayInterviews = interviews.filter(e => isSameDay(parseISO(e.date), day));
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div key={i} style={{
                                minHeight: 120, padding: 8, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                                background: !isCurrentMonth ? 'var(--bg-muted)' : isToday ? 'var(--primary-soft)' : 'var(--bg)',
                                opacity: !isCurrentMonth ? 0.5 : 1
                            }}>
                                <span style={{
                                    display: 'inline-flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: isToday ? 800 : 500, borderRadius: '50%',
                                    background: isToday ? 'var(--primary)' : 'transparent',
                                    color: isToday ? '#fff' : 'var(--fg)'
                                }}>
                                    {format(day, 'd')}
                                </span>
                                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {dayInterviews.map(e => (
                                        <div
                                            key={e.id}
                                            onClick={() => handleToggleRealized(e.id, e.status)}
                                            style={{
                                                fontSize: 10, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                                                background: e.status === 'realized' ? '#dcfce7' : e.status === 'confirmed' ? '#eff6ff' : '#fef3c7',
                                                color: e.status === 'realized' ? '#166534' : e.status === 'confirmed' ? '#1e40af' : '#92400e',
                                                border: `1px solid ${e.status === 'realized' ? '#bbf7d0' : e.status === 'confirmed' ? '#bfdbfe' : '#fde68a'}`,
                                                fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                display: 'flex', flexDirection: 'column', gap: 2, transition: 'all 0.2s'
                                            }}
                                            title="Cliquez pour marquer comme réalisé"
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                                <span style={{ fontWeight: 800 }}>{e.start_time}</span>
                                                {e.status === 'realized' && <CheckCircle size={10} />}
                                            </div>
                                            <div style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                {(e as any).candidate_name || e.candidate?.full_name || 'Candidat'}
                                            </div>
                                            <div style={{ fontSize: 9, opacity: 0.7 }}>{(e as any).job_title || 'Poste non spécifié'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spinner /></div>;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Calendrier RH</h1>
                    <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: 0 }}>Suivi des entretiens et disponibilités</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elev)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
                        <button onClick={prevPeriod} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><ChevronLeft size={18} /></button>
                        <span style={{ padding: '4px 12px', fontSize: 14, fontWeight: 700, minWidth: 150, textAlign: 'center' }}>
                            {format(currentDate, 'MMMM yyyy', { locale: fr })}
                        </span>
                        <button onClick={nextPeriod} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><ChevronRight size={18} /></button>
                    </div>
                    <Button variant="primary">
                        <Plus size={16} style={{ marginRight: 8 }} /> Planifier un entretien
                    </Button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Card>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Filter size={16} style={{ color: 'var(--primary)' }} /> Filtres
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {['RH', 'Technique', 'Final'].map(t => (
                                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                                    <input type="checkbox" defaultChecked /> {t}
                                </label>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Statistiques</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: 'var(--fg-muted)' }}>Entretiens prévus</span>
                                <span style={{ fontWeight: 700 }}>{interviews.filter(e => e.status === 'confirmed' || e.status === 'pending').length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: 'var(--fg-muted)' }}>Réalisés</span>
                                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{interviews.filter(e => e.status === 'realized' || e.status === 'completed').length}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div>
                    {renderMonthView()}
                </div>
            </div>
        </div>
    );
}
