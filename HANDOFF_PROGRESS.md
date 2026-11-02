# Wedy redesign — handoff progress

Source of truth: `design_handoff_wedy/` (HTML wins over README). One screen per session; commit each validated screen.
Legend: ☐ todo · ◐ in progress · ☑ done and compared against the reference at 1440px and 1024px.

How to check a screen: `cd design_handoff_wedy/design && npx serve -l 4000 .` and `cd frontend && npm run dev`, then compare
`http://localhost:4000/<FILE>.dc.html` with our page. `frontend/ui-lab.html` (dev only) shows every shared component:
`/ui-lab.html?view=kit|sidebar|topbar|portal&lang=fr|en|ar`. Before committing: `npm run build`, `npm run lint` (no new
problems; `main` already has ~390), `npm run i18n:check`.

## Foundations

- ☑ 0. Branch `feat/design-handoff`, this file
- ☑ 1. Tokens (`src/styles/tokens.css`), legacy variable aliases and restyled legacy classes (`styles.css`, `styles/ui.css`), fonts loaded once (index.html); dark mode dropped
- ☑ 2. Motion primitives (`components/motion`: `Reveal`/`useReveal`, `CountUp`/`useCountUp`, `Orb`, loop classes; `lib/inView.ts`), reduced motion honoured
- ☑ 3. Shared UI (`components/ui`): Button, Badge, Card, Field/Input/SearchInput/Select/Textarea, Switch, Checkbox, SegmentedTabs, FilterPills, StatCard, Drawer, Modal, EmptyState, DarkHeroPanel, AIInsight, Avatar, ProgressRing, Skeleton, Spinner, DataTable
- ☑ 4. Toast: sonner re-skinned (`WedyToaster`), `useNotify()` with the undo pattern (`lib/notify.ts`)
- ☑ 5. Shell: `Sidebar`, `Topbar`, `AppShell` (mobile drawer under 1024px), `Page`, `PageHeader`, `PortalNav`/`AppShellEmployee`, `navConfig.ts`
- ☑ 6. i18n: shell/shared keys in fr/en/ar, `npm run i18n:check`
- ☑ 7. `ui-lab` dev page
- ☐ 8. Regression sweep of un-migrated authenticated pages (needs backend + login)
Login notes (what differs from the reference, and why):
- The reference's `flex-flow: row-reverse` puts the form on the **right** and the dark brand panel on the **left** (the README says the opposite; HTML wins). Under ~1020px the two wrap (form first), exactly like the reference.
- **2FA step not built**: the backend has no 2FA endpoint (auth is Tybot's), and a fake code check would be security theatre. Build it when an API exists.
- "Mot de passe oublié ?" and "Besoin d'aide ?" show an info toast (reset happens in the Tybot account); there is no Tybot reset URL in the repo.
- Dropped as demo-only: credentials prefill, "Rejouer la démo", the password minimum-length rule (the server decides; existing accounts may have short passwords). Validation is: valid email format, non-empty password. Server errors are shown in the same red box (with the shake).
- Success screen redirects after 2.2s (0.6s with reduced motion); the bar fills over the same time. The reference never redirected (demo).
- No language switch on this page (the design has none); the stored language is used.
- `useReveal` gained `down` / `word` variants and `distance` / `easing` / `scaleFrom` / `maxDelay` options for this screen; `.wedy-spin-rev` loop added.
- Compared at 1440 and 1024 by measuring both pages (card, inputs, button, chips, headline, footer all within 0.1px). The app's thin 6px scrollbar differs from the reference's default scrollbar, which shifts x positions by a few px.

Notes for the screens:
- Pages import `PageHeader`/`Page` from `@/components/layout/AppShell`. Wrap a migrated page's content in `<Page>`; the old `PageHeader` padding only applies outside it.
- Counts/pending badges in the sidebar come from the `['notifications']` and `['requests-count']` queries; a screen that changes them should update those query keys.
- The portal nav has no "Demander à Wedy" button yet (`<PortalNav showAsk />` enables it): employees have no copilot route.
- Settings still renders a dark-mode toggle that no longer does anything; remove it when Settings is migrated (also `lib/theme.tsx` / `HrKpis.tsx`).

## Screens (38)

| # | Screen | Design file | Route | Page file | Status |
|---|---|---|---|---|---|
| 1 | Login | Wedy Login | `/login` | `LoginPage.tsx` (+ `components/login/*`, `styles/login.css`) | ☑ |
| 2 | Dashboard | Wedy Dashboard | `/app` | `app/DashboardPage.tsx` (+ `components/dashboard/HrKpis.tsx`) | ☑ |
| 3 | Employees | Wedy Employees | `/app/employees` | `app/EmployeesPage.tsx` + `EmployeesView.tsx` | ☑ |
| 4 | Employee folder | Wedy Employee | `/app/employees/:id` | `app/EmployeeFolderPage.tsx` | ☐ |
| 5 | Requests | Wedy Requests | `/app/requests` | `app/RequestsPage.tsx` | ☐ |
| 6 | Copilot | Wedy Copilot | `/app/copilot` | `app/CopilotPage.tsx` | ☐ |
| 7 | Generate | Wedy Generate | `/app/generate` | `app/GeneratePage.tsx` | ☐ |
| 8 | Templates | Wedy Templates | `/app/templates` | `app/TemplatesPage.tsx` | ☐ |
| 9 | History | Wedy History | `/app/history` | `app/HistoryPage.tsx` | ☐ |
| 10 | Time off | Wedy Time Off | `/app/timeoff` | `app/TimeOffPage.tsx` | ☐ |
| 11 | Absences | Wedy Absences | `/app/absences` | `app/AbsencesPage.tsx` | ☐ |
| 12 | Planning | Wedy Planning | `/app/planning-rh` | `app/PlanningRHPage.tsx` + `PlanningDayNotes.tsx` | ☐ |
| 13 | Recruitment | Wedy Recruitment | `/app/recruitment` | `app/RecruitmentPage.tsx` | ☐ |
| 14 | Candidates | Wedy Candidates | `/app/candidats` | `app/CandidatsPage.tsx` | ☐ |
| 15 | Job posts | Wedy Job Posts | `/app/annonces` | `app/AnnoncesPage.tsx` + `AnnonceStudioPage.tsx` | ☐ |
| 16 | Payroll | Wedy Payroll | `/app/payroll` | `app/PayrollPage.tsx` | ☐ |
| 17 | Performance | Wedy Performance | `/app/performance` | `app/PerformancePage.tsx` | ☐ |
| 18 | Org chart | Wedy Org Chart | `/app/orgchart`, `/employee/orgchart` | `app/OrgChartPage.tsx` | ☐ |
| 19 | Meetings | Wedy Meetings | `/app/meetings`, `/employee/meetings` | `app/MeetingsPage.tsx` | ☐ |
| 20 | Onboarding | Wedy Onboarding | `/app/onboarding` | `app/EmployeeOnboardingPage.tsx` | ☐ |
| 21 | Training | Wedy Training | `/app/training` | `app/TrainingPage.tsx` | ☐ |
| 22 | Talents | Wedy Talents | `/app/talents` | `app/TalentsPage.tsx` | ☐ |
| 23 | Tenders | Wedy Tenders | `/app/tenders` | `app/TendersPage.tsx` | ☐ |
| 24 | Analytics | Wedy Analytics | `/app/analytics` | `app/AnalyticsPage.tsx` | ☐ |
| 25 | Audit | Wedy Audit | `/app/audit` | `app/AuditPage.tsx` | ☐ |
| 26 | Notifications | Wedy Notifications | `/app/notifications` | `app/NotificationsPage.tsx` | ☐ |
| 27 | Integrations | Wedy Integrations | `/app/integrations` | `app/IntegrationsPage.tsx` | ☐ |
| 28 | Users & roles | Wedy Users | `/app/users` | `app/UsersPage.tsx` | ☐ |
| 29 | Settings | Wedy Settings | `/app/settings` | `app/SettingsPage.tsx` | ☐ |
| 30 | Security | Wedy Security | `/app/security` | `app/SecurityPage.tsx` | ☐ |
| 31 | Help | Wedy Help | `/app/help` | `app/HelpPage.tsx` | ☐ |
| 32 | Portal home | Wedy Portal | `/employee` | `employee/EmployeeDashboard.tsx` | ☐ |
| 33 | Portal leave | Wedy Portal Leave | `/employee/conges` | `employee/MyLeavePage.tsx` | ☐ |
| 34 | Portal documents | Wedy Portal Documents | `/employee/documents` | `employee/MyDocumentsPage.tsx` | ☐ |
| 35 | Portal training | Wedy Portal Training | `/employee/formation` | `employee/MyTrainingPage.tsx` | ☐ |
| 36 | Portal profile | Wedy Portal Profile | `/employee/profil` | `employee/MyProfilePage.tsx` | ☐ |
| 37 | Apply (careers) | Wedy Apply | `/postuler/:id` | `public/PostulerPage.tsx` | ☐ |
| 38 | Landing | Wedy Landing | `/` | `marketing/LandingPage.tsx` | ☐ |

Extra rows implied by the README (no 1:1 design file):

| Item | Notes | Status |
|---|---|---|
| Interns | `/app/interns`, `app/InternsPage.tsx`: Employees layout, `contract = Stage` preset, school / tutor / end-date columns | ☐ |
| Portal Org chart + Meetings tabs | already in `PortalNav`; render the Org chart (read-only, no export) and Meetings designs inside the portal shell | ☐ |
| Remove legacy bits | `.btn`/`.card`/`.badge`/… legacy classes and legacy `--ink`/`--line` aliases once no page uses them; dark-mode leftovers | ☐ |

Suggested order: Login → Dashboard → Employees → Employee folder → Requests → Copilot → Generate → Templates → History → Time off →
Absences → Planning → Recruitment → Candidates → Job posts → Payroll → Performance → Org chart → Meetings → Onboarding → Training →
Talents → Tenders → Analytics → Audit → Notifications → Integrations → Users → Settings → Security → Help → Portal (5) → Apply → Landing.
