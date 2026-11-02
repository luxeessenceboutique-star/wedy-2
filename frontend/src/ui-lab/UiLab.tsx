import { useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Download, FileText, Plus, Search, Sparkles, Users, Calendar, Clock, GraduationCap, List, LayoutGrid, Columns3 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AIInsight, Avatar, Badge, Button, Card, Checkbox, DarkHeroPanel, DataRow, DataTable, Drawer, EmptyState, FilterPills,
  Input, Modal, ProgressRing, SearchInput, SegmentedTabs, Select, Skeleton, Spinner, StatCard, Switch, Textarea,
} from '@/components/ui';
import { CountUp, Reveal, stagger, type RevealVariant } from '@/components/motion';
import { Page, PageHeader } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PortalNav } from '@/components/layout/PortalNav';
import { useNotify } from '@/lib/notify';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--text-label)', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>{children}</div>
    </section>
  );
}

const REVEALS: RevealVariant[] = ['up', 'fade', 'left', 'right', 'scale', 'pill', 'growx', 'growy'];

function Kit() {
  const notify = useNotify();
  const [tab, setTab] = useState('list');
  const [pill, setPill] = useState('all');
  const [seg, setSeg] = useState('a');
  const [sw, setSw] = useState(true);
  const [sw2, setSw2] = useState(false);
  const [ck, setCk] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(false);
  const [replay, setReplay] = useState(0);

  return (
    <Page>
      <PageHeader
        title="Employés" count={126} subtitle="Dossiers, contrats et documents de toute votre équipe."
        action={<>
          <Button variant="secondary" icon={<Download size={15} />}>Exporter</Button>
          <Button icon={<Plus size={16} strokeWidth={2.2} />}>Ajouter un employé</Button>
        </>}
      />

      <Section title="Buttons">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="dark">Dark</Button>
        <Button variant="ai" icon={<Sparkles size={15} />}>AI</Button>
        <Button variant="dangerOutline">Danger outline</Button>
        <Button variant="soft">Soft</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button size="sm" variant="secondary">Small</Button>
        <Button size="lg">Large</Button>
      </Section>

      <Section title="Badges">
        <Badge variant="success" dot>Actif</Badge>
        <Badge variant="warning" dot>En congé</Badge>
        <Badge variant="danger" dot>Inactif</Badge>
        <Badge variant="primary">Planifié</Badge>
        <Badge variant="ai">IA</Badge>
        <Badge variant="info">Info</Badge>
        <Badge>Neutre</Badge>
        <Badge variant="primary" size="lg">Chip 12.5</Badge>
      </Section>

      <Section title="Stat cards">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, width: '100%' }}>
          <StatCard tone="teal" label="Total employés" value={128} hint="126 actifs · 2 inactifs" icon={<Users />} countDelay={300} />
          <StatCard tone="green" label="Présents aujourd'hui" value={104} hint="82 % de l'effectif" icon={<Clock />} delay={50} countDelay={350} />
          <StatCard tone="amber" label="Demandes en attente" value={6} hint="2 urgentes" icon={<Calendar />} delay={100} countDelay={400} />
          <StatCard tone="violet" label="Documents générés" value={1284} hint="+48 cette semaine" icon={<FileText />} delay={150} countDelay={450} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12, width: '100%' }}>
          <StatCard label="Effectif actif" value={126} icon={<Users size={18} />} change="+4 ce mois" />
          <StatCard label="Taux de présence" value="94,2 %" icon={<Clock size={18} />} color="var(--success)" change="−1,1 pt" changePositive={false} delay={50} />
          <StatCard label="Stagiaires" value={18} icon={<GraduationCap size={18} />} color="var(--ai)" delay={100} to="/app/interns" />
        </div>
      </Section>

      <Section title="Tabs, pills, view toggle">
        <SegmentedTabs size="lg" value={seg} onChange={setSeg} items={[
          { value: 'a', label: 'En attente', count: 6 }, { value: 'b', label: 'Approuvées', count: 12 }, { value: 'c', label: 'Refusées', count: 2 },
        ]} />
        <SegmentedTabs iconOnly value={tab} onChange={setTab} items={[
          { value: 'list', icon: <List size={16} />, ariaLabel: 'Liste' },
          { value: 'grid', icon: <LayoutGrid size={16} />, ariaLabel: 'Grille' },
          { value: 'kanban', icon: <Columns3 size={16} />, ariaLabel: 'Kanban' },
        ]} />
        <FilterPills value={pill} onChange={setPill} items={[
          { value: 'all', label: 'Tous', count: 24 }, { value: 'new', label: 'Nouveau' }, { value: 'int', label: 'Entretien', count: 5 },
        ]} />
      </Section>

      <Section title="Controls">
        <Switch checked={sw} onChange={setSw} label="Switch on" />
        <Switch checked={sw2} onChange={setSw2} label="Switch off" />
        <Switch checked={sw} onChange={setSw} size="sm" tone="green" label="Small green" />
        <Checkbox checked={ck} onChange={setCk} label="Checked" />
        <Checkbox checked={false} onChange={() => {}} label="Unchecked" />
        <Checkbox checked={false} indeterminate onChange={() => {}} label="Indeterminate" />
        <Spinner />
      </Section>

      <Section title="Fields">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 12, width: '100%' }}>
          <Input label="Nom complet *" placeholder="Mohammed Alami" />
          <Input label="Email" icon={<Search size={16} />} placeholder="avec icône" />
          <Input label="CIN *" error="Le CIN est obligatoire." defaultValue="" />
          <Select label="Service" defaultValue="all"><option value="all">Tous les services</option><option>Tech</option></Select>
          <Textarea label="Motif" placeholder="Texte libre" />
          <SearchInput placeholder="Rechercher un nom, un poste, un email…" />
        </div>
      </Section>

      <Section title="Avatars & rings">
        {['Salma Idrissi', 'Yasmine Benali', 'Omar Tazi', 'Karim Alaoui', 'Nadia Bennis', 'Zineb Fassi'].map(n => <Avatar key={n} name={n} size={40} />)}
        <ProgressRing value={92} size={56}><b style={{ fontSize: 13 }}>92</b></ProgressRing>
        <ProgressRing value={74} size={56}><b style={{ fontSize: 13 }}>74</b></ProgressRing>
        <ProgressRing value={58} size={56} delay={100}><b style={{ fontSize: 13 }}>58</b></ProgressRing>
      </Section>

      <Section title="AI insight & hero">
        <div style={{ width: '100%', maxWidth: 520 }}>
          <AIInsight>Solde insuffisant : 2,5 j restants pour 4 j demandés. Le CDD se termine dans 12 jours.</AIInsight>
        </div>
        <DarkHeroPanel grid radius={24} style={{ width: '100%', padding: 28, minHeight: 150 }}>
          <div style={{ position: 'relative', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-.04em', color: 'var(--on-dark-heading)' }}>
            Bonjour, <CountUp value={126} /> collaborateurs
          </div>
        </DarkHeroPanel>
      </Section>

      <Section title="Empty state, skeleton">
        <div style={{ width: '100%' }}>
          <EmptyState icon={<Search size={24} />} title="Aucun employé ne correspond" description="Essayez d'autres filtres ou un autre terme de recherche."
            action={<Button variant="secondary" size="sm">Réinitialiser les filtres</Button>} />
        </div>
        <Skeleton width={220} height={14} />
        <Skeleton width={120} height={40} radius={12} />
      </Section>

      <Section title="Data table">
        <div style={{ width: '100%' }}>
          <DataTable columns="44px minmax(200px,2fr) 1fr 110px" minWidth={640} head={<><span /><span>Nom complet</span><span>Service</span><span>Statut</span></>}>
            {['Salma Idrissi', 'Omar Tazi', 'Karim Alaoui'].map((n, i) => (
              <DataRow key={n} selected={i === 1}>
                <Checkbox checked={i === 1} onChange={() => {}} label={n} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}><Avatar name={n} size={32} />{n}</span>
                <span>Tech</span>
                <Badge variant="success" dot>Actif</Badge>
              </DataRow>
            ))}
          </DataTable>
        </div>
      </Section>

      <Section title="Overlays & toasts">
        <Button variant="secondary" onClick={() => setDrawer(true)}>Drawer</Button>
        <Button variant="secondary" onClick={() => setModal(true)}>Modal</Button>
        <Button variant="dark" onClick={() => notify.success('Employé ajouté · Mohammed Alami')}>Toast</Button>
        <Button variant="dark" onClick={() => notify.success('Document supprimé', { undo: () => toast.info('Restauré') })}>Toast + undo</Button>
        <Button variant="dark" onClick={() => notify.success('Employé supprimé · Mohammed Alami', { undo: () => toast.info('Restauré'), duration: 120000 })}>Toast + undo (stays)</Button>
        <Button variant="dark" onClick={() => notify.error('Action impossible', { duration: 120000 })}>Toast error (stays)</Button>
        <Button variant="dark" onClick={() => notify.error('Action impossible')}>Toast error</Button>
        <Button variant="dark" onClick={() => notify.info('Génération en cours…')}>Toast info</Button>
      </Section>

      <Section title="Reveal (scroll in) & loops">
        <Button variant="secondary" size="sm" onClick={() => setReplay(r => r + 1)}>Rejouer</Button>
        <div key={replay} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, width: '100%' }}>
          {REVEALS.map((v, i) => (
            <Reveal key={v} variant={v} delay={stagger(i, 60)} style={{ transformOrigin: v === 'growy' ? 'bottom' : 'left' }}>
              <Card style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</Card>
            </Reveal>
          ))}
        </div>
        <span className="wedy-ping" style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--primary-400)', display: 'inline-block' }} />
        <span className="wedy-pulse" style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
        <span className="wedy-float" style={{ display: 'inline-block' }}><Sparkles /></span>
        <span className="wedy-shimmer" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, backgroundImage: 'linear-gradient(90deg,#0e6f84,#16b6c8,#6d5ad6,#0e6f84)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>AI-native</span>
      </Section>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Ajouter un employé" subtitle="Les champs marqués * sont obligatoires." icon={<Plus size={19} />}
        onSubmit={e => { e.preventDefault(); setDrawer(false); notify.success('Employé ajouté'); }}
        footer={<><Button type="button" variant="secondary" size="lg" onClick={() => setDrawer(false)}>Annuler</Button><Button type="submit" size="lg">Enregistrer</Button></>}>
        <Input large label="Nom complet *" placeholder="Mohammed Alami" />
        <Input large label="CIN *" placeholder="BK123456" />
      </Drawer>

      <Modal open={modal} onClose={() => setModal(false)} width={440} title="Inviter un utilisateur" subtitle="Un lien d'activation valable 7 jours sera envoyé." icon={<Users size={19} />}
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Annuler</Button><Button onClick={() => setModal(false)}>Envoyer</Button></>}>
        <Input large label="Email professionnel" type="email" placeholder="prenom.nom@tython.ma" />
      </Modal>
    </Page>
  );
}

export default function UiLab({ view }: { view: string }) {
  if (view === 'sidebar') {
    return (
      <MemoryRouter initialEntries={['/app']}>
        <div style={{ width: 252, height: 820 }}><Sidebar unreadCount={3} pendingRequests={6} roleLabel="Admin RH" /></div>
      </MemoryRouter>
    );
  }
  if (view === 'topbar') {
    return (
      <MemoryRouter initialEntries={['/app/employees']}>
        <div style={{ width: 900 }}><Topbar unreadCount={3} onOpenMenu={() => {}} /></div>
      </MemoryRouter>
    );
  }
  if (view === 'portal') {
    return (
      <MemoryRouter initialEntries={['/employee']}>
        <div className="wy-portal"><PortalNav /></div>
      </MemoryRouter>
    );
  }
  return <MemoryRouter initialEntries={['/app/employees']}><Kit /></MemoryRouter>;
}
