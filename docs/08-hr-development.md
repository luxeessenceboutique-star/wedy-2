# Développement RH

## Vue d'ensemble

Ce module couvre les aspects stratégiques de la gestion des talents : intégration des nouvelles recrues, formation continue, cartographie des compétences et gestion des appels d'offres RH.

---

## Onboarding (`/app/onboarding`)

### Objectif
Structurer le parcours d'intégration des nouvelles recrues pour assurer une prise de poste réussie dès le premier jour.

### Création d'un parcours d'onboarding

1. Accédez à **Onboarding → Nouveau parcours**
2. Sélectionnez la nouvelle recrue
3. Choisissez un modèle d'onboarding (selon le poste) ou créez-en un
4. Personnalisez les étapes et les délais
5. Assignez des responsables pour chaque tâche

### Étapes types d'un parcours d'onboarding

| Jour | Tâche | Responsable |
|---|---|---|
| J-1 | Envoi des accès (email, outils) | IT / Admin |
| J1 | Accueil physique et visite des locaux | RH |
| J1 | Remise du matériel | IT |
| J1-J5 | Signature des documents contractuels | RH |
| J1-J5 | Formations obligatoires (sécurité, RGPD) | RH |
| J30 | Bilan d'étonnement | Manager |
| J90 | Évaluation de période d'essai | RH + Manager |

### Modèles réutilisables
Créez des modèles d'onboarding par type de poste (développeur, commercial, manager) pour standardiser le processus et gagner du temps.

---

## Formations (`/app/training`)

### Catalogue de formations
- Formations internes (animées par vos équipes)
- Formations externes (organismes agréés)
- E-learning (liens vers plateformes externes)

### Gestion des inscriptions
1. L'employé ou le RH Manager crée une demande de formation
2. Validation par le manager direct
3. Inscription confirmée avec envoi d'une convocation
4. Suivi de présence le jour J
5. Génération automatique d'une attestation de formation

### Suivi des certifications
- Date d'obtention et date d'expiration
- Alertes automatiques avant expiration (30/60/90 jours)
- Renouvellement planifié dans le calendrier RH

---

## Talents (`/app/talents`)

### Matrice 9-Box
Positionnez vos employés selon deux axes :
- **Performance** (évaluations périodiques)
- **Potentiel** (évaluation managériale)

Neuf cases de la star au sous-performant — outil clé pour les décisions de promotion et de succession.

### Cartographie des compétences
- Inventaire des compétences par employé
- Détection des écarts par rapport aux exigences du poste
- Plans de développement ciblés

### Plans de succession
Identifiez les successeurs potentiels pour les postes clés et préparez les plans de développement pour combler les écarts de compétences.

---

## Appels d'offres RH (`/app/tenders`) `IA`

### Utilisation
Gérez les appels d'offres pour des prestations RH externes :
- Cabinets de recrutement
- Organismes de formation
- Consultants RH
- Prestataires de paie externalisée

### Génération IA du cahier des charges
1. Décrivez le besoin en quelques phrases
2. L'IA génère un cahier des charges complet (contexte, périmètre, livrables, critères de sélection)
3. Personnalisez le document généré
4. Envoyez aux prestataires sélectionnés

### Comparaison des offres reçues
- Grille de critères pondérés (prix, délais, références, méthodologie)
- Notation automatique et classement des offres
- Traçabilité complète pour justifier le choix final

---

## Astuces

1. **Onboarding** : Envoyez la checklist à la nouvelle recrue par email — elle peut cocher ses tâches depuis son portail.
2. **Formations** : Associez chaque formation à un objectif de performance pour mesurer l'impact sur la progression.
3. **Talents** : Révisez la matrice 9-box après chaque cycle d'évaluation annuel.
4. **Appels d'offres** : L'IA peut aussi générer les emails de sollicitation aux prestataires pressentis.
