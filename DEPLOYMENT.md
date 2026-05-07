# WEDY RH Platform — DevOps Deployment Guide

**Application:** WEDY RH Platform  
**Version:** 2.0  
**Last Updated:** 2026-05-07

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Docker Deployment (Recommended)](#5-docker-deployment-recommended)
6. [Database Setup & Migrations](#6-database-setup--migrations)
7. [Frontend Build & Deployment](#7-frontend-build--deployment)
8. [Service Ports Reference](#8-service-ports-reference)
9. [Production Checklist](#9-production-checklist)
10. [Monitoring & Logs](#10-monitoring--logs)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     WEDY RH Platform                    │
├─────────────┬───────────────────────────────────────────┤
│  Frontend   │  React 19 + TypeScript + Vite             │
│  (real-app) │  → Communicates with Backend via REST API │
├─────────────┼───────────────────────────────────────────┤
│  Backend    │  FastAPI (Python 3.11) on port 8000       │
│  (backend/) │  → Auth via Supabase JWT                  │
│             │  → File storage via MinIO                 │
│             │  → Async tasks via Celery + Redis         │
│             │  → AI via Anthropic & OpenAI APIs         │
├─────────────┼───────────────────────────────────────────┤
│  Infra      │  PostgreSQL 16  (via Supabase managed)    │
│  Services   │  Redis 7        (task queue & cache)      │
│             │  MinIO          (S3-compatible storage)   │
│             │  Celery Worker  (background jobs)         │
│             │  Celery Beat    (scheduled jobs)          │
│             │  Flower         (Celery dashboard)        │
└─────────────┴───────────────────────────────────────────┘
```

**Database:** The application uses **Supabase** (managed PostgreSQL) as its primary database and authentication provider. The Docker Compose also includes a local PostgreSQL instance for environments where Supabase is not accessible or for local testing.

---

## 2. Prerequisites

### Required Software

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Docker | 24.x | Container runtime |
| Docker Compose | 2.x (v3.9 syntax) | Multi-container orchestration |
| Node.js | 18.x or 20.x | Frontend build only |
| npm | 9.x+ | Frontend package manager |
| Git | Any recent | Source code |

### Required External Services

| Service | Required | Purpose |
|---------|----------|---------|
| Supabase account | **Yes** | Database + Auth (PostgreSQL + JWT) |
| Anthropic API key | **Yes** | AI copilot features |
| OpenAI API key | **Yes** | Document AI enhancement |
| SMTP credentials | Optional | Email notifications |
| TybotFlow API key | Optional | TybotFlow integration |

### Server Requirements (Production)

- **CPU:** 4+ cores recommended (Celery uses 4 concurrent workers)
- **RAM:** 8 GB minimum, 16 GB recommended
- **Disk:** 50 GB+ (for uploads, PostgreSQL data, MinIO storage)
- **OS:** Linux (Ubuntu 22.04 LTS or Debian 12 recommended)

---

## 3. Project Structure

```
platform-RH/
├── docker-compose.yml          ← Main orchestration file
├── DEPLOYMENT.md               ← This file
├── ARCHITECTURE.md             ← Architecture documentation
├── docker/
│   └── init.sql                ← PostgreSQL initialization script
├── backend/                    ← FastAPI application
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example            ← Environment variable template
│   ├── .env                    ← Active secrets (DO NOT COMMIT)
│   └── app/
│       ├── main.py             ← FastAPI app entry point
│       ├── config.py           ← Settings (Pydantic)
│       ├── worker/
│       │   └── celery_app.py   ← Celery configuration
│       └── routers/            ← API route modules
└── real-app/                   ← React frontend (ACTIVE)
    ├── package.json
    ├── vite.config.ts
    ├── .env.example            ← Environment variable template
    ├── .env                    ← Active config (DO NOT COMMIT)
    └── src/
```

> **Note:** There is also a legacy `frontend/` directory — it is **not** the active frontend. Use `real-app/` only.

---

## 4. Environment Variables

### 4.1 Backend — `backend/.env`

Copy `backend/.env.example` to `backend/.env` and fill in all values:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_ENV` | No | `development` | Set to `production` in prod |
| `SECRET_KEY` | **Yes** | — | JWT signing secret (use a strong random string) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Refresh token lifetime |
| `SUPABASE_URL` | **Yes** | — | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | **Yes** | — | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | — | Supabase service role key (admin access) |
| `DATABASE_URL` | No | — | PostgreSQL direct connection URL (optional, for local DB) |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Redis URL |
| `CELERY_BROKER_URL` | No | `redis://localhost:6379/0` | Celery message broker |
| `CELERY_RESULT_BACKEND` | No | `redis://localhost:6379/1` | Celery result storage |
| `MINIO_ENDPOINT` | No | `localhost:9000` | MinIO server address |
| `MINIO_ACCESS_KEY` | No | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | No | `minioadmin123` | MinIO secret key (**change in prod**) |
| `MINIO_BUCKET_NAME` | No | `rh-platform` | MinIO bucket name |
| `MINIO_SECURE` | No | `False` | Set `True` if MinIO is behind HTTPS |
| `ANTHROPIC_API_KEY` | **Yes** | — | Anthropic Claude API key |
| `OPENAI_API_KEY` | **Yes** | — | OpenAI API key |
| `OPENAI_BASE_URL` | No | — | Custom OpenAI-compatible endpoint (if using a proxy) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model name |
| `TYBOTFLOW_API_KEY` | No | — | TybotFlow integration key |
| `MAIL_SERVER` | No | `smtp.gmail.com` | SMTP server hostname |
| `MAIL_PORT` | No | `587` | SMTP port |
| `MAIL_USERNAME` | No | — | SMTP username / email address |
| `MAIL_PASSWORD` | No | — | SMTP password or app password |
| `MAIL_FROM` | No | `noreply@tython.ma` | From address for outgoing emails |
| `MAIL_FROM_NAME` | No | `WEDY RH` | Display name for outgoing emails |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000,...` | Comma-separated list of allowed CORS origins |
| `MAX_FILE_SIZE_MB` | No | `20` | Max upload file size in MB |
| `UPLOAD_DIR` | No | `uploads` | Local upload directory path |

**Full example `backend/.env`:**

```env
APP_ENV=production
SECRET_KEY=<generate: openssl rand -hex 32>

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

REDIS_URL=redis://rh_redis:6379/0
CELERY_BROKER_URL=redis://rh_redis:6379/0
CELERY_RESULT_BACKEND=redis://rh_redis:6379/1

MINIO_ENDPOINT=rh_minio:9000
MINIO_ACCESS_KEY=<your_minio_user>
MINIO_SECRET_KEY=<your_minio_password>
MINIO_BUCKET_NAME=rh-platform
MINIO_SECURE=False

ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@tython.ma
MAIL_FROM_NAME=WEDY RH

ALLOWED_ORIGINS=https://your-frontend-domain.com

MAX_FILE_SIZE_MB=20
```

> **Important:** When running via Docker Compose, use container names as hostnames:
> - Redis: `rh_redis:6379` (not `localhost:6379`)
> - MinIO: `rh_minio:9000` (not `localhost:9000`)
> - PostgreSQL: `rh_postgres:5432` (not `localhost:5432`)

---

### 4.2 Frontend — `real-app/.env`

Copy `real-app/.env.example` to `real-app/.env`:

```bash
cp real-app/.env.example real-app/.env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes** | Backend API base URL (e.g., `https://api.yourdomain.com/api`) |
| `VITE_SUPABASE_URL` | **Yes** | Supabase project URL (same as backend) |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase public anon key (same as backend) |

**Example `real-app/.env` for production:**

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 4.3 Docker Compose — Infrastructure Credentials

These can be overridden in a root-level `.env` file next to `docker-compose.yml`:

```env
POSTGRES_USER=rh_user
POSTGRES_PASSWORD=<strong_password>
POSTGRES_DB=rh_platform

MINIO_ROOT_USER=<minio_admin_user>
MINIO_ROOT_PASSWORD=<strong_minio_password>
```

---

## 5. Docker Deployment (Recommended)

### Step 1 — Clone the repository

```bash
git clone <repository-url>
cd platform-RH
```

### Step 2 — Configure environment files

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with production values
nano backend/.env

# Frontend (only needed if building locally; for Docker it uses build args)
cp real-app/.env.example real-app/.env
nano real-app/.env

# Docker infrastructure credentials (optional override)
# Create a .env file at the project root with POSTGRES_* and MINIO_* values
```

### Step 3 — Build and start all services

```bash
docker compose up -d --build
```

This starts the following containers:

| Container | Service | Port |
|-----------|---------|------|
| `rh_postgres` | PostgreSQL 16 | 5432 |
| `rh_redis` | Redis 7 | 6379 |
| `rh_minio` | MinIO | 9000, 9001 |
| `rh_backend` | FastAPI API | 8000 |
| `rh_celery` | Celery Worker | — |
| `rh_beat` | Celery Beat | — |
| `rh_flower` | Celery Dashboard | 5555 |

### Step 4 — Verify all containers are healthy

```bash
docker compose ps
```

All services except celery_worker and flower should show `(healthy)`. Wait ~60 seconds for health checks to pass.

### Step 5 — Run database migrations

After the backend is healthy, run all SQL migration scripts in order against your **Supabase** database using the Supabase dashboard SQL editor or `psql`:

```bash
# Order matters — run in this sequence:
psql $SUPABASE_DB_URL -f backend/setup_database.sql
psql $SUPABASE_DB_URL -f backend/missing_tables.sql
psql $SUPABASE_DB_URL -f backend/schema_notifications_payroll.sql
psql $SUPABASE_DB_URL -f backend/modules_migration.sql
psql $SUPABASE_DB_URL -f backend/onboarding_migration.sql
psql $SUPABASE_DB_URL -f backend/portal_migration.sql
psql $SUPABASE_DB_URL -f backend/pdi_skills_migration.sql
psql $SUPABASE_DB_URL -f backend/cv_data_migration.sql
psql $SUPABASE_DB_URL -f backend/supabase_schema_v2.sql
psql $SUPABASE_DB_URL -f backend/upgrade_schema_v3.sql
psql $SUPABASE_DB_URL -f backend/v3_fix_constraints.sql
psql $SUPABASE_DB_URL -f backend/fix_documents_enum.sql
psql $SUPABASE_DB_URL -f backend/fix_payroll_columns.sql
psql $SUPABASE_DB_URL -f backend/fix_performance_columns.sql
psql $SUPABASE_DB_URL -f backend/interns_advanced_migration.sql
psql $SUPABASE_DB_URL -f backend/create_hr_requests.sql
psql $SUPABASE_DB_URL -f backend/migration_employee_files.sql
```

> **Note:** For a fresh environment, `setup_database.sql` creates the base schema. The remaining scripts are additive migrations applied on top.

### Step 6 — Create MinIO bucket

After MinIO is running, create the storage bucket:

```bash
# Option A: via MinIO Console
# Open http://your-server:9001 in a browser
# Login with MINIO_ROOT_USER / MINIO_ROOT_PASSWORD
# Create bucket named: rh-platform

# Option B: via mc CLI
docker exec rh_minio mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
docker exec rh_minio mc mb local/rh-platform
```

### Step 7 — Seed initial data (optional)

```bash
docker exec rh_backend python backend/seed_all.py
# Or for specific data:
docker exec rh_backend python backend/seed_users.py
docker exec rh_backend python backend/setup_accounts.py
docker exec rh_backend python backend/sync_templates.py
```

### Step 8 — Verify the API is running

```bash
curl http://localhost:8000/docs
# Should return the Swagger UI HTML
```

---

## 6. Database Setup & Migrations

### Supabase Configuration

The application relies on Supabase for:
- **Authentication:** JWT token issuance and validation
- **Database:** PostgreSQL with Row-Level Security (RLS)
- **Storage:** (optional, the app uses MinIO instead)

**Supabase setup steps:**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **Project Settings → Database** and copy the connection string for migrations
4. Run all SQL migration files listed in Step 5 above

### User Roles

The platform uses 3 roles:
- `admin` — Full platform access
- `hr` / `rh` — HR management access
- `employee` — Self-service employee access

---

## 7. Frontend Build & Deployment

The frontend is a Vite + React SPA that can be deployed as static files to any web server or CDN.

### Build for Production

```bash
cd real-app

# Install dependencies
npm install

# Set environment variables first (edit .env)
# Then build:
npm run build

# Output is in: real-app/dist/
```

### Serving the Frontend

**Option A — Nginx (recommended)**

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/wedy-rh/dist;
    index index.html;

    # SPA routing — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Option B — Docker (serve dist with nginx image)**

```dockerfile
FROM nginx:alpine
COPY real-app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

**Option C — Add to Docker Compose**

Add a build step for the frontend into the existing compose file or serve the `dist/` folder via the Nginx container.

---

## 8. Service Ports Reference

| Service | Container | Host Port | Access |
|---------|-----------|-----------|--------|
| FastAPI Backend API | `rh_backend` | **8000** | `http://server:8000` |
| FastAPI Swagger Docs | `rh_backend` | **8000** | `http://server:8000/docs` |
| PostgreSQL | `rh_postgres` | **5432** | Internal only (use Supabase in prod) |
| Redis | `rh_redis` | **6379** | Internal only |
| MinIO API | `rh_minio` | **9000** | `http://server:9000` |
| MinIO Web Console | `rh_minio` | **9001** | `http://server:9001` |
| Celery Flower Dashboard | `rh_flower` | **5555** | `http://server:5555` |
| Frontend Dev Server | local only | **5175** | Dev only, not in Docker |

> **Security:** In production, only expose ports **8000** (API) and the frontend port externally. All other ports (5432, 6379, 9000, 9001, 5555) should be restricted to internal network access or protected behind a firewall / VPN.

---

## 9. Production Checklist

### Security

- [ ] Change all default passwords (`minioadmin123`, `rh_password`, etc.)
- [ ] Generate a strong `SECRET_KEY`: `openssl rand -hex 32`
- [ ] Rotate Supabase keys from the development project to a production project
- [ ] Set `APP_ENV=production` in `backend/.env`
- [ ] Set `ALLOWED_ORIGINS` to the exact frontend domain only
- [ ] Restrict Docker port exposure — only expose what's needed publicly
- [ ] Enable HTTPS / SSL certificates (Let's Encrypt or your CA)
- [ ] Set `MINIO_SECURE=True` if MinIO is behind HTTPS
- [ ] Do not commit `.env` files to Git (already in `.gitignore`)

### Infrastructure

- [ ] Configure persistent volume backups for `postgres_data`, `minio_data`, `uploads_data`
- [ ] Set up automated PostgreSQL backups (pg_dump or Supabase built-in backups)
- [ ] Configure log aggregation (ELK, Loki, or similar)
- [ ] Set up uptime monitoring for port 8000 (API health)
- [ ] Set `restart: always` in docker-compose for production (currently `unless-stopped`)
- [ ] Configure a reverse proxy (Nginx or Traefik) in front of the backend

### CI/CD

- [ ] Configure CI/CD pipeline (GitHub Actions / GitLab CI — not yet implemented)
- [ ] Add automated `docker compose pull && docker compose up -d` deployment step
- [ ] Add smoke test after deploy (curl the `/docs` endpoint)

### Networking

- [ ] Configure DNS records for frontend domain and API subdomain
- [ ] Update `VITE_API_URL` in frontend `.env` to the production API URL
- [ ] Update `ALLOWED_ORIGINS` in backend `.env` to match the frontend domain

---

## 10. Monitoring & Logs

### View container logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f celery_worker
docker compose logs -f celery_beat

# Last 100 lines
docker compose logs --tail=100 backend
```

### Celery Flower Dashboard

Monitor background tasks at: `http://your-server:5555`

- View active, queued, and completed tasks
- Monitor worker status and throughput
- Inspect failed task details and retry

### Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET http://server:8000/docs` | API is up (returns Swagger UI) |
| `GET http://server:9000/minio/health/live` | MinIO is healthy |

### Application Logs

The backend uses **Loguru** for structured logging. Logs are printed to stdout and captured by Docker. To persist logs to disk, mount a volume or configure a log driver in `docker-compose.yml`:

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 11. Troubleshooting

### Backend won't start

**Symptom:** `rh_backend` container exits immediately.

**Check:**
```bash
docker compose logs backend
```

**Common causes:**
- Missing or invalid `.env` file in `backend/`
- Supabase URL / keys are wrong
- Redis or MinIO not healthy yet (wait and retry: `docker compose restart backend`)

---

### Celery tasks not processing

**Symptom:** Background jobs appear queued but never complete.

**Check:**
```bash
docker compose logs celery_worker
# Open Flower: http://server:5555
```

**Common causes:**
- `CELERY_BROKER_URL` pointing to `localhost` instead of `rh_redis`
- Redis container not running

**Fix:**
```bash
# Ensure Redis URLs use container name
REDIS_URL=redis://rh_redis:6379/0
CELERY_BROKER_URL=redis://rh_redis:6379/0
CELERY_RESULT_BACKEND=redis://rh_redis:6379/1
```

---

### File uploads failing

**Symptom:** Upload endpoint returns 500 or files not found.

**Check:**
```bash
docker compose logs backend | grep -i minio
```

**Common causes:**
- MinIO bucket `rh-platform` does not exist (run Step 6)
- `MINIO_ENDPOINT` set to `localhost:9000` instead of `rh_minio:9000`

---

### Frontend shows "Network Error" or blank page

**Common causes:**
- `VITE_API_URL` not set or pointing to wrong URL
- CORS error — backend `ALLOWED_ORIGINS` does not include the frontend domain
- Frontend was built without `.env` file (Vite bakes env vars at build time)

**Fix:** Rebuild the frontend after correcting `.env`:
```bash
cd real-app && npm run build
```

---

### Database migration errors

**Symptom:** SQL script fails with "relation already exists" or constraint errors.

**Advice:** The migration scripts are not idempotent. Run them in order on a **fresh** database. For an existing database, apply only the scripts that haven't been run yet. Check each script's comments for prerequisites.

---

### Rebuild a single service

```bash
docker compose up -d --build backend
```

### Full reset (destroys all data)

```bash
# WARNING: This deletes all persistent volumes
docker compose down -v
docker compose up -d --build
```

---

## API Reference

Interactive API documentation is available at:
- **Swagger UI:** `http://your-server:8000/docs`
- **ReDoc:** `http://your-server:8000/redoc`

### Main API Modules

| Router Prefix | Description |
|--------------|-------------|
| `/api/auth` | Login, signup, token refresh |
| `/api/employees` | Employee CRUD |
| `/api/interns` | Internship management |
| `/api/documents` | Document generation (AI-powered) |
| `/api/templates` | Document templates |
| `/api/leaves` | Time-off management |
| `/api/payroll` | Payroll records |
| `/api/performance` | Performance reviews |
| `/api/analytics` | Dashboard analytics |
| `/api/copilot` | AI copilot assistant |
| `/api/notifications` | User notifications |
| `/api/users` | User management |
| `/api/orgchart` | Organization chart |
| `/api/audit_log` | Audit trail |
| `/api/profiles` | User profiles |

---

*For questions, contact the development team.*
