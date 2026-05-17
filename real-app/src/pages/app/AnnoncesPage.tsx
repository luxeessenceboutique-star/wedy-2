import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Send, Copy, Check, Eye, PenTool,
    Briefcase, MessageSquare, Trash2, Plus, Layout,
    ExternalLink, Wand2, RefreshCw, Bot
} from 'lucide-react';
import { Button, Card, Spinner } from '../../components/ui';
import { toast } from 'sonner';
import { useLang } from '../../lib/lang';
import type { ChatMessage, JobAd } from '../../lib/api';
import { chatGenerateAnnonce, createAnnonce, listAnnonces } from '../../lib/api';

export default function AnnoncesPage() {
    const { t } = useLang();

    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: t('annonces_welcome') }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generatedAd, setGeneratedAd] = useState<Partial<JobAd> | null>(null);
    const [view, setView] = useState<'edit' | 'preview'>('preview');
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<JobAd[]>([]);
    const [showHistory, setShowHistory] = useState(true);
    const [copied, setCopied] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const data = await listAnnonces();
            setHistory(data);
        } catch (err) { }
    };

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const res = await chatGenerateAnnonce(newMessages);
            setMessages([...newMessages, { role: 'assistant', content: res.reply }]);

            const extractPoste = (txt: string) => {
                const match = txt.match(/(?:Titre du poste|Poste)\s*:\s*([^\n]+)/i) || txt.match(/^#\s*([^\n]+)/m);
                return match ? match[1].trim() : t('annonces_default_poste');
            };

            if (res.reply.includes("---")) {
                const parts = res.reply.split("---");
                const content = parts[parts.length - 1].trim();
                setGeneratedAd(prev => ({
                    ...prev,
                    contenu: content,
                    poste: prev?.poste && prev.poste !== t('annonces_default_poste') ? prev.poste : extractPoste(res.reply)
                }));
            } else {
                setGeneratedAd(prev => ({
                    ...prev,
                    contenu: res.reply,
                    poste: prev?.poste && prev.poste !== t('annonces_default_poste') ? prev.poste : extractPoste(res.reply)
                }));
            }
        } catch (err) {
            toast.error(t('annonces_ai_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!generatedAd?.contenu) return;
        setSaving(true);
        try {
            const res = await createAnnonce({
                poste: generatedAd.poste || t('annonces_no_title'),
                contenu: generatedAd.contenu,
                is_active: true
            });
            const url = `${window.location.origin}/postuler/${res.id}`;
            setPublishedUrl(url);
            toast.success(t('annonces_save_success'));
            loadHistory();
        } catch (err) {
            toast.error(t('annonces_save_error'));
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedAd?.contenu) return;
        navigator.clipboard.writeText(generatedAd.contenu);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success(t('annonces_copy_success'));
    };

    const selectFromHistory = (ad: JobAd) => {
        setGeneratedAd(ad);
        setPublishedUrl(`${window.location.origin}/postuler/${ad.id}`);
        setView('preview');
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            {/* Sidebar: History */}
            {showHistory && (
                <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-elev)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-muted)', margin: 0 }}>{t('annonces_history')}</h3>
                        <button onClick={() => loadHistory()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}><RefreshCw size={14} /></button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                        {history.length === 0 && (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12 }}>{t('annonces_no_history')}</div>
                        )}
                        {history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(ad => (
                            <div
                                key={ad.id}
                                onClick={() => selectFromHistory(ad)}
                                style={{
                                    padding: '12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                                    background: generatedAd?.id === ad.id ? 'var(--primary-soft)' : 'transparent',
                                    border: `1px solid ${generatedAd?.id === ad.id ? 'var(--primary-border)' : 'transparent'}`,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 600, color: generatedAd?.id === ad.id ? 'var(--primary)' : 'var(--fg)', marginBottom: 4 }}>{ad.poste}</div>
                                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{new Date(ad.created_at).toLocaleDateString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Left: Chatbot */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={22} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t('annonces_title')}</h2>
                        <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>{t('annonces_subtitle')}</p>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{
                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: 16,
                            fontSize: 14,
                            lineHeight: 1.5,
                            background: m.role === 'user' ? 'var(--primary)' : 'var(--bg-elev)',
                            color: m.role === 'user' ? '#fff' : 'var(--fg)',
                            border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {m.content}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ alignSelf: 'flex-start', padding: '12px 16px', borderRadius: 16, background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                            <Spinner size={16} />
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div style={{ padding: 20, borderTop: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
                    <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
                        <textarea
                            className="textarea"
                            placeholder={t('annonces_placeholder')}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            style={{ flex: 1, minHeight: 50, maxHeight: 150, resize: 'none' }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            style={{
                                position: 'absolute', right: 10, bottom: 10,
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'var(--primary)', color: '#fff', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', opacity: (!input.trim() || loading) ? 0.5 : 1
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Preview & Editor */}
            <div style={{ width: '45%', display: 'flex', flexDirection: 'column', background: 'var(--bg-muted)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-muted)', padding: 3, borderRadius: 8 }}>
                        <button
                            onClick={() => setView('preview')}
                            style={{
                                padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
                                background: view === 'preview' ? 'var(--bg-elev)' : 'transparent',
                                color: view === 'preview' ? 'var(--primary)' : 'var(--fg-muted)',
                                boxShadow: view === 'preview' ? 'var(--shadow-sm)' : 'none'
                            }}
                        >{t('annonces_preview_tab')}</button>
                        <button
                            onClick={() => setView('edit')}
                            style={{
                                padding: '6px 12px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
                                background: view === 'edit' ? 'var(--bg-elev)' : 'transparent',
                                color: view === 'edit' ? 'var(--primary)' : 'var(--fg-muted)',
                                boxShadow: view === 'edit' ? 'var(--shadow-sm)' : 'none'
                            }}
                        >{t('annonces_editor_tab')}</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button size="sm" variant="ghost" onClick={copyToClipboard} title={t('annonces_copy_success')}>
                            {copied ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                        </Button>
                        <Button size="sm" onClick={handleSave} loading={saving} disabled={!generatedAd?.contenu}>
                            {t('annonces_publish')}
                        </Button>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                    {!generatedAd?.contenu ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', padding: 40, textAlign: 'center' }}>
                            <Sparkles size={48} style={{ marginBottom: 20, opacity: 0.2 }} />
                            <p style={{ fontSize: 15, fontWeight: 600 }}>{t('annonces_empty_preview')}</p>
                            <p style={{ fontSize: 13 }}>{t('annonces_empty_hint')}</p>
                        </div>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {view === 'edit' ? (
                                <textarea
                                    className="textarea"
                                    style={{ flex: 1, padding: 32, fontSize: 15, lineHeight: 1.6, border: 'none', borderRadius: 0, resize: 'none', background: 'var(--bg)' }}
                                    value={generatedAd.contenu}
                                    onChange={e => setGeneratedAd(prev => ({ ...prev!, contenu: e.target.value }))}
                                />
                            ) : (
                                <div style={{ flex: 1, padding: 32, overflowY: 'auto', background: 'var(--bg)', color: 'var(--fg)' }}>
                                    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>{generatedAd.poste}</h1>
                                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 15 }}>
                                        {generatedAd.contenu}
                                    </div>
                                    <div style={{ marginTop: 40, padding: 20, background: 'var(--primary-soft)', borderRadius: 12, border: '1px dashed var(--primary-border)' }}>
                                        {publishedUrl ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--primary)' }}>
                                                    <Check size={18} />
                                                    <span style={{ fontSize: 13, fontWeight: 700 }}>{t('annonces_published_banner')}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                                    <code style={{ flex: 1, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{publishedUrl}</code>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(publishedUrl); toast.success(t('ef_link_copied')); }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--fg-subtle)' }}>
                                                <ExternalLink size={18} />
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{t('annonces_link_pending')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
