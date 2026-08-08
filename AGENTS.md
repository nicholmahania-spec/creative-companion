# Creative Companion — agent rules

**Product requirements:** `docs/PRD.md` (five-stop path, Helper verbs, non-goals).

## Two sessions are working this repo — stay in your lane

**Owner decision, 2026-08-07.** Two audits are being implemented in parallel
and both merge straight to `main`. They collided once already: `RES/IDE/TOU/ASS`
and the duplicate Desk counts appear as work items in *both* backlogs, and were
built by the cold-start session while still listed as pending in the visual
roadmap's Phase 4.

Split by **screen**, not by layer. Layer-splitting (one session owns CSS, the
other owns JSX) was rejected because it does not survive contact: a copy fix
routinely needs the stylesheet next to it.

| Area | Owner | Files |
|---|---|---|
| Global visual system, path stops (Research · Strategy/Define · Identity/Design · Touchpoints · Assets/Deliver), the direction sheet | **Visual-design audit** (`docs/VISUAL_AUDIT.md`, Phases 4–5) | `src/styles/shell.css`, `lazy-{define,design,deliver,ideate,mood,review}.css`, `BrandArtboard.jsx`, `DESIGN_GRAMMAR.md` |
| Desk, Home, the password gate, New project intake, Brand book builder, client-facing routes | **Cold-start audit** (`docs/COLD_START_AUDIT_2026-08-07.md`, `docs/VISUAL_AUDIT_2026-08-07.md`) | `DeskView.jsx`, `HomeView.jsx`, `LoginView.jsx`, `NewProjectIntake.jsx`, `BrandBookBuilderView.jsx`, `DeskLiveArtboard.jsx`, `BrandCheckPanel.jsx`, `src/lib/brain/**`, `src/lib/billing/**`, `lazy-create.css`, `lazy-desk.css` |

`shell.css` and `useAppStore.js` are shared and cannot be assigned. Touch them
in the smallest possible edit, and `git fetch origin main` immediately before
you do.

**Before starting any backlog item, check it is not already built.** Both
roadmaps contain items that shipped from the other session. Read the code, not
the checklist.

## Before you commit — bump the version

`npm run bump:major` for breaking · `bump:minor` for a `feat:` · `npm run bump`
otherwise. Stage `package.json` **and** `package-lock.json` in that same
commit. The git hook that used to do this is disabled and must not be
re-enabled — in this environment a hook that stages during a commit lands its
changes in the *next* commit's tree.

Full shipping rules: `docs/ONBOARDING.md` and `docs/PRD.md`.

This lived only in those two docs, and this file — the one an agent actually
reads for rules — was silent on it. Three PRs merged on 2026-08-07 (#170,
#171, #172) shipped with no bump as a result. No test or CI job checks it.

## Two standing product rules, added 2026-08-08

Both are owner decisions and both are permanent. Full text in
`DESIGN_GRAMMAR.md` — G1.5 and G9.1.

**1. A stage must hand you a tool, not a form** (G1.5).

> Every stage must provide a meaningful work surface appropriate to the
> stage's job. A page is not considered functional merely because it stores
> information related to that job.

The brief (`detective`) is the ONLY client/strategic intake surface. Every
later stop consumes it and none re-asks it. Before adding any input, in order:
is it already in the brief · is it already authored elsewhere · can the app
derive it · should a design action produce it first. Only four noes earn a new
field. Documentation is the by-product of a decision, never the thing that
produces one.

**2. American English, everywhere a user can read it** (G9.1).

color · favorite · organize · customize · behavior · center · labeled ·
canceled · license · gray. Never colour / organise / behaviour / centre /
labelled / grey. Labels, buttons, empty states, toasts, onboarding, the client
portal, the brand book, example text. Never mix the two.

Exempt, deliberately: **stored field ids** (`colourPalette` is a saved answer
key — renaming it orphans real client data), **text the client typed**, and
**keyword lists matched against client text** (`contrastMatrix`,
`colourAxes`), which must accept both spellings. Non-user-facing comments are
out of scope — don't churn them. Sweep the files you touched before calling a
block done.

---

## Owner decisions are final — advisors inform, they do not override

**Stated by the owner 2026-08-03:** never reverse, quietly re-decide, or
“improve away” a choice the owner has already made — even when an audit
subagent, design book, prior session note, or the agent’s own taste points
the other way.

| Do | Don’t |
|----|--------|
| **Consult advisors** (`adhd-executive-function-advisor` and the rest) so the owner gets tradeoffs, risks, and options **before** choosing | Treat advisor output as a veto or as permission to undo an explicit call |
| Present findings as **information for a decision** (options + costs, one clear recommendation when asked) | Ship a different product call while the commit message pretends it matches the brief |
| If safety/security or a hard technical block applies, say so **once**, plainly | Re-litigate settled path/IA/chrome decisions every session |

**Explicit go-ahead still scopes implementation** (“build that”, “go”, “apply it”) — but only for the work named. It does **not** license reopening earlier owner decisions unless the owner reopens them.

When an advisor conflicts with a standing owner decision, **state the tension once**, keep the owner’s decision, and only change course if the owner says so.

**Two advisors are not optional** (owner, 2026-08-06 — full rules in `DEVELOPMENT.md` → Design Principles):

| Agent | When |
|---|---|
| `adhd-executive-function-advisor` | before finalizing any UI, UX, workflow or gating decision — does this serve the user? |
| `devils-advocate` | after **every** significant decision, especially the obvious ones — is this decision right? |
| `inventor` | before reporting anything as blocked, impossible or not worth building |

Neither `devils-advocate` nor `inventor` overrides the rule above: they inform the owner’s decision, they do not reopen it.

---

## Define is form-only (owner decision — do not reintroduce Refs)

**Project overview (Define) is the brief form only.** Inspiration / refs live on
**Research**, not beside the questions. The owner removed the side-by-side Refs
block deliberately; do **not** restore `DefineMoodCanvas` or a mood pane on
Define without an explicit request.

| Keep | Avoid |
|------|--------|
| Single-column brief (form-only) | Side-by-side form + mood board on Define |
| Pins and board on Research | Re-adding “Refs” / DefineMoodCanvas to overview |

ADHD “tab-switching amnesia” is still a concern for Research itself (board
primary there). It is **not** a reason to put the board back on Define.

---

## Color changes → dark mode audit (mandatory)

**Whenever you change colors** — CSS variables, hex/rgb/hsl values, gradients, borders, shadows that tint UI, `theme-color`, or tokens in `:root` / `.app.deep` — you **must** audit dark mode before calling the work done.

Dark mode is `.app.deep` (user theme `deep`), not a separate stylesheet.

### Do not ship if

- Body / meta / secondary text is hard to read on dark surfaces
- Primary or dopamine CTAs fail contrast on their background
- Borders, chips, or muted chrome vanish into the canvas
- Focus rings or active path states disappear on deep
- Hardcoded light-only colors (`#fff`, `#fafaf9`, stone grays) sit on dark without a `.app.deep` override or token

### Audit checklist (both themes)

Run mentally or in the running app with theme toggled to **deep**:

1. **Tokens** — every new/changed color has a paired deep value, or uses a semantic token (`--text-*`, `--bg-*`, `--border-*`, `--dopamine*`, `--accent-*`) that already works on deep
2. **Text** — primary ≥ ~4.5:1 on surface; secondary/muted still legible (not < ~3:1 on its bg)
3. **Interactive** — buttons, links, path steps, gap strip, Home CTAs readable in default + hover + active + disabled
4. **Chrome** — header, journey bar, GameHUD, menus, modals, toasts, footer
5. **Surfaces** — panels, step-focus hero, Home master/detail, empty states, alerts
6. **Accent scope** — dopamine stays high-contrast on deep; growth/done states stay readable; no light-theme-only ink
7. **Hardcoded hex** — search the diff for `#` and `rgb(`; any light-assuming value needs deep handling

### How to verify

- Prefer semantic tokens over one-off hex
- Toggle **Switch to dark** in the account menu (or set theme `deep`)
- Spot-check: Home, path step (Sketch), Design, Deliver, Tools menu
- Use `src/lib/color.js` (`contrastRatio`, `contrastGrade`) for questionable pairs
- If unsure, fix deep first — never “ship light, dark later”

### Related

- Design grammar: `DESIGN_GRAMMAR.md` → **G4.4 Dark mode audit**
- Palette tokens live in `src/index.css` (`:root` + `.app.deep`)

---

## Path page rebuild checklist (mandatory — Strategy lessons apply to every stop)

Learned on **The brief** (Strategy) rebuild, 2026-08-03. Apply on **Research,
Identity, Touchpoints, Assets**, and any new full-page path surface — not only
Define. Do not re-learn these by shipping the same bugs again.

### Width and layout — no floating islands

| Do | Don’t |
|----|--------|
| Fill the **main grid cell** beside the sidebar (`max-width: none` on `.main` for that view) | Stack centered caps: `.main` 780px + `.surface-document` 52rem + page root 42rem + `margin-inline: auto` |
| Left-align content in the content column | Re-cap after a “float fix” (e.g. `min(68rem)` left a dead right gutter) |
| Long fields / primary content **full width** of the main column | Half-empty 2-col grids where every field is `gridSpan: half` |
| Short pairs only where real (e.g. email/phone, date/contact) | Two-column for long questions on a wide page |

**Reserved tracks count as dead width** (owner reopened the reading-measure
rule, 2026-08-07). The brief's `.define-split-form` held
`minmax(0, var(--define-col)) 260px` while the chapter rail it reserved the
260px for was switched off — ~292px of the measured ~570px gutter was a track
for an element that never rendered. `--define-col` went 56rem → 68rem and the
rail track is now dropped via `:not(:has(.define-chapter-rail))`, so it
returns automatically if the rail does.

**What that did and did not buy, measured:** horizontal dead space 570px →
377px; vertical scroll **4.37 screens → 4.37 screens, unchanged**. The page is
long because it holds 69 fields, not because the column was narrow — widening
does not shorten it. Do not expect a width change to fix a scroll complaint.

**One shared right edge beats sizing each control to its answer.** Capping
brief inputs was tried twice and reverted both times: 32rem inputs + 65ch
textareas alternated and read ragged; 65ch for both left the text fields
~330px short of the spectrum rows and checklists, which size to the column and
cannot be capped without reflowing their options. The column is the width
control on that page.

Check: `src/styles/shell.css` `.app:has(.define-brief) .main` is the pattern — each
path view needs its own full-width main rule (or a shared `.path-view` class)
when you rebuild it.

### One job per page

| Page role | Chrome allowed |
|-----------|----------------|
| **Writing surface** (Strategy brief) | Title · status · one share CTA · form · quiet footer |
| **Command surface** (Desk) | Project command: next, client, week, pack |
| **Orchestration** (Home) | Multi-project pickup, hours, needs-you |

Do **not** put Desk/Home density on a writing page (task lists, dual status,
hours, scope dashboards above the work). Demote contract/planning
(milestones, scope) **below** the primary work or keep on Desk.

### One map, one initiation path

| Do | Don’t |
|----|--------|
| Section headings **in the content** are the only chapter/stop map | A second rail/sidebar that re-lists the same chapters with “N needed” |
| The work itself is the start (first field / first pin / first tool) | “Start with X” chips that jump to the first thing already on screen |
| One solid primary CTA for the page job | Equal-weight dual primaries (Send + Interview + Start + Next) |

### Type and chrome hierarchy

| Do | Don’t |
|----|--------|
| **Sentence-case** labels on conversational forms | All-caps “settings eyebrow” labels on a client brief |
| Quiet **NEEDED** / needed count only where gating matters | Full-field scoreboards (“0 of 35”) or long “Still blank: A, B, C…” lists |
| Footer: **path continue primary** leads; secondary back/desk | Secondary-looking Next, primary-looking Back |
| Shell mark-done / path chrome soft or off on writing surfaces | Full-width “Mark Strategy done” competing with the form |

### Width checklist before “done” on any path page

1. `.main` for this view is not capped below the grid cell (no leftover gutter)
2. Page root is not `margin-inline: auto` with a reading-width max unless the owner asked for a narrow measure
3. Primary content uses full main width; half columns only for real short pairs
4. No dual map (rail + in-content sections for the same list)
5. One clear primary action; form/board/tool is the initiation target
6. Dark mode still audited if colors changed

### Reference implementation

- Strategy brief: `src/views/DefineView.jsx`, `src/styles/lazy-define.css`,
  `.app:has(.define-brief) .main` in `src/styles/shell.css`
- Research wall: `src/views/ResearchView.jsx`, `src/styles/lazy-mood.css`,
  `.app:has(.research-studio) .main` full width; **hybrid artboard**
  (`.research-artboard` frame + auto-flow grid inside — not free pan/zoom
  placement, not a bare document empty state)
- Identity: `src/views/DesignView.jsx`, `src/styles/lazy-design.css`,
  `.main:has(.design-studio)` full width; **`.design-workspace` is a
  two-column grid — the editable artboard is the left column on wide and the
  FIRST block on mobile, present on every tool screen**; quiet status;
  Next + Back footer. There is no Words screen and no Preview destination:
  the words are edited on the sheet, and a preview is not an activity.
- Do not reintroduce: chapter rail on The brief, start-here multi-chip ramp,
  interview CTA that only focuses the first field, project-name band when
  sidebar/header already name the project; Research 980/1160px centered caps;
  Research empty prose without a framed drop plane; Identity 1120px main cap
