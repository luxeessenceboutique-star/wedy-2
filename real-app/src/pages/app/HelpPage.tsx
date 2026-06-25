import React, { useState } from 'react';
import { PageHeader } from '../../components/layout/AppShell';
import {
  Search, LayoutDashboard, Bot, Bell, Users, GraduationCap, Target,
  UserPlus, Calendar, TrendingUp, Clock, DollarSign, Network, Video,
  UserCheck, BookOpen, Star, Briefcase, Wand2, FileText, History,
  BarChart3, ClipboardList, Puzzle, UserCog, Settings, ChevronDown,
  ChevronRight, Zap, ArrowRight, ExternalLink, Lightbulb, Shield,
  HelpCircle, PlayCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PageDoc {
  icon: React.ReactNode;
  title: string;
  path: string;
  desc: string;
  tips: string[];
  badge?: string;
}

interface SectionDoc {
  id: string;
  heading: string;
  color: string;
  bg: string;
  borderColor: string;
  icon: React.ReactNode;
  pages: PageDoc[];
}

// ─── Data ────────────────────────────────────────────────────────────────────

const SECTIONS: SectionDoc[] = [
  {
    id: 'overview',
    heading: 'Vue d\'ensemble',
    color: '#0891b2',
    bg: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
    borderColor: '#a5f3fc',
    icon: <LayoutDashboard size={18} />,
    pages: [
      {
        icon: <LayoutDashboard size={15} />,
        title: 'Tableau de bord',
        path: '/app',
        desc: 'Visualisez en temps réel les KPIs RH essentiels : effectifs, congés en cours, documents générés et activité récente.',
        tips: [
          'Les cartes statistiques sont cliquables — elles redirigent vers la page concernée.',
          'Le flux d\'activité en bas affiche les 10 dernières actions de votre équipe.',
          'Actualisez les données avec le bouton en haut à droite.',
        ],
      },
      {
        icon: <Bot size={15} />,
        title: 'Copilote IA',
        path: '/app/copilot',
        badge: 'IA',
        desc: 'Assistant conversationnel alimenté par Claude AI. Posez des questions RH, rédigez des documents, obtenez des conseils juridiques marocains.',
        tips: [
          'Saisissez une question libre : "Rédige une attestation de travail pour Mohamed".',
          'Le copilote connaît votre liste d\'employés — vous pouvez le nommer directement.',
          'Copiez la réponse générée en un clic pour l\'utiliser ailleurs.',
        ],
      },
      {
        icon: <Bell size={15} />,
        title: 'Notifications',
        path: '/app/notifications',
        desc: 'Centre de notifications centralisé : demandes de congé, nouvelles candidatures, documents signés et alertes système.',
        tips: [
          'Cliquez sur une notification pour accéder directement à l\'élément concerné.',
          'Marquez tout comme lu en une seule action depuis le menu en haut.',
          'Les notifications s\'actualisent automatiquement toutes les 60 secondes.',
        ],
      },
    ],
  },
  {
    id: 'people',
    heading: 'Gestion des personnes',
    color: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    borderColor: '#ddd6fe',
    icon: <Users size={18} />,
    pages: [
      {
        icon: <Users size={15} />,
        title: 'Employés',
        path: '/app/employees',
        desc: 'Gérez l\'intégralité des dossiers employés : informations personnelles, contrats, documents et historique.',
        tips: [
          'Utilisez la recherche pour filtrer par nom, poste ou département.',
          'Cliquez sur un employé pour ouvrir son dossier complet.',
          'Exportez la liste en CSV depuis le menu d\'actions.',
        ],
      },
      {
        icon: <GraduationCap size={15} />,
        title: 'Stagiaires',
        path: '/app/interns',
        desc: 'Suivi dédié aux stagiaires : période de stage, tuteur, conventions et attestations de fin de stage.',
        tips: [
          'Générez une attestation de stage en un clic depuis le dossier du stagiaire.',
          'Filtrez par statut : en cours, terminé, à venir.',
          'La date de fin de stage affiche un indicateur visuel si elle approche.',
        ],
      },
      {
        icon: <Target size={15} />,
        title: 'Recrutement',
        path: '/app/recruitment',
        badge: 'Pipeline',
        desc: 'Gérez votre pipeline de recrutement par étapes : sourcing, entretiens, offres et décision finale.',
        tips: [
          'Glissez les candidats d\'une étape à l\'autre dans la vue Kanban.',
          'Associez une annonce à chaque poste ouvert pour le tracking automatique.',
          'Programmez des entretiens directement depuis la fiche candidat.',
        ],
      },
      {
        icon: <UserPlus size={15} />,
        title: 'Candidats',
        path: '/app/candidats',
        desc: 'Base de données complète de tous vos candidats avec CVs, notes d\'entretien et statut de candidature.',
        tips: [
          'Importez un CV PDF — les informations sont extraites automatiquement.',
          'Ajoutez des notes d\'entretien privées visibles uniquement par l\'équipe RH.',
          'Archivez les candidats non retenus pour les futures opportunités.',
        ],
      },
      {
        icon: <Wand2 size={15} />,
        title: 'Studio d\'annonces',
        path: '/app/annonces',
        badge: 'IA',
        desc: 'Créez des offres d\'emploi professionnelles avec l\'aide de l\'IA. Publiez-les sur votre page carrière publique.',
        tips: [
          'Décrivez le poste en quelques mots — l\'IA rédige l\'annonce complète.',
          'Personnalisez le ton : formel, dynamique, startup, corporate.',
          'La page de candidature publique est générée automatiquement.',
        ],
      },
      {
        icon: <Calendar size={15} />,
        title: 'Planning RH',
        path: '/app/planning-rh',
        desc: 'Calendrier RH partagé : entretiens, événements d\'équipe, échéances contractuelles et créneaux disponibles.',
        tips: [
          'Synchronisez avec Google Calendar ou Outlook depuis les Intégrations.',
          'Cliquez sur un créneau vide pour créer rapidement un événement.',
          'Filtrez la vue par type d\'événement ou par collaborateur.',
        ],
      },
      {
        icon: <TrendingUp size={15} />,
        title: 'Performances',
        path: '/app/performance',
        desc: 'Évaluations de performance périodiques, objectifs, compétences et suivi de progression par employé.',
        tips: [
          'Créez des cycles d\'évaluation avec des périodes définies.',
          'Les objectifs SMART sont mesurés automatiquement si liés à des KPIs.',
          'Exportez les rapports de performance en PDF pour les entretiens annuels.',
        ],
      },
      {
        icon: <Clock size={15} />,
        title: 'Congés & Absences',
        path: '/app/timeoff',
        desc: 'Gestion complète des congés : demandes, approbations, soldes et calendrier des absences de l\'équipe.',
        tips: [
          'Approuvez ou refusez une demande en un seul clic.',
          'Le solde de congés est mis à jour automatiquement après approbation.',
          'Le calendrier d\'équipe évite les chevauchements d\'absences.',
        ],
      },
      {
        icon: <DollarSign size={15} />,
        title: 'Paie',
        path: '/app/payroll',
        desc: 'Suivi des éléments de paie : salaires, primes, retenues et génération des bulletins de paie.',
        tips: [
          'Les données employés sont pré-remplies depuis leurs dossiers.',
          'Générez les bulletins de paie en PDF pour l\'envoi aux employés.',
          'Archivez l\'historique de paie mois par mois.',
        ],
      },
      {
        icon: <Network size={15} />,
        title: 'Organigramme',
        path: '/app/orgchart',
        desc: 'Visualisation interactive de la hiérarchie de votre organisation par départements et postes.',
        tips: [
          'L\'organigramme se met à jour automatiquement avec les données employés.',
          'Zoomez et déplacez la vue pour naviguer dans les grandes structures.',
          'Exportez l\'organigramme en image PNG pour vos présentations.',
        ],
      },
      {
        icon: <Video size={15} />,
        title: 'Réunions',
        path: '/app/meetings',
        desc: 'Planification et suivi des réunions RH : 1-on-1, réunions d\'équipe, entretiens de départ.',
        tips: [
          'Créez un ordre du jour structuré avant chaque réunion.',
          'Prenez des notes directement pendant la réunion.',
          'Envoyez un résumé automatique aux participants après la réunion.',
        ],
      },
    ],
  },
  {
    id: 'hrdev',
    heading: 'Développement RH',
    color: '#059669',
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    borderColor: '#a7f3d0',
    icon: <BookOpen size={18} />,
    pages: [
      {
        icon: <UserCheck size={15} />,
        title: 'Onboarding',
        path: '/app/onboarding',
        desc: 'Parcours d\'intégration structuré pour les nouvelles recrues : checklist, documents à signer, formations obligatoires.',
        tips: [
          'Créez des modèles d\'onboarding réutilisables par type de poste.',
          'L\'employé reçoit automatiquement sa checklist le jour J.',
          'Suivez la progression d\'onboarding en temps réel.',
        ],
      },
      {
        icon: <BookOpen size={15} />,
        title: 'Formations',
        path: '/app/training',
        desc: 'Catalogue de formations internes et externes, inscriptions, présences et suivi des certifications.',
        tips: [
          'Associez des formations aux objectifs de performance de l\'employé.',
          'Envoyez des rappels automatiques avant chaque session.',
          'Générez des attestations de formation en fin de parcours.',
        ],
      },
      {
        icon: <Star size={15} />,
        title: 'Talents',
        path: '/app/talents',
        desc: 'Cartographie des compétences, détection des hauts potentiels et plans de succession.',
        tips: [
          'La matrice 9-box classe les employés par performance et potentiel.',
          'Identifiez les écarts de compétences par département.',
          'Créez des plans de développement personnalisés.',
        ],
      },
      {
        icon: <Briefcase size={15} />,
        title: 'Appels d\'offres',
        path: '/app/tenders',
        badge: 'IA',
        desc: 'Gestion des appels d\'offres RH : rédaction assistée par IA, soumissions et suivi des prestataires.',
        tips: [
          'L\'IA génère un cahier des charges complet à partir de vos critères.',
          'Comparez automatiquement les offres reçues sur des critères définis.',
          'Archivez tous les échanges avec les prestataires.',
        ],
      },
    ],
  },
  {
    id: 'documents',
    heading: 'Documents',
    color: '#d97706',
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    borderColor: '#fde68a',
    icon: <FileText size={18} />,
    pages: [
      {
        icon: <Wand2 size={15} />,
        title: 'Générer un document',
        path: '/app/generate',
        desc: 'Générez instantanément tout type de document RH (attestation, contrat, lettre) depuis vos templates personnalisés.',
        tips: [
          'Sélectionnez un template et un employé — les données sont pré-remplies.',
          'Prévisualisez le document avant de l\'exporter en PDF ou DOCX.',
          'Utilisez l\'amélioration IA pour enrichir le contenu automatiquement.',
        ],
      },
      {
        icon: <FileText size={15} />,
        title: 'Templates',
        path: '/app/templates',
        desc: 'Bibliothèque de modèles de documents. Créez, modifiez et organisez vos templates avec variables dynamiques.',
        tips: [
          'Les variables {{nom}}, {{poste}}, {{date}} sont remplacées automatiquement.',
          'Dupliquez un template existant pour en créer une variante rapidement.',
          'Les templates HTML sont convertis en PDF avec mise en page fidèle.',
        ],
      },
      {
        icon: <History size={15} />,
        title: 'Historique',
        path: '/app/history',
        desc: 'Archive complète de tous les documents générés : date, auteur, employé concerné et lien de téléchargement.',
        tips: [
          'Filtrez par date, type de document ou employé.',
          'Re-téléchargez n\'importe quel document généré précédemment.',
          'L\'historique est immuable — chaque entrée est horodatée et signée.',
        ],
      },
    ],
  },
  {
    id: 'insights',
    heading: 'Analyses & Audit',
    color: '#dc2626',
    bg: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
    borderColor: '#fecaca',
    icon: <BarChart3 size={18} />,
    pages: [
      {
        icon: <BarChart3 size={15} />,
        title: 'Analytique',
        path: '/app/analytics',
        desc: 'Tableaux de bord analytiques avancés : turnover, absentéisme, masse salariale, tendances de recrutement.',
        tips: [
          'Filtrez les graphiques par période, département ou type de contrat.',
          'Exportez les rapports en PDF ou partagez-les via lien direct.',
          'Les tendances s\'affichent sur 6 ou 12 mois selon votre sélection.',
        ],
      },
      {
        icon: <ClipboardList size={15} />,
        title: 'Journal d\'audit',
        path: '/app/audit',
        desc: 'Traçabilité complète de toutes les actions effectuées sur la plateforme : qui a fait quoi, quand et depuis où.',
        tips: [
          'Filtrez par utilisateur, type d\'action ou plage de dates.',
          'Chaque entrée inclut l\'adresse IP et le navigateur utilisé.',
          'Exportez le journal en CSV pour vos audits de conformité.',
        ],
      },
    ],
  },
  {
    id: 'workspace',
    heading: 'Espace de travail',
    color: '#475569',
    bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    borderColor: '#e2e8f0',
    icon: <Settings size={18} />,
    pages: [
      {
        icon: <Puzzle size={15} />,
        title: 'Intégrations',
        path: '/app/integrations',
        desc: 'Connectez Wedy RH à vos outils existants : calendriers, messagerie, logiciels de paie et outils tiers.',
        tips: [
          'La connexion Google Calendar synchronise le Planning RH automatiquement.',
          'L\'API REST permet des intégrations personnalisées avec vos systèmes internes.',
          'Gérez les webhooks pour déclencher des actions sur événements RH.',
        ],
      },
      {
        icon: <UserCog size={15} />,
        title: 'Utilisateurs & Rôles',
        path: '/app/users',
        desc: 'Gérez les accès à la plateforme : créez des comptes, attribuez des rôles et définissez les permissions.',
        tips: [
          'Trois rôles disponibles : Admin, RH Manager et Employé.',
          'Un admin peut restreindre l\'accès à certains modules par rôle.',
          'Désactivez un compte sans le supprimer pour conserver l\'historique.',
        ],
      },
      {
        icon: <Settings size={15} />,
        title: 'Paramètres',
        path: '/app/settings',
        desc: 'Configuration générale : informations de l\'entreprise, fuseau horaire, langue par défaut et préférences.',
        tips: [
          'Uploadez le logo de votre entreprise — il apparaît sur tous les documents générés.',
          'Configurez les jours fériés marocains pour le calcul automatique des congés.',
          'Définissez la politique de congés (types, soldes, règles d\'accumulation).',
        ],
      },
    ],
  },
];

// ─── Quick tips ────────────────────────────────────────────────────────────

const QUICK_TIPS = [
  { icon: <Zap size={14} />, text: 'Appuyez sur Ctrl+K pour la recherche globale (bientôt disponible).' },
  { icon: <Shield size={14} />, text: 'Toutes les données sont chiffrées et hébergées en conformité RGPD.' },
  { icon: <Lightbulb size={14} />, text: 'Le Copilote IA peut rédiger n\'importe quel document RH en quelques secondes.' },
  { icon: <HelpCircle size={14} />, text: 'Chaque page dispose d\'infobulles d\'aide accessibles via l\'icône ?' },
];

// ─── Component ────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [openSection, setOpenSection] = useState<string | null>('overview');
  const [openPage, setOpenPage] = useState<string | null>(null);

  const q = query.toLowerCase().trim();

  const filtered = SECTIONS.map(section => ({
    ...section,
    pages: section.pages.filter(p =>
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      p.tips.some(t => t.toLowerCase().includes(q))
    ),
  })).filter(s => !q || s.pages.length > 0);

  const totalPages = SECTIONS.reduce((a, s) => a + s.pages.length, 0);

  return (
    <div style={{ padding: '0', minHeight: '100%', background: 'var(--bg)' }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #164e63 100%)',
        padding: '40px 40px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: '40%',
          width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HelpCircle size={18} color="#fff" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Documentation
            </span>
          </div>

          <h1 style={{
            fontSize: 30, fontWeight: 700, color: '#fff',
            marginBottom: 8, letterSpacing: '-0.03em',
          }}>
            Centre d'aide Wedy RH
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 28, maxWidth: 520 }}>
            Tout ce qu'il faut savoir pour maîtriser les {totalPages} modules de la plateforme.
          </p>

          {/* Search */}
          <div style={{
            maxWidth: 520,
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 12, padding: '12px 18px',
            backdropFilter: 'blur(8px)',
          }}>
            <Search size={16} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une page, fonctionnalité, astuce…"
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent',
                fontSize: 14, color: '#fff',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)', fontSize: 16, padding: 0,
              }}>×</button>
            )}
          </div>
        </div>
      </div>

      {/* ── STATS ROW ────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0, borderBottom: '1px solid var(--border)',
      }}>
        {[
          { label: 'Modules', value: SECTIONS.length },
          { label: 'Pages documentées', value: totalPages },
          { label: 'Fonctionnalités IA', value: 4 },
          { label: 'Astuces', value: SECTIONS.reduce((a, s) => a + s.pages.reduce((b, p) => b + p.tips.length, 0), 0) },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '16px 24px',
            borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#0891b2' }}>{stat.value}</span>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 28, alignItems: 'start' }}>

        {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-muted)' }}>
              <Search size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <p style={{ fontWeight: 500 }}>Aucun résultat pour « {query} »</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Essayez un autre terme de recherche.</p>
            </div>
          )}

          {filtered.map(section => {
            const isOpen = openSection === section.id || !!q;
            return (
              <div key={section.id} style={{
                border: '1px solid var(--border)',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                {/* Section header */}
                <button
                  onClick={() => setOpenSection(isOpen && !q ? null : section.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: section.bg,
                    border: 'none', cursor: 'pointer',
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: isOpen ? `1px solid ${section.borderColor}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: section.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', flexShrink: 0,
                    }}>
                      {section.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {section.heading}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                        {section.pages.length} page{section.pages.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  {!q && (
                    isOpen
                      ? <ChevronDown size={16} style={{ color: section.color }} />
                      : <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                  )}
                </button>

                {/* Pages list */}
                {isOpen && (
                  <div style={{ background: '#fff' }}>
                    {section.pages.map((page, idx) => {
                      const pageKey = `${section.id}-${idx}`;
                      const isPageOpen = openPage === pageKey;
                      return (
                        <div key={idx} style={{
                          borderBottom: idx < section.pages.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                          {/* Page row */}
                          <button
                            onClick={() => setOpenPage(isPageOpen ? null : pageKey)}
                            style={{
                              width: '100%', textAlign: 'left',
                              background: isPageOpen ? 'var(--bg-muted)' : '#fff',
                              border: 'none', cursor: 'pointer',
                              padding: '14px 20px',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              transition: 'background 0.15s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: `${section.color}18`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: section.color, flexShrink: 0,
                              }}>
                                {page.icon}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                                  {page.title}
                                </span>
                                {page.badge && (
                                  <span style={{
                                    fontSize: 10, fontWeight: 700,
                                    padding: '2px 7px', borderRadius: 999,
                                    background: page.badge === 'IA' ? '#ecfeff' : '#f5f3ff',
                                    color: page.badge === 'IA' ? '#0891b2' : '#7c3aed',
                                    border: `1px solid ${page.badge === 'IA' ? '#a5f3fc' : '#ddd6fe'}`,
                                    letterSpacing: '0.04em',
                                  }}>
                                    {page.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                                {page.path}
                              </span>
                              {isPageOpen
                                ? <ChevronDown size={14} style={{ color: section.color }} />
                                : <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
                              }
                            </div>
                          </button>

                          {/* Page detail */}
                          {isPageOpen && (
                            <div style={{
                              padding: '16px 20px 20px 58px',
                              background: '#fafcff',
                              borderTop: '1px solid var(--border)',
                            }}>
                              <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.65, marginBottom: 16 }}>
                                {page.desc}
                              </p>

                              <div style={{ marginBottom: 4 }}>
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  marginBottom: 10,
                                }}>
                                  <Lightbulb size={13} style={{ color: '#f59e0b' }} />
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                    Astuces
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {page.tips.map((tip, ti) => (
                                    <div key={ti} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                      <div style={{
                                        width: 18, height: 18, borderRadius: 6,
                                        background: '#fef3c7', border: '1px solid #fde68a',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, marginTop: 1,
                                        fontSize: 10, fontWeight: 700, color: '#92400e',
                                      }}>
                                        {ti + 1}
                                      </div>
                                      <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                                        {tip}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── SIDEBAR ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>

          {/* Quick tips */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 14,
            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderBottom: '1px solid #fde68a',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Lightbulb size={15} style={{ color: '#92400e' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#78350f' }}>Astuces générales</span>
            </div>
            <div style={{ background: '#fff', padding: '4px 0' }}>
              {QUICK_TIPS.map((tip, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 16px',
                  borderBottom: i < QUICK_TIPS.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>{tip.icon}</div>
                  <span style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.55 }}>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation rapide */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 14,
            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
              borderBottom: '1px solid #a5f3fc',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <PlayCircle size={15} style={{ color: '#0891b2' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#164e63' }}>Navigation rapide</span>
            </div>
            <div style={{ background: '#fff', padding: '4px 0' }}>
              {SECTIONS.map(section => (
                <button
                  key={section.id}
                  onClick={() => { setOpenSection(section.id); setQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', cursor: 'pointer',
                    padding: '10px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: section.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', flexShrink: 0,
                    }}>
                      {React.cloneElement(section.icon as React.ReactElement, { size: 11 })}
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: '#334155' }}>{section.heading}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      padding: '1px 6px', borderRadius: 999,
                      background: 'var(--bg-muted)',
                      color: 'var(--fg-muted)',
                      border: '1px solid var(--border)',
                    }}>
                      {section.pages.length}
                    </span>
                    <ArrowRight size={12} style={{ color: '#cbd5e1' }} />
                  </div>
                </button>
              ))}
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                <a href="/app/copilot" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 12.5, color: '#0891b2', fontWeight: 600, textDecoration: 'none',
                }}>
                  <Bot size={14} />
                  Demander au Copilote IA
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>

          {/* Contact support */}
          <div style={{
            borderRadius: 14, padding: '18px',
            background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
            boxShadow: '0 4px 16px rgba(8,145,178,0.25)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              Besoin d'aide ?
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.55, marginBottom: 14 }}>
              Notre Copilote IA répond à vos questions en temps réel, 24h/24.
            </p>
            <a href="/app/copilot" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fff', color: '#0891b2',
              fontSize: 13, fontWeight: 600,
              padding: '8px 14px', borderRadius: 8,
              textDecoration: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}>
              <Bot size={14} />
              Ouvrir le Copilote
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
