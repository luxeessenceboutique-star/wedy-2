# Architecture du Projet — YODABOT RH Platform v2.0

Application RH interne full-stack pour **TYTHON** — Powered by **Claude AI / OpenAI**.

---

## Vue d'ensemble

```
platform-RH/
├── backend/          ← API REST (FastAPI + SQLAlchemy + Supabase)
├── frontend/         ← Interface (React + TanStack)
├── docker-compose.yml
└── ARCHITECTURE.md
```

**Architecture client-serveur découplée :**
- Le **frontend** gère l'UI et communique avec le backend via REST
- Le **backend** expose l'API complète avec AI, OCR, génération de documents
- **Supabase** est la base de données PostgreSQL (tables déjà créées)
- **MinIO** stocke les fichiers (CVs, photos, documents générés)
- **Redis + Celery** gèrent les tâches async (parsing CV, emails)

---

## Schéma d'architecture global

```
┌─────────────────────────────────────────────────────────────┐
│                       NAVIGATEUR                            │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │          FRONTEND  (port 3000/8080)                 │   │
│   │         React 19 + TanStack Start                   │   │
│   │                                                     │   │
│   │  Dashboard  Employees  Interns  Templates           │   │
│   │  CV Upload  HR Requests  Notifications              │   │
│   └───────────────────────┬─────────────────────────────┘   │
└───────────────────────────│─────────────────────────────────┘
                            │  REST API (JWT Bearer)
                            ▼
┌───────────────────────────────────────────────────────────────┐
│              BACKEND  FastAPI  (port 8000)                    │
│                                                               │
│  /api/auth        /api/profiles     /api/employees            │
│  /api/interns     /api/documents    /api/templates            │
│  /api/cv          /api/requests     /api/departments          │
│  /api/notifications  /api/dashboard /api/audit                │
│                                                               │
│  ┌──────────┐  ┌─────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Auth JWT │  │ SQLAlch │  │ CV Parser  │  │ Doc Gen    │  │
│  │ RBAC     │  │  ORM    │  │ OCR + AI   │  │ PDF/DOCX   │  │
│  └──────────┘  └────┬────┘  └────────────┘  └────────────┘  │
└───────────────────────────────────────────────────────────────┘
         │                    │              │
         ▼                    ▼              ▼
┌────────────────┐  ┌──────────────┐  ┌───────────────┐
│ SUPABASE CLOUD │  │    REDIS     │  │    MinIO      │
│  PostgreSQL    │  │  + Celery    │  │  S3 Storage   │
│  Auth (JWT)    │  │  Async tasks │  │  CVs / Docs   │
│  RLS Tables    │  └──────────────┘  └───────────────┘
└────────────────┘
```

---

## Backend — Stack Technique

| Technologie       | Version | Rôle                                  |
|-------------------|---------|---------------------------------------|
| Python            | 3.11+   | Langage                               |
| FastAPI           | 0.115   | Framework API REST                    |
| SQLAlchemy        | 2.0     | ORM (reflect Supabase tables)         |
| Supabase PostgreSQL | —     | Base de données                       |
| Pydantic v2       | 2.10    | Validation des données                |
| python-jose       | 3.3     | JWT Auth                              |
| passlib[bcrypt]   | 1.7     | Hash des mots de passe                |
| WeasyPrint        | 62      | Génération PDF                        |
| python-docx       | 1.1     | Génération Word                       |
| Jinja2            | 3.1     | Moteur de templates HTML              |
| OpenAI SDK        | 1.58    | Extraction CV par IA                  |
| Anthropic SDK     | 0.40    | Fallback IA (Claude)                  |
| pytesseract       | 0.3     | OCR (CVs scannés/images)              |
| pdf2image         | 1.17    | Conversion PDF → images pour OCR      |
| PyMuPDF (fitz)    | 1.25    | Extraction texte PDF robuste          |
| pdfminer.six      | 2023    | Extraction texte PDF                  |
| MinIO SDK         | 7.2     | Stockage objets S3                    |
| Redis + Celery    | 7 / 5.4 | File de tâches async                  |
| loguru            | 0.7     | Logging structuré                     |

---

## Structure des fichiers

```
backend/
├── Dockerfile
├── requirements.txt
├── .env                          ← Variables d'environnement
└── app/
    ├── __init__.py
    ├── main.py                   ← Point d'entrée FastAPI
    ├── config.py                 ← Settings (Pydantic)
    ├── database.py               ← Engine SQLAlchemy → Supabase
    ├── dependencies.py           ← JWT + RBAC dependencies
    ├── models/
    │   ├── __init__.py
    │   └── models.py             ← 14 modèles SQLAlchemy
    ├── schemas/
    │   ├── __init__.py
    │   ├── auth.py               ← Login/Register/Token
    │   ├── profile.py            ← Profile/Employee/Intern
    │   ├── document.py           ← Document/Template/Generate
    │   ├── hr_request.py         ← HR Request workflow
    │   ├── cv.py                 ← CV Upload/Extraction
    │   └── misc.py               ← Department/Position/Notification
    ├── routers/
    │   ├── __init__.py
    │   ├── auth.py               ← POST /api/auth/login,register,me
    │   ├── profiles.py           ← CRUD /api/profiles
    │   ├── employees.py          ← CRUD /api/employees
    │   ├── interns.py            ← CRUD /api/interns
    │   ├── documents.py          ← /api/documents + /api/templates
    │   ├── cv.py                 ← POST /api/cv/upload
    │   ├── requests.py           ← /api/requests + approve
    │   ├── departments.py        ← /api/departments + /api/positions
    │   ├── notifications.py      ← /api/notifications + /api/audit
    │   └── dashboard.py          ← GET /api/dashboard/metrics
    ├── services/
    │   ├── auth_service.py       ← JWT + bcrypt
    │   ├── document_generator.py ← Template fill + PDF/DOCX export
    │   ├── cv_parser.py          ← OCR + AI extraction pipeline
    │   ├── storage.py            ← MinIO + local fallback
    │   └── audit.py              ← Audit logs + notifications
    └── templates/                ← HTML document templates
        ├── attestation_travail.html
        └── attestation_stage.html
```

---

## Endpoints API — Référence complète

### Auth — `/api/auth`
| Méthode | Route               | Rôle requis | Description              |
|---------|---------------------|-------------|--------------------------|
| POST    | `/api/auth/login`   | Public      | Connexion → JWT token    |
| POST    | `/api/auth/register`| Public      | Création de compte       |
| GET     | `/api/auth/me`      | Tout        | Profil utilisateur       |

### Profiles — `/api/profiles`
| Méthode | Route                        | Rôle requis | Description           |
|---------|------------------------------|-------------|-----------------------|
| GET     | `/api/profiles`              | Tout        | Liste (filtre + search)|
| GET     | `/api/profiles/{id}`         | Tout        | Détail profil         |
| POST    | `/api/profiles`              | Admin/HR    | Créer profil          |
| PATCH   | `/api/profiles/{id}`         | Tout        | Modifier profil       |
| DELETE  | `/api/profiles/{id}`         | Admin       | Supprimer profil      |
| POST    | `/api/profiles/{id}/photo`   | Tout        | Upload photo          |

### Employees — `/api/employees`
| Méthode | Route                    | Rôle requis | Description         |
|---------|--------------------------|-------------|---------------------|
| GET     | `/api/employees`         | Tout        | Liste employés      |
| GET     | `/api/employees/{id}`    | Tout        | Détail employé      |
| POST    | `/api/employees`         | Admin/HR    | Créer employé       |
| PATCH   | `/api/employees/{id}`    | Admin/HR    | Modifier employé    |
| DELETE  | `/api/employees/{id}`    | Admin       | Supprimer employé   |

### Interns — `/api/interns`
| Méthode | Route                | Rôle requis | Description       |
|---------|----------------------|-------------|-------------------|
| GET     | `/api/interns`       | Tout        | Liste stagiaires  |
| POST    | `/api/interns`       | Admin/HR    | Créer stagiaire   |
| PATCH   | `/api/interns/{id}`  | Admin/HR    | Modifier stagiaire|
| DELETE  | `/api/interns/{id}`  | Admin       | Supprimer         |

### CV — `/api/cv`
| Méthode | Route                      | Rôle requis | Description            |
|---------|----------------------------|-------------|------------------------|
| POST    | `/api/cv/upload`           | Tout        | Upload + parse CV (AI) |
| GET     | `/api/cv/uploads`          | Tout        | Liste des CVs uploadés |
| GET     | `/api/cv/{id}/extraction`  | Tout        | Données extraites      |

### Documents — `/api/documents`
| Méthode | Route                              | Rôle requis | Description          |
|---------|------------------------------------|-------------|----------------------|
| GET     | `/api/documents`                   | Tout        | Liste documents      |
| POST    | `/api/documents`                   | Admin/HR    | Upload document      |
| GET     | `/api/documents/{id}/download`     | Tout        | Télécharger          |
| DELETE  | `/api/documents/{id}`              | Admin/HR    | Supprimer            |
| POST    | `/api/documents/generate`          | Admin/HR    | Générer PDF/DOCX     |
| GET     | `/api/documents/generated`         | Tout        | Historique générés   |
| GET     | `/api/documents/generated/{id}/download` | Tout | Télécharger généré  |

### Templates — `/api/templates`
| Méthode | Route                    | Rôle requis | Description    |
|---------|--------------------------|-------------|----------------|
| GET     | `/api/templates`         | Tout        | Liste templates|
| POST    | `/api/templates`         | Admin/HR    | Créer template |
| PATCH   | `/api/templates/{id}`    | Admin/HR    | Modifier       |
| DELETE  | `/api/templates/{id}`    | Admin       | Supprimer      |

### HR Requests — `/api/requests`
| Méthode | Route                             | Rôle requis        | Description    |
|---------|-----------------------------------|--------------------|----------------|
| GET     | `/api/requests`                   | Tout               | Liste demandes |
| POST    | `/api/requests`                   | Tout               | Créer demande  |
| PATCH   | `/api/requests/{id}/approve`      | Admin/HR/Manager   | Approuver/Rejeter|
| DELETE  | `/api/requests/{id}`              | Admin              | Supprimer      |

### Dashboard & Misc
| Méthode | Route                       | Rôle requis | Description             |
|---------|-----------------------------|-------------|-------------------------|
| GET     | `/api/dashboard/metrics`   | Admin/HR    | KPIs employés/demandes  |
| GET     | `/api/notifications`        | Tout        | Mes notifications       |
| PATCH   | `/api/notifications/{id}/read` | Tout     | Marquer comme lu        |
| GET     | `/api/audit`                | Admin       | Journal d'audit         |
| GET     | `/api/departments`          | Tout        | Liste départements      |
| POST    | `/api/departments`          | Admin       | Créer département       |
| GET     | `/api/positions`            | Tout        | Liste postes            |
| POST    | `/api/positions`            | Admin       | Créer poste             |

---

## Rôles & Permissions

| Rôle         | Permissions                                               |
|--------------|-----------------------------------------------------------|
| **admin**    | Tout — CRUD complet, audit, gestion des rôles             |
| **hr**       | Profiles, Employees, Interns, Documents, Requests, CVs    |
| **manager**  | Lire + Approuver/Rejeter les demandes                     |
| **employee** | Lire son profil, soumettre des demandes, voir ses docs    |
| **intern**   | Lire son profil, soumettre des demandes                   |

---

## Pipeline CV (OCR + AI)

```
Fichier uploadé
     │
     ▼
Détection type
  ├── PDF → pdfminer.six → (si <50 chars) → pdf2image + Tesseract OCR
  ├── DOCX → python-docx
  └── Image (PNG/JPG) → Tesseract OCR (fra+eng+ara)
     │
     ▼
Texte brut extrait
     │
     ▼
OpenAI GPT-4o-mini (JSON strucruré)
  └── Si échec → Anthropic Claude (fallback)
     │
     ▼
cv_extractions {
  full_name, email, phone, skills[],
  education, experience, languages[],
  raw_json (JSONB complet)
}
     │
     ▼
profile_suggestion → Auto-create profile
```

---

## Démarrage

### Avec Docker (recommandé)
```bash
docker-compose up -d
# API disponible : http://localhost:8000/docs
```

### Sans Docker (local)

**1. Configurer `.env` :**
```env
DATABASE_URL=postgresql+psycopg2://postgres.[project-ref]:[password]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
SECRET_KEY=votre_cle_secrete_32_chars_minimum
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

**2. Lancer le backend :**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs
```

**3. Lancer le frontend :**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Variables d'environnement requises

| Variable                  | Description                              |
|---------------------------|------------------------------------------|
| `DATABASE_URL`            | URL PostgreSQL Supabase (psycopg2)       |
| `SECRET_KEY`              | Clé JWT (min 32 caractères)              |
| `SUPABASE_URL`            | URL projet Supabase                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service Supabase                  |
| `OPENAI_API_KEY`          | Clé OpenAI (CV parsing AI)              |
| `ANTHROPIC_API_KEY`       | Clé Anthropic (fallback AI)             |
| `MINIO_ENDPOINT`          | Endpoint MinIO (ou S3)                  |

---

## n8n Integration

Tous les endpoints sont REST standards avec JSON.

**Exemple workflow n8n — CV auto-processing:**
```
[HTTP Trigger] → POST /api/cv/upload (multipart) → [extraction JSON]
→ [IF full_name] → POST /api/profiles (créer profil)
→ POST /api/notifications (alerter RH)
```
