# Gestion des personnes

## Vue d'ensemble

Ce module regroupe toutes les fonctionnalités liées à la gestion quotidienne du capital humain : congés, paie, performances, formations et organigramme.

---

## Congés & Absences (`/app/timeoff`)

### Flux de validation
```
Employé soumet une demande (portail self-service)
       ↓
Notification envoyée au RH Manager
       ↓
RH Manager approuve ou refuse (avec commentaire)
       ↓
Solde de congés mis à jour automatiquement
       ↓
Employé notifié par email
```

### Types de congés gérés
- Congé annuel payé (selon Code du Travail marocain)
- Congé maladie (avec justificatif)
- Congé maternité / paternité
- Congé sans solde
- Récupération d'heures supplémentaires
- Jours fériés (configurables dans Paramètres)

### Soldes et calculs
- Le solde initial est configuré dans **Paramètres → Politique de congés**
- Accumulation automatique au prorata mensuel
- Historique complet des prises de congé par employé

---

## Paie (`/app/payroll`)

### Éléments de paie gérés
- Salaire brut de base
- Heures supplémentaires (avec taux configurables)
- Primes et indemnités
- Retenues (CNSS, AMO, IR)
- Avances sur salaire

### Génération des bulletins
1. Sélectionnez le mois de paie
2. Vérifiez les éléments variables du mois (absences, primes)
3. Calculez la paie globale
4. Générez les bulletins individuels en PDF
5. Distribuez via le portail employé ou par email

---

## Performances (`/app/performance`)

### Cycle d'évaluation
1. Créez un cycle avec une période définie (semestriel / annuel)
2. Définissez les objectifs par employé (SMART)
3. L'employé fait son auto-évaluation
4. Le manager complète l'évaluation
5. Entretien de bilan et plan de développement

### Indicateurs mesurés
- Atteinte des objectifs (%)
- Compétences clés (grille d'évaluation 1-5)
- Comportements professionnels
- Points forts et axes d'amélioration

---

## Organigramme (`/app/orgchart`)

Visualisation interactive de la hiérarchie organisationnelle :
- Arborescence par département et poste
- Mise à jour automatique depuis les données employés
- Zoom et navigation dans les grandes structures
- Export en image PNG pour présentations

---

## Planning RH (`/app/planning-rh`)

Calendrier partagé de l'équipe RH :
- **Onglet Calendrier** : vue mensuelle/hebdomadaire de tous les événements
- **Onglet Créneaux** : disponibilités RH pour les entretiens

Types d'événements : entretiens, réunions d'équipe, formations, échéances contractuelles, jours fériés.

---

## Réunions (`/app/meetings`)

Planification et suivi des réunions RH :
- Création avec ordre du jour structuré
- Prise de notes en temps réel pendant la réunion
- Envoi automatique du compte-rendu aux participants
- Types : 1-on-1, réunion d'équipe, entretien annuel, entretien de départ

---

## Astuces

1. **Congés** : Le calendrier d'équipe signale les chevauchements d'absences avant validation.
2. **Paie** : Les absences non justifiées sont automatiquement déduites si l'option est activée dans Paramètres.
3. **Performances** : Liez les objectifs à des KPIs mesurables pour un calcul automatique du taux d'atteinte.
4. **Organigramme** : Modifiez le manager direct dans le dossier employé pour restructurer l'arbre automatiquement.
