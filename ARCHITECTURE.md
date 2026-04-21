# Architecture du Projet — YODABOT RH

Application interne de génération automatique de documents RH pour **TYTHON**.
Powered by **Claude AI (Anthropic)**.

---

## Vue d'ensemble

```
client-brand-design/
├── frontend/       ← Interface utilisateur (React + TanStack)
├── backend/        ← API REST (Python + FastAPI)
└── ARCHITECTURE.md
```

L'application suit une architecture **client-serveur découplée** :

- Le **frontend** communique avec Supabase directement (auth, données temps réel)
- Le **backend Python** expose une API REST qui ajoute la couche IA (Claude) et la génération de fichiers PDF/DOCX
- **Supabase** est la base de données centrale (PostgreSQL) avec authentification intégrée

---

## Schéma d'architecture global

```
┌─────────────────────────────────────────────────────────┐
│                     NAVIGATEUR                          │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │            FRONTEND  (port 8080)                │   │
│   │         React 19 + TanStack Start               │   │
│   │                                                 │   │
│   │  Landing  Login  Dashboard  Employés            │   │
│   │  Templates  Génération  Historique              │   │
│   └────────────┬──────────────────┬─────────────────┘   │
└────────────────│──────────────────│─────────────────────┘
                 │                  │
        Auth +   │                  │  Génération IA
        CRUD     │                  │  PDF / DOCX
                 ▼                  ▼
┌────────────────────┐   ┌──────────────────────────────┐
│   SUPABASE CLOUD   │   │   BACKEND Python (port 8000)  │
│                    │   │         FastAPI               │
│  PostgreSQL DB     │◄──┤                              │
│  Auth (JWT)        │   │  /api/auth                   │
│  Row Level Sec.    │   │  /api/employees              │
│  Realtime          │   │  /api/templates              │
└────────────────────┘   │  /api/documents              │
                         │  /api/documents/ai/*         │
                         └──────────────_───────────────┘


```

---

## Frontend

### Stack technique

| Technologie | Version | Rôle |
|---|---|---|
| React | 19.2 | Framework UI |
| TanStack Start | 1.167 | Framework fullstack |
| TanStack Router | 1.168 | Routing type-safe |
| TanStack Query | 5.99 | Cache & état serveur |
| Tailwind CSS | 4.2 | Styles utilitaires |
| Shadcn/ui | — | Composants UI (50+) |
| Supabase JS | 2.10 | Client base de données |
| i18next | 26 | Internationalisation FR/EN/AR |
| jsPDF + html2canvas | — | Export PDF côté client |
| Framer Motion | 12 | Animations |
| Vite | 7.3 | Bundler |

### Structure des fichiers

```
frontend/
└── src/
    ├── assets/
    │   └── yodabot-logo.png
    ├── components/
    │   ├── auth-provider.tsx      ← Contexte d'authentification Supabase
    │   ├── brand-logo.tsx         ← Logo YODABOT
    │   ├── i18n-provider.tsx      ← Initialisation i18next
    │   ├── lang-switcher.tsx      ← Sélecteur FR / EN / AR
    │   └── ui/                    ← 50+ composants Shadcn (button, card, table…)
    ├── hooks/
    │   └── use-mobile.tsx         ← Détection mobile
    ├── integrations/
    │   └── supabase/
    │       ├── client.ts          ← Client Supabase (navigateur)
    │       ├── client.server.ts   ← Client Supabase (serveur)
    │       ├── auth-middleware.ts ← Protection des routes
    │       └── types.ts           ← Types TypeScript générés depuis DB
    ├── lib/
    │   ├── document-generator.ts  ← Remplissage templates + export PDF
    │   ├── i18n.ts                ← Config i18next
    │   ├── utils.ts               ← Utilitaires (cn, dates…)
    │   └── locales/
    │       ├── fr.ts              ← 470+ clés en français
    │       ├── en.ts              ← Anglais
    │       └── ar.ts              ← Arabe (RTL)
    ├── routes/
    │   ├── index.tsx              ← Landing page (/)
    │   ├── login.tsx              ← Authentification (/login)
    │   ├── __root.tsx             ← Layout racine
    │   ├── _app.tsx               ← Layout app (sidebar + header)
    │   ├── _app.app.index.tsx     ← Dashboard (/app)
    │   ├── _app.app.employees.tsx ← Gestion employés (/app/employees)
    │   ├── _app.app.templates.tsx ← Modèles documents (/app/templates)
    │   ├── _app.app.generate.tsx  ← Générer un document (/app/generate)
    │   └── _app.app.history.tsx   ← Historique (/app/history)
    ├── router.tsx                 ← Configuration TanStack Router
    └── styles.css                 ← Design tokens (OKLCH, gradients, animations)
```

### Pages et navigation

```
/                    → Landing page (publique)
/login               → Connexion / Inscription
/app                 → Dashboard (protégée)
/app/employees       → Liste + CRUD des employés
/app/templates       → Catalogue des modèles de documents
/app/generate        → Générer un document RH
/app/history         → Historique des documents générés
```

### Système de design

- **Couleurs** : OKLCH — Cyan `#22D3EE` (primaire) + Violet (accent)
- **Polices** : Space Grotesk (titres) + Inter (corps) + Noto Kufi Arabic (AR)
- **Mode** : Clair (app) + Sombre cinématique (landing)
- **RTL** : Support complet arabe via attribut `dir`
- **Animations** : Float, pulse-glow, fade-in-up (Framer Motion)

---

## Backend

### Stack technique

| Technologie | Version | Rôle |
|---|---|---|
| Python | 3.11+ | Langage |
| FastAPI | 0.115 | Framework API REST |
| Uvicorn | 0.32 | Serveur ASGI |
| Supabase Python | 2.10 | Client base de données |
| Anthropic SDK | 0.40 | Claude AI |
| WeasyPrint | 62 | Génération PDF (HTML → PDF) |
| python-docx | 1.1 | Génération fichiers Word |
| Pydantic | 2.10 | Validation des données |
| Jinja2 | 3.1 | Moteur de templates |
| python-jose | 3.3 | Vérification JWT |

### Structure des fichiers

```
backend/
├── .env                        ← Variables d'environnement (secrets)
├── .env.example                ← Template de configuration
├── requirements.txt            ← Dépendances Python
└── app/
    ├── main.py                 ← Point d'entrée FastAPI + CORS
    ├── config.py               ← Paramètres depuis .env (Pydantic Settings)
    ├── dependencies.py         ← Middleware auth JWT + vérification rôles
    ├── models/
    │   ├── employee.py         ← Schémas Pydantic (employé)
    │   └── document.py         ← Schémas Pydantic (template, document, IA)
    ├── routers/
    │   ├── auth.py             ← Login, signup, logout, /me
    │   ├── employees.py        ← CRUD employés + recherche
    │   ├── templates.py        ← CRUD modèles (admin uniquement)
    │   └── documents.py        ← Génération + téléchargement + IA
    └── services/
        ├── supabase.py         ← Clients Supabase (anon + service role)
        ├── document_generator.py ← fill_template(), generate_pdf_bytes(), generate_docx_bytes()
        └── ai_service.py       ← enhance_document(), suggest_document_content(), translate_document()
```

### Endpoints API

#### Auth — `/api/auth`
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion (retourne JWT) |
| POST | `/api/auth/signup` | Création de compte |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Profil + rôles de l'utilisateur connecté |

#### Employés — `/api/employees`
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/employees` | Liste (filtre : nom, CIN, département, statut) |
| GET | `/api/employees/{id}` | Détail d'un employé |
| POST | `/api/employees` | Créer un employé |
| PATCH | `/api/employees/{id}` | Modifier un employé |
| DELETE | `/api/employees/{id}` | Supprimer (admin) |

#### Modèles — `/api/templates`
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/templates` | Liste des modèles actifs |
| GET | `/api/templates/{id}` | Détail d'un modèle |
| POST | `/api/templates` | Créer (admin) |
| PATCH | `/api/templates/{id}` | Modifier (admin) |
| DELETE | `/api/templates/{id}` | Supprimer (admin) |

#### Documents — `/api/documents`
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/documents/generate` | Générer un document depuis un template |
| GET | `/api/documents/generate/{id}/pdf` | Télécharger en PDF |
| GET | `/api/documents/generate/{id}/docx` | Télécharger en Word |
| GET | `/api/documents` | Historique des documents |
| DELETE | `/api/documents/{id}` | Supprimer (admin) |
| POST | `/api/documents/ai/enhance` | Améliorer un document avec Claude |
| POST | `/api/documents/ai/suggest` | Générer un document from scratch avec Claude |
| POST | `/api/documents/ai/translate` | Traduire un document (FR/EN/AR) |

### Flux de génération d'un document

```
Frontend
  │
  ├─ 1. Sélectionne employé + modèle
  │
  └─ 2. POST /api/documents/generate
              │
              ├─ Récupère employé depuis Supabase
              ├─ Récupère template depuis Supabase
              ├─ fill_template() → remplace {{variables}}
              ├─ [optionnel] Claude AI → enhance_document()
              └─ Sauvegarde dans generated_documents
                          │
                          ▼
              GET /api/documents/generate/{id}/pdf
                          │
                          └─ WeasyPrint → PDF bytes → Response
```

---

## Base de données (Supabase / PostgreSQL)

### Tables

```
profiles              → Profil utilisateur (nom, email, avatar)
user_roles            → Rôles : admin | rh
employees             → Données RH des employés/stagiaires
document_templates    → Modèles de documents avec placeholders {{var}}
generated_documents   → Historique des documents générés
```

### Schéma simplifié

```
employees
  id, full_name, cin, matricule, email, phone
  position, department, salary
  hire_date, contract_type (CDI|CDD|Stage|Freelance)
  contract_start, contract_end
  internship_start, internship_end
  manager, status (active|inactive|terminated|intern)
  address, birth_date, nationality, notes

document_templates
  id, code, name_fr, name_en, name_ar
  category (attestation|contrat|avenant|certificat|lettre|autre)
  body_template  ← texte avec {{full_name}}, {{cin}}, {{today}}…
  variables[]    ← liste des variables requises
  is_active

generated_documents
  id, employee_id → employees
  template_id → document_templates
  document_type, content, variables_used (JSONB)
  language (fr|en|ar), file_url
  generated_by → auth.users
```

### Sécurité (Row Level Security)

- Toutes les tables ont **RLS activé**
- Les utilisateurs authentifiés peuvent lire/écrire
- Seuls les **admins** peuvent supprimer ou gérer les modèles
- Les profils ne sont visibles/modifiables que par leur propriétaire

---

## Intelligence Artificielle — Claude (Anthropic)

Le backend intègre `claude-sonnet-4-6` pour 3 fonctionnalités :

| Fonction | Description |
|---|---|
| `enhance_document()` | Améliore la clarté, la formalité et la précision légale d'un document généré |
| `suggest_document_content()` | Rédige un document from scratch à partir des données de l'employé |
| `translate_document()` | Traduit un document en FR, EN ou AR en préservant la mise en forme |

Le prompt système impose :
- Conformité au **Code du Travail marocain**
- Ton **formel et professionnel**
- Préservation des **placeholders** `{{variable}}`

---

## Documents RH supportés (11 modèles)

| Code | Document | Catégorie |
|---|---|---|
| `attestation_travail` | Attestation de travail | attestation |
| `attestation_stage` | Attestation de stage | attestation |
| `attestation_poursuite_stage` | Attestation de poursuite de stage | attestation |
| `contrat_stage` | Contrat de stage | contrat |
| `contrat_cdi` | Contrat CDI | contrat |
| `contrat_cdd` | Contrat CDD | contrat |
| `avenant_contrat` | Avenant au contrat | avenant |
| `demande_mise_disposition` | Demande de mise à disposition | lettre |
| `solde_tout_compte` | Solde de tout compte | attestation |
| `certificat_travail` | Certificat de travail | certificat |
| `lettre_avertissement` | Lettre d'avertissement | lettre |

---

## Rôles utilisateurs

| Rôle | Permissions |
|---|---|
| **admin** | Tout — gestion modèles, suppression, gestion des accès |
| **rh** | Générer documents, consulter historique, gérer employés |

---

## Démarrage rapide

### Frontend
```bash
cd frontend
npm install
node node_modules/vite/bin/vite.js
# → http://localhost:8080
```

### Backend
```bash
cd backend
pip install -r requirements.txt
# Remplir .env avec SUPABASE_SERVICE_ROLE_KEY et ANTHROPIC_API_KEY
uvicorn app.main:app --reload
# → http://localhost:8000
# → Docs Swagger : http://localhost:8000/docs
```

---

## Variables d'environnement

### Frontend (`frontend/.env`)
```
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

### Backend (`backend/.env`)
```
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← clé secrète (ne jamais exposer)
ANTHROPIC_API_KEY=sk-ant-...       ← clé Claude AI
ALLOWED_ORIGINS=http://localhost:8080
```

---

## Internationalisation

L'application est **trilingue** avec support RTL complet :

| Langue | Code | Direction |
|---|---|---|
| Français | `fr` | LTR (défaut) |
| Anglais | `en` | LTR |
| Arabe | `ar` | RTL (auto) |

Les documents générés sont également disponibles dans les 3 langues via l'API IA.
