# Handoff: Wedy — full product redesign

Landing page, login, the whole HR app (32 screens), the employee portal (5 screens) and a public careers page.

---

## Overview

Wedy is an AI-native HR platform for Moroccan companies: French / Arabic / English HR documents, Moroccan labor-law rules (Code du travail, CNSS, Damancom, IR), leave, payroll prep, recruiting, talents, and an AI copilot (Claude).

This bundle redesigns **every screen** of the existing React app in `wedy-rh/frontend`, with one consistent visual system and a lot of purposeful motion. The demo company in the mock data is **Tython SARL** (Casablanca, 126 employees, emails `@tython.ma`). The HR admin is **Salma Idrissi**; the employee-portal user is **Yasmine Benali**.

## About the design files

The files in `design/` are **design references built in HTML**. They are prototypes that show the intended look and behavior. They are **not production code to copy**.

Your task is to **recreate these designs inside the existing codebase** (`wedy-rh/frontend`: React + TypeScript, react-query, the `api` client, the `useLang()` i18n with `constants/i18n/fr.ts`, `en.ts` and `ar.ts`, and the CSS variables such as `--primary`). Use its established patterns:

- Keep every existing API call, query, mutation and route.
- Replace the UI layer only.
- Replace mock data with real data.
- Put every UI string in the i18n dictionaries.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, shadows, copy, states and animations are all final. Recreate them pixel-perfectly. Every inline `style="…"` in the HTML is an exact value. When this README and an HTML file disagree, **the HTML file wins**.

---

## How to view and read the references

1. Serve the folder: `cd design_handoff_wedy/design && npx serve .` (or `python3 -m http.server 8080`).
2. Open a screen, for example `http://localhost:3000/Wedy%20Dashboard.dc.html`. An internet connection is required for Google Fonts and the Lucide CDN.

How a file is structured:

- **Markup:** everything between `<x-dc>` and `</x-dc>`. All styles are inline and exact.
  - `{{ name }}` is a value computed in JS.
  - `<sc-for list="{{ items }}" as="it">` is a `.map()`.
  - `<sc-if value="{{ x }}">` is conditional rendering.
  - `style-hover="…"` / `style-focus="…"` are `:hover` / `:focus` styles.
  - `<dc-import name="WedyNav" active="…">` is a shared child component (see `WedyNav.dc.html`, `WedyTopbar.dc.html`, `WedyPortalNav.dc.html`).
- **Behavior:** `<script data-dc-script>` contains `class Component extends DCLogic`.
  - `state = {…}` is the React state.
  - `renderVals()` returns every value and handler the markup uses. **Read it for interactions, validation rules, derived values and timings.**
  - The mock data constants at the top show the data shape each screen needs.
- **Icons:** `data-icon="name"` is a Lucide icon (`a|b` means the fallback name for older versions). Use `lucide-react`. Size comes from `data-size`, stroke width from `data-sw` (default 1.8).
- **Motion:** `data-reveal`, `data-loop` and `data-count` are handled by `wedy-fx.js` (spec below).
- **AI calls:** `window.claude.complete(...)` is a prototype-only helper. Replace it with the backend's existing Claude endpoints.

---

## Implementation order (recommended)

1. **Foundations:** tokens (`design-tokens.css`), fonts, `lucide-react`, motion primitives (`<Reveal>`, `useCountUp`, loop keyframes). Respect `prefers-reduced-motion`.
2. **Shared UI:** AppShell (Sidebar + Topbar), PageHeader, Button (primary, secondary, dark, danger-outline), StatCard, Chip/Badge, Segmented tabs, Switch, Checkbox, Input/Select, Drawer, Modal, Toast (with an optional Undo action), EmptyState, DarkHeroPanel, AIInsight block, DataTable shell, Avatar (initials plus a gradient picked by name), ProgressRing.
3. **Screens, one per PR:** Login → Dashboard → Employees → Employee folder → Requests → Copilot → the rest of the app, then Portal (5) → Apply → Landing.
4. After each screen, run the app next to the HTML reference and fix every visual difference.

---

## Design tokens

All tokens are also in `design-tokens.css`.

### Colors

**Ink and dark surfaces**

| Token | Hex | Use |
|---|---|---|
| ink-950 | `#06141a` | dark sections, sidebar, dark hero panels |
| ink-900 | `#0a1c24` | primary text, dark buttons, active segmented pill, toasts |
| ink-800 | `#16323c` | dark button hover |
| dark surfaces | `#0d2229`, `#0c242b`, `#0d2a33`, `#081a20` | cards on dark |

**Light surfaces and lines**

| Token | Hex | Use |
|---|---|---|
| bg | `#f3f6f7` | app background |
| surface | `#ffffff` | cards |
| subtle | `#f8fafb` | table headers, subtle panels |
| track | `#eef2f4` | progress tracks, row dividers |
| border | `#e2e8eb` | card borders |
| input border | `#d6dfe3` | inputs, secondary buttons |
| control | `#c3ced3` | checkbox border, switch off |
| border hover | `#9fb4bb` | secondary button hover |
| dashed | `#d0dadf` | empty states |

**Text on light:** `#0a1c24` primary · `#1d3540` strong body · `#33474f` secondary · `#52646d` muted / subtitles · `#5f7079` labels · `#7d8f97` subtle and icons · `#8a9ba3` placeholder · `#a3b1b7` disabled / "—".

**Text on dark:** `#f1f8f9` headings · `#e8eff1` body · `#cfdde1` · `#b9cbd0` · `#9fb4bb` muted · `#8ea5ad` · `#7f969e` · `#6b838c` icons · `#5b737b` mono headings.

**Brand teal (primary)**

| Hex | Use |
|---|---|
| `#0e6f84` | primary 600: links, checked states, active ring |
| `#16b6c8` | primary 400: focus border, accents |
| `#27c0d4` | accent: sidebar active bar, counts |
| `#5fe3f0` | glow on dark |
| `#0b5f72` | text on teal tint |
| `#e4f2f4` | teal tint (chips, selected rows) |
| `#b9dfe5` | hover border |
| `#9fd6df` | mid tint |

Primary gradient: `linear-gradient(135deg,#0e6f84,#16b6c8)`.

**AI violet:** `#6d5ad6` · `#5444b8` · `#3d2f99` · `#9a8bf0` · `#b3a8f5` (on dark) · tint `#ece9fb`. AI gradient: `linear-gradient(135deg,#5444b8,#16b6c8)`. Hero gradient: `linear-gradient(140deg,#5444b8,#6d5ad6 55%,#0e7f96)`.

**Status colors**

| Status | Main | Text | On dark | Tint | Other |
|---|---|---|---|---|---|
| Success | `#16a06b` | `#0f6f49` | `#2bbd86` / `#4fd3a0` | `#e1f5ec` | |
| Warning | `#df9326` (strong `#b06b0c`) | `#8a5207` | `#f0bd6a` | `#fbefda` | `#e6a948` |
| Danger | `#df5740` (also `#ef6b54`, `#b8402c`) | `#a33a28` | `#ef8b78` / `#ffb3a5` | `#fbe9e6` | border `#f0c9c0` |
| Info | `#2f4bb0` / `#4a69d8` | | | `#e7eefb` | |

**KPI gradient cards**

- teal `linear-gradient(135deg,#0b5f72,#0e7f96)`
- green `(135deg,#0f6f49,#16915f)`
- amber `(135deg,#a8650a,#c9810f)`
- violet `(135deg,#5444b8,#6d5ad6)`

**Avatar gradients.** All six are 135deg. Pick one with `(name.charCodeAt(0) + name.length) % 6`:

1. `#0e6f84 → #16b6c8`
2. `#5444b8 → #9a8bf0`
3. `#0f6f49 → #2bbd86`
4. `#a8650a → #e6a948`
5. `#b8402c → #ef6b54`
6. `#2f4bb0 → #4a69d8`

**Department colors:** Opérations `#df9326` · Commercial `#16a06b` · Tech `#6d5ad6` · Service client `#0e6f84` · Marketing `#df5740` · Finance `#4a69d8` · RH `#16b6c8`.

### Typography

Fonts:

- **Display:** `Bricolage Grotesque` (opsz 12..96, weights 500–800). Used for titles, KPI numbers and the logo.
- **UI:** `Geist` (400–700).
- **Mono:** `Geist Mono` (400–500). Used for dates, IDs, counts, codes and eyebrows.
- **Arabic:** `Noto Kufi Arabic` (400–700), with `dir="rtl"`.
- **Document paper:** `Georgia, 'Times New Roman', serif`, 14.5px, line-height 1.85.

| Role | Spec |
|---|---|
| Page H1 (app) | Bricolage 700, `clamp(30px,3vw,40px)`, letter-spacing -.045em, line-height 1.05 |
| Page subtitle | Geist 15px, `#52646d`, margin-top 8px |
| Card title | Bricolage 700, 16–17px |
| KPI value | Bricolage 800, 24–36px, letter-spacing -.04em |
| Body | Geist 13.5–14.5px, line-height 1.5–1.6 |
| Label | Geist 12.5px / 600, `#33474f` |
| Table header | 11px / 700, uppercase, letter-spacing .06em, `#5f7079` |
| Eyebrow | Geist Mono 11–12px, letter-spacing .12–.14em, uppercase |
| Sidebar section heading | Geist Mono 10px, letter-spacing .12em, `#5b737b` |
| Landing H1 | Bricolage 700, `clamp(46px,7.4vw,100px)`, letter-spacing -.05em, line-height .98 |
| Landing H2 | Bricolage 700, `clamp(38px,4.8vw,62px)`, letter-spacing -.045em, line-height 1 |

### Radii

| Value | Use |
|---|---|
| 6px | document paper |
| 7–9px | code tags, mini chips |
| 10–12px | inputs (11) and buttons (12) |
| 14–16px | list items, inner panels |
| 18px | stat cards |
| 20px | section cards |
| 22–26px | hero / dark panels, modals |
| 28px | landing cards |
| 44px | landing section top corners |
| 99px | pills |

### Shadows and rings

| Use | Value |
|---|---|
| Primary button | `0 12px 26px -12px rgba(22,182,200,.85)` |
| AI button | `0 14px 30px -14px rgba(109,90,214,.8)` |
| Card hover | `0 20px 40px -26px rgba(10,28,36,.45)`, plus `translateY(-3px)` |
| Toast | `0 24px 50px -16px rgba(10,28,36,.6)` |
| Drawer | `-30px 0 80px -30px rgba(6,20,26,.5)` |
| Modal | `0 40px 100px -30px rgba(6,20,26,.6)` |
| Focus | border `#16b6c8`, plus `0 0 0 4px rgba(22,182,200,.14)` |
| Selected card | border `#16b6c8`, plus `0 0 0 3px rgba(22,182,200,.16)` |
| Overlay | `rgba(6,20,26,.42)` with `backdrop-filter: blur(4px)` |
| Sticky glass bars | `rgba(243,246,247,.84)` with `blur(14px)` |

### Spacing and layout

- Page padding: `28px 32px 56px`. Vertical gap between page blocks: 20px.
- Content max-width: 1440px for most pages; 1180–1360px for document, notification, settings and help pages.
- Grid gaps: 12px (KPI rows), 14px (card grids), 16px (two-column split).
- Card padding: 16–22px. Responsive grids use `repeat(auto-fit|auto-fill, minmax(Npx,1fr))`. Split layouts use `flex-wrap: wrap` with `flex: <grow> 1 <basis>`.
- Wide tables keep a `min-width` (760–1060px) inside an `overflow-x: auto` wrapper.

---

## Motion system (`design/wedy-fx.js`)

The default easing is `cubic-bezier(.2,.8,.2,1)`. **Disable all motion when `prefers-reduced-motion: reduce` is set.**

**Reveal on enter.** Triggered by an IntersectionObserver (threshold .05). Elements already scrolled past are finished instantly. The delay comes from `data-delay` and is capped at 900ms. Lists stagger 40–60ms per item.

| Variant | Effect | Duration |
|---|---|---|
| `up` (default) | opacity 0→1, translateY 14px→0 | 620ms |
| `fade` | opacity only | 620ms |
| `left` / `right` | translateX ±36px | 620ms |
| `scale` | .94→1 | 620ms |
| `pill` | .9→1 (selected-state pills) | 300ms |
| `growx` / `growy` | scaleX / scaleY 0→1, origin left / bottom (bars) | 1000ms |
| `draw` | SVG stroke-dashoffset (lines, rings; `data-frac` = filled fraction) | 1300ms |
| `data-count` | number count-up, easeOutExpo, fr-FR thousands separator | 1400ms |

**Infinite loops**

| Loop | Effect | Duration / timing |
|---|---|---|
| `drift` | background orbs: translate(7%,-6%) scale 1.12 and back | 22s, ease-in-out |
| `ping` | rings / live dots: scale 1→1.5, opacity .6→0 | 2.4s |
| `shine` | white sheen sweeping across primary buttons (35% of the cycle, then rest) | 4.2s |
| `float` | ±6px | 3.2s |
| `spin` | spinners | .9s, linear |
| `pulse` | opacity 1→.3→1 | 2s |
| `dot` | typing dots | 1s, staggered 150ms |
| `scan` | skeleton sweep | 1.3s |
| `shimmer` | gradient text, `background-position` 0→200% | 7s |

Recommended stack: `framer-motion` (`whileInView` / `viewport={{ once: true }}`) or a small `<Reveal>` component built on `useInView`. Implement loops as CSS keyframes (see `design-tokens.css`).

---

## Shared components

### Sidebar (`WedyNav.dc.html`), used by every app page

- **Container:** 252px wide, sticky, `height: 100vh`, bg `#06141a`, `border-right: 1px solid rgba(255,255,255,.06)`. A radial teal glow sits top-left (420px circle, `rgba(14,111,132,.45)`).
- **Logo row:** padding `20px 20px 16px`, avatar 32px (`assets/wedy-avatar.png`, border 1.5px `rgba(255,255,255,.2)`), "Wedy" in Bricolage 700 / 20px, letter-spacing -.03em, and a mono "RH" chip.
- **Ask link:** "Demander à Wedy… ⌘K" links to Copilot. Margin `0 14px 12px`, padding `9px 12px`, radius 11px, bg `rgba(255,255,255,.05)`, border `rgba(255,255,255,.08)`.
- **Nav items:** 13.5px, padding `8px 11px`, margin `1px 12px`, radius 10px.
  - Inactive: text `#93a9b0`, icon `#6b838c`.
  - Hover: bg `rgba(255,255,255,.05)`, text `#e8eff1`.
  - Active: bg `rgba(39,192,212,.13)`, text `#5fe3f0` at weight 600, plus a 3px left bar `#27c0d4` with `box-shadow: 0 0 12px 1px rgba(39,192,212,.8)`.
- **Badges:**
  - Count: bg `#27c0d4`, text `#06141a`, 10px / 700. Used for pending requests and unread notifications; it is live, so pass the counts as props.
  - "New": teal outline.
  - "AI": violet outline.
- **Sections and items:**
  - **VUE D'ENSEMBLE:** Tableau de bord · Copilote IA (New) · Notifications (count)
  - **PERSONNES:** Employés · Stagiaires · Demandes (count) · Recrutement · Candidats · Annonces (AI) · Planning RH · Performance · Congés · Absences · Paie · Organigramme · Réunions
  - **DÉVELOPPEMENT RH:** Onboarding · Formation · Talents · Appels d'offres (AI)
  - **DOCUMENTS:** Générer · Modèles · Historique
  - **INSIGHTS:** Analytics · Journal d'audit
  - **ESPACE DE TRAVAIL:** Intégrations · Utilisateurs & rôles · Paramètres · Sécurité · Aide
- **Footer:** user (34px gradient avatar, name, "Admin RH") and a logout icon button (hover `#ef6b54`).
- Note: `Wedy Dashboard` and `Wedy Copilot` contain an older inline copy of the sidebar. Implement the sidebar **once** and use it everywhere.

### Topbar (`WedyTopbar.dc.html`)

- Sticky, padding `14px 32px`, glass background, `border-bottom: 1px solid #e2e8eb`.
- Left: breadcrumb "Section › Title" (13.5px; the current item is `#0a1c24` / 600).
- Right:
  - A fake input "Demander à Wedy…" that links to Copilot. It is `flex: 0 1 320px`, radius 12px, white, with a teal sparkles icon.
  - A 40×40 bell button with a 7px red dot (`#df5740`).

### Portal top nav (`WedyPortalNav.dc.html`)

- Sticky glass header with max-width 1180px.
- Left: logo with an "Espace collaborateur" chip.
- Tabs: Accueil · Mes congés · Mes documents · Formation · Mon profil. The active tab is a white pill with `#0b5f72` text.
- Right: dark "Demander à Wedy" button and the user avatar.
- **Responsive:** under 1100px header width, the tabs move to a full-width second row (scrollable) and the Wedy button becomes icon-only.

### Other building blocks

- **Buttons:** height 42px (38–46 depending on context), radius 12px, Geist 600 13.5–14px.
  - Primary: primary gradient, white text, primary shadow, plus the `shine` loop.
  - Secondary: white bg, border `#d6dfe3`, hover border `#9fb4bb`.
  - Dark: `#0a1c24`, hover `#16323c`.
  - Danger-outline: border `#f0c9c0`, text `#a33a28`, hover bg `#fbe9e6`.
  - AI: AI gradient.
- **StatCard:** padding `16px 18px`, radius 18px, white with border. Label 11px / 700 uppercase. Value Bricolage 800 / 30–34px. The first card of a row is often a teal gradient card with white text.
- **Segmented tabs:** container padding 4–5px, radius 12–14px, white with border. Active item: a `#0a1c24` pill behind white text (reveal `pill`). Inactive text `#52646d`. A count badge sits inside each item.
- **Filter pills:** height 32–38px, radius 99px. Active: `#0a1c24` bg with white text. Inactive: white bg, border `#e2e8eb`, text `#33474f`.
- **Switch:** 40×24 track (on `#0e6f84` or `#16a06b`, off `#c3ced3`), 18px white knob moving left 3px→19px, `.25s` easing. A smaller 32–36 × 18–20 variant is used inside dense lists.
- **Checkbox:** 20px, radius 6px, border 1.5px `#c3ced3`. Checked: `#0e6f84` fill with a white check (stroke 3).
- **Inputs:** height 42–44px, radius 11–12px, border `#d6dfe3`, focus ring as above. Search inputs have a 15–16px icon at left 12–14px.
- **Status badges:**
  - Actif / Approuvé / Terminé / Prêt: `#e1f5ec` / `#0f6f49`
  - En attente / En congé / À vérifier: `#fbefda` / `#8a5207`
  - Refusé / Inactif / En retard / urgent: `#fbe9e6` / `#a33a28`
  - Info / planifié: `#e4f2f4` / `#0b5f72`
  - IA: `#ece9fb` / `#5444b8`
  - Badges with a dot use a 6–7px circle before the text.
- **Drawer:** fixed right, `width: min(520–560px, 100vw)`, overlay as above, reveal `left`. Escape closes it.
- **Modal:** centered, radius 22px, reveal `scale`. Escape closes it.
- **Toast:** fixed bottom-right 24px, bg `#0a1c24`, radius 14px, padding `11px 16px 11px 11px`, 28px icon bubble. Auto-hides after 2.6–3s (5s when it has an "Annuler" undo action).
- **Dark hero panel:** bg `#06141a`, radius 22–26px, `isolation: isolate`. Two drifting radial orbs (teal `rgba(14,111,132,.6)` around 520px, violet `rgba(109,90,214,.35)` around 460px) and an optional 36–40px grid with a linear mask.
- **AI insight block:** bg `linear-gradient(135deg, rgba(22,182,200,.08), rgba(109,90,214,.08))`, border `rgba(109,90,214,.18)`, radius 14px. Contains a 30–32px Wedy avatar and a label "Analyse de Wedy" (12px / 700 `#5444b8`).
- **Empty state:** dashed border `#d0dadf`, a 52px icon tile, a title (16px / 700), a hint and an optional reset button.
- **ProgressRing:** SVG circle with `stroke-dasharray`. Score colors: ≥85 `#16a06b`, ≥75 or ≥70 `#16b6c8`, otherwise `#df9326`.

---

## Screens

### Mapping: design file → route → page file

Routes come from `frontend/src/app/router.tsx`. Page files live in `frontend/src/pages/`.

| Design file | Route | Page file |
|---|---|---|
| Wedy Landing | `/` | `marketing/LandingPage.tsx` |
| Wedy Login | `/login` | `LoginPage.tsx` |
| Wedy Apply | `/postuler/:id` | `public/PostulerPage.tsx` |
| Wedy Dashboard | `/app` | `app/DashboardPage.tsx` |
| Wedy Copilot | `/app/copilot` | `app/CopilotPage.tsx` |
| Wedy Employees | `/app/employees` | `app/EmployeesPage.tsx` |
| Wedy Employee | `/app/employees/:id` | `app/EmployeeFolderPage.tsx` |
| Wedy Employees (contract = Stage) | `/app/interns` | `app/InternsPage.tsx`, same layout as Employees |
| Wedy Requests | `/app/requests` | `app/RequestsPage.tsx` |
| Wedy Recruitment | `/app/recruitment` | `app/RecruitmentPage.tsx` |
| Wedy Candidates | `/app/candidats` | `app/CandidatsPage.tsx` |
| Wedy Job Posts | `/app/annonces` | `app/AnnoncesPage.tsx` for the list; `app/AnnonceStudioPage.tsx` for the AI studio panel |
| Wedy Planning | `/app/planning-rh` | `app/PlanningRHPage.tsx`, plus `PlanningDayNotes.tsx` ("Note du jour"). `CalendrierRHPage` and `CreneauxRHPage` are redirected here; the free interview slots block replaces Créneaux. |
| Wedy Performance | `/app/performance` | `app/PerformancePage.tsx` |
| Wedy Time Off | `/app/timeoff` | `app/TimeOffPage.tsx` |
| Wedy Absences | `/app/absences` | `app/AbsencesPage.tsx` |
| Wedy Payroll | `/app/payroll` | `app/PayrollPage.tsx` |
| Wedy Org Chart | `/app/orgchart` (and `/employee/orgchart` with `readOnly`) | `app/OrgChartPage.tsx` |
| Wedy Meetings | `/app/meetings` (and `/employee/meetings`) | `app/MeetingsPage.tsx` |
| Wedy Onboarding | `/app/onboarding` | `app/EmployeeOnboardingPage.tsx` |
| Wedy Training | `/app/training` | `app/TrainingPage.tsx` |
| Wedy Talents | `/app/talents` | `app/TalentsPage.tsx` |
| Wedy Tenders | `/app/tenders` | `app/TendersPage.tsx` |
| Wedy Generate | `/app/generate` | `app/GeneratePage.tsx` |
| Wedy Templates | `/app/templates` | `app/TemplatesPage.tsx` |
| Wedy History | `/app/history` | `app/HistoryPage.tsx` |
| Wedy Analytics | `/app/analytics` | `app/AnalyticsPage.tsx` |
| Wedy Audit | `/app/audit` | `app/AuditPage.tsx` |
| Wedy Notifications | `/app/notifications` | `app/NotificationsPage.tsx` |
| Wedy Integrations | `/app/integrations` | `app/IntegrationsPage.tsx` |
| Wedy Users | `/app/users` | `app/UsersPage.tsx` |
| Wedy Settings | `/app/settings` | `app/SettingsPage.tsx` |
| Wedy Security | `/app/security` | `app/SecurityPage.tsx` |
| Wedy Help | `/app/help` | `app/HelpPage.tsx` |
| Wedy Portal | `/employee` | `employee/EmployeeDashboard.tsx` |
| Wedy Portal Leave | `/employee/conges` | `employee/MyLeavePage.tsx` |
| Wedy Portal Documents | `/employee/documents` | `employee/MyDocumentsPage.tsx` |
| Wedy Portal Training | `/employee/formation` | `employee/MyTrainingPage.tsx` |
| Wedy Portal Profile | `/employee/profil` | `employee/MyProfilePage.tsx` |

The sidebar links in the HTML point to `.dc.html` files. In the app, use the routes above.

### Public and auth

**1. Landing — `Wedy Landing.dc.html`** (marketing site; copy is in English)

- **Floating pill nav:** max-width 1100px, blur. Becomes more opaque on scroll (`--nav` 0→1 over 120px). The CTA buttons are magnetic (follow the cursor at 22–32% strength).
- **Hero:**
  - Dark background with a 72px grid mask, 3 drifting orbs and a 560px glow that follows the cursor.
  - Badge "New · AI-powered HR for Moroccan companies".
  - The H1 reveals word by word (blur 10px → 0, 70ms stagger). "AI-native" uses shimmer gradient text.
  - The subtitle has a rotating verb (drafts / translates / files) every 2.4s; the mask width animates to fit the word.
  - Two CTAs and a row of three checks.
- **3D dashboard mock:** 1100×680, scaled to fit. It un-tilts with scroll (rotateX 18deg→0, scale .95→1). Three floating cards use mouse parallax and a 6.4s looping document-generation sequence.
- **Marquee:** three rows of document names in FR, AR and EN (64s / 70s reversed / 76s), with masked edges.
- **Copilot section** (light, top radius 44px, overlaps the hero by -56px):
  - Three scenario cards, each with a progress bar.
  - An auto-typing chat: 14–40ms per character, a 1.4s typing indicator, then the rich answer held for 5.2s before moving to the next scenario.
  - Clicking a card jumps to that scenario. The chat pauses when offscreen.
- **Features bento:** five cards with a cursor tilt (±4–5deg) and a radial spotlight that follows the cursor.
  - Each card has a mini-animation: document drawing (7s loop), FR / ع / EN cycle (2.8s), compliance checklist pop-ins, employee card, bars plus a 96% ring.
- **Platform orbit:**
  - Two rings rotating 80s / 120s; the labels counter-rotate to stay upright.
  - The center avatar pings. Two conic "comet" rings rotate on the dashed circles.
- **Security section:** a feature grid plus a streaming `audit.log` (vertical marquee, 26s).
- **Integrations:** grid of tilt cards.
- **Pricing:** Starter 199 MAD, Professional 499 MAD, Enterprise "Custom". Professional has a rotating conic gradient border (7s).
- **Final:** dark CTA, then a footer with a giant gradient "wedy" wordmark.
- **Props:** `motion` (Full / Subtle / Off), `chatAutoplay`, `cursorGlow`.

**2. Login — `Wedy Login.dc.html`**

- **Layout:** split screen. Left is the form; right is a dark animated brand panel ("RH moderne, pilotée par l'IA.", floating demo cards, "Rejouer la démo").
- **Steps:**
  1. `login`: email + password. Includes show/hide, a CapsLock warning, "Mot de passe oublié ?", inline error and a "Connexion…" loading state.
  2. `2fa`: "Vérification en deux étapes" with 6 OTP boxes (auto-advance, backspace, paste of the full code), "Renvoyer le code" with a 30s countdown, "Autre compte", and a "Vérification…" loading state.
  3. Success "Bon retour, ·." then redirect to the Dashboard.
- **State:** `step, loading, error, email, pw, showPw, caps, otp[6], resendIn`.

**3. Apply (public careers page) — `Wedy Apply.dc.html`**

- Shows the job header (Tython · "Responsable commercial B2B", "4 postes ouverts") and the job details.
- **Form:** name, email, phone, LinkedIn, CV upload, motivation and a consent checkbox.
  - Uploading a CV triggers an AI parsing animation, then a parsed summary.
  - Errors appear only after the first submit attempt (`tried`).
- **Success:** a state with a reference number, plus "Voir les autres offres".
- **State:** `done, f, motivation, cv, parsing, parsed, consent, err, tried, ref`.

### HR app

All app pages share the same structure: Sidebar, then a main column containing the Topbar and page content (header, then blocks).

**4. Dashboard — `Wedy Dashboard.dc.html`**

- Header "Bonjour, Salma" with a period selector.
- "Indicateurs prioritaires": four KPI gradient cards with count-up.
- "Autres indicateurs RH".
- **Cards:**
  - Évolution de l'effectif: area chart with a line draw.
  - Effectif par service: bars.
  - Répartition par contrat.
  - Demandes en attente: inline approve / refuse, followed by a toast.
  - Documents récents.
  - Actions rapides.
- **⌘K command palette:** `palette, query, sel`. Arrow keys ↑↓ move, Enter selects, Esc closes.

**5. Copilot — `Wedy Copilot.dc.html`**

- Full-height chat with a language switch (FR / ع / EN) and "Nouvelle conversation".
- **Empty state:** "Bonjour Salma, comment puis-je vous aider ?" with slash-command chips (`/doc`, `/emp`, `/congé`, `/aide`).
- **Messages:**
  - User bubbles use the teal gradient.
  - Assistant messages are white with the avatar, and can contain rich content (document card, tables) and a Copy button.
- **Thinking state:** shows a tool label and typing dots.
- Wire it to the backend Copilot endpoint.
- **State:** `msgs, input, thinking, tool, lang`.

**6. Employees — `Wedy Employees.dc.html` → `pages/app/EmployeesPage.tsx`**

- **Header actions:**
  - Départements.
  - Importer ▾, a menu with "Import intelligent" (Excel / CSV, columns auto-detected) and "Importer un CV" (IA).
  - Exporter.
  - **Ajouter un employé** (primary).
- **Quick-filter stat buttons:** Actifs, En congé, Contrats à échéance (≤ 30 days), Stagiaires.
- **Filters:** search (name / email / position / department), Service, Statut (includes "Contrat à échéance"), Contrat.
- **View toggle:** List / Grid / Kanban.
- **List view:**
  - Grid columns: `44px | minmax(230px,2.2fr) | minmax(160px,1.5fr) | 130 | 100 | 120 | 110 | 110 | 116`, inside a min-width 1060px scroll wrapper.
  - Select-all and row checkboxes. A selection shows a dark bulk bar: "N sélectionné(s)" · Générer un document · Exporter · ✕.
  - The status chip is a native `<select>` overlaid on the chip, with opacity 0.
  - A contract ending in ≤ 30 days shows a red chip "N j".
  - Row actions: view, generate, delete.
- **Grid view:** cards with min-width 250px.
- **Kanban view:** three columns (Actif / En congé / Inactif). HTML5 drag-and-drop changes the status.
- **Add drawer:**
  - Required fields: Nom complet and CIN. Error text: "Le nom complet et le CIN sont obligatoires."
  - Optional fields sit in a collapsible "Ajouter des informations supplémentaires (optionnel)".
  - On save: the new row appears at the top with a teal highlight and a "Nouveau" chip, all filters reset, and a toast confirms.
- Empty state with "Réinitialiser les filtres".

**7. Employee folder — `Wedy Employee.dc.html` → `pages/app/EmployeeFolderPage.tsx`**

- **Dark hero:**
  - 92px avatar with a ping ring, name, status badge and chips (contract, ID, start date, city).
  - An alert card "Contrat : fin dans 12 jours" with a "Préparer l'avenant" button.
- **Tabs:** Profil · Fichiers · Documents · Congés · Paie · Performance.
- **Profil:**
  - Two cards of label / value rows. Empty values show "—" in `#a3b1b7`.
  - A completeness ring computed from filled fields, with "Compléter avec l'IA".
- **Fichiers:**
  - Type chips (CV / Diplôme / Certificat / Contrat / Autre), a dropzone and the file list.
  - **AI completion flow:**
    1. `idle`.
    2. `busy`: 1.8s with a scanning bar.
    3. `done`: the extracted fields. Empty fields come pre-checked. Conflicts show "Conflit · actuel X" and are unchecked.
    4. "Appliquer N champ(s)" moves to `applied` and updates the profile and the ring. Nothing is ever overwritten without validation.
- **Documents:** list of documents. Arabic titles render RTL.
- **Congés:** balance cards (14,5 j etc.) and history.
- **Paie:** net amount, a stacked breakdown (net / CNSS & AMO / IR) and payslips.
- **Performance:** rating card and goals with progress bars.

**8. Requests — `Wedy Requests.dc.html`**

- Inbox split view.
- **Left:** tabs En attente / Approuvées / Refusées / Toutes with counts, plus type chips (Congés / Documents / Autres).
- **Right (sticky detail):**
  - Dark header, then the motif.
  - For leave: three tiles (Solde actuel / Demandé / Après validation).
  - An "Analyse de Wedy" block (e.g. insufficient balance, CDD ending, legal 4-day marriage leave).
  - Comment textarea and Refuser / Approuver.
- **After a decision:** a toast; the sidebar pending badge decrements; after 900ms the next pending request is auto-selected.

**9. Recruitment — `Wedy Recruitment.dc.html`**

- A KPI row and job filter pills.
- **Kanban:** five stages (Nouveau, Présélection, Entretien, Offre, Embauché). Min-width 1240px with scroll; drag-and-drop between stages.
- **Cards:** score ring, source, age and next interview.
- Moving a candidate to Embauché shows a toast that the contract and onboarding are being prepared.

**10. Candidates — `Wedy Candidates.dc.html`**

- Card grid with an AI score ring (draw animation).
- Search covers skills too. Stage pills filter the grid.
- **Click → drawer:**
  - Dark header with the big score.
  - "Résumé IA du CV" and four score bars (Compétences / Expérience / Langues / Adéquation).
  - Skills.
  - "Planifier un entretien" and "Refuser". Refusing shows a toast that Wedy drafted a kind rejection email.

**11. Job posts — `Wedy Job Posts.dc.html`**

- **Posts list:** status (Publiée / Brouillon / Clôturée), applications, views, and a "Page publique" link to Apply.
- **Sticky "Studio d'annonces IA":**
  - Inputs: title, contract, city, key points, and language FR / AR / EN.
  - "Générer avec Wedy" calls the AI (spinner, with a template fallback), then shows a preview (RTL for AR).
  - "Publier l'annonce" prepends the post to the list.

**12. Time off — `Wedy Time Off.dc.html`**

- Header with a "4 demandes en attente" link and "Enregistrer un congé".
- Cards: month calendar "Novembre 2026" with leave bars, "Soldes de congés", "Politique de congés", "Prochains jours fériés".

**13. Absences — `Wedy Absences.dc.html`**

- "Déclarer une absence".
- "Absences récentes" with a "Relancer" justification reminder per row (button state becomes sent).
- "Absentéisme par service · T4" bars.

**14. HR planning — `Wedy Planning.dc.html`**

- Week view "2 – 6 novembre 2026" with a selectable day and events.
- "Créneaux d'entretien libres" as toggles.
- "Note du jour" and "Rejoindre / préparer".

**15. Payroll — `Wedy Payroll.dc.html`**

- **Dark cycle stepper:** five steps (Variables · Contrôle IA · Validation · Virements · Clôture) with an animated progress line and a ping on the current step.
- Four KPI cards with count-up.
- **"Contrôle IA des bulletins":** three alerts, each with "Marquer vérifié".
- **"Valider la paie":**
  - Blocked while any alert is open; the toast says how many remain.
  - Then step Virements (spinner, 1.8s), then Clôture, plus a toast.
- **Payslip table:** each row's status is derived from the open alerts.
- Employer-cost stacked bar, six-month bars, due dates (28 Nov virement, 10 Dec CNSS Damancom, 31 Dec IR DGI) and "Exporter vers Sage Paie".

**16. Performance — `Wedy Performance.dc.html`**

- **Dark campaign hero:** a 64% ring, counts and "Relancer les retardataires".
- **9-box talent matrix:** click a cell to filter; the other cells dim to .42; a chip clears the filter.
- Company objectives with bars.
- An AI themes card.
- **Reviews list:** tabs (Tous / Terminés / Planifiés / Auto-évaluation / En retard). Late rows show "Relancer", which becomes "Relancé".

**17. Org chart — `Wedy Org Chart.dc.html`**

- CEO card, then seven director cards. Each has a department-color top bar and a collapsible team list with connector lines.
- The chart is a 1604px canvas inside a dotted, scrollable viewport.
- **Zoom:** − / + / fit (CSS `zoom`, 40–150%). It auto-fits to the viewport width until the user zooms manually.
- **Search:** highlights matches with a ring, dims the rest to .32, and auto-expands teams that contain a match.
- Tout replier / Tout déplier.
- Clicking a node opens a floating profile card at the bottom-right.

**18. Meetings — `Wedy Meetings.dc.html`**

- **List:** grouped by day, with tabs À venir / Passées.
- **Upcoming detail:**
  - Dark header (kind, title, time, place, attendees, action button).
  - Agenda checklist: add an item, or "Compléter l'ordre du jour avec Wedy" (AI, three items tagged "IA").
  - Prep notes.
- **Past detail:** AI summary, decisions, actions (owner + due date, toggles), "Envoyer aux participants" and PDF.

**19. Onboarding — `Wedy Onboarding.dc.html` → `pages/app/EmployeeOnboardingPage.tsx`**

- **New-hire list:** progress ring and a day chip (J+31, or J-30 for pre-boarding).
- **Dark hero:**
  - Contract signature: "Faire signer le contrat" becomes signed after 1.5s.
  - Buddy input; its border is amber while empty.
- **30-60-90 timeline:** bar with an "Aujourd'hui" marker.
- **Tabs:**
  - Plan: three phase cards with checklists and per-phase progress.
  - Pulse surveys: AI analysis, history, and a new-pulse form (score 1–5 + comment).

**20. Training — `Wedy Training.dc.html` → `pages/app/TrainingPage.tsx`**

- **KPIs:** enrollments, completion %, budget (used / 250 000 DH; the bar turns to a warning gradient above 225k) and hours.
- **Tabs:**
  - Catalogue: search, category pills, course cards.
  - Inscriptions: table with progress and "Marquer terminé".
  - Compétences: an 8 × 6 matrix; clicking a cell cycles the level (— / Débutant / Intermédiaire / Expert). AI gaps offer a one-click bulk enrollment.
- **Enroll modal:** employee checklist (already-enrolled people are disabled) and a cost estimate.

**21. Talents — `Wedy Talents.dc.html` → `pages/app/TalentsPage.tsx`**

- Category pills with counts.
- Talent cards: category, risk dot, and performance / potential bars.
- Internal mobility suggestions with "Proposer".
- **Sticky detail tabs:**
  - Profil talent: a radar of five values (Amana, Itkan, Iltizam, Ibdaa, Nama), a departure-risk box and a successors input.
  - OKR: range sliders.
  - PDI: status cycles À faire → En cours → Terminé.
- "Profiler avec l'IA" is a progress button.

**22. Tenders — `Wedy Tenders.dc.html` → `pages/app/TendersPage.tsx`**

- **Dark agent panel:**
  - Radar animation while running.
  - Keyword chips (add / remove).
  - Run / stop, with a live log and progress.
- **Filters:** search, complexity, sort.
- Skeleton cards while the agent runs.
- **Tender cards:**
  - Match ring, complexity, and a deadline chip (urgent at ≤ 10 days, or expired).
  - Expandable AI analysis: requirements, files, caution, site visit, and a GO / À étudier / NO GO recommendation.

### Documents

**23. Generate — `Wedy Generate.dc.html` → `pages/app/GeneratePage.tsx`**

A four-step wizard with an animated stepper:

1. **Employé:** employee / intern toggle, search, select a card.
2. **Modèle:** category pills; template cards show their languages and variable count.
3. **Variables:**
   - Values are auto-filled from the employee record (green check). Missing values are amber.
   - Language FR / AR / EN. A language is disabled when the template doesn't have it, unless the AI switch is on.
   - "Rédaction IA" switch.
   - Générer shows the overlay "Wedy rédige votre document…".
4. **Résultat:**
   - A4-like paper with the Tython letterhead and legal IDs, the title, paragraphs, place and date, signature, and a stamp (pop-in).
   - Footer with a verification code.
   - "Modifier le texte" edit mode, plus PDF / DOCX / Envoyer.
   - Arabic renders fully RTL in Noto Kufi.

**24. Templates — `Wedy Templates.dc.html` → `pages/app/TemplatesPage.tsx`**

- Template cards (mini paper illustration) with category and target filters.
- Preview modal.
- **Full-screen WYSIWYG editor** (contentEditable):
  - Toolbar: B / I / U / H1 / H2 / ¶ / • / undo / redo.
  - Variables `{{var}}` are non-editable chips, inserted at the caret from the side panel.
  - A counter of detected variables and a dirty indicator.
  - Save requires a name.

**25. History — `Wedy History.dc.html` → `pages/app/HistoryPage.tsx`**

- A KPI row.
- **Filters:** search, type, language, and an author segmented control (Wedy IA / Équipe RH).
- Rows are grouped Aujourd'hui / Hier / weekday / Plus tôt.
- Row actions: preview, download, delete. Delete shows an "Annuler" undo toast for 5s.
- **Preview drawer:** paper render, plus Télécharger / Renvoyer / Régénérer.

### Insights and notifications

**26. Analytics — `Wedy Analytics.dc.html`**

- **Period:** 3 / 6 / 12 mois. Changing it recomputes the KPIs, moves the highlight window on the chart and dims the bars outside the window.
- Five KPI cards with sparklines (draw).
- **Headcount area chart:** hover crosshair and tooltip via 12 invisible hover columns.
- Dark "Ce que Wedy remarque" insights.
- Arrivals / departures as diverging bars.
- Headcount by department.
- Composition: contract donut, gender split, age bars.

**27. Audit log — `Wedy Audit.dc.html`**

- "En direct" toggle: a new event every 6.5s; the new row flashes `#e8f8fa`.
- Export (CSV) and KPIs.
- Security alerts: Bloquer l'IP / Marquer vérifié / Ignorer.
- Filters: search, module pills, severity.
- **Expandable rows:**
  - Before / after diff: struck red, then green.
  - Context: device, IP, ID and a SHA-256 fingerprint.

**28. Notifications — `Wedy Notifications.dc.html` → `pages/app/NotificationsPage.tsx`**

- Tabs: Toutes / Non lues / À traiter / Sécurité.
- Grouped by day. Unread items have a teal accent bar and a dot; clicking an item marks it read.
- Inline actions: "Approuver" switches the item to a done state; other actions are links.
- "Tout marquer comme lu". The sidebar badge shows the unread count.
- **Preferences:** a matrix of App / Email / Slack switches per type, plus a daily-digest toggle.

### Workspace

**29. Integrations — `Wedy Integrations.dc.html`**

- Category pills.
- **App cards:** the switch moves to "Connexion…" for 1.3s, then "Connecté".
- **API key:** masked by default, with reveal / copy / regenerate.
- **Webhooks:** add (must start with `https://`) and delete.

**30. Users & roles — `Wedy Users.dc.html`**

- Four role cards; clicking one filters the table.
- **Users table:** role select, 2FA status, activity, status. Remove is disabled for your own account.
- **Permission matrix:** 8 modules × 4 roles; clicking cycles Aucun → Lecture → Modifier. The Admin column is locked.
- **Invite modal:** email validation and role. The invited user appears with "Invitation envoyée".

**31. Settings — `Wedy Settings.dc.html`**

- Left tabs:
  - **Entreprise:** logo, ICE / RC / IF / CNSS fields (mono font).
  - **Préférences:** language, timezone, date format, currency, work-week toggles (note about the 44h legal week).
  - **Congés et temps:**
    - Accrual rules: 1,5 j/mois, +1,5 per 5 years, cap 30.
    - Validation flow.
    - A legal note.
    - 2026 Moroccan public holidays as toggles. "≈" marks lunar dates.
  - **Documents:** numbering prefix with a live preview, signature / stamp uploads, verification QR switch.
  - **Facturation:** plan, usage bars, invoices.
- Any change shows a floating "Modifications non enregistrées" bar with Annuler / Enregistrer.

**32. Security — `Wedy Security.dc.html`**

- **Score ring** (0–100), computed from the settings below. Recommendations with "Activer" apply the setting and raise the score with animation.
- Controls:
  - 2FA segmented: Optionnelle / Admins / Tous.
  - Session timeout slider (15 min–4 h).
  - IP allowlist with CIDR validation.
  - Password policy switches.
  - Login alerts.
  - SSO (SAML) card.
- **Active sessions:** revoke one, or revoke all others.
- Compliance badges (AES-256, TLS 1.3, backups, loi 09-08).

**33. Help — `Wedy Help.dc.html`**

- Dark search hero with suggestion chips.
- Category tiles.
- FAQ accordion with keyword search (accent-insensitive) and helpful Yes / No.
- "Demandez à Wedy" card, support contacts, system status and changelog.

### Employee portal (uses `WedyPortalNav`, not the sidebar)

**34. Portal home — `Wedy Portal.dc.html`**

- Greeting hero "Bonjour Yasmine." with drifting orbs.
- Blocks: "Disponibles maintenant" (balances), "Mes demandes", current training, next holiday, "Mon équipe aujourd'hui", "Annonces de l'entreprise".
- CTAs: Demander un congé / Demander un document.

**35. My leave — `Wedy Portal Leave.dc.html`**

- "Nouvelle demande": type, dates (working days computed live), motif. "Envoyer la demande" adds a pending request.
- Historique: pending requests can be cancelled.
- Team calendar for the next 2 weeks.

**36. My documents — `Wedy Portal Documents.dc.html`**

- "Demander un document": type, language, purpose.
- Submitting shows "Wedy prépare votre document…" (spinner).
- The ready document appears at the top of the list with a highlight.

**37. Training — `Wedy Portal Training.dc.html`**

- "En cours": progress bars; "Continuer" advances the course.
- "Recommandé pour vous": "Demander".
- "Mes certificats".

**38. My profile — `Wedy Portal Profile.dc.html`**

- Editable contact info. Any change shows Annuler / Enregistrer.
- Administrative info is read-only, with "Demander une modification".
- Space language, notification switches, and account security ("Changer le mot de passe").

---

## Behavior rules that apply everywhere

- **Keyboard:** Escape closes drawers, modals and menus. Every icon-only button has an `aria-label`. Focus rings are visible.
- **Toasts** confirm every mutation. Destructive actions offer Undo where shown (History).
- **Optimistic UI** for status changes (Employees, Requests, Notifications). Roll back on API error with an error toast.
- **Counts are live:** the sidebar badges (pending requests, unread notifications) come from the same queries as the pages.
- **RTL:** any Arabic content renders with `dir="rtl"` and Noto Kufi Arabic.
- **Responsive:**
  - All app pages are fluid: grids wrap and wide tables scroll horizontally.
  - The 252px sidebar has no mobile variant in the mocks. Under 1024px, implement a collapsible drawer using the same tokens.
- **Empty and loading states:** use the empty-state pattern and skeletons with the `scan` sweep.

## Known gaps

- "Stagiaires" (`/app/interns`, `InternsPage.tsx`) has no dedicated mock. Reuse the Employees layout with the `contract = Stage` filter preset and the Stage-specific columns (school, tutor, end date).
- The portal nav mock has 5 tabs. The app also has `/employee/orgchart` and `/employee/meetings`: add two tabs, "Organigramme" and "Réunions", in the same style, and render the Org chart (read-only: no export) and Meetings designs inside the portal shell.
- The Dashboard and Copilot embed an older inline sidebar. Use the shared one.

## Assets

- `design/assets/wedy-avatar.png`: Wedy mascot / logo avatar. Use it as the logo, the AI avatar and the chat avatar.
- Icons: Lucide (`lucide-react`, matching names).
- Fonts: Google Fonts (Bricolage Grotesque, Geist, Geist Mono, Noto Kufi Arabic).

## Files

- `design/*.dc.html`: one file per screen (38 screens + 3 shared components: `WedyNav`, `WedyTopbar`, `WedyPortalNav`).
- `design/wedy-fx.js`: the motion engine (reveal, count-up, loops); it is the reference implementation of the motion spec.
- `design/support.js`: runtime needed only to open the HTML references in a browser. Don't port it.
- `design-tokens.css`: tokens and keyframes, ready to import.
- `CLAUDE_CODE_PROMPT.md`: paste-ready prompts to run this handoff with Claude Code.
