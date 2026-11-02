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
- `scripts/dc2jsx.mjs` converts a `.dc.html` reference into a `*View.tsx` (exact inline styles, driven by a `v` prop) + `*View.css` (hover/focus rules). The matching `*Page.tsx` defines the `*Vals` type, computes `v` from real hooks/queries (same API calls as before), and renders `<XView v={v} />`. Used for Employee folder; reuse for the rest.

Employee folder notes (`EmployeeFolderPage.tsx` + `EmployeeFolderView.tsx`, generated from `Wedy Employee.dc.html`):
- Login is `ammar.rabeh@tython.org` (real Tybot account, role `hr`) against the live `dbrag.tybot.ma` Supabase + Tybot auth — this is **production data for a real company (Tython)**, not a sandbox; only additive/read QA actions were taken (no edits to real employee records).
- Hero (name, avatar, status, contract chips, dates, city) is fully driven by the real `Employee` record; the "Contrat : fin dans N jours" alert + "Préparer l'avenant" button only show when `contract_end` is actually ≤30 days away (the reference always shows them — one fixed demo scenario). "Préparer l'avenant" opens Generate with the employee preselected (no avenant-generation endpoint exists to fake a toast around).
- "Modifier" (pencil) opens a real edit form (`updateEmployee`) instead of the reference's toast-only placeholder.
- Dossier complété % is `filled / total` over the 14 profile+contract fields (no demo padding).
- N° CNSS / RIB read from `employee.custom_fields` (no dedicated columns); Compétences & langues card uses real `employee.skills`/`languages` and is hidden when both are empty.
- "Compléter le dossier avec l'IA" calls the real `/employees/:id/analyze` + `/apply-analysis` endpoints; the extracted list shows only fields that are genuinely empty or conflict with the current record (never invents the reference's 4 mock fields).
- Fichiers tab: real upload/download/delete (`listEmployeeFiles` etc.); a delete button was added next to download (not in the reference, needed for a real admin tool).
- Documents tab: download via the real `printDocument`; the "Généré par X" subtitle was dropped for "Généré le {date}" (no author field in `GeneratedDoc`).
- Congés tab: real balance (`getLeaveBalance`) and history (`listLeaveRequests`); shows "—" / empty-state copy instead of the mock's fixed numbers when there's no data.
- Paie tab: net-pay breakdown card only renders when a payslip exists (from `listPayslips`); percentages are computed from the real net/CNSS+AMO/IR split. No payslip-PDF endpoint exists, so its download button shows an info toast instead of downloading.
- Performance tab: top card uses the latest real `PerformanceReview` (hidden with an empty-state card if none); `listGoals()` is currently a stub that always returns `[]`, so the goals list legitimately renders empty until a real goals endpoint exists.
- Breadcrumb stays the shared Topbar's generic "Personnes › Employés" (not the employee's name) — the Topbar is one shared component driven by route, not per-page.
- Compared at 1440 (and spot-checked 1024) against the reference with a real active employee (NIZAR TAOUSSI) and a real intern: layout, spacing, colors, radii all match; differences are only the data-dependent ones listed above.

Requests notes (`RequestsPage.tsx`, hand-written against `/requests/inbox`, not generated — it already matched the reference closely but had 2 real bugs, fixed here):
- "Analyse de Wedy" previously always showed a hardcoded placeholder sentence (the backend has no per-request AI analysis). It's now a real computed check for leave requests only (balance vs. days requested from `getLeaveBalance` + the matching `listLeaveRequests` row) and is hidden for document/other requests, where there's nothing genuine to compute.
- The initial selected request no longer falls back to a non-pending item when nothing is pending (it used to make one item confusingly "leak" into the empty "En attente" list); it now shows the proper empty state + "Sélectionnez une demande" placeholder.
- All labels (tabs, kind pills, status chips, per-row type) now go through `t()` — several were hardcoded French only, breaking EN/AR.
- Fixed a React 19 lint error (setState-in-effect) by deriving the default selection during render instead.

Copilot notes (`CopilotPage.tsx`, hand-written, not generated — full rewrite of the pre-redesign chat UI):
- The reference's own 280px dark chat sidebar is *not* implemented: the handoff README explicitly flags it as a leftover ("Dashboard and Copilot embed an older inline sidebar — use the shared one"). The page renders only the chat column; `AppShell` provides the real Sidebar/Topbar like every other page.
- Data grounding is real but server-side: the backend already injects a live DB context (employee counts, contracts expiring, leave requests…) into the system prompt before calling Claude/GPT — there's no client-side mock `tools()` to port, verified live ("Combien avons-nous d'employés actifs ?" → "Nous avons 28 employés actifs chez TYTHON.", a real number from the DB).
- The language switcher (FR/ع/EN) is real, not decorative: `sendCopilotMessage`'s `context` parameter existed in the API but the backend silently ignored it. Fixed with a 2-line backend change (`routers/copilot.py`) to append it to the system prompt; verified the same question asked in French gets answered in English when "EN" is selected.
- The greeting uses the real signed-in user's first name (`useAuth()`, same derivation as the Dashboard), not the mock's hardcoded "Salma".
- `<document titre="…" langue="…">` parsing (for the document-card bubble) is implemented client-side exactly like the reference, but the live backend's system prompt doesn't yet instruct the model to use that tag, so it won't normally trigger — ready for when/if that's added server-side, not left half-built.

## Screens (38)

| # | Screen | Design file | Route | Page file | Status |
|---|---|---|---|---|---|
| 1 | Login | Wedy Login | `/login` | `LoginPage.tsx` (+ `components/login/*`, `styles/login.css`) | ☑ |
| 2 | Dashboard | Wedy Dashboard | `/app` | `app/DashboardPage.tsx` (+ `components/dashboard/HrKpis.tsx`) | ☑ |
| 3 | Employees | Wedy Employees | `/app/employees` | `app/EmployeesPage.tsx` + `EmployeesView.tsx` | ☑ |
| 4 | Employee folder | Wedy Employee | `/app/employees/:id` | `app/EmployeeFolderPage.tsx` | ☑ |
| 5 | Requests | Wedy Requests | `/app/requests` | `app/RequestsPage.tsx` | ☑ |
| 6 | Copilot | Wedy Copilot | `/app/copilot` | `app/CopilotPage.tsx` | ☑ |
| 7 | Generate | Wedy Generate | `/app/generate` | `app/GeneratePage.tsx` | ◐ |
| 8 | Templates | Wedy Templates | `/app/templates` | `app/TemplatesPage.tsx` | ◐ |
| 9 | History | Wedy History | `/app/history` | `app/HistoryPage.tsx` | ◐ |
| 10 | Time off | Wedy Time Off | `/app/timeoff` | `app/TimeOffPage.tsx` | ◐ |
| 11 | Absences | Wedy Absences | `/app/absences` | `app/AbsencesPage.tsx` | ◐ |
| 12 | Planning | Wedy Planning | `/app/planning-rh` | `app/PlanningRHPage.tsx` + `PlanningDayNotes.tsx` | ◐ |
| 13 | Recruitment | Wedy Recruitment | `/app/recruitment` | `app/RecruitmentPage.tsx` | ◐ |
| 14 | Candidates | Wedy Candidates | `/app/candidats` | `app/CandidatsPage.tsx` | ◐ |
| 15 | Job posts | Wedy Job Posts | `/app/annonces` | `app/AnnoncesPage.tsx` + `AnnonceStudioPage.tsx` | ◐ |
| 16 | Payroll | Wedy Payroll | `/app/payroll` | `app/PayrollPage.tsx` | ◐ |
| 17 | Performance | Wedy Performance | `/app/performance` | `app/PerformancePage.tsx` | ◐ |
| 18 | Org chart | Wedy Org Chart | `/app/orgchart`, `/employee/orgchart` | `app/OrgChartPage.tsx` | ◐ |
| 19 | Meetings | Wedy Meetings | `/app/meetings`, `/employee/meetings` | `app/MeetingsPage.tsx` | ◐ |
| 20 | Onboarding | Wedy Onboarding | `/app/onboarding` | `app/EmployeeOnboardingPage.tsx` | ◐ |
| 21 | Training | Wedy Training | `/app/training` | `app/TrainingPage.tsx` | ◐ |
| 22 | Talents | Wedy Talents | `/app/talents` | `app/TalentsPage.tsx` | ◐ |
| 23 | Tenders | Wedy Tenders | `/app/tenders` | `app/TendersPage.tsx` | ◐ |
| 24 | Analytics | Wedy Analytics | `/app/analytics` | `app/AnalyticsPage.tsx` | ◐ |
| 25 | Audit | Wedy Audit | `/app/audit` | `app/AuditPage.tsx` | ◐ |
| 26 | Notifications | Wedy Notifications | `/app/notifications` | `app/NotificationsPage.tsx` | ◐ |
| 27 | Integrations | Wedy Integrations | `/app/integrations` | `app/IntegrationsPage.tsx` | ◐ |
| 28 | Users & roles | Wedy Users | `/app/users` | `app/UsersPage.tsx` | ◐ |
| 29 | Settings | Wedy Settings | `/app/settings` | `app/SettingsPage.tsx` | ◐ |
| 30 | Security | Wedy Security | `/app/security` | `app/SecurityPage.tsx` | ◐ |
| 31 | Help | Wedy Help | `/app/help` | `app/HelpPage.tsx` | ◐ |
| 32 | Portal home | Wedy Portal | `/employee` | `employee/EmployeeDashboard.tsx` | ◐ |
| 33 | Portal leave | Wedy Portal Leave | `/employee/conges` | `employee/MyLeavePage.tsx` | ◐ |
| 34 | Portal documents | Wedy Portal Documents | `/employee/documents` | `employee/MyDocumentsPage.tsx` | ◐ |
| 35 | Portal training | Wedy Portal Training | `/employee/formation` | `employee/MyTrainingPage.tsx` | ◐ |
| 36 | Portal profile | Wedy Portal Profile | `/employee/profil` | `employee/MyProfilePage.tsx` | ◐ |
| 37 | Apply (careers) | Wedy Apply | `/postuler/:id` | `public/PostulerPage.tsx` | ◐ |
| 38 | Landing | Wedy Landing | `/` | `marketing/LandingPage.tsx` | ◐ |

Extra rows implied by the README (no 1:1 design file):

| Item | Notes | Status |
|---|---|---|
| Interns | `/app/interns`, `app/InternsPage.tsx`: Employees layout, `contract = Stage` preset, school / tutor / end-date columns | ☐ |
| Portal Org chart + Meetings tabs | already in `PortalNav`; render the Org chart (read-only, no export) and Meetings designs inside the portal shell | ☐ |
| Remove legacy bits | `.btn`/`.card`/`.badge`/… legacy classes and legacy `--ink`/`--line` aliases once no page uses them; dark-mode leftovers | ☐ |

Suggested order: Login → Dashboard → Employees → Employee folder → Requests → Copilot → Generate → Templates → History → Time off →
Absences → Planning → Recruitment → Candidates → Job posts → Payroll → Performance → Org chart → Meetings → Onboarding → Training →
Talents → Tenders → Analytics → Audit → Notifications → Integrations → Users → Settings → Security → Help → Portal (5) → Apply → Landing.
