# Architecture — Wedy RH

HR platform for Moroccan companies. AI-powered document generation, employee management, and HR workflows.
Powered by **Claude AI (Anthropic)** and **Supabase**.

---

## Project structure

```
wedy-rh/
├── frontend/       ← Frontend (Vite + React 18 + TypeScript)
├── backend/        ← API (Python + FastAPI)
├── scripts/        ← Root-level maintenance/debug scripts
└── ARCHITECTURE.md
```

> Note: the frontend section below predates the current `frontend/` page set and will be
> refreshed as part of the frontend architecture pass.

## Frontend — `frontend/`

- **Framework**: Vite + React 18 + TypeScript
- **Routing**: React Router v6
- **State / fetching**: TanStack React Query
- **Styling**: CSS variables (`src/styles.css`), inline styles
- **Icons**: Lucide React
- **Toasts**: Sonner

```
src/
├── App.tsx                        ← Routes + auth guard
├── main.tsx
├── styles.css                     ← Design tokens + global styles
├── components/
│   ├── WedyLogo.tsx               ← Brand logo component
│   ├── layout/
│   │   └── AppShell.tsx           ← Sidebar + page shell
│   └── ui/
│       └── index.tsx              ← Button, Badge, Card, Input, Modal, Avatar…
├── lib/
│   ├── api.ts                     ← Axios client + all API calls
│   ├── auth.tsx                   ← AuthProvider + useAuth hook
│   └── supabase.ts                ← Supabase browser client
└── pages/
    ├── LoginPage.tsx
    ├── marketing/
    │   └── LandingPage.tsx
    └── app/
        ├── DashboardPage.tsx
        ├── CopilotPage.tsx
        ├── NotificationsPage.tsx
        ├── EmployeesPage.tsx
        ├── RecruitmentPage.tsx
        ├── PerformancePage.tsx
        ├── TimeOffPage.tsx
        ├── PayrollPage.tsx
        ├── GeneratePage.tsx
        ├── TemplatesPage.tsx
        ├── HistoryPage.tsx
        ├── AnalyticsPage.tsx
        ├── AuditPage.tsx
        ├── IntegrationsPage.tsx
        ├── UsersPage.tsx
        ├── SettingsPage.tsx
        ├── HelpPage.tsx
        └── SecurityPage.tsx
```

## Backend — `backend/`

- **Framework**: FastAPI (Python)
- **Database / Auth**: Supabase (PostgreSQL + Supabase Auth)
- **AI**: Claude API (Anthropic) / OpenAI-compatible fallback, for document enhancement and AI Copilot
- **Exports**: PDF (WeasyPrint / ReportLab fallback) and DOCX (python-docx)

```
backend/
├── app/
│   ├── main.py                ← FastAPI app, router registration, global exception handlers
│   ├── config.py               ← Settings (env-driven)
│   ├── database.py             ← Supabase client singleton (get_db dependency)
│   ├── dependencies.py         ← Auth dependencies (get_current_user, require_role, ...)
│   ├── routers/                ← One module per resource — HTTP layer only (parse
│   │                              request → call repository/service → shape response)
│   ├── repositories/           ← One module per resource — every supabase.table()/
│   │                              supabase.auth.* call lives here, nowhere else
│   ├── services/                ← Business logic that isn't pure data access:
│   │                              AI calls, PDF/DOCX generation, payroll tax calc,
│   │                              CV parsing, audit logging/notifications
│   └── schemas/                 ← Pydantic request/response models
├── database/
│   └── migrations/              ← All SQL schema/migration/fix scripts
├── scripts/                     ← One-off maintenance scripts (seed, setup, repair)
│   └── scratch/                 ← Ad-hoc debug scripts, not part of the app
└── uploads/                     ← User-uploaded files (employee documents, CVs)
```

Key routes:
- `POST /auth/login` — sign in, returns JWT
- `POST /auth/signup` — create account
- `GET  /auth/me` — current user profile + roles
- `GET/POST/PATCH/DELETE /employees` — employee CRUD
- `GET /templates` — list document templates
- `POST /documents/generate` — generate a document
- `GET /documents` — document history
- `POST /documents/ai/enhance` — AI enhancement

## Auth flow

1. User logs in → FastAPI validates with Supabase Auth → returns JWT
2. Frontend stores JWT in `localStorage` as `wedy_token`
3. Axios interceptor attaches `Authorization: Bearer <token>` to every request
4. Backend uses `service_role` key to bypass Supabase RLS for server-side queries

## Running locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev   # → http://localhost:5173
```
