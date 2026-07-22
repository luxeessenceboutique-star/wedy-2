# Analyses & Audit

## Vue d'ensemble

Ce module fournit les outils d'analyse décisionnelle et de traçabilité nécessaires au pilotage RH et à la conformité réglementaire.

---

## Analytique (`/app/analytics`)

### Tableaux de bord disponibles

#### Effectifs
- Évolution des effectifs sur 12 mois (entrées / sorties)
- Répartition par département, type de contrat, genre
- Taux de turnover mensuel et annualisé
- Ancienneté moyenne par département

#### Absentéisme
- Taux d'absentéisme mensuel global et par département
- Répartition par type d'absence (maladie, congé, sans solde)
- Jours d'absence perdus et coût estimé
- Tendances saisonnières

#### Recrutement
- Temps moyen pour pourvoir un poste (time-to-hire)
- Taux de conversion par étape du pipeline (entretien → offre → acceptation)
- Sources de candidatures (page carrière, recommandation interne, cabinet)
- Coût moyen par recrutement

#### Masse salariale
- Évolution mensuelle de la masse salariale
- Répartition par département et catégorie de poste
- Ratio masse salariale / chiffre d'affaires (si données disponibles)

#### Formation
- Heures de formation par employé et par département
- Taux de complétion des parcours d'onboarding
- Budget formation consommé vs. alloué

---

### Filtres disponibles

| Filtre | Options |
|---|---|
| Période | Mois, Trimestre, Semestre, Année, Personnalisé |
| Département | Tous ou sélection multiple |
| Type de contrat | CDI, CDD, Stage, Tous |
| Statut employé | Actif, Archivé, Tous |

---

### Export des rapports

- **PDF** : rapport mis en page prêt à partager avec la direction
- **CSV** : données brutes pour analyse complémentaire dans Excel
- **Lien partageable** : URL avec filtres pré-appliqués (accès restreint aux utilisateurs authentifiés)

---

## Journal d'audit (`/app/audit`)

### Qu'est-ce qui est tracé ?

Chaque action sur la plateforme génère une entrée dans le journal :

| Catégorie | Actions tracées |
|---|---|
| **Employés** | Création, modification, archivage |
| **Documents** | Génération, téléchargement, suppression |
| **Congés** | Soumission, approbation, refus |
| **Utilisateurs** | Connexion, déconnexion, création de compte |
| **Paramètres** | Toute modification de configuration |
| **Templates** | Création, modification, suppression |

### Informations par entrée

- Horodatage précis (date + heure + fuseau)
- Utilisateur (nom + email)
- Action effectuée
- Ressource concernée (avec lien direct)
- Adresse IP de la session
- Navigateur / appareil

### Filtres du journal

- Par **utilisateur** : voir toutes les actions d'un membre de l'équipe
- Par **type d'action** : créations, modifications, suppressions, connexions
- Par **ressource** : employés, documents, congés...
- Par **plage de dates** : audit ciblé sur une période

### Export pour conformité

Le journal peut être exporté en CSV pour :
- Audits internes de sécurité
- Contrôles CNDP (Commission Nationale de protection des Données Personnelles)
- Vérifications lors d'inspections du travail
- Investigations en cas d'incident de sécurité

---

## Astuces

1. **Analytique** : Programmez un export mensuel automatique du rapport effectifs pour la DG.
2. **Audit** : Filtrez par utilisateur avant de désactiver un compte — vérifiez son activité récente.
3. **Analytique** : Le taux de turnover est calculé sur 12 mois glissants — idéal pour les comparaisons sectorielles.
4. **Audit** : Conservez au moins 24 mois d'historique d'audit — exigence recommandée par la CNDP.
