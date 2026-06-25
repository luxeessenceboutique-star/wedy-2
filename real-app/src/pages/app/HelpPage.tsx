import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Bot, Bell, Users, GraduationCap, Target,
  UserPlus, Calendar, TrendingUp, Clock, DollarSign, Network, Video,
  UserCheck, BookOpen, Star, Briefcase, Wand2, FileText, History,
  BarChart3, ClipboardList, Puzzle, UserCog, Settings,
  ChevronRight, Zap, ArrowRight, ExternalLink, Lightbulb,
  Shield, HelpCircle, PlayCircle, Home, Rocket,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocPage {
  id: string;
  icon: React.ReactNode;
  title: string;
  path: string;
  badge?: string;
  desc: string;
  steps?: { title: string; body: string }[];
  tips: string[];
  table?: { headers: string[]; rows: string[][] };
}

interface DocSection {
  id: string;
  label: string;
  color: string;
  lightBg: string;
  icon: React.ReactNode;
  pages: DocPage[];
}

// ─── Content ──────────────────────────────────────────────────────────────────

const SECTIONS: DocSection[] = [
  {
    id: 'overview', label: "Vue d'ensemble", color: '#0891b2',
    lightBg: '#ecfeff', icon: <LayoutDashboard size={15} />,
    pages: [
      {
        id: 'dashboard', icon: <LayoutDashboard size={16} />, title: 'Tableau de bord',
        path: '/app',
        desc: "Vue consolidée en temps réel de tous vos KPIs RH : effectifs actifs, congés en cours, documents générés ce mois et alertes importantes.",
        steps: [
          { title: 'Cartes KPI', body: "Les 4 cartes en haut affichent vos indicateurs clés. Chacune est cliquable et redirige vers la page filtrée correspondante." },
          { title: "Flux d'activité", body: "Le panneau bas liste les 10 dernières actions de votre équipe avec liens directs vers les éléments concernés." },
          { title: 'Alertes', body: "Les contrats expirant sous 30 jours, fins de stage et demandes en attente apparaissent automatiquement." },
        ],
        tips: ["Actualisez les données avec ↻ en haut à droite.", "Le tableau se rafraîchit automatiquement toutes les 5 minutes.", "Cliquez sur une alerte pour accéder directement au dossier concerné."],
      },
      {
        id: 'copilot', icon: <Bot size={16} />, title: 'Copilote IA', badge: 'IA',
        path: '/app/copilot',
        desc: "Assistant conversationnel alimenté par Claude AI (Anthropic). Il connaît votre liste d'employés, le Code du Travail marocain et peut rédiger n'importe quel document RH en langage naturel.",
        steps: [
          { title: 'Rédiger un document', body: 'Tapez : "Rédige une attestation de travail pour [Nom], en poste depuis [date] au poste de [poste]."' },
          { title: 'Questions juridiques', body: "Posez des questions sur le droit du travail marocain : délais de préavis, jours de congé légaux, procédures de licenciement." },
          { title: 'Améliorer un texte', body: 'Collez un texte existant et demandez : "Améliore ce texte pour qu\'il soit plus professionnel."' },
        ],
        tips: ["Mentionnez le nom complet de l'employé pour des résultats précis.", "Le bouton de copie copie la réponse en un clic.", "Les conversations ne sont pas stockées après fermeture de la session."],
      },
      {
        id: 'notifications', icon: <Bell size={16} />, title: 'Notifications',
        path: '/app/notifications',
        desc: "Centre de notifications centralisé. Recevez et gérez toutes les alertes : demandes de congé, nouvelles candidatures, documents signés, alertes système.",
        steps: [
          { title: 'Consulter', body: "Les notifications non lues apparaissent avec un badge sur l'icône dans la barre latérale." },
          { title: 'Agir', body: "Chaque notification est cliquable et redirige directement vers l'élément concerné." },
          { title: 'Tout marquer', body: 'Utilisez "Tout marquer comme lu" depuis le menu en haut de la liste.' },
        ],
        tips: ["Les notifications se rafraîchissent automatiquement toutes les 60 secondes.", "Configurez vos préférences dans Paramètres → Notifications."],
      },
    ],
  },
  {
    id: 'people', label: 'Personnes', color: '#7c3aed',
    lightBg: '#f5f3ff', icon: <Users size={15} />,
    pages: [
      {
        id: 'employees', icon: <Users size={16} />, title: 'Employés',
        path: '/app/employees',
        desc: "Gestion complète des dossiers du personnel actif. Chaque dossier contient les informations personnelles, contractuelles, les documents générés et l'historique des modifications.",
        steps: [
          { title: 'Créer un dossier', body: "Cliquez sur \"Nouveau employé\", remplissez les informations obligatoires (nom, poste, date d'embauche) puis sauvegardez." },
          { title: 'Importer en masse', body: "Utilisez \"Importer CSV\" avec les colonnes : prenom, nom, email, poste, departement, date_embauche, salaire, type_contrat." },
          { title: 'Générer un document', body: "Depuis le dossier employé, onglet Documents → \"Générer\" pour créer une attestation ou tout autre document." },
        ],
        tips: ["La recherche accepte les caractères arabes et les accents.", "L'archivage conserve toutes les données — préférez-le à la suppression.", "Exportez la liste complète en CSV depuis le menu Actions."],
        table: {
          headers: ['Champ CSV', 'Obligatoire', 'Exemple'],
          rows: [
            ['prenom', '✅', 'Yasmine'],
            ['nom', '✅', 'Benali'],
            ['email', '✅', 'y.benali@entreprise.ma'],
            ['poste', '✅', 'Responsable Marketing'],
            ['departement', '✅', 'Marketing'],
            ['date_embauche', '✅', '2022-03-15'],
            ['salaire', '❌', '12000'],
            ['type_contrat', '❌', 'CDI'],
          ],
        },
      },
      {
        id: 'interns', icon: <GraduationCap size={16} />, title: 'Stagiaires',
        path: '/app/interns',
        desc: "Suivi dédié aux stagiaires : période de stage, tuteur référent, conventions signées et génération d'attestations de fin de stage.",
        steps: [
          { title: 'Ajouter un stagiaire', body: "Renseignez les dates de début/fin de stage, le tuteur et le sujet de stage." },
          { title: 'Générer une attestation', body: 'Depuis le dossier → "Générer attestation de stage" en un clic à la fin du stage.' },
        ],
        tips: ["Un indicateur visuel signale les stages se terminant dans moins de 7 jours.", "Filtrez par statut : En cours / Terminé / À venir."],
      },
      {
        id: 'recruitment', icon: <Target size={16} />, title: 'Recrutement', badge: 'Pipeline',
        path: '/app/recruitment',
        desc: "Vue Kanban du pipeline de recrutement. Glissez les candidats d'une étape à l'autre : Nouveau → Présélection → Entretien RH → Entretien technique → Offre → Recruté.",
        steps: [
          { title: 'Créer un poste', body: "Associez chaque colonne Kanban à une offre d'emploi publiée depuis le Studio d'annonces." },
          { title: 'Déplacer un candidat', body: "Glissez-déposez la carte candidat vers l'étape suivante ou utilisez le menu contextuel." },
          { title: 'Planifier un entretien', body: 'Depuis la fiche candidat → "Planifier entretien" pour créer un créneau dans le Planning RH.' },
        ],
        tips: ["Cliquez sur une carte pour ouvrir la fiche détaillée du candidat.", "Les candidats recrutés génèrent automatiquement une demande d'onboarding."],
      },
      {
        id: 'candidats', icon: <UserPlus size={16} />, title: 'Candidats',
        path: '/app/candidats',
        desc: "Base de données complète de tous les candidats avec CVs attachés, notes d'entretien privées et historique des interactions.",
        steps: [
          { title: 'Importer un CV', body: "Cliquez \"Importer CV (PDF)\" — les informations sont extraites automatiquement : nom, email, téléphone, expériences." },
          { title: 'Ajouter des notes', body: "Les notes d'entretien sont privées et visibles uniquement par l'équipe RH." },
          { title: 'Archiver', body: "Archivez les candidats non retenus pour les retrouver lors de futures opportunités." },
        ],
        tips: ["L'extraction automatique de CV fonctionne mieux sur les PDF avec du texte sélectionnable.", "Utilisez les étiquettes pour classer les candidats par compétence clé."],
      },
      {
        id: 'annonces', icon: <Wand2 size={16} />, title: "Studio d'annonces", badge: 'IA',
        path: '/app/annonces',
        desc: "Créez des offres d'emploi professionnelles assistées par IA. Décrivez le poste en quelques mots — l'IA génère l'annonce complète avec profil recherché, missions et avantages.",
        steps: [
          { title: 'Générer une annonce', body: "Saisissez le titre du poste et une courte description → l'IA rédige l'annonce complète." },
          { title: 'Personnaliser le ton', body: "Choisissez parmi : Formel / Dynamique / Startup / Corporate pour adapter le style." },
          { title: 'Publier', body: 'Cliquez "Publier" pour mettre l\'annonce en ligne sur votre page carrière publique.' },
        ],
        tips: ["L'IA peut aussi générer des questions d'entretien adaptées au poste.", "Chaque annonce publiée génère une URL publique de candidature unique."],
      },
      {
        id: 'planning', icon: <Calendar size={16} />, title: 'Planning RH',
        path: '/app/planning-rh',
        desc: "Calendrier partagé de l'équipe RH avec deux vues : calendrier mensuel/hebdomadaire et gestion des créneaux disponibles pour les entretiens.",
        steps: [
          { title: 'Ajouter un événement', body: "Cliquez sur un créneau vide dans le calendrier pour créer rapidement un événement." },
          { title: 'Gérer les créneaux', body: "L'onglet Créneaux définit les disponibilités RH pour la prise de rendez-vous par les managers." },
        ],
        tips: ["Synchronisez avec Google Calendar ou Outlook depuis les Intégrations.", "Filtrez la vue par type d'événement ou par collaborateur."],
      },
      {
        id: 'performance', icon: <TrendingUp size={16} />, title: 'Performances',
        path: '/app/performance',
        desc: "Évaluations périodiques, objectifs SMART, grille de compétences et plans de développement individuel.",
        steps: [
          { title: 'Créer un cycle', body: "Définissez la période (semestrielle / annuelle), les participants et la grille d'évaluation." },
          { title: 'Auto-évaluation', body: "L'employé complète son auto-évaluation depuis son portail self-service." },
          { title: 'Évaluation manager', body: "Le manager renseigne la grille et rédige ses commentaires de développement." },
        ],
        tips: ["Liez les objectifs à des KPIs mesurables pour un calcul automatique du taux d'atteinte.", "Exportez les rapports de performance en PDF pour les entretiens annuels."],
      },
      {
        id: 'timeoff', icon: <Clock size={16} />, title: 'Congés & Absences',
        path: '/app/timeoff',
        desc: "Gestion complète des congés : soumission, validation, soldes et calendrier visuel des absences de l'équipe pour éviter les chevauchements.",
        steps: [
          { title: 'Valider une demande', body: "Les demandes en attente apparaissent en haut de page. Approuvez ou refusez en un clic avec commentaire optionnel." },
          { title: 'Vérifier les soldes', body: "Chaque employé dispose d'un compteur de solde mis à jour automatiquement après chaque approbation." },
          { title: 'Vue calendrier', body: "Le calendrier d'équipe affiche toutes les absences validées — les chevauchements sont signalés visuellement." },
        ],
        tips: ["Le solde s'accumule automatiquement au prorata mensuel selon la politique configurée dans Paramètres.", "Les congés maternité/paternité sont à durée fixe selon la loi marocaine."],
      },
      {
        id: 'payroll', icon: <DollarSign size={16} />, title: 'Paie',
        path: '/app/payroll',
        desc: "Suivi des éléments de paie mensuels, calcul des bulletins et génération PDF. Les données sont pré-remplies depuis les dossiers employés.",
        steps: [
          { title: 'Préparer la paie', body: "Sélectionnez le mois, vérifiez les éléments variables (absences, primes, heures sup)." },
          { title: 'Générer les bulletins', body: 'Cliquez "Générer tous les bulletins" pour créer les PDF de l\'ensemble du personnel en une seule action.' },
          { title: 'Distribuer', body: "Envoyez via le portail employé (accès sécurisé) ou par email depuis la plateforme." },
        ],
        tips: ["Archivez chaque mois de paie — l'historique est consultable et téléchargeable à tout moment.", "Les retenues légales (CNSS, AMO, IR) sont calculées automatiquement selon les taux en vigueur."],
      },
      {
        id: 'orgchart', icon: <Network size={16} />, title: 'Organigramme',
        path: '/app/orgchart',
        desc: "Visualisation interactive de la hiérarchie de votre organisation. L'arbre se construit automatiquement depuis les données des dossiers employés.",
        steps: [
          { title: 'Naviguer', body: "Zoomez avec la molette, cliquez-glissez pour déplacer la vue, cliquez sur un nœud pour voir la fiche employé." },
          { title: 'Mettre à jour', body: 'Modifiez le champ "Manager direct" dans le dossier d\'un employé pour restructurer l\'arbre immédiatement.' },
          { title: 'Exporter', body: 'Bouton "Exporter PNG" pour télécharger une image de l\'organigramme pour vos présentations.' },
        ],
        tips: ["L'organigramme se met à jour en temps réel à chaque modification d'un dossier employé."],
      },
      {
        id: 'meetings', icon: <Video size={16} />, title: 'Réunions',
        path: '/app/meetings',
        desc: "Planification et suivi des réunions RH : 1-on-1, réunions d'équipe, entretiens de départ, bilans de performance.",
        steps: [
          { title: 'Créer une réunion', body: "Définissez l'ordre du jour, les participants et le créneau horaire." },
          { title: 'Prendre des notes', body: "L'éditeur de notes intégré permet de consigner les décisions en temps réel pendant la réunion." },
          { title: 'Envoyer le CR', body: "Après la réunion, envoyez automatiquement le compte-rendu par email à tous les participants." },
        ],
        tips: ["Les réunions créées ici apparaissent automatiquement dans le Planning RH."],
      },
    ],
  },
  {
    id: 'hrdev', label: 'Développement RH', color: '#059669',
    lightBg: '#ecfdf5', icon: <BookOpen size={15} />,
    pages: [
      {
        id: 'onboarding', icon: <UserCheck size={16} />, title: 'Onboarding',
        path: '/app/onboarding',
        desc: "Parcours d'intégration structuré pour les nouvelles recrues. Checklists personnalisables, suivi de progression et génération automatique des documents d'accueil.",
        steps: [
          { title: 'Créer un modèle', body: "Construisez des modèles d'onboarding réutilisables par type de poste (commercial, dev, manager...)." },
          { title: 'Lancer un parcours', body: "À la création d'un employé, associez-lui un modèle d'onboarding — il reçoit automatiquement sa checklist." },
          { title: 'Suivre la progression', body: "Tableau de bord de progression avec taux de complétion par étape et alertes sur les tâches en retard." },
        ],
        tips: ["La nouvelle recrue peut cocher ses tâches depuis son portail employé.", "Planifiez automatiquement le bilan J30 et l'évaluation de période d'essai J90."],
      },
      {
        id: 'training', icon: <BookOpen size={16} />, title: 'Formations',
        path: '/app/training',
        desc: "Catalogue de formations internes et externes, gestion des inscriptions, suivi des présences et génération d'attestations de formation.",
        steps: [
          { title: 'Créer une formation', body: "Renseignez le titre, l'organisme, les dates, le nombre de places et le budget." },
          { title: 'Inscrire des employés', body: "Depuis la fiche formation ou depuis le dossier employé → onglet Formations." },
          { title: 'Clôturer', body: "Confirmez les présences et générez les attestations de participation en un clic." },
        ],
        tips: ["Associez une formation à un objectif de performance pour mesurer son impact.", "Les alertes de renouvellement de certification se déclenchent 30, 60 et 90 jours avant expiration."],
      },
      {
        id: 'talents', icon: <Star size={16} />, title: 'Talents',
        path: '/app/talents',
        desc: "Cartographie des compétences, matrice 9-box performance/potentiel et plans de succession pour les postes clés.",
        steps: [
          { title: 'Matrice 9-box', body: "Positionnez vos employés selon leur performance (évaluations) et leur potentiel (évaluation managériale)." },
          { title: 'Identifier les écarts', body: "Comparez les compétences actuelles aux exigences du poste pour cibler les plans de développement." },
          { title: 'Plans de succession', body: "Désignez des successeurs pour les postes clés et planifiez leur montée en compétences." },
        ],
        tips: ["Révisez la matrice 9-box après chaque cycle d'évaluation annuel.", "Les hauts potentiels identifiés sont automatiquement proposés lors des vacances de poste internes."],
      },
      {
        id: 'tenders', icon: <Briefcase size={16} />, title: "Appels d'offres", badge: 'IA',
        path: '/app/tenders',
        desc: "Gestion des appels d'offres pour prestataires RH (cabinets de recrutement, organismes de formation, consultants). L'IA génère le cahier des charges.",
        steps: [
          { title: 'Générer le CDC', body: "Décrivez le besoin en quelques phrases → l'IA génère un cahier des charges complet avec livrables et critères." },
          { title: 'Envoyer aux prestataires', body: "Sélectionnez les prestataires dans votre annuaire et envoyez le CDC par email depuis la plateforme." },
          { title: 'Comparer les offres', body: "Renseignez les propositions reçues — la grille pondérée classe les offres automatiquement." },
        ],
        tips: ["L'IA peut aussi générer les emails de relance aux prestataires qui n'ont pas répondu.", "Archivez tous les AO — obligatoire pour les audits de commande publique."],
      },
    ],
  },
  {
    id: 'documents', label: 'Documents', color: '#d97706',
    lightBg: '#fffbeb', icon: <FileText size={15} />,
    pages: [
      {
        id: 'generate', icon: <Wand2 size={16} />, title: 'Générer un document',
        path: '/app/generate',
        desc: "Générateur de documents RH en quelques clics. Sélectionnez un template, choisissez un employé, prévisualisez et exportez en PDF ou DOCX.",
        steps: [
          { title: 'Choisir le template', body: "Sélectionnez le type de document : attestation de travail, contrat CDI, attestation de stage, etc." },
          { title: "Sélectionner l'employé", body: "Recherchez et sélectionnez l'employé — toutes ses données sont pré-remplies automatiquement." },
          { title: 'Prévisualiser et exporter', body: "Vérifiez le rendu final, modifiez si nécessaire, puis exportez en PDF (impression/envoi) ou DOCX (modification)." },
        ],
        tips: ["Le bouton ✨ \"Améliorer avec l'IA\" reformule et enrichit le contenu du document.", "Le document généré est automatiquement archivé dans l'Historique."],
        table: {
          headers: ['Format', 'Usage recommandé'],
          rows: [
            ['PDF', 'Documents officiels, envoi par email, impression'],
            ['DOCX', 'Documents à modifier manuellement avant signature'],
          ],
        },
      },
      {
        id: 'templates', icon: <FileText size={16} />, title: 'Modèles',
        path: '/app/templates',
        desc: "Bibliothèque de templates personnalisables avec variables dynamiques. Créez vos propres modèles HTML qui se peuplent automatiquement avec les données employés.",
        steps: [
          { title: 'Utiliser un template existant', body: "Choisissez parmi les templates fournis (attestation, contrat, charte) et personnalisez-les à votre charte graphique." },
          { title: 'Créer un nouveau template', body: "Nouveau → rédigez le contenu HTML avec les variables {{}} → prévisualisez → sauvegardez." },
          { title: 'Variables disponibles', body: "{{nom_complet}}, {{poste}}, {{departement}}, {{date_embauche}}, {{salaire_brut}}, {{entreprise}}, {{date_aujourd_hui}}, {{directeur}}." },
        ],
        tips: ["Dupliquez un template pour créer une variante sans repartir de zéro.", "Le logo de votre entreprise (configuré dans Paramètres) est injecté automatiquement."],
      },
      {
        id: 'history', icon: <History size={16} />, title: 'Historique',
        path: '/app/history',
        desc: "Archive immuable et horodatée de tous les documents générés. Retrouvez, filtrez et re-téléchargez n'importe quel document passé.",
        steps: [
          { title: 'Rechercher un document', body: "Filtrez par employé, type de document, auteur ou plage de dates." },
          { title: 'Re-télécharger', body: "Cliquez sur le bouton de téléchargement à droite de chaque entrée pour récupérer le fichier original." },
        ],
        tips: ["L'historique est permanent — même si un employé est archivé, ses documents restent accessibles.", "Chaque entrée inclut l'auteur et l'employé concerné pour la traçabilité."],
      },
    ],
  },
  {
    id: 'insights', label: 'Analyses & Audit', color: '#dc2626',
    lightBg: '#fff1f2', icon: <BarChart3 size={15} />,
    pages: [
      {
        id: 'analytics', icon: <BarChart3 size={16} />, title: 'Analytique',
        path: '/app/analytics',
        desc: "Tableaux de bord analytiques avancés : turnover, absentéisme, masse salariale et tendances de recrutement sur 6 ou 12 mois.",
        steps: [
          { title: 'Sélectionner la vue', body: "Choisissez parmi les tableaux : Effectifs, Absentéisme, Recrutement, Masse salariale, Formations." },
          { title: 'Appliquer les filtres', body: "Filtrez par période, département, type de contrat pour des analyses ciblées." },
          { title: 'Exporter', body: "Exportez en PDF (rapport mis en page) ou CSV (données brutes pour Excel)." },
        ],
        tips: ["Le taux de turnover est calculé sur 12 mois glissants.", "Partagez un rapport via lien direct — l'accès est restreint aux utilisateurs authentifiés."],
      },
      {
        id: 'audit', icon: <ClipboardList size={16} />, title: "Journal d'audit",
        path: '/app/audit',
        desc: "Traçabilité complète de toutes les actions effectuées sur la plateforme : qui a fait quoi, quand, depuis quelle adresse IP.",
        steps: [
          { title: 'Consulter', body: "Les entrées les plus récentes apparaissent en haut. Chaque ligne est cliquable pour voir les détails complets." },
          { title: 'Filtrer', body: "Filtrez par utilisateur, type d'action (création, modification, suppression, connexion) ou plage de dates." },
          { title: 'Exporter pour conformité', body: "Exportez en CSV pour vos audits CNDP, inspections du travail ou investigations de sécurité." },
        ],
        tips: ["Conservez 24 mois d'historique minimum (recommandation CNDP).", "Filtrez par utilisateur avant de désactiver un compte — vérifiez son activité récente."],
      },
    ],
  },
  {
    id: 'workspace', label: 'Espace de travail', color: '#475569',
    lightBg: '#f8fafc', icon: <Settings size={15} />,
    pages: [
      {
        id: 'integrations', icon: <Puzzle size={16} />, title: 'Intégrations',
        path: '/app/integrations',
        desc: "Connectez Wedy RH à vos outils existants : Google Calendar, Slack, Microsoft Teams, logiciels de paie (Sage, Cegid) et API REST personnalisée.",
        steps: [
          { title: 'Activer une intégration', body: "Cliquez sur le service → suivez l'authentification OAuth ou saisissez la clé API → Tester → Activer." },
          { title: 'Configurer les webhooks', body: "Définissez les événements déclencheurs (employee.created, leave.approved...) et l'URL de destination." },
        ],
        tips: ["Testez toujours une intégration avec un événement réel avant la mise en production.", "L'API REST permet des intégrations personnalisées avec tous vos systèmes internes."],
      },
      {
        id: 'users', icon: <UserCog size={16} />, title: 'Utilisateurs & Rôles',
        path: '/app/users',
        desc: "Gérez les accès à la plateforme : invitations, rôles (Admin / RH Manager / Employé) et désactivation de comptes.",
        steps: [
          { title: 'Inviter', body: "Saisissez l'email → sélectionnez le rôle → envoyez l'invitation. L'utilisateur crée son mot de passe via le lien reçu." },
          { title: 'Modifier un rôle', body: "Menu ⋯ → \"Modifier le rôle\" — le changement est effectif immédiatement." },
          { title: 'Désactiver', body: "Préférez la désactivation à la suppression — l'historique des actions est conservé." },
        ],
        tips: ["Activez la 2FA pour les comptes Admin (recommandé).", "Créez des comptes employés en masse depuis Employés → Exporter CSV puis Utilisateurs → Import."],
        table: {
          headers: ['Rôle', 'Employés', 'Documents', 'Paramètres', 'Utilisateurs'],
          rows: [
            ['Admin', '✅', '✅', '✅', '✅'],
            ['RH Manager', '✅', '✅', '❌', '❌'],
            ['Employé', '❌', '❌', '❌', '❌'],
          ],
        },
      },
      {
        id: 'settings', icon: <Settings size={16} />, title: 'Paramètres',
        path: '/app/settings',
        desc: "Configuration générale de la plateforme : informations entreprise, politique de congés, notifications et sécurité.",
        steps: [
          { title: "Configurer l'entreprise", body: "Renseignez le nom légal, ICE, CNSS, adresse et uploadez votre logo — il apparaîtra sur tous les documents." },
          { title: 'Politique de congés', body: "Définissez les types de congés, soldes initiaux, règles d'accumulation et jours fériés marocains." },
          { title: 'Sécurité', body: "Configurez la politique de mots de passe, durée de session et activez la 2FA obligatoire pour les admins." },
        ],
        tips: ["Configurez l'entreprise et le logo avant de générer votre premier document.", "La liste des jours fériés marocains est pré-chargée et mise à jour annuellement."],
      },
    ],
  },
];

// ─── Home cards ───────────────────────────────────────────────────────────────

const HOME_CARDS = [
  { icon: <Rocket size={20} />, title: 'Démarrage rapide', desc: "Configurez votre entreprise et générez votre premier document en 5 minutes.", color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', sectionId: 'overview', pageId: 'dashboard' },
  { icon: <Bot size={20} />, title: 'Copilote IA', desc: "Rédigez n'importe quel document RH en langage naturel avec Claude AI.", color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', sectionId: 'overview', pageId: 'copilot' },
  { icon: <FileText size={20} />, title: 'Documents', desc: "Générez des attestations, contrats et bulletins de paie en quelques clics.", color: '#d97706', bg: '#fffbeb', border: '#fde68a', sectionId: 'documents', pageId: 'generate' },
  { icon: <Users size={20} />, title: 'Gestion RH', desc: "Employés, recrutement, congés, paie et performances dans un seul outil.", color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', sectionId: 'people', pageId: 'employees' },
  { icon: <BarChart3 size={20} />, title: 'Analytique', desc: "Tableaux de bord et indicateurs clés pour piloter vos RH avec données.", color: '#dc2626', bg: '#fff1f2', border: '#fecaca', sectionId: 'insights', pageId: 'analytics' },
  { icon: <Shield size={20} />, title: 'Sécurité & Audit', desc: "Traçabilité complète, contrôle d'accès et conformité RGPD/CNDP.", color: '#475569', bg: '#f8fafc', border: '#e2e8f0', sectionId: 'insights', pageId: 'audit' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'people', 'hrdev', 'documents', 'insights', 'workspace'])
  );

  const q = query.toLowerCase().trim();

  const currentPage = activeSection && activePage
    ? SECTIONS.find(s => s.id === activeSection)?.pages.find(p => p.id === activePage)
    : null;
  const currentSection = SECTIONS.find(s => s.id === activeSection);

  const searchResults: { section: DocSection; page: DocPage }[] = q
    ? SECTIONS.flatMap(s =>
        s.pages
          .filter(p => p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.tips.some(t => t.toLowerCase().includes(q)))
          .map(p => ({ section: s, page: p }))
      )
    : [];

  const openPage = (sectionId: string, pageId: string) => {
    setActiveSection(sectionId);
    setActivePage(pageId);
    setQuery('');
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allPages = SECTIONS.flatMap(s => s.pages.map(p => ({ sectionId: s.id, pageId: p.id, title: p.title })));

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
            <Search size={13} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher…"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--fg)' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
            )}
          </div>
        </div>

        {/* Nav list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {/* Home */}
          <button
            onClick={() => { setActiveSection(null); setActivePage(null); setQuery(''); }}
            style={{
              width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 7,
              background: (!activeSection && !q) ? '#ecfeff' : 'transparent',
              color: (!activeSection && !q) ? '#0891b2' : 'var(--fg-muted)',
              fontWeight: (!activeSection && !q) ? 600 : 400,
              fontSize: 13, transition: 'all 0.12s', marginBottom: 4,
            }}
          >
            <Home size={13} />
            Accueil documentation
          </button>

          {SECTIONS.map(section => (
            <div key={section.id} style={{ marginBottom: 2 }}>
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 10px', background: 'transparent', borderRadius: 6,
                  fontSize: 10.5, fontWeight: 700, color: 'var(--fg-subtle)',
                  letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: section.color }}>{section.icon}</span>
                  {section.label}
                </div>
                <ChevronRight size={10} style={{ transition: 'transform 0.15s', transform: expandedSections.has(section.id) ? 'rotate(90deg)' : 'none' }} />
              </button>

              {expandedSections.has(section.id) && section.pages.map(page => {
                const isActive = activeSection === section.id && activePage === page.id;
                return (
                  <button
                    key={page.id}
                    onClick={() => openPage(section.id, page.id)}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px 6px 22px', borderRadius: 7,
                      background: isActive ? section.lightBg : 'transparent',
                      borderLeft: isActive ? `2px solid ${section.color}` : '2px solid transparent',
                      fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                      color: isActive ? section.color : 'var(--fg-muted)',
                      transition: 'all 0.1s', marginBottom: 1,
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--fg)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; } }}
                  >
                    <span style={{ color: isActive ? section.color : 'var(--fg-subtle)', flexShrink: 0 }}>{page.icon}</span>
                    <span style={{ flex: 1 }}>{page.title}</span>
                    {page.badge && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' }}>
                        {page.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => navigate('/app/copilot')}
            style={{
              width: '100%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #0891b2, #0e7490)',
              color: '#fff', borderRadius: 8, padding: '9px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12.5, fontWeight: 600,
            }}
          >
            <Bot size={14} />
            Demander au Copilote IA
            <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* SEARCH RESULTS */}
        {q && (
          <div style={{ padding: '28px 36px' }}>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
              <strong style={{ color: 'var(--fg)' }}>{searchResults.length}</strong> résultat{searchResults.length !== 1 ? 's' : ''} pour «&nbsp;{query}&nbsp;»
            </div>
            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Search size={36} style={{ color: 'var(--border)', display: 'block', margin: '0 auto 14px' }} />
                <p style={{ fontWeight: 600, color: 'var(--fg)' }}>Aucun résultat</p>
                <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 6 }}>Essayez un autre terme ou parcourez les sections à gauche.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {searchResults.map(({ section, page }) => (
                  <button
                    key={`${section.id}-${page.id}`}
                    onClick={() => openPage(section.id, page.id)}
                    style={{ textAlign: 'left', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = section.color; e.currentTarget.style.boxShadow = `0 0 0 3px ${section.color}18`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: section.lightBg, border: `1px solid ${section.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: section.color, flexShrink: 0 }}>
                      {page.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{page.title}</span>
                        <span style={{ fontSize: 11, color: section.color, background: section.lightBg, padding: '1px 7px', borderRadius: 999, border: `1px solid ${section.color}30` }}>{section.label}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.55 }}>{page.desc}</p>
                    </div>
                    <ArrowRight size={16} style={{ color: 'var(--fg-subtle)', flexShrink: 0, marginTop: 10 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAGE DETAIL */}
        {!q && currentPage && currentSection && (
          <div style={{ paddingBottom: 60 }}>
            {/* Hero */}
            <div style={{ background: `linear-gradient(135deg, ${currentSection.lightBg} 0%, #fff 70%)`, borderBottom: '1px solid var(--border)', padding: '28px 36px 24px' }}>
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, color: 'var(--fg-muted)' }}>
                <button onClick={() => { setActiveSection(null); setActivePage(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 12, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Home size={11} /> Accueil
                </button>
                <ChevronRight size={10} />
                <span>{currentSection.label}</span>
                <ChevronRight size={10} />
                <span style={{ color: currentSection.color, fontWeight: 600 }}>{currentPage.title}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: currentSection.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: `0 4px 16px ${currentSection.color}40` }}>
                  {currentPage.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{currentPage.title}</h1>
                    {currentPage.badge && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' }}>{currentPage.badge}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.65, maxWidth: 580 }}>{currentPage.desc}</p>
                </div>
              </div>

              <button
                onClick={() => navigate(currentPage.path)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: currentSection.color, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: `0 2px 8px ${currentSection.color}40` }}
              >
                <PlayCircle size={14} />
                Ouvrir la page
                <ExternalLink size={12} />
              </button>
            </div>

            <div style={{ padding: '24px 36px', display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Steps */}
              {currentPage.steps && currentPage.steps.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PlayCircle size={12} style={{ color: currentSection.color }} />
                    Comment utiliser cette page
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {currentPage.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: currentSection.lightBg, border: `1px solid ${currentSection.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: currentSection.color }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', marginBottom: 3 }}>{step.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{step.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table */}
              {currentPage.table && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Référence
                  </div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-muted)' }}>
                          {currentPage.table.headers.map((h, i) => (
                            <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--fg)', fontSize: 12, borderBottom: '1px solid var(--border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {currentPage.table.rows.map((row, ri) => (
                          <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : 'var(--bg-muted)' }}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ padding: '9px 16px', color: 'var(--fg-muted)', borderBottom: ri < currentPage.table!.rows.length - 1 ? '1px solid var(--border)' : 'none', fontFamily: ci === 0 ? 'monospace' : 'inherit', fontSize: ci === 0 ? 12 : 13 }}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lightbulb size={12} style={{ color: '#d97706' }} />
                  Astuces & conseils
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {currentPage.tips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 9, padding: '11px 15px' }}>
                      <Zap size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prev / Next */}
              {(() => {
                const idx = allPages.findIndex(p => p.sectionId === activeSection && p.pageId === activePage);
                const prev = idx > 0 ? allPages[idx - 1] : null;
                const next = idx < allPages.length - 1 ? allPages[idx + 1] : null;
                if (!prev && !next) return null;
                return (
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                    {prev && (
                      <button onClick={() => openPage(prev.sectionId, prev.pageId)} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', background: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ArrowRight size={14} style={{ transform: 'rotate(180deg)', color: 'var(--fg-muted)' }} />
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 2 }}>Précédent</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{prev.title}</div>
                        </div>
                      </button>
                    )}
                    {next && (
                      <button onClick={() => openPage(next.sectionId, next.pageId)} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', background: '#fff', cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 2 }}>Suivant</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{next.title}</div>
                        </div>
                        <ArrowRight size={14} style={{ color: 'var(--fg-muted)' }} />
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* HOME STATE */}
        {!q && !currentPage && (
          <div>
            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #164e63 100%)', padding: '32px 40px 36px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <HelpCircle size={15} color="rgba(255,255,255,0.8)" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Documentation Wedy RH</span>
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>Comment pouvons-nous vous aider ?</h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', maxWidth: 460 }}>
                  {SECTIONS.reduce((a, s) => a + s.pages.length, 0)} pages documentées · {SECTIONS.length} modules · Guides pas-à-pas
                </p>
              </div>
            </div>

            <div style={{ padding: '24px 32px' }}>
              {/* Quick access */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Accès rapide</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
                {HOME_CARDS.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => openPage(card.sectionId, card.pageId)}
                    style={{ textAlign: 'left', border: `1px solid ${card.border}`, borderRadius: 12, padding: '16px', background: card.bg, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${card.color}20`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 10 }}>{card.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>{card.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.55 }}>{card.desc}</div>
                  </button>
                ))}
              </div>

              {/* All modules */}
              {SECTIONS.map(section => (
                <div key={section.id} style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: section.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      {React.cloneElement(section.icon as React.ReactElement, { size: 11 })}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{section.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>— {section.pages.length} pages</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
                    {section.pages.map(page => (
                      <button
                        key={page.id}
                        onClick={() => openPage(section.id, page.id)}
                        style={{ textAlign: 'left', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = section.color; e.currentTarget.style.background = section.lightBg; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: section.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: section.color, flexShrink: 0 }}>
                          {page.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {page.title}
                            {page.badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' }}>{page.badge}</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {page.desc.slice(0, 52)}…
                          </div>
                        </div>
                        <ChevronRight size={12} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
