import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, FileUp, GraduationCap, User, Calendar, Mail, Phone } from 'lucide-react';
import { listInterns, createIntern, updateIntern, deleteIntern } from '../../lib/api';
import { CVImportModal } from '../../components/cv/CVImportModal';
import type { Intern } from '../../lib/api';
import { Button, Badge, Card, Input, Modal, Spinner, Avatar } from '../../components/ui';
import { PageHeader } from '../../components/layout/AppShell';
import { toast } from 'sonner';
import { format } from 'date-fns';

function InternForm({ initial, onSave, onCancel, loading }: {
  initial?: Partial<Intern>; onSave: (data: Partial<Intern>) => void; onCancel: () => void; loading: boolean;
}) {
  const [form, setForm] = useState<Partial<Intern>>(initial ?? {
    full_name: '', email: '', phone: '', position: 'Stagiaire',
    department: '', manager: '', internship_start: '', internship_end: '',
    contract_type: 'Stage', status: 'intern',
  });

  const set = (k: keyof Intern) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, status: 'intern', contract_type: 'Stage' }); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Nom complet *" value={form.full_name ?? ''} onChange={set('full_name')} required placeholder="Amine Alami" />
        <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} placeholder="amine@gmail.com" />
        <Input label="Téléphone" value={form.phone ?? ''} onChange={set('phone')} placeholder="+212 6 00 00 00 00" />
        <Input label="École / Formation" value={form.position ?? ''} onChange={set('position')} placeholder="ENSA Casablanca" />
        <Input label="Département" value={form.department ?? ''} onChange={set('department')} placeholder="Informatique" />
        <Input label="Superviseur" value={form.manager ?? ''} onChange={set('manager')} placeholder="Sara RH" />
        <Input label="Début du stage" type="date" value={form.internship_start ?? ''} onChange={set('internship_start')} />
        <Input label="Fin du stage" type="date" value={form.internship_end ?? ''} onChange={set('internship_end')} />
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
  const [showModal, setShowModal] = useState(false);
  const [showCVImport, setShowCVImport] = useState(false);
  const [editing, setEditing] = useState<Intern | null>(null);
  const [prefill, setPrefill] = useState<Partial<Intern> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['interns', search],
    queryFn: () => listInterns(search ? { search } : {}),
  });

  const interns = data?.data ?? [];
  const total = data?.count ?? 0;

  const createMut = useMutation({
    mutationFn: createIntern,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interns'] });
      setShowModal(false); setPrefill(null);
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['interns'] }); toast.success('Stagiaire supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const modalOpen = showModal || !!editing;
  const closeModal = () => { setShowModal(false); setEditing(null); setPrefill(null); };

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
            <Button onClick={() => { setPrefill(null); setShowModal(true); }}>
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
          <Button onClick={() => setShowModal(true)}><Plus size={14} /> Ajouter un stagiaire</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {interns.map(intern => (
            <Card key={intern.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar name={intern.full_name} size={44} />
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
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(intern)}>
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
                {(intern.internship_start || intern.internship_end) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Calendar size={12} />
                    {intern.internship_start ? format(new Date(intern.internship_start), 'dd/MM/yyyy') : '—'}
                    {' → '}
                    {intern.internship_end ? format(new Date(intern.internship_end), 'dd/MM/yyyy') : '—'}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal}
        title={editing ? 'Modifier le stagiaire' : 'Nouveau stagiaire'} width={640}>
        <InternForm
          initial={editing ?? prefill ?? undefined}
          onSave={data => editing
            ? updateMut.mutate({ id: editing.id, data })
            : createMut.mutate(data)
          }
          onCancel={closeModal}
          loading={createMut.isPending || updateMut.isPending}
        />
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
