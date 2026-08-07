# Creative Companion — agent rules

**Product requirements:** `docs/PRD.md` (five-stop path, Helper verbs, non-goals).

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
  `.main:has(.design-studio)` full width; artboard primary; quiet status;
  Next + Back footer
- Do not reintroduce: chapter rail on The brief, start-here multi-chip ramp,
  interview CTA that only focuses the first field, project-name band when
  sidebar/header already name the project; Research 980/1160px centered caps;
  Research empty prose without a framed drop plane; Identity 1120px main cap
