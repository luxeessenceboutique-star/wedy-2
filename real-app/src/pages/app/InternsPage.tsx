import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, FileUp, GraduationCap, User, Calendar, Mail, Phone, Camera, X, FileText, CheckCircle, TrendingUp, Eye, Settings } from 'lucide-react';
import { listInterns, createIntern, updateIntern, deleteIntern, uploadDocument, listDocuments, deleteDocument } from '../../lib/api';
import { CVImportModal } from '../../components/cv/CVImportModal';
import type { Intern } from '../../lib/api';
import { Button, Badge, Card, Input, Modal, Spinner, Avatar } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';

const safeFormat = (date: any, fmt = 'dd/MM/yyyy') => {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, fmt) : '—';
};

function InternForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Intern>; onSave: (data: Partial<Intern>) => void; onCancel: () => void; loading: boolean;
}) {
  const [form, setForm] = useState<Partial<Intern>>(initial ?? {
    full_name: '', email: '', phone: '', position: 'Stagiaire',
    department: '', manager: '', internship_start: '', internship_end: '',
    contract_type: 'Stage', status: 'intern',
    skills: [], certifications: [], bio: '',
  });

  const set = (k: keyof Intern) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Helper for comma-separated arrays
  const setArr = (k: 'skills' | 'certifications') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setForm(f => ({ ...f, [k]: val }));
  };

  const fileRef = React.useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const result = ev.target?.result as string;
      if (result) setForm(f => ({ ...f, photo_url: result.includes(',') ? result.split(',')[1] : result }));
    };
    r.readAsDataURL(file);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, status: 'intern', contract_type: 'Stage' }); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      
      {/* Photo Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10, padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 12 }}>
        <div style={{ position: 'relative' }}>
          <Avatar name={form.full_name || 'U'} src={form.photo_url} size={70} />
          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: '2px solid var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={12} />
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Photo de profil</p>
          <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '0 0 8px' }}>Importez une photo carrée (JPG, PNG, max 1MB)</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="soft" size="sm" type="button" onClick={() => fileRef.current?.click()}>Changer</Button>
            {form.photo_url && <Button variant="ghost" size="sm" type="button" onClick={() => setForm(f => ({ ...f, photo_url: undefined }))} style={{ color: 'var(--danger)' }}>Supprimer</Button>}
          </div>
          <input ref={fileRef} type="file" style={{ display: 'none' }} accept="image/*" onChange={handlePhoto} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Nom complet *" value={form.full_name ?? ''} onChange={set('full_name')} required placeholder="Amine Alami" />
        <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} placeholder="amine@gmail.com" />
        <Input label="Téléphone" value={form.phone ?? ''} onChange={set('phone')} placeholder="+212 6 00 00 00 00" />
        <Input label="École / Formation" value={form.position ?? ''} onChange={set('position')} placeholder="ENSA Casablanca" />
        <Input label="Département" value={form.department ?? ''} onChange={set('department')} placeholder="Informatique" />
        <Input label="Superviseur" value={form.manager ?? ''} onChange={set('manager')} placeholder="Sara RH" />
        <Input label="Début du stage" type="date" value={form.internship_start ?? ''} onChange={set('internship_start')} />
        <Input label="Fin du stage" type="date" value={form.internship_end ?? ''} onChange={set('internship_end')} />
        <Input label="Rémunération (DH)" type="number" value={form.remuneration ?? 0} onChange={set('remuneration')} placeholder="2000" />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Compétences (séparées par des virgules)" 
            value={form.skills?.join(', ') ?? ''} 
            onChange={setArr('skills')} 
            placeholder="React, TypeScript, SQL..." />
          <Input label="Langues (séparées par des virgules)" 
            value={form.languages?.join(', ') ?? ''} 
            onChange={setArr('languages' as any)} 
            placeholder="Français, Anglais..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="label">Résumé Expérience</label>
            <textarea className="input" rows={2} 
              style={{ resize: 'none', padding: '10px 12px' }}
              value={form.experience_summary ?? ''} 
              onChange={set('experience_summary')} 
              placeholder="2 ans d'expérience..." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="label">Résumé Formation</label>
            <textarea className="input" rows={2} 
              style={{ resize: 'none', padding: '10px 12px' }}
              value={form.education_summary ?? ''} 
              onChange={set('education_summary')} 
              placeholder="Master en informatique..." />
          </div>
        </div>

        <Input label="Certifications (séparées par des virgules)" 
          value={form.certifications?.join(', ') ?? ''} 
          onChange={setArr('certifications')} 
          placeholder="AWS, Scrums, TOEFL..." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="label">Résumé du profil (Bio)</label>
          <textarea className="input" rows={3} 
            style={{ resize: 'none', padding: '10px 12px' }}
            value={form.bio ?? ''} 
            onChange={set('bio')} 
            placeholder="Description courte du stagiaire..." />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="ghost" type="button" onClick={onCancel}>Annuler</Button>
        <Button type="submit" loading={loading}>{initial?.id ? 'Enregistrer' : 'Ajouter le stagiaire'}</Button>
      </div>
    </form>
  );
}

export default function InternsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCVImport, setShowCVImport] = useState(false);
  const [editing, setEditing] = useState<Intern | null>(null);
  const [prefill, setPrefill] = useState<Partial<Intern> | null>(null);
  const [viewingIntern, setViewingIntern] = useState<Intern | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'actions'>('info');

  const { data, isLoading } = useQuery({
    queryKey: ['interns', search],
    queryFn: () => listInterns(search ? { search } : {}),
  });

  const interns = data?.data ?? [];
  const total = data?.count ?? 0;

  // Fetch documents for the selected intern
  const { data: docsData, refetch: refetchDocs } = useQuery({
    queryKey: ['intern-docs', viewingIntern?.id],
    queryFn: () => viewingIntern?.id ? listDocuments({ profile_id: viewingIntern.id }) : Promise.resolve({ data: [], count: 0 }),
    enabled: !!viewingIntern?.id,
  });
  const internDocs = docsData?.data ?? [];

  const createMut = useMutation({
    mutationFn: createIntern,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interns'] });
      setEditing(null); setPrefill(null);
      toast.success('Stagiaire ajouté');
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Erreur lors de l\'ajout'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Intern> }) => updateIntern(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interns'] });
      setEditing(null);
      toast.success('Stagiaire mis à jour');
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Erreur mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteIntern,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['interns'] }); 
      toast.success('Stagiaire supprimé');
      setViewingIntern(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const closeModal = () => { setEditing(null); setPrefill(null); };

  return (
    <div style={{ padding: '24px 28px' }}>
      <PageHeader
        title="Stagiaires"
        subtitle={`${total} stagiaire${total !== 1 ? 's' : ''} actif${total !== 1 ? 's' : ''}`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="soft" onClick={() => setShowCVImport(true)}>
              <FileUp size={14} /> Importer CV
            </Button>
            <Button onClick={() => setEditing({} as Intern)}>
              <Plus size={14} /> Nouveau stagiaire
            </Button>
          </div>
        }
      />

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
        <input className="input" style={{ paddingLeft: 36 }}
          placeholder="Rechercher par nom..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : interns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
          <GraduationCap size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontWeight: 500, marginBottom: 8 }}>Aucun stagiaire</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Ajoutez un stagiaire manuellement ou importez un CV.</p>
          <Button onClick={() => setEditing({} as Intern)}>
            <Plus size={14} /> Ajouter un stagiaire
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {interns.map(intern => (
            <div key={intern.id} className="card card-pad hover-scale" style={{ cursor: 'pointer', transition: 'all 0.2s' }} 
              onClick={() => { 
                console.log('Opening dossier for:', intern.full_name);
                setViewingIntern(intern); 
                setActiveTab('info'); 
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar name={intern.full_name} src={intern.photo_url} size={44} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{intern.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>
                      {intern.position || 'Stagiaire'}
                    </p>
                    {intern.department && (
                      <span style={{ marginTop: 2 }}><Badge variant="default">{intern.department}</Badge></span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-sm" title="Voir le dossier" onClick={() => { setViewingIntern(intern); setActiveTab('info'); }}>
                    <Eye size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" title="Modifier" onClick={() => setEditing(intern)}>
                    <Pencil size={12} />
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                    onClick={() => { if (confirm('Supprimer ce stagiaire ?')) deleteMut.mutate(intern.id); }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, color: 'var(--fg-muted)' }}>
                {intern.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Mail size={12} /> {intern.email}
                  </div>
                )}
                {intern.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Phone size={12} /> {intern.phone}
                  </div>
                )}
                {intern.manager && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <User size={12} /> Superviseur : {intern.manager}
                  </div>
                )}
                {intern.remuneration && intern.remuneration > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--success)', fontWeight: 600 }}>
                    <TrendingUp size={12} /> Rémunération : {intern.remuneration} DH
                  </div>
                ) : null}
                {(intern.internship_start || intern.internship_end) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Calendar size={12} />
                    {safeFormat(intern.internship_start)}
                    {' → '}
                    {safeFormat(intern.internship_end)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={closeModal}
        title={editing?.id ? 'Modifier le stagiaire' : 'Nouveau stagiaire'} width={640}>
        <InternForm
          initial={editing ?? prefill ?? undefined}
          onSave={data => editing?.id
            ? updateMut.mutate({ id: editing.id, data })
            : createMut.mutate(data)
          }
          onCancel={closeModal}
          loading={createMut.isPending || updateMut.isPending}
        />
      </Modal>

      {/* MODAL DOSSIER COMPLET */}
      <Modal open={!!viewingIntern} onClose={() => setViewingIntern(null)} 
        title={`Dossier Stagiaire — ${viewingIntern?.full_name || ''}`} width={700}>
        {viewingIntern && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header Profil */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '16px', background: 'var(--bg-muted)', borderRadius: 12 }}>
              <Avatar name={viewingIntern.full_name} src={viewingIntern.photo_url} size={80} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{viewingIntern.full_name}</h3>
                <p style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>{viewingIntern.position || 'Stagiaire'}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 13, color: 'var(--fg-muted)' }}>
                  <span><Mail size={12} /> {viewingIntern.email}</span>
                  <span><Phone size={12} /> {viewingIntern.phone}</span>
                </div>
              </div>
              <Badge variant={viewingIntern.status === 'intern' ? 'primary' : 'success'}>
                {viewingIntern.status === 'intern' ? 'En stage' : 'Embauché'}
              </Badge>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 24 }}>
              {[
                { id: 'info', label: 'Profil & Bio', icon: <User size={14} /> },
                { id: 'docs', label: 'Documents', icon: <FileText size={14} /> },
                { id: 'actions', label: 'Administration', icon: <Settings size={14} /> },
              ].map(t => (
                <button key={t.id} 
                  onClick={() => setActiveTab(t.id as any)}
                  style={{ 
                    padding: '10px 4px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                    borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeTab === t.id ? 'var(--primary)' : 'var(--fg-muted)',
                    background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none', cursor: 'pointer'
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ minHeight: 300 }}>
              {activeTab === 'info' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card card-pad" style={{ background: 'var(--bg-elev)' }}>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Résumé professionnel</p>
                      <p style={{ fontSize: 14, lineHeight: 1.6 }}>{viewingIntern.bio || 'Aucun résumé disponible.'}</p>
                    </div>
                    
                    <div className="card card-pad" style={{ background: 'var(--bg-elev)' }}>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Expérience & Formation</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Expérience :</span>
                          <p style={{ fontSize: 14, margin: '2px 0 0' }}>{viewingIntern.experience_summary || 'Non renseigné'}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Formation :</span>
                          <p style={{ fontSize: 14, margin: '2px 0 0' }}>{viewingIntern.education_summary || 'Non renseigné'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="card card-pad" style={{ background: 'var(--bg-elev)' }}>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Compétences & Langues</p>
                      <div style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 13, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}>Compétences :</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {viewingIntern.skills && viewingIntern.skills.length > 0 ? viewingIntern.skills.map((s, i) => <Badge key={i} variant="primary">{s}</Badge>) : <span style={{fontSize: 13}}>Non renseigné</span>}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: 13, color: 'var(--fg-muted)', display: 'block', marginBottom: 6 }}>Langues :</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {viewingIntern.languages && viewingIntern.languages.length > 0 ? viewingIntern.languages.map((s, i) => <Badge key={i} variant="default">{s}</Badge>) : <span style={{fontSize: 13}}>Non renseigné</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card card-pad" style={{ background: 'var(--bg-elev)' }}>
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Détails Stage</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--fg-muted)' }}>Début:</span>
                          <span>{safeFormat(viewingIntern.internship_start)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--fg-muted)' }}>Fin:</span>
                          <span>{safeFormat(viewingIntern.internship_end)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--fg-muted)' }}>Superviseur:</span>
                          <span>{viewingIntern.manager || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontWeight: 700 }}>
                          <span>Rémunération:</span>
                          <span>{viewingIntern.remuneration || 0} DH</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                   {/* Liste des fichiers existants */}
                   {internDocs.length > 0 && (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                       <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Fichiers enregistrés</p>
                       {internDocs.map(d => (
                         <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 8 }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                             <FileText size={16} style={{ color: 'var(--primary)' }} />
                             <div>
                               <p style={{ fontSize: 13, fontWeight: 600 }}>{d.document_type?.toUpperCase()} — {d.name || 'Document'}</p>
                               <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Ajouté le {safeFormat(d.created_at)}</p>
                             </div>
                           </div>
                           <div style={{ display: 'flex', gap: 4 }}>
                              <a href={d.content} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                                <Eye size={12} />
                              </a>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => { if(confirm('Supprimer ce document ?')) deleteDocument(d.id).then(() => refetchDocs()); }}>
                                <Trash2 size={12} />
                              </button>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}

                   {/* Scanner/Upload */}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                     <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Scanner un nouveau document</p>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                       {[
                         { label: 'Copie CIN', type: 'cin' },
                         { label: 'Convention de stage', type: 'convention' },
                         { label: 'Contrat de confidentialité', type: 'nda' },
                         { label: 'Attestation de stage', type: 'completion' }
                       ].map(doc => (
                         <div key={doc.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10 }}>
                           <span style={{ fontSize: 13, fontWeight: 500 }}>{doc.label}</span>
                           <Button size="sm" variant="soft" onClick={() => {
                             const input = document.createElement('input');
                             input.type = 'file';
                             input.onchange = async (e: any) => {
                               const file = e.target.files?.[0];
                               if (file && viewingIntern) {
                                 try {
                                   await uploadDocument(viewingIntern.id, doc.type, doc.label, file, false);
                                   toast.success(`${doc.label} mis à jour`);
                                   refetchDocs();
                                 } catch {
                                   toast.error('Erreur lors de l\'envoi');
                                 }
                               }
                             };
                             input.click();
                           }}>
                             <FileUp size={12} />
                           </Button>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
                      <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Embauche Permanente</p>
                      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
                        Transférez ce stagiaire vers la liste des employés actifs avec un contrat CDI.
                      </p>
                      <Button variant="primary" disabled={viewingIntern.status === 'active'}
                        onClick={() => { if (confirm(`Convertir ${viewingIntern.full_name} en employé permanent ?`)) updateMut.mutate({ id: viewingIntern.id, data: { status: 'active', contract_type: 'CDI' } }); }}>
                        <CheckCircle size={14} /> Confirmer l'embauche
                      </Button>
                   </div>
                   
                   <div style={{ display: 'flex', gap: 12 }}>
                      <Button variant="soft" style={{ flex: 1 }} onClick={() => { setViewingIntern(null); setEditing(viewingIntern); }}>
                        <Pencil size={14} /> Modifier le profil
                      </Button>
                      <Button variant="danger" style={{ flex: 1 }} onClick={() => { if (confirm('Supprimer définitivement ce stagiaire ?')) deleteMut.mutate(viewingIntern.id); }}>
                        <Trash2 size={14} /> Supprimer le dossier
                      </Button>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {showCVImport && (
        <CVImportModal
          onClose={() => setShowCVImport(false)}
          onImport={data => {
            createMut.mutate({
              full_name:        data.full_name,
              email:            data.email,
              phone:            data.phone,
              address:          data.address,
              nationality:      data.nationality,
              status:           'intern',
              contract_type:    'Stage',
              // New mapped fields
              skills:           data.skills,
              bio:              data.summary,
              certifications:   data.certifications,
              photo_url:        data.photo,
              internship_start: (data as any).internship_start,
              internship_end:   (data as any).internship_end,
            });
            setShowCVImport(false);
          }}
        />
      )}
    </div>
  );
}
