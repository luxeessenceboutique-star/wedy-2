import React, { useState } from 'react';
import axios from 'axios';
import {
    Sparkles, Send, Copy, Check, Eye, PenTool,
    Briefcase, GraduationCap, Clock, Building2,
    Trash2, Plus, Download, Layout
} from 'lucide-react';
import { Button, Card, Input, Spinner } from '../../components/ui';
import { getApiError } from '@/services/api';
import { toast } from 'sonner';

export default function AnnonceStudioPage() {
    const [form, setForm] = useState({
        poste: '',
        description: '',
        competences: '',
        experience: '',
        culture: ''
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [content, setContent] = useState('');
    const [copied, setCopied] = useState(false);
    const [view, setView] = useState<'edit' | 'preview'>('edit');

    const handleGenerate = async () => {
        if (!form.poste) {
            toast.error('Le titre du poste est requis');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post('/api/annonces/generate', form);
            setContent(res.data.content);
            setView('preview');
            toast.success('Annonce générée avec succès !');
        } catch (err: any) {
            toast.error(getApiError(err, 'Erreur lors de la génération'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!content) return;
        setSaving(true);
        try {
            await axios.post('/api/annonces/', {
                poste: form.poste,
                description: form.description,
                competences: form.competences,
                experience: form.experience,
                contenu: content
            });
            toast.success('Annonce enregistrée !');
        } catch (err: any) {
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copié dans le presse-papier');
    };

    return (
        <div style={{ padding: 24, paddingBottom: 100, maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: 'var(--fg)' }}>Studio d'Annonces</h1>
                    <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>Générez des annonces de recrutement percutantes avec l'IA</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    {content && (
                        <Button variant="ghost" onClick={() => setContent('')}>
                            <Plus size={16} /> Nouvelle annonce
                        </Button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: content ? '1fr 1fr' : '1fr', gap: 24, transition: 'all 0.3s ease' }}>

                {/* Form Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Card>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <PenTool size={18} style={{ color: 'var(--primary)' }} />
                            Détails du poste
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <Input
                                label="Titre du poste *"
                                placeholder="ex: Développeur Fullstack Senior"
                                value={form.poste}
                                onChange={e => setForm({ ...form, poste: e.target.value })}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="label">Expérience souhaitée</label>
                                    <div style={{ position: 'relative' }}>
                                        <Clock size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                                        <input
                                            className="input"
                                            style={{ paddingLeft: 32 }}
                                            placeholder="ex: 3-5 ans"
                                            value={form.experience}
                                            onChange={e => setForm({ ...form, experience: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Formation</label>
                                    <div style={{ position: 'relative' }}>
                                        <GraduationCap size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                                        <input
                                            className="input"
                                            style={{ paddingLeft: 32 }}
                                            placeholder="ex: Bac+5"
                                            value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="label">Compétences clés</label>
                                <textarea
                                    className="textarea"
                                    rows={3}
                                    placeholder="ex: React, Node.js, PostgreSQL, Docker..."
                                    value={form.competences}
                                    onChange={e => setForm({ ...form, competences: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="label">Culture & Avantages</label>
                                <textarea
                                    className="textarea"
                                    rows={3}
                                    placeholder="ex: Environnement agile, télétravail flexible, tickets resto..."
                                    value={form.culture}
                                    onChange={e => setForm({ ...form, culture: e.target.value })}
                                />
                            </div>

                            <Button
                                onClick={handleGenerate}
                                loading={loading}
                                style={{ width: '100%', marginTop: 8 }}
                                variant="primary"
                            >
                                {!loading && <Sparkles size={18} style={{ marginRight: 8 }} />}
                                {loading ? 'Génération en cours...' : 'Générer l\'annonce avec IA'}
                            </Button>
                        </div>
                    </Card>

                    {!content && (
                        <div style={{ padding: 20, background: 'var(--primary-soft)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--primary-border)' }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <Sparkles size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>Conseil IA</p>
                                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                                        Plus vous donnez de détails sur le poste et la culture de votre entreprise, plus l'IA sera capable de créer une annonce personnalisée et attractive.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Preview Column */}
                {content && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <Card pad={false} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 600 }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 3, borderRadius: 'var(--radius-md)' }}>
                                    <button
                                        onClick={() => setView('edit')}
                                        style={{
                                            padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                                            background: view === 'edit' ? 'var(--surface)' : 'transparent',
                                            color: view === 'edit' ? 'var(--primary)' : 'var(--ink-2)',
                                            boxShadow: view === 'edit' ? 'var(--shadow-sm)' : 'none'
                                        }}
                                    >
                                        Éditeur
                                    </button>
                                    <button
                                        onClick={() => setView('preview')}
                                        style={{
                                            padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                                            background: view === 'preview' ? 'var(--surface)' : 'transparent',
                                            color: view === 'preview' ? 'var(--primary)' : 'var(--ink-2)',
                                            boxShadow: view === 'preview' ? 'var(--shadow-sm)' : 'none'
                                        }}
                                    >
                                        Aperçu
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={copyToClipboard}
                                        title="Copier"
                                    >
                                        {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                                    </button>
                                    <Button size="sm" onClick={handleSave} loading={saving}>
                                        Enregistrer l'annonce
                                    </Button>
                                </div>
                            </div>

                            <div style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                {view === 'edit' ? (
                                    <textarea
                                        className="textarea"
                                        style={{
                                            width: '100%', height: '100%', border: 'none', borderRadius: 0,
                                            padding: 24, fontSize: 15, lineHeight: 1.6, resize: 'none',
                                            fontFamily: 'var(--font-body)'
                                        }}
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                    />
                                ) : (
                                    <div style={{
                                        padding: 32, fontSize: 15, lineHeight: 1.7,
                                        overflowY: 'auto', background: 'var(--surface)',
                                        whiteSpace: 'pre-wrap', color: 'var(--fg)'
                                    }}>
                                        {content}
                                    </div>
                                )}
                            </div>
                        </Card>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)', fontSize: 12 }}>
                                <Layout size={14} />
                                <span>Lien public généré automatiquement après enregistrement</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
