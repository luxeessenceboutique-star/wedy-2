import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Briefcase, Send, CheckCircle, ArrowRight, MapPin, Clock, Calendar as CalIcon, Info, Upload, FileText } from 'lucide-react';
import { Button, Card, Spinner } from '../../components/ui';
import { applyCandidate, getAnnonce, listSlots, extractCV, getApiError } from '../../lib/api';
import type { JobAd, HRSlot } from '../../lib/api';
import { toast } from 'sonner';

export default function PostulerPage() {
    const { id } = useParams<{ id: string }>();
    const [annonce, setAnnonce] = useState<JobAd | null>(null);
    const [slots, setSlots] = useState<HRSlot[]>([]);
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        interview_date: '',
        interview_time: '',
        cv_url: '',
    });
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (id) {
            Promise.all([getAnnonce(id), listSlots()])
                .then(([ad, allSlots]) => {
                    setAnnonce(ad);
                    // Filter or use all slots
                    setSlots(allSlots.filter(s => s.status === 'free'));
                })
                .catch(() => toast.error("Erreur lors du chargement de l'offre"))
                .finally(() => setFetching(false));
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.interview_date || !form.interview_time) {
            toast.error("Veuillez choisir un créneau d'entretien");
            return;
        }
        setLoading(true);
        try {
            await applyCandidate({ ...form, ad_id: id });
            setSubmitted(true);
            toast.success("Candidature envoyée avec succès !");
        } catch (err: any) {
            toast.error(getApiError(err, "Erreur lors de l'envoi de la candidature"));
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExtracting(true);
        try {
            const { extraction, cv_url } = await extractCV(file);
            setForm(prev => ({
                ...prev,
                full_name: extraction.full_name || prev.full_name,
                email: extraction.email || prev.email,
                phone: extraction.phone || prev.phone,
                cv_url: cv_url
            }));
            toast.success("Informations extraites du CV !");
        } catch (err) {
            toast.error("Erreur lors de l'analyse du CV");
        } finally {
            setExtracting(false);
        }
    };

    const groupedSlots = slots.reduce((acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
    }, {} as Record<string, HRSlot[]>);

    const formatSlotDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch (e) {
            return dateStr;
        }
    };

    if (fetching) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Spinner size={40} /></div>;

    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', padding: 20 }}>
                <div style={{ maxWidth: 450, textAlign: 'center', padding: '48px 32px' }}>
                    <Card>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <CheckCircle size={32} style={{ color: 'var(--success)' }} />
                        </div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Candidature Envoyée !</h1>
                        <p style={{ color: 'var(--ink-2)', marginBottom: 12 }}>Merci pour votre intérêt. Votre entretien est déjà planifié pour le :</p>
                        <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 32 }}>{new Date(form.interview_date).toLocaleDateString('fr-FR')} à {form.interview_time}</p>
                        <Button variant="soft" onClick={() => window.location.href = '/'}>Retour à l'accueil</Button>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--surface-2)', padding: '40px 20px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'var(--primary-soft)', borderRadius: 100, color: 'var(--primary)', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
                        <Briefcase size={14} /> {annonce?.poste || "Offre d'emploi"}
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Rejoignez notre équipe</h1>
                    <p style={{ color: 'var(--ink-2)', fontSize: 16 }}>Complétez le formulaire et choisissez votre créneau d'entretien.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 32 }}>
                    {/* LEFT COLUMN: JOB DETAILS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <Card pad={true}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>À propos du poste</h3>
                            <div className="scroll" style={{ maxHeight: 300, overflowY: 'auto', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}
                                dangerouslySetInnerHTML={{ __html: annonce?.contenu || "" }} />

                            <div style={{ marginTop: 24, padding: 16, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--line)' }}>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                    <MapPin size={16} style={{ color: 'var(--primary)' }} />
                                    <span style={{ fontSize: 13 }}>Casablanca, Maroc</span>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <Clock size={16} style={{ color: 'var(--primary)' }} />
                                    <span style={{ fontSize: 13 }}>Temps plein (CDI)</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: APPLICATION FORM */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <Card pad={true}>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Votre Candidature</h3>

                                    {/* CV UPLOAD BOX */}
                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>CV (PDF ou Image)</label>
                                        <div style={{
                                            position: 'relative', border: '2px dashed var(--line)', borderRadius: 12, padding: '32px 20px',
                                            textAlign: 'center', transition: 'all 0.2s', background: extracting ? 'var(--surface-2)' : 'transparent'
                                        }}>
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg"
                                                onChange={handleFileChange}
                                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                                            />
                                            {extracting ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                                    <Spinner size={24} />
                                                    <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>Analyse du CV en cours...</span>
                                                </div>
                                            ) : form.cv_url ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <FileText size={24} style={{ color: 'var(--success)' }} />
                                                    </div>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>CV téléchargé avec succès</span>
                                                    <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>Cliquez pour modifier</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Upload size={24} style={{ color: 'var(--primary)' }} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Cliquez pour uploader</p>
                                                        <p style={{ fontSize: 11, color: 'var(--ink-2)', margin: 0 }}>Remplissage automatique disponible</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div className="form-group">
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nom complet</label>
                                            <input required className="input" placeholder="Jean Dupont" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email</label>
                                            <input required type="email" className="input" placeholder="jean@mail.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginTop: 16 }}>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Téléphone</label>
                                        <input className="input" placeholder="+212 6..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 24 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CalIcon size={18} /> Choisir un créneau d'entretien
                                    </h3>
                                    <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Sélectionnez une date et un horaire qui vous conviennent.</p>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                                        {Object.entries(groupedSlots).sort(([a], [b]) => a.localeCompare(b)).map(([date, daySlots]) => (
                                            <div key={date} style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                                                <div style={{ background: 'var(--surface-2)', padding: '6px 10px', fontSize: 12, fontWeight: 700, borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
                                                    {formatSlotDate(date)}
                                                </div>
                                                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(slot => (
                                                        <button
                                                            key={slot.id}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, interview_date: slot.date, interview_time: slot.start_time })}
                                                            style={{
                                                                padding: '8px 4px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--line)', transition: 'all 0.2s',
                                                                background: form.interview_date === slot.date && form.interview_time === slot.start_time ? 'var(--primary)' : 'white',
                                                                color: form.interview_date === slot.date && form.interview_time === slot.start_time ? 'white' : 'var(--fg)',
                                                            }}
                                                        >
                                                            {slot.start_time} - {slot.end_time}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {slots.length === 0 && (
                                        <div style={{ padding: 20, textAlign: 'center', background: 'var(--warning-soft)', borderRadius: 8, color: 'var(--warn)', fontSize: 13 }}>
                                            <Info size={16} /> Aucun créneau disponible pour le moment.
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginTop: 8 }}>
                                    <Button type="submit" className="w-full" loading={loading} style={{ height: 48, fontSize: 15, fontWeight: 700 }}>
                                        Confirmer ma candidature <ArrowRight size={18} style={{ marginLeft: 8 }} />
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
