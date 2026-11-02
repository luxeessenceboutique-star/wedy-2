# Running this handoff with Claude Code

## 0. Setup (once)

1. Copy the whole `design_handoff_wedy/` folder to the **root of the repo** (next to `frontend/`).
2. In a terminal, open the repo and start Claude Code: `claude`.
3. Recommended: install the Playwright MCP so Claude Code can screenshot pages itself:
   `claude mcp add playwright npx @playwright/mcp@latest`
4. Serve the references in another terminal:
   `cd design_handoff_wedy/design && npx serve -l 4000 .`

## 1. Prompt #1: foundations (plan mode first: press Shift+Tab twice)

```
Read design_handoff_wedy/README.md completely, then design_handoff_wedy/design-tokens.css,
then design_handoff_wedy/design/wedy-fx.js and design_handoff_wedy/design/WedyNav.dc.html.

Then explore frontend/ (router, layout, pages/app, components, i18n, styles) and propose a plan to:
1. Import the tokens and fonts, and add lucide-react (plus framer-motion if useful).
2. Build the motion primitives: <Reveal variant delay>, useCountUp, loop classes. Respect prefers-reduced-motion.
3. Build the shared UI: AppShell (Sidebar + Topbar), PageHeader, Button variants, StatCard, Badge,
   SegmentedTabs, Switch, Checkbox, Input, Drawer, Modal, Toast (with undo), EmptyState,
   DarkHeroPanel, AIInsight, Avatar, ProgressRing.
Match the exact values (hex, px, radius, shadow, durations) from the HTML inline styles.
Do NOT modify API calls, hooks or routes. Put all UI strings in the i18n files (fr, en, ar).
Create HANDOFF_PROGRESS.md with a checklist of the 38 screens.
Wait for my approval before writing code.
```

## 2. Prompt #2 and up: one screen per prompt (run `/clear` between screens)

```
Implement the screen <SCREEN NAME> from design_handoff_wedy/design/<FILE>.dc.html
into the page file given in the README mapping table (section "Screens"), e.g. frontend/src/pages/app/EmployeesPage.tsx.

Rules:
- Read the whole HTML file: the markup (inline styles = exact values) AND the logic class
  (state, renderVals, handlers, timings, validation rules).
- Reuse the shared components and tokens. If something is missing, add it to the shared components.
- Keep the existing data fetching / mutations and replace the mock data with real data.
- Reproduce every interaction, hover state, empty state, toast and animation (data-reveal / data-loop / data-count).
- When done: start the dev server, open the reference at http://localhost:4000/<FILE>.dc.html
  and our page side by side (Playwright screenshots at 1440px and 1024px), list every visual
  difference (spacing, color, font size, radius, alignment, animation), and fix them all.
  Repeat until there are no differences. Then tick the screen in HANDOFF_PROGRESS.md.
```

### Suggested order

Login → Dashboard → Employees → Employee folder → Requests → Copilot → Generate → Templates → History →
Time off → Absences → Planning → Recruitment → Candidates → Job posts → Payroll → Performance → Org chart →
Meetings → Onboarding → Training → Talents → Tenders → Analytics → Audit → Notifications → Integrations →
Users → Settings → Security → Help → Portal (5) → Apply → Landing.

## 3. When something doesn't look right

Send Claude Code both screenshots (reference and our version) and say exactly what is wrong:

```
Here is the reference [image 1] and our version [image 2]. The differences: <…>.
Find the exact values in design_handoff_wedy/design/<FILE>.dc.html and fix our page so it is identical.
```

## Tips

- One screen per session (`/clear`): the result is much better than "do everything".
- Always plan mode first for big screens (Employees, Generate, Landing).
- Commit after each validated screen.
- If Claude Code "simplifies" the design, say: "Do not simplify. Match the reference pixel-perfectly, including animations."
