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
    Plus, Users, Search, Video, Clock, Filter, Bot, X
} from 'lucide-react';
import { Button, Card, Spinner } from '../../components/ui';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import type { Interview, Employee } from '../../lib/api';
import { listInterviews, listCandidates, scheduleInterview, updateInterviewStatus } from '../../lib/api';

type ViewMode = 'month' | 'week' | 'day';

export default function CalendrierRHPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [candidates, setCandidates] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState<string[]>(['RH', 'Technique', 'Final']);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newInterview, setNewInterview] = useState({
        candidate_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '10:00',
        type: 'RH',
        recruiter_name: '',
        meet_link: '',
        notes: ''
    });

    const loadData = async () => {
        setLoading(true);
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

    useEffect(() => {
        loadData();
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

    const handleSaveInterview = async () => {
        if (!newInterview.candidate_id) {
            toast.error("Veuillez sélectionner un candidat");
            return;
        }
        try {
            // Find candidate name for the API if needed
            const cand = candidates.find(c => c.id === newInterview.candidate_id);
            await scheduleInterview({
                ...newInterview,
                candidate_name: cand?.full_name || (cand as any).candidate_name,
                job_title: cand?.position || 'TEST'
            } as any);
            toast.success("Entretien planifié avec succès !");
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            toast.error("Erreur lors de la planification");
        }
    };

    const handleToggleFilter = (type: string) => {
        setActiveFilters(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
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
                        const dayInterviews = interviews.filter(e =>
                            isSameDay(parseISO(e.date), day) &&
                            activeFilters.includes(e.type)
                        );
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div key={i}
                                onClick={() => {
                                    setCurrentDate(day);
                                    setViewMode('day');
                                }}
                                style={{
                                    minHeight: 120, padding: 8, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                                    background: !isCurrentMonth ? 'var(--bg-muted)' : isToday ? 'var(--primary-soft)' : 'var(--bg)',
                                    opacity: !isCurrentMonth ? 0.5 : 1, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = isToday ? 'var(--primary-soft)' : 'var(--bg-elev)'}
                                onMouseLeave={e => e.currentTarget.style.background = !isCurrentMonth ? 'var(--bg-muted)' : isToday ? 'var(--primary-soft)' : 'var(--bg)'}
                            >
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
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                handleToggleRealized(e.id, e.status);
                                            }}
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

    const renderDayView = () => {
        const dayInterviews = interviews.filter(e =>
            isSameDay(parseISO(e.date), currentDate) &&
            activeFilters.includes(e.type)
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Day Summary Card */}
                <div style={{
                    padding: 24, background: 'white', borderRadius: 20, border: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CalendarIcon size={24} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}</h2>
                            <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: 0 }}>{dayInterviews.length} entretien(s) au programme</p>
                        </div>
                    </div>
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} style={{ marginRight: 8 }} /> Nouvel entretien
                    </Button>
                </div>

                {/* Interviews List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {dayInterviews.length > 0 ? dayInterviews.map(interview => (
                        <div key={interview.id} style={{
                            background: 'white', borderRadius: 20, border: '1px solid var(--border)', padding: 24,
                            display: 'flex', gap: 20, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, width: 4, height: '100%', background: 'var(--primary)' }} />

                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Clock size={20} style={{ color: 'var(--fg-muted)' }} />
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                                            {(interview as any).candidate_name || 'Candidat'}
                                        </h3>
                                        <div style={{ padding: '4px 8px', borderRadius: 6, background: '#eff6ff', color: '#1e40af', fontSize: 10, fontWeight: 700 }}>RH</div>
                                        <div style={{ padding: '4px 8px', borderRadius: 6, background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700 }}>TERMINÉ</div>
                                    </div>
                                    <button style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 700 }}>
                                        Modifier
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--fg-muted)', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Clock size={14} /> {interview.start_time} - {interview.end_time}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Users size={14} /> Recruteur: RH Tython
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
                                    <Filter size={12} /> Auto-planifié pour le poste : {(interview as any).job_title || 'TEST'}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                            <Card>
                                <p>Aucun entretien pour cette journée.</p>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        return <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-elev)', borderRadius: 16 }}>Vue semaine en cours de développement...</div>;
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spinner /></div>;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{viewMode === 'day' ? format(currentDate, 'd MMMM yyyy', { locale: fr }) : 'Calendrier RH'}</h1>
                    <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: 0 }}>{viewMode === 'day' ? 'Gestion des entretiens et du calendrier RH' : 'Suivi des entretiens et disponibilités'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', background: 'var(--bg-elev)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {(['month', 'week', 'day'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                style={{
                                    padding: '8px 16px', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    background: viewMode === mode ? 'white' : 'transparent',
                                    color: viewMode === mode ? 'var(--primary)' : 'var(--fg-muted)',
                                    boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none'
                                }}
                            >
                                {mode === 'month' ? 'Mois' : mode === 'week' ? 'Semaine' : 'Jour'}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elev)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
                        <button onClick={prevPeriod} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><ChevronLeft size={18} /></button>
                        <span style={{ padding: '4px 12px', fontSize: 14, fontWeight: 700, minWidth: 150, textAlign: 'center' }}>
                            {viewMode === 'day'
                                ? format(currentDate, 'd MMMM yyyy', { locale: fr })
                                : format(currentDate, 'MMMM yyyy', { locale: fr })}
                        </span>
                        <button onClick={nextPeriod} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><ChevronRight size={18} /></button>
                    </div>
                    <button
                        onClick={() => {
                            setNewInterview({ ...newInterview, date: format(currentDate, 'yyyy-MM-dd') });
                            setIsModalOpen(true);
                        }}
                        style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 700 }}
                    >
                        Nouveau
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {viewMode === 'day' && (
                        <Card>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={16} style={{ color: 'var(--primary)' }} /> Candidats disponibles
                            </h3>
                            <div style={{ position: 'relative', marginBottom: 16 }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                                <input
                                    type="text" placeholder="Rechercher..."
                                    style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {candidates.slice(0, 3).map(c => (
                                    <div key={c.id} style={{ padding: 12, borderRadius: 12, background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <p style={{ fontSize: 12, fontWeight: 800, margin: 0 }}>{c.full_name || (c as any).candidate_name}</p>
                                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#dcfce7', color: '#166534', fontWeight: 700 }}>DÉJÀ PASSÉ</span>
                                        </div>
                                        <p style={{ fontSize: 10, color: 'var(--fg-muted)', margin: '2px 0 0' }}>{c.position || 'TEST'}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Filter size={16} style={{ color: 'var(--primary)' }} /> Filtres calendrier
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { id: 'RH', label: 'Entretien RH' },
                                { id: 'Technique', label: 'Entretien Technique' },
                                { id: 'Final', label: 'Entretien Final' }
                            ].map(t => (
                                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={activeFilters.includes(t.id)}
                                        onChange={() => handleToggleFilter(t.id)}
                                    />
                                    {t.label}
                                </label>
                            ))}
                        </div>
                    </Card>
                </div>

                <div>
                    {viewMode === 'month' && renderMonthView()}
                    {viewMode === 'week' && renderWeekView()}
                    {viewMode === 'day' && renderDayView()}
                </div>
            </div>
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'white', border: '1px solid var(--border)', borderRadius: 20, width: 600, maxWidth: '90%',
                        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{ padding: 24, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Planifier un entretien</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700 }}>Candidat</label>
                                <select
                                    style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elev)', fontSize: 14 }}
                                    value={newInterview.candidate_id}
                                    onChange={e => setNewInterview({ ...newInterview, candidate_id: e.target.value })}
                                >
                                    <option value="">Sélectionner un candidat</option>
                                    {candidates.map(c => (
                                        <option key={c.id} value={c.id}>{c.full_name || (c as any).candidate_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 700 }}>Date</label>
                                    <input
                                        type="date"
                                        style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', fontSize: 14 }}
                                        value={newInterview.date}
                                        onChange={e => setNewInterview({ ...newInterview, date: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 700 }}>Type d'entretien</label>
                                    <select
                                        style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elev)', fontSize: 14 }}
                                        value={newInterview.type}
                                        onChange={e => setNewInterview({ ...newInterview, type: e.target.value })}
                                    >
                                        <option value="RH">Entretien RH</option>
                                        <option value="Technique">Entretien Technique</option>
                                        <option value="Final">Entretien Final</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 700 }}>Heure début</label>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                                        <input
                                            type="time"
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14 }}
                                            value={newInterview.start_time}
                                            onChange={e => setNewInterview({ ...newInterview, start_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 700 }}>Heure fin</label>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                                        <input
                                            type="time"
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14 }}
                                            value={newInterview.end_time}
                                            onChange={e => setNewInterview({ ...newInterview, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700 }}>Recruteur</label>
                                <input
                                    type="text" placeholder="Nom du recruteur"
                                    style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elev)', fontSize: 14 }}
                                    value={newInterview.recruiter_name}
                                    onChange={e => setNewInterview({ ...newInterview, recruiter_name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700 }}>Lien Meet/Zoom</label>
                                <div style={{ position: 'relative' }}>
                                    <Video size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                                    <input
                                        type="text" placeholder="https://meet.google.com/..."
                                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elev)', fontSize: 14 }}
                                        value={newInterview.meet_link}
                                        onChange={e => setNewInterview({ ...newInterview, meet_link: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: 24, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                            <Button variant="primary" onClick={handleSaveInterview}>Enregistrer l'entretien</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
