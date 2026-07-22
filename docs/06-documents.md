# Documents RH

## Vue d'ensemble

Le module Documents permet de générer, gérer et archiver tous les documents RH de votre entreprise depuis des templates personnalisables. Les documents sont générés automatiquement à partir des données employés stockées en base.

---

## Pages du module

### Générer un document (`/app/generate`)

1. Sélectionnez un **template** dans la liste déroulante
2. Choisissez l'**employé** concerné
3. Vérifiez les données pré-remplies (modifiables à la volée)
4. Cliquez sur **Prévisualiser** pour voir le rendu final
5. Exportez en **PDF** ou **DOCX**

**Option IA :** Le bouton ✨ **Améliorer avec l'IA** enrichit automatiquement le contenu du document (reformulation professionnelle, corrections grammaticales, ajout de formules de politesse adaptées).

---

### Modèles (`/app/templates`)

Bibliothèque de templates disponibles :

| Template | Description |
|---|---|
| Attestation de travail | Certifie qu'un employé est en poste |
| Attestation de stage | Certifie la réalisation d'un stage |
| Contrat CDI | Contrat à durée indéterminée standard |
| Contrat CDD | Contrat à durée déterminée avec date de fin |
| Lettre de mission | Détail d'une mission spécifique |
| Charte de confidentialité | Accord de non-divulgation interne |
| Bulletin de paie | Fiche de paie mensuelle |

#### Variables dynamiques

Les templates utilisent des variables entre doubles accolades `{{}}` :

| Variable | Valeur injectée |
|---|---|
| `{{nom_complet}}` | Nom et prénom de l'employé |
| `{{poste}}` | Intitulé du poste |
| `{{departement}}` | Département |
| `{{date_embauche}}` | Date d'embauche formatée |
| `{{salaire_brut}}` | Salaire brut mensuel |
| `{{entreprise}}` | Nom de l'entreprise |
| `{{ville}}` | Ville du siège |
| `{{date_aujourd_hui}}` | Date de génération du document |
| `{{directeur}}` | Nom du directeur signataire |

#### Créer un nouveau template

1. Cliquez sur **Nouveau template**
2. Saisissez un nom et une description
3. Rédigez le contenu HTML avec les variables `{{}}` souhaités
4. Prévisualisez le rendu en temps réel
5. Sauvegardez — le template est immédiatement disponible

---

### Historique (`/app/history`)

Archive immuable de tous les documents générés :
- Date et heure de génération
- Auteur (utilisateur RH qui a généré)
- Employé concerné
- Type de template utilisé
- Lien de téléchargement permanent

**Filtres disponibles :** par période, par employé, par type de document, par auteur.

---

## Formats d'export

| Format | Usage recommandé |
|---|---|
| **PDF** | Documents officiels, envoi par email, impression |
| **DOCX** | Documents à modifier manuellement avant signature |

---

## Astuces

1. Dupliquez un template existant pour créer une variante rapidement sans repartir de zéro.
2. L'historique est permanent — même si un employé est archivé, ses documents restent téléchargeables.
3. Pour les documents confidentiels (bulletins de paie), utilisez le portail employé pour un accès sécurisé.
4. Le logo de votre entreprise configuré dans Paramètres apparaît automatiquement sur tous les documents générés.
