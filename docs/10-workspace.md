# Espace de travail

## Vue d'ensemble

L'espace de travail regroupe la configuration technique et administrative de la plateforme : intégrations tierces, gestion des accès et paramètres généraux.

---

## Intégrations (`/app/integrations`)

### Intégrations disponibles

#### Calendriers
| Service | Fonctionnalité |
|---|---|
| Google Calendar | Synchronisation bidirectionnelle du Planning RH |
| Microsoft Outlook | Synchronisation des événements et réunions |
| Apple Calendar | Abonnement iCal en lecture seule |

#### Communication
| Service | Fonctionnalité |
|---|---|
| Slack | Notifications RH dans vos channels (congés, recrutement) |
| Microsoft Teams | Alertes et notifications configurables |
| Email SMTP | Configuration d'un serveur email personnalisé |

#### Logiciels RH & Paie
| Service | Fonctionnalité |
|---|---|
| Sage Paie | Export des données de paie au format Sage |
| Cegid | Synchronisation des données employés |
| API REST | Intégrations personnalisées avec vos systèmes internes |

### Configuration d'une intégration

1. Accédez à **Intégrations** → cliquez sur le service souhaité
2. Suivez les instructions d'authentification (OAuth ou clé API)
3. Configurez les événements déclencheurs (quand notifier / synchroniser)
4. Testez la connexion avec le bouton **Tester**
5. Activez l'intégration

### Webhooks

Configurez des webhooks pour déclencher des actions externes sur événements Wedy RH :
- `employee.created` — nouvelle recrue ajoutée
- `leave.approved` — congé validé
- `document.generated` — document généré
- `candidate.hired` — candidat recruté

---

## Utilisateurs & Rôles (`/app/users`)

### Rôles disponibles

| Rôle | Description | Accès |
|---|---|---|
| **Admin** | Accès total à toutes les fonctionnalités | Tout |
| **RH Manager** | Gestion RH complète, sans gestion des utilisateurs | Tout sauf Utilisateurs & Paramètres avancés |
| **Employé** | Portail self-service uniquement | Tableau de bord employé, Mes documents, Mes congés |

### Gestion des utilisateurs

#### Inviter un utilisateur
1. Cliquez sur **Inviter un utilisateur**
2. Saisissez l'adresse email
3. Sélectionnez le rôle
4. L'invitation est envoyée par email avec un lien de création de mot de passe

#### Modifier un rôle
- Cliquez sur les 3 points (⋯) à côté d'un utilisateur → **Modifier le rôle**
- Le changement est effectif immédiatement

#### Désactiver un compte
- Préférez la **désactivation** à la suppression — l'historique des actions est conservé
- Un compte désactivé ne peut plus se connecter mais ses données restent intactes

---

## Paramètres (`/app/settings`)

### Informations de l'entreprise
- Nom légal, forme juridique (SA, SARL, SAS...)
- Adresse du siège social
- ICE (Identifiant Commun de l'Entreprise)
- Numéro CNSS
- Logo (apparaît sur tous les documents générés)

### Politique de congés
- Types de congés et durées légales
- Solde initial par type de congé et par catégorie de personnel
- Règle d'accumulation (par mois, par trimestre)
- Jours fériés (liste personnalisable, pré-remplie avec les fériés marocains)

### Notifications
- Configurer les alertes email automatiques (demandes de congé, contrats expirant, fins de stage)
- Fréquence des rappels (immédiat, quotidien, hebdomadaire)
- Destinataires par type d'alerte

### Sécurité
- Politique de mots de passe (longueur minimale, complexité)
- Durée de session (déconnexion automatique après X minutes d'inactivité)
- Authentification à deux facteurs (2FA) — optionnel ou obligatoire
- Liste blanche des adresses IP autorisées

---

## Astuces

1. **Intégrations** : Testez toujours une intégration avec un événement réel avant de la déployer en production.
2. **Utilisateurs** : Créez des comptes employés en masse depuis **Employés → Exporter CSV** puis **Utilisateurs → Import**.
3. **Paramètres** : Configurez le logo et les informations d'entreprise avant de générer votre premier document.
4. **Sécurité** : Activez la 2FA pour les comptes Admin — exigence de sécurité recommandée.
