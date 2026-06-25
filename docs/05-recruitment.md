# Recrutement & Candidats

## Vue d'ensemble

Le module Recrutement couvre l'intégralité du cycle de recrutement : de la publication d'une offre d'emploi jusqu'à l'onboarding de la nouvelle recrue.

---

## Pages du module

### Recrutement (`/app/recruitment`)
Vue Kanban du pipeline de recrutement avec les étapes :
1. **Nouveau** — candidature reçue
2. **Présélection** — CV examiné, profil retenu
3. **Entretien RH** — entretien téléphonique ou visio planifié
4. **Entretien technique** — test ou entretien métier
5. **Offre** — proposition salariale envoyée
6. **Recruté** — offre acceptée, onboarding lancé

### Candidats (`/app/candidats`)
Base de données complète de tous les candidats :
- Informations de contact et CV attaché
- Notes d'entretien de l'équipe RH
- Statut de candidature et historique des interactions
- Possibilité d'importer un CV PDF avec extraction automatique des données

### Studio d'annonces (`/app/annonces`) `IA`
Outil de création d'offres d'emploi assisté par IA :
- Décrivez le poste en quelques mots → l'IA génère l'annonce complète
- Personnalisation du ton (formel / dynamique / startup)
- Publication automatique sur la page carrière publique de votre entreprise

---

## Flux de recrutement complet

```
Créer annonce (Studio IA)
       ↓
Publication sur page carrière publique (/postuler)
       ↓
Candidature reçue → Pipeline Kanban
       ↓
Présélection → Notes d'entretien dans la fiche candidat
       ↓
Offre acceptée → Onboarding automatiquement lancé
       ↓
Création du dossier employé
```

---

## Import de CV

1. Ouvrez la fiche d'un candidat
2. Cliquez sur **Importer CV (PDF)**
3. Sélectionnez le fichier PDF
4. Les champs (nom, email, téléphone, expérience, formation) sont pré-remplis automatiquement
5. Vérifiez et complétez les informations extraites

---

## Page publique de candidature

Chaque annonce publiée génère automatiquement une URL publique :  
`https://votre-domaine.com/postuler?annonce=ID`

Le candidat peut :
- Consulter la description du poste
- Remplir un formulaire de candidature
- Joindre son CV en PDF
- Recevoir un accusé de réception automatique par email

---

## Astuces

1. Glissez les cartes candidats d'une colonne Kanban à l'autre pour mettre à jour leur statut instantanément.
2. Utilisez les **notes privées** dans la fiche candidat — elles ne sont visibles que par l'équipe RH.
3. Archivez les candidats non retenus : ils restent disponibles pour de futures opportunités.
4. L'IA du Studio d'annonces génère aussi des questions d'entretien adaptées au poste.
