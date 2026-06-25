# Démarrage rapide — Wedy RH

## Qu'est-ce que Wedy RH ?

Wedy RH est une plateforme de gestion des ressources humaines conçue pour les entreprises marocaines. Elle centralise la gestion des employés, la génération de documents, le recrutement, la paie et bien plus, le tout assisté par l'IA Claude (Anthropic).

---

## Étapes de démarrage

### 1. Configurer votre entreprise
Rendez-vous dans **Paramètres → Entreprise** pour renseigner :
- Nom de l'entreprise et logo (apparaît sur tous les documents générés)
- Adresse, téléphone, ICE, CNSS
- Fuseau horaire et langue par défaut
- Politique de congés (types, soldes initiaux, règles d'accumulation)

### 2. Créer les utilisateurs
Dans **Utilisateurs & Rôles**, invitez les membres de votre équipe RH :
- **Admin** : accès total, gestion des utilisateurs et paramètres
- **RH Manager** : gestion des employés, documents, recrutement
- **Employé** : accès au portail self-service uniquement

### 3. Importer vos employés
Dans la page **Employés**, cliquez sur **Importer** pour charger un fichier CSV avec la liste de votre personnel. Colonnes requises : `nom`, `prénom`, `poste`, `département`, `date_embauche`, `email`.

### 4. Configurer les templates de documents
Allez dans **Documents → Modèles** pour personnaliser les templates fournis (attestation de travail, contrat CDI, attestation de stage) avec les informations de votre entreprise.

### 5. Générer votre premier document
Dans **Documents → Générer**, sélectionnez un template, choisissez un employé et cliquez sur **Générer**. Le document est disponible en PDF ou DOCX en quelques secondes.

---

## Rôles et permissions

| Fonctionnalité | Admin | RH Manager | Employé |
|---|---|---|---|
| Gestion des employés | ✅ | ✅ | ❌ |
| Génération de documents | ✅ | ✅ | ❌ |
| Portail self-service | ✅ | ✅ | ✅ |
| Paramètres entreprise | ✅ | ❌ | ❌ |
| Utilisateurs & Rôles | ✅ | ❌ | ❌ |
| Journal d'audit | ✅ | ✅ | ❌ |

---

## FAQ démarrage

**Q : Puis-je importer des employés depuis Excel ?**  
R : Oui, exportez votre fichier Excel en CSV (UTF-8) puis importez-le dans la page Employés.

**Q : Comment changer la langue de l'interface ?**  
R : Cliquez sur le sélecteur de langue dans la barre latérale (FR / EN / AR).

**Q : Les données sont-elles sécurisées ?**  
R : Oui, toutes les données sont chiffrées en transit (TLS) et au repos (AES-256) via Supabase.
