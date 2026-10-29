import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameMonth, isSameDay,
    addDays, subDays, eachDayOfInterval, parseISO,
    isWithinInterval, addWeeks, subWeeks
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Plus, Users, Search, Video, Clock, Filter, Bot, X, StickyNote
} from 'lucide-react';
import { Button, Card, Spinner } from '../../components/ui';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import { useLang } from '../../lib/lang';
import type { Interview, Employee } from '@/services/api';
import { listInterviews, listCandidates, scheduleInterview, updateInterviewStatus, listPlanningNotes } from '@/services/api';
import type { PlanningNote } from '@/services/api';
import PlanningDayNotes from './PlanningDayNotes';

type ViewMode = 'month' | 'week' | 'day';

export default function CalendrierRHPage() {
    const { t } = useLang();
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
            toast.error(t('error'));
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

    // Notes written by the HR team, for every day shown in the grid
    const rangeStart = format(startDate, 'yyyy-MM-dd');
    const rangeEnd = format(endDate, 'yyyy-MM-dd');
    const { data: notes = [] } = useQuery({
        queryKey: ['planning-notes', rangeStart, rangeEnd],
        queryFn: () => listPlanningNotes(rangeStart, rangeEnd),
    });
    const notesByDay = useMemo(() => {
        const m = new Map<string, PlanningNote[]>();
        notes.forEach(n => m.set(n.note_date, [...(m.get(n.note_date) ?? []), n]));
        return m;
    }, [notes]);

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
            toast.success(newStatus === 'realized' ? t('cal_marked_realized') : t('cal_status_reset'));
        } catch (err) {
            toast.error(t('error'));
        }
    };

    const handleSaveInterview = async () => {
        if (!newInterview.candidate_id) {
            toast.error(t('cal_no_candidate_error'));
            return;
        }
        try {
            const cand = candidates.find(c => c.id === newInterview.candidate_id);
            await scheduleInterview({
                ...newInterview,
                candidate_name: cand?.full_name || (cand as any).candidate_name,
                job_title: cand?.position || 'TEST'
            } as any);
            toast.success(t('cal_planned_success'));
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(t('error'));
        }
    };

    const handleToggleFilter = (type: string) => {
        setActiveFilters(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const interviewTypeFilters = [
        { id: 'RH',        label: t('cal_interview_rh') },
        { id: 'Technique', label: t('cal_interview_tech') },
        { id: 'Final',     label: t('cal_interview_final') },
    ];

    const renderMonthView = () => {
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
        const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

        return (
            <div style={{ background: 'var(--bg)', borderRadius: 16, border: '1px solid var(--line)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                    {weekDays.map(d => (
                        <div key={d} style={{ padding: '12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                        const dayNotes = notesByDay.get(format(day, 'yyyy-MM-dd')) ?? [];

                        return (
                            <div key={i}
                                onClick={() => {
                                    setCurrentDate(day);
                                    setViewMode('day');
                                }}
                                style={{
                                    minHeight: 120, padding: 8, borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
                                    background: !isCurrentMonth ? 'var(--surface-2)' : isToday ? 'var(--primary-soft)' : 'var(--bg)',
                                    opacity: !isCurrentMonth ? 0.5 : 1, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = isToday ? 'var(--primary-soft)' : 'var(--surface)'}
                                onMouseLeave={e => e.currentTarget.style.background = !isCurrentMonth ? 'var(--surface-2)' : isToday ? 'var(--primary-soft)' : 'var(--bg)'}
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
                                                background: e.status === 'realized' ? 'var(--success-soft)' : e.status === 'confirmed' ? 'var(--primary-soft)' : 'var(--warn-soft)',
                                                color: e.status === 'realized' ? '#166534' : e.status === 'confirmed' ? '#1e40af' : '#92400e',
                                                border: `1px solid ${e.status === 'realized' ? '#bbf7d0' : e.status === 'confirmed' ? '#bfdbfe' : '#fde68a'}`,
                                                fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                display: 'flex', flexDirection: 'column', gap: 2, transition: 'all 0.2s'
                                            }}
                                            title={t('cal_click_realized')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                                <span style={{ fontWeight: 800 }}>{e.start_time}</span>
                                                {e.status === 'realized' && <CheckCircle size={10} />}
                                            </div>
                                            <div style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                {(e as any).candidate_name || e.candidate?.full_name || t('cal_candidate_default')}
                                            </div>
                                            <div style={{ fontSize: 9, opacity: 0.7 }}>{(e as any).job_title || t('cand_no_position')}</div>
                                        </div>
                                    ))}
                                    {dayNotes.slice(0, 2).map(n => (
                                        <div key={n.id} title={n.content} style={{
                                            fontSize: 10, padding: '3px 7px', borderRadius: 6, fontWeight: 600,
                                            background: 'var(--warn-soft)', color: 'var(--ink)', border: '1px solid var(--warn)',
                                            display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden'
                                        }}>
                                            <StickyNote size={10} style={{ flexShrink: 0, color: 'var(--warn)' }} />
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.content}</span>
                                        </div>
                                    ))}
                                    {dayNotes.length > 2 && (
                                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-2)', paddingLeft: 4 }}>+{dayNotes.length - 2} note{dayNotes.length - 2 > 1 ? 's' : ''}</div>
                                    )}
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

        const dayNotes = notesByDay.get(format(currentDate, 'yyyy-MM-dd')) ?? [];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{
                    padding: 24, background: 'white', borderRadius: 20, border: '1px solid var(--line)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CalendarIcon size={24} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}</h2>
                            <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>{t('cal_interviews_count').replace('{n}', String(dayInterviews.length))}</p>
                        </div>
                    </div>
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} style={{ marginRight: 8 }} /> {t('cal_new_interview')}
                    </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {dayInterviews.length > 0 ? dayInterviews.map(interview => (
                        <div key={interview.id} style={{
                            background: 'white', borderRadius: 20, border: '1px solid var(--line)', padding: 24,
                            display: 'flex', gap: 20, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, width: 4, height: '100%', background: 'var(--primary)' }} />
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Clock size={20} style={{ color: 'var(--ink-2)' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                                            {(interview as any).candidate_name || t('cal_candidate_default')}
                                        </h3>
                                        <div style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--primary-soft)', color: '#1e40af', fontSize: 10, fontWeight: 700 }}>{t('cal_interview_rh')}</div>
                                        <div style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--success-soft)', color: '#166534', fontSize: 10, fontWeight: 700 }}>{t('cal_done_badge')}</div>
                                    </div>
                                    <button style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', fontSize: 12, fontWeight: 700 }}>
                                        {t('edit')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Clock size={14} /> {interview.start_time} - {interview.end_time}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Users size={14} /> {t('cal_recruiter_short')}: RH Tython
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                                    <Filter size={12} /> {t('cal_auto_planned')} {(interview as any).job_title || 'TEST'}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                            <Card>
                                <p>{t('cal_no_interviews_day')}</p>
                            </Card>
                        </div>
                    )}
                </div>

                <PlanningDayNotes date={currentDate} notes={dayNotes} />
            </div>
        );
    };

    const renderWeekView = () => {
        return <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface)', borderRadius: 16 }}>{t('cal_week_wip')}</div>;
    };

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spinner /></div>;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
                        {viewMode === 'day' ? format(currentDate, 'd MMMM yyyy', { locale: fr }) : t('cal_title')}
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>
                        {viewMode === 'day' ? t('cal_subtitle_day') : t('cal_subtitle_month')}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)', overflow: 'hidden' }}>
                        {(['month', 'week', 'day'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                style={{
                                    padding: '8px 16px', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    background: viewMode === mode ? 'white' : 'transparent',
                                    color: viewMode === mode ? 'var(--primary)' : 'var(--ink-2)',
                                    boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none'
                                }}
                            >
                                {mode === 'month' ? t('cal_month_view') : mode === 'week' ? t('cal_week_view') : t('cal_day_view')}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 4, borderRadius: 10, border: '1px solid var(--line)' }}>
                        <button onClick={prevPeriod} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}><ChevronLeft size={18} /></button>
                        <span style={{ padding: '4px 12px', fontSize: 14, fontWeight: 700, minWidth: 150, textAlign: 'center' }}>
                            {viewMode === 'day'
                                ? format(currentDate, 'd MMMM yyyy', { locale: fr })
                                : format(currentDate, 'MMMM yyyy', { locale: fr })}
                        </span>
                        <button onClick={nextPeriod} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}><ChevronRight size={18} /></button>
                    </div>
                    <button
                        onClick={() => {
                            setNewInterview({ ...newInterview, date: format(currentDate, 'yyyy-MM-dd') });
                            setIsModalOpen(true);
                        }}
                        style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', fontSize: 12, fontWeight: 700 }}
                    >
                        {t('cal_new_btn')}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {viewMode === 'day' && (
                        <Card>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={16} style={{ color: 'var(--primary)' }} /> {t('cal_available_candidates')}
                            </h3>
                            <div style={{ position: 'relative', marginBottom: 16 }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }} />
                                <input
                                    type="text" placeholder={t('search')}
                                    style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13 }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {candidates.slice(0, 3).map(c => (
                                    <div key={c.id} style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <p style={{ fontSize: 12, fontWeight: 800, margin: 0 }}>{c.full_name || (c as any).candidate_name}</p>
                                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--success-soft)', color: '#166534', fontWeight: 700 }}>{t('cal_already_done')}</span>
                                        </div>
                                        <p style={{ fontSize: 10, color: 'var(--ink-2)', margin: '2px 0 0' }}>{c.position || 'TEST'}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Filter size={16} style={{ color: 'var(--primary)' }} /> {t('cal_filters')}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {interviewTypeFilters.map(tf => (
                                <label key={tf.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={activeFilters.includes(tf.id)}
                                        onChange={() => handleToggleFilter(tf.id)}
                                    />
                                    {tf.label}
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
                        background: 'white', border: '1px solid var(--line)', borderRadius: 20, width: 600, maxWidth: '90%',
                        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{ padding: 24, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{t('cal_modal_title')}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700 }}>{t('cal_candidate_default')}</label>
                                <select
                                    style={{ padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14 }}
                                    value={newInterview.candidate_id}
                                    onChange={e => setNewInterview({ ...newInterview, candidate_id: e.target.value })}
                                >
                                    <option value="">{t('cal_select_candidate')}</option>
                                    {candidates.map(c => (
                                        <option key={c.id} value={c.id}>{c.full_name || (c as any).candidate_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 700 }}>{t('ef_hire_date')}</label>
                                    <input
                                        type="date"
                                        style={{ padding: 12, borderRadius: 12, border: '1px solid var(--line)', fontSize: 14 }}
                                        value={newInterview.date}
                                        onChange={e => setNewInterview({ ...newInterview, date: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 700 }}>{t('cal_interview_type')}</label>
                                    <select
                                        style={{ padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14 }}
                                        value={newInterview.type}
                                        onChange={e => setNewInterview({ ...newInterview, type: e.target.value })}
                                    >
                                        <option value="RH">{t('cal_interview_rh')}</option>
                                        <option value="Technique">{t('cal_interview_tech')}</option>
                                        <option value="Final">{t('cal_interview_final')}</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 700 }}>{t('cal_start_time')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }} />
                                        <input
                                            type="time"
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12, border: '1px solid var(--line)', fontSize: 14 }}
                                            value={newInterview.start_time}
                                            onChange={e => setNewInterview({ ...newInterview, start_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 700 }}>{t('cal_end_time')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }} />
                                        <input
                                            type="time"
                                            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12, border: '1px solid var(--line)', fontSize: 14 }}
                                            value={newInterview.end_time}
                                            onChange={e => setNewInterview({ ...newInterview, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700 }}>{t('cal_recruiter_short')}</label>
                                <input
                                    type="text" placeholder={t('cal_recruiter_ph')}
                                    style={{ padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14 }}
                                    value={newInterview.recruiter_name}
                                    onChange={e => setNewInterview({ ...newInterview, recruiter_name: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 700 }}>{t('cal_meet_link')}</label>
                                <div style={{ position: 'relative' }}>
                                    <Video size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }} />
                                    <input
                                        type="text" placeholder="https://meet.google.com/..."
                                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 14 }}
                                        value={newInterview.meet_link}
                                        onChange={e => setNewInterview({ ...newInterview, meet_link: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: 24, borderTop: '1px solid var(--line)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
                            <Button variant="primary" onClick={handleSaveInterview}>{t('cal_save_interview')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
