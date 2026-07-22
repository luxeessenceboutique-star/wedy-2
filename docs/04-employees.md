# Gestion des employés

## Vue d'ensemble

La page Employés est le cœur de Wedy RH. Elle centralise tous les dossiers du personnel actif, avec accès rapide aux informations personnelles, contractuelles et documentaires de chaque collaborateur.

**URL :** `/app/employees`  
**Accès :** Admin, RH Manager

---

## Structure du dossier employé

Chaque dossier contient les onglets suivants :

### Informations personnelles
- Nom, prénom, date de naissance, CIN, nationalité
- Adresse complète, téléphone, email professionnel
- Photo de profil

### Informations contractuelles
- Type de contrat (CDI, CDD, stage)
- Date d'embauche, date de fin (si applicable)
- Poste, département, manager direct
- Salaire brut mensuel, avantages

### Documents
- Liste de tous les documents générés pour cet employé
- Possibilité de générer un nouveau document directement depuis le dossier
- Téléchargement des documents archivés

### Historique
- Journal des modifications apportées au dossier
- Horodatage et auteur de chaque modification

---

## Actions disponibles

| Action | Description |
|---|---|
| **Nouveau employé** | Créer un dossier manuellement |
| **Importer CSV** | Charger plusieurs employés depuis un fichier |
| **Exporter CSV** | Télécharger la liste complète en CSV |
| **Générer document** | Créer un document RH depuis le dossier |
| **Archiver** | Désactiver un employé sans supprimer ses données |

---

## Recherche et filtres

La barre de recherche supporte :
- Recherche par **nom, prénom** ou **email**
- Filtre par **département**
- Filtre par **type de contrat** (CDI / CDD / Stage)
- Filtre par **statut** (Actif / Archivé)

---

## Importation CSV

Format attendu du fichier CSV :

```csv
prenom,nom,email,poste,departement,date_embauche,salaire,type_contrat
Yasmine,Benali,y.benali@entreprise.ma,Responsable Marketing,Marketing,2022-03-15,12000,CDI
Mohamed,Alami,m.alami@entreprise.ma,Développeur Backend,IT,2023-01-10,15000,CDI
```

**Encodage requis :** UTF-8  
**Séparateur :** virgule (`,`)

---

## Astuces

1. Cliquez sur le nom d'un employé pour ouvrir son dossier complet en mode plein écran.
2. Le champ de recherche accepte les caractères arabes et les noms avec accents.
3. L'archivage préserve tout l'historique — les données restent accessibles dans les rapports.
4. Les documents générés pour un employé archivé restent téléchargeables depuis l'historique.
