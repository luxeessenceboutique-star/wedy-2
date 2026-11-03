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

Templates notes (`TemplatesPage.tsx` + `TemplatesView.tsx`, generated from `Wedy Templates.dc.html`):
- The "N×" usage count is real: generated documents grouped by `template_id`. Language chips show FR plus AR/EN only when the template has a distinct name in that language.
- Kept the existing "official templates" (`/templates/seed-defaults`) and PDF/DOCX import (`/templates/import`) behind an "Importer ▾" menu next to "Nouveau modèle" (the reference has no room for two more buttons). Delete lives in the preview footer.
- Letterhead shows `user.profile.company` (fallback "Votre entreprise"), not the reference's hard-coded Tython SARL.
- `scripts/dedupe-i18n.mjs` removes earlier duplicates after re-running `apply-i18n.mjs` (it appends).

Planning notes (`PlanningRHPage.tsx`, hand-written against the reference):
- The week grid shows the real interviews (`/entretiens`), colored by type (RH / technique / final / réalisé); week navigation added (the reference shows one fixed week). Fixed-date Moroccan public holidays come from `lib/holidays.ts` (religious holidays are lunar and not listed).
- The reference's onboardings / trainings / meetings have no dated backend data, so they are not invented on the grid. The "Synchronisé avec Google Calendar" pill was dropped: there is no calendar sync.
- "Nouvel événement" became "Planifier un entretien" (drawer → `scheduleInterview`); the dark card can mark an interview done (`updateInterviewStatus`). Free slots are the real `/creneaux` of the week; "Gérer les créneaux" opens the existing slots manager in a drawer. "Note du jour" reads/writes `/planning-notes`. The old month calendar (`CalendrierRHPage.tsx`, `PlanningDayNotes.tsx`) was removed.

Recruitment notes (`RecruitmentPage.tsx`, hand-written):
- Candidates are `employees` rows with `status = candidate`. The pipeline stage, AI score and source live in `custom_fields` (`recruitment_stage`, `ai_score`, `source`, `stage_changed_at`) — no new columns. Without a stored stage a candidate is "Entretien" if an interview is coming, else "Nouveau". The score ring / source chip only show when the data exists.
- Dropping a card saves the stage (`updateEmployee`); dropping on "Embauché" asks for confirmation and promotes the candidate (`promoteToEmployee`, hire date = today). The column lists recent hires (≤ 90 days) still tagged `recruitment_stage = hired`.
- KPIs are real: open posts = active job posts, active candidates, upcoming interviews, average delay = hire date − application date of recent hires ("—" when none).
- The previous screen (Tybot SmartDB "candidatures spontanées") is kept, moved to `components/recruitment/SpontaneousApplications.tsx`, opened from the inbox icon button.

Candidates notes (`CandidatsPage.tsx`):
- Cards and drawer use the real candidate file: summary = `experience_summary` / `bio` / `notes`, skills + languages, years from `custom_fields.experience_years`. The reference's 4 sub-score bars are derived from the score in the mock (fake), so they are not shown.
- "Planifier un entretien" opens the shared `ScheduleInterviewDrawer` (also used by Planning) and moves the candidate to "Entretien"; "Refuser" stores `recruitment_stage = rejected` (can be reconsidered). The previous actions (add, hire as employee / intern, delete) are kept in the header and the drawer footer. `?c=<id>` opens a profile (used by the Recruitment cards).

Job posts notes (`AnnoncesPage.tsx`):
- Real posts (`/annonces`): status Publiée / Clôturée = `is_active`, toggled by clicking the chip (new `updateAnnonce` → `PATCH /annonces/:id`); delete + copy-application-link added. There is no draft state nor view counter in the backend, so "Brouillon" and "N vues" are not shown. Applications = candidates linked by `custom_fields.ad_id`, or applying for the same position.
- The studio calls `/annonces/chat-generate` with a new `mode: "direct"` (+ `language`, `company`): the backend then writes the ad at once in FR / AR / EN with the reference's structure instead of the chat flow (which asked questions and always answered in French). The draft is editable before "Publier l'annonce" (`createAnnonce`). `AnnonceStudioPage.tsx` is not routed (left as is).

Payroll notes (`PayrollPage.tsx`):
- The 5-step cycle is derived from the month's real payslips: no payslip → "Générer les bulletins" (`generate-bulk`); open checks → Contrôle IA; drafts → "Valider la paie" (draft → validated); validated → "Virements effectués" (→ paid); all paid → clôturée. Month navigation added.
- The "Contrôle IA" items are real rule-based checks: active employee without payslip (→ create it), bonus without a justification note, gross ±20 % vs last month, contract ending this month. "Marquer vérifié" is stored on the payslip (`notes` gets an `[ok:<kind>]` tag) so it is shared by the team.
- KPIs, employer cost and the 6-month chart come from `/payroll`; employer charges are an estimate with the Moroccan rates (labelled so). "Exporter vers Sage Paie" became the existing CSV export (no Sage connector). Deadlines are the legal ones (salary at month end, CNSS on the 10th, IR at the end of next month). Rows keep PDF download and delete.

Org chart notes (`OrgChartPage.tsx`):
- New read endpoint `GET /orgchart/people` (any signed-in user: active, on-leave and interns with department, manager, email). The tree is built from it: top card = the person whose position reads "Directeur général / CEO / PDG / gérant" (else the company), one column per department sorted by size, head = best match of directeur > responsable/manager > chef, then whoever others name as `manager`. First 3 members shown, "+ N autres" expands.
- Search dims non-matches and opens collapsed departments, zoom/fit as in the reference, person card with "Voir le dossier" (HR only) and mail. "Exporter" prints an A3 landscape sheet (browser print → PDF).
- The previous ReactFlow "teams/projects" editor is kept as `components/orgchart/ProjectTeamsBoard.tsx`, opened from the network icon (HR only). The portal route renders the same chart read-only.

Onboarding notes (`EmployeeOnboardingPage.tsx`):
- Newcomers = active employees hired ≤ 120 days ago or arriving later (pre-boarding), plus anyone with a started onboarding (≤ 1 year). Day J+N comes from `hire_date`.
- The 30-60-90 tasks are the backend's `plan_30/60/90` (labels from the backend defaults, not the reference's demo list); ticking saves them (`PATCH /employee-onboarding/:id`). Buddy = `buddy_name` (saved on blur, suggestions from employees). The contract button records the signature (`/sign-contract`) — there is no e-signature service, so it says "Marquer le contrat signé".
- Pulses: `/employee-onboarding/:id/pulse` (score → `satisfaction_score`, week from the day). "Analyse de Wedy" is computed from the real file (pulse average, missing buddy, unsigned contract, late tasks, arrival countdown). KPIs from all newcomers' plans and pulses. "Démarrer un onboarding" creates the plan for a chosen employee.

Training notes (`TrainingPage.tsx`):
- Catalog / enrolments / skills all come from `/training/*` (catalog, assignments, skills, employee-skills). The reference's "Présentiel / Hybride / En ligne" chip has no field, so it is not shown; course delete appears on hover.
- KPIs are real: enrolments, completion rate, amount committed this year (sum of course costs — there is no budget setting, so no "/ 250 000 DH" target), hours of completed courses and hours per trained person.
- Enrolments: start / mark completed / unenrol (`PATCH`/`DELETE /training/assignments`). Status-only progress (0 / … / 100 %), no fake percentages.
- Skills matrix: the 6 most-assessed skills × assessed people; clicking cycles non évalué → débutant → intermédiaire → expert (upsert / delete). "Écarts détectés" lists people below intermediate and suggests a catalog course whose title/description/category matches the skill, with one-click enrolment.

Talents notes (`TalentsPage.tsx`):
- Real `/talents` profiles (categories = backend 9-box classes star / solid / potential / key_player / needs_improvement). Performance & potential are editable (5-step bars), risk and "poste critique" toggle on the chips, the risk explanation / target role / career path are inline fields, successors add/remove — all saved with `PATCH /talents/:id`.
- Backend fix: a partial PATCH (e.g. only the risk) used to reclassify the profile with the default 3/3 scores; it now completes with the stored scores.
- OKR tab (`/okrs`, progress slider saved on release) and PDI tab (`/pdi`, add + status cycle) are real. "Profiler avec l'IA" became "Initialiser les profils" (`/talents/bulk-profile` creates missing default profiles — it is not AI).
- Mobility = profiles with a target role different from the current position; match % = (performance + potential) / 10. "Proposer" adds a "Mobilité interne : <rôle>" item to the person's PDI (so it persists and shows as proposed).

Analytics notes (`AnalyticsPage.tsx`):
- Headcount curve, hires/departures, departments and contracts come from `/dashboard/kpis?days=365` (12-month `evolution`); absenteeism from the same endpoint over the chosen period (100 − attendance rate). Turnover = departures / average headcount, annualised. Tenure and the age pyramid from active employees' `hire_date` / `birth_date`; time-to-hire from pipeline hires (hire date − application). KPIs without data show "—" / "Pas assez de données" (no sparklines invented).
- There is no gender field, so the reference's women/men bar is not shown. "Ce que Wedy remarque" is computed (department concentrating departures, contracts ending ≤ 30 days, headcount trend, absenteeism > 4 %). "Exporter le rapport" prints a report (browser → PDF).

Tenders notes (`TendersPage.tsx`):
- Runs the real agent (`POST /tenders/run`, status polled every 2 s while running, `/tenders/results`, file download through `/tenders/:id/files/:name`). The live log shows the agent's real progress messages. There is no stop endpoint, so "Arrêter l'agent" is not offered (the button shows "Recherche en cours…").
- Keywords are chips; contact details (required by the portal) and the optional model / API key live in "Paramètres de l'agent" (stored in this browser, like before) together with "Effacer les résultats".
- MATCH = share of your keywords found in the notice/analysis (shown only when keywords exist). The analysis panel shows the agent's real fields (technologies, project type, files, deadline, budget); the reference's "Avis de Wedy GO/NO GO", caution and site visit have no data, replaced by computed "Points d'attention" (deadline, complexity, missing files, low match).

History notes (`HistoryPage.tsx`, rewritten — the previous version showed invented fallback numbers):
- Documents grouped by day (Aujourd'hui / Hier / date), type from the source template's category, language filter, search; preview / PDF / delete per row; "Exporter le registre" downloads a CSV of the filtered list.
- KPIs are real: documents this month vs last month, estimated time saved (20 min per document, labelled as an estimate), employees covered, language split. There is no "generated by AI / by HR" field, so the reference's "Rédigés par Wedy IA" card and the Wedy IA / Équipe RH filter are replaced by "Collaborateurs concernés".
- Help: hero title was dark-on-dark (now white) and the robot emoji is the Wedy avatar.

Portal notes (home + leave):
- Home uses `/portal/me` (+ contract-end banner ≤ 45 days), the leave balance (`/leaves/balance/:id`), the latest leave + document requests, the current training, the next public holiday (`/leaves/holidays`, else the fixed Moroccan list) and the person's OKRs. The reference's payslip card, "Mon équipe aujourd'hui" and company announcements have no employee-side data/endpoint, so they are not shown.
- Leave: real balance KPIs (available, pending, after approval, taken this year), request form (`POST /portal/me/leaves`) with working days counted client-side (weekends + holidays excluded) and an over-balance warning; history of the person's requests. There is no employee cancel endpoint, so "Annuler" is not offered; the team calendar has no data source.

Portal notes (documents, training, profile):
- New employee-scoped endpoints in `routers/portal.py`: `GET /portal/me/documents` and `GET /portal/me/documents/:id` (only the signed-in employee's generated documents — the HR route `GET /documents/generate/:id` accepts any signed-in user and should be restricted to HR), and `PATCH /portal/me` (phone / address / city only, HR notified).
- Documents: the dark request card posts a real document request (type + language + purpose in the comment); the list shows pending requests, the person's generated documents (open/print) and handled requests. The reference's "Générer maintenant / immédiat" and payslip/contract sections have no employee-side data.
- Training: current and upcoming enrolments, completed ones, and the company catalog; "Demander" sends an enrolment request to HR through the document-request channel (there is no training-request endpoint). No fake progress percentages.
- Profile: editable contact fields (saved with `PATCH /portal/me`), locked administrative data (CIN, matricule, CNSS / RIB from `custom_fields`, masked RIB), language switch. Notification toggles and password change are not shown: no settings storage, and passwords are managed by the Tybot account.

Apply notes (`public/PostulerPage.tsx`):
- New public endpoint `POST /candidats/apply` (it was called by the page but did not exist): validates name/email, checks the post is active, refuses a duplicate application to the same post, creates the candidate with `custom_fields` (`ad_id`, `source = Site carrière`, `recruitment_stage = new`, `cv_url`, `linkedin`), books the chosen free slot as an interview (stage → interview) and notifies HR.
- The page renders the real post: contract/city chips from its description, the AI-written text split into "Vos missions / Votre profil / Ce que nous offrons" cards, key points. CV upload uses the existing public CV extraction to pre-fill the form and show skills; optional interview slot picker; 09-08 consent; success timeline. The reference's company facts (headcount, % women, remote days) have no public data and are not shown.

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
| 8 | Templates | Wedy Templates | `/app/templates` | `app/TemplatesPage.tsx` + `TemplatesView.tsx` | ☑ |
| 9 | History | Wedy History | `/app/history` | `app/HistoryPage.tsx` | ☑ |
| 10 | Time off | Wedy Time Off | `/app/timeoff` | `app/TimeOffPage.tsx` | ◐ |
| 11 | Absences | Wedy Absences | `/app/absences` | `app/AbsencesPage.tsx` | ◐ |
| 12 | Planning | Wedy Planning | `/app/planning-rh` | `app/PlanningRHPage.tsx` (+ `CreneauxRHPage.tsx` in a drawer) | ☑ |
| 13 | Recruitment | Wedy Recruitment | `/app/recruitment` | `app/RecruitmentPage.tsx` (+ `lib/recruitment.ts`) | ☑ |
| 14 | Candidates | Wedy Candidates | `/app/candidats` | `app/CandidatsPage.tsx` | ☑ |
| 15 | Job posts | Wedy Job Posts | `/app/annonces` | `app/AnnoncesPage.tsx` | ☑ |
| 16 | Payroll | Wedy Payroll | `/app/payroll` | `app/PayrollPage.tsx` | ☑ |
| 17 | Performance | Wedy Performance | `/app/performance` | `app/PerformancePage.tsx` | ◐ |
| 18 | Org chart | Wedy Org Chart | `/app/orgchart`, `/employee/orgchart` | `app/OrgChartPage.tsx` | ☑ |
| 19 | Meetings | Wedy Meetings | `/app/meetings`, `/employee/meetings` | `app/MeetingsPage.tsx` | ◐ |
| 20 | Onboarding | Wedy Onboarding | `/app/onboarding` | `app/EmployeeOnboardingPage.tsx` | ☑ |
| 21 | Training | Wedy Training | `/app/training` | `app/TrainingPage.tsx` | ☑ |
| 22 | Talents | Wedy Talents | `/app/talents` | `app/TalentsPage.tsx` | ☑ |
| 23 | Tenders | Wedy Tenders | `/app/tenders` | `app/TendersPage.tsx` | ☑ |
| 24 | Analytics | Wedy Analytics | `/app/analytics` | `app/AnalyticsPage.tsx` | ☑ |
| 25 | Audit | Wedy Audit | `/app/audit` | `app/AuditPage.tsx` | ◐ |
| 26 | Notifications | Wedy Notifications | `/app/notifications` | `app/NotificationsPage.tsx` | ◐ |
| 27 | Integrations | Wedy Integrations | `/app/integrations` | `app/IntegrationsPage.tsx` | ◐ |
| 28 | Users & roles | Wedy Users | `/app/users` | `app/UsersPage.tsx` | ◐ |
| 29 | Settings | Wedy Settings | `/app/settings` | `app/SettingsPage.tsx` | ◐ |
| 30 | Security | Wedy Security | `/app/security` | `app/SecurityPage.tsx` | ◐ |
| 31 | Help | Wedy Help | `/app/help` | `app/HelpPage.tsx` | ◐ |
| 32 | Portal home | Wedy Portal | `/employee` | `employee/EmployeeDashboard.tsx` | ☑ |
| 33 | Portal leave | Wedy Portal Leave | `/employee/conges` | `employee/MyLeavePage.tsx` | ☑ |
| 34 | Portal documents | Wedy Portal Documents | `/employee/documents` | `employee/MyDocumentsPage.tsx` | ☑ |
| 35 | Portal training | Wedy Portal Training | `/employee/formation` | `employee/MyTrainingPage.tsx` | ☑ |
| 36 | Portal profile | Wedy Portal Profile | `/employee/profil` | `employee/MyProfilePage.tsx` | ☑ |
| 37 | Apply (careers) | Wedy Apply | `/postuler/:id` | `public/PostulerPage.tsx` | ☑ |
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
