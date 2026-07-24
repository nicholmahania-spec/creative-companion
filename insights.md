# Creative Companion — Architecture & Design Insights

> Living reference for future sessions. Read this instead of re-scanning source files.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + Vite 8 |
| State | Zustand 5 (`src/store/useAppStore.js`) |
| CSS | Hand-rolled semantic token system in `src/index.css` (~15k lines, no Tailwind) |
| Build | `npm run build` → Rolldown + LightningCSS minification |
| Tests | Vitest (`*.test.js` co-located with lib files) |
| Version | `npm run bump` increments `src/lib/version.js` |

---

## Design system

### Visual identity: "Tech Studio" flat aesthetic
- **No drop shadows** (`box-shadow: none` on cards/surfaces except focus ring)
- **No blur** (`backdrop-filter` avoided)
- **No squircles** — `border-radius` is `4px` by token, not 1.15rem+
- All CSS must use semantic tokens, never hard-coded hex

### Token vocabulary (key ones)
```css
--text-primary / --text-secondary / --text-muted     /* text hierarchy */
--bg-surface / --bg-elevated / --bg-muted            /* surface layering */
--border-default / --border-subtle / --border-strong  /* borders */
--dopamine                                            /* brand accent (steel blue) */
--accent-a / --accent-b / --accent-c                 /* direction/direction sub-accents */
--define-ch-1 / --define-ch-2 / --define-ch-3        /* all resolve to --dopamine */
--font-display / --font-body / --font-mono            /* typefaces */
--z-menu / --z-overlay / --z-toast / --z-sticky / --z-skip  /* z-index scale */
--radius-sm / --radius-md / --radius-lg               /* 2/4/8px */
```

### Typography scale
- `h1`: `clamp(2rem, 4vw, 2.75rem)` (added `44ac172`)
- `h2`/`h3`: set by the shared `h1, h2, h3` rule using the modular scale
- Body: `--font-body`; Display headers: `--font-display`

### Button heights
All buttons normalize to **40px**. `.btn-primary` uses `padding: 0.55rem` vertical + `line-height: 1.1` on `.btn` base.

---

## App structure

### Views (in `src/views/`)
The app has two modes per creative stage: a standard view and a "Focus Mode" view.

| Stage | Standard view | Focus view | `setActiveView` key |
|-------|--------------|------------|---------------------|
| Define | `DefineView` | `DefineFocusView` | `'define'` / `'project'` |
| Research | `ResearchView` | `ResearchFocusView` | `'studio'` |
| Spark (Ideate) | `SparkView` | `IdeateFocusView` | `'spark'` |
| Sketch | `SketchView` | `SketchFocusView` | `'flow'` |
| Design | `DesignView` | `DesignFocusView` | `'brand'` |
| Review | `ReviewView` | `ReviewFocusView` | `'review'` |
| Deliver | `DeliverView` | `DeliverFocusView` | `'finish'` |
| Calendar | `CalendarView` | — | `'calendar'` |
| Insights | `InsightsView` | — | `'insights'` |
| Settings | `SettingsView` | — | `'settings'` |

### Focus Mode shell pattern (`src/components/focus/`)
- `FocusShell`: outer layout — one header, one progress bar, optional preview drawer
- `FocusCard`: inner card wrapper with entrance animation
- **Critical rule**: Never nest a `FocusShell` inside another `FocusShell`. Each render branch should return exactly one `FocusShell` at the top.
- `onExit` prop on `FocusShell` wires the `×` button — always pass `exitFocus = () => setActiveView?.('target')`

### State management
- All app state lives in `useAppStore` (Zustand). Components receive slices via props from `App.jsx`.
- Decision log: `logDecision(decisionFromDirection(dir))` in `src/lib/decisionLog.js`
- Tasks added to Sketch via `addTask({ id, title, energy, meta, completed, seeded, projectId, dueDate })`

---

## Critical constraints (from AGENTS.md)

1. **Define view side-by-side layout must never collapse** — the form + mood board must stay side-by-side on desktop. This is an ADHD design requirement.
2. **No alert()** — use `flashToast?.()` for user-facing messages.
3. **React Rules of Hooks** — hooks (`useEffect`, `useState`, etc.) must appear before any conditional `return`. If a component needs an early return (e.g., `if (!intentSet) return`), add the guard *inside* the hook's callback, not before the hook call.
4. **CSS in `index.css` only** — no inline `style=` for theming values; use CSS tokens.

---

## Known patterns and gotchas

### LightningCSS minification
Vite uses LightningCSS to minify `src/index.css`. It will fail (`SyntaxError`) if:
- A CSS declaration appears outside any rule block (orphaned property)
- `@keyframes` is nested inside a rule block

**Diagnosis**: Run `python3 -c "content=open('src/index.css').read(); lines=content.split('\n'); depth=0; [print(i+1,l[:60]) if (depth:=depth+l.count('{')-l.count('}'))==0 and '}' in l else None for i,l in enumerate(lines)]"` to find unclosed blocks, or look at the LightningCSS error line number and trace back to the last unclosed `{`.

### Agent concurrent edit conflicts
When multiple agents run simultaneously they overwrite each other's working-tree changes. Signs of conflict:
- `git diff --stat HEAD` shows agent B's changes on HEAD after agent A committed
- Build fails with CSS syntax errors immediately after agent commits
- Python brace-depth check shows depth never returns to 0

**Resolution pattern**: After agent commits, always `npm run build` immediately. If broken, use `git show HEAD:src/index.css | grep -n "z-index\|box-shadow" | head` to locate orphaned declarations.

### Password strength validation (`LoginPage.jsx`)
`validatePasswordStrength()` checks 5 criteria (length, uppercase, lowercase, number, special). `maxScore` must be `5`, not `4` (old value caused 125% bar fill and broke the 'Strong' label).

### IdeateFocusView hooks order (fixed `e190642`)
`pick()` function and its `useEffect` must come **before** the `if (!intentSet) return` early return. The `useEffect` itself guards with `if (!intentSet) return` internally.

### Calendar view
`buildMonthGrid(year, month)` returns cells with `{ day, date, inMonth }`. `date` is an ISO string (`YYYY-MM-DD`). `toISODate()` returns today's ISO date for the `is-today` class comparison.

---

## Files that are sensitive / high-risk to edit

| File | Risk | Why |
|------|------|-----|
| `src/index.css` | HIGH | 15k lines; LightningCSS is strict; agent edits historically introduced syntax errors |
| `src/App.jsx` | HIGH | Central orchestration; prop-drilling hub for all views |
| `src/store/useAppStore.js` | MEDIUM | Zustand store — changing shape affects all consumers |
| `src/lib/cloudSync.js` | MEDIUM | Handles Supabase sync; error paths matter |
| `src/views/DefineView.jsx` | MEDIUM | ADHD constraint: side-by-side must never collapse |

---

## Test suite
Tests live co-located with lib files (`src/lib/*.test.js`) and store (`src/store/*.test.js`). Run with `npm test`. Build validation via `npm run build`.

